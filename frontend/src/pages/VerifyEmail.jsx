import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { verifyEmail } from "../api/client.js";
import { Spinner } from "../components/ui.jsx";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [status, setStatus] = useState("loading"); // loading, success, error
  const [message, setMessage] = useState("");

  const hasAttempted = React.useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }

    if (hasAttempted.current) return;
    hasAttempted.current = true;

    verifyEmail(token)
      .then(() => {
        setStatus("success");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.response?.data?.detail || "Invalid or expired verification link.");
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {status === "loading" && (
          <div className="flex flex-col items-center">
            <Spinner />
            <p className="mt-4 text-slate-600">Verifying your email...</p>
          </div>
        )}
        
        {status === "success" && (
          <div>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-extrabold text-brand-900 mb-2">Email Verified!</h2>
            <p className="text-slate-600 mb-6">Your account is now fully active.</p>
            <Link to="/login" className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium">
              Continue to Login
            </Link>
          </div>
        )}

        {status === "error" && (
          <div>
             <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-3xl font-extrabold text-brand-900 mb-2">Verification Failed</h2>
            <p className="text-red-600 mb-6">{message}</p>
            <Link to="/login" className="font-medium text-brand-600 hover:text-brand-500 underline">
              Return to login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
