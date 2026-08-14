import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { resolveShareLink, duplicateShareLink, consumeShareLink } from "../api/client";
import ReactMarkdown from "react-markdown";
import { useAuth } from "../context/AuthContext.jsx";
import { Card, Button, Spinner } from "../components/ui.jsx";
import { getChatMessages, askChat } from "../api/client.js";

export default function ShareView() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const { user } = useAuth();
  const [viewAsGuest, setViewAsGuest] = useState(false);
  
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const bottomRef = React.useRef(null);

  useEffect(() => {
    resolveShareLink(token)
      .then((res) => {
        setData(res.data);
        if (user && res.data.access_level === 'read_write' && res.data.chat_session_id) {
          getChatMessages(res.data.chat_session_id).then(chatRes => {
            setMessages(chatRes.data);
          }).catch(() => console.error("Could not load chat"));
        }
        // If user is already logged in and it's a one-time link, consume it immediately
        if (user && res.data.is_one_time) {
           consumeShareLink(token).catch(console.error);
        }
      })
      .catch((err) => setError(err?.response?.data?.detail || "This link is invalid or has expired."));
  }, [token, user]);

  const handleGuestAccess = () => {
    setViewAsGuest(true);
    if (data?.is_one_time) {
      consumeShareLink(token).catch(console.error);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim() || !data?.chat_session_id) return;
    const q = question;
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", content: q, sources: [] }]);
    setAsking(true);
    try {
      const res = await askChat({ session_id: data.chat_session_id, question: q });
      setMessages((prev) => [...prev, res.data]);
    } finally {
      setAsking(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      await duplicateShareLink(token);
      alert("Resource successfully saved to your Library!");
    } catch (e) {
      alert("Failed to duplicate this resource.");
    }
  };

  const renderContent = () => (
    <>
      <p className="text-xs text-brand-600 font-semibold uppercase mb-2">Shared via AI Learning OS</p>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {data && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold text-slate-800">{data.title || "Shared Resource"}</h1>
            <div className="flex items-center gap-3">
              {data.access_level === 'read_write' && (
                <span className="text-xs bg-brand-100 text-brand-700 px-2 py-1 rounded-full font-medium">Read & Write</span>
              )}
              {user && (
                <Button variant="secondary" className="text-xs py-1" onClick={handleDuplicate}>
                  Save to my Library
                </Button>
              )}
            </div>
          </div>
          {data.type === "note" && data.content && (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{data.content}</ReactMarkdown>
            </div>
          )}
          {data.type === "document" && data.summary && (
            <p className="text-sm text-slate-600">{data.summary}</p>
          )}
          {data.type === "quiz" && data.questions && (
            <ol className="text-sm space-y-2 list-decimal pl-4">
              {data.questions.map((q) => <li key={q.id}>{q.question}</li>)}
            </ol>
          )}
          {(data.type === "subject" || data.type === "revision_day") && data.documents && (
            <div className="space-y-4">
              {data.description && <p className="text-sm text-slate-600 mb-4">{data.description}</p>}
              {data.documents.length === 0 ? (
                 <p className="text-sm text-slate-500 italic">No documents found.</p>
              ) : (
                 data.documents.map((doc, i) => (
                   <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                     <h3 className="font-semibold text-slate-800 text-sm mb-2">{doc.title}</h3>
                     <p className="text-xs text-slate-600 whitespace-pre-wrap">{doc.summary}</p>
                   </div>
                 ))
              )}
            </div>
          )}
        </>
      )}
    </>
  );

  if (!user && !viewAsGuest && data) {
    return (
      <div className="min-h-screen bg-brand-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">
          <div className="mb-6">
            <div className="w-12 h-12 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
              👋
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-1">You've been invited</h2>
            <p className="text-slate-500 text-sm">to view {data.title ? `"${data.title}"` : 'a shared resource'}.</p>
          </div>
          <div className="space-y-3">
            <Button className="w-full" onClick={() => navigate(`/login?returnTo=/share/${token}`)}>
              Log In to Collaborate
            </Button>
            <Button variant="secondary" className="w-full" onClick={handleGuestAccess}>
              Continue as Guest
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-brand-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-2xl w-full">
          {renderContent()}
        </div>
      </div>
    );
  }

  const showChat = data?.access_level === 'read_write' && data?.chat_session_id;

  return (
    <div className={`grid gap-6 h-[calc(100vh-6rem)] ${showChat ? 'grid-cols-2' : 'grid-cols-1'}`}>
      <Card className="overflow-y-auto">
        {renderContent()}
      </Card>
      
      {showChat && (
        <Card className="flex flex-col relative h-full">
          <h2 className="font-semibold text-slate-800 text-sm border-b pb-3 mb-3">Collaborative Chat</h2>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {messages.length === 0 && (
              <p className="text-sm text-slate-400 text-center mt-10">
                Start a collaborative chat on this shared resource. Messages here are synced with the owner.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                    m.role === "user" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <p className="whitespace-pre-line">{m.content}</p>
                </div>
              </div>
            ))}
            {asking && <Spinner label="Thinking..." />}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={handleAsk} className="flex gap-2 mt-4 border-t pt-4">
            <input
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
              placeholder="Ask a question..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={asking}
            />
            <Button type="submit" disabled={asking}>Send</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
