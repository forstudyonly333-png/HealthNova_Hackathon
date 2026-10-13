import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Phone, 
  MessageSquare, 
  Clock, 
  ExternalLink, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  Lock, 
  History, 
  Sparkles,
  RefreshCw,
  Info,
  Link as LinkIcon,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { api, HospitalContactSettings, HospitalContactItem, HospitalStaffUser } from '../api';
import { Language, translations } from '../i18n';
import { 
  formatWhatsAppNumber, 
  cleanSubscriberDigits, 
  validateReceptionPhone, 
  validateBusinessLink 
} from '../utils/whatsappUtils';
import {
  buildWhatsAppLink,
  getReceptionWhatsApp,
  getReceptionCall,
  validateReceptionNumber,
  RECEPTION_WHATSAPP_NUMBER,
  RECEPTION_CALL_NUMBER,
  HOSPITAL_NAME
} from '../config/reception';

interface HospitalSettingsPageProps {
  lang: Language;
  staffUser: HospitalStaffUser;
  onSettingsSaved?: (newSettings: HospitalContactSettings) => void;
}

const COUNTRY_CODES = [
  { code: '+91', country: 'India (Default)', prefix: '91', expectedDigits: 10 },
  { code: '+1', country: 'USA / Canada', prefix: '1', expectedDigits: 10 },
  { code: '+44', country: 'United Kingdom', prefix: '44', expectedDigits: 10 },
  { code: '+971', country: 'UAE', prefix: '971', expectedDigits: 9 },
  { code: '+65', country: 'Singapore', prefix: '65', expectedDigits: 8 },
  { code: '+61', country: 'Australia', prefix: '61', expectedDigits: 9 },
  { code: '+81', country: 'Japan', prefix: '81', expectedDigits: 10 },
  { code: '+49', country: 'Germany', prefix: '49', expectedDigits: 10 },
];

export const HospitalSettingsPage: React.FC<HospitalSettingsPageProps> = ({
  lang,
  staffUser,
  onSettingsSaved,
}) => {
  const t = translations[lang];

  // Role permissions: Only admin can edit; nurses/doctors view only
  const isAdmin = staffUser.role === 'admin';

  // Form State
  const [hospitalName, setHospitalName] = useState('');
  
  // Primary WhatsApp
  const [primaryCountryCode, setPrimaryCountryCode] = useState('+91');
  const [primaryDigits, setPrimaryDigits] = useState('');
  
  // Backup WhatsApp (optional)
  const [backupCountryCode, setBackupCountryCode] = useState('+91');
  const [backupDigits, setBackupDigits] = useState('');

  // Voice phone number
  const [receptionPhone, setReceptionPhone] = useState('');

  // WhatsApp Business link (optional)
  const [businessLink, setBusinessLink] = useState('');

  // Schedule & Greeting
  const [officeHours, setOfficeHours] = useState('');
  const [greetingLine, setGreetingLine] = useState('');
  const [emergencyText, setEmergencyText] = useState('');

  // Contacts metadata from server
  const [contacts, setContacts] = useState<HospitalContactItem[]>([]);

  // Active Reception WhatsApp Info & Source
  const [whatsappSource, setWhatsappSource] = useState<string>('from config file');
  const [activeNumberInfo, setActiveNumberInfo] = useState<{ number: string; isValid: boolean; error: string | null }>({
    number: RECEPTION_WHATSAPP_NUMBER,
    isValid: true,
    error: null
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [auditTrail, setAuditTrail] = useState<any[]>([]);

  // Verification prompt modal state
  const [verifyingContact, setVerifyingContact] = useState<{
    contactId: string;
    label: string;
    targetUrl: string;
    isOpen: boolean;
    showTips: boolean;
  } | null>(null);

  // Helper to split stored international digits (e.g. "917374029569") into code & subscriber digits
  const parseStoredDigits = (fullNumber: string): { code: string; local: string } => {
    const digitsOnly = formatWhatsAppNumber(fullNumber || '');
    if (!digitsOnly) {
      return { code: '+91', local: '' };
    }
    for (const c of COUNTRY_CODES) {
      if (digitsOnly.startsWith(c.prefix)) {
        return { code: c.code, local: digitsOnly.slice(c.prefix.length) };
      }
    }
    if (digitsOnly.startsWith('91')) {
      return { code: '+91', local: digitsOnly.slice(2) };
    }
    return { code: '+91', local: digitsOnly };
  };

  // Load existing settings and structured contacts from server (GET /api/settings/contact)
  const loadSettings = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.getHospitalContact();
      setHospitalName(data.hospital_name || staffUser.hospital_name || HOSPITAL_NAME);
      setReceptionPhone(data.reception_phone || getReceptionCall().formatted);
      setOfficeHours(data.office_hours || 'Mon - Sat, 08:00 AM - 08:00 PM IST');
      setGreetingLine(data.greeting_line || 'Namaste! Welcome to AIIMS Patient Care Support Desk.');
      setEmergencyText(data.emergency_number_text || '108 / 112 (National Helpline)');
      setBusinessLink(data.business_link || '');

      setWhatsappSource(data.whatsapp_source || (data.primary_whatsapp === RECEPTION_WHATSAPP_NUMBER ? 'from config file' : 'set by admin'));
      const activeDigits = data.active_whatsapp_target || data.primary_whatsapp || RECEPTION_WHATSAPP_NUMBER;
      const val = validateReceptionNumber(activeDigits);
      setActiveNumberInfo({
        number: activeDigits,
        isValid: val.isValid,
        error: val.error
      });

      // Parse Primary WhatsApp
      const parsedPrimary = parseStoredDigits(data.primary_whatsapp || RECEPTION_WHATSAPP_NUMBER);
      setPrimaryCountryCode(parsedPrimary.code);
      setPrimaryDigits(parsedPrimary.local);

      // Parse Backup WhatsApp
      const parsedBackup = parseStoredDigits(data.backup_whatsapp || '');
      setBackupCountryCode(parsedBackup.code);
      setBackupDigits(parsedBackup.local);

      if (data.contacts) {
        setContacts(data.contacts);
      }

      // Fetch audit trail
      const logs = await api.getAuditTrail('system_settings');
      setAuditTrail(logs);
    } catch (err: any) {
      console.warn('Failed to load contact settings:', err);
      setErrorMsg('Failed to load current settings from hospital database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Compute live full international number (e.g. country prefix + subscriber digits)
  const getFullInternational = (countryCode: string, digits: string): string => {
    const selected = COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[0];
    const stripped = cleanSubscriberDigits(digits);
    if (!stripped) return '';
    return `${selected.prefix}${stripped}`;
  };

  // Compute formatted display preview for Indian / International numbers
  const formatDisplay = (countryCode: string, digits: string): string => {
    const stripped = cleanSubscriberDigits(digits);
    if (!stripped) return '';
    if (countryCode === '+91' && stripped.length === 10) {
      return `+91 ${stripped.slice(0, 5)} ${stripped.slice(5)}`;
    }
    return `${countryCode} ${stripped}`;
  };

  // Validate form fields before save
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate Primary WhatsApp if entered
    if (primaryDigits.trim()) {
      const v = validateReceptionPhone(primaryDigits, primaryCountryCode);
      if (!v.isValid && v.error) {
        errors.primary = v.error;
      }
    }

    // Validate Backup WhatsApp if entered
    if (backupDigits.trim()) {
      const v = validateReceptionPhone(backupDigits, backupCountryCode);
      if (!v.isValid && v.error) {
        errors.backup = v.error;
      }
    }

    // Validate Business Link if entered
    if (businessLink.trim()) {
      const v = validateBusinessLink(businessLink);
      if (!v.isValid && v.error) {
        errors.businessLink = v.error;
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Settings (PUT /api/settings/contact)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const fullPrimary = getFullInternational(primaryCountryCode, primaryDigits);
    const fullBackup = getFullInternational(backupCountryCode, backupDigits);

    try {
      const res = await api.updateHospitalContact(
        {
          hospital_name: hospitalName.trim(),
          primary_whatsapp: fullPrimary,
          backup_whatsapp: fullBackup,
          business_link: businessLink.trim(),
          reception_phone: receptionPhone.trim(),
          office_hours: officeHours.trim(),
          emergency_number_text: emergencyText.trim(),
          greeting_line: greetingLine.trim(),
        },
        staffUser.role,
        staffUser.name
      );

      setSuccessMsg('Hospital contact settings updated successfully! Every modification has been recorded in the audit log.');
      if (onSettingsSaved && res.settings) {
        onSettingsSaved(res.settings);
      }
      // Reload to get fresh contact statuses and audit log
      await loadSettings();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setErrorMsg(err?.message || 'Error saving settings. Please verify admin authorization.');
    } finally {
      setSaving(false);
    }
  };

  // Verification flow: "Test on WhatsApp"
  const startVerificationTest = (type: 'primary' | 'backup' | 'business_link') => {
    let contactId = '';
    let targetUrl = '';
    let label = '';

    if (type === 'primary') {
      const v = validateReceptionPhone(primaryDigits, primaryCountryCode);
      if (!v.isValid) {
        setValidationErrors((prev) => ({ ...prev, primary: v.error || 'Invalid number' }));
        return;
      }
      contactId = 'contact_primary_wa';
      label = `Primary WhatsApp (${formatDisplay(primaryCountryCode, primaryDigits)})`;
      const fullNum = getFullInternational(primaryCountryCode, primaryDigits);
      const testMsg = `[Test Verification] AIIMS Reception WhatsApp Desk verification test. Sent by ${staffUser.name}.`;
      targetUrl = buildWhatsAppLink(testMsg, fullNum);
    } else if (type === 'backup') {
      const v = validateReceptionPhone(backupDigits, backupCountryCode);
      if (!v.isValid) {
        setValidationErrors((prev) => ({ ...prev, backup: v.error || 'Invalid number' }));
        return;
      }
      contactId = 'contact_backup_wa';
      label = `Backup WhatsApp (${formatDisplay(backupCountryCode, backupDigits)})`;
      const fullNum = getFullInternational(backupCountryCode, backupDigits);
      const testMsg = `[Test Verification] AIIMS Backup Reception WhatsApp Desk test. Sent by ${staffUser.name}.`;
      targetUrl = buildWhatsAppLink(testMsg, fullNum);
    } else {
      const v = validateBusinessLink(businessLink);
      if (!v.isValid) {
        setValidationErrors((prev) => ({ ...prev, businessLink: v.error || 'Invalid link' }));
        return;
      }
      contactId = 'contact_business_link';
      label = 'WhatsApp Business Link';
      targetUrl = businessLink.trim();
    }

    // 1. Open test link in new tab
    if (typeof window !== 'undefined') {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }

    // 2. Open confirmation modal
    setVerifyingContact({
      contactId,
      label,
      targetUrl,
      isOpen: true,
      showTips: false,
    });
  };

  // Handle confirmation outcome ("Yes, it works" vs "No, it did not open")
  const handleConfirmVerification = async (works: boolean) => {
    if (!verifyingContact) return;

    try {
      if (works) {
        await api.verifyHospitalContact(verifyingContact.contactId, 'verified', staffUser.name, staffUser.role);
        setSuccessMsg(`Verified successfully! ${verifyingContact.label} is now active for patient chats.`);
        setVerifyingContact(null);
        await loadSettings();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        await api.verifyHospitalContact(verifyingContact.contactId, 'failed', staffUser.name, staffUser.role);
        // Keep modal open and show actionable diagnostic tips
        setVerifyingContact((prev) => prev ? { ...prev, showTips: true } : null);
        await loadSettings();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error recording verification response.');
    }
  };

  // Helper to render badge based on contact item
  const renderStatusBadge = (contactType: 'primary_whatsapp' | 'backup_whatsapp' | 'business_link' | 'phone') => {
    const contact = contacts.find((c) => c.type === contactType);
    if (!contact || contact.status === 'not_verified' || !contact.value) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          <span>Not verified</span>
        </span>
      );
    }

    if (contact.status === 'verified') {
      const verifiedDate = contact.verified_at ? new Date(contact.verified_at).toLocaleDateString() : '';
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Verified {verifiedDate ? `(${verifiedDate})` : ''}</span>
        </span>
      );
    }

    if (contact.status === 'reported_not_working') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>Reported not working</span>
        </span>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-[#5A6270]">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#1E6F5C] mb-3" />
        <p className="text-sm font-medium">Loading hospital reception settings...</p>
      </div>
    );
  }

  const primaryPreview = formatDisplay(primaryCountryCode, primaryDigits);
  const backupPreview = formatDisplay(backupCountryCode, backupDigits);

  const [resettingDemo, setResettingDemo] = useState(false);

  const handleResetDemo = async () => {
    if (!window.confirm('Reset all demo data to initial seeded state? This will restore the 3 default discharge sheets and clear any live edits.')) {
      return;
    }
    setResettingDemo(true);
    try {
      await api.resetDemoData();
      setSuccessMsg('Demo data successfully reset! Initial synthetic discharge sheets and verified settings restored.');
      await loadSettings();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to reset demo data');
    } finally {
      setResettingDemo(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      
      {/* Demo Mode Notice & Reset Data Button */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900">
              Demo Mode Notice: Do not enter a real phone number in this demo.
            </p>
            <p className="text-xs text-amber-800 leading-relaxed mt-0.5">
              All data entered is strictly synthetic and temporary. Demo data automatically resets to seeded state every few hours. WhatsApp reminders operate in simulated zero-cost mode.
            </p>
          </div>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={handleResetDemo}
            disabled={resettingDemo}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 border border-amber-300 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resettingDemo ? 'animate-spin' : ''}`} />
            <span>{resettingDemo ? 'Resetting...' : 'Reset Demo Data'}</span>
          </button>
        )}
      </div>

      {/* Role Banner */}
      <div className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-start gap-3 ${
        isAdmin 
          ? 'bg-[#EEF5F1] border-[#BED6C8] text-[#14473B]' 
          : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}>
        {isAdmin ? (
          <ShieldCheck className="w-5 h-5 text-[#1E6F5C] shrink-0 mt-0.5" />
        ) : (
          <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        )}
        <div className="space-y-0.5">
          <p className="font-bold">
            {isAdmin 
              ? 'Admin Master Configuration Area' 
              : 'Nurse View-Only Mode'}
          </p>
          <p className="text-xs opacity-90 leading-relaxed">
            {isAdmin 
              ? 'You have administrative permissions to update the official hospital reception contact details. Numbers must be tested on WhatsApp to become verified. Modifications are permanently written to the audit log.'
              : 'Registered Nurses have view-only access to hospital reception settings. Only administrators with role "admin" can edit or save changes.'}
          </p>
        </div>
      </div>

      {/* Main Settings Form */}
      <div className="bg-[#FFFDF9] rounded-3xl border border-[#EAE5DB] p-6 sm:p-8 shadow-xs">
        <div className="border-b border-[#EAE5DB] pb-5 mb-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1E6F5C] mb-1">
            <Building2 className="w-4 h-4" />
            <span>Hospital Contact & WhatsApp Desk</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#242A35]">
            Hospital Reception Settings
          </h2>
          <p className="text-xs sm:text-sm text-[#5A6270] mt-1">
            Configure the verified WhatsApp desk number, backup contacts, office hours, and patient greeting. If unverified, the patient WhatsApp button opens the direct fallback contact sheet.
          </p>
        </div>

        {/* Feedback alerts */}
        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in">
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Field 1: Hospital Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#5A6270]">
              Hospital / Centre Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              disabled={!isAdmin}
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              placeholder="e.g. AIIMS New Delhi Cardio-Thoracic Centre"
              required
              className="w-full px-4 py-2.5 bg-[#FAF7F2] border border-[#DDD7CB] rounded-xl text-sm text-[#242A35] focus:bg-white focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none transition-all disabled:opacity-75 disabled:cursor-not-allowed"
            />
          </div>

          {/* Field 2: Primary Reception WhatsApp Number */}
          <div className="space-y-2 p-4 rounded-2xl bg-[#FBF9F4] border border-[#E8E2D5]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#242A35]">
                Primary Reception WhatsApp Number <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-300 font-semibold">
                  Source: <strong className="text-[#14473B]">{whatsappSource}</strong>
                </span>
                {renderStatusBadge('primary_whatsapp')}
              </div>
            </div>

            {!activeNumberInfo.isValid && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-800 flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  <strong>Configuration Alert:</strong> {activeNumberInfo.error || 'Invalid number.'} Patient WhatsApp sheet will fall back to Call &amp; Copy options.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Country code selector defaulting to +91 */}
              <div className="sm:col-span-1">
                <select
                  disabled={!isAdmin}
                  value={primaryCountryCode}
                  onChange={(e) => {
                    setPrimaryCountryCode(e.target.value);
                    setValidationErrors((prev) => ({ ...prev, primary: '' }));
                  }}
                  className="w-full px-3 py-2.5 bg-white border border-[#DDD7CB] rounded-xl text-sm font-semibold text-[#242A35] focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.country.split(' ')[0]})
                    </option>
                  ))}
                </select>
              </div>

              {/* Phone digits input */}
              <div className="sm:col-span-3">
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={primaryDigits}
                  onChange={(e) => {
                    const cleaned = cleanSubscriberDigits(e.target.value);
                    setPrimaryDigits(cleaned);
                    setValidationErrors((prev) => ({ ...prev, primary: '' }));
                  }}
                  placeholder="e.g. 7374029569"
                  maxLength={15}
                  className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-[#242A35] font-mono focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none transition-all disabled:opacity-75 disabled:cursor-not-allowed ${
                    validationErrors.primary ? 'border-rose-400 bg-rose-50/30' : 'border-[#DDD7CB]'
                  }`}
                />
              </div>
            </div>

            {/* Inline validation error display */}
            {validationErrors.primary && (
              <p className="text-xs text-rose-600 font-semibold flex items-center gap-1 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{validationErrors.primary}</span>
              </p>
            )}

            {/* Live Preview & Verification Trigger */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[#5A6270]">Live Preview:</span>
                <span className="font-mono font-bold text-[#14473B]">
                  {primaryPreview ? primaryPreview : 'No number entered (Empty / Unverified)'}
                </span>
              </div>

              {isAdmin && primaryDigits.trim() && (
                <button
                  type="button"
                  onClick={() => startVerificationTest('primary')}
                  className="px-3.5 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 fill-current" />
                  <span>Test on WhatsApp</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-[#737C8B]">
              For India (+91), exactly 10 digits starting with 6, 7, 8 or 9 are required. Editing a verified number resets status to &ldquo;Not verified&rdquo; until tested.
            </p>
          </div>

          {/* Field 3: Backup WhatsApp Number (Optional) */}
          <div className="space-y-2 p-4 rounded-2xl bg-[#FBF9F4] border border-[#E8E2D5]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#242A35]">
                Backup WhatsApp Number <span className="text-[11px] font-normal text-[#737C8B]">(Optional)</span>
              </label>
              <div className="flex items-center gap-2">
                {renderStatusBadge('backup_whatsapp')}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-1">
                <select
                  disabled={!isAdmin}
                  value={backupCountryCode}
                  onChange={(e) => {
                    setBackupCountryCode(e.target.value);
                    setValidationErrors((prev) => ({ ...prev, backup: '' }));
                  }}
                  className="w-full px-3 py-2.5 bg-white border border-[#DDD7CB] rounded-xl text-sm font-semibold text-[#242A35] focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.country.split(' ')[0]})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={backupDigits}
                  onChange={(e) => {
                    const cleaned = cleanSubscriberDigits(e.target.value);
                    setBackupDigits(cleaned);
                    setValidationErrors((prev) => ({ ...prev, backup: '' }));
                  }}
                  placeholder="e.g. 7374029569"
                  maxLength={15}
                  className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-[#242A35] font-mono focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none transition-all disabled:opacity-75 disabled:cursor-not-allowed ${
                    validationErrors.backup ? 'border-rose-400 bg-rose-50/30' : 'border-[#DDD7CB]'
                  }`}
                />
              </div>
            </div>

            {validationErrors.backup && (
              <p className="text-xs text-rose-600 font-semibold flex items-center gap-1 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{validationErrors.backup}</span>
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[#5A6270]">Live Preview:</span>
                <span className="font-mono font-bold text-[#14473B]">
                  {backupPreview ? backupPreview : 'None configured'}
                </span>
              </div>

              {isAdmin && backupDigits.trim() && (
                <button
                  type="button"
                  onClick={() => startVerificationTest('backup')}
                  className="px-3.5 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 fill-current" />
                  <span>Test on WhatsApp</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-[#737C8B]">
              Automatically used if patients report the primary WhatsApp as unavailable in the last 24 hours.
            </p>
          </div>

          {/* Field 4: Optional WhatsApp Business Link */}
          <div className="space-y-2 p-4 rounded-2xl bg-[#FBF9F4] border border-[#E8E2D5]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#242A35]">
                WhatsApp Business Link <span className="text-[11px] font-normal text-[#737C8B]">(Optional)</span>
              </label>
              <div className="flex items-center gap-2">
                {renderStatusBadge('business_link')}
              </div>
            </div>

            <div className="relative">
              <input
                type="url"
                disabled={!isAdmin}
                value={businessLink}
                onChange={(e) => {
                  setBusinessLink(e.target.value);
                  setValidationErrors((prev) => ({ ...prev, businessLink: '' }));
                }}
                placeholder="https://wa.me/message/... or https://wa.link/..."
                className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm text-[#242A35] font-mono focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none transition-all disabled:opacity-75 disabled:cursor-not-allowed ${
                  validationErrors.businessLink ? 'border-rose-400 bg-rose-50/30' : 'border-[#DDD7CB]'
                }`}
              />
            </div>

            {validationErrors.businessLink && (
              <p className="text-xs text-rose-600 font-semibold flex items-center gap-1 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{validationErrors.businessLink}</span>
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
              <span className="text-[11px] text-[#737C8B]">
                Preferred over phone numbers when marked verified.
              </span>

              {isAdmin && businessLink.trim() && (
                <button
                  type="button"
                  onClick={() => startVerificationTest('business_link')}
                  className="px-3.5 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Test Business Link</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Field 5: Reception Phone / Landline Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#5A6270]">
              Reception Phone / Voice Landline <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              disabled={!isAdmin}
              value={receptionPhone}
              onChange={(e) => setReceptionPhone(e.target.value)}
              placeholder="e.g. +91 73740 29569"
              required
              className="w-full px-4 py-2.5 bg-[#FAF7F2] border border-[#DDD7CB] rounded-xl text-sm text-[#242A35] font-mono focus:bg-white focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none transition-all disabled:opacity-75 disabled:cursor-not-allowed"
            />
            <p className="text-[11px] text-[#737C8B]">
              Primary voice hotline shown if WhatsApp is unavailable or if patients select direct voice call.
            </p>
          </div>

          {/* Field 6: Office Hours */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#5A6270]">
              Office Hours / Helpdesk Schedule <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              disabled={!isAdmin}
              value={officeHours}
              onChange={(e) => setOfficeHours(e.target.value)}
              placeholder="e.g. Mon - Sat, 08:00 AM - 08:00 PM IST"
              required
              className="w-full px-4 py-2.5 bg-[#FAF7F2] border border-[#DDD7CB] rounded-xl text-sm text-[#242A35] focus:bg-white focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none transition-all disabled:opacity-75 disabled:cursor-not-allowed"
            />
            <p className="text-[11px] text-[#737C8B]">
              Outside these hours, patients are reminded that replies may be delayed and to dial 108 for emergency assistance.
            </p>
          </div>

          {/* Field 7: Optional Greeting Line */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5A6270]">
                Greeting Line (Welcome Message)
              </label>
              <span className="text-[11px] text-[#737C8B]">Optional</span>
            </div>
            <input
              type="text"
              disabled={!isAdmin}
              value={greetingLine}
              onChange={(e) => setGreetingLine(e.target.value)}
              placeholder="e.g. Namaste! Welcome to AIIMS Patient Care Support Desk."
              className="w-full px-4 py-2.5 bg-[#FAF7F2] border border-[#DDD7CB] rounded-xl text-sm text-[#242A35] focus:bg-white focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none transition-all disabled:opacity-75 disabled:cursor-not-allowed"
            />
          </div>

          {/* Actions: Save Button & Admin info */}
          <div className="pt-4 border-t border-[#EAE5DB] flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-[#5A6270]">
              {isAdmin ? (
                <span>Clicking Save writes all values directly to the hospital audit trail.</span>
              ) : (
                <div className="italic flex items-center gap-1.5 text-amber-800">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Nurses have view-only access. Login as Admin to edit.</span>
                </div>
              )}
            </div>

            {isAdmin && (
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#1E6F5C] hover:bg-[#18594A] active:bg-[#13493C] text-white text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving to Database...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Contact Settings</span>
                  </>
                )}
              </button>
            )}
          </div>

        </form>
      </div>

      {/* Verification Confirmation Modal */}
      {verifyingContact && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-[#FFFDF9] rounded-3xl border border-[#EAE5DB] shadow-2xl p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-[#242A35]">
                    Confirm WhatsApp Connection
                  </h3>
                  <p className="text-xs text-[#5A6270]">
                    {verifyingContact.label}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#EEF5F1] border border-[#CFE2D7] text-xs text-[#14473B] space-y-1">
              <p className="font-bold text-sm">
                Did the chat open with the right reception account?
              </p>
              <p className="text-[11px] leading-relaxed text-[#1F5447]">
                We opened a test WhatsApp link in a new tab. Please confirm if WhatsApp opened properly with the hospital reception chat.
              </p>
            </div>

            {/* Diagnostic tips shown if user taps "No" */}
            {verifyingContact.showTips && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-2 animate-in fade-in">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <HelpCircle className="w-4 h-4 text-amber-700" />
                  <span>Troubleshooting Tips:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed pl-1 text-amber-900">
                  <li><strong>Check country code:</strong> Ensure +91 is selected for India without leading 0 or duplicate country codes.</li>
                  <li><strong>Active WhatsApp account:</strong> Verify this number has WhatsApp or WhatsApp Business installed and activated on a phone.</li>
                  <li><strong>Try Business Link:</strong> Consider generating a short link via <a href="https://wa.link" target="_blank" rel="noreferrer" className="underline font-bold text-emerald-800">wa.link</a> or WhatsApp Business and pasting it into the Business Link field above.</li>
                </ul>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2 border-t border-[#EAE5DB]">
              <button
                type="button"
                onClick={() => setVerifyingContact(null)}
                className="px-4 py-2.5 rounded-xl border border-[#DDD7CB] text-xs font-semibold text-[#5A6270] hover:bg-[#F3EDE2] cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => handleConfirmVerification(false)}
                className="px-4 py-2.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition-all cursor-pointer"
              >
                No, it did not open
              </button>

              <button
                type="button"
                onClick={() => handleConfirmVerification(true)}
                className="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20BA5A] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>Yes, it works</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Trail for Settings */}
      <div className="bg-[#FFFDF9] rounded-3xl border border-[#EAE5DB] p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <History className="w-5 h-5 text-[#1E6F5C]" />
          <h3 className="text-base font-bold text-[#242A35]">
            Hospital Contact Settings Audit Trail
          </h3>
        </div>
        <p className="text-xs text-[#5A6270] mb-4">
          Every change, verification result, and patient report is permanently recorded with the editor identity, timestamp, and transition details.
        </p>

        {auditTrail.length > 0 ? (
          <div className="space-y-3">
            {auditTrail.map((log) => (
              <div key={log.id} className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EAE5DB] text-xs">
                <div className="flex items-center justify-between text-[#737C8B] font-mono text-[11px] mb-1">
                  <span>
                    Action: <strong>{log.action}</strong> · Actor: <strong>{log.actor_name}</strong> ({log.actor_role})
                  </span>
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <div className="font-mono text-[11px] text-[#242A35] break-words">
                  <span className="font-bold text-[#1E6F5C]">New:</span> {log.new_value}
                </div>
                {log.old_value && (
                  <div className="font-mono text-[11px] text-[#737C8B] break-words mt-0.5">
                    <span className="font-semibold">Old:</span> {log.old_value}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EAE5DB] text-xs text-[#5A6270]">
            No modifications recorded yet. All changes will be logged here.
          </div>
        )}
      </div>

    </div>
  );
};
