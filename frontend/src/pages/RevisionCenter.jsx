import React, { useEffect, useState } from "react";
import { dueReviews, upcomingReviews, submitReview, getDocumentsByDate, createShareLink, getStickyNotes, getUploadDates, listSubjects } from "../api/client";
import ShareConfigModal from "../components/ShareConfigModal.jsx";

const MiniCalendar = ({ selectedDate, onSelectDate, highlightDates }) => {
  // Try to parse the selectedDate initially, or just use today
  const initialDate = selectedDate ? new Date(selectedDate) : new Date();
  // Ensure the date is valid, if not fallback to today
  const validInitialDate = isNaN(initialDate.getTime()) ? new Date() : initialDate;
  
  const [currentMonth, setCurrentMonth] = useState(validInitialDate);
  
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  return (
    <div className="w-full bg-surface-container-high/50 border border-outline-variant/20 rounded-xl p-3 mb-4">
       <div className="flex justify-between items-center mb-2">
         <button onClick={prevMonth} className="text-on-surface-variant hover:text-on-surface p-1"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
         <span className="font-label-md text-sm text-on-surface">{currentMonth.toLocaleDateString('default', { month: 'long', year: 'numeric' })}</span>
         <button onClick={nextMonth} className="text-on-surface-variant hover:text-on-surface p-1"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
       </div>
       <div className="grid grid-cols-7 gap-1 text-center mb-1">
         {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="text-[10px] font-label-md text-on-surface-variant/60">{d}</div>)}
       </div>
       <div className="grid grid-cols-7 gap-1 text-center">
         {blanks.map(b => <div key={`blank-${b}`} className="h-6"></div>)}
         {days.map(d => {
           const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
           const isSelected = dateStr === selectedDate;
           const isHighlighted = highlightDates.includes(dateStr);
           return (
             <button
               key={d}
               onClick={() => onSelectDate(dateStr)}
               className={`h-6 w-full rounded-full text-xs font-label-md flex items-center justify-center transition-colors
                 ${isSelected ? 'bg-primary text-on-primary' : 
                   isHighlighted ? 'bg-tertiary/20 text-tertiary hover:bg-tertiary/30' : 
                   'text-on-surface hover:bg-surface-variant/50'}
               `}
             >
               {d}
             </button>
           );
         })}
       </div>
    </div>
  );
};

export default function RevisionCenter() {
  const [due, setDue] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null); // Which item is currently being reviewed
  const [flipped, setFlipped] = useState(false);

  const [stickyNotes, setStickyNotes] = useState([]);
  const [loadingSticky, setLoadingSticky] = useState(false);
  const [currentStickyNoteIndex, setCurrentStickyNoteIndex] = useState(0);
  const [subjects, setSubjects] = useState([]);
  const [stickySubjectId, setStickySubjectId] = useState("");

  const fetchStickyNotes = async () => {
    setLoadingSticky(true);
    try {
      const res = await getStickyNotes(stickySubjectId);
      setStickyNotes(res.data);
      setCurrentStickyNoteIndex(0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSticky(false);
    }
  };

  const downloadStickyNotes = () => {
    if (stickyNotes.length === 0) return;
    const content = stickyNotes.map((n, i) => `Concept ${i + 1} (${n.subject || 'General'}):\nTerm: ${n.term}\nDefinition: ${n.definition}\n`).join('\n---\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quick_concepts_${getFormattedDate()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getFormattedDate = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split("T")[0];
  };

  const [searchDate, setSearchDate] = useState(getFormattedDate(0));
  const [searchedNotes, setSearchedNotes] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareResource, setShareResource] = useState({ type: "", id: "" });
  const [expandedNote, setExpandedNote] = useState(null);

  const handleShareDay = (dateStr) => {
    setShareResource({ type: "revision_day", id: dateStr });
    setShareModalOpen(true);
  };

  const [uploadDates, setUploadDates] = useState([]);

  const load = () => {
    Promise.all([
      dueReviews(),
      upcomingReviews(),
      getUploadDates()
    ]).then(([d, u, dates]) => {
      setDue(d.data);
      setUpcoming(u.data);
      if (d.data.length > 0 && !active) {
        setActive(d.data[0]); // Set first item as active
      }
      setUploadDates(dates.data || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    listSubjects().then((res) => setSubjects(res.data));
  }, []);

  useEffect(() => {
    setLoadingSearch(true);
    getDocumentsByDate(searchDate)
      .then(res => setSearchedNotes(res.data))
      .finally(() => setLoadingSearch(false));
  }, [searchDate]);

  const rate = async (quality) => {
    if (!active) return;
    await submitReview({ schedule_id: active.schedule_id, quality });
    setFlipped(false);
    
    // Optimistically remove from due list
    const newDue = due.filter(item => item.schedule_id !== active.schedule_id);
    setDue(newDue);
    if (newDue.length > 0) {
       setActive(newDue[0]);
    } else {
       setActive(null);
    }
    load(); // Refresh the list in the background
  };

  return (
    <div className="w-full max-w-container-max mx-auto relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
      {/* Ambient Depth Layers */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>

      <div className="w-full flex flex-col md:flex-row gap-12 mt-8">
        
        {/* Left Column: Core Spaced Repetition Area */}
        <div className="flex-1 flex flex-col items-center gap-12 relative">
           
           {/* Daily Goal Header info */}
           <div className="w-full flex justify-between items-center bg-surface-container/30 backdrop-blur-md rounded-2xl p-6 border border-outline-variant/10">
              <div>
                 <h1 className="font-display-lg text-2xl md:text-3xl text-on-surface">Revision Center</h1>
                 <p className="font-body-md text-on-surface-variant text-sm mt-1">Spaced repetition scheduling so nothing you've learned fades.</p>
              </div>
              {due.length > 0 && (
                <div className="flex items-center gap-4 bg-surface-container-high/80 rounded-xl px-4 py-2 border border-white/5">
                   <div className="relative w-10 h-10">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path className="text-surface-container-lowest" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                          <path className="text-secondary transition-all duration-1000 ease-out" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="100, 100" strokeDashoffset={active ? '50' : '0'} strokeLinecap="round" strokeWidth="3"></path>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                          <span className="font-label-md text-[10px] text-on-surface">{due.length}</span>
                      </div>
                   </div>
                   <div className="hidden sm:block">
                       <h3 className="font-label-md text-xs text-on-surface">Due Today</h3>
                   </div>
                </div>
              )}
           </div>

           {loading ? (
             <div className="h-[400px] flex items-center justify-center">
                <span className="material-symbols-outlined animate-spin text-4xl text-primary">refresh</span>
             </div>
           ) : active ? (
             <div className="w-full max-w-3xl flex flex-col items-center gap-8 fade-in">
               
               {/* Context Chip */}
               <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-1.5 rounded-full font-label-md text-sm">
                   <span className="material-symbols-outlined text-[16px]">memory</span>
                   Reviewing: {active.topic_name || `Topic ${active.topic_id}`}
               </div>

               {/* Flashcard 3D Container */}
               <div className="w-full h-[400px] cursor-pointer group" style={{ perspective: '1000px' }} onClick={() => setFlipped(!flipped)}>
                   <div className={`relative w-full h-full transition-transform duration-700 shadow-2xl shadow-primary/5 rounded-[2rem] ${flipped ? 'rotate-y-180' : ''}`} style={{ transformStyle: 'preserve-3d' }}>
                       
                       {/* Front of Card (Question/Prompt) */}
                       <div className="absolute inset-0 bg-surface-container/60 backdrop-blur-xl rounded-[2rem] border border-white/10 flex flex-col items-center justify-center p-8 md:p-12 text-center overflow-hidden" style={{ backfaceVisibility: 'hidden' }}>
                           <div className="absolute -top-12 -left-12 w-32 h-32 bg-primary/20 rounded-full blur-[40px]"></div>
                           <h2 className="font-display-lg text-2xl md:text-4xl text-on-surface max-w-xl leading-tight">
                               Do you recall the details for this topic?
                           </h2>
                           <p className="mt-4 text-on-surface-variant max-w-md text-sm md:text-base">
                             (This would ideally show a specific question generated for {active.topic_name})
                           </p>
                           <div className={`absolute bottom-8 flex items-center gap-2 text-on-surface-variant/60 font-label-md text-sm transition-opacity duration-300 ${flipped ? 'opacity-0' : 'opacity-100 animate-pulse'}`}>
                               <span className="material-symbols-outlined text-[18px]">touch_app</span>
                               Click or tap to reveal
                           </div>
                       </div>
                       
                       {/* Back of Card (Answer) */}
                       <div className="absolute inset-0 rotate-y-180 bg-surface-container-high/80 backdrop-blur-xl rounded-[2rem] border border-white/15 flex flex-col items-center justify-center p-8 md:p-12 text-center overflow-hidden" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                           <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-secondary/20 rounded-full blur-[40px]"></div>
                           <div className="prose prose-invert max-w-2xl">
                               <h3 className="font-headline-lg text-xl md:text-2xl text-primary mb-6">{active.topic_name || "Topic Details"}</h3>
                               <p className="font-body-lg text-sm md:text-lg text-on-surface-variant leading-relaxed">
                                   Here is where the synthesized notes or the exact answer for the generated question would be displayed, allowing you to grade your recall.
                               </p>
                           </div>
                       </div>
                   </div>
               </div>

               {/* Feedback Controls (Revealed after flip) */}
               <div className={`w-full flex justify-between gap-2 md:gap-4 transition-all duration-500 ${flipped ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                   <button onClick={(e) => { e.stopPropagation(); rate(1); }} className="flex-1 group relative overflow-hidden bg-surface-container rounded-2xl border border-white/5 hover:border-error/30 transition-all duration-300 p-3 md:p-4 active:scale-95 shadow-lg">
                       <div className="absolute inset-0 bg-error/0 group-hover:bg-error/10 transition-colors duration-300"></div>
                       <div className="relative flex flex-col items-center gap-1">
                           <span className="font-headline-md text-sm md:text-base text-error group-hover:drop-shadow-[0_0_8px_rgba(255,180,171,0.5)] transition-all">Forgot</span>
                           <span className="font-label-md text-[10px] md:text-xs text-on-surface-variant/60">&lt; 1m</span>
                       </div>
                   </button>
                   <button onClick={(e) => { e.stopPropagation(); rate(3); }} className="flex-1 group relative overflow-hidden bg-surface-container rounded-2xl border border-white/5 hover:border-outline/50 transition-all duration-300 p-3 md:p-4 active:scale-95 shadow-lg">
                       <div className="absolute inset-0 bg-surface-variant/0 group-hover:bg-surface-variant/50 transition-colors duration-300"></div>
                       <div className="relative flex flex-col items-center gap-1">
                           <span className="font-headline-md text-sm md:text-base text-on-surface group-hover:text-white transition-all">Hard</span>
                           <span className="font-label-md text-[10px] md:text-xs text-on-surface-variant/60">6m</span>
                       </div>
                   </button>
                   <button onClick={(e) => { e.stopPropagation(); rate(4); }} className="flex-1 group relative overflow-hidden bg-surface-container rounded-2xl border border-white/5 hover:border-secondary/40 transition-all duration-300 p-3 md:p-4 active:scale-95 shadow-lg">
                       <div className="absolute inset-0 bg-secondary/0 group-hover:bg-secondary/10 transition-colors duration-300"></div>
                       <div className="relative flex flex-col items-center gap-1">
                           <span className="font-headline-md text-sm md:text-base text-secondary group-hover:drop-shadow-[0_0_8px_rgba(123,214,209,0.5)] transition-all">Good</span>
                           <span className="font-label-md text-[10px] md:text-xs text-on-surface-variant/60">10m</span>
                       </div>
                   </button>
                   <button onClick={(e) => { e.stopPropagation(); rate(5); }} className="flex-1 group relative overflow-hidden bg-surface-container rounded-2xl border border-white/5 hover:border-primary/50 transition-all duration-300 p-3 md:p-4 active:scale-95 shadow-lg">
                       <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/15 transition-colors duration-300"></div>
                       <div className="relative flex flex-col items-center gap-1">
                           <span className="font-headline-md text-sm md:text-base text-primary group-hover:drop-shadow-[0_0_8px_rgba(211,187,255,0.6)] transition-all">Easy</span>
                           <span className="font-label-md text-[10px] md:text-xs text-on-surface-variant/60">4d</span>
                       </div>
                   </button>
               </div>
             </div>
           ) : (
             <div className="w-full bg-surface-container/20 backdrop-blur-sm border border-outline-variant/10 rounded-[2rem] flex flex-col items-center justify-center p-8 md:p-12 text-center fade-in">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(208,188,255,0.2)]">
                   <span className="material-symbols-outlined text-5xl text-primary">psychology</span>
                </div>
                <h2 className="font-headline-md text-3xl text-on-surface mb-4">You're all caught up!</h2>
                <div className="max-w-xl text-on-surface-variant space-y-4 mb-8 text-sm md:text-base leading-relaxed">
                   <p>You have completed all scheduled reviews for today. Great job keeping your memory fresh.</p>
                   <div className="bg-surface-container/40 p-4 rounded-xl border border-outline-variant/10 text-left flex gap-4 items-start">
                      <span className="material-symbols-outlined text-secondary text-2xl mt-1">info</span>
                      <p className="text-xs md:text-sm">
                         <strong>How Spaced Repetition Works:</strong> Every time you review a topic, the AI schedules your next review at the optimal time to prevent forgetting. Topics you find difficult appear more often, while easy topics are pushed further into the future.
                      </p>
                   </div>
                </div>
                <button 
                  onClick={() => window.location.href = '/exam'} 
                  className="bg-primary text-on-primary font-bold px-6 py-3 rounded-full hover:bg-primary/90 transition-colors shadow-lg flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">quiz</span>
                  Start Quick Practice
                </button>
             </div>
           )}
           
           {/* AI Sticky Notes Section */}
           <div className="w-full mt-4 border-t border-outline-variant/10 pt-8">
             <div className="flex items-center justify-between mb-6">
                <h2 className="font-headline-md text-2xl text-on-surface flex items-center gap-2">
                   <span className="material-symbols-outlined text-tertiary">sticky_note_2</span>
                   Quick Concepts
                </h2>
                <div className="flex items-center gap-3">
                  <select
                    className="bg-surface-container/50 border border-outline-variant/20 text-on-surface text-sm rounded-full px-4 py-2 focus:outline-none focus:border-tertiary/50"
                    value={stickySubjectId}
                    onChange={(e) => setStickySubjectId(e.target.value)}
                  >
                    <option value="">All Subjects</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={fetchStickyNotes}
                    disabled={loadingSticky}
                    className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-sm px-4 py-2 rounded-full transition-colors flex items-center gap-2 border border-outline-variant/20 shadow-sm disabled:opacity-50"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${loadingSticky ? 'animate-spin' : ''}`}>
                      {loadingSticky ? 'refresh' : 'auto_awesome'}
                    </span>
                    {loadingSticky ? 'Generating...' : 'Generate AI Notes'}
                  </button>
                  {stickyNotes.length > 0 && (
                    <button
                      onClick={downloadStickyNotes}
                      className="bg-surface-container hover:bg-surface-container-high text-on-surface text-sm p-2 rounded-full transition-colors flex items-center justify-center border border-outline-variant/20 shadow-sm"
                      title="Download Concepts"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span>
                    </button>
                  )}
                </div>
             </div>
             
             {stickyNotes.length > 0 ? (
               <div className="relative">
                 {/* Navigation Arrows */}
                 {stickyNotes.length > 1 && (
                   <div className="absolute top-1/2 -translate-y-1/2 -left-4 -right-4 flex justify-between z-10 pointer-events-none">
                      <button 
                        onClick={() => setCurrentStickyNoteIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentStickyNoteIndex === 0}
                        className="w-10 h-10 bg-surface-container shadow-md rounded-full flex items-center justify-center text-on-surface hover:text-primary transition-colors disabled:opacity-30 disabled:hover:text-on-surface pointer-events-auto border border-outline-variant/20"
                      >
                         <span className="material-symbols-outlined">chevron_left</span>
                      </button>
                      <button 
                        onClick={() => setCurrentStickyNoteIndex(prev => Math.min(stickyNotes.length - 1, prev + 1))}
                        disabled={currentStickyNoteIndex === stickyNotes.length - 1}
                        className="w-10 h-10 bg-surface-container shadow-md rounded-full flex items-center justify-center text-on-surface hover:text-primary transition-colors disabled:opacity-30 disabled:hover:text-on-surface pointer-events-auto border border-outline-variant/20"
                      >
                         <span className="material-symbols-outlined">chevron_right</span>
                      </button>
                   </div>
                 )}
                 
                 {/* Current Sticky Note */}
                 <div className="bg-surface-container/40 backdrop-blur-md border border-outline-variant/20 rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group mx-auto max-w-lg min-h-[200px] flex flex-col justify-center">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-tertiary/20 to-transparent rounded-bl-[3rem] -mr-12 -mt-12 transition-transform group-hover:scale-150"></div>
                    
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <span className="font-label-md text-xs uppercase tracking-widest text-tertiary bg-tertiary/10 px-3 py-1 rounded-full border border-tertiary/20 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
                        {stickyNotes[currentStickyNoteIndex]?.subject || "General"}
                      </span>
                      <span className="text-xs font-label-md text-on-surface-variant/50">
                        {currentStickyNoteIndex + 1} of {stickyNotes.length}
                      </span>
                    </div>
                    
                    <h3 className="font-headline-md text-2xl text-on-surface mb-3 relative z-10">
                      {stickyNotes[currentStickyNoteIndex]?.term}
                    </h3>
                    <p className="font-body-md text-base text-on-surface-variant leading-relaxed relative z-10">
                      {stickyNotes[currentStickyNoteIndex]?.definition}
                    </p>
                 </div>
                 
                 {/* Dots Indicator */}
                 {stickyNotes.length > 1 && (
                   <div className="flex justify-center gap-1.5 mt-6">
                     {stickyNotes.map((_, idx) => (
                       <button
                         key={idx}
                         onClick={() => setCurrentStickyNoteIndex(idx)}
                         className={`h-1.5 rounded-full transition-all ${
                           idx === currentStickyNoteIndex 
                             ? 'w-6 bg-tertiary' 
                             : 'w-1.5 bg-outline-variant/30 hover:bg-outline-variant/50'
                         }`}
                       />
                     ))}
                   </div>
                 )}
               </div>
             ) : (
               <div className="w-full border border-dashed border-outline-variant/30 rounded-2xl p-8 text-center bg-surface-container-lowest/30">
                 <div className="w-16 h-16 bg-tertiary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl text-tertiary">psychology</span>
                 </div>
                 <p className="text-on-surface-variant text-sm mb-4 max-w-md mx-auto">Generate bite-sized, easy to understand concept flashcards from your study materials.</p>
                 <button onClick={fetchStickyNotes} className="bg-tertiary/10 text-tertiary hover:bg-tertiary/20 px-4 py-2 rounded-full text-sm font-label-md flex items-center justify-center gap-2 mx-auto transition-colors border border-tertiary/20">
                   <span className="material-symbols-outlined text-[18px]">add_circle</span>
                   Generate Concept Notes
                 </button>
               </div>
             )}
           </div>

        </div>

        {/* Right Column: Upcoming & Uploads Sidebar */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col gap-8 shrink-0">
          
          {/* Upcoming Schedule Bento */}
          <div className="bg-surface-container/40 backdrop-blur-xl border border-outline-variant/10 rounded-3xl p-6">
             <h2 className="font-headline-md text-lg text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary">calendar_clock</span>
                Upcoming
             </h2>
             {upcoming.length === 0 ? (
                <p className="text-sm text-on-surface-variant italic">No items scheduled for the future.</p>
             ) : (
                <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2">
                   {upcoming.map((u, i) => (
                      <div key={i} className="flex justify-between items-start border-b border-white/5 pb-3 last:border-0 last:pb-0">
                         <div className="flex flex-col gap-1 pr-2">
                             <span className="font-body-md text-sm text-on-surface line-clamp-1">{u.topic_id}</span>
                             <span className="font-label-md text-[10px] uppercase text-outline-variant tracking-wider">Topic ID</span>
                         </div>
                         <div className="flex flex-col items-end shrink-0">
                             <span className="font-body-md text-sm text-secondary">{u.next_review_date}</span>
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </div>

          {/* Past Notes & Sharing Bento */}
          <div className="bg-surface-container/40 backdrop-blur-xl border border-outline-variant/10 rounded-3xl p-6 flex flex-col h-full max-h-[500px]">
             <div className="flex justify-between items-center mb-4">
                <h2 className="font-headline-md text-lg text-on-surface flex items-center gap-2">
                   <span className="material-symbols-outlined text-primary">folder_open</span>
                   Notes Archive
                </h2>
                {searchedNotes.length > 0 && (
                  <button 
                    onClick={() => handleShareDay(searchDate)}
                    className="text-xs font-label-md text-secondary border border-secondary/30 bg-secondary/10 px-3 py-1.5 rounded-full hover:bg-secondary/20 transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">share</span> Share
                  </button>
                )}
             </div>
             
             <MiniCalendar 
               selectedDate={searchDate} 
               onSelectDate={setSearchDate} 
               highlightDates={uploadDates} 
             />

             <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {loadingSearch ? (
                  <div className="flex justify-center py-8"><span className="material-symbols-outlined animate-spin text-primary">refresh</span></div>
                ) : searchedNotes.length === 0 ? (
                  <p className="text-sm text-on-surface-variant italic text-center py-8">No notes found for this date.</p>
                ) : (
                  searchedNotes.map((note) => (
                    <div key={note.id} onClick={() => setExpandedNote(note)} className="bg-surface-container-highest/30 rounded-xl p-4 border border-white/5 hover:bg-surface-container-highest transition-colors cursor-pointer">
                       <p className="font-label-md text-sm text-on-surface mb-1 truncate">{note.title}</p>
                       <p className="text-xs text-on-surface-variant line-clamp-2">{note.summary}</p>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>

      </div>

      <ShareConfigModal 
        isOpen={shareModalOpen} 
        onClose={() => setShareModalOpen(false)} 
        resourceType={shareResource.type}
        resourceId={shareResource.id}
      />

      {expandedNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-surface-container rounded-3xl border border-outline-variant/20 p-8 max-w-2xl w-full max-h-[80vh] flex flex-col relative shadow-2xl">
            <button onClick={() => setExpandedNote(null)} className="absolute top-6 right-6 text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
            <h2 className="text-2xl font-headline-md text-on-surface mb-2 pr-8">{expandedNote.title}</h2>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-xs font-label-md text-secondary bg-secondary/10 px-2 py-1 rounded-md">{searchDate}</span>
            </div>
            <div className="flex-1 overflow-y-auto pr-4 prose prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-on-surface-variant leading-relaxed">
                {expandedNote.summary || "No full summary available."}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
