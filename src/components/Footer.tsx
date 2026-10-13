import React from 'react';
import { Phone, Mail, MapPin, ShieldCheck, FileText, Download } from 'lucide-react';
import { Language, translations } from '../i18n';
import { getReceptionCall } from '../config/reception';

interface FooterProps {
  lang: Language;
  onOpenCallModal: () => void;
  onOpenMailModal: () => void;
  activeDischargeId?: string;
}

export const Footer: React.FC<FooterProps> = ({
  lang,
  onOpenCallModal,
  onOpenMailModal,
  activeDischargeId = 'dis_sample_1',
}) => {
  const t = translations[lang];

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/assets/logo.svg"
                alt="Going Home Right"
                className="h-10 w-auto brightness-200"
              />
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed">
              {t.tagline || 'Going Home Right (Team HealthNova) transforms complex hospital discharge summaries into a plain-language daily medicine schedule for family caregivers.'}
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-emerald-400 font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>ABDM & FHIR-Style Architecture Ready</span>
            </div>
          </div>

          {/* New Portal Navigation */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">
              {t.footer?.carePortalTitle || 'Care Portal'}
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <a href="#upload" className="hover:text-emerald-400 transition-colors">{t.nav.upload}</a>
              </li>
              <li>
                <a href="#review" className="hover:text-emerald-400 transition-colors">{t.nav.review}</a>
              </li>
              <li>
                <a href="#myPlan" className="hover:text-emerald-400 transition-colors">{t.nav.myPlan}</a>
              </li>
              <li>
                <a href="#nurse" className="hover:text-emerald-400 transition-colors">{t.nav.nurseSignoff}</a>
              </li>
              <li>
                <a href="#analytics" className="hover:text-emerald-400 transition-colors">{t.nav.analytics}</a>
              </li>
            </ul>
          </div>

          {/* Developer & Standards */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">
              Clinical Specs & API
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <a href="/docs" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>OpenAPI / Swagger (/docs)</span>
                </a>
              </li>
              <li>
                <a href={`/api/discharges/${activeDischargeId}/fhir`} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  <span>FHIR Bundle Export</span>
                </a>
              </li>
              <li>
                <a href={`/api/discharges/${activeDischargeId}/audit`} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">
                  <span>Audit Trail Endpoint</span>
                </a>
              </li>
              <li>
                <span className="text-slate-500 text-xs">
                  FHIR-style, designed for ABDM alignment, not certified.
                </span>
              </li>
            </ul>
          </div>

          {/* Direct Helpdesk */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">
              {t.footer?.hotlineTitle || 'Hospital Helpdesk'}
            </h4>
            <ul className="space-y-3 text-xs sm:text-sm">
              <li>
                <button
                  type="button"
                  onClick={onOpenCallModal}
                  className="flex items-center gap-2 hover:text-emerald-400 transition-colors text-left"
                >
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Helpline: {getReceptionCall().formatted}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenMailModal}
                  className="flex items-center gap-2 hover:text-emerald-400 transition-colors text-left"
                >
                  <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>helpdesk@goinghomeright.in</span>
                </button>
              </li>
              <li className="flex items-start gap-2 text-slate-400 text-xs pt-1">
                <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>{t.footer?.addressNationwide || 'AIIMS & Associated Hospital Discharge Centers'}</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Going Home Right (Team HealthNova). {t.footer?.allRights || 'All rights reserved.'}</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-400 cursor-pointer">Patient Safety Charter</span>
            <span className="hover:text-slate-400 cursor-pointer">Privacy & Encryption Policy</span>
            <span className="hover:text-slate-400 cursor-pointer">ABDM / ABDM-M3 Architecture</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
