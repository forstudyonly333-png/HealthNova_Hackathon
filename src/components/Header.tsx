import React, { useState } from 'react';
import { Menu, X, FileText, Lock, LogOut, ShieldCheck, UserCheck, Stethoscope, Pill } from 'lucide-react';
import { Language, translations } from '../i18n';
import { LanguageDropdown } from './LanguageDropdown';

interface HeaderProps {
  lang: Language;
  onSelectLang: (lang: Language) => void;
  onToggleLang?: () => void;
  activeNav: string;
  onNavClick: (navId: string) => void;
  onOpenJoinModal: () => void;
  currentUser?: any;
  userRoleType?: 'hospital' | 'patient' | 'guest';
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onSelectLang,
  activeNav,
  onNavClick,
  onOpenJoinModal,
  currentUser,
  userRoleType = 'guest',
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = translations[lang];

  // Dynamic Navigation Items based on logged-in role with full i18n
  const patientPlanLabel = t.nav.myPlan || 'Patient Checklist';
  const hospitalPortalLabel = t.portalSwitcher?.btnHospital?.replace(/[^\w\s\u0900-\u0D7F]/gu, '').trim() || t.portalSwitcher?.hospitalPortalTitle || 'Hospital Portal';

  let navItems = [
    { label: t.nav.home, id: 'home' },
    { label: patientPlanLabel, id: 'myPlan' },
    { label: hospitalPortalLabel, id: 'hospital' },
    { label: t.nav.nurseSignoff, id: 'nurse' },
    { label: t.nav.upload, id: 'upload' },
    { label: t.nav.review, id: 'review' },
    { label: t.nav.analytics, id: 'analytics' },
    { label: t.nav.doctors, id: 'doctors' },
  ];

  if (userRoleType === 'patient') {
    navItems = [
      { label: patientPlanLabel, id: 'myPlan' },
      { label: t.nav.home, id: 'home' },
      { label: t.nav.review, id: 'review' },
      { label: t.nav.doctors, id: 'doctors' },
      { label: t.nav.contact, id: 'contact' },
    ];
  } else if (userRoleType === 'hospital') {
    navItems = [
      { label: hospitalPortalLabel, id: 'hospital' },
      { label: patientPlanLabel, id: 'myPlan' },
      { label: t.nav.nurseSignoff, id: 'nurse' },
      { label: t.nav.upload, id: 'upload' },
      { label: t.nav.review, id: 'review' },
      { label: t.nav.analytics, id: 'analytics' },
      { label: t.nav.home, id: 'home' },
    ];
  }

  const handleItemClick = (id: string) => {
    setMobileMenuOpen(false);
    onNavClick(id);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FFFDF9]/95 backdrop-blur-md border-b border-[#EAE5DB] transition-shadow shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4 lg:gap-6">
          
          {/* Zone 1: Brand Wordmark & Icon */}
          <button
            type="button"
            onClick={() => handleItemClick('home')}
            className="flex items-center gap-3 shrink-0 group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-lg p-1 text-left"
          >
            <img
              src="/assets/logo.svg"
              alt="Going Home Right Logo"
              className="h-10 sm:h-12 w-auto object-contain transition-transform group-hover:scale-[1.02]"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="sr-only">Going Home Right</span>
          </button>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden xl:flex items-center gap-3 2xl:gap-5 text-[13.5px] font-medium text-[#3E4554]">
            {navItems.map((item) => {
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item.id)}
                  className={`relative py-1 tracking-tight transition-colors whitespace-nowrap hover:text-[#1E6F5C] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded cursor-pointer ${
                    isActive ? 'text-[#1E6F5C] font-bold' : 'text-[#4A5261] font-medium'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1E6F5C] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Role Authenticated User Badge & Language & Actions */}
          <div className="hidden sm:flex items-center gap-2.5 shrink-0">
            
            {/* User Session Status */}
            {userRoleType === 'hospital' && currentUser ? (
              <div className="flex items-center gap-2 bg-[#EEF2F6] border border-[#D5DEE8] rounded-xl px-2.5 py-1.5">
                <div className="w-6 h-6 rounded-full bg-[#203248] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  <Stethoscope className="w-3.5 h-3.5" />
                </div>
                <div className="text-left text-xs leading-tight">
                  <div className="font-bold text-[#192637] truncate max-w-[120px]">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-[#2F4765] font-mono">
                    {currentUser.staff_id || 'Staff'}
                  </div>
                </div>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-white cursor-pointer ml-1"
                    title="Switch Account / Logout"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : userRoleType === 'patient' && currentUser ? (
              <div className="flex items-center gap-2 bg-[#EBF3EF] border border-[#CDE1D6] rounded-xl px-2.5 py-1.5">
                <div className="w-6 h-6 rounded-full bg-[#1E6F5C] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  <Pill className="w-3.5 h-3.5" />
                </div>
                <div className="text-left text-xs leading-tight">
                  <div className="font-bold text-[#14473B] truncate max-w-[120px]">
                    {currentUser.patient_name || 'Patient'}
                  </div>
                  <div className="text-[10px] text-[#1D6C5A] font-mono">
                    {currentUser.access_id}
                  </div>
                </div>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-white cursor-pointer ml-1"
                    title="Logout / Switch Account"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleItemClick('login')}
                className="px-3.5 py-2 text-xs font-bold text-[#1B6151] bg-[#EAF2ED] hover:bg-[#DEEBE3] border border-[#CCDED3] rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Lock className="w-3.5 h-3.5 text-[#1B6151]" />
                <span>{t.portalSwitcher?.btnSignIn || 'Login Portal'}</span>
              </button>
            )}

            {/* Language Dropdown */}
            <LanguageDropdown
              currentLang={lang}
              onSelectLanguage={onSelectLang}
            />

            {/* Quick API Docs Link */}
            <a
              href="/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-400 hover:text-[#242A35] rounded-lg hover:bg-[#F2ECE1] transition-colors"
              title="OpenAPI / Swagger Documentation"
            >
              <FileText className="w-4 h-4" />
            </a>
          </div>

          {/* Mobile Menu & Language Dropdown */}
          <div className="flex xl:hidden items-center gap-2">
            <LanguageDropdown
              currentLang={lang}
              onSelectLanguage={onSelectLang}
            />

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-700 hover:text-[#1E6F5C] hover:bg-[#F2ECE1] cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-[#EAE5DB] bg-[#FFFDF9] px-4 pt-3 pb-6 shadow-xl animate-in fade-in slide-in-from-top-2">
          
          {/* User Status Bar in Mobile */}
          <div className="mb-3 pb-3 border-b border-slate-100 flex items-center justify-between">
            {userRoleType === 'hospital' && currentUser ? (
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                  <Stethoscope className="w-4 h-4" />
                </span>
                <div className="text-xs">
                  <p className="font-bold text-indigo-900">{currentUser.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{currentUser.staff_id}</p>
                </div>
              </div>
            ) : userRoleType === 'patient' && currentUser ? (
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                  <Pill className="w-4 h-4" />
                </span>
                <div className="text-xs">
                  <p className="font-bold text-emerald-900">{currentUser.patient_name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{currentUser.access_id}</p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleItemClick('login')}
                className="w-full py-2.5 px-3 bg-emerald-600 text-white rounded-xl text-xs font-bold text-center"
              >
                🔐 {t.portalSwitcher?.btnSignIn || 'Sign In (Hospital Staff or Patient)'}
              </button>
            )}

            {userRoleType !== 'guest' && onLogout && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="text-xs text-rose-600 font-semibold p-1.5"
              >
                {t.portalSwitcher?.btnLogout || 'Logout'}
              </button>
            )}
          </div>

          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item.id)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeNav === item.id
                    ? 'bg-emerald-50 text-emerald-800 font-bold'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-emerald-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => handleItemClick('login')}
              className="w-full py-2.5 px-4 text-center text-xs font-bold text-slate-700 bg-slate-100 rounded-lg"
            >
              {t.portalSwitcher?.dualAccess || 'Switch Portal (Hospital / Patient)'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

