import React, { useEffect, useState } from "react";
import {
  listTopics, getTopicNotes,
  reviewManualNote, createManualNote,
  deleteTopic, updateTopic
} from "../api/client";
import { useNavigate } from "react-router-dom";
import { Spinner } from "../components/ui.jsx";
import ReactMarkdown from "react-markdown";
import CreateTopicModal from "../components/CreateTopicModal.jsx";

export default function StudyPlan() {
  const [loading, setLoading] = useState(true);
  
  // Topics Roadmap
  const [topics, setTopics] = useState([]);
  const [filter, setFilter] = useState("all");
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [editingTopicData, setEditingTopicData] = useState(null);

  // Smart Note Review
  const [activeTopicForNote, setActiveTopicForNote] = useState(null);
  const [draftNote, setDraftNote] = useState("");
  const [reviewedNote, setReviewedNote] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [reviewTab, setReviewTab] = useState("draft"); // 'draft' or 'ai'

  // Topic Notes Viewing
  const [expandedNotesTopicId, setExpandedNotesTopicId] = useState(null);
  const [topicNotes, setTopicNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const navigate = useNavigate();

  const fetchTopics = async () => {
    try {
      const res = await listTopics("");
      setTopics(res.data);
    } catch(e) {
      console.error(e);
    }
  };

  const handleDeleteTopic = async (id) => {
    if (confirm("Are you sure you want to delete this topic?")) {
      try {
        await deleteTopic(id);
        fetchTopics();
        if (activeTopicForNote?.id === id) setActiveTopicForNote(null);
      } catch (err) {
        alert("Failed to delete topic");
      }
    }
  };


  useEffect(() => {
    fetchTopics().finally(() => setLoading(false));
  }, []);

  const toggleTopicNotes = async (topicId) => {
    if (expandedNotesTopicId === topicId) {
      setExpandedNotesTopicId(null);
      setTopicNotes([]);
    } else {
      setExpandedNotesTopicId(topicId);
      setLoadingNotes(true);
      try {
        const res = await getTopicNotes(topicId);
        setTopicNotes(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingNotes(false);
      }
    }
  };

  const handleReviewNote = async () => {
    if (!draftNote.trim() || !activeTopicForNote) return;
    setIsReviewing(true);
    setReviewTab("ai");
    try {
      const res = await reviewManualNote(activeTopicForNote.id, draftNote);
      setReviewedNote(res.data.reviewed_content);
    } catch (err) {
      alert("Failed to review note.");
      setReviewTab("draft");
    } finally {
      setIsReviewing(false);
    }
  };

  const handleSaveNote = async () => {
    if (!reviewedNote.trim() || !activeTopicForNote) return;
    setIsSaving(true);
    try {
      await createManualNote(activeTopicForNote.id, reviewedNote);
      if (expandedNotesTopicId === activeTopicForNote.id) {
        const res = await getTopicNotes(activeTopicForNote.id);
        setTopicNotes(res.data);
      }
      setActiveTopicForNote(null);
      setDraftNote("");
      setReviewedNote("");
      setReviewTab("draft");
    } catch (err) {
      alert("Failed to save note.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTopics = topics.filter(t => filter === "all" || t.status === filter);

  if (loading) return <Spinner />;

  return (
    <div className="w-full max-w-container-max mx-auto flex gap-8">
      
      {/* Main Content Area (Topics Roadmap) */}
      <div className={`flex-1 transition-all duration-300 ${activeTopicForNote ? 'md:w-1/2' : 'w-full'}`}>
        
        {/* Header */}
        <div className="mb-8 max-w-3xl">
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Study Plan</h2>
          <p className="text-on-surface-variant font-label-md mt-2">Manage your learning trajectory, track progress, and refine your understanding with AI-assisted manual notes.</p>
        </div>

        <div className="bg-surface-container/60 backdrop-blur-xl border border-outline-variant/20 rounded-3xl p-8 shadow-sm">
           
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Topics Roadmap</h3>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                 <select 
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="bg-surface border border-outline-variant/30 text-on-surface text-sm rounded-full px-4 py-2 focus:outline-none focus:border-secondary transition-colors"
                 >
                    <option value="all">All Topics</option>
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                 </select>
                 <button 
                   onClick={() => setIsTopicModalOpen(true)}
                   className="bg-primary text-on-primary font-bold text-sm px-5 py-2 rounded-full hover:scale-105 transition-transform flex items-center gap-2 shadow-[0_0_15px_rgba(111,66,193,0.3)] shrink-0"
                 >
                   <span className="material-symbols-outlined text-[18px]">add</span>
                   New Topic
                 </button>
              </div>
           </div>

           <div className="space-y-4">
             {filteredTopics.length === 0 ? (
                <div className="text-center py-12 text-on-surface-variant bg-surface-container-high/30 rounded-2xl border border-dashed border-outline-variant/50">
                  <span className="material-symbols-outlined text-4xl text-outline mb-2">account_tree</span>
                  <p>No topics found. Click "+ New Topic" to add one.</p>
                </div>
             ) : (
                filteredTopics.map(topic => {
                  const progress = topic.progress || 0;
                  return (
                  <div key={topic.id} className="bg-surface border border-outline-variant/20 p-6 rounded-2xl hover:border-primary/30 transition-colors shadow-sm group relative overflow-hidden">
                     <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="flex-1 mr-4">
                          <div className="flex items-center gap-3 mb-1">
                             <div className="flex items-center gap-2 group/title cursor-pointer" onClick={() => toggleTopicNotes(topic.id)}>
                               <h4 className="text-xl font-bold text-on-surface line-clamp-1 hover:text-primary transition-colors">{topic.name}</h4>
                               <button 
                                 onClick={(e) => { e.stopPropagation(); setEditingTopicData(topic); }}
                                 className="opacity-0 group-hover/title:opacity-100 text-on-surface-variant hover:text-primary transition-opacity"
                               >
                                 <span className="material-symbols-outlined text-[16px]">edit</span>
                               </button>
                               <button 
                                 onClick={(e) => { e.stopPropagation(); handleDeleteTopic(topic.id); }}
                                 className="opacity-0 group-hover/title:opacity-100 text-on-surface-variant hover:text-error transition-opacity"
                               >
                                 <span className="material-symbols-outlined text-[16px]">delete</span>
                               </button>
                               <span className="material-symbols-outlined text-on-surface-variant opacity-50 group-hover/title:opacity-100 transition-opacity">
                                 {expandedNotesTopicId === topic.id ? "expand_less" : "expand_more"}
                               </span>
                             </div>

                            <span className="bg-surface-container-high text-xs px-2 py-1 rounded-full text-on-surface-variant font-semibold border border-outline-variant/10 uppercase tracking-wide">
                              {topic.status.replace("_", " ")}
                            </span>
                          </div>
                          <p className="text-sm text-on-surface-variant max-w-lg">
                            Focusing on concepts, optimization, and practical applications.
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                           <div className="text-3xl font-extrabold text-on-surface font-headline-lg tracking-tighter">
                              {progress}%
                           </div>
                           <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Completion</div>
                        </div>
                     </div>
                     
                     <div className="w-full bg-surface-container-high rounded-full h-2 mb-6 overflow-hidden relative z-10">
                        <div 
                          className={`h-full rounded-full bg-gradient-to-r from-primary to-secondary shadow-[0_0_10px_rgba(111,66,193,0.3)] transition-all duration-1000`} 
                          style={{ width: `${progress}%` }}
                        ></div>
                     </div>
                     
                     <div className="flex justify-end relative z-10 mb-2">
                       <button 
                          onClick={() => {
                             setActiveTopicForNote(topic);
                             setDraftNote("");
                             setReviewedNote("");
                             setReviewTab("draft");
                          }}
                          className="flex items-center gap-2 bg-surface-container-high text-on-surface text-sm font-semibold px-4 py-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors border border-outline-variant/10 group-hover:border-primary/20"
                       >
                         <span className="material-symbols-outlined text-[18px]">edit_note</span>
                         Add Manual Note (AI Review)
                       </button>
                     </div>

                     {expandedNotesTopicId === topic.id && (
                        <div className="mt-4 pt-4 border-t border-outline-variant/20 relative z-10 animate-in fade-in slide-in-from-top-4 duration-300">
                          <div className="flex items-center justify-between mb-4">
                            <h5 className="font-bold text-on-surface flex items-center gap-2">
                              <span className="material-symbols-outlined text-secondary">history_edu</span>
                              Saved Notes
                            </h5>
                            {topicNotes.length > 0 && (
                              <button 
                                onClick={() => navigate(`/exam?topic=${topic.id}`)}
                                className="text-xs bg-secondary/10 text-secondary font-bold px-3 py-1.5 rounded-full hover:bg-secondary hover:text-on-secondary transition-colors flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[14px]">quiz</span>
                                Generate Exam
                              </button>
                            )}
                          </div>
                          
                          {loadingNotes ? (
                            <div className="flex justify-center p-4"><Spinner /></div>
                          ) : topicNotes.length === 0 ? (
                            <p className="text-sm text-outline italic text-center p-4">No notes saved for this topic yet.</p>
                          ) : (
                            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                              {topicNotes.map(note => (
                                <div key={note.id} className="bg-surface-container-lowest/50 p-4 rounded-xl border border-outline-variant/10">
                                  <div className="text-xs text-outline mb-2">{new Date(note.created_at).toLocaleString()}</div>
                                  <div className="prose prose-sm prose-invert max-w-none text-on-surface-variant">
                                    <ReactMarkdown>{note.content}</ReactMarkdown>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                     )}
                     {progress > 0 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/50 to-secondary/50"></div>}
                  </div>
                )
                })
             )}
           </div>

        </div>
      </div>

      {/* Smart Note Review Side Panel */}
      {activeTopicForNote && (
        <div className="w-full md:w-[450px] shrink-0 animate-in slide-in-from-right-8 fade-in duration-300">
           <div className="bg-surface-container/80 backdrop-blur-2xl border border-outline-variant/20 rounded-3xl p-6 shadow-xl sticky top-24 flex flex-col h-[calc(100vh-8rem)]">
              
              <div className="flex justify-between items-center mb-6">
                 <div>
                   <h3 className="font-headline-md text-xl font-bold flex items-center gap-2">
                     <span className="material-symbols-outlined text-secondary">auto_awesome</span>
                     Smart Note Review
                   </h3>
                   <p className="text-xs text-on-surface-variant mt-1">Topic: <span className="font-bold text-primary">{activeTopicForNote.name}</span></p>
                 </div>
                 <button onClick={() => setActiveTopicForNote(null)} className="text-on-surface-variant hover:text-error transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-error-container/20">
                   <span className="material-symbols-outlined text-[20px]">close</span>
                 </button>
              </div>

              <div className="flex gap-2 p-1 bg-surface-container-high rounded-full mb-4 shrink-0">
                 <button 
                   onClick={() => setReviewTab("draft")} 
                   className={`flex-1 text-sm font-bold py-2 rounded-full transition-all ${reviewTab === "draft" ? "bg-surface text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}
                 >
                   Your Draft
                 </button>
                 <button 
                   onClick={() => setReviewTab("ai")}
                   className={`flex-1 text-sm font-bold py-2 rounded-full transition-all flex items-center justify-center gap-1 ${reviewTab === "ai" ? "bg-surface text-secondary shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}
                 >
                   <span className="material-symbols-outlined text-[16px]">magic_button</span>
                   AI Refined
                 </button>
              </div>

              <div className="flex-grow overflow-y-auto mb-4 custom-scrollbar pr-2 relative">
                 {reviewTab === "draft" ? (
                   <textarea
                     className="w-full h-full bg-surface/50 border border-outline-variant/20 rounded-2xl p-4 text-on-surface resize-none focus:outline-none focus:border-primary/50 transition-colors font-body-md text-sm placeholder:text-outline/50"
                     placeholder="Dump your rough notes here. Don't worry about grammar, facts, or formatting—AI will fix it for you..."
                     value={draftNote}
                     onChange={(e) => setDraftNote(e.target.value)}
                   />
                 ) : (
                   <div className="w-full min-h-full bg-surface/50 border border-outline-variant/20 rounded-2xl p-4 text-on-surface-variant">
                     {isReviewing ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-secondary">
                          <span className="material-symbols-outlined text-4xl animate-spin">sync</span>
                          <p className="font-semibold text-sm animate-pulse">AI is polishing your notes...</p>
                        </div>
                     ) : reviewedNote ? (
                        <div className="prose prose-sm prose-invert max-w-none text-on-surface-variant prose-headings:text-on-surface">
                           <ReactMarkdown>{reviewedNote}</ReactMarkdown>
                        </div>
                     ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-2 text-outline text-center opacity-70">
                          <span className="material-symbols-outlined text-4xl">edit_note</span>
                          <p className="text-sm">Write a draft and click 'Refine Note' to see the magic.</p>
                        </div>
                     )}
                   </div>
                 )}
              </div>

              <div className="shrink-0 pt-4 border-t border-outline-variant/20">
                 {reviewTab === "draft" ? (
                    <button 
                      onClick={handleReviewNote} 
                      disabled={!draftNote.trim() || isReviewing}
                      className="w-full bg-primary text-on-primary font-bold py-3 rounded-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined">auto_awesome</span>
                      {isReviewing ? "Reviewing..." : "Refine Note"}
                    </button>
                 ) : (
                    <div className="flex gap-3">
                       <button 
                         onClick={() => setReviewTab("draft")}
                         className="flex-1 border border-outline-variant/30 text-on-surface font-bold py-3 rounded-xl hover:bg-surface-container-high transition-colors"
                       >
                         Discard
                       </button>
                       <button 
                         onClick={handleSaveNote}
                         disabled={!reviewedNote || isSaving}
                         className="flex-[2] bg-secondary text-on-secondary font-bold py-3 rounded-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_0_15px_rgba(0,106,103,0.3)]"
                       >
                         <span className="material-symbols-outlined text-[20px]">save</span>
                         {isSaving ? "Saving..." : "Accept & Save"}
                       </button>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      <CreateTopicModal 
        isOpen={isTopicModalOpen}
        onClose={() => setIsTopicModalOpen(false)}
        onCreated={fetchTopics}
      />
      <CreateTopicModal 
        isOpen={!!editingTopicData}
        onClose={() => setEditingTopicData(null)}
        onCreated={fetchTopics}
        initialData={editingTopicData}
      />
    </div>
  );
}
