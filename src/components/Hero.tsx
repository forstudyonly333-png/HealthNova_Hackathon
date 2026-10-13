import React from 'react';
import { Phone, Search, Mail, HeartPulse, Users, ShieldCheck, Upload, ArrowRight } from 'lucide-react';
import { Language, translations } from '../i18n';
import { getReceptionCall } from '../config/reception';

interface HeroProps {
  lang: Language;
  helpdeskNumber?: string;
  onNavigateToUpload: () => void;
  onOpenCallModal: () => void;
  onOpenMailModal: () => void;
  onNavigateToPlan: () => void;
  onNavigateToNurse: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  lang,
  helpdeskNumber = getReceptionCall().formatted,
  onNavigateToUpload,
  onOpenCallModal,
  onOpenMailModal,
  onNavigateToPlan,
  onNavigateToNurse,
}) => {
  const t = translations[lang];

  return (
    <section id="home" className="relative overflow-hidden bg-slate-900 text-white">
      {/* Background Medical Team Image with Measured Scrim Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="/assets/medical-team.svg"
          alt="Going Home Right Medical Team"
          className="w-full h-full object-cover object-center scale-105"
        />
        {/* Scrim gradient ensuring WCAG AA text contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/85 to-slate-900/50" />
        <div className="absolute inset-0 bg-emerald-950/20 mix-blend-multiply" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28">
        <div className="max-w-3xl">
          
          {/* Tagline kicker */}
          <div className="flex items-center gap-2 mb-4 text-emerald-400 text-sm font-semibold tracking-wide">
            <HeartPulse className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{t.hero.badge}</span>
          </div>

          {/* Main Headline (styling strictly preserved) */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight sm:leading-none text-balance">
            {t.hero.title1} <br className="hidden sm:inline" />
            <span className="text-emerald-400">{t.hero.title2}</span>
          </h1>

          {/* Description & Quote */}
          <p className="mt-5 text-base sm:text-lg text-slate-200 font-normal leading-relaxed max-w-2xl">
            {t.hero.desc}
            <span className="block mt-1 text-slate-300 italic text-sm sm:text-base">
              {t.hero.quote}
            </span>
          </p>

          {/* STRICT REQUIREMENT: 3 Hero Buttons:
              1. "Upload Discharge Sheet" (primary green, opens upload screen)
              2. "Call Helpdesk" (opens active helpdesk number)
              3. "Mail Us" (unchanged)
          */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            
            {/* 1. Upload Discharge Sheet */}
            <button
              type="button"
              onClick={onNavigateToUpload}
              className="flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 rounded-lg shadow-lg hover:shadow-emerald-500/25 transition-all whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <Upload className="w-5 h-5 text-slate-950" />
              <span>{t.hero.btnUpload}</span>
            </button>

            {/* 2. Call Helpdesk */}
            <button
              type="button"
              onClick={onOpenCallModal}
              className="flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-white bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700 rounded-lg backdrop-blur-sm transition-all whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Phone className="w-5 h-5 text-emerald-400" />
              <span>{t.hero.btnCallHelpdesk}</span>
            </button>

            {/* 3. Mail Us */}
            <button
              type="button"
              onClick={onOpenMailModal}
              className="flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg backdrop-blur-sm transition-all whitespace-nowrap"
            >
              <Mail className="w-4 h-4 text-emerald-300" />
              <span>{t.hero.btnMailUs}</span>
            </button>
          </div>

          {/* STRICT REQUIREMENT: Fix typo in 3 hero cards:
              "Self Curement" -> "Self Care"
              Captions: "Clear Daily Plan", "Nurse Verified", "Safe by Design"
          */}
          <div className="mt-10 pt-8 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Card 1: Self Care -> Clear Daily Plan */}
            <button
              type="button"
              onClick={onNavigateToPlan}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs text-slate-400 font-medium">
                  {t.hero.card1Title}
                </span>
                <span className="block text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors truncate">
                  {t.hero.card1Caption}
                </span>
              </div>
            </button>

            {/* Card 2: Our Community -> Nurse Verified */}
            <button
              type="button"
              onClick={onNavigateToNurse}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-sky-400" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs text-slate-400 font-medium">
                  {t.hero.card2Title}
                </span>
                <span className="block text-sm font-semibold text-white group-hover:text-sky-300 transition-colors truncate">
                  {t.hero.card2Caption}
                </span>
              </div>
            </button>

            {/* Card 3: Our Instructors -> Safe by Design */}
            <button
              type="button"
              onClick={onNavigateToUpload}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <HeartPulse className="w-5 h-5 text-amber-400" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs text-slate-400 font-medium">
                  {t.hero.card3Title}
                </span>
                <span className="block text-sm font-semibold text-white group-hover:text-amber-300 transition-colors truncate">
                  {t.hero.card3Caption}
                </span>
              </div>
            </button>

          </div>

        </div>
      </div>

      {/* Trust Strip */}
      <div className="bg-slate-950/70 border-t border-white/5 py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-emerald-400">Team HealthNova</span>
            <span>·</span>
            <span>{t.hero.trustStrip}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-300">
            <span>Clinical Helpline:</span>
            <span className="font-mono text-emerald-400">{helpdeskNumber}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
