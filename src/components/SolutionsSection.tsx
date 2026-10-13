import React from 'react';
import { 
  UploadCloud, 
  Cpu, 
  UserCheck, 
  CalendarCheck, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { Language, translations } from '../i18n';

interface SolutionsSectionProps {
  lang: Language;
  onNavigateToUpload: () => void;
  onNavigateToNurse: () => void;
  onNavigateToPlan: () => void;
}

export const SolutionsSection: React.FC<SolutionsSectionProps> = ({
  lang,
  onNavigateToUpload,
  onNavigateToNurse,
  onNavigateToPlan,
}) => {
  const t = translations[lang];
  const s = t.solutionsSection || {
    badge: 'Care Pathway & Flow',
    title: 'The 4-Step Patient Safety Flow',
    subtitle: 'Turning complex discharge papers into unmistakable family routines. Built by Team HealthNova.',
    step1Title: '1. Upload Discharge Summary',
    step1Desc: 'Upload a smartphone photo, PDF, or scan of the printed discharge summary. Image quality is checked immediately.',
    step1Btn: 'Try Ingestion Flow',
    step2Title: '2. AI Reads, Rules Decide',
    step2Desc: 'Pure deterministic clinical rules engine. BD maps to Morning + Night. OD with no time stated is flagged, never guessed.',
    step2Btn: 'View Safety Rules',
    step3Title: '3. Clinical Nurse Sign-off',
    step3Desc: 'Every flagged item is reviewed in the nurse verification queue. Only approved items enter the family schedule.',
    step3Btn: 'Open Nurse Queue',
    step4Title: '4. Plain-Language Family Plan',
    step4Desc: 'Subah, Dopahar, Raat daily schedule with Indic voice read-out, WhatsApp reminders, and .ics calendar sync.',
    step4Btn: 'View Daily Plan',
  };

  const steps = [
    {
      num: '01',
      title: s.step1Title,
      desc: s.step1Desc,
      icon: <UploadCloud className="w-7 h-7 text-emerald-600" />,
      actionText: s.step1Btn,
      onClick: onNavigateToUpload,
    },
    {
      num: '02',
      title: s.step2Title,
      desc: s.step2Desc,
      icon: <Cpu className="w-7 h-7 text-emerald-600" />,
      actionText: s.step2Btn,
      onClick: onNavigateToUpload,
    },
    {
      num: '03',
      title: s.step3Title,
      desc: s.step3Desc,
      icon: <UserCheck className="w-7 h-7 text-emerald-600" />,
      actionText: s.step3Btn,
      onClick: onNavigateToNurse,
    },
    {
      num: '04',
      title: s.step4Title,
      desc: s.step4Desc,
      icon: <CalendarCheck className="w-7 h-7 text-emerald-600" />,
      actionText: s.step4Btn,
      onClick: onNavigateToPlan,
    },
  ];

  return (
    <section id="solutions" className="py-20 bg-slate-50 border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            {s.badge}
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            {s.title}
          </h2>
          <p className="mt-3 text-slate-600 text-sm sm:text-base">
            {s.subtitle}
          </p>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div
              key={step.num}
              className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    {step.icon}
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    STEP {step.num}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {step.desc}
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={step.onClick}
                  className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>{step.actionText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
