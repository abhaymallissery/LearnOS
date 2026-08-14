import React, { useState, useEffect } from "react";
import { listTopics } from "../api/client";
import { useStudyData } from "../context/StudyContext";

export default function CreateDailyPlanModal({ isOpen, onClose }) {
  const { addTask } = useStudyData();
  const [topics, setTopics] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [objectives, setObjectives] = useState([""]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      listTopics("").then(res => setTopics(res.data)).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleTopic = (id) => {
    setSelectedTopics(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const updateObjective = (index, val) => {
    const newObjs = [...objectives];
    newObjs[index] = val;
    setObjectives(newObjs);
  };

  const removeObjective = (index) => {
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setLoading(true);
    const validObjectives = objectives.filter(o => o.trim() !== "");
    for (const obj of validObjectives) {
      await addTask(obj);
    }
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-[#12121A] text-white rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-8 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-primary/10 to-transparent shrink-0">
          <div>
            <h2 className="text-3xl font-bold font-headline-md tracking-tight">Create Your Daily Plan</h2>
            <p className="text-slate-400 mt-2 font-label-md">Select topics and set your objectives for a high-impact study session.</p>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
               <span className="material-symbols-outlined text-3xl">close</span>
             </button>
             <button 
               onClick={handleSubmit} 
               disabled={loading}
               className="bg-secondary text-on-secondary px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50 shadow-[0_0_15px_rgba(0,106,103,0.4)]"
             >
               <span className="material-symbols-outlined">check_circle</span>
               {loading ? "Submitting..." : "Submit"}
             </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col md:flex-row gap-8 overflow-y-auto custom-scrollbar">
          
          {/* Left Column: Topics */}
          <div className="w-full md:w-1/3">
            <div className="flex justify-between items-center mb-4">
               <div className="flex items-center gap-2 text-xl font-semibold">
                 <span className="material-symbols-outlined">menu_book</span>
                 <h3>Roadmap Topics</h3>
               </div>
               <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold border border-primary/30">
                 {selectedTopics.length} Selected
               </span>
            </div>
            
            <div className="space-y-3">
               {topics.length === 0 ? (
                 <p className="text-slate-500 text-sm italic">No topics available. Create one in the Study Plan page first.</p>
               ) : (
                 topics.map(topic => (
                   <div 
                     key={topic.id} 
                     onClick={() => toggleTopic(topic.id)}
                     className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex gap-4 items-center ${selectedTopics.includes(topic.id) ? 'border-primary bg-primary/10' : 'border-white/5 bg-white/5 hover:border-white/20'}`}
                   >
                     <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 shrink-0 ${selectedTopics.includes(topic.id) ? 'bg-primary border-primary text-white' : 'border-slate-500'}`}>
                        {selectedTopics.includes(topic.id) && <span className="material-symbols-outlined text-[16px]">check</span>}
                     </div>
                     <div className="flex-1">
                       <p className="font-bold">{topic.name}</p>
                       {/* Mock module progress line */}
                       <div className="w-full bg-white/10 h-1 mt-2 rounded-full overflow-hidden">
                         <div className="bg-primary h-full w-1/2 rounded-full"></div>
                       </div>
                     </div>
                   </div>
                 ))
               )}
            </div>
          </div>

          {/* Right Column: Objectives & Timeline */}
          <div className="w-full md:w-2/3 flex flex-col gap-8">
             
             {/* Focus Objectives */}
             <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                <div className="flex items-center gap-2 text-xl font-semibold mb-6 text-green-400">
                  <span className="material-symbols-outlined">flag</span>
                  <h3>Today's Focus Objectives</h3>
                </div>
                
                <div className="space-y-3 mb-4">
                   {objectives.map((obj, i) => (
                     <div key={i} className="flex items-center gap-3 bg-black/40 p-3 rounded-2xl border border-white/10 group focus-within:border-primary/50 transition-colors">
                        <span className="material-symbols-outlined text-slate-500 group-focus-within:text-primary">radio_button_unchecked</span>
                        <input 
                           type="text"
                           value={obj}
                           onChange={(e) => updateObjective(i, e.target.value)}
                           className="bg-transparent border-none outline-none flex-grow text-white text-sm placeholder-slate-500"
                           placeholder="Add a specific objective (e.g., Complete Chapter 4)..."
                        />
                        {objectives.length > 1 && (
                          <button onClick={() => removeObjective(i)} className="text-slate-500 hover:text-error">
                            <span className="material-symbols-outlined text-[20px]">close</span>
                          </button>
                        )}
                     </div>
                   ))}
                </div>
                <button 
                  onClick={() => setObjectives([...objectives, ""])}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <span className="material-symbols-outlined">add</span>
                </button>
             </div>

             {/* Session Timeline (Mocked for UI as requested) */}
             <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                <div className="flex items-center gap-2 text-xl font-semibold mb-6">
                  <span className="material-symbols-outlined">schedule</span>
                  <h3>Session Timeline</h3>
                </div>
                
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[11px] before:w-0.5 before:bg-white/10">
                   <div className="relative pl-8">
                      <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-[#12121A] bg-primary shadow-[0_0_10px_rgba(111,66,193,0.5)]"></div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-primary font-bold text-sm tracking-widest">10:00 AM - 11:30 AM</span>
                        <span className="bg-white/10 text-xs px-2 py-1 rounded-full text-slate-300">90 min focus</span>
                      </div>
                      <h4 className="text-lg font-semibold text-white">Deep Dive: Selected Topics</h4>
                      <p className="text-slate-400 text-sm mt-1">Focus: Algorithm implementation & debugging.</p>
                   </div>
                   <div className="relative pl-8">
                      <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-[#12121A] bg-slate-600"></div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-slate-400 font-bold text-sm tracking-widest">11:30 AM - 11:45 AM</span>
                        <span className="bg-white/10 text-xs px-2 py-1 rounded-full text-slate-300">15 min break</span>
                      </div>
                      <h4 className="text-lg font-semibold text-slate-300">Cognitive Rest</h4>
                   </div>
                </div>
             </div>

          </div>
        </div>
        
      </div>
    </div>
  );
}
