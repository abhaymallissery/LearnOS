import React from 'react';

export default function QRModal({ isOpen, onClose, shareUrl, qrBase64 }) {
  if (!isOpen) return null;
  const fullUrl = window.location.origin + shareUrl;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 relative shadow-xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
        <h3 className="font-bold text-center text-slate-800 text-lg">Share Link</h3>
        <p className="text-center text-slate-500 text-xs">Scan the QR code or copy the link below.</p>
        
        {qrBase64 ? (
          <img src={`data:image/png;base64,${qrBase64}`} alt="QR Code" className="mx-auto border rounded-xl p-2 bg-slate-50 w-48 h-48 object-cover" />
        ) : (
          <div className="mx-auto border rounded-xl p-2 bg-slate-50 w-48 h-48 flex items-center justify-center text-slate-400 text-sm">Loading QR...</div>
        )}
        
        <div className="flex gap-2 items-center">
          <input readOnly value={fullUrl} className="flex-1 border p-2 rounded-lg text-xs outline-none bg-slate-50 text-slate-600" />
          <button 
            onClick={() => {
              navigator.clipboard.writeText(fullUrl);
              alert("Link copied to clipboard!");
            }} 
            className="bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}
