import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const guideData = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: 'space_dashboard',
    color: 'from-blue-500 to-indigo-600',
    content: (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-on-surface mb-6">Dashboard Guide</h2>
        <div className="bg-surface-container/30 p-6 rounded-2xl border border-outline-variant/20">
          <h3 className="text-xl font-bold text-primary mb-3">Step 1: Overview</h3>
          <p className="text-on-surface-variant leading-relaxed">
            The dashboard is your central hub. It provides a quick summary of your learning progress, recent activities, and upcoming reviews.
          </p>
        </div>
        <div className="bg-surface-container/30 p-6 rounded-2xl border border-outline-variant/20">
          <h3 className="text-xl font-bold text-primary mb-3">Step 2: Daily Targets</h3>
          <p className="text-on-surface-variant leading-relaxed">
            Keep yourself accountable by setting daily study targets. You can track your consistency and streaks directly from the home screen.
          </p>
        </div>
        <div className="bg-surface-container/30 p-6 rounded-2xl border border-outline-variant/20">
          <h3 className="text-xl font-bold text-primary mb-3">Step 3: Quick Navigation</h3>
          <p className="text-on-surface-variant leading-relaxed">
            Use the quick action buttons to instantly jump back into your last AI Chat, resume a pending quiz, or review your flashcards for the day.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'library',
    title: 'Library (Knowledge Base)',
    icon: 'library_books',
    color: 'from-purple-500 to-fuchsia-600',
    content: (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-on-surface mb-6">Library Guide</h2>
        <div className="bg-surface-container/30 p-6 rounded-2xl border border-outline-variant/20">
          <h3 className="text-xl font-bold text-primary mb-3">Step 1: Create a Subject</h3>
          <p className="text-on-surface-variant leading-relaxed">
            First, you need to create a subject. In the Library collection, you will see an option for <strong>"New Subject"</strong>. Type your subject name and press the <strong>plus icon</strong> to create it.
          </p>
        </div>
        <div className="bg-surface-container/30 p-6 rounded-2xl border border-outline-variant/20">
          <h3 className="text-xl font-bold text-primary mb-3">Step 2: Upload Knowledge</h3>
          <p className="text-on-surface-variant leading-relaxed">
            Click on that subject to open it. Inside, you can upload files (like PDFs) or paste English video/website links to build your knowledge base for that subject.
          </p>
        </div>
        <div className="bg-surface-container/30 p-6 rounded-2xl border border-outline-variant/20">
          <h3 className="text-xl font-bold text-primary mb-3">Step 3: Check Indexing Status</h3>
          <p className="text-on-surface-variant leading-relaxed">
            Below your uploaded files, you will see a status. If it says <strong>"Indexed"</strong>, it means everything uploaded and processed correctly! If it says <strong>"Failed"</strong>, please upload it one more time to ensure it becomes indexed.
          </p>
        </div>
        <div className="bg-surface-container/30 p-6 rounded-2xl border border-outline-variant/20">
          <h3 className="text-xl font-bold text-primary mb-3">Step 4: Ready for AI</h3>
          <p className="text-on-surface-variant leading-relaxed">
            After the documents are successfully indexed, you can now use the <strong>AI Chat</strong> to ask questions related to this knowledge, or use the <strong>Exam Center</strong> to generate quizzes!
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'chat',
    title: 'AI Chat',
    icon: 'forum',
    color: 'from-pink-500 to-rose-600',
    content: (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-on-surface mb-6">AI Chat Guide</h2>
        <div className="bg-surface-container/30 p-6 rounded-2xl border border-outline-variant/20">
          <h3 className="text-xl font-bold text-primary mb-3">Step 1: Select a Subject</h3>
          <p className="text-on-surface-variant leading-relaxed">
            Before chatting, select a subject you have already created and indexed in your Library. The AI will restrict its knowledge strictly to the files within that subject.
          </p>
        </div>
        <div className="bg-surface-container/30 p-6 rounded-2xl border border-outline-variant/20">
          <h3 className="text-xl font-bold text-primary mb-3">Step 2: Ask Questions</h3>
          <p className="text-on-surface-variant leading-relaxed">
            Ask the AI to explain complex topics, summarize large documents, or find specific details. It acts as your personal tutor that has memorized your textbooks.
          </p>
        </div>
        <div className="bg-surface-container/30 p-6 rounded-2xl border border-outline-variant/20">
          <h3 className="text-xl font-bold text-primary mb-3">Step 3: Chat History</h3>
          <p className="text-on-surface-variant leading-relaxed">
            Your conversations are automatically saved. You can access previous chat sessions from the sidebar to resume a study session right where you left off.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'exam',
    title: 'Exam Center',
    icon: 'quiz',
    color: 'from-amber-400 to-orange-500',
    content: (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-on-surface mb-6">Exam Center Guide</h2>
        <div className="bg-surface-container/30 p-6 rounded-2xl border border-outline-variant/20">
          <h3 className="text-xl font-bold text-primary mb-3">Step 1: Choose your Source</h3>
          <p className="text-on-surface-variant leading-relaxed">
            Select an indexed subject from your Library. The AI will read through the material and prepare a customized test for you.
          </p>
        </div>
        <div className="bg-surface-container/30 p-6 rounded-2xl border border-outline-variant/20">
          <h3 className="text-xl font-bold text-primary mb-3">Step 2: Generate Quiz</h3>
          <p className="text-on-surface-variant leading-relaxed">
            Specify how many questions you want and click Generate. The AI will instantly create a multiple-choice quiz that tests your actual understanding of the concepts.
          </p>
        </div>
        <div className="bg-surface-container/30 p-6 rounded-2xl border border-outline-variant/20">
          <h3 className="text-xl font-bold text-primary mb-3">Step 3: Review Explanations</h3>
          <p className="text-on-surface-variant leading-relaxed">
            After submitting your answers, you can review your score. For every question, the AI provides a detailed explanation of why the correct answer is right and why the others are wrong.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'revision',
    title: 'Revision Center',
    icon: 'calendar_month',
    color: 'from-teal-400 to-cyan-500',
    content: (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-on-surface mb-6">Revision Center Guide</h2>
        <div className="bg-surface-container/30 p-6 rounded-2xl border border-outline-variant/20">
          <h3 className="text-xl font-bold text-primary mb-3">Step 1: Select a Date</h3>
          <p className="text-on-surface-variant leading-relaxed">
            On the left side, you will see a calendar. Select any date to see your scheduled revision tasks for that day.
          </p>
        </div>
        <div className="bg-surface-container/30 p-6 rounded-2xl border border-outline-variant/20">
          <h3 className="text-xl font-bold text-primary mb-3">Step 2: View Daily Summary</h3>
          <p className="text-on-surface-variant leading-relaxed">
            When you select a date, the big screen on the right will display a complete summary of everything you need to review. The AI uses Spaced Repetition to ensure you review topics right before you are about to forget them.
          </p>
        </div>
        <div className="bg-surface-container/30 p-6 rounded-2xl border border-outline-variant/20">
          <h3 className="text-xl font-bold text-primary mb-3">Step 3: Complete Reviews</h3>
          <p className="text-on-surface-variant leading-relaxed">
            Go through your flashcards and mark how well you remembered them. The AI will automatically reschedule them for the future based on your performance.
          </p>
        </div>
      </div>
    )
  }
];

export default function UserGuide() {
  const [activeTab, setActiveTab] = useState(guideData[1].id); // Default to Library

  const activeContent = guideData.find(g => g.id === activeTab);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-background overflow-hidden font-body-md animate-in fade-in duration-500">
      
      {/* Sidebar Navigation */}
      <div className="w-full md:w-80 bg-surface border-b md:border-b-0 md:border-r border-outline-variant/20 flex flex-col h-auto md:h-full overflow-y-auto shrink-0">
        <div className="p-6 pb-2">
          <h1 className="text-2xl font-extrabold text-primary tracking-tight mb-2">
            User Guide
          </h1>
          <p className="text-sm text-on-surface-variant">
            Learn how to use every feature effectively.
          </p>
        </div>
        
        <div className="p-4 space-y-2">
          {guideData.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-200 text-left ${
                activeTab === tab.id 
                  ? 'bg-surface-container-high shadow-lg border border-outline-variant/30' 
                  : 'hover:bg-surface-container hover:translate-x-1 border border-transparent'
              }`}
            >
              <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-br ${tab.color} text-white`}>
                <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
              </div>
              <div>
                <h3 className={`font-bold ${activeTab === tab.id ? 'text-primary' : 'text-on-surface'}`}>
                  {tab.title}
                </h3>
              </div>
              {activeTab === tab.id && (
                <span className="material-symbols-outlined text-primary ml-auto">chevron_right</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area (Big Screen) */}
      <div className="flex-1 bg-background relative overflow-y-auto">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none fixed">
          <div className="absolute top-[-10%] left-[20%] w-[40%] h-[40%] bg-[radial-gradient(circle,rgba(111,66,193,0.1)_0%,transparent_70%)] rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[radial-gradient(circle,rgba(0,119,116,0.1)_0%,transparent_70%)] rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto p-6 md:p-12 relative z-10">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 key={activeTab}">
            
            {/* Header of Active Tab */}
            <div className="flex items-center gap-6 mb-8 border-b border-outline-variant/20 pb-8">
              <div className={`flex-shrink-0 w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl bg-gradient-to-br ${activeContent.color} text-white`}>
                <span className="material-symbols-outlined text-[40px]">{activeContent.icon}</span>
              </div>
              <div>
                <p className="text-secondary font-semibold text-sm tracking-wider uppercase mb-1">Step-by-Step Guide</p>
                <h1 className="text-4xl md:text-5xl font-extrabold text-on-surface">
                  {activeContent.title}
                </h1>
              </div>
            </div>

            {/* Content of Active Tab */}
            {activeContent.content}

          </div>
        </div>
      </div>

    </div>
  );
}
