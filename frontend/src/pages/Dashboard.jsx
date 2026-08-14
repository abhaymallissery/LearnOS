import React, { useEffect, useState } from "react";
import { analyticsOverview, nextTopics } from "../api/client";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useStudyData } from "../context/StudyContext.jsx";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function Dashboard() {
  const { user } = useAuth();
  const { dailyTasks } = useStudyData();
  const [overview, setOverview] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([analyticsOverview(), nextTopics(5)])
      .then(([ov, rec]) => {
        setOverview(ov.data);
        setRecommendations(rec.data);
      })
      .finally(() => setLoading(false));
  }, [dailyTasks]);

  const taskStats = {
    total: dailyTasks.length,
    completed: dailyTasks.filter(t => t.is_completed).length
  };

  const totalCompleted = overview?.completed_topics ?? 0;
  const totalTopics = overview?.total_topics ?? 1; // avoid division by zero
  const progressPercent = Math.min(100, Math.round((totalCompleted / (totalTopics || 1)) * 100));
  
  // Prepare data for the multi-colored subject progress ring
  const COLORS = ["#d3bbff", "#7bd6d1", "#ddb7ff", "#f5c2e7", "#a3e635", "#60a5fa"];
  const pieData = [];
  let colorIndex = 0;
  
  if (overview?.subject_progress?.length > 0) {
     overview.subject_progress.forEach((sub) => {
         if (sub.completed > 0) {
             pieData.push({ 
                name: sub.name, 
                value: sub.completed,
                color: COLORS[colorIndex % COLORS.length]
             });
             colorIndex++;
         }
     });
  }
  
  const remaining = Math.max(0, totalTopics - totalCompleted);
  if (remaining > 0) {
      pieData.push({ name: "Incomplete", value: remaining, color: "rgba(255, 255, 255, 0.05)" });
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto">
      {/* Welcome Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h2 className="font-display-lg text-headline-lg-mobile md:text-display-lg text-on-surface tracking-tight mb-2">Welcome back, {user?.name?.split(' ')[0] || 'Student'}.</h2>
          <p className="font-body-lg text-body-md md:text-body-lg text-on-surface-variant">Here is where your learning stands today.</p>
        </div>
        <Link to="/library" className="flex items-center gap-2 bg-gradient-to-r from-primary to-tertiary text-on-primary px-6 py-3 rounded-full font-label-md text-label-md shadow-[0_0_20px_rgba(111,66,193,0.3)] hover:scale-105 transition-transform duration-200">
          <span className="material-symbols-outlined" style={{ fontWeight: 300 }}>add</span>
          New Study Session
        </Link>
      </header>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-min">
        
        {/* Daily Goal Ring (Span 4) */}
        <div className="bg-surface-container/60 backdrop-blur-xl border border-outline-variant/20 rounded-3xl col-span-1 md:col-span-4 p-8 flex flex-col items-center justify-center min-h-[320px] shadow-lg hover:-translate-y-1 transition-transform">
          <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider self-start mb-6">Topic Progress</h3>
          <div className="relative w-48 h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius="70%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  stroke="none"
                  isAnimationActive={!loading}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: entry.name !== 'Incomplete' ? "drop-shadow(0 0 6px rgba(111, 66, 193, 0.3))" : "none" }} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-headline-lg text-headline-lg font-bold text-on-surface">{progressPercent}%</span>
              <span className="font-label-md text-label-md text-secondary">Completed</span>
            </div>
          </div>
          <div className="w-full mt-6 flex justify-between items-center text-sm">
            <div className="flex flex-col items-center">
              <span className="text-on-surface font-semibold">{Number.isInteger(totalCompleted) ? totalCompleted : Number(totalCompleted).toFixed(1)}</span>
              <span className="text-outline text-xs">Done</span>
            </div>
            <div className="h-8 w-px bg-outline-variant/30"></div>
            <div className="flex flex-col items-center">
              <span className="text-on-surface font-semibold">{totalTopics}</span>
              <span className="text-outline text-xs">Total Topics</span>
            </div>
          </div>
        </div>

        {/* Recommendations (Span 8) */}
        <div className="bg-surface-container/60 backdrop-blur-xl border border-outline-variant/20 rounded-3xl col-span-1 md:col-span-8 p-8 flex flex-col min-h-[320px] shadow-lg hover:-translate-y-1 transition-transform">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">What to study next</h3>
            <Link to="/library" className="text-primary text-sm hover:underline font-label-md">View Library</Link>
          </div>
          <div className="flex flex-col gap-4 flex-1">
            {loading ? (
              <div className="text-on-surface-variant animate-pulse">Loading recommendations...</div>
            ) : recommendations.length === 0 ? (
              <div className="text-on-surface-variant flex flex-col items-center justify-center h-full gap-2">
                <span className="material-symbols-outlined text-4xl text-outline-variant">auto_stories</span>
                <p>No recommendations yet. Upload a document to get started.</p>
              </div>
            ) : (
              recommendations.map((r, i) => (
                <div key={r.topic_id} className="bg-surface-container-lowest/50 border border-outline-variant/20 rounded-2xl p-4 flex items-center gap-4 hover:bg-surface-container transition-colors group cursor-pointer">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${i % 2 === 0 ? 'bg-primary/10 text-primary' : 'bg-tertiary/10 text-tertiary'}`}>
                    <span className="material-symbols-outlined">{i % 2 === 0 ? 'functions' : 'biotech'}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <h4 className="font-body-md text-body-md font-semibold text-on-surface">{r.topic_name}</h4>
                      <span className="text-sm font-mono font-bold" style={{ color: i % 2 === 0 ? 'var(--tw-colors-primary)' : 'var(--tw-colors-tertiary)' }}>Score: {r.score}</span>
                    </div>
                    <div className="w-full text-xs text-on-surface-variant mt-1 line-clamp-1">
                      {r.reason}
                    </div>
                  </div>
                  <Link to={`/chat?topic=${r.topic_id}`} className="p-2 text-outline hover:text-primary transition-colors hidden md:block">
                    <span className="material-symbols-outlined">play_arrow</span>
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Summary Stats (Span 12) */}
        <div className="bg-surface-container/60 backdrop-blur-xl border border-outline-variant/20 rounded-3xl col-span-1 md:col-span-12 p-8 shadow-lg hover:-translate-y-1 transition-transform overflow-hidden relative">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
          <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-6 relative z-10">Overview Stats</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 relative z-10">
            <div className="flex flex-col gap-1">
              <span className="text-4xl font-display-lg font-bold text-primary">{overview?.total_documents ?? 0}</span>
              <span className="text-sm font-label-md text-on-surface-variant uppercase">Documents</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-4xl font-display-lg font-bold text-secondary">{overview?.total_subjects ?? 0}</span>
              <span className="text-sm font-label-md text-on-surface-variant uppercase">Subjects</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-4xl font-display-lg font-bold text-tertiary">{overview?.average_quiz_score ?? 0}%</span>
              <span className="text-sm font-label-md text-on-surface-variant uppercase">Avg Quiz Score</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-4xl font-display-lg font-bold text-primary">{overview?.learning_streak_days ?? 0}</span>
              <span className="text-sm font-label-md text-on-surface-variant uppercase">Day Streak</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-4xl font-display-lg font-bold text-secondary">
                {taskStats?.completed ?? 0} <span className="text-2xl text-on-surface-variant">/ {taskStats?.total ?? 0}</span>
              </span>
              <span className="text-sm font-label-md text-on-surface-variant uppercase">Daily Tasks</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
