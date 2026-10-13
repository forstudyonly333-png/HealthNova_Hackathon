import React, { useState, useEffect, useMemo } from 'react';
import { 
  MessageSquare, 
  X, 
  Phone, 
  AlertTriangle, 
  Check, 
  Copy, 
  Mic, 
  MicOff, 
  ExternalLink, 
  Mail, 
  Clock, 
  ShieldAlert, 
  Building2, 
  Info,
  Pill,
  Calendar,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Send,
  RefreshCw
} from 'lucide-react';
import { Language, translations, getLanguageMeta } from '../i18n';
import { api, HospitalContactSettings } from '../api';
import { 
  buildWhatsAppMessage, 
  generateWhatsAppUrl, 
  detectUrgentKeywords, 
  formatWhatsAppNumber,
  isWithinHospitalOfficeHours 
} from '../utils/whatsappUtils';
import {
  buildWhatsAppLink,
  getReceptionWhatsApp,
  getReceptionCall,
  RECEPTION_WHATSAPP_NUMBER,
  HOSPITAL_NAME
} from '../config/reception';

export interface AskWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  dischargeId: string;
  patientName?: string;
  medicineList?: string[];
  initialCategory?: string;
  initialMedicineName?: string;
  initialFollowupText?: string;
}

export const AskWhatsAppModal: React.FC<AskWhatsAppModalProps> = ({
  isOpen,
  onClose,
  lang,
  dischargeId,
  patientName = '',
  medicineList = [],
  initialCategory,
  initialMedicineName,
  initialFollowupText
}) => {
  const t = translations[lang];
  const langMeta = getLanguageMeta(lang);

  // Contact settings state using single source of truth config
  const [settings, setSettings] = useState<HospitalContactSettings>({
    hospital_name: HOSPITAL_NAME,
    reception_whatsapp: RECEPTION_WHATSAPP_NUMBER,
    reception_phone: getReceptionCall().formatted,
    office_hours: 'Mon - Sat, 08:00 AM - 08:00 PM IST',
    emergency_number_text: '108 / 112 (National Emergency Helpline)',
    has_verified_whatsapp: true,
    note: ''
  });
  const [loadingSettings, setLoadingSettings] = useState(false);

  const callInfo = useMemo(() => getReceptionCall(settings.reception_phone), [settings.reception_phone]);

  // Form states
  const [category, setCategory] = useState<string>('Medicine question');
  const [userMessage, setUserMessage] = useState<string>('');
  const [selectedMedicine, setSelectedMedicine] = useState<string | undefined>(undefined);
  const [selectedFollowup, setSelectedFollowup] = useState<string | undefined>(undefined);

  // Privacy checkboxes (Strictly OFF by default)
  const [includeMedicineList, setIncludeMedicineList] = useState<boolean>(false);
  const [includeName, setIncludeName] = useState<boolean>(false);
  const [saveCopyForNurse, setSaveCopyForNurse] = useState<boolean>(false);

  // Voice recording state
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);

  // Copy status and submission
  const [copied, setCopied] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [inAppQuerySent, setInAppQuerySent] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  // 60-Second WhatsApp Feedback Banner ("Did WhatsApp open? [Yes] [No, help me]")
  const [showFeedbackBanner, setShowFeedbackBanner] = useState<boolean>(false);
  const [reportedBroken, setReportedBroken] = useState<boolean>(false);
  const [fallbackContact, setFallbackContact] = useState<{ target: string; type: string } | null>(null);

  // Category definitions with localized label support
  const categories = useMemo(() => [
    { id: 'Medicine question', label: t.askWhatsApp?.categories?.medicine || 'Medicine question' },
    { id: 'Missed a dose', label: t.askWhatsApp?.categories?.missed || 'Missed a dose' },
    { id: 'Side effect or new symptom', label: t.askWhatsApp?.categories?.sideEffect || 'Side effect or new symptom' },
    { id: 'Follow-up or appointment', label: t.askWhatsApp?.categories?.followup || 'Follow-up or appointment' },
    { id: 'Other', label: t.askWhatsApp?.categories?.other || 'Other' }
  ], [t]);

  // Load contact settings
  const fetchSettings = () => {
    setLoadingSettings(true);
    api.getHospitalContact()
      .then((data) => {
        if (data) {
          setSettings(data);
        }
      })
      .catch((err) => {
        console.warn('Could not load hospital contact settings:', err);
      })
      .finally(() => {
        setLoadingSettings(false);
      });
  };

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
      setShowFeedbackBanner(false);
      setReportedBroken(false);
      setFallbackContact(null);
      setInAppQuerySent(false);
    }
  }, [isOpen]);

  useEffect(() => {
    // Check speech recognition support
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setSpeechSupported(true);
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync initial selections when opened
  useEffect(() => {
    if (isOpen) {
      if (initialCategory) {
        setCategory(initialCategory);
      } else if (initialMedicineName) {
        setCategory('Medicine question');
      } else if (initialFollowupText) {
        setCategory('Follow-up or appointment');
      } else {
        setCategory('Medicine question');
      }

      setSelectedMedicine(initialMedicineName);
      setSelectedFollowup(initialFollowupText);
      setCopied(false);
    }
  }, [isOpen, initialCategory, initialMedicineName, initialFollowupText]);

  // 60-Second Auto-Dismiss for Feedback Banner
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (showFeedbackBanner) {
      timer = setTimeout(() => {
        setShowFeedbackBanner(false);
      }, 60000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showFeedbackBanner]);

  // Check urgent status
  const urgentCheck = useMemo(() => {
    return detectUrgentKeywords(userMessage, category);
  }, [userMessage, category]);

  // Check office hours status
  const officeHoursInfo = useMemo(() => {
    return isWithinHospitalOfficeHours(settings.office_hours);
  }, [settings.office_hours]);

  // Build live message
  const preparedMessage = useMemo(() => {
    return buildWhatsAppMessage({
      lang,
      dischargeRef: dischargeId || 'GHR-1042',
      category,
      userMessage,
      medicineName: selectedMedicine,
      followupText: selectedFollowup,
      patientName,
      includeName,
      medicineList,
      includeMedicineList
    });
  }, [
    lang,
    dischargeId,
    category,
    userMessage,
    selectedMedicine,
    selectedFollowup,
    patientName,
    includeName,
    medicineList,
    includeMedicineList
  ]);

  // Speech recognition handler
  const handleToggleVoice = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = langMeta.bcp47 || 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setUserMessage((prev) => {
            const combined = prev ? `${prev} ${transcript}` : transcript;
            return combined.substring(0, 300);
          });
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('Speech recognition start failed:', err);
      setIsListening(false);
    }
  };

  const handleCopyMessage = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(preparedMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // 1. Open WhatsApp handler (for verified contact)
  const handleOpenWhatsApp = async () => {
    setIsSubmitting(true);
    try {
      // Log query to server (Privacy guard respected: text only saved if saveCopyForNurse is true)
      await api.logPatientQuery({
        dischargeId,
        category,
        language: lang,
        userMessage: saveCopyForNurse ? userMessage : undefined,
        medicineName: selectedMedicine,
        includedMedicineList: includeMedicineList,
        includedName: includeName,
        saveCopyForNurse
      });
    } catch (err) {
      console.warn('Query logging notice:', err);
    } finally {
      setIsSubmitting(false);
    }

    // Determine target
    const target = settings.active_whatsapp_target || settings.reception_whatsapp;
    let url = '';
    if (target && (target.startsWith('http://') || target.startsWith('https://'))) {
      // WhatsApp Business short link
      url = target;
    } else {
      url = buildWhatsAppLink(preparedMessage, target);
    }

    if (url && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }

    // Trigger the 60-second in-app banner: "Did WhatsApp open? [Yes] [No, help me]"
    setShowFeedbackBanner(true);
  };

  // 2. Feedback response handlers
  const handleFeedbackYes = () => {
    setShowFeedbackBanner(false);
  };

  const handleFeedbackNo = async () => {
    setShowFeedbackBanner(false);
    setReportedBroken(true);
    try {
      const res = await api.reportHospitalContact(
        'contact_primary_wa',
        dischargeId,
        'Patient clicked: WhatsApp did not open'
      );
      if (res.fallback_target) {
        setFallbackContact({ target: res.fallback_target, type: res.fallback_target.includes('-') ? 'phone' : 'whatsapp' });
      }
    } catch (err) {
      console.warn('Failed to submit contact report:', err);
    }
  };

  // 3. In-App message composer submission (for when WhatsApp is not verified or being set up)
  const handleSendInAppQuery = async () => {
    if (!userMessage.trim()) return;
    setIsSubmitting(true);
    try {
      await api.logPatientQuery({
        dischargeId,
        category,
        language: lang,
        userMessage: userMessage.trim(),
        medicineName: selectedMedicine,
        includedMedicineList: includeMedicineList,
        includedName: includeName,
        saveCopyForNurse: true // Always save for nurse in direct fallback mode
      });
      setInAppQuerySent(true);
    } catch (err: any) {
      console.error('Failed to submit query:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const reception = getReceptionWhatsApp(settings.active_whatsapp_target || settings.reception_whatsapp);
  const hasVerifiedWhatsApp = Boolean(settings.has_verified_whatsapp && reception.isValid);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        className="relative w-full max-w-2xl bg-[#FFFDF9] rounded-3xl border border-[#EAE5DB] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#14473B] via-[#1E6F5C] to-[#25826D] text-white p-5 sm:p-6 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-md">
                <MessageSquare className="w-6 h-6 fill-current text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-emerald-100 text-[10px] font-bold uppercase tracking-wider">
                    {hasVerifiedWhatsApp ? 'WhatsApp Desk' : 'Hospital Helpdesk'}
                  </span>
                  <span className="text-[11px] text-emerald-100/80">
                    Ref: {dischargeId}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-0.5">
                  {hasVerifiedWhatsApp 
                    ? (t.askWhatsApp?.modalTitle || 'Ask Hospital Reception on WhatsApp')
                    : 'Hospital Reception Helpdesk'}
                </h3>
                <p className="text-xs text-emerald-100/90 mt-0.5">
                  {settings.hospital_name}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 60-Second In-App Banner: "Did WhatsApp open? [Yes] [No, help me]" */}
        {showFeedbackBanner && (
          <div className="bg-[#244265] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm">
              <HelpCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-semibold">
                Did WhatsApp open with the reception desk?
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleFeedbackYes}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Yes, it works
              </button>
              <button
                type="button"
                onClick={handleFeedbackNo}
                className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                No, help me
              </button>
            </div>
          </div>
        )}

        {/* Fallback Banner if reported broken or fallback active */}
        {reportedBroken && (
          <div className="bg-rose-50 border-b border-rose-200 p-4 text-xs text-rose-950 space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2 font-bold text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>We noted that WhatsApp could not open. Switched to immediate fallback!</span>
            </div>
            <p className="text-[11px] leading-relaxed text-rose-800">
              Your inquiry has been reported to the ward reception team. You can call the hospital directly at <strong>{callInfo.formatted}</strong> or copy your message below.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href={callInfo.telUri}
                className="px-4 py-2 rounded-xl bg-[#1E6F5C] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Hospital Now ({callInfo.formatted})</span>
              </a>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="px-4 py-2 rounded-xl bg-white border border-[#DDD7CB] text-[#242A35] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Message Text'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 24-Hour Fallback Notification Banner */}
        {settings.is_fallback && settings.fallback_reason && !reportedBroken && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 text-xs text-amber-950 flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="font-semibold">{settings.fallback_reason}</span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-[#242A35]">
          
          {/* Offline Notice Banner */}
          {isOffline && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{t.askWhatsApp?.offlineNotice || 'You appear to be offline. Please connect to the internet to send your query.'}</span>
            </div>
          )}

          {/* SECTION 5A FAIL-SAFE: If NO verified WhatsApp contact exists */}
          {!hasVerifiedWhatsApp && (
            <div className="p-5 rounded-3xl bg-[#F4F8F5] border-2 border-[#BCD8C9] space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#1E6F5C] text-white flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-[#14473B] text-base">
                    Reception WhatsApp is being set up.
                  </h4>
                  <p className="text-xs text-[#28574B] mt-0.5 leading-relaxed">
                    The hospital reception WhatsApp channel is currently being verified. Please call us directly or compose your message below to send it straight to the clinical nurse station.
                  </p>
                </div>
              </div>

              {/* One-tap Emergency and Call Reception Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <a
                  href={callInfo.telUri}
                  className="px-4 py-2.5 rounded-xl bg-[#1E6F5C] hover:bg-[#18594A] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call Reception ({callInfo.formatted})</span>
                </a>

                <a
                  href="tel:108"
                  className="px-4 py-2.5 rounded-xl bg-[#C93B2F] hover:bg-[#B32E23] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
                >
                  <Phone className="w-4 h-4" />
                  <span>Emergency 108 (Ambulance)</span>
                </a>
              </div>
            </div>
          )}

          {/* 1. SAFETY & EMERGENCY NOTICE (Mandatory) */}
          <div className="p-4 rounded-2xl bg-[#FFF5F2] border border-[#F6CBC5] text-xs space-y-2.5">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-[#C93B2F] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-[#8C281F]">
                  {t.askWhatsApp?.emergencyBanner || 'WhatsApp is for non-urgent questions. In an emergency call 108 or go to the nearest hospital.'}
                </p>
                <p className="text-[#6D2018] text-[11px] leading-relaxed">
                  Hospital staff do not provide real-time diagnosis or dose changes over chat.
                </p>
              </div>
            </div>

            {/* Quick Emergency Tap-to-Call Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href="tel:108"
                className="px-3 py-1.5 rounded-xl bg-[#C93B2F] hover:bg-[#B32E23] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{t.askWhatsApp?.call108 || 'Call 108 (Ambulance)'}</span>
              </a>

              <a
                href="tel:112"
                className="px-3 py-1.5 rounded-xl bg-[#7E241B] hover:bg-[#681C15] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{t.askWhatsApp?.call112 || 'Call 112 (National)'}</span>
              </a>
            </div>
          </div>

          {/* 2. OFFICE HOURS NOTICE */}
          <div className={`p-3 rounded-2xl border text-xs flex items-center gap-2.5 ${
            officeHoursInfo.isWithin 
              ? 'bg-[#EEF5F1] border-[#CFE2D7] text-[#14473B]' 
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <Clock className="w-4 h-4 shrink-0 text-[#1E6F5C]" />
            <span className="leading-snug">{officeHoursInfo.officeHoursNotice}</span>
          </div>

          {/* 3. CATEGORY CHIPS */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#5A6270]">
              Select Question Category
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer border ${
                    category === c.id
                      ? 'bg-[#1E6F5C] text-white border-[#1E6F5C] shadow-sm'
                      : 'bg-white text-[#4A5261] border-[#DDD7CB] hover:bg-[#F3EDE2]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. CONTEXT CARDS (Medicine or Followup) */}
          {category === 'Medicine question' && medicineList.length > 0 && (
            <div className="space-y-1.5 p-3.5 rounded-2xl bg-[#F7F4ED] border border-[#E3DDCF]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E6F5C]">
                <Pill className="w-3.5 h-3.5" />
                <span>Ask about a specific medicine:</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {medicineList.map((med, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedMedicine(selectedMedicine === med ? undefined : med)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                      selectedMedicine === med
                        ? 'bg-[#1E6F5C] text-white border-[#1E6F5C]'
                        : 'bg-white text-[#333] border-[#DDD7CB] hover:bg-stone-50'
                    }`}
                  >
                    {med}
                  </button>
                ))}
              </div>
            </div>
          )}

          {category === 'Follow-up or appointment' && initialFollowupText && (
            <div className="p-3.5 rounded-2xl bg-[#F7F4ED] border border-[#E3DDCF] flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-[#1E6F5C]">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>Reference: <strong>{initialFollowupText}</strong></span>
              </div>
            </div>
          )}

          {/* 5. USER MESSAGE TEXTAREA (max 300 characters) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5A6270]">
                {t.askWhatsApp?.messageLabel || 'Your Question (max 300 characters)'}
              </label>
              <span className={`text-[11px] font-mono ${
                userMessage.length >= 290 ? 'text-rose-600 font-bold' : 'text-[#737C8B]'
              }`}>
                {userMessage.length} / 300
              </span>
            </div>

            <div className="relative">
              <textarea
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value.substring(0, 300))}
                rows={3}
                placeholder={t.askWhatsApp?.placeholder || 'Type your question clearly. Do not ask for dose changes...'}
                className="w-full px-4 py-3 bg-[#FAF7F2] border border-[#DDD7CB] rounded-2xl text-sm text-[#242A35] placeholder-[#8A93A0] focus:bg-white focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none transition-all resize-none"
              />

              {/* Voice recognition mic button */}
              {speechSupported && (
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  className={`absolute right-3 bottom-3 p-2 rounded-xl transition-all cursor-pointer ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-white text-[#5A6270] hover:text-[#1E6F5C] border border-[#DDD7CB]'
                  }`}
                  title={isListening ? 'Stop listening' : 'Tap to speak your question'}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          {/* 6. PRIVACY CHECKBOXES (Strictly OFF by default) */}
          <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EAE5DB] space-y-3">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-[#737C8B]">
              Privacy & Info Inclusion (Strictly OFF by default)
            </span>

            {/* Checkbox 1: Include first name */}
            <label className="flex items-start gap-3 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={includeName}
                onChange={(e) => setIncludeName(e.target.checked)}
                className="mt-0.5 rounded border-[#DDD7CB] text-[#1E6F5C] focus:ring-[#1E6F5C] w-4 h-4 cursor-pointer"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-[#242A35]">
                  Include my first name
                </span>
                <p className="text-[11px] text-[#5A6270]">
                  Appends your first name to help hospital staff identify your records (OFF by default).
                </p>
              </div>
            </label>

            {/* Checkbox 2: Include current medicine names */}
            {medicineList.length > 0 && (
              <label className="flex items-start gap-3 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={includeMedicineList}
                  onChange={(e) => setIncludeMedicineList(e.target.checked)}
                  className="mt-0.5 rounded border-[#DDD7CB] text-[#1E6F5C] focus:ring-[#1E6F5C] w-4 h-4 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="font-bold text-[#242A35]">
                    {t.askWhatsApp?.includeMedsLabel || 'Include my medicine names in the message'}
                  </span>
                  <p className="text-[11px] text-[#5A6270]">
                    Attaches only the names of prescribed medications (OFF by default).
                  </p>
                </div>
              </label>
            )}

            {/* Checkbox 3: Save copy for the nurse */}
            <label className="flex items-start gap-3 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={saveCopyForNurse}
                onChange={(e) => setSaveCopyForNurse(e.target.checked)}
                className="mt-0.5 rounded border-[#DDD7CB] text-[#1E6F5C] focus:ring-[#1E6F5C] w-4 h-4 cursor-pointer"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-[#242A35]">
                  {t.askWhatsApp?.saveCopyLabel || 'Save a copy for the nurse'}
                </span>
                <p className="text-[11px] text-[#5A6270]">
                  {t.askWhatsApp?.saveCopyHelp || 'Allows clinical ward nurses to view your question in their verification portal.'}
                </p>
              </div>
            </label>
          </div>

          {/* 7. LIVE MESSAGE PREVIEW */}
          <div className="space-y-1.5">
            <span className="block text-xs font-bold uppercase tracking-wider text-[#5A6270]">
              {t.askWhatsApp?.previewTitle || 'Live Message Preview (what will be sent):'}
            </span>
            <div className="p-3.5 rounded-2xl bg-[#EEF5F1] border border-[#CFE2D7] text-xs font-medium text-[#134437] leading-relaxed break-words font-mono">
              {preparedMessage}
            </div>
            <p className="text-[10px] text-[#737C8B]">
              Privacy guarantee: Diagnoses, uploaded scan files, and clinical reports are never forwarded.
            </p>
          </div>

          {/* 8. URGENT CORAL ALERT (Shown BEFORE WhatsApp button if urgent keywords detected) */}
          {urgentCheck.isUrgent && (
            <div className="p-4 rounded-2xl bg-[#FDF0EE] border-2 border-[#E5483B] text-xs space-y-2 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-[#C93B2F] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#8C281F] text-sm">
                    {t.askWhatsApp?.urgentWarning || 'This may be urgent. Call your doctor or emergency number now.'}
                  </h4>
                  <p className="text-[#6D2018] text-xs mt-0.5 leading-relaxed">
                    Detected symptom: <strong>&ldquo;{urgentCheck.matchedKeyword}&rdquo;</strong>. Acute symptoms should not wait for WhatsApp replies.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={callInfo.telUri}
                  className="px-4 py-2 rounded-xl bg-[#C93B2F] hover:bg-[#B32E23] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Hospital Helpdesk ({callInfo.formatted})</span>
                </a>

                <a
                  href="tel:108"
                  className="px-4 py-2 rounded-xl bg-[#7E241B] hover:bg-[#681C15] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call 108 (Ambulance)</span>
                </a>
              </div>
            </div>
          )}

          {/* In-App Direct Submission Confirmation */}
          {inAppQuerySent && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Message Received at Clinical Nurse Station</span>
              </div>
              <p className="text-[11px] leading-relaxed text-emerald-800">
                Sister Priya Sharma, RN and the on-duty medical staff have received your question regarding <strong>Ref: {dischargeId}</strong> and will follow up shortly.
              </p>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-[#FAF7F2] border-t border-[#EAE5DB] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          
          {/* Secondary helper actions: Copy & Direct Call */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="px-3.5 py-2.5 rounded-xl border border-[#DDD7CB] hover:bg-[#F3EDE2] text-xs font-bold text-[#4A5261] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? (t.askWhatsApp?.copied || 'Copied!') : (t.askWhatsApp?.copyMessageBtn || 'Copy Message')}</span>
            </button>

            <a
              href={callInfo.telUri}
              className="px-3.5 py-2.5 rounded-xl border border-[#DDD7CB] hover:bg-[#F3EDE2] text-xs font-bold text-[#4A5261] transition-all flex items-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5 text-[#1E6F5C]" />
              <span>{t.askWhatsApp?.callReceptionBtn || 'Call Reception'}</span>
            </a>
          </div>

          {/* Primary Action Button */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#DDD7CB] text-xs font-semibold text-[#5A6270] hover:bg-[#F3EDE2] cursor-pointer"
            >
              Cancel
            </button>

            {hasVerifiedWhatsApp ? (
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                disabled={isSubmitting}
                className={`px-6 py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                  urgentCheck.isUrgent
                    ? 'bg-[#244265] hover:bg-[#1A3451]' // Secondary role if urgent alert active
                    : 'bg-[#25D366] hover:bg-[#20BA5A] active:bg-[#1CA04D]' // Primary WhatsApp Green
                }`}
              >
                <MessageSquare className="w-4 h-4 fill-current" />
                <span>{isSubmitting ? 'Opening...' : (t.askWhatsApp?.openWhatsAppBtn || 'Open WhatsApp')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            ) : (
              // Fail-safe button when no verified WhatsApp exists: submits directly to Nurse Station
              <button
                type="button"
                onClick={handleSendInAppQuery}
                disabled={isSubmitting || inAppQuerySent}
                className="px-5 py-2.5 rounded-xl bg-[#1E6F5C] hover:bg-[#18594A] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : inAppQuerySent ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Question Sent</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send to Nurse Station</span>
                  </>
                )}
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
