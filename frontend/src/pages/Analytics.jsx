import React, { useEffect, useState } from "react";
import { analyticsOverview, analyticsTimeline, quizHistory } from "../api/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [taskStats, setTaskStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsOverview(),
      analyticsTimeline(),
      quizHistory(),
      import("../api/client").then(m => m.getDailyTasksAnalytics())
    ]).then(
      ([ov, tl, qz, ts]) => {
        setOverview(ov.data);
        setTimeline(tl.data);
        setQuizzes(qz.data);
        setTaskStats(ts.data);
      }
    ).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-full min-h-screen">
      <span className="material-symbols-outlined animate-spin text-4xl text-primary">refresh</span>
    </div>
  );

  const chartData = [...quizzes].reverse().map((q, i) => ({ attempt: i + 1, score: q.score }));

  // Radar chart dummy data since we don't have subject mastery yet
  const radarData = [
    { subject: 'Logic', mastery: 85 },
    { subject: 'Math', mastery: 70 },
    { subject: 'Physics', mastery: 65 },
    { subject: 'Biology', mastery: 90 },
    { subject: 'History', mastery: 50 },
    { subject: 'CompSci', mastery: 95 },
  ];

  // Calculate Consistency and Heatmap data
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  let daysStudiedThisWeek = 0;
  let daysStudiedThisMonth = 0;
  
  const dateCounts = {};
  timeline.forEach(t => {
      dateCounts[t.date] = (dateCounts[t.date] || 0) + 1;
  });
  quizzes.forEach(q => {
    if (q.taken_at) {
        const d = q.taken_at.split('T')[0];
        dateCounts[d] = (dateCounts[d] || 0) + 1;
    }
  });

  const uniqueDates = Object.keys(dateCounts);
  
  uniqueDates.forEach(dateStr => {
    const d = new Date(dateStr);
    if (d >= oneWeekAgo) daysStudiedThisWeek++;
    if (d >= oneMonthAgo) daysStudiedThisMonth++;
  });

  // Generate Heatmap (52 weeks x 7 days)
  const heatmapCols = 52;
  const heatmapRows = 7;
  const heatmapGrid = [];
  
  // Create a 1D array of dates going back from today
  const today = new Date();
  for (let c = 0; c < heatmapCols; c++) {
      const col = [];
      for (let r = 0; r < heatmapRows; r++) {
          const daysAgo = (51 - c) * 7 + (6 - r); // Calculate backwards
          const cellDate = new Date(today);
          cellDate.setDate(today.getDate() - daysAgo);
          const dateString = cellDate.toISOString().split('T')[0];
          
          const count = dateCounts[dateString] || 0;
          let intensity = 0;
          if (count > 0) intensity = 1;
          if (count > 2) intensity = 2;
          if (count > 4) intensity = 3;
          if (count > 6) intensity = 4;
          
          col.push({ date: dateString, count, intensity });
      }
      heatmapGrid.push(col);
  }

  // Tooltip component for Recharts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-container/90 backdrop-blur-md border border-outline-variant/30 p-3 rounded-lg shadow-lg">
          <p className="text-on-surface text-sm mb-1">{`Attempt ${label}`}</p>
          <p className="text-primary font-bold text-lg">{`${payload[0].value}%`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full max-w-container-max mx-auto relative z-10 flex flex-col gap-8 mt-4 pb-20">
      
      <div className="mb-2">
        <h2 className="font-display-lg text-display-lg text-on-surface">Analytics Overview</h2>
        <p className="text-on-surface-variant font-body-lg text-body-lg mt-2">Track your learning velocity and mastery levels.</p>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter auto-rows-min">
        
        {/* Top Stats */}
        <div className="md:col-span-3 bg-surface-container/40 backdrop-blur-xl border border-outline-variant/10 rounded-3xl p-6 flex flex-col gap-2 hover:scale-[1.02] transition-transform duration-300 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-[100px] h-[100px] bg-[radial-gradient(circle,rgba(211,187,255,0.1)_0%,transparent_70%)] rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-700"></div>
          <div className="flex justify-between items-center relative z-10">
            <span className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Current Streak</span>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            </div>
          </div>
          <div className="font-display-lg text-display-lg text-on-surface flex items-baseline gap-2 relative z-10">
            {overview.learning_streak_days} <span className="font-body-md text-body-md text-on-surface-variant">days</span>
          </div>
          <div className="h-1 w-full bg-surface-container rounded-full mt-2 overflow-hidden relative z-10">
            <div className="h-full bg-gradient-to-r from-primary to-tertiary transition-all duration-1000" style={{ width: `${Math.min((overview.learning_streak_days / 30) * 100, 100)}%` }}></div>
          </div>
        </div>

        <div className="md:col-span-3 bg-surface-container/40 backdrop-blur-xl border border-outline-variant/10 rounded-3xl p-6 flex flex-col gap-2 hover:scale-[1.02] transition-transform duration-300 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-[100px] h-[100px] bg-[radial-gradient(circle,rgba(123,214,209,0.1)_0%,transparent_70%)] rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-700"></div>
          <div className="flex justify-between items-center relative z-10">
            <span className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Average Score</span>
            <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
            </div>
          </div>
          <div className="font-display-lg text-display-lg text-on-surface flex items-baseline gap-2 relative z-10">
            {overview.average_quiz_score} <span className="font-body-md text-body-md text-on-surface-variant">%</span>
          </div>
          <div className="flex items-center gap-2 mt-2 relative z-10">
            <span className="text-secondary font-label-md text-label-md flex items-center"><span className="material-symbols-outlined text-sm">trending_up</span> Consistent</span>
            <span className="text-on-surface-variant font-body-sm text-sm">across {overview.quizzes_taken} quizzes</span>
          </div>
        </div>

        <div className="md:col-span-3 bg-surface-container/40 backdrop-blur-xl border border-outline-variant/10 rounded-3xl p-6 flex flex-col gap-2 hover:scale-[1.02] transition-transform duration-300 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-[100px] h-[100px] bg-[radial-gradient(circle,rgba(221,183,255,0.1)_0%,transparent_70%)] rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-700"></div>
          <div className="flex justify-between items-center relative z-10">
            <span className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Topics Mastered</span>
            <div className="w-8 h-8 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>style</span>
            </div>
          </div>
          <div className="font-display-lg text-display-lg text-on-surface flex items-baseline gap-2 relative z-10">
            {overview.completed_topics}
          </div>
          <div className="flex items-center gap-2 mt-2 relative z-10">
            <span className="px-2 py-1 rounded-full bg-tertiary/15 text-tertiary font-label-md text-xs">Based on</span>
            <span className="px-2 py-1 rounded-full bg-primary/15 text-primary font-label-md text-xs">Knowledge Base</span>
          </div>
        </div>

        <div className="md:col-span-3 bg-surface-container/40 backdrop-blur-xl border border-outline-variant/10 rounded-3xl p-6 flex flex-col gap-2 hover:scale-[1.02] transition-transform duration-300 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-[100px] h-[100px] bg-[radial-gradient(circle,rgba(211,187,255,0.1)_0%,transparent_70%)] rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-700"></div>
          <div className="flex justify-between items-center relative z-10">
            <span className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">Daily Tasks</span>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
            </div>
          </div>
          <div className="font-display-lg text-display-lg text-on-surface flex items-baseline gap-2 relative z-10">
            {taskStats?.completed ?? 0} <span className="font-body-md text-body-md text-on-surface-variant">/ {taskStats?.total ?? 0}</span>
          </div>
          <div className="h-1 w-full bg-surface-container rounded-full mt-2 overflow-hidden relative z-10">
            <div className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-1000" style={{ width: `${taskStats?.completion_rate ?? 0}%` }}></div>
          </div>
        </div>

        {/* Line Chart Area - Main Focus */}
        <div className="md:col-span-8 bg-surface-container/40 backdrop-blur-xl border border-outline-variant/10 rounded-3xl p-8 min-h-[400px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline-md text-headline-md text-on-surface">Quiz Score Trend</h3>
          </div>
          <div className="flex-1 w-full h-[300px]">
             {chartData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-on-surface-variant italic">No quiz attempts yet</div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d3bbff" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#d3bbff" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="attempt" stroke="rgba(255,255,255,0.2)" tick={{fill: '#ccc3d5'}} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.2)" tick={{fill: '#ccc3d5'}} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                    <Line type="monotone" dataKey="score" stroke="#d3bbff" strokeWidth={3} dot={{ fill: '#121317', stroke: '#7bd6d1', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, strokeWidth: 0, fill: '#7bd6d1' }} />
                  </LineChart>
                </ResponsiveContainer>
             )}
          </div>
        </div>

        {/* Radar Chart Area - Secondary Focus */}
        <div className="md:col-span-4 bg-surface-container/40 backdrop-blur-xl border border-outline-variant/10 rounded-3xl p-8 min-h-[400px] flex flex-col">
          <div className="mb-6 flex justify-between items-center">
            <h3 className="font-headline-md text-headline-md text-on-surface">Subject Mastery</h3>
            <span className="material-symbols-outlined text-on-surface-variant">psychology</span>
          </div>
          <div className="flex-1 w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#ccc3d5', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Mastery" dataKey="mastery" stroke="#7bd6d1" fill="#7bd6d1" fillOpacity={0.2} dot={{ fill: '#7bd6d1', r: 3 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GitHub Style Heatmap */}
        <div className="md:col-span-12 bg-surface-container/40 backdrop-blur-xl border border-outline-variant/10 rounded-3xl p-8 overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <h3 className="font-headline-md text-headline-md text-on-surface">Activity Map</h3>
            <div className="flex items-center gap-2 text-on-surface-variant font-label-md text-sm">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-sm bg-surface-container"></div>
                <div className="w-3 h-3 rounded-sm bg-secondary/30"></div>
                <div className="w-3 h-3 rounded-sm bg-secondary/60"></div>
                <div className="w-3 h-3 rounded-sm bg-secondary/90"></div>
                <div className="w-3 h-3 rounded-sm bg-secondary" style={{boxShadow: '0 0 8px rgba(123, 214, 209, 0.6)'}}></div>
              </div>
              <span>More</span>
            </div>
          </div>
          
          <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
            <div className="flex gap-1 min-w-max">
              {heatmapGrid.map((col, colIndex) => (
                <div key={colIndex} className="flex flex-col gap-1">
                  {col.map((cell, rowIndex) => {
                    let bgClass = 'bg-surface-container border border-white/5';
                    let shadowStyle = {};
                    
                    if (cell.intensity === 1) bgClass = 'bg-secondary/30 border-transparent';
                    if (cell.intensity === 2) bgClass = 'bg-secondary/60 border-transparent';
                    if (cell.intensity === 3) bgClass = 'bg-secondary/90 border-transparent';
                    if (cell.intensity === 4) {
                        bgClass = 'bg-secondary border-transparent';
                        shadowStyle = { boxShadow: '0 0 6px rgba(123, 214, 209, 0.4)' };
                    }

                    return (
                      <div 
                        key={`${colIndex}-${rowIndex}`} 
                        title={`${cell.count} actions on ${cell.date}`}
                        className={`w-3.5 h-3.5 md:w-3.5 md:h-3.5 rounded-sm ${bgClass} transition-all duration-200 hover:scale-[1.3] hover:z-10 cursor-pointer`}
                        style={shadowStyle}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Journal / Timeline area - Using standard cards but matched to theme */}
        <div className="md:col-span-12 mt-4">
           <h3 className="font-headline-md text-headline-md text-on-surface mb-6">Learning Timeline</h3>
           {timeline.length === 0 ? (
             <div className="bg-surface-container/20 border border-outline-variant/10 rounded-2xl p-8 text-center text-on-surface-variant italic">
                Your journal is empty. Study sessions will appear here automatically.
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {timeline.map((t) => (
                  <div key={t.date} className="bg-surface-container/40 backdrop-blur-md border border-outline-variant/10 rounded-2xl p-6 hover:bg-surface-container-high/50 transition-colors">
                     <div className="flex justify-between items-center mb-3">
                        <span className="font-label-md text-sm text-secondary px-3 py-1 bg-secondary/10 rounded-full">{t.date}</span>
                        <span className="font-label-md text-xs text-outline-variant flex items-center gap-1">
                           <span className="material-symbols-outlined text-[14px]">schedule</span> {t.minutes_spent} min
                        </span>
                     </div>
                     <p className="font-body-md text-sm text-on-surface leading-relaxed">{t.summary_text}</p>
                  </div>
                ))}
             </div>
           )}
        </div>

      </div>
    </div>
  );
}
