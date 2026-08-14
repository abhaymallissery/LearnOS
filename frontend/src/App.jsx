import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";

import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Library from "./pages/Library.jsx";
import StudyPlan from "./pages/StudyPlan.jsx";
import Chat from "./pages/Chat.jsx";
import ExamCenter from "./pages/ExamCenter.jsx";
import RevisionCenter from "./pages/RevisionCenter.jsx";
import Analytics from "./pages/Analytics.jsx";
import ShareView from "./pages/ShareView.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import UserGuide from "./pages/UserGuide.jsx";

import { StudyProvider } from "./context/StudyContext.jsx";
import { ChatProvider } from "./context/ChatContext.jsx";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function ShareWrapper() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;
  if (user) {
    return <StudyProvider><ChatProvider><Layout><ShareView /></Layout></ChatProvider></StudyProvider>;
  }
  return <ShareView />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/share/:token" element={<ShareWrapper />} />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <StudyProvider>
              <ChatProvider>
                <Layout />
              </ChatProvider>
            </StudyProvider>
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="library" element={<Library />} />
        <Route path="study-plan" element={<StudyPlan />} />
        <Route path="chat" element={<Chat />} />
        <Route path="exam" element={<ExamCenter />} />
        <Route path="revision" element={<RevisionCenter />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="guide" element={<UserGuide />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
