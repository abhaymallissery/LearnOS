import React from "react";

export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-5 ${className}`}>
      {children}
    </div>
  );
}

export function Button({ children, variant = "primary", className = "", ...props }) {
  const variants = {
    primary: "bg-brand-600 hover:bg-brand-700 text-white",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-700",
    danger: "bg-red-50 hover:bg-red-100 text-red-600",
  };
  return (
    <button
      className={`px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Spinner({ label = "Loading..." }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500 py-6 justify-center">
      <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      {label}
    </div>
  );
}

export function EmptyState({ title, description }) {
  return (
    <div className="text-center py-12 text-slate-400">
      <p className="font-medium text-slate-500">{title}</p>
      {description && <p className="text-sm mt-1">{description}</p>}
    </div>
  );
}
