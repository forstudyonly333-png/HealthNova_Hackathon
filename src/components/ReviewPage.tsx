import React, { useState } from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  ShieldAlert, 
  ArrowRight, 
  FileText, 
  Search, 
  PhoneCall,
  UserCheck,
  Languages,
  MessageSquare
} from 'lucide-react';
import { Language, translations } from '../i18n';
import { DischargePlan, Medicine, api } from '../api';
import { SafetyBox } from './SafetyBox';
import { AskWhatsAppModal } from './AskWhatsAppModal';

interface ReviewPageProps {
  lang: Language;
  discharge: DischargePlan | null;
  onNavigateToPlan: () => void;
  onNavigateToNurse: () => void;
}

export const ReviewPage: React.FC<ReviewPageProps> = ({
  lang,
  discharge,
  onNavigateToPlan,
  onNavigateToNurse,
}) => {
  const [highlightedMedId, setHighlightedMedId] = useState<string | null>(null);
  const [translatedMap, setTranslatedMap] = useState<Record<string, string>>({});
  const [translatingMap, setTranslatingMap] = useState<Record<string, boolean>>({});

  // WhatsApp Modal State
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

  const handleTranslateNote = async (id: string, text: string) => {
    if (translatingMap[id]) return;
    setTranslatingMap((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await api.translateText(text, lang);
      setTranslatedMap((prev) => ({ ...prev, [id]: res.translatedText }));
    } catch (err) {
      console.warn('Translate text failed:', err);
    } finally {
      setTranslatingMap((prev) => ({ ...prev, [id]: false }));
    }
  };

  if (!discharge) {
    return (
      <div className="py-20 text-center max-w-lg mx-auto px-4">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-slate-800">
          {t.review?.noSheetLoaded || 'No Discharge Sheet Loaded'}
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          {t.review?.noSheetDesc || 'Please upload a hospital discharge summary or choose a sample sheet to view the decoded medicine review.'}
        </p>
      </div>
    );
  }

  const hasFlaggedItems = discharge.medicines.some((m) => m.status === 'needs_nurse_check');

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full font-mono">
              {discharge.hospital_name}
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500">
              {t.review?.dischargeDateLabel || 'Discharge Date:'} {discharge.discharge_date}
            </span>
          </div>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {t.review.title}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            {t.review.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNavigateToPlan}
            className="px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <span>{t.nav?.myPlan || 'Go to My Plan'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Safety Banner */}
      <SafetyBox lang={lang} helpdeskNumber={discharge.helpdesk_number} />

      {/* Status Alert if Items are Flagged */}
      {hasFlaggedItems && (
        <div className="mb-8 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">
                {t.vocabulary?.statusNeedsCheck ? `${t.vocabulary.statusNeedsCheck}` : 'Clinical Verification Pending'}
              </h4>
              <p className="mt-0.5 text-xs text-amber-800">
                {t.myPlan?.waitingForNurseDesc || 'Certain timings or abbreviations on this sheet require nurse verification before daily scheduling.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateToNurse}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-amber-900 bg-amber-200 hover:bg-amber-300 transition-colors shrink-0"
          >
            {t.solutionsSection?.step3Btn || t.nav?.nurseSignoff || 'Open Nurse Queue'}
          </button>
        </div>
      )}

      {/* Medicines Review Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
          <span>{t.review?.decodedMedsHeader || t.review?.title || 'Decoded Medications'} ({discharge.medicines.length})</span>
          <span>{t.review?.tapToHighlight || t.review?.sourceLineLabel || 'Tap Card to Highlight Source Text'}</span>
        </div>

        {discharge.medicines.map((med) => {
          const isHighlighted = highlightedMedId === med.id;
          const isClear = med.status === 'clear';
          const isApproved = med.status === 'approved';
          const isFlagged = med.status === 'needs_nurse_check';

          return (
            <div
              key={med.id}
              onClick={() => setHighlightedMedId(isHighlighted ? null : med.id)}
              className={`cursor-pointer rounded-2xl border transition-all p-5 sm:p-6 bg-[#FFFDF9] ${
                isHighlighted
                  ? 'border-[#1E6F5C] ring-2 ring-[#1E6F5C]/20 shadow-md'
                  : 'border-[#EAE5DB] shadow-sm hover:border-[#D8D2C5] hover:shadow'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    isFlagged 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-[#EAF2ED] text-[#1E6F5C]'
                  }`}>
                    {med.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-[#242A35] flex items-center gap-2">
                      <span>{med.name}</span>
                      {med.strength && (
                        <span className="text-xs font-normal text-[#5A6270]">
                          ({med.strength})
                        </span>
                      )}
                    </h3>
                    <span className="text-xs text-[#7A8290] font-mono">
                      Code: {med.frequency_code} · Confidence: {Math.round(med.confidence * 100)}%
                    </span>
                  </div>
                </div>

                {/* Status Badges */}
                <div>
                  {isClear && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t.review.badgeClear}</span>
                    </span>
                  )}
                  {isApproved && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-600 text-white shadow-sm">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{t.review.badgeApproved}</span>
                    </span>
                  )}
                  {isFlagged && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>{t.review.badgeNeedsCheck}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Side-by-Side: Original Source Line vs Decoded Meaning */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-sm">
                
                {/* Source Line (Highlighted if card tapped) */}
                <div className={`p-3.5 rounded-xl border transition-colors ${
                  isHighlighted 
                    ? 'bg-emerald-50/70 border-emerald-300' 
                    : 'bg-slate-50 border-slate-200/80'
                }`}>
                  <span className="text-xs font-semibold text-slate-500 block mb-1">
                    {t.review.sourceLineLabel}
                  </span>
                  <p className="font-mono text-xs sm:text-sm text-slate-800 font-medium">
                    &ldquo;{med.source_text}&rdquo;
                  </p>
                  
                  {/* Optional Translate this text button per clinical note */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60">
                    {!translatedMap[med.id] ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTranslateNote(med.id, med.source_text);
                        }}
                        disabled={translatingMap[med.id]}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                      >
                        <Languages className="w-3.5 h-3.5" />
                        <span>
                          {translatingMap[med.id] 
                            ? (t.translating || 'Translating...') 
                            : (t.translateTextBtn || 'Translate this text')}
                        </span>
                      </button>
                    ) : (
                      <div className="p-2 rounded-lg bg-emerald-50/80 border border-emerald-200 text-xs">
                        <p className="font-medium text-slate-800">{translatedMap[med.id]}</p>
                        <span className="block mt-1 text-[10px] text-amber-800 italic">
                          {t.machineTranslationDisclaimer || "Machine translation, check with your nurse or doctor"}
                        </span>
                      </div>
                    )}
                  </div>

                  {isHighlighted && (
                    <span className="inline-block mt-2 text-[10px] font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                      {t.review?.sourceVerified || 'Source Line Verified'}
                    </span>
                  )}
                </div>

                {/* Decoded Meaning */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-xs font-semibold text-slate-500 block mb-1">
                    {t.review.decodedMeaningLabel}
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-slate-900">
                    {lang === 'hi' 
                      ? med.timing_instruction_hi 
                      : lang === 'en' 
                      ? med.timing_instruction_en 
                      : (t.vocabulary?.[med.frequency_code] 
                          ? `${t.vocabulary[med.frequency_code]} · ${med.food_instruction || med.timing_note || ''}` 
                          : med.timing_instruction_en)}
                  </p>
                  {med.flag_reason && (
                    <p className="mt-1 text-xs text-amber-700 font-medium">
                      Flag: {med.flag_reason}
                    </p>
                  )}
                  {med.nurse_notes && (
                    <p className="mt-1 text-xs text-emerald-700 font-medium">
                      Nurse Note: {med.nurse_notes}
                    </p>
                  )}
                </div>

              </div>

              {/* Scheduled Daily Slots if assigned */}
              {med.slots && med.slots.length > 0 && (
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-medium">{t.review.slotsLabel}</span>
                  <div className="flex gap-1.5">
                    {med.slots.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200 capitalize"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Ask about this medicine */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
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
          );
        })}
      </div>

      {/* Follow-up & Warnings Cards */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Follow-up */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">
              {t.review.followupHeader}
            </h3>
          </div>
          {discharge.follow_ups.length > 0 ? (
            discharge.follow_ups.map((fu) => (
              <div key={fu.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs sm:text-sm">
                <p className="font-semibold text-slate-800">{fu.text}</p>
                <p className="text-xs text-slate-500 mt-1">Source: &ldquo;{fu.source_text}&rdquo;</p>
                <div className="mt-2">
                  {!translatedMap[fu.id] ? (
                    <button
                      type="button"
                      onClick={() => handleTranslateNote(fu.id, fu.source_text)}
                      disabled={translatingMap[fu.id]}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                    >
                      <Languages className="w-3 h-3" />
                      <span>{translatingMap[fu.id] ? (t.translating || 'Translating...') : (t.translateTextBtn || 'Translate this text')}</span>
                    </button>
                  ) : (
                    <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-xs mt-1">
                      <p className="text-slate-800 font-medium">{translatedMap[fu.id]}</p>
                      <span className="block mt-0.5 text-[9px] text-amber-800 italic">
                        {t.machineTranslationDisclaimer || "Machine translation, check with your nurse or doctor"}
                      </span>
                    </div>
                  )}
                </div>
                {fu.due_date && (
                  <span className="mt-2 inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    Due: {fu.due_date}
                  </span>
                )}
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500">
              {t.review?.noFollowupDetected || 'No follow-up visit timeline detected.'}
            </p>
          )}
        </div>

        {/* Warnings */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-slate-900">
              {t.review.warningsHeader}
            </h3>
          </div>
          {discharge.warnings.length > 0 ? (
            discharge.warnings.map((w) => (
              <div key={w.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs sm:text-sm">
                <p className="font-semibold text-slate-800">{w.text}</p>
                <p className="text-xs text-slate-500 mt-1">Source: &ldquo;{w.source_text}&rdquo;</p>
                <div className="mt-2">
                  {!translatedMap[w.id] ? (
                    <button
                      type="button"
                      onClick={() => handleTranslateNote(w.id, w.source_text)}
                      disabled={translatingMap[w.id]}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                    >
                      <Languages className="w-3 h-3" />
                      <span>{translatingMap[w.id] ? (t.translating || 'Translating...') : (t.translateTextBtn || 'Translate this text')}</span>
                    </button>
                  ) : (
                    <div className="p-2 rounded bg-amber-50 border border-amber-200 text-xs mt-1">
                      <p className="text-slate-800 font-medium">{translatedMap[w.id]}</p>
                      <span className="block mt-0.5 text-[9px] text-amber-800 italic">
                        {t.machineTranslationDisclaimer || "Machine translation, check with your nurse or doctor"}
                      </span>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs font-bold text-amber-800">
                  Action: {w.action_text || 'Action not specified, nurse to confirm'}
                </p>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500">
              {t.review?.noWarningsDetected || 'No emergency warnings printed on sheet.'}
            </p>
          )}
        </div>

      </div>

    </div>
  );
};
