import React, { useEffect, useState, useRef } from "react";
import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { checkHealth, searchLibrary } from "../api/client.js";

import { useStudyData } from "../context/StudyContext.jsx";
import CreateDailyPlanModal from "./CreateDailyPlanModal.jsx";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "dashboard", end: true },
  { to: "/library", label: "Library", icon: "auto_stories" },
  { to: "/chat", label: "AI Chat", icon: "smart_toy" },
  { to: "/exam", label: "Exam Center", icon: "quiz" },
  { to: "/study-plan", label: "Study Plan", icon: "route" },
  { to: "/revision", label: "Revision Center", icon: "history_edu" },
  { to: "/analytics", label: "Analytics", icon: "analytics" },
  { to: "/guide", label: "User Guide", icon: "help" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { studyTargets, dailyTasks, toggleTask, addTask, clearDailyTasks } = useStudyData();
  const [aiStatus, setAiStatus] = useState("checking...");
  const [dbStatus, setDbStatus] = useState("checking...");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isDailyPlanModalOpen, setIsDailyPlanModalOpen] = useState(false);
  const [newTaskInput, setNewTaskInput] = useState("");
  
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setShowSearchResults(true);
    try {
      const res = await searchLibrary(searchQuery);
      setSearchResults(res.data);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await checkHealth();
        setAiStatus(res.data.ai_status || "offline");
        setDbStatus(res.data.db_status || "offline");
      } catch (e) {
        setAiStatus("offline");
        setDbStatus("offline");
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    await addTask(newTaskInput);
    setNewTaskInput("");
  };

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md overflow-x-hidden selection:bg-primary/30 selection:text-primary relative">
      
      {/* Mobile Header Toggle */}
      <div className="md:hidden flex items-center justify-between p-4 bg-surface/90 backdrop-blur-md border-b border-outline-variant/20 sticky top-0 z-50">
        <span className="font-headline-md text-headline-md font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-tertiary">LearnOS AI</span>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-on-surface">
          <span className="material-symbols-outlined">{isMobileMenuOpen ? 'close' : 'menu'}</span>
        </button>
      </div>

      {/* SideNavBar */}
      <nav className={`
        ${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex flex-col gap-4 p-4 
        bg-surface/90 backdrop-blur-md h-screen fixed left-0 top-0 
        border-r border-outline-variant/20 shadow-xl shadow-black/5 z-50 transition-all duration-300
        ${isDesktopCollapsed ? 'md:w-20' : 'w-72'}
      `}>
        {/* Brand Header */}
        <div className={`flex items-center mb-8 mt-2 ${isDesktopCollapsed ? 'justify-center' : 'gap-4 px-2'}`}>
          <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-primary to-tertiary flex items-center justify-center text-on-primary shadow-lg">
            <span className="material-symbols-outlined text-[24px]">school</span>
          </div>
          {!isDesktopCollapsed && (
            <div className="whitespace-nowrap overflow-hidden">
              <h1 className="font-headline-md text-headline-md font-bold text-primary text-base">LearnOS AI</h1>
              <p className="font-label-md text-label-md text-on-surface-variant text-xs">Learn. Organize. Master.</p>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar flex-shrink-0">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={isDesktopCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 ${
                  isActive
                    ? "text-primary bg-primary/10 font-semibold"
                    : "text-on-surface-variant hover:text-on-surface hover:scale-105 hover:bg-surface-container-high/50"
                } ${isDesktopCollapsed ? 'justify-center' : ''}`
              }
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {({ isActive }) => (
                <>
                  <span 
                    className="material-symbols-outlined text-[24px]" 
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {item.icon}
                  </span>
                  {!isDesktopCollapsed && (
                    <span className="font-label-md text-label-md whitespace-nowrap">{item.label}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
        
        {/* Mobile Profile Actions (Only visible on mobile) */}
        <div className="md:hidden mt-auto pt-4 border-t border-outline-variant/20 flex flex-col gap-2 px-2">
          <div className="flex items-center gap-3 px-3 py-2">
             <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-sm shrink-0">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
             </div>
             <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-semibold text-on-surface truncate">{user?.name}</span>
                <span className="text-[10px] text-on-surface-variant truncate">{user?.email}</span>
             </div>
          </div>
          <Link 
            to="/forgot-password" 
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50"
          >
            <span className="material-symbols-outlined text-[24px]">lock_reset</span>
            <span className="font-label-md text-label-md">Reset Password</span>
          </Link>
          <button 
            onClick={logout}
            className="flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 text-error hover:bg-error-container/20 w-full text-left"
          >
            <span className="material-symbols-outlined text-[24px]">logout</span>
            <span className="font-label-md text-label-md">Sign out</span>
          </button>
        </div>
        
        {/* Study Sidebar Widgets (Only when expanded) */}
        {!isDesktopCollapsed && (
          <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar flex-grow pt-4 border-t border-outline-variant/20">
            {/* Daily To-Do */}
            <div className="bg-surface-container/30 rounded-2xl p-4 border border-outline-variant/10">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <span className="material-symbols-outlined text-[18px]">task_alt</span>
                  <h3 className="text-sm">Daily To-Do</h3>
                </div>
                <span className="text-[10px] font-bold bg-surface px-2 py-0.5 rounded-full text-on-surface-variant uppercase tracking-wide border border-outline-variant/10">Today Only</span>
              </div>
              
              <div className="space-y-2 mb-3 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                {dailyTasks.length === 0 ? (
                  <p className="text-xs text-outline italic">No tasks for today.</p>
                ) : (
                  dailyTasks.map(task => (
                    <label key={task.id} className="flex items-start gap-2 group cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={task.is_completed}
                        onChange={() => toggleTask(task.id)}
                        className="mt-1 w-4 h-4 rounded-full border-2 border-outline text-primary focus:ring-primary focus:ring-offset-surface bg-transparent checked:bg-primary checked:border-primary transition-all cursor-pointer" 
                      />
                      <span className={`text-sm transition-all ${task.is_completed ? 'line-through text-outline' : 'text-on-surface-variant group-hover:text-on-surface'}`}>
                        {task.description}
                      </span>
                    </label>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                 <button 
                    onClick={() => setIsDailyPlanModalOpen(true)}
                    className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg border border-outline-variant/30 text-xs text-on-surface hover:bg-surface-container-high transition-colors font-semibold"
                 >
                    <span className="material-symbols-outlined text-[14px]">add_circle</span>
                    Create Today's Plan
                 </button>
                 <button 
                    onClick={() => {
                        if (confirm("Are you sure you want to reset and delete all today's tasks?")) {
                            clearDailyTasks();
                        }
                    }}
                    className="flex items-center justify-center p-1.5 rounded-lg border border-outline-variant/30 text-on-surface hover:bg-error/10 hover:text-error transition-colors"
                    title="Reset Daily Plan"
                 >
                    <span className="material-symbols-outlined text-[14px]">refresh</span>
                 </button>
              </div>
            </div>
            
            {/* Study Targets */}
            <div className="bg-surface-container/30 rounded-2xl p-4 border border-outline-variant/10">
              <div className="flex items-center gap-2 text-secondary font-semibold mb-3">
                <span className="material-symbols-outlined text-[18px]">track_changes</span>
                <h3 className="text-sm">Study Targets</h3>
              </div>
              <div className="space-y-4 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                {studyTargets.length === 0 ? (
                  <p className="text-xs text-outline italic">No active targets.</p>
                ) : (
                  studyTargets.map(target => {
                    const daysLeft = Math.max(0, Math.ceil((new Date(target.target_date) - new Date()) / (1000 * 60 * 60 * 24)));
                    return (
                      <div key={target.id} className="group">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium text-on-surface-variant truncate pr-2 group-hover:text-on-surface transition-colors">{target.title}</span>
                          <span className="text-[10px] font-bold bg-secondary/10 text-secondary px-2 py-0.5 rounded-full shrink-0 border border-secondary/20 shadow-sm">{daysLeft} Days</span>
                        </div>
                        <div className="w-full bg-surface-container-high rounded-full h-1 overflow-hidden relative">
                          <div className="bg-gradient-to-r from-primary to-secondary h-1 rounded-full w-2/3 shadow-[0_0_8px_rgba(111,66,193,0.5)]"></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Toggle Collapse Button (Desktop Only) */}
        <button 
          onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
          className="hidden md:flex items-center justify-center p-2 mb-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50 rounded-xl transition-colors shrink-0"
          title={isDesktopCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
           <span className="material-symbols-outlined">
             {isDesktopCollapsed ? 'chevron_right' : 'chevron_left'}
           </span>
        </button>

        {/* System Status Footer */}
        <div className={`mt-auto pt-4 border-t border-outline-variant/20 flex flex-col gap-3 ${isDesktopCollapsed ? 'items-center' : 'px-2'}`}>
           
           <div className={`flex items-center ${isDesktopCollapsed ? 'justify-center' : 'gap-2'}`}>
             <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${aiStatus === 'online' ? 'bg-secondary shadow-[0_0_8px_rgba(0,106,103,0.6)]' : 'bg-error shadow-[0_0_8px_rgba(186,26,26,0.6)]'}`} title={`AI Engine ${aiStatus}`}></span>
             {!isDesktopCollapsed && (
               <span className="text-[10px] font-label-md text-on-surface-variant uppercase tracking-widest font-semibold flex-1">
                 AI Engine <span className={aiStatus === 'online' ? 'text-secondary' : 'text-error'}>{aiStatus}</span>
               </span>
             )}
           </div>

           <div className={`flex items-center ${isDesktopCollapsed ? 'justify-center' : 'gap-2'}`}>
             <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dbStatus === 'online' ? 'bg-primary shadow-[0_0_8px_rgba(111,66,193,0.6)]' : 'bg-error shadow-[0_0_8px_rgba(186,26,26,0.6)]'}`} title={`Database ${dbStatus}`}></span>
             {!isDesktopCollapsed && (
               <div className="flex-1 flex items-center justify-between">
                 <span className="text-[10px] font-label-md text-on-surface-variant uppercase tracking-widest font-semibold">
                   Database <span className={dbStatus === 'online' ? 'text-primary' : 'text-error'}>{dbStatus}</span>
                 </span>
                 {dbStatus !== 'online' && (
                   <button 
                     onClick={() => checkHealth().then(res => { setDbStatus(res.data.db_status); setAiStatus(res.data.ai_status); })} 
                     className="text-[9px] bg-surface-container-high hover:bg-surface-container-highest px-2 py-0.5 rounded border border-outline-variant/20 transition-colors"
                   >
                     Wake Up
                   </button>
                 )}
               </div>
             )}
           </div>

        </div>
      </nav>

      {/* TopNavBar */}
      <header className={`hidden md:flex justify-between items-center h-16 px-8 bg-surface/80 backdrop-blur-xl fixed top-0 right-0 z-40 border-b border-outline-variant/20 shadow-sm transition-all duration-300 ${isDesktopCollapsed ? 'ml-20 w-[calc(100%-5rem)]' : 'ml-64 w-[calc(100%-16rem)]'}`}>
        <div className="flex items-center">
          <span className="font-headline-md text-headline-md font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-tertiary">LearnOS AI</span>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Search Bar */}
          <div ref={searchRef} className="relative group focus-within:ring-2 focus-within:ring-secondary/50 rounded-full transition-all duration-300 hidden lg:block">
            <form onSubmit={handleSearchSubmit}>
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <span className="material-symbols-outlined text-on-surface-variant group-focus-within:text-secondary transition-colors">search</span>
              </div>
              <input 
                className="bg-surface-container/50 border border-outline-variant/20 text-on-surface font-label-md text-label-md rounded-full pl-12 pr-6 py-2 w-64 focus:outline-none focus:border-secondary/50 focus:bg-surface-container transition-all" 
                placeholder="Search knowledge base..." 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchResults.length > 0 || searchQuery.length > 0) setShowSearchResults(true); }}
              />
            </form>
            
            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div className="absolute top-12 left-0 w-[400px] max-h-96 overflow-y-auto rounded-2xl shadow-xl bg-surface border border-outline-variant/20 py-2 z-50 animate-in fade-in slide-in-from-top-2 custom-scrollbar">
                <div className="px-4 py-2 border-b border-outline-variant/20 flex justify-between items-center bg-surface sticky top-0 z-10">
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Semantic Search Results</span>
                  {isSearching && <span className="text-xs text-primary animate-pulse">Searching...</span>}
                </div>
                {isSearching ? (
                  <div className="p-8 flex justify-center"><span className="material-symbols-outlined animate-spin text-primary text-2xl">sync</span></div>
                ) : searchResults.length === 0 && searchQuery ? (
                  <div className="p-6 text-sm text-on-surface-variant text-center">No matches found for "{searchQuery}".</div>
                ) : (
                  searchResults.map((r, i) => (
                    <div 
                      key={i} 
                      className="px-4 py-3 hover:bg-surface-container-high transition-colors cursor-pointer border-b border-outline-variant/10 last:border-b-0 group"
                      onClick={() => {
                        setShowSearchResults(false);
                        setSearchQuery("");
                        navigate(`/chat?document=${r.document_id}`);
                      }}
                    >
                      <p className="font-semibold text-primary text-sm line-clamp-1 group-hover:text-secondary transition-colors">{r.title}</p>
                      <p className="text-on-surface-variant text-xs line-clamp-2 mt-1 leading-relaxed">{r.snippet}</p>
                      <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-secondary uppercase tracking-wider opacity-80 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-[14px]">smart_toy</span>
                        Opens in AI Chat
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          
          {/* Trailing Actions */}
          <div className="flex items-center gap-4">
            <button className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-container-high">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="w-9 h-9 rounded-full ml-2 border border-outline-variant/20 overflow-hidden cursor-pointer hover:border-primary transition-colors flex items-center justify-center bg-primary text-on-primary font-bold shadow-md hover:scale-105 active:scale-95"
              >
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </button>
              
              {isSettingsOpen && (
                <div className="absolute top-12 right-0 mt-2 w-56 rounded-2xl shadow-xl bg-surface border border-outline-variant/20 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-3 border-b border-outline-variant/20">
                    <p className="text-sm font-semibold text-on-surface truncate">{user?.name}</p>
                    <p className="text-xs text-on-surface-variant truncate mt-0.5">{user?.email}</p>
                  </div>
                  <div className="px-2 py-1 border-t border-outline-variant/20">
                    <Link to="/forgot-password" onClick={() => setIsSettingsOpen(false)} className="w-full text-left px-3 py-2 text-sm text-on-surface font-medium hover:bg-surface-container-high rounded-xl transition-colors block">
                      Reset Password
                    </Link>
                  </div>
                  <div className="px-2 pb-1 border-t border-outline-variant/20 pt-2">
                    <button onClick={logout} className="w-full text-left px-3 py-2 text-sm text-error font-medium hover:bg-error-container/20 rounded-xl transition-colors">
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className={`pt-16 md:pt-24 p-6 md:p-8 min-h-[calc(100vh-4rem)] flex flex-col relative transition-all duration-300 ${isDesktopCollapsed ? 'md:ml-20' : 'md:ml-72'}`}>
        <div className="max-w-7xl mx-auto w-full h-full">
          {children || <Outlet />}
        </div>
      </main>

      <CreateDailyPlanModal 
        isOpen={isDailyPlanModalOpen} 
        onClose={() => setIsDailyPlanModalOpen(false)} 
      />
    </div>
  );
}
