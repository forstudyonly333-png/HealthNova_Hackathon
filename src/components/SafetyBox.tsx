import React, { useState } from 'react';
import { ShieldAlert, Send, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Language, translations } from '../i18n';
import { api } from '../api';
import { getReceptionCall } from '../config/reception';

interface SafetyBoxProps {
  lang: Language;
  helpdeskNumber?: string;
}

export const SafetyBox: React.FC<SafetyBoxProps> = ({ lang, helpdeskNumber = getReceptionCall().formatted }) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ refusal: boolean; reply: string } | null>(null);

  const t = translations[lang];

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    try {
      const res = await api.askSafetyQuestion(question, lang);
      setResponse(res);
    } catch (err) {
      setResponse({
        refusal: true,
        reply: lang === 'hi' 
          ? 'यह योजना केवल आपके पर्चे की जानकारी दर्शाती है। किसी भी बदलाव के लिए अपने डॉक्टर या अस्पताल हेल्पलाइन से संपर्क करें।'
          : 'This plan comes strictly from your discharge sheet. Please contact your doctor or the hospital helpdesk for all clinical questions.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
      {/* Safety Banner (MANDATORY ON EVERY SCREEN) */}
      <div className="flex items-center gap-2.5 p-3.5 mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm font-medium">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
        <span>{t.safetyBanner}</span>
      </div>

      {/* Question Box */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-600" />
            <span>{t.safetyBox.title}</span>
          </h4>
          <span className="text-[11px] text-slate-400">
            Helpline: {helpdeskNumber}
          </span>
        </div>

        <form onSubmit={handleAsk} className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t.safetyBox.placeholder}
            className="flex-1 px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 text-slate-800 placeholder-slate-400"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>{loading ? '...' : t.safetyBox.askBtn}</span>
          </button>
        </form>

        <p className="mt-2 text-[11px] text-slate-500">
          {t.safetyBox.refusalNotice}
        </p>

        {/* Answer Banner */}
        {response && (
          <div
            className={`mt-4 p-4 rounded-xl border text-xs sm:text-sm leading-relaxed animate-in fade-in ${
              response.refusal
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {response.refusal ? (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-medium">{response.reply}</p>
                {response.refusal && (
                  <p className="mt-2 text-xs font-semibold text-rose-700">
                    Emergency/Doctor Contact: <span className="font-mono">{helpdeskNumber}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
