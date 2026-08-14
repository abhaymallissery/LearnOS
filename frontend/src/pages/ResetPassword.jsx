import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../api/client.js";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [status, setStatus] = useState("loading"); // loading, success, error
  const [message, setMessage] = useState("");
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid or missing reset token.");
      return;
    }

    if (hasAttempted.current) return;
    hasAttempted.current = true;

    resetPassword({ token })
      .then(() => {
        setStatus("success");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.response?.data?.detail || "Invalid or expired reset token.");
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0e12] relative overflow-hidden font-body-md">
      
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[radial-gradient(circle,rgba(111,66,193,0.15)_0%,transparent_70%)] rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[radial-gradient(circle,rgba(0,119,116,0.15)_0%,transparent_70%)] rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md p-8 relative z-10 bg-[#121317]/80 backdrop-blur-xl border border-white/5 rounded-3xl shadow-2xl text-center">
        
        {status === "loading" && (
          <div className="animate-in fade-in flex flex-col items-center">
            <span className="material-symbols-outlined animate-spin text-[#7bd6d1] text-5xl mb-4">refresh</span>
            <h2 className="text-2xl font-extrabold text-white mb-2">Verifying Password</h2>
            <p className="text-[#ccc3d5]">Please wait while we update your account...</p>
          </div>
        )}

        {status === "success" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-[#7bd6d1]/20 flex items-center justify-center mb-6 border border-[#7bd6d1]/30">
              <span className="material-symbols-outlined text-[#7bd6d1] text-3xl">check</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-2">Password Verified!</h2>
            <p className="text-[#ccc3d5] mb-8">Your new password has been successfully updated.</p>
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-gradient-to-r from-[#832ad1] to-[#ddb7ff] hover:from-[#6f42c1] hover:to-[#d3bbff] text-white font-bold py-3 px-4 rounded-full shadow-lg shadow-[#6f42c1]/20 transition-all active:scale-[0.98]"
            >
              Return to Login
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-[#ffb4ab]/20 flex items-center justify-center mb-6 border border-[#ffb4ab]/30">
              <span className="material-symbols-outlined text-[#ffb4ab] text-3xl">close</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-2">Verification Failed</h2>
            <p className="text-[#ffb4ab] mb-8">{message}</p>
            <button
              onClick={() => navigate("/forgot-password")}
              className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 px-4 rounded-full border border-white/10 transition-all active:scale-[0.98]"
            >
              Try Again
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
