import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api/client.js";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    setError("");
    setLoading(true);
    setMessage("");
    
    try {
      const res = await forgotPassword({ email, new_password: newPassword });
      setMessage(res.data.detail || "Check your email for the verification link.");
      setTimer(180); // Start 3 minute timer
    } catch (err) {
      setError(err?.response?.data?.detail || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setLoading(true);
    setMessage("");
    try {
      const res = await forgotPassword({ email, new_password: newPassword });
      setMessage("Verification email resent. Please check your inbox.");
      setTimer(180); // Reset timer
    } catch (err) {
      setError(err?.response?.data?.detail || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0e12] relative overflow-hidden font-body-md">
      
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[radial-gradient(circle,rgba(111,66,193,0.15)_0%,transparent_70%)] rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[radial-gradient(circle,rgba(0,119,116,0.15)_0%,transparent_70%)] rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md p-8 relative z-10 bg-[#121317]/80 backdrop-blur-xl border border-white/5 rounded-3xl shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold mb-2 tracking-tight">
            <span className="text-[#ddb7ff]">LearnOS</span> <span className="text-[#98f2ed]">AI</span>
          </h1>
          <h2 className="text-xl font-bold text-[#e3e2e8] mb-1">Reset your password</h2>
          <p className="text-sm text-[#ccc3d5]">Enter your email and a new password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <span className="material-symbols-outlined text-[#958e9e] group-focus-within:text-[#7bd6d1] transition-colors">mail</span>
            </div>
            <input
              type="email"
              placeholder="Email Address"
              className="w-full bg-white text-gray-900 rounded-full pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7bd6d1] transition-all placeholder:text-gray-400 font-medium shadow-inner"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={timer > 0}
            />
          </div>
          
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <span className="material-symbols-outlined text-[#958e9e] group-focus-within:text-[#7bd6d1] transition-colors">lock</span>
            </div>
            <input
              type="password"
              placeholder="New Password"
              className="w-full bg-white text-gray-900 rounded-full pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7bd6d1] transition-all placeholder:text-gray-400 font-medium shadow-inner"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={timer > 0}
              minLength={6}
            />
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <span className="material-symbols-outlined text-[#958e9e] group-focus-within:text-[#7bd6d1] transition-colors">lock</span>
            </div>
            <input
              type="password"
              placeholder="Confirm New Password"
              className="w-full bg-white text-gray-900 rounded-full pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7bd6d1] transition-all placeholder:text-gray-400 font-medium shadow-inner"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={timer > 0}
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 text-[#ffb4ab] text-sm px-4 py-2 rounded-xl text-center">
              {error}
            </div>
          )}
          
          {message && (
            <div className="bg-[#7bd6d1]/10 border border-[#7bd6d1]/30 text-[#7bd6d1] text-sm px-4 py-2 rounded-xl text-center">
              {message}
            </div>
          )}
          
          {timer === 0 ? (
            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-[#832ad1] to-[#ddb7ff] hover:from-[#6f42c1] hover:to-[#d3bbff] text-white font-bold py-3 px-4 rounded-full shadow-lg shadow-[#6f42c1]/20 transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center items-center mt-2"
              disabled={loading}
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin">refresh</span>
              ) : (
                "Verify New Password"
              )}
            </button>
          ) : (
            <button 
              type="button" 
              onClick={handleResend}
              className="w-full bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white font-bold py-3 px-4 rounded-full shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center items-center mt-2"
              disabled={loading}
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin">refresh</span>
              ) : (
                `Resend Verification (${Math.floor(timer/60)}:${(timer%60).toString().padStart(2, '0')})`
              )}
            </button>
          )}

          <p className="text-sm text-[#ccc3d5] mt-6 text-center">
            <Link to="/login" className="font-semibold text-[#7bd6d1] hover:text-[#98f2ed] transition-colors flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back to login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
