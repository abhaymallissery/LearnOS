import React, { useState } from 'react';
import { createShareLink } from '../api/client';

export default function ShareConfigModal({ isOpen, onClose, resourceType, resourceId }) {
  const [accessLevel, setAccessLevel] = useState("read");
  const [isOneTime, setIsOneTime] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareData, setShareData] = useState(null); // { url, qr }
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await createShareLink({ 
        resource_type: resourceType, 
        resource_id: resourceId,
        access_level: accessLevel,
        is_one_time: isOneTime,
        base_url: window.location.origin
      });
      setShareData({
        url: res.data.share_url,
        qr: res.data.qr_code_base64
      });
    } catch (e) {
      alert("Failed to generate link.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShareData(null);
    setAccessLevel("read");
    setIsOneTime(false);
    onClose();
  };

  const fullUrl = shareData ? window.location.origin + shareData.url : "";

  return (
    <div className="fixed inset-0 bg-on-background/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-surface-container-lowest rounded-2xl p-8 max-w-md w-full space-y-6 relative shadow-xl border border-outline-variant/20">
        <button onClick={handleClose} className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface text-2xl font-bold transition-colors">
           <span className="material-symbols-outlined">close</span>
        </button>
        <h3 className="font-headline-md text-headline-md text-center text-on-surface">Share to Web</h3>
        
        {!shareData ? (
          <>
            <p className="text-center text-on-surface-variant text-sm mb-6">Choose sharing permissions for this resource.</p>
            <div className="space-y-4">
              <label className={`block border p-4 rounded-xl cursor-pointer transition-colors ${accessLevel === 'read' ? 'border-primary bg-primary/5' : 'border-outline-variant/30 hover:border-primary/50'}`}>
                <div className="flex items-center gap-4">
                  <input type="radio" name="access" value="read" checked={accessLevel === 'read'} onChange={() => setAccessLevel('read')} className="hidden" />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${accessLevel === 'read' ? 'border-primary' : 'border-outline-variant/50'}`}>
                    {accessLevel === 'read' && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                  </div>
                  <div>
                    <p className="font-label-md text-on-surface">Read Only</p>
                    <p className="text-sm text-on-surface-variant">Anyone with the link can view.</p>
                  </div>
                </div>
              </label>

              <label className={`block border p-4 rounded-xl cursor-pointer transition-colors ${accessLevel === 'read_write' ? 'border-primary bg-primary/5' : 'border-outline-variant/30 hover:border-primary/50'}`}>
                <div className="flex items-center gap-4">
                  <input type="radio" name="access" value="read_write" checked={accessLevel === 'read_write'} onChange={() => setAccessLevel('read_write')} className="hidden" />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${accessLevel === 'read_write' ? 'border-primary' : 'border-outline-variant/50'}`}>
                    {accessLevel === 'read_write' && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                  </div>
                  <div>
                    <p className="font-label-md text-on-surface">Read & Write</p>
                    <p className="text-sm text-on-surface-variant">Allows collaborative chat features.</p>
                  </div>
                </div>
              </label>
              
              <label className="block border p-4 rounded-xl cursor-pointer transition-colors border-outline-variant/30 hover:border-error/50 hover:bg-error/5 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-label-md text-on-surface">Burn After Reading</p>
                    <p className="text-sm text-on-surface-variant">Link self-destructs after first access.</p>
                  </div>
                  <div className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${isOneTime ? 'bg-error' : 'bg-surface-container-highest'}`} onClick={() => setIsOneTime(!isOneTime)}>
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isOneTime ? 'translate-x-6' : ''}`} />
                  </div>
                </div>
              </label>
            </div>
            
            <button 
               className="w-full mt-6 bg-gradient-to-r from-primary to-tertiary text-on-primary py-3 rounded-full font-label-md text-label-md shadow-[0_0_15px_rgba(111,66,193,0.3)] hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:pointer-events-none" 
               onClick={handleGenerate} 
               disabled={loading}
            >
              {loading ? "Generating..." : "Generate Link"}
            </button>
          </>
        ) : (
          <>
            <p className="text-center text-on-surface-variant text-sm mb-4">Scan the QR code or copy the link below.</p>
            {shareData.qr ? (
              <img src={`data:image/png;base64,${shareData.qr}`} alt="QR Code" className="mx-auto border border-outline-variant/20 rounded-xl p-3 bg-surface w-48 h-48 object-cover shadow-sm" />
            ) : (
              <div className="mx-auto border border-outline-variant/20 rounded-xl p-2 bg-surface-container w-48 h-48 flex items-center justify-center text-on-surface-variant text-sm">Loading QR...</div>
            )}
            
            <div className="flex gap-3 items-center mt-6">
              <input readOnly value={fullUrl} className="flex-1 border border-outline-variant/30 p-3 rounded-xl text-sm outline-none bg-surface-container-high/50 text-on-surface focus:border-primary/50 transition-colors" />
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(fullUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }} 
                className={`${copied ? 'bg-secondary' : 'bg-primary'} text-on-primary px-5 py-3 rounded-xl text-sm font-label-md transition-colors shrink-0`}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
