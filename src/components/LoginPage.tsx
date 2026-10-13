import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  UserCheck, 
  ShieldCheck, 
  KeyRound, 
  Stethoscope, 
  Pill, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  Lock, 
  Copy, 
  Check, 
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { api, HospitalStaffUser, PatientUser, PatientCredentialItem } from '../api';
import { Language, translations } from '../i18n';
import { getReceptionCall } from '../config/reception';

interface LoginPageProps {
  lang: Language;
  onLoginSuccess: (roleType: 'hospital' | 'patient', user: any, dischargeId?: string) => void;
  initialTab?: 'hospital' | 'patient';
  demoMode?: boolean;
  onDemoLogin?: (role: 'family' | 'nurse' | 'admin') => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  lang,
  onLoginSuccess,
  initialTab = 'patient',
  demoMode = true,
  onDemoLogin,
}) => {
  const [activeTab, setActiveTab] = useState<'patient' | 'hospital'>(initialTab);
  const t = translations[lang];

  // Patient Login Form State
  const [patientAccessId, setPatientAccessId] = useState('');
  const [patientPin, setPatientPin] = useState('');
  const [patientError, setPatientError] = useState<string | null>(null);
  const [patientLoading, setPatientLoading] = useState(false);

  // Hospital Login Form State
  const [staffIdOrEmail, setStaffIdOrEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [hospitalError, setHospitalError] = useState<string | null>(null);
  const [hospitalLoading, setHospitalLoading] = useState(false);

  // Available staff and sample patient credentials for convenient testing
  const [sampleCredentials, setSampleCredentials] = useState<PatientCredentialItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    // Load hospital-issued patient IDs for test assistance
    api.getHospitalPatientCredentials()
      .then((creds) => setSampleCredentials(creds))
      .catch(() => {});
  }, []);

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPatientError(null);
    if (!patientAccessId.trim() || !patientPin.trim()) {
      setPatientError('Please provide both your Hospital-Issued Patient Access ID and 4-digit PIN.');
      return;
    }

    setPatientLoading(true);
    try {
      const res = await api.patientLogin(patientAccessId.trim(), patientPin.trim());
      onLoginSuccess('patient', res.user, res.dischargeId);
    } catch (err: any) {
      setPatientError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setPatientLoading(false);
    }
  };

  const handleHospitalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHospitalError(null);
    if (!staffIdOrEmail.trim() || !staffPassword.trim()) {
      setHospitalError('Please enter your Staff ID or Official Email and Password.');
      return;
    }

    setHospitalLoading(true);
    try {
      const res = await api.hospitalLogin(staffIdOrEmail.trim(), staffPassword.trim());
      onLoginSuccess('hospital', res.user);
    } catch (err: any) {
      setHospitalError(err.message || 'Hospital login failed. Verify staff credentials.');
    } finally {
      setHospitalLoading(false);
    }
  };

  const fillQuickStaff = (idOrEmail: string, pass: string) => {
    setStaffIdOrEmail(idOrEmail);
    setStaffPassword(pass);
    setHospitalError(null);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-gradient-to-b from-[#FAF7F2] via-[#F6F3EC] to-[#EFEBE2] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-3xl mx-auto w-full">
        
        {/* Top Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EAF2ED] text-[#1B6151] border border-[#CFE2D7] text-xs font-semibold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-4 h-4 text-[#1E6F5C]" />
            {t.loginPage?.securityBadge || 'Hospital Clinical Security Gateway'}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#242A35] tracking-tight">
            {t.loginPage?.portalTitle || t.appName || 'Going Home Right Portal'}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[#5A6270] max-w-xl mx-auto leading-relaxed">
            {t.loginPage?.portalSubtitle || t.portalSwitcher?.subtitle || 'Choose your access portal. Hospital staff upload and verify prescriptions; patients access their personalized daily medicine checklists with hospital-issued credentials.'}
          </p>
        </div>

        {/* 1. DEMO MODE 3 BIG BUTTONS & BANNER */}
        {demoMode && onDemoLogin && (
          <div className="mb-8 p-6 bg-[#FFFDF9] rounded-3xl border-2 border-[#1E6F5C]/30 shadow-md shadow-stone-200/50">
            {/* Visible Demo Banner */}
            <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs sm:text-sm font-semibold mb-5">
              <span className="text-lg shrink-0">⚠️</span>
              <span>{t.demoMode?.bannerNotice || 'Demo with synthetic data. Do not enter real patient information.'}</span>
            </div>

            <div className="text-center mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1E6F5C]">
                {t.demoMode?.evalAccess || 'Instant Hackathon Evaluation Access'}
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#242A35] mt-0.5">
                {t.demoMode?.chooseRole || 'Try Any Role with 1-Click (No Password Required)'}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* 1. Try as Family */}
              <button
                type="button"
                onClick={() => onDemoLogin('family')}
                className="p-4 rounded-2xl bg-[#EAF2ED] hover:bg-[#DDECE2] border border-[#CDE1D6] text-left transition-all group cursor-pointer shadow-xs"
              >
                <div className="w-10 h-10 rounded-xl bg-[#1E6F5C] text-white flex items-center justify-center font-bold text-lg mb-2.5 group-hover:scale-105 transition-transform shadow-xs">
                  👨‍👩‍👧
                </div>
                <div className="font-extrabold text-sm sm:text-base text-[#1B6151]">
                  {t.demoMode?.familyTitle || 'Try as Family'}
                </div>
                <p className="text-xs text-[#5A6270] mt-1 leading-snug">
                  {t.demoMode?.familyDesc || 'Patient & Caregiver view (Sita Devi), daily dose checklist, SOS emergency instructions.'}
                </p>
              </button>

              {/* 2. Try as Nurse */}
              <button
                type="button"
                onClick={() => onDemoLogin('nurse')}
                className="p-4 rounded-2xl bg-[#EEF2F6] hover:bg-[#E3EAF2] border border-[#D5DEE8] text-left transition-all group cursor-pointer shadow-xs"
              >
                <div className="w-10 h-10 rounded-xl bg-[#244265] text-white flex items-center justify-center font-bold text-lg mb-2.5 group-hover:scale-105 transition-transform shadow-xs">
                  👩‍⚕️
                </div>
                <div className="font-extrabold text-sm sm:text-base text-[#203248]">
                  {t.demoMode?.nurseTitle || 'Try as Nurse'}
                </div>
                <p className="text-xs text-[#5A6270] mt-1 leading-snug">
                  {t.demoMode?.nurseDesc || 'Sister Priya Sharma, RN: sign-off on flagged Ecosprin, verify timings, issue Patient ID.'}
                </p>
              </button>

              {/* 3. Try as Hospital Admin */}
              <button
                type="button"
                onClick={() => onDemoLogin('admin')}
                className="p-4 rounded-2xl bg-[#F6EFE9] hover:bg-[#EFE4D9] border border-[#E8DACB] text-left transition-all group cursor-pointer shadow-xs"
              >
                <div className="w-10 h-10 rounded-xl bg-[#7C4A2D] text-white flex items-center justify-center font-bold text-lg mb-2.5 group-hover:scale-105 transition-transform shadow-xs">
                  🏥
                </div>
                <div className="font-extrabold text-sm sm:text-base text-[#5C331B]">
                  {t.demoMode?.adminTitle || 'Try as Hospital Admin'}
                </div>
                <p className="text-xs text-[#5A6270] mt-1 leading-snug">
                  {t.demoMode?.adminDesc || 'Dr. V. Raman: hospital settings, WhatsApp reception verification, reset demo data.'}
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Portal Switcher Tabs */}
        <div className="bg-[#FFFDF9] rounded-3xl shadow-md shadow-stone-200/50 border border-[#EAE5DB] overflow-hidden">
          <div className="grid grid-cols-2 p-2 bg-[#F3EDE3] border-b border-[#E4DDD0] gap-2">
            
            {/* Tab 1: Log in as Patient */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('patient');
                setPatientError(null);
              }}
              className={`flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl text-sm sm:text-base font-bold transition-all cursor-pointer ${
                activeTab === 'patient'
                  ? 'bg-[#FFFDF9] text-[#1B6151] shadow-xs ring-1 ring-[#1E6F5C]/25'
                  : 'text-[#5A6270] hover:text-[#242A35] hover:bg-white/40'
              }`}
            >
              <Pill className={`w-5 h-5 ${activeTab === 'patient' ? 'text-[#1E6F5C]' : 'text-[#8E95A2]'}`} />
              <span>{t.portalSwitcher?.patientPortalTitle || 'Log in as Patient'}</span>
            </button>

            {/* Tab 2: Log in as Hospital */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('hospital');
                setHospitalError(null);
              }}
              className={`flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl text-sm sm:text-base font-bold transition-all cursor-pointer ${
                activeTab === 'hospital'
                  ? 'bg-[#FFFDF9] text-[#203957] shadow-xs ring-1 ring-[#203957]/25'
                  : 'text-[#5A6270] hover:text-[#242A35] hover:bg-white/40'
              }`}
            >
              <Building2 className={`w-5 h-5 ${activeTab === 'hospital' ? 'text-[#244265]' : 'text-[#8E95A2]'}`} />
              <span>{t.portalSwitcher?.hospitalPortalTitle || 'Log in as Hospital'}</span>
            </button>
          </div>

          <div className="p-6 sm:p-10">
            {/* VIEW A: PATIENT LOGIN */}
            {activeTab === 'patient' && (
              <div>
                {/* Security Protocol Banner */}
                <div className="mb-6 bg-[#EEF5F1] border border-[#CFE2D7] rounded-2xl p-4.5 flex items-start gap-3.5">
                  <div className="p-2 bg-[#DDEEE4] rounded-xl text-[#1E6F5C] shrink-0 mt-0.5">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="text-xs sm:text-sm text-[#14473B]">
                    <p className="font-bold text-[#14473B] mb-0.5">
                      {t.loginPage?.securityTitle || 'Strict Hospital Security Requirement'}
                    </p>
                    <p className="text-[#1A5C4D] leading-relaxed">
                      {t.loginPage?.securityNotice || 'Patient accounts can only be generated by authorized hospital staff upon medical discharge. Self-registration is disabled to protect prescription integrity. Your Patient Access ID and 4-digit PIN are printed on your official Hospital Discharge Summary.'}
                    </p>
                  </div>
                </div>

                {patientError && (
                  <div className="mb-6 p-4 rounded-2xl bg-[#FDF0EE] border border-[#F6CBC5] text-[#8C281F] flex items-start gap-3 text-xs sm:text-sm">
                    <AlertCircle className="w-5 h-5 text-[#C93B2F] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Access Verification Denied</p>
                      <p className="mt-0.5">{patientError}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handlePatientSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-[#242A35] mb-1.5">
                      {t.loginPage?.patientIdLabel || 'Hospital-Issued Patient Access ID'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8E95A2]">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        value={patientAccessId}
                        onChange={(e) => setPatientAccessId(e.target.value.toUpperCase())}
                        placeholder="e.g. PT-SITA-2026 or PT-2026-8812"
                        className="w-full pl-11 pr-4 py-3 bg-[#F9F7F2] border border-[#DDD7CB] rounded-xl text-[#242A35] font-mono text-sm uppercase tracking-wide focus:bg-[#FFFDF9] focus:outline-none focus:ring-2 focus:ring-[#1E6F5C] focus:border-[#1E6F5C] transition-all"
                        required
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[#5A6270]">
                      Format: Provided by the hospital doctor or discharge coordinator.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-[#242A35] mb-1.5">
                      {t.loginPage?.patientPinLabel || 'Discharge Security PIN'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8E95A2]">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type="password"
                        maxLength={6}
                        value={patientPin}
                        onChange={(e) => setPatientPin(e.target.value)}
                        placeholder="••••"
                        className="w-full pl-11 pr-4 py-3 bg-[#F9F7F2] border border-[#DDD7CB] rounded-xl text-[#242A35] font-mono tracking-widest text-base focus:bg-[#FFFDF9] focus:outline-none focus:ring-2 focus:ring-[#1E6F5C] focus:border-[#1E6F5C] transition-all"
                        required
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[#5A6270]">
                      4-digit security code issued on your discharge receipt.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={patientLoading}
                    className="w-full py-3.5 px-6 rounded-xl bg-[#1E6F5C] hover:bg-[#18594A] active:bg-[#14473B] text-white font-bold text-sm sm:text-base shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {patientLoading ? (
                      <span>Verifying Hospital Credentials...</span>
                    ) : (
                      <>
                        <span>{t.loginPage?.patientLoginBtn || "View Doctor's Medicine Checklist"}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Hospital Discharge Patient Access Notice (One-Click Fill Removed) */}
                <div className="mt-8 pt-6 border-t border-[#EAE5DB]">
                  <div className="rounded-2xl bg-[#FAF7F2] border border-[#E5DFD2] p-4.5 flex items-start gap-3.5">
                    <div className="p-2 bg-[#EBE4D5] rounded-xl text-[#5A6270] shrink-0 mt-0.5">
                      <HelpCircle className="w-5 h-5 text-[#5A6270]" />
                    </div>
                    <div className="text-xs text-[#4A5261] space-y-1">
                      <p className="font-bold text-[#242A35]">
                        Where to find your Patient Access ID & PIN
                      </p>
                      <p className="leading-relaxed">
                        Your <strong>Patient Access ID</strong> (e.g. <em>PT-SITA-2026</em>) and <strong>4-digit PIN</strong> are printed on the top-right corner of your official hospital discharge summary or delivered to your registered mobile number via hospital SMS.
                      </p>
                      <p className="text-[11px] text-[#737C8B] pt-0.5">
                        Please type your credentials into the fields above. If you have misplaced your discharge paperwork or PIN, please call your attending hospital helpdesk.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW B: HOSPITAL LOGIN */}
            {activeTab === 'hospital' && (
              <div>
                <div className="mb-6 bg-[#EEF3F8] border border-[#CFDEEC] rounded-2xl p-4.5 flex items-start gap-3.5">
                  <div className="p-2 bg-[#DCE8F3] rounded-xl text-[#244265] shrink-0 mt-0.5">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div className="text-xs sm:text-sm text-[#1A3451]">
                    <p className="font-bold text-[#1A3451] mb-0.5">
                      {t.loginPage?.hospitalLoginTitle || 'Verified Hospital Staff Authorization'}
                    </p>
                    <p className="text-[#25456A] leading-relaxed">
                      Only registered hospital doctors, discharge nurses, and clinical staff can access this portal to <strong>upload doctor prescriptions, specify exact medicine timings, and issue secure Patient Access IDs</strong>.
                    </p>
                  </div>
                </div>

                {hospitalError && (
                  <div className="mb-6 p-4 rounded-2xl bg-[#FDF0EE] border border-[#F6CBC5] text-[#8C281F] flex items-start gap-3 text-xs sm:text-sm">
                    <AlertCircle className="w-5 h-5 text-[#C93B2F] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Hospital Authentication Failed</p>
                      <p className="mt-0.5">{hospitalError}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleHospitalSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-[#242A35] mb-1.5">
                      {t.loginPage?.staffIdLabel || 'Hospital Staff ID or Official Email'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8E95A2]">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        value={staffIdOrEmail}
                        onChange={(e) => setStaffIdOrEmail(e.target.value)}
                        placeholder="e.g. HOSP-DOC-101 or anya.sen@aiims.edu"
                        className="w-full pl-11 pr-4 py-3 bg-[#F9F7F2] border border-[#DDD7CB] rounded-xl text-[#242A35] text-sm focus:bg-[#FFFDF9] focus:outline-none focus:ring-2 focus:ring-[#244265] focus:border-[#244265] transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-[#242A35] mb-1.5">
                      {t.loginPage?.passwordLabel || 'Staff Password / Security Passcode'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8E95A2]">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type="password"
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-11 pr-4 py-3 bg-[#F9F7F2] border border-[#DDD7CB] rounded-xl text-[#242A35] text-sm focus:bg-[#FFFDF9] focus:outline-none focus:ring-2 focus:ring-[#244265] focus:border-[#244265] transition-all"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={hospitalLoading}
                    className="w-full py-3.5 px-6 rounded-xl bg-[#244265] hover:bg-[#1D3653] active:bg-[#16293F] text-white font-bold text-sm sm:text-base shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {hospitalLoading ? (
                      <span>Verifying Staff Credentials...</span>
                    ) : (
                      <>
                        <span>{t.loginPage?.hospitalLoginBtn || 'Enter Hospital Clinical Portal'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Quick Staff Credentials Box for instant evaluation */}
                <div className="mt-8 pt-6 border-t border-[#EAE5DB]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#5A6270] uppercase tracking-wider flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-[#244265]" />
                      {t.loginPage?.demoCredentialsTitle || 'Pre-Verified Hospital Staff Accounts (1-Click Fill)'}
                    </span>
                    <span className="text-[11px] text-[#8E95A2]">Click to fill</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Dr. Anya Sen */}
                    <button
                      type="button"
                      onClick={() => fillQuickStaff('HOSP-DOC-101', 'hospital123')}
                      className="text-left p-3 rounded-xl border border-[#E3DDCF] bg-[#F9F6F0] hover:bg-[#EEF3F8] hover:border-[#CFDEEC] transition-all group cursor-pointer"
                    >
                      <div className="text-xs font-bold text-[#242A35] group-hover:text-[#244265]">
                        Dr. Anya Sen, MD
                      </div>
                      <div className="text-[11px] text-[#5A6270] mt-0.5">
                        Cardiologist · AIIMS
                      </div>
                      <div className="text-[10px] font-mono text-[#8E95A2] mt-1">
                        ID: HOSP-DOC-101
                      </div>
                    </button>

                    {/* Sister Priya Sharma */}
                    <button
                      type="button"
                      onClick={() => fillQuickStaff('HOSP-NURSE-204', 'nurse123')}
                      className="text-left p-3 rounded-xl border border-[#E3DDCF] bg-[#F9F6F0] hover:bg-[#EEF3F8] hover:border-[#CFDEEC] transition-all group cursor-pointer"
                    >
                      <div className="text-xs font-bold text-[#242A35] group-hover:text-[#244265]">
                        Sister Priya, RN
                      </div>
                      <div className="text-[11px] text-[#5A6270] mt-0.5">
                        Discharge Nurse · AIIMS
                      </div>
                      <div className="text-[10px] font-mono text-[#8E95A2] mt-1">
                        ID: HOSP-NURSE-204
                      </div>
                    </button>

                    {/* Dr. Sahil Roy */}
                    <button
                      type="button"
                      onClick={() => fillQuickStaff('HOSP-DOC-102', 'hospital123')}
                      className="text-left p-3 rounded-xl border border-[#E3DDCF] bg-[#F9F6F0] hover:bg-[#EEF3F8] hover:border-[#CFDEEC] transition-all group cursor-pointer"
                    >
                      <div className="text-xs font-bold text-[#242A35] group-hover:text-[#244265]">
                        Dr. Sahil Roy, MD
                      </div>
                      <div className="text-[11px] text-[#5A6270] mt-0.5">
                        Internal Med · Apollo
                      </div>
                      <div className="text-[10px] font-mono text-[#8E95A2] mt-1">
                        ID: HOSP-DOC-102
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Help text */}
        <div className="mt-6 text-center text-xs text-[#5A6270] flex items-center justify-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#8E95A2]" />
          <span>Need hospital discharge desk support? Call 24x7 Helpline: <strong className="text-[#242A35]">{getReceptionCall().formatted}</strong></span>
        </div>

      </div>
    </div>
  );
};
