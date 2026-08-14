import React, { useState, useEffect } from "react";
import { createTopic, listSubjects } from "../api/client";

export default function CreateTopicModal({ isOpen, onClose, onCreated, initialData }) {
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState("");
  const [name, setName] = useState("");
  
  // New Duration States
  const [durationValue, setDurationValue] = useState("");
  const [durationUnit, setDurationUnit] = useState("Days");

  const [objectives, setObjectives] = useState([""]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      listSubjects().then(res => {
        setSubjects(res.data);
        if (!initialData && res.data.length > 0) {
          setSubjectId(res.data[0].id);
        }
      }).catch(console.error);

      if (initialData) {
        setName(initialData.name || "");
        setSubjectId(initialData.subject_id || "");
        // Simplified setup for duration since we don't fetch target duration back right now
        setDurationValue(""); 
        setDurationUnit("Days");
        setObjectives([""]);
      } else {
        setName("");
        setDurationValue("");
        setDurationUnit("Days");
        setObjectives([""]);
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const updateObjective = (index, val) => {
    const newObjs = [...objectives];
    newObjs[index] = val;
    setObjectives(newObjs);
  };

  const removeObjective = (index) => {
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !subjectId) return;
    
    setLoading(true);
    const validObjectives = objectives.filter(o => o.trim() !== "");
    
    let durationDays = null;
    const dVal = parseInt(durationValue);
    if (!isNaN(dVal) && dVal > 0) {
      durationDays = durationUnit === "Months" ? dVal * 30 : (durationUnit === "Weeks" ? dVal * 7 : dVal);
    }

    try {
      if (initialData) {
        // We only support updating the name in the backend for now
        // Import updateTopic dynamically or add it to imports
        const { updateTopic } = await import("../api/client");
        await updateTopic(initialData.id, { name });
      } else {
        await createTopic({
          subject_id: subjectId,
          name,
          target_duration_days: durationDays,
          initial_objectives: validObjectives
        });
      }
      onCreated();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save topic.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-[#12121A] text-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-bold font-headline-md tracking-tight">{initialData ? "Edit Topic" : "Create New Topic"}</h2>
            <p className="text-slate-400 mt-1 font-label-md">{initialData ? "Update your topic details." : "Define your next area of focus."}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6 overflow-y-auto custom-scrollbar max-h-[70vh]">
          
          <div>
             <label className="block text-sm font-semibold mb-2">Subject Collection</label>
             <select 
               value={subjectId}
               onChange={(e) => setSubjectId(e.target.value)}
               className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors appearance-none"
               required
               disabled={!!initialData}
             >
               {subjects.map(s => (
                 <option key={s.id} value={s.id} className="bg-[#12121A]">{s.name}</option>
               ))}
             </select>
          </div>

          <div>
             <label className="block text-sm font-semibold mb-2">Topic Name</label>
             <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">search</span>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Quantum Computing"
                  className="w-full bg-white border border-white/10 rounded-full pl-12 pr-4 py-3 text-black font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-inner"
                />
             </div>
             {!initialData && (
               <div className="flex items-center gap-2 mt-3 overflow-x-auto custom-scrollbar pb-1">
                  <span className="text-xs font-bold text-secondary flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">auto_awesome</span> AI Suggested:</span>
                  {["Advanced Cryptography", "Machine Learning Basics", "Neural Networks"].map(s => (
                    <button 
                      type="button"
                      key={s} 
                      onClick={() => setName(s)}
                      className="whitespace-nowrap px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-primary/20 hover:text-primary transition-colors"
                    >
                      {s}
                    </button>
                  ))}
               </div>
             )}
          </div>

          <div>
               <label className="block text-sm font-semibold mb-2">Target Duration (Optional)</label>
               <div className="flex gap-4">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">calendar_month</span>
                    <input 
                      type="number"
                      min="1"
                      placeholder="e.g. 2"
                      value={durationValue}
                      onChange={(e) => setDurationValue(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-full pl-12 pr-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="relative w-40">
                    <select 
                      value={durationUnit}
                      onChange={(e) => setDurationUnit(e.target.value)}
                      className="w-full h-full bg-white/5 border border-white/10 rounded-full px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors appearance-none"
                    >
                      <option value="Days" className="bg-[#12121A]">Days</option>
                      <option value="Weeks" className="bg-[#12121A]">Weeks</option>
                      <option value="Months" className="bg-[#12121A]">Months</option>
                    </select>
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 pointer-events-none">expand_more</span>
                  </div>
               </div>
           </div>

          {!initialData && (
            <div>
             <label className="block text-sm font-semibold mb-2">What do you want to achieve with this topic? (Objectives)</label>
             <p className="text-xs text-slate-400 mb-3">Define clear, actionable goals (e.g., "Understand the core concepts", "Complete practical exercises").</p>
             <div className="space-y-3">
                {objectives.map((obj, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 focus-within:border-primary/50 transition-colors">
                     <span className="material-symbols-outlined text-slate-500">radio_button_unchecked</span>
                     <input 
                        type="text"
                        value={obj}
                        onChange={(e) => updateObjective(i, e.target.value)}
                        className="bg-transparent border-none outline-none flex-grow text-white text-sm placeholder-slate-500 py-1"
                        placeholder={i === 0 ? "e.g., Understand superposition and entanglement." : "Add another objective..."}
                     />
                     {objectives.length > 1 && (
                       <button type="button" onClick={() => removeObjective(i)} className="text-slate-500 hover:text-error shrink-0 w-6 h-6 flex items-center justify-center">
                         <span className="material-symbols-outlined text-[18px]">close</span>
                       </button>
                     )}
                  </div>
                ))}
             </div>
             <button 
               type="button"
               onClick={() => setObjectives([...objectives, ""])}
               className="mt-3 w-8 h-8 rounded-full border border-dashed border-white/20 text-slate-400 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors"
             >
               <span className="material-symbols-outlined text-[18px]">add</span>
             </button>
          </div>
          )}

        </form>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex justify-end gap-3 shrink-0">
          <button 
            type="button" 
            onClick={onClose}
            className="px-6 py-2 rounded-full font-bold text-slate-300 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="bg-primary text-on-primary px-8 py-2 rounded-full font-bold hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 transition-transform shadow-[0_0_15px_rgba(111,66,193,0.3)]"
          >
            {loading ? "Saving..." : (initialData ? "Update Topic" : "Create Topic")}
          </button>
        </div>

      </div>
    </div>
  );
}
