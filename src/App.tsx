/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DOCTORS_DATA } from './data/doctors';
import { Doctor } from './types';
import { Language, loadLanguageDictionary, applyLanguageFontAndDirection, translations } from './i18n';
import { api, DischargePlan } from './api';

// Components
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { UploadPage } from './components/UploadPage';
import { ReviewPage } from './components/ReviewPage';
import { MyPlanPage } from './components/MyPlanPage';
import { PatientChecklistPage } from './components/PatientChecklistPage';
import { HospitalPortal } from './components/HospitalPortal';
import { LoginPage } from './components/LoginPage';
import { NurseSignoffPage } from './components/NurseSignoffPage';
import { AnalyticsPage } from './components/AnalyticsPage';
import { DoctorsSection } from './components/DoctorsSection';
import { SolutionsSection } from './components/SolutionsSection';
import { ConnectSection } from './components/ConnectSection';
import { AboutSection } from './components/AboutSection';
import { Footer } from './components/Footer';

// Modals
import { JoinModal } from './components/JoinModal';
import { CallModal } from './components/CallModal';
import { MailModal } from './components/MailModal';
import { AskWhatsAppModal } from './components/AskWhatsAppModal';
import { MessageSquare } from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ghr_user_language') as Language;
      if (saved) return saved;
    }
    return 'en';
  });
  const [activeNav, setActiveNav] = useState<string>('home');
  const [discharge, setDischarge] = useState<DischargePlan | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor>(DOCTORS_DATA[0]);

  // Auth & Role State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRoleType, setUserRoleType] = useState<'hospital' | 'patient' | 'guest'>('guest');
  const [demoMode, setDemoMode] = useState<boolean>(true);

  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [mailModalOpen, setMailModalOpen] = useState(false);
  const [globalWhatsAppOpen, setGlobalWhatsAppOpen] = useState(false);

  // Active translations for selected language (with instant fallback proxy)
  const t = translations[lang];

  // Load initial discharge plan (Sample 1 seeded in DB) on start
  const loadInitialDischarge = async (targetId?: string) => {
    try {
      const list = await api.getDischarges();
      if (list && list.length > 0) {
        const idToLoad = targetId || list[0].id;
        const fullPlan = await api.getDischarge(idToLoad);
        setDischarge(fullPlan);
      }
    } catch (err) {
      console.warn('Initial discharge fetch notice:', err);
    }
  };

  const handleSelectLang = async (newLang: Language) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ghr_user_language', newLang);
    }
    await loadLanguageDictionary(newLang);
    applyLanguageFontAndDirection(newLang);
    setLang(newLang);
    try {
      await api.savePreferredLanguage(newLang, discharge?.patient_id || 'pat_sita_devi');
    } catch (err) {
      console.warn('Could not sync preferred language to server:', err);
    }
  };

  useEffect(() => {
    loadLanguageDictionary(lang).then(() => {
      applyLanguageFontAndDirection(lang);
    });

    // Check system config (demo mode)
    api.getConfig().then((cfg) => {
      if (typeof cfg?.demoMode === 'boolean') {
        setDemoMode(cfg.demoMode);
      }
    }).catch(() => {});

    if (typeof window !== 'undefined' && !localStorage.getItem('ghr_user_language')) {
      api.getPreferredLanguage('pat_sita_devi').then((serverLang) => {
        if (serverLang && serverLang !== 'en') {
          handleSelectLang(serverLang as Language);
        }
      }).catch(() => {});
    }

    // Check existing session
    api.getCurrentSession().then((session) => {
      if (session && session.roleType && session.roleType !== 'guest') {
        setUserRoleType(session.roleType);
        setCurrentUser(session.user);
        if (session.dischargeId) {
          loadInitialDischarge(session.dischargeId);
        } else {
          loadInitialDischarge();
        }
      } else {
        loadInitialDischarge();
      }
    }).catch(() => {
      loadInitialDischarge();
    });
  }, []);

  const handleToggleLang = () => {
    handleSelectLang(lang === 'en' ? 'hi' : 'en');
  };

  const handleNavClick = (navId: string) => {
    setActiveNav(navId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDemoLogin = async (role: 'family' | 'nurse' | 'admin') => {
    try {
      const res = await api.loginAsDemoRole(role);
      setUserRoleType(res.roleType);
      setCurrentUser(res.user);
      if (res.dischargeId) {
        await loadInitialDischarge(res.dischargeId);
      } else {
        await loadInitialDischarge();
      }
      if (role === 'family') {
        setActiveNav('myPlan');
      } else if (role === 'nurse') {
        setActiveNav('nurse');
      } else {
        setActiveNav('hospital');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Demo login error:', err);
    }
  };

  const handleLoginSuccess = (roleType: 'hospital' | 'patient', user: any, dischargeId?: string) => {
    setUserRoleType(roleType);
    setCurrentUser(user);
    if (dischargeId) {
      loadInitialDischarge(dischargeId);
    }
    if (roleType === 'patient') {
      setActiveNav('myPlan');
    } else {
      setActiveNav('hospital');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    await api.logout();
    setUserRoleType('guest');
    setCurrentUser(null);
    setActiveNav(demoMode ? 'home' : 'login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUploadSuccess = async (dischargeId: string) => {
    await loadInitialDischarge(dischargeId);
    setActiveNav('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDoctorSelect = (doc: Doctor) => {
    setSelectedDoctor(doc);
    setActiveNav('contact');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#242A35] flex flex-col font-sans selection:bg-[#E2ECE7] selection:text-[#184E40]">
      
      {/* Top Navbar with Logo, Navigation, Role Session Badge, 28-Language Dropdown */}
      <Header
        lang={lang}
        onSelectLang={handleSelectLang}
        onToggleLang={handleToggleLang}
        activeNav={activeNav}
        onNavClick={handleNavClick}
        onOpenJoinModal={() => setJoinModalOpen(true)}
        currentUser={currentUser}
        userRoleType={userRoleType}
        onLogout={handleLogout}
      />

      {/* Main Content Router */}
      <main className="flex-grow">
        
        {/* VIEW: LOGIN PORTAL (Hospital Staff vs Patient with Hospital-Issued ID) */}
        {activeNav === 'login' && (
          <LoginPage
            lang={lang}
            onLoginSuccess={handleLoginSuccess}
            initialTab={userRoleType === 'hospital' ? 'hospital' : 'patient'}
            demoMode={demoMode}
            onDemoLogin={handleDemoLogin}
          />
        )}

        {/* VIEW: HOSPITAL PORTAL (Upload & Prescribe, Issued IDs, Doctor Tools) */}
        {activeNav === 'hospital' && (
          <HospitalPortal
            lang={lang}
            staffUser={currentUser?.roleType === 'hospital' ? currentUser : {
              id: 'hosp_staff_1',
              staff_id: 'HOSP-DOC-101',
              name: 'Dr. Anya Sen, MD',
              email: 'anya.sen@aiims.edu',
              role: 'doctor',
              roleType: 'hospital',
              hospital_name: 'AIIMS New Delhi Cardio-Care',
              department: 'Department of Cardiology'
            }}
            onViewPatientChecklist={(dId) => {
              loadInitialDischarge(dId);
              setActiveNav('myPlan');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateToNurse={() => handleNavClick('nurse')}
            onNavigateToUpload={() => handleNavClick('upload')}
          />
        )}

        {/* VIEW 1: HOME */}
        {activeNav === 'home' && (
          <div>
            <Hero
              lang={lang}
              helpdeskNumber={discharge?.helpdesk_number || '1800-000-0000'}
              onNavigateToUpload={() => handleNavClick('upload')}
              onOpenCallModal={() => setCallModalOpen(true)}
              onOpenMailModal={() => setMailModalOpen(true)}
              onNavigateToPlan={() => handleNavClick('myPlan')}
              onNavigateToNurse={() => handleNavClick('nurse')}
            />

            {/* DEMO MODE: THREE BIG BUTTONS & SYNTHETIC DATA BANNER */}
            {demoMode ? (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 mb-8 relative z-20">
                <div className="bg-[#FFFDF9] rounded-3xl border-2 border-[#1E6F5C]/35 p-6 sm:p-7 shadow-lg shadow-emerald-950/5">
                  
                  {/* Mandatory Visible Banner */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs sm:text-sm font-semibold mb-6">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl shrink-0">⚠️</span>
                      <span>{t.demoMode?.bannerNotice || 'Demo with synthetic data. Do not enter real patient information.'}</span>
                    </div>
                    <span className="text-[11px] font-mono text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg shrink-0">
                      {t.demoMode?.bannerBadge || 'Zero Login Required'}
                    </span>
                  </div>

                  <div className="text-center mb-5">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1E6F5C]">
                      {t.demoMode?.evalAccess || 'Instant Hackathon Evaluation Access'}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[#242A35] mt-1">
                      {t.demoMode?.chooseRole || 'Choose a Role to Explore the End-to-End System'}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#5A6270] mt-1 max-w-xl mx-auto">
                      {t.demoMode?.roleDesc || 'Click any role below to sign in instantly with seeded synthetic medical data. No password or sign-up needed.'}
                    </p>
                  </div>

                  {/* 3 Big Buttons */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 1. Try as Family */}
                    <button
                      type="button"
                      onClick={() => handleDemoLogin('family')}
                      className="p-5 rounded-2xl bg-[#EAF2ED] hover:bg-[#DDECE2] border border-[#CDE1D6] text-left transition-all group cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="w-12 h-12 rounded-xl bg-[#1E6F5C] text-white flex items-center justify-center font-bold text-2xl group-hover:scale-105 transition-transform shadow-xs">
                            👨‍👩‍👧
                          </span>
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase bg-emerald-100 text-[#14473B]">
                            {t.demoMode?.familyRole || 'Patient & Family'}
                          </span>
                        </div>
                        <div className="font-extrabold text-base sm:text-lg text-[#1B6151]">
                          {t.demoMode?.familyTitle || 'Try as Family'}
                        </div>
                        <p className="text-xs text-[#5A6270] mt-1.5 leading-relaxed">
                          {t.demoMode?.familyDesc || "Follow patient Sita Devi's daily medicine schedule (Subah/Dopahar/Raat), log doses, review dietary rules, and test emergency SOS."}
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-[#CDE1D6] flex items-center justify-between text-xs font-bold text-[#1E6F5C]">
                        <span>{t.demoMode?.familyBtn || 'Enter Patient View'}</span>
                        <span>→</span>
                      </div>
                    </button>

                    {/* 2. Try as Nurse */}
                    <button
                      type="button"
                      onClick={() => handleDemoLogin('nurse')}
                      className="p-5 rounded-2xl bg-[#EEF2F6] hover:bg-[#E3EAF2] border border-[#D5DEE8] text-left transition-all group cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="w-12 h-12 rounded-xl bg-[#244265] text-white flex items-center justify-center font-bold text-2xl group-hover:scale-105 transition-transform shadow-xs">
                            👩‍⚕️
                          </span>
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase bg-blue-100 text-[#203248]">
                            {t.demoMode?.nurseRole || 'Clinical Verification'}
                          </span>
                        </div>
                        <div className="font-extrabold text-base sm:text-lg text-[#203248]">
                          {t.demoMode?.nurseTitle || 'Try as Nurse'}
                        </div>
                        <p className="text-xs text-[#5A6270] mt-1.5 leading-relaxed">
                          {t.demoMode?.nurseDesc || 'Sister Priya Sharma, RN: Clinical safety gatekeeper. Resolve amber "Needs nurse check" flags on Ecosprin, confirm morning timing, and approve.'}
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-[#D5DEE8] flex items-center justify-between text-xs font-bold text-[#244265]">
                        <span>{t.demoMode?.nurseBtn || 'Enter Nurse Queue'}</span>
                        <span>→</span>
                      </div>
                    </button>

                    {/* 3. Try as Hospital Admin */}
                    <button
                      type="button"
                      onClick={() => handleDemoLogin('admin')}
                      className="p-5 rounded-2xl bg-[#F6EFE9] hover:bg-[#EFE4D9] border border-[#E8DACB] text-left transition-all group cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="w-12 h-12 rounded-xl bg-[#7C4A2D] text-white flex items-center justify-center font-bold text-2xl group-hover:scale-105 transition-transform shadow-xs">
                            🏥
                          </span>
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase bg-amber-100 text-[#5C331B]">
                            {t.demoMode?.adminRole || 'Hospital Admin'}
                          </span>
                        </div>
                        <div className="font-extrabold text-base sm:text-lg text-[#5C331B]">
                          {t.demoMode?.adminTitle || 'Try as Hospital Admin'}
                        </div>
                        <p className="text-xs text-[#5A6270] mt-1.5 leading-relaxed">
                          {t.demoMode?.adminDesc || 'Dr. V. Raman: Configure verified reception desk contacts, inspect FHIR records, verify WhatsApp desk, and access the "Reset Demo Data" button.'}
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-[#E8DACB] flex items-center justify-between text-xs font-bold text-[#7C4A2D]">
                        <span>{t.demoMode?.adminBtn || 'Enter Admin Portal'}</span>
                        <span>→</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Normal Portal Switcher Banner when DEMO_MODE is false */
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20">
                <div className="bg-[#FFFDF9] rounded-3xl border border-[#EAE5DB] p-5 sm:p-6 shadow-md shadow-stone-200/50 flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1E6F5C] to-[#288470] text-white font-bold flex items-center justify-center text-base shadow-sm shrink-0">
                      {userRoleType === 'hospital' ? '🏥' : '👤'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-[#EAF2ED] text-[#1B6151] border border-[#D5E5DC]">
                          {userRoleType === 'hospital' ? (t.portalSwitcher?.hospitalPortalTitle || 'Hospital Medical Portal') : userRoleType === 'patient' ? (t.portalSwitcher?.patientPortalTitle || 'Patient Care Portal') : (t.portalSwitcher?.dualAccess || 'Dual Access Security')}
                        </span>
                        {userRoleType === 'patient' && currentUser && (
                          <span className="text-xs font-mono font-bold text-[#5A6270]">
                            {t.portalSwitcher?.idLabel || 'ID'}: {currentUser.access_id}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-extrabold text-[#242A35] mt-0.5">
                        {userRoleType === 'hospital' && currentUser
                          ? `${t.portalSwitcher?.loggedIn || 'Logged in'}: ${currentUser.name} (${currentUser.hospital_name})`
                          : userRoleType === 'patient' && currentUser
                          ? `${t.portalSwitcher?.loggedIn || 'Logged in'}: ${currentUser.patient_name} · ${currentUser.hospital_name}`
                          : (t.portalSwitcher?.dualAccess || 'Hospital & Patient Security Access Portal')}
                      </h3>
                      <p className="text-xs text-[#5A6270] leading-relaxed">
                        {t.portalSwitcher?.subtitle || 'Hospital staff upload doctor prescriptions and issue patient access IDs; patients follow their verified daily medicine checklists.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleNavClick('hospital')}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#203248] bg-[#EEF2F6] hover:bg-[#E5ECF3] border border-[#D5DEE8] transition-all cursor-pointer shadow-sm"
                    >
                      {t.portalSwitcher?.btnHospital || '🏥 Hospital Staff Portal'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavClick('myPlan')}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#1E6F5C] hover:bg-[#18594A] transition-all shadow-sm cursor-pointer"
                    >
                      {t.portalSwitcher?.btnPatient || '💊 Patient Medicine Checklist'}
                    </button>
                    {userRoleType === 'guest' && (
                      <button
                        type="button"
                        onClick={() => handleNavClick('login')}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#424A58] bg-[#F2EFE8] hover:bg-[#E8E4DA] border border-[#DFDACF] transition-all cursor-pointer"
                      >
                        {t.portalSwitcher?.btnSignIn || 'Sign In / Login'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Solutions 4-Step Flow */}
            <SolutionsSection
              lang={lang}
              onNavigateToUpload={() => handleNavClick('upload')}
              onNavigateToNurse={() => handleNavClick('nurse')}
              onNavigateToPlan={() => handleNavClick('myPlan')}
            />

            {/* Verified Doctors Section */}
            <DoctorsSection
              doctors={DOCTORS_DATA}
              selectedDoctor={selectedDoctor}
              onSelectDoctor={handleDoctorSelect}
              lang={lang}
            />

            {/* Connect Section */}
            <ConnectSection
              selectedDoctor={selectedDoctor}
              allDoctors={DOCTORS_DATA}
              onSelectDoctor={(doc) => setSelectedDoctor(doc)}
              lang={lang}
            />

            {/* About Us (Team HealthNova) */}
            <AboutSection lang={lang} />
          </div>
        )}

        {/* VIEW 2: UPLOAD (Discharge Summary Ingestion) */}
        {activeNav === 'upload' && (
          <UploadPage
            lang={lang}
            onUploadSuccess={handleUploadSuccess}
          />
        )}

        {/* VIEW 3: REVIEW (Extracted Clinical Sheet) */}
        {activeNav === 'review' && (
          <ReviewPage
            lang={lang}
            discharge={discharge}
            onNavigateToPlan={() => handleNavClick('myPlan')}
            onNavigateToNurse={() => handleNavClick('nurse')}
          />
        )}

        {/* VIEW 4: MY PLAN / PATIENT MEDICINE CHECKLIST */}
        {activeNav === 'myPlan' && (
          <PatientChecklistPage
            lang={lang}
            dischargeId={discharge?.id || 'dis_sample_1'}
            onNavigateToHospitalPortal={() => handleNavClick('hospital')}
            onOpenCallModal={() => setCallModalOpen(true)}
          />
        )}

        {/* VIEW 5: NURSE SIGN-OFF */}
        {activeNav === 'nurse' && (
          <NurseSignoffPage
            lang={lang}
            activeDischargeId={discharge?.id}
            onItemApproved={() => loadInitialDischarge(discharge?.id)}
          />
        )}

        {/* VIEW 6: ANALYTICS */}
        {activeNav === 'analytics' && (
          <AnalyticsPage lang={lang} />
        )}

        {/* VIEW 7: DOCTORS */}
        {activeNav === 'doctors' && (
          <div className="py-8">
            <DoctorsSection
              doctors={DOCTORS_DATA}
              selectedDoctor={selectedDoctor}
              onSelectDoctor={handleDoctorSelect}
              lang={lang}
            />
          </div>
        )}

        {/* VIEW 8: SOLUTIONS */}
        {activeNav === 'solutions' && (
          <SolutionsSection
            lang={lang}
            onNavigateToUpload={() => handleNavClick('upload')}
            onNavigateToNurse={() => handleNavClick('nurse')}
            onNavigateToPlan={() => handleNavClick('myPlan')}
          />
        )}

        {/* VIEW 9: CONTACT */}
        {activeNav === 'contact' && (
          <div className="py-8">
            <ConnectSection
              selectedDoctor={selectedDoctor}
              allDoctors={DOCTORS_DATA}
              onSelectDoctor={(doc) => setSelectedDoctor(doc)}
              lang={lang}
            />
          </div>
        )}

        {/* VIEW 10: ABOUT */}
        {activeNav === 'about' && (
          <AboutSection lang={lang} />
        )}

      </main>

      {/* Footer */}
      <Footer
        lang={lang}
        activeDischargeId={discharge?.id || 'dis_sample_1'}
        onOpenCallModal={() => setCallModalOpen(true)}
        onOpenMailModal={() => setMailModalOpen(true)}
      />

      {/* Modals */}
      <JoinModal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        lang={lang}
      />

      <CallModal
        isOpen={callModalOpen}
        onClose={() => setCallModalOpen(false)}
        lang={lang}
      />

      <MailModal
        isOpen={mailModalOpen}
        onClose={() => setMailModalOpen(false)}
        lang={lang}
      />

      {/* FEATURE 2: Universal Floating WhatsApp Button at Bottom-Left for Patient & Caregiver Screens */}
      {(activeNav === 'review' || (userRoleType === 'patient' && activeNav !== 'myPlan' && activeNav !== 'hospital')) && (
        <div className="fixed bottom-6 left-6 z-40 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pointer-events-auto">
          <button
            type="button"
            onClick={() => setGlobalWhatsAppOpen(true)}
            aria-label="WhatsApp Reception"
            className="min-h-[48px] min-w-[48px] px-3.5 sm:px-4 py-3 rounded-2xl bg-[#25D366] hover:bg-[#20BA5A] active:bg-[#1CA04D] text-white font-bold text-xs sm:text-sm shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/20 focus:outline-none focus:ring-4 focus:ring-emerald-400/40"
            title="WhatsApp Reception"
          >
            <MessageSquare className="w-5 h-5 fill-current shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap font-bold">WhatsApp Reception</span>
          </button>
        </div>
      )}

      <AskWhatsAppModal
        isOpen={globalWhatsAppOpen}
        onClose={() => setGlobalWhatsAppOpen(false)}
        lang={lang}
        dischargeId={discharge?.id || 'dis_sample_1'}
        patientName={discharge?.patient_name}
        medicineList={discharge?.medicines.map((m) => `${m.name} (${m.frequency_code || 'Daily'})`)}
      />

    </div>
  );
}
