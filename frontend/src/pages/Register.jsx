import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [autoVerified, setAutoVerified] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }
    try {
      const data = await register(form.name, form.email, form.password);
      if (data.is_verified) {
        setAutoVerified(true);
      } else {
        setRegistered(true);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || "Registration failed");
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
          <h2 className="text-xl font-bold text-[#e3e2e8] mb-1">Create your account</h2>
          <p className="text-sm text-[#ccc3d5]">Start building your permanent knowledge base</p>
        </div>

        {autoVerified ? (
          <div className="text-center py-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-[#007774]/20 mb-6 border border-[#007774]/30">
              <span className="material-symbols-outlined text-4xl text-[#7bd6d1]">check_circle</span>
            </div>
            <h2 className="text-xl font-bold text-[#e3e2e8] mb-3">Account Created!</h2>
            <p className="text-sm text-[#ccc3d5] mb-6 leading-relaxed">
              Your account has been successfully created. Since you are running in local development mode without an email server, your account was automatically verified.
            </p>
            <Link to="/login" className="inline-block w-full text-center px-4 py-3 bg-gradient-to-r from-[#832ad1] to-[#ddb7ff] hover:from-[#6f42c1] hover:to-[#d3bbff] text-white font-bold rounded-full shadow-lg shadow-[#6f42c1]/20 transition-all">
              Sign In Now
            </Link>
          </div>
        ) : registered ? (
          <div className="text-center py-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-[#007774]/20 mb-6 border border-[#007774]/30">
              <span className="material-symbols-outlined text-4xl text-[#7bd6d1]">mark_email_read</span>
            </div>
            <h2 className="text-xl font-bold text-[#e3e2e8] mb-3">Check your email</h2>
            <p className="text-sm text-[#ccc3d5] mb-6 leading-relaxed">
              We've sent a verification link to <strong className="text-[#e3e2e8]">{form.email}</strong>. 
              Please verify your email address to log in.
            </p>
            <Link to="/login" className="inline-block w-full text-center px-4 py-3 bg-[#1f1f24] text-[#e3e2e8] rounded-full hover:bg-[#292a2e] transition-colors border border-white/5 font-semibold">
              Return to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <span className="material-symbols-outlined text-[#958e9e] group-focus-within:text-[#7bd6d1] transition-colors">person</span>
              </div>
              <input
                placeholder="Full Name"
                className="w-full bg-white text-gray-900 rounded-full pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7bd6d1] transition-all placeholder:text-gray-400 font-medium shadow-inner"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <span className="material-symbols-outlined text-[#958e9e] group-focus-within:text-[#7bd6d1] transition-colors">mail</span>
              </div>
              <input
                type="email"
                placeholder="Email Address"
                className="w-full bg-white text-gray-900 rounded-full pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7bd6d1] transition-all placeholder:text-gray-400 font-medium shadow-inner"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <span className="material-symbols-outlined text-[#958e9e] group-focus-within:text-[#7bd6d1] transition-colors">lock</span>
              </div>
              <input
                type="password"
                placeholder="Password"
                className="w-full bg-white text-gray-900 rounded-full pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7bd6d1] transition-all placeholder:text-gray-400 font-medium shadow-inner"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <span className="material-symbols-outlined text-[#958e9e] group-focus-within:text-[#7bd6d1] transition-colors">lock</span>
              </div>
              <input
                type="password"
                placeholder="Confirm Password"
                className="w-full bg-white text-gray-900 rounded-full pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7bd6d1] transition-all placeholder:text-gray-400 font-medium shadow-inner"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                required
              />
            </div>
            
            {error && (
              <div className="bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 text-[#ffb4ab] text-sm px-4 py-2 rounded-xl text-center">
                {error}
              </div>
            )}
            
            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-[#832ad1] to-[#ddb7ff] hover:from-[#6f42c1] hover:to-[#d3bbff] text-white font-bold py-3 px-4 rounded-full shadow-lg shadow-[#6f42c1]/20 transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center items-center"
              disabled={loading}
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin">refresh</span>
              ) : (
                "Create Account"
              )}
            </button>

            <p className="text-sm text-[#ccc3d5] mt-6 text-center">
              Already have an account? <Link to="/login" className="text-[#7bd6d1] hover:text-[#98f2ed] font-semibold transition-colors">Sign In</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
