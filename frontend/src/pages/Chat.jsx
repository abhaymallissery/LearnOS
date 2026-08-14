import React, { useEffect, useState, useRef } from "react";
import {
  listSubjects, listDocuments, getSubjectNotes, createChatSession, askChat, listChatSessions, getChatMessages, deleteChatSession, renameChatSession
} from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import { useChat } from "../context/ChatContext.jsx";
import { useSearchParams } from "react-router-dom";

export default function Chat() {
  const { user } = useAuth();
  const {
    sessions, setSessions,
    activeSession, setActiveSession,
    messages, setMessages,
    asking, setAsking,
    question, setQuestion
  } = useChat();
  const [subjects, setSubjects] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSubjects, setExpandedSubjects] = useState([]);
  const bottomRef = useRef(null);
  const [searchParams] = useSearchParams();
  const preselectedDoc = searchParams.get("document");
  
  // Custom scrollbar style injection
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      .chat-scroll::-webkit-scrollbar { width: 6px; }
      .chat-scroll::-webkit-scrollbar-track { background: transparent; }
      .chat-scroll::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.1); border-radius: 10px; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    listSubjects().then((res) => {
      setSubjects(res.data);
      const allDocs = res.data.map((s) => listDocuments(s.id));
      const allNotes = res.data.map((s) => getSubjectNotes(s.id));
      
      Promise.all([...allDocs, ...allNotes]).then((results) => {
        const docResults = results.slice(0, res.data.length);
        const noteResults = results.slice(res.data.length);
        
        const indexedDocs = docResults.flatMap((r) => r.data).filter(d => d.status === "indexed").map(d => ({ ...d, isNote: false }));
        
        const notes = noteResults.flatMap((r, index) => r.data.map(n => ({
           id: "note_" + n.id, 
           title: "Manual Note: " + n.title.replace("Manual Note: ", ""), 
           topic_id: n.topic_id, 
           subject_id: res.data[index].id,
           isNote: true 
        })));

        setDocuments([...indexedDocs, ...notes]);
        
        if (preselectedDoc) {
           setSelectedDocs([preselectedDoc]);
        }
      });
    });
    listChatSessions().then((res) => setSessions(res.data));
  }, [preselectedDoc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, asking]);

  const startSession = async () => {
    const realDocIds = [];
    const topicIds = new Set();
    
    for (const id of selectedDocs) {
       if (id.startsWith("note_")) {
          const noteObj = documents.find(d => d.id === id);
          if (noteObj) topicIds.add(noteObj.topic_id);
       } else {
          realDocIds.push(id);
       }
    }

    const res = await createChatSession({
      title: selectedDocs.length ? "Focused chat" : "General chat",
      document_ids: realDocIds,
      topic_ids: Array.from(topicIds),
    });
    setActiveSession(res.data.id);
    setSessions((prev) => [res.data, ...prev]);
    setMessages([]);
  };

  const openSession = async (session) => {
    setActiveSession(session.id);
    const res = await getChatMessages(session.id);
    setMessages(res.data);
  };

  const handleDeleteSession = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Delete this chat session?")) return;
    await deleteChatSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSession === id) {
      setActiveSession(null);
      setMessages([]);
    }
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim() || !activeSession) return;
    const q = question;
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", content: q, sources: [], created_at: new Date().toISOString() }]);
    setAsking(true);
    try {
      const res = await askChat({ session_id: activeSession, question: q });
      setMessages((prev) => [...prev, res.data]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ *Error connecting to the AI service. Please try again.*", sources: [] }]);
    } finally {
      setAsking(false);
    }
  };

  const handleRename = async (e, id, currentTitle) => {
    e.stopPropagation();
    const newTitle = prompt("Enter new chat name:", currentTitle);
    if (!newTitle || newTitle.trim() === currentTitle) return;
    try {
      await renameChatSession(id, newTitle.trim());
      setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle.trim() } : s));
    } catch (err) {
      alert("Failed to rename chat");
    }
  };

  const getActiveSessionDocs = () => {
    if (!activeSession) return [];
    const sessionObj = sessions.find(s => s.id === activeSession);
    if (!sessionObj) return [];
    const docNames = sessionObj.document_ids.map(id => {
      const d = documents.find(doc => doc.id === id);
      return d ? d.title : "Document";
    });
    const topicNames = sessionObj.topic_ids?.map(id => {
      const t = documents.find(doc => doc.topic_id === id);
      return t ? (t.title.replace("Manual Note: ", "")) : "Note";
    }) || [];
    return [...docNames, ...topicNames];
  };
  const activeDocs = getActiveSessionDocs();

  return (
    <div className="flex h-[calc(100vh-6rem)] overflow-hidden w-full max-w-container-max mx-auto relative -mt-4">
      
      {/* Context Panel (Left Side in React app for better flow) */}
      <aside className="hidden md:flex w-80 border-r border-outline-variant/20 bg-surface-container/60 backdrop-blur-xl flex-col z-10 mr-4 rounded-3xl shadow-sm overflow-hidden my-4">
        <div className="p-6 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-high/50">
          <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">description</span>
            Chat Context
          </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto chat-scroll p-6 flex flex-col gap-6">
          {/* Scope selection */}
          <div>
            <h4 className="font-label-md text-label-md text-on-surface-variant mb-3 uppercase tracking-wider text-[11px]">Scope Documents</h4>
            <input
              type="text"
              placeholder="Search documents..."
              className="w-full bg-surface-container-high/50 border border-outline-variant/20 rounded-lg px-3 py-2 text-xs mb-3 focus:outline-none focus:border-primary/50 text-on-surface"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="space-y-4 max-h-64 overflow-y-auto pr-1 chat-scroll">
              {subjects.map(subject => {
                const matchesSubject = subject.name.toLowerCase().includes(searchQuery.toLowerCase());
                const subjectDocs = documents.filter(d => d.subject_id === subject.id && (matchesSubject || d.title.toLowerCase().includes(searchQuery.toLowerCase())));
                
                // If there is a search query and it doesn't match this subject or any of its docs, hide it.
                if (searchQuery && !matchesSubject && subjectDocs.length === 0) return null;
                
                const allSelected = subjectDocs.length > 0 && subjectDocs.every(d => selectedDocs.includes(d.id));
                const someSelected = subjectDocs.some(d => selectedDocs.includes(d.id));

                return (
                  <div key={subject.id} className="space-y-1 bg-surface-container-lowest/30 rounded-lg p-1 border border-outline-variant/10">
                    <div className="flex items-center justify-between group hover:bg-surface-container p-1 rounded transition-colors">
                      <label className="flex items-center gap-2 text-sm font-semibold text-on-surface cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          className="rounded text-primary focus:ring-primary/50 bg-surface border-outline-variant/30"
                          checked={allSelected}
                          disabled={subjectDocs.length === 0}
                          ref={input => { if (input) input.indeterminate = someSelected && !allSelected; }}
                          onChange={(e) => {
                            if (subjectDocs.length === 0) return;
                            if (e.target.checked) {
                              const newDocs = subjectDocs.map(d => d.id).filter(id => !selectedDocs.includes(id));
                              setSelectedDocs(prev => [...prev, ...newDocs]);
                            } else {
                              const docIds = subjectDocs.map(d => d.id);
                              setSelectedDocs(prev => prev.filter(id => !docIds.includes(id)));
                            }
                          }}
                        />
                        <span className="truncate">{subject.name}</span>
                      </label>
                      <button 
                        onClick={() => setExpandedSubjects(prev => prev.includes(subject.id) ? prev.filter(id => id !== subject.id) : [...prev, subject.id])}
                        className="text-on-surface-variant hover:text-primary px-2 transition-colors flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-lg" style={{ fontWeight: 300 }}>
                          {expandedSubjects.includes(subject.id) ? "expand_less" : "expand_more"}
                        </span>
                      </button>
                    </div>
                    {expandedSubjects.includes(subject.id) && (
                      <div className="pl-7 space-y-1 mt-1 pb-1">
                        {subjectDocs.length === 0 ? (
                           <div className="px-1 py-1 text-[10px] text-on-surface-variant/50 italic">No files or notes</div>
                        ) : (
                          subjectDocs.map((d) => (
                            <label key={d.id} className="flex items-start gap-2 text-xs cursor-pointer group hover:bg-surface-container p-1.5 rounded transition-colors">
                              <input
                                type="checkbox"
                                className="mt-0.5 rounded text-primary focus:ring-primary/50 bg-surface border-outline-variant/30"
                                checked={selectedDocs.includes(d.id)}
                                onChange={(e) =>
                                  setSelectedDocs((prev) =>
                                    e.target.checked ? [...prev, d.id] : prev.filter((id) => id !== d.id)
                                  )
                                }
                              />
                              <span className="truncate text-on-surface-variant group-hover:text-on-surface" title={d.title}>{d.title}</span>
                              {d.isNote && (
                                <span className="ml-auto text-[10px] font-label-md bg-tertiary/10 text-tertiary px-2 py-0.5 rounded-full border border-tertiary/20 shrink-0">
                                  NOTE
                                </span>
                              )}
                            </label>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {subjects.length > 0 && subjects.every(s => {
                  const matchesSubject = s.name.toLowerCase().includes(searchQuery.toLowerCase());
                  return documents.filter(d => d.subject_id === s.id && (matchesSubject || d.title.toLowerCase().includes(searchQuery.toLowerCase()))).length === 0 && !matchesSubject;
              }) && searchQuery && (
                <p className="text-xs text-outline italic py-2">No documents match.</p>
              )}
            </div>
            <button onClick={startSession} className="w-full mt-4 bg-primary text-on-primary font-label-md text-label-md py-2.5 rounded-xl hover:bg-primary/90 transition-colors shadow-sm active:scale-95">
              New Chat
            </button>
          </div>

          {/* Sessions List */}
          <div className="border-t border-outline-variant/20 pt-6">
            <h4 className="font-label-md text-label-md text-on-surface-variant mb-3 uppercase tracking-wider text-[11px]">Recent Sessions</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {sessions.map((s) => (
                <div 
                  key={s.id} 
                  className={`flex items-center gap-2 p-2 rounded-xl transition-colors cursor-pointer group ${
                    activeSession === s.id ? 'bg-secondary/15 text-secondary border border-secondary/20' : 'bg-surface-container-highest/30 hover:bg-surface-container-highest border border-transparent'
                  }`}
                  onClick={() => openSession(s)}
                >
                  <span className="material-symbols-outlined text-[16px]">chat_bubble</span>
                  <span className="flex-1 truncate text-xs font-medium">{s.title}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleRename(e, s.id, s.title)}
                      className="text-outline hover:text-primary transition-colors p-1"
                      title="Rename session"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                    </button>
                    <button
                      onClick={(e) => handleDeleteSession(e, s.id)}
                      className="text-outline hover:text-error transition-colors p-1"
                      title="Delete session"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative w-full h-full max-w-4xl mx-auto">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto chat-scroll p-4 md:p-8 flex flex-col gap-6 pb-[140px]">
          
          {!activeSession && (
            <div className="flex flex-col items-center justify-center h-full text-on-surface-variant opacity-70">
              <div className="w-20 h-20 bg-surface-container-highest rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-4xl text-primary">smart_toy</span>
              </div>
              <p className="text-center max-w-md">Select documents and start a new chat to ask questions grounded strictly in your own materials.</p>
            </div>
          )}

          {activeSession && activeDocs.length > 0 && (
            <div className="bg-surface-container-low border border-outline-variant/20 rounded-xl p-3 flex flex-col gap-2">
              <div className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide flex items-center gap-1">
                 <span className="material-symbols-outlined text-[14px]">attach_file</span> Selected Files
              </div>
              <div className="flex flex-wrap gap-2">
                {activeDocs.map((docName, idx) => (
                  <span key={idx} className="bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded text-xs truncate max-w-[200px]" title={docName}>
                    {docName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {activeSession && messages.length === 0 && (
            <div className="flex justify-center my-4">
               <span className="px-4 py-1 rounded-full bg-surface-container-highest/50 font-label-md text-label-md text-on-surface-variant text-[12px] border border-outline-variant/10 backdrop-blur-sm">Chat Started</span>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex w-full ${m.role === "user" ? "justify-end md:pl-20" : "justify-start md:pr-20"} group`}>
              <div className={`flex gap-3 md:gap-4 max-w-[95%] md:max-w-[85%] ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                
                {/* Avatar */}
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 border ${
                  m.role === "user" ? "bg-primary text-on-primary border-primary/20" : "bg-surface-container-highest text-primary border-outline-variant/20 shadow-sm"
                }`}>
                  {m.role === "user" ? (
                    <span className="font-bold text-sm">{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
                  ) : (
                    <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                  )}
                </div>

                {/* Bubble */}
                <div className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                  {m.role === "user" ? (
                    <div className="bg-gradient-to-br from-primary to-tertiary rounded-2xl rounded-tr-sm p-4 text-on-primary shadow-md">
                      <p className="font-body-md text-sm md:text-base leading-relaxed whitespace-pre-line">{m.content}</p>
                    </div>
                  ) : (
                    <div className="bg-surface-container/80 backdrop-blur-md rounded-2xl rounded-tl-sm p-5 shadow-sm border border-outline-variant/20 flex flex-col gap-3 relative overflow-hidden">
                      <p className="font-body-md text-sm md:text-base text-on-surface leading-relaxed whitespace-pre-line relative z-10">{m.content}</p>
                      
                      {/* Sources */}
                      {m.sources?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2 pt-3 border-t border-outline-variant/20 relative z-10">
                          {m.sources.map((s, idx) => (
                            <div key={idx} className="px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary font-label-md text-[11px] flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[12px]">article</span>
                              <span className="truncate max-w-[150px]">{s.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Timestamp */}
                  {m.created_at && (
                    <span className="text-[10px] text-on-surface-variant/60 mt-1 px-1">
                      {new Date(m.created_at + (m.created_at.endsWith('Z') ? '' : 'Z')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {asking && (
            <div className="flex w-full justify-start pr-20">
              <div className="flex gap-4 max-w-[85%]">
                <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0 border border-outline-variant/20">
                  <span className="material-symbols-outlined text-primary text-[20px]">smart_toy</span>
                </div>
                <div className="bg-surface-container/80 backdrop-blur-md rounded-2xl rounded-tl-sm p-5 flex items-center gap-2 border border-outline-variant/20 relative overflow-hidden">
                  <div className="absolute inset-0 border-2 border-transparent rounded-2xl rounded-tl-sm" style={{ background: "linear-gradient(90deg, transparent, #006a67, transparent) border-box", WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "destination-out", animation: "spin 2s linear infinite" }}></div>
                  <div className="w-2 h-2 rounded-full bg-secondary animate-pulse"></div>
                  <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                  <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" style={{ animationDelay: "0.4s" }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
        
        {/* Input Area (Floating Pill) */}
        <div className="absolute bottom-4 md:bottom-8 left-0 right-0 px-4 md:px-8 flex justify-center pointer-events-none z-20">
          <form onSubmit={handleAsk} className={`w-full max-w-3xl bg-surface/90 backdrop-blur-xl border border-outline-variant/30 rounded-full p-2 flex items-center gap-2 pointer-events-auto transition-all shadow-xl group relative ${
             activeSession ? "focus-within:border-secondary focus-within:shadow-[0_0_30px_rgba(0,106,103,0.15)]" : "opacity-50"
          }`}>
            <button type="button" className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-colors shrink-0 disabled:opacity-50" disabled={!activeSession}>
              <span className="material-symbols-outlined text-[20px] md:text-[24px]">attach_file</span>
            </button>
            <input 
              className="flex-1 bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant/70 font-body-md text-sm md:text-base focus:ring-0 px-2 h-10 md:h-12" 
              placeholder="Ask LearnOS AI about your study materials..." 
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={!activeSession || asking}
            />
            <button 
              type="submit" 
              disabled={!activeSession || asking || !question.trim()}
              className="h-10 md:h-12 px-4 md:px-6 rounded-full bg-gradient-to-r from-primary to-tertiary text-on-primary font-label-md text-sm md:text-base flex items-center gap-2 hover:scale-105 transition-transform shadow-[0_0_15px_rgba(111,66,193,0.3)] shrink-0 disabled:opacity-50 disabled:hover:scale-100"
            >
              <span className="hidden sm:inline">Send</span>
              <span className="material-symbols-outlined text-[16px] md:text-[18px]">send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
