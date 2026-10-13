import React, { useState } from 'react';
import { X, Phone, Clock, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Language, translations } from '../i18n';
import { getReceptionCall } from '../config/reception';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: Language;
}

export const CallModal: React.FC<CallModalProps> = ({ isOpen, onClose, lang = 'en' }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [requestedCallback, setRequestedCallback] = useState(false);
  const callInfo = getReceptionCall();
  const t = translations[lang];
  const m = t.modals || {
    callTitle: 'HealthCare Direct Call',
    callSubtitle: '24/7 Telephone & Callback Support',
    requestCallback: 'Request a Quick Callback',
    yourPhone: 'Phone Number',
    submit: 'Submit',
    close: 'Close',
  };

  if (!isOpen) return null;

  const handleCallbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;
    setRequestedCallback(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-emerald-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{m.callTitle}</h3>
              <p className="text-xs text-slate-500">{m.callSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close call modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          
          {/* Direct Dial Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-xs text-slate-500 font-medium block">Hospital Helpline</span>
            <a
              href={callInfo.telUri}
              className="text-2xl font-bold font-mono text-emerald-700 hover:text-emerald-800 transition-colors block mt-1"
            >
              {callInfo.formatted}
            </a>
            <span className="text-xs text-slate-400 block mt-1">(24x7 Direct Reception & Helpline)</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 justify-center">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>Average connect time: &lt; 2 minutes</span>
          </div>

          {/* Callback Request */}
          <div className="pt-2 border-t border-slate-100">
            {requestedCallback ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                <h4 className="font-bold text-sm text-emerald-900">Callback Scheduled!</h4>
                <p className="text-xs text-emerald-700 mt-1">
                  Our triage nurse will call <strong>{phoneNumber}</strong> within 15 minutes.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-4 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleCallbackSubmit} className="space-y-3">
                <span className="text-xs font-semibold text-slate-700 block">
                  {m.requestCallback}
                </span>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder={m.yourPhone}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                >
                  {m.submit}
                </button>
              </form>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
