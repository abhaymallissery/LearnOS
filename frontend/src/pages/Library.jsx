import React, { useEffect, useState } from "react";
import {
  listSubjects, createSubject, listDocuments, uploadDocument, uploadUrl,
  getDocumentNotes, searchLibrary, createShareLink, deleteDocument, deleteSubject,
  listTopics, createTopic, updateTopicStatus
} from "../api/client";
import { Spinner, EmptyState } from "../components/ui.jsx";
import ReactMarkdown from "react-markdown";
import ShareConfigModal from "../components/ShareConfigModal.jsx";

export default function Library() {
  const [subjects, setSubjects] = useState([]);
  const [activeSubject, setActiveSubject] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [topics, setTopics] = useState([]);
  const [activeTab, setActiveTab] = useState("documents"); // "documents" or "topics"
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newTopicName, setNewTopicName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [uploadingUrl, setUploadingUrl] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [openNotes, setOpenNotes] = useState({}); // documentId -> notes[]
  
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareResource, setShareResource] = useState({ type: "", id: "" });

  const loadSubjects = () => {
    listSubjects().then((res) => {
      setSubjects(res.data);
      if (!activeSubject && res.data.length) setActiveSubject(res.data[0].id);
    });
  };

  useEffect(() => {
    loadSubjects();
    setLoading(false);
  }, []);

  useEffect(() => {
    if (activeSubject) {
      if (activeTab === "documents") {
        listDocuments(activeSubject).then((res) => setDocuments(res.data));
      } else if (activeTab === "topics") {
        listTopics(activeSubject).then((res) => setTopics(res.data));
      }
    }
  }, [activeSubject, activeTab]);

  // Poll for document status updates if any document is currently processing
  useEffect(() => {
    let intervalId;
    const hasProcessingDocs = documents.some(
      (doc) => ["processing", "downloading", "extracting"].includes(doc.status)
    );

    if (activeSubject && hasProcessingDocs) {
      intervalId = setInterval(() => {
        listDocuments(activeSubject).then((res) => {
          setDocuments(res.data);
        });
      }, 5000); // Check every 5 seconds
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeSubject, documents]);

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    const res = await createSubject({ name: newSubjectName });
    setNewSubjectName("");
    setSubjects((prev) => [...prev, res.data]);
    setActiveSubject(res.data.id);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeSubject) return;
    setUploading(true);
    try {
      const res = await uploadDocument(activeSubject, file);
      setDocuments((prev) => [res.data, ...prev]);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!urlInput.trim() || !activeSubject) return;
    setUploadingUrl(true);
    try {
      const res = await uploadUrl(activeSubject, urlInput);
      setDocuments((prev) => [res.data, ...prev]);
      setUrlInput("");
    } catch (err) {
      alert("Error adding URL: " + (err.response?.data?.detail || err.message));
    } finally {
      setUploadingUrl(false);
    }
  };

  const toggleNotes = async (documentId) => {
    if (openNotes[documentId]) {
      setOpenNotes((prev) => ({ ...prev, [documentId]: null }));
      return;
    }
    const res = await getDocumentNotes(documentId);
    setOpenNotes((prev) => ({ ...prev, [documentId]: res.data }));
  };

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!newTopicName.trim() || !activeSubject) return;
    try {
      const res = await createTopic({ subject_id: activeSubject, name: newTopicName });
      setTopics((prev) => [...prev, res.data]);
      setNewTopicName("");
    } catch (err) {
      alert("Failed to create topic");
    }
  };

  const handleToggleTopic = async (topic) => {
    const newStatus = topic.status === "completed" ? "not_started" : "completed";
    try {
      const res = await updateTopicStatus(topic.id, newStatus);
      setTopics((prev) => prev.map((t) => (t.id === topic.id ? res.data : t)));
    } catch (err) {
      alert("Failed to update topic status");
    }
  };

  const handleDeleteDocument = async (id) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    await deleteDocument(id);
    setDocuments((prev) => prev.filter(doc => doc.id !== id));
  };

  const handleDeleteSubject = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the collection "${name}"? This will also delete all documents inside it.`)) return;
    try {
      await deleteSubject(id);
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      if (activeSubject === id) {
        const remaining = subjects.filter((s) => s.id !== id);
        setActiveSubject(remaining.length > 0 ? remaining[0].id : null);
        if (remaining.length === 0) setDocuments([]);
      }
    } catch (err) {
      alert("Failed to delete collection.");
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    const res = await searchLibrary(query);
    setSearchResults(res.data);
  };

  const openShareModal = (resource_type, resource_id) => {
    setShareResource({ type: resource_type, id: resource_id });
    setShareModalOpen(true);
  };

  const handleShareNote = (noteId) => {
    setShareResource({ type: "note", id: noteId });
    setShareModalOpen(true);
  };



  const handleShareSubject = (subjectId) => openShareModal("subject", subjectId);

  if (loading) return <Spinner />;

  return (
    <div className="w-full max-w-container-max mx-auto grid grid-cols-1 md:grid-cols-12 gap-8">
      {/* Left Sidebar / Filters */}
      <aside className="md:col-span-3 space-y-8">
        <div className="bg-surface-container/60 backdrop-blur-xl border border-outline-variant/20 rounded-2xl p-6 shadow-sm">
          <h3 className="font-headline-md text-headline-md text-on-surface mb-6">Collections</h3>
          <nav className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
            {subjects.map((s) => (
              <div 
                key={s.id} 
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer group ${
                  activeSubject === s.id ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                }`}
                onClick={() => setActiveSubject(s.id)}
              >
                <span className="material-symbols-outlined text-[20px]">folder_special</span>
                <span className="flex-1 truncate text-sm">{s.name}</span>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleShareSubject(s.id); }}
                    className={`material-symbols-outlined text-[16px] hover:text-secondary ${activeSubject === s.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                    title="Share Subject"
                  >
                    share
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteSubject(s.id, s.name); }}
                    className={`material-symbols-outlined text-[16px] hover:text-error ${activeSubject === s.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                    title="Delete Subject"
                  >
                    delete
                  </button>
                </div>
              </div>
            ))}
          </nav>
          
          <form onSubmit={handleCreateSubject} className="mt-6 flex gap-2 relative">
            <input
              className="w-full bg-surface-container-high/50 border border-outline-variant/20 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/50"
              placeholder="New subject..."
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
            />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-secondary transition-colors">
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
            </button>
          </form>
        </div>
        
        {/* Semantic Search Widget */}
        <div className="bg-surface-container/60 backdrop-blur-xl border border-outline-variant/20 rounded-2xl p-6 shadow-sm">
          <h4 className="font-label-md text-label-md text-on-surface-variant mb-4 uppercase tracking-wider">Semantic Search</h4>
          <form onSubmit={handleSearch} className="flex gap-2 w-full">
            <div className="relative w-full focus-within:ring-2 focus-within:ring-secondary/50 rounded-xl transition-all duration-300">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <span className="material-symbols-outlined text-outline text-[18px]">search</span>
              </div>
              <input
                className="bg-surface-container-high/50 border border-outline-variant/20 text-on-surface text-sm rounded-xl pl-9 pr-3 py-2 w-full focus:outline-none focus:border-secondary/50 transition-all"
                placeholder="Search knowledge..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </form>
          {searchResults && (
            <div className="mt-4 space-y-3 max-h-[30vh] overflow-y-auto text-sm">
              {searchResults.length === 0 && <p className="text-outline">No matches found.</p>}
              {searchResults.map((r, i) => (
                <div key={i} className="border-t border-outline-variant/20 pt-3">
                  <p className="font-medium text-primary line-clamp-1">{r.title}</p>
                  <p className="text-on-surface-variant text-xs line-clamp-3 mt-1">{r.snippet}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <section className="md:col-span-9 space-y-8">
        
        {/* Upload Zone */}
        <div className="bg-surface-container/60 backdrop-blur-xl rounded-2xl p-8 border-dashed border-2 border-outline-variant hover:border-primary/50 transition-colors group relative flex flex-col items-center justify-center min-h-[240px] text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-3xl text-primary">cloud_upload</span>
          </div>
          <h2 className="font-headline-md text-headline-md text-on-surface mb-2">Drag & Drop Knowledge</h2>
          <p className="text-on-surface-variant mb-4 max-w-md">Upload PDFs, Docs, or paste a YouTube URL to let LearnOS AI extract and index the contents.</p>
          <div className="bg-error/5 text-error/90 text-xs px-4 py-3 rounded-xl mb-6 max-w-lg border border-error/20 flex items-start gap-2 text-left">
             <span className="material-symbols-outlined text-[16px] mt-0.5">info</span>
             <p><strong>Important:</strong> Please upload English documents and English language videos/links only. If you upload content in other languages, you will only receive a summary in that language, and the Chat and Exam features will not work correctly.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg mx-auto">
            <label className={`flex-1 relative overflow-hidden bg-gradient-to-r from-primary to-tertiary text-on-primary px-6 py-3 rounded-full font-label-md text-label-md shadow-[0_0_20px_rgba(111,66,193,0.3)] hover:scale-105 transition-transform duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                  uploading || !activeSubject ? "opacity-50 pointer-events-none" : ""
                }`}>
              <span className="material-symbols-outlined text-[20px]">upload_file</span>
              {uploading ? "Uploading..." : "Upload File"}
              <input
                type="file"
                className="hidden"
                onChange={handleUpload}
                accept=".pdf,.docx,.pptx,.txt,.md"
                disabled={uploading || !activeSubject}
              />
            </label>
            
            <form onSubmit={handleUrlSubmit} className="flex-1 relative flex">
               <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <span className="material-symbols-outlined text-outline text-[18px]">link</span>
               </div>
               <input
                type="url"
                placeholder="Paste URL..."
                className="w-full bg-surface border border-outline-variant/30 text-on-surface font-label-md text-sm rounded-full pl-10 pr-[80px] py-3 focus:outline-none focus:border-secondary transition-all"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                disabled={uploadingUrl || !activeSubject}
                required
              />
              <button 
                type="submit" 
                disabled={uploadingUrl || !activeSubject}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-primary font-bold text-sm hover:text-secondary disabled:opacity-50"
              >
                {uploadingUrl ? "Adding" : "Add"}
              </button>
            </form>
          </div>
        </div>

        {/* Main Content Header */}
        <div>
          <div className="flex justify-between items-end mb-6 border-b border-outline-variant/20 pb-4">
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Documents</h2>
          </div>
          
          {documents.length === 0 ? (
            <div className="bg-surface-container/60 border border-outline-variant/20 rounded-2xl p-12 text-center text-on-surface-variant flex flex-col items-center gap-4">
               <span className="material-symbols-outlined text-4xl text-outline-variant">auto_stories</span>
               <p>No documents in this collection yet. Upload one to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
              {documents.map((doc) => (
                <div key={doc.id} className="bg-surface-container/60 backdrop-blur-xl border border-outline-variant/20 rounded-2xl p-6 flex flex-col group relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  
                  {/* Progress bar logic for processing states */}
                  {(doc.status === "processing" || doc.status === "downloading" || doc.status === "extracting") && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-surface-container-highest">
                       <div className="h-full bg-secondary animate-pulse w-1/2"></div>
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${doc.file_url ? 'bg-primary/10 text-primary' : 'bg-tertiary/10 text-tertiary'}`}>
                      <span className="material-symbols-outlined">
                        {doc.file_url ? 'description' : 'smart_display'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => toggleNotes(doc.id)} className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors" title="Smart Notes">
                        <span className="material-symbols-outlined text-[18px]">menu_book</span>
                      </button>

                      <button onClick={() => handleDeleteDocument(doc.id)} className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors" title="Delete">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                  
                  <h4 className="font-headline-md text-headline-md text-on-surface mb-2 line-clamp-2 relative z-10" title={doc.title}>{doc.title}</h4>
                  
                  <div className="flex flex-wrap gap-2 mb-4 relative z-10">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      doc.status === "indexed" ? "bg-secondary/15 text-secondary" :
                      doc.status === "failed" ? "bg-error/15 text-error" : "bg-outline-variant/30 text-on-surface-variant animate-pulse"
                    }`}>
                      {doc.status}
                    </span>
                  </div>
                  
                  <p className="text-sm text-on-surface-variant mt-auto relative z-10 flex justify-between">
                    <span>{doc.file_url ? "File" : "Web"}</span>
                    {doc.uploaded_at && (
                        <span>
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </span>
                      )}
                  </p>

                  {/* Smart Notes Expansion */}
                  {openNotes[doc.id] && (
                    <div className="mt-4 pt-4 border-t border-outline-variant/20 relative z-10 max-h-[200px] overflow-y-auto">
                      {openNotes[doc.id].length === 0 ? (
                         <p className="text-xs text-outline italic">Notes are being generated...</p>
                      ) : (
                         <div className="space-y-3">
                           {openNotes[doc.id].map((note) => (
                             <div key={note.id} className="bg-surface rounded-lg p-3 border border-outline-variant/10">
                               <div className="flex justify-between items-center mb-2">
                                 <p className="text-xs font-bold text-primary">{note.title}</p>
                                 <button
                                  className="material-symbols-outlined text-[14px] text-outline hover:text-secondary"
                                  onClick={() => handleShareNote(note.id)}
                                  title="Share Note"
                                >
                                  share
                                </button>
                               </div>
                               <div className="prose prose-sm max-w-none text-on-surface-variant prose-p:leading-snug prose-headings:text-on-surface">
                                  <ReactMarkdown>{note.content}</ReactMarkdown>
                               </div>
                             </div>
                           ))}
                         </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <ShareConfigModal 
        isOpen={shareModalOpen} 
        onClose={() => setShareModalOpen(false)} 
        resourceType={shareResource.type}
        resourceId={shareResource.id}
      />
    </div>
  );
}
