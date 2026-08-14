import React, { createContext, useContext, useState } from 'react';

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [asking, setAsking] = useState(false);
  const [question, setQuestion] = useState("");
  const [scopeDocs, setScopeDocs] = useState([]);
  const [scopeTopics, setScopeTopics] = useState([]);

  return (
    <ChatContext.Provider
      value={{
        sessions, setSessions,
        activeSession, setActiveSession,
        messages, setMessages,
        asking, setAsking,
        question, setQuestion,
        scopeDocs, setScopeDocs,
        scopeTopics, setScopeTopics
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}
