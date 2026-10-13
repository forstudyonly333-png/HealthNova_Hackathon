import React, { useState } from 'react';
import { 
  Sun, 
  Sunset, 
  Moon, 
  Check, 
  Volume2, 
  Share2, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  ShieldAlert, 
  UserCheck, 
  Download,
  PhoneCall,
  Info,
  X,
  Salad,
  Apple,
  HeartPulse,
  Stethoscope,
  Droplets,
  Flame,
  CheckSquare,
  MessageSquare
} from 'lucide-react';
import { Language, translations, getLanguageMeta } from '../i18n';
import { DischargePlan, Medicine, api } from '../api';
import { SafetyBox } from './SafetyBox';
import { AskWhatsAppModal } from './AskWhatsAppModal';

interface MyPlanPageProps {
  lang: Language;
  discharge: DischargePlan | null;
  onRefresh: () => void;
  onNavigateToNurse: () => void;
}

export const MyPlanPage: React.FC<MyPlanPageProps> = ({
  lang,
  discharge,
  onRefresh,
  onNavigateToNurse,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [givenMap, setGivenMap] = useState<Record<string, boolean>>({});
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  // Ask WhatsApp State
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [whatsAppModalCategory, setWhatsAppModalCategory] = useState<string | undefined>(undefined);
  const [whatsAppModalMedName, setWhatsAppModalMedName] = useState<string | undefined>(undefined);
  const [whatsAppModalFollowup, setWhatsAppModalFollowup] = useState<string | undefined>(undefined);

  const handleOpenWhatsApp = (category?: string, medName?: string, followup?: string) => {
    setWhatsAppModalCategory(category);
    setWhatsAppModalMedName(medName);
    setWhatsAppModalFollowup(followup);
    setWhatsAppModalOpen(true);
  };

  const t = translations[lang];
  const langMeta = getLanguageMeta(lang);

  if (!discharge) {
    return (
      <div className="py-20 text-center max-w-lg mx-auto px-4">
        <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-slate-800">No Active Care Plan</h3>
        <p className="mt-2 text-sm text-slate-500">
          Upload a discharge summary or try a sample sheet to generate your daily family medicine schedule.
        </p>
      </div>
    );
  }

  // Group medicines by slot
  const clearOrApprovedMeds = discharge.medicines.filter(
    (m) => m.status === 'clear' || m.status === 'approved'
  );

  const subahMeds = clearOrApprovedMeds.filter((m) => m.slots?.includes('subah'));
  const dopaharMeds = clearOrApprovedMeds.filter((m) => m.slots?.includes('dopahar'));
  const shaamMeds = clearOrApprovedMeds.filter((m) => m.slots?.includes('shaam'));
  const raatMeds = clearOrApprovedMeds.filter((m) => m.slots?.includes('raat'));

  const waitingMeds = discharge.medicines.filter((m) => m.status === 'needs_nurse_check');

  // Handle Dose Given Toggle
  const handleToggleGiven = async (medicineId: string, slot: string) => {
    const key = `${medicineId}_${slot}`;
    const nextState = !givenMap[key];
    setGivenMap((prev) => ({ ...prev, [key]: nextState }));

    try {
      await api.markDoseGiven(medicineId, slot, nextState, discharge.id, 'Amit Kumar (Caregiver)');
      onRefresh();
    } catch (err) {
      console.error('Failed to record dose event:', err);
    }
  };

  // Browser SpeechSynthesis (Audio Listen button with 28-language support & fallback)
  const handleListenPlan = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setVoiceNotice('Text-to-speech audio is not supported on this browser.');
      return;
    }

    window.speechSynthesis.cancel();

    if (isPlayingAudio) {
      setIsPlayingAudio(false);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    let chosenLangCode = langMeta.bcp47;
    const prefix = langMeta.bcp47.split('-')[0].toLowerCase();
    
    // Check if voice exists for selected language
    const hasNativeVoice = voices.some((v) => {
      const vLang = v.lang.toLowerCase();
      return vLang === langMeta.bcp47.toLowerCase() || vLang.startsWith(prefix);
    });

    if (!hasNativeVoice && lang !== 'en' && lang !== 'hi') {
      const hasHi = voices.some((v) => v.lang.toLowerCase().startsWith('hi'));
      if (hasHi) {
        chosenLangCode = 'hi-IN';
        setVoiceNotice(`Audio voice for ${langMeta.name} (${langMeta.englishName}) is not installed on this browser. Playing in Hindi as fallback.`);
      } else {
        chosenLangCode = 'en-IN';
        setVoiceNotice(`Audio voice for ${langMeta.name} (${langMeta.englishName}) is not installed on this browser. Playing in English as fallback.`);
      }
    } else {
      setVoiceNotice(null);
    }

    let speechText = '';
    const isDevanagari = ['hi', 'mwr', 'dhd', 'mtr', 'swv', 'hoj', 'mr', 'ne', 'sa', 'kok', 'mai', 'doi', 'brx'].includes(lang);

    if (chosenLangCode.startsWith('hi') || (isDevanagari && chosenLangCode !== 'en-IN')) {
      speechText = `नमस्ते। यह ${discharge.patient_name || 'मरीज'} की दैनिक दवा योजना है। `;
      if (subahMeds.length > 0) {
        speechText += `${t.myPlan.subah}: ${subahMeds.map((m) => `${m.name} ${m.strength || ''}`).join(', ')}। `;
      }
      if (dopaharMeds.length > 0) {
        speechText += `${t.myPlan.dopahar}: ${dopaharMeds.map((m) => `${m.name} ${m.strength || ''}`).join(', ')}। `;
      }
      if (raatMeds.length > 0) {
        speechText += `${t.myPlan.raat}: ${raatMeds.map((m) => `${m.name} ${m.strength || ''}`).join(', ')}। `;
      }
      if (waitingMeds.length > 0) {
        speechText += `कृपया ध्यान दें, ${waitingMeds.length} दवाइयों के समय की नर्स से पुष्टि बाकी है। `;
      }
    } else {
      speechText = `Hello. Here is the daily medication schedule for ${discharge.patient_name || 'patient'}. `;
      if (subahMeds.length > 0) {
        speechText += `${t.myPlan.subah}: ${subahMeds.map((m) => `${m.name} ${m.strength || ''}`).join(', ')}. `;
      }
      if (dopaharMeds.length > 0) {
        speechText += `${t.myPlan.dopahar}: ${dopaharMeds.map((m) => `${m.name} ${m.strength || ''}`).join(', ')}. `;
      }
      if (raatMeds.length > 0) {
        speechText += `${t.myPlan.raat}: ${raatMeds.map((m) => `${m.name} ${m.strength || ''}`).join(', ')}. `;
      }
      if (waitingMeds.length > 0) {
        speechText += `Note that ${waitingMeds.length} medications are awaiting nurse sign-off. `;
      }
    }

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = chosenLangCode;
    utterance.rate = 0.92;

    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  // WhatsApp Reminder Link Generator
  const generateWhatsAppLink = () => {
    let msg = '';
    if (lang === 'hi') {
      msg = `*गोइंग होम राइट - मरीज देखभाल रिमाइंडर*\nमरीज: ${discharge.patient_name || 'समीक्षा'}\nअस्पताल: ${discharge.hospital_name}\n\n`;
      if (subahMeds.length > 0) msg += `🌅 *सुबह:* ${subahMeds.map((m) => m.name).join(', ')}\n`;
      if (dopaharMeds.length > 0) msg += `☀️ *दोपहर:* ${dopaharMeds.map((m) => m.name).join(', ')}\n`;
      if (raatMeds.length > 0) msg += `🌙 *रात:* ${raatMeds.map((m) => m.name).join(', ')}\n`;
      msg += `\nहेल्पलाइन: ${discharge.helpdesk_number}\nनोट: यह योजना अस्पताल के डिस्चार्ज पर्चे पर आधारित है।`;
    } else {
      msg = `*Going Home Right - Daily Medicine Reminder*\nPatient: ${discharge.patient_name || 'Patient'}\nHospital: ${discharge.hospital_name}\n\n`;
      if (subahMeds.length > 0) msg += `🌅 *Morning (Subah):* ${subahMeds.map((m) => m.name).join(', ')}\n`;
      if (dopaharMeds.length > 0) msg += `☀️ *Afternoon (Dopahar):* ${dopaharMeds.map((m) => m.name).join(', ')}\n`;
      if (raatMeds.length > 0) msg += `🌙 *Night (Raat):* ${raatMeds.map((m) => m.name).join(', ')}\n`;
      msg += `\nHelpdesk: ${discharge.helpdesk_number}\nNotice: This plan comes from your hospital discharge sheet.`;
    }

    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  };

  // Download .ics Calendar File for Follow-up Appointment
  const handleDownloadIcs = (fu: any) => {
    const dueDate = fu.due_date || '2026-10-18';
    const cleanDate = dueDate.replace(/-/g, '');
    const icsData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Going Home Right//Hospital Follow-up//EN',
      'BEGIN:VEVENT',
      `UID:fu_${discharge.id}_${Date.now()}@goinghomeright.in`,
      `DTSTAMP:${cleanDate}T090000Z`,
      `DTSTART:${cleanDate}T090000Z`,
      `DTEND:${cleanDate}T100000Z`,
      `SUMMARY:Hospital Follow-up: ${fu.text}`,
      `DESCRIPTION:Follow-up review for patient ${discharge.patient_name}. Hospital: ${discharge.hospital_name}. Helpline: ${discharge.helpdesk_number}`,
      `LOCATION:${discharge.hospital_name}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Followup_${discharge.patient_name || 'Patient'}_${dueDate}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full font-mono">
              Patient: {discharge.patient_name || 'Sita Devi'}
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-mono">
              ABHA: {discharge.abha_id || '91-8723-4412-9021'}
            </span>
          </div>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {t.myPlan.title}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            {t.myPlan.subtitle}
          </p>
        </div>

        {/* Action Buttons: Listen & WhatsApp */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleListenPlan}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-colors flex items-center gap-2 shadow-sm ${
              isPlayingAudio
                ? 'bg-amber-600 text-white animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>{isPlayingAudio ? 'Speaking...' : t.myPlan.listenPlan}</span>
          </button>

          <a
            href={generateWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Share2 className="w-4 h-4 text-emerald-700" />
            <span>{t.myPlan.whatsappShare}</span>
          </a>
        </div>
      </div>

      {/* Safety Notice */}
      <SafetyBox lang={lang} helpdeskNumber={discharge.helpdesk_number} />

      {/* Voice Readout Notice Banner (if fallback triggered) */}
      {voiceNotice && (
        <div className="mb-5 p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Volume2 className="w-4 h-4 text-sky-600 shrink-0" />
            <span>{voiceNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setVoiceNotice(null)}
            className="text-sky-500 hover:text-sky-800 p-1 rounded-md"
            aria-label="Dismiss voice notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Machine-Translation Disclaimer (Subtle, non-intrusive badge for all unreviewed languages) */}
      {!langMeta.reviewed && (
        <div className="mb-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200/80 text-slate-600 text-xs font-medium">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>{t.machineTranslationDisclaimer || "Machine translation, check with your nurse or doctor"}</span>
        </div>
      )}

      {/* Daily Time-of-Day Sections: Subah, Dopahar, Raat */}
      <div className="space-y-6">

        {/* 1. SUBAH (Morning) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Sun className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{t.myPlan.subah}</h3>
                <span className="text-xs text-slate-400">{t.myPlan.subahTime}</span>
              </div>
            </div>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md">
              {subahMeds.length} Medicines
            </span>
          </div>

          {subahMeds.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subahMeds.map((med) => {
                const key = `${med.id}_subah`;
                const isGiven = !!givenMap[key];
                return (
                  <div
                    key={med.id}
                    className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                      isGiven 
                        ? 'bg-emerald-50/70 border-emerald-300' 
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <h4 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{med.name}</span>
                        {med.strength && <span className="text-xs text-slate-500 font-normal">({med.strength})</span>}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                        {lang === 'hi' ? med.timing_instruction_hi : med.timing_instruction_en}
                      </p>
                      {med.doctor_notes && (
                        <p className="mt-2 text-xs text-emerald-900 bg-emerald-50/90 p-2.5 rounded-xl border border-emerald-200 leading-relaxed font-medium">
                          <strong className="text-emerald-950 flex items-center gap-1 mb-0.5">
                            <Stethoscope className="w-3.5 h-3.5 text-emerald-700" />
                            Doctor's Note:
                          </strong>
                          {med.doctor_notes}
                        </p>
                      )}
                      <span className="mt-2 inline-block text-[11px] font-mono text-slate-400">
                        {med.source_text}
                      </span>

                      <div className="mt-2.5">
                        <button
                          type="button"
                          onClick={() => handleOpenWhatsApp('Medicine question', med.name)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#14473B] hover:text-[#1E6F5C] bg-[#EAF5F0] hover:bg-[#DDF0E7] border border-[#C5E5D5] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-[#25D366] fill-[#25D366]" />
                          <span>{t.askWhatsApp?.askAboutMedicine || 'Ask about this medicine'}</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleGiven(med.id, 'subah')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 ${
                        isGiven
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white text-slate-700 border border-slate-300 hover:border-emerald-600'
                      }`}
                    >
                      <Check className={`w-3.5 h-3.5 ${isGiven ? 'text-white' : 'text-slate-400'}`} />
                      <span>{isGiven ? t.myPlan.given : t.myPlan.markGiven}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic py-2">{t.myPlan.noMedicinesInSlot}</p>
          )}
        </div>

        {/* 2. DOPAHAR (Afternoon) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                <Sun className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{t.myPlan.dopahar}</h3>
                <span className="text-xs text-slate-400">{t.myPlan.dopaharTime}</span>
              </div>
            </div>
            <span className="text-xs font-semibold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-md">
              {dopaharMeds.length} Medicines
            </span>
          </div>

          {dopaharMeds.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dopaharMeds.map((med) => {
                const key = `${med.id}_dopahar`;
                const isGiven = !!givenMap[key];
                return (
                  <div
                    key={med.id}
                    className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                      isGiven 
                        ? 'bg-emerald-50/70 border-emerald-300' 
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <h4 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{med.name}</span>
                        {med.strength && <span className="text-xs text-slate-500 font-normal">({med.strength})</span>}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                        {lang === 'hi' ? med.timing_instruction_hi : med.timing_instruction_en}
                      </p>
                      {med.doctor_notes && (
                        <p className="mt-2 text-xs text-emerald-900 bg-emerald-50/90 p-2.5 rounded-xl border border-emerald-200 leading-relaxed font-medium">
                          <strong className="text-emerald-950 flex items-center gap-1 mb-0.5">
                            <Stethoscope className="w-3.5 h-3.5 text-emerald-700" />
                            Doctor's Note:
                          </strong>
                          {med.doctor_notes}
                        </p>
                      )}
                      <span className="mt-2 inline-block text-[11px] font-mono text-slate-400">
                        {med.source_text}
                      </span>

                      <div className="mt-2.5">
                        <button
                          type="button"
                          onClick={() => handleOpenWhatsApp('Medicine question', med.name)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#14473B] hover:text-[#1E6F5C] bg-[#EAF5F0] hover:bg-[#DDF0E7] border border-[#C5E5D5] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-[#25D366] fill-[#25D366]" />
                          <span>{t.askWhatsApp?.askAboutMedicine || 'Ask about this medicine'}</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleGiven(med.id, 'dopahar')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 ${
                        isGiven
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white text-slate-700 border border-slate-300 hover:border-emerald-600'
                      }`}
                    >
                      <Check className={`w-3.5 h-3.5 ${isGiven ? 'text-white' : 'text-slate-400'}`} />
                      <span>{isGiven ? t.myPlan.given : t.myPlan.markGiven}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic py-2">{t.myPlan.noMedicinesInSlot}</p>
          )}
        </div>

        {/* 3. RAAT (Night) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <Moon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{t.myPlan.raat}</h3>
                <span className="text-xs text-slate-400">{t.myPlan.raatTime}</span>
              </div>
            </div>
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">
              {raatMeds.length} Medicines
            </span>
          </div>

          {raatMeds.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {raatMeds.map((med) => {
                const key = `${med.id}_raat`;
                const isGiven = !!givenMap[key];
                return (
                  <div
                    key={med.id}
                    className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                      isGiven 
                        ? 'bg-emerald-50/70 border-emerald-300' 
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <h4 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{med.name}</span>
                        {med.strength && <span className="text-xs text-slate-500 font-normal">({med.strength})</span>}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                        {lang === 'hi' ? med.timing_instruction_hi : med.timing_instruction_en}
                      </p>
                      {med.doctor_notes && (
                        <p className="mt-2 text-xs text-emerald-900 bg-emerald-50/90 p-2.5 rounded-xl border border-emerald-200 leading-relaxed font-medium">
                          <strong className="text-emerald-950 flex items-center gap-1 mb-0.5">
                            <Stethoscope className="w-3.5 h-3.5 text-emerald-700" />
                            Doctor's Note:
                          </strong>
                          {med.doctor_notes}
                        </p>
                      )}
                      <span className="mt-2 inline-block text-[11px] font-mono text-slate-400">
                        {med.source_text}
                      </span>

                      <div className="mt-2.5">
                        <button
                          type="button"
                          onClick={() => handleOpenWhatsApp('Medicine question', med.name)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#14473B] hover:text-[#1E6F5C] bg-[#EAF5F0] hover:bg-[#DDF0E7] border border-[#C5E5D5] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-[#25D366] fill-[#25D366]" />
                          <span>{t.askWhatsApp?.askAboutMedicine || 'Ask about this medicine'}</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleGiven(med.id, 'raat')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 ${
                        isGiven
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white text-slate-700 border border-slate-300 hover:border-emerald-600'
                      }`}
                    >
                      <Check className={`w-3.5 h-3.5 ${isGiven ? 'text-white' : 'text-slate-400'}`} />
                      <span>{isGiven ? t.myPlan.given : t.myPlan.markGiven}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic py-2">{t.myPlan.noMedicinesInSlot}</p>
          )}
        </div>

      </div>

      {/* Waiting for Nurse Section (MANDATORY REQUIREMENT) */}
      {waitingMeds.length > 0 && (
        <div className="mt-8 bg-amber-50/70 rounded-3xl border border-amber-300 p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-amber-200 mb-5">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-bold text-amber-900">
                {t.myPlan.waitingForNurseTitle} ({waitingMeds.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={onNavigateToNurse}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 transition-colors shrink-0"
            >
              Sign-off as Nurse
            </button>
          </div>

          <p className="text-xs sm:text-sm text-amber-800 mb-4 leading-relaxed">
            {t.myPlan.waitingForNurseDesc}
          </p>

          <div className="space-y-3">
            {waitingMeds.map((wm) => (
              <div key={wm.id} className="p-4 rounded-2xl bg-white border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    {wm.name} {wm.strength ? `(${wm.strength})` : ''}
                  </h4>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">
                    Source text: &ldquo;{wm.source_text}&rdquo;
                  </p>
                  <p className="mt-1 text-xs font-semibold text-rose-700">
                    Flag: {wm.flag_reason}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 self-start sm:self-auto">
                  Pending Verification
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hospital Diet Plan, Add-Ons & Measures Card */}
      {discharge.diet_plan && (
        <div className="mt-8 bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                <Salad className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Hospital Clinical Diet Plan
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  {discharge.diet_plan.diet_type}
                </h3>
                <p className="text-xs text-slate-500">
                  Prescribed by {discharge.diet_plan.prescribed_by}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-3 py-1 rounded-xl bg-orange-50 text-orange-800 border border-orange-200 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" />
                {discharge.diet_plan.calories_target}
              </span>
              <span className="text-xs font-semibold px-3 py-1 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5" />
                {discharge.diet_plan.hydration_target}
              </span>
            </div>
          </div>

          {/* Meals */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Salad className="w-4 h-4 text-emerald-600" />
              <span>Daily Meal Options:</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {discharge.diet_plan.meals.map((meal) => (
                <div key={meal.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                    <span>{meal.title}</span>
                    <span className="text-[11px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">{meal.meal_time}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{meal.items}</p>
                  {meal.instructions && (
                    <p className="text-[11px] text-slate-500 mt-1 italic">Note: {meal.instructions}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Clinical Add-Ons */}
          {discharge.diet_plan.add_ons && discharge.diet_plan.add_ons.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Apple className="w-4 h-4 text-indigo-600" />
                <span>Clinical Dietary Add-Ons:</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {discharge.diet_plan.add_ons.map((addon) => (
                  <div key={addon.id} className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-200 text-xs">
                    <span className="font-bold text-indigo-950 block">{addon.title}</span>
                    <span className="text-[10px] text-indigo-600 block mt-0.5 font-medium">{addon.timing}</span>
                    <p className="text-slate-600 mt-1">{addon.benefits}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Measures that should be taken care of */}
          {discharge.diet_plan.measures && discharge.diet_plan.measures.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-rose-600" />
                <span>Measures & Precautions to Follow:</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {discharge.diet_plan.measures.map((meas) => (
                  <div key={meas.id} className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200 text-xs">
                    <div className="flex items-center justify-between font-bold text-rose-950 mb-1">
                      <span>{meas.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 font-bold uppercase">{meas.severity}</span>
                    </div>
                    {meas.metric_limit && (
                      <span className="inline-block text-[11px] font-mono font-bold text-rose-800 bg-white/80 px-2 py-0.5 rounded mb-1">
                        🎯 {meas.metric_limit}
                      </span>
                    )}
                    <p className="text-slate-700 leading-relaxed">{meas.instruction}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Cards: Follow-up & Call Doctor If */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Follow-up Due Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-bold text-slate-900">{t.myPlan.followupTitle}</h3>
            </div>

            {discharge.follow_ups.map((fu) => (
              <div key={fu.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 mb-3">
                <p className="font-bold text-sm text-slate-900">{fu.text}</p>
                {fu.due_date && (
                  <span className="mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    Due Date: {fu.due_date}
                  </span>
                )}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadIcs(fu)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-800 bg-white border border-emerald-300 hover:bg-emerald-50 transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.myPlan.addToCalendar}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      api.markFollowupDone(fu.id, true);
                      onRefresh();
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    {t.myPlan.markAttended}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenWhatsApp('Follow-up or appointment', undefined, fu.text)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#14473B] bg-[#EAF5F0] hover:bg-[#DDF0E7] border border-[#C5E5D5] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#25D366] fill-[#25D366]" />
                    <span>{t.askWhatsApp?.askAboutFollowup || 'Ask about this follow-up'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* "Call the doctor if..." Card (STRICT MANDATORY REQUIREMENT) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <PhoneCall className="w-5 h-5 text-rose-600" />
            <h3 className="text-lg font-bold text-slate-900">{t.myPlan.callDoctorIfTitle}</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Built strictly from printed emergency warnings on your discharge sheet.
          </p>

          <div className="space-y-3">
            {discharge.warnings.map((w) => (
              <div key={w.id} className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200">
                <p className="text-sm font-bold text-slate-900">{w.text}</p>
                <div className="mt-2 pt-2 border-t border-rose-100 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-rose-800">
                    {w.action_text || t.myPlan.callDoctorActionUnspecified}
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${discharge.helpdesk_number}`}
                      className="text-xs font-bold text-rose-700 hover:underline shrink-0"
                    >
                      Call: {discharge.helpdesk_number}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleOpenWhatsApp('Side effect or new symptom', undefined, w.text)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#DDD7CB] hover:border-[#1E6F5C] text-[11px] font-bold text-[#14473B] inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3 h-3 text-[#25D366] fill-[#25D366]" />
                      <span>{t.askWhatsApp?.askDoctorIf || 'Ask on WhatsApp'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Feature 2: Floating "WhatsApp Reception" Button Fixed to Bottom-Left Corner */}
      <div className="fixed bottom-6 left-6 z-40 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pointer-events-auto">
        <button
          type="button"
          onClick={() => handleOpenWhatsApp()}
          aria-label="WhatsApp Reception"
          className="min-h-[48px] min-w-[48px] px-3.5 sm:px-4 py-3 rounded-2xl bg-[#25D366] hover:bg-[#20BA5A] active:bg-[#1CA04D] text-white font-bold text-xs sm:text-sm shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/20 focus:outline-none focus:ring-4 focus:ring-emerald-400/40"
          title="WhatsApp Reception"
        >
          <MessageSquare className="w-5 h-5 fill-current shrink-0" />
          <span className="hidden sm:inline whitespace-nowrap font-bold">WhatsApp Reception</span>
        </button>
      </div>

      <AskWhatsAppModal
        isOpen={whatsAppModalOpen}
        onClose={() => setWhatsAppModalOpen(false)}
        lang={lang}
        dischargeId={discharge.id}
        patientName={discharge.patient_name}
        medicineList={discharge.medicines.map((m) => `${m.name} (${m.frequency_code || 'Daily'})`)}
        initialCategory={whatsAppModalCategory}
        initialMedicineName={whatsAppModalMedName}
        initialFollowupText={whatsAppModalFollowup}
      />

    </div>
  );
};
