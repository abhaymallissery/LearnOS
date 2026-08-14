import React from 'react';
import { Link } from 'react-router-dom';

export default function UserGuide() {
  const steps = [
    {
      id: 1,
      title: "Step 1: Build Your Library",
      description: "Upload PDFs or enter URLs to create your personal knowledge base. The AI reads and understands everything you add.",
      icon: "📚",
      color: "from-blue-500 to-indigo-600",
      link: "/library",
      linkText: "Go to Library"
    },
    {
      id: 2,
      title: "Step 2: Interact & Learn",
      description: "Ask questions, get summaries, or request explanations. The AI Chat only answers using the documents you've uploaded, ensuring accuracy.",
      icon: "💬",
      color: "from-purple-500 to-fuchsia-600",
      link: "/chat",
      linkText: "Start Chatting"
    },
    {
      id: 3,
      title: "Step 3: Create a Study Plan",
      description: "Organize subjects into manageable topics, track your daily tasks, and write manual 'Smart Notes' that are instantly reviewed by the AI.",
      icon: "🗺️",
      color: "from-pink-500 to-rose-600",
      link: "/study-plan",
      linkText: "Plan Your Studies"
    },
    {
      id: 4,
      title: "Step 4: Test Yourself",
      description: "Generate customized multiple-choice quizzes from your study material or your manual notes. Great for active recall.",
      icon: "📝",
      color: "from-amber-400 to-orange-500",
      link: "/exam",
      linkText: "Take a Quiz"
    },
    {
      id: 5,
      title: "Step 5: Retain Knowledge",
      description: "Use the Revision Center's spaced repetition system. The AI schedules your flashcards optimally so you never forget what you've learned.",
      icon: "🧠",
      color: "from-teal-400 to-cyan-500",
      link: "/revision",
      linkText: "Go to Revision Center"
    },
    {
      id: 6,
      title: "Step 6: Track Progress",
      description: "Monitor your learning streak, quiz scores, and view dynamic recommendations on what to study next based on your weak points.",
      icon: "📊",
      color: "from-emerald-400 to-teal-500",
      link: "/analytics",
      linkText: "View Analytics"
    }
  ];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="text-center mb-16 relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle,rgba(111,66,193,0.1)_0%,transparent_70%)] blur-3xl rounded-full opacity-50 transform scale-150"></div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-tertiary tracking-tight mb-4">
          Welcome to LearnOS AI
        </h1>
        <p className="text-lg text-on-surface-variant max-w-2xl mx-auto">
          Your personal AI second brain. Here's a quick guide on how to transform your study material into an interactive learning experience.
        </p>
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {steps.map((step) => (
          <div 
            key={step.id} 
            className="group relative bg-surface-container/40 backdrop-blur-xl rounded-3xl p-8 shadow-sm border border-outline-variant/20 hover:-translate-y-2 transition-all duration-300 overflow-hidden"
          >
            {/* Colorful Background Blob */}
            <div className={`absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br ${step.color} rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-300`}></div>
            
            <div className="flex items-start gap-6 relative z-10">
              <div className={`flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg bg-gradient-to-br ${step.color} text-white transform group-hover:scale-110 transition-transform duration-300`}>
                {step.icon}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-on-surface mb-2">
                  {step.title}
                </h3>
                <p className="text-on-surface-variant mb-6 leading-relaxed">
                  {step.description}
                </p>
                <Link 
                  to={step.link}
                  className="inline-flex items-center text-sm font-semibold text-primary hover:text-primary-fixed transition-colors"
                >
                  {step.linkText}
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Banner */}
      <div className="mt-16 bg-gradient-to-r from-primary to-tertiary rounded-3xl p-8 text-center text-on-primary shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-32 h-32 bg-white opacity-10 rounded-full blur-xl"></div>
        
        <h2 className="text-2xl font-bold mb-2 relative z-10">Ready to start learning?</h2>
        <p className="text-primary-fixed mb-6 max-w-xl mx-auto relative z-10 font-body-md">
          Head over to the Dashboard to see your personalized recommendations, or upload your first document in the Library!
        </p>
        <Link 
          to="/"
          className="relative z-10 inline-block bg-surface text-primary font-bold py-3 px-8 rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300"
        >
          Go to Dashboard
        </Link>
      </div>

    </div>
  );
}
