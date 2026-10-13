import React from 'react';
import { ShieldCheck, Heart, Users, CheckCircle2, Lock, Sparkles } from 'lucide-react';
import { Language, translations } from '../i18n';

interface AboutSectionProps {
  lang: Language;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ lang }) => {
  const t = translations[lang];
  const a = t.aboutSection || {
    badge: 'Team HealthNova · Going Home Right',
    principleHeadline: 'Principle: AI reads, rules decide, missing means flagged.',
    principleBody1: 'When a patient returns home after discharge, ambiguous medical abbreviations (OD, BD, TDS, SOS) cause dangerous medication errors for family caregivers. Going Home Right bridges this high-risk transition.',
    principleBody2: 'Our deterministic safety engine strictly forbids inferring times, doses, or follow-up dates. If the doctor wrote OD without specifying Morning or Night, the drug is never automatically scheduled — it is routed to the nurse sign-off queue.',
    pillar1Title: 'Zero Guessed Doses',
    pillar1Desc: 'Strict dictionary validation; missing information triggers clinical alerts.',
    pillar2Title: 'ABDM & Privacy First',
    pillar2Desc: 'Encrypted patient data at rest and FHIR-style bundle export format.',
    shieldTitle: 'The HealthNova Care Shield',
    shieldDesc: 'Representing Patient Safety, Clinical Verification, Caregiver Clarity, and Continuous Telehealth Follow-up.',
    shieldBadge: 'ABDM Ready · FHIR Document Specification',
    teamTitle: 'Our Medical & Care Governance Team',
    teamDesc: 'Experienced clinicians, nursing supervisors, and healthcare engineers ensuring patient safety across India.',
  };

  return (
    <section id="about" className="py-20 bg-[#FAF7F2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Split: Team HealthNova Mission & Safety Principle */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-16">
          
          <div className="lg:col-span-7 space-y-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1E6F5C]">
              {a.badge}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#242A35] leading-tight">
              {a.principleHeadline}
            </h2>
            <p className="text-base text-[#5A6270] leading-relaxed">
              {a.principleBody1}
            </p>
            <p className="text-base text-[#5A6270] leading-relaxed">
              {a.principleBody2}
            </p>

            {/* Core Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#FFFDF9] border border-[#EAE5DB]">
                <ShieldCheck className="w-5 h-5 text-[#1E6F5C] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-[#242A35]">{a.pillar1Title}</h4>
                  <p className="text-xs text-[#5A6270] mt-0.5">{a.pillar1Desc}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#FFFDF9] border border-[#EAE5DB]">
                <Lock className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-[#242A35]">{a.pillar2Title}</h4>
                  <p className="text-xs text-[#5A6270] mt-0.5">{a.pillar2Desc}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Emblem Showcase: Healthcare Symbol */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-8 rounded-3xl bg-[#EAF2ED]/60 border border-[#D5E5DC] text-center">
            <div className="w-44 h-44 mb-5 p-4 rounded-2xl bg-[#FFFDF9] shadow-sm border border-[#D5E5DC] flex items-center justify-center">
              <img
                src="/assets/healthcare-symbol.svg"
                alt="Going Home Right Symbol"
                className="w-full h-full object-contain"
              />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              {a.shieldTitle}
            </h3>
            <p className="mt-2 text-xs text-slate-600 max-w-sm leading-relaxed">
              {a.shieldDesc}
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-mono font-medium text-emerald-800 bg-white px-3 py-1 rounded-full border border-emerald-200">
              <span>{a.shieldBadge}</span>
            </div>
          </div>

        </div>

        {/* Medical Team Photograph Section (retained as required) */}
        <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900 text-white">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
            
            <div className="lg:col-span-7 h-72 sm:h-96 lg:h-[400px] relative overflow-hidden">
              <img
                src="/assets/medical-team.svg"
                alt="HealthNova Clinical Panel"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-900/20 to-slate-900 lg:block hidden" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent lg:hidden block" />
            </div>

            <div className="lg:col-span-5 p-8 sm:p-12 relative z-10">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2.5 py-1 rounded-md mb-4">
                <Users className="w-3.5 h-3.5" />
                <span>Clinical Verification Panel</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Human Oversight at Every Step
              </h3>
              <p className="mt-4 text-sm text-slate-300 leading-relaxed">
                Registered clinical nurses and advising hospital physicians monitor the verification queue to ensure that no patient ever receives an incorrect medicine schedule.
              </p>
              
              <ul className="mt-6 space-y-2.5 text-xs sm:text-sm text-slate-200">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Licensed nursing staff verifies ambiguous prescriptions</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Direct triage telephone connection to hospital OPD</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Transparent read-only audit log of all clinical approvals</span>
                </li>
              </ul>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
