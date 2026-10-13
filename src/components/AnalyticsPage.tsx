import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  Percent, 
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { Language, translations } from '../i18n';
import { api, AnalyticsData } from '../api';
import { SafetyBox } from './SafetyBox';

interface AnalyticsPageProps {
  lang: Language;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ lang }) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const t = translations[lang];

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.getAnalytics();
        setData(res);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      
      {/* Title */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
          Clinical Quality Assurance
        </span>
        <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          {t.analytics.title}
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-500">
          {t.analytics.subtitle}
        </p>
      </div>

      {/* Safety Notice */}
      <SafetyBox lang={lang} />

      {/* Principle Banner */}
      <div className="mb-8 p-5 rounded-3xl bg-slate-900 text-white shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              HealthNova Safety Invariant
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              {t.analytics.safetyHeadline}
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-block px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 shrink-0">
          ZERO INFERRED DOSES
        </span>
      </div>

      {/* Metrics Cards Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">Loading safety analytics...</div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Card 1: Share of Items Flagged */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">
                {t.analytics.flagShare}
              </span>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 font-mono">
              {data.flagSharePercent}%
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {data.flaggedItemsCount} of {data.totalMedicines} total medications flagged for clinical clarity.
            </p>
          </div>

          {/* Card 2: Items Awaiting Nurse */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">
                {t.analytics.awaitingNurse}
              </span>
              <Clock className="w-5 h-5 text-sky-500" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 font-mono">
              {data.awaitingNurseVerification}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Pending clinical sign-off before entering caregiver schedules.
            </p>
          </div>

          {/* Card 3: Doses Given vs Missed */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">
                {t.analytics.dosesAdherence}
              </span>
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 font-mono">
              {data.adherenceRatePercent}%
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {data.dosesGiven} doses given vs {data.dosesMissed} recorded missed.
            </p>
          </div>

          {/* Card 4: Follow-ups Due vs Done */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">
                {t.analytics.followupsDue}
              </span>
              <Calendar className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 font-mono">
              {data.completedFollowups} / {data.totalFollowups}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {data.pendingFollowups} hospital OPD visits pending review.
            </p>
          </div>

        </div>
      ) : null}

      {/* Hospital Quality Breakdown Card */}
      <div className="mt-8 bg-white rounded-3xl border border-slate-200 p-7 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">
          Clinical Rule Engine Invariant Breakdown
        </h3>
        
        <div className="space-y-4 text-xs sm:text-sm">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="font-semibold text-slate-800">
              1. Unspecified OD Timing Rule:
            </span>
            <span className="font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md font-bold">
              100% Enforced (0 Inferred Morning Slots)
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="font-semibold text-slate-800">
              2. Unknown Abbreviation Detection:
            </span>
            <span className="font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md font-bold">
              Automated Route to Nurse Queue
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="font-semibold text-slate-800">
              3. SOS Emergency Action Verification:
            </span>
            <span className="font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md font-bold">
              Mandatory Hospital Action Flagging
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="font-semibold text-slate-800">
              4. ABDM / FHIR Data Alignment:
            </span>
            <span className="font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md font-bold">
              FHIR-Style Bundle Export Active
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
