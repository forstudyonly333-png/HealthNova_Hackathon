import React, { useState, useEffect } from 'react';
import { 
  Sun, 
  Sunset, 
  Moon, 
  Check, 
  Clock, 
  Pill, 
  ShieldCheck, 
  PhoneCall, 
  Printer, 
  Volume2, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  Building2, 
  UserCheck, 
  Info,
  Sparkles,
  ArrowRight,
  Filter,
  Salad,
  Apple,
  Plus,
  Droplets,
  Flame,
  HeartPulse,
  Scale,
  Activity,
  AlertCircle,
  X,
  ChevronRight,
  CheckSquare,
  Square,
  Stethoscope,
  Utensils,
  MessageSquare
} from 'lucide-react';
import { 
  api, 
  PatientChecklistData, 
  PatientChecklistMedicine,
  DietPlan, 
  DietMealItem, 
  DietAddOnItem, 
  DietMeasureItem 
} from '../api';
import { Language, translations, getLanguageMeta } from '../i18n';
import { SafetyBox } from './SafetyBox';
import { AskWhatsAppModal } from './AskWhatsAppModal';

interface PatientChecklistPageProps {
  lang: Language;
  dischargeId: string;
  onNavigateToHospitalPortal?: () => void;
  onOpenCallModal?: () => void;
}

export const PatientChecklistPage: React.FC<PatientChecklistPageProps> = ({
  lang,
  dischargeId,
  onNavigateToHospitalPortal,
  onOpenCallModal,
}) => {
  const [data, setData] = useState<PatientChecklistData | null>(null);
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Navigation tabs: 'all' | 'medicines' | 'diet'
  const [mainTab, setMainTab] = useState<'all' | 'medicines' | 'diet'>('all');
  const [selectedSlotFilter, setSelectedSlotFilter] = useState<'all' | 'subah' | 'dopahar' | 'shaam' | 'raat' | 'sos' | 'pending'>('all');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
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

  // Forms for adding custom diet options, add-ons, and patient care measures
  const [showAddMealForm, setShowAddMealForm] = useState(false);
  const [newMeal, setNewMeal] = useState({ meal_time: 'Mid-Afternoon (4:00 PM)', title: '', items: '', instructions: '' });

  const [showAddAddOnForm, setShowAddAddOnForm] = useState(false);
  const [newAddOn, setNewAddOn] = useState({ title: '', timing: 'Morning', benefits: '', instructions: '', recommended: true });

  const [showAddMeasureForm, setShowAddMeasureForm] = useState(false);
  const [newMeasure, setNewMeasure] = useState<{ title: string; category: string; severity: 'Critical' | 'Important' | 'Warning' | 'Monitoring'; metric_limit: string; instruction: string }>({
    title: '',
    category: 'General Precaution',
    severity: 'Important',
    metric_limit: '',
    instruction: '',
  });

  const [isSubmittingItem, setIsSubmittingItem] = useState(false);

  const t = translations[lang];
  const langMeta = getLanguageMeta(lang);

  const localizeFoodInstruction = (instruction: string): string => {
    if (!instruction) return '';
    const lower = instruction.toLowerCase();
    if (lower.includes('after') || lower.includes('pc') || lower.includes('बाद')) {
      return t.vocabulary?.pc || (lang === 'hi' ? 'भोजन के बाद (PC)' : instruction);
    }
    if (lower.includes('before') || lower.includes('ac') || lower.includes('पहले')) {
      return t.vocabulary?.ac || (lang === 'hi' ? 'भोजन से पहले (AC)' : instruction);
    }
    if (lower.includes('empty') || lower.includes('खाली')) {
      return t.vocabulary?.ac ? `${t.vocabulary.ac} (Empty Stomach)` : instruction;
    }
    if (lower.includes('bed') || lower.includes('रात') || lower.includes('सोते')) {
      return t.vocabulary?.raat ? `${t.vocabulary.raat} (Bedtime)` : instruction;
    }
    return instruction;
  };

  const localizeDosageForm = (form?: string): string => {
    if (!form) return t.vocabulary?.tablet || 'Tablet';
    const lower = form.toLowerCase();
    if (lower.includes('tablet')) return t.vocabulary?.tablet || 'Tablet';
    if (lower.includes('capsule')) return t.vocabulary?.capsule || 'Capsule';
    if (lower.includes('syrup')) return t.vocabulary?.syrup || 'Syrup';
    if (lower.includes('injection')) return t.vocabulary?.injection || 'Injection';
    return form;
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPatientChecklist(dischargeId);
      setData(res);
      if (res.dietPlan) {
        setDietPlan(res.dietPlan);
      } else {
        // Attempt fetching diet directly
        try {
          const directDiet = await api.getDischarge(dischargeId);
          if (directDiet.diet_plan) {
            setDietPlan(directDiet.diet_plan);
          }
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load doctor-prescribed medicine checklist.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dischargeId]);

  // Dose checklist toggle
  const handleToggleDose = async (medicineId: string, slot: string, currentGiven: boolean) => {
    const nextState = !currentGiven;
    
    // Optimistic UI update
    if (data) {
      const updatedMeds = data.allMedicines.map((m) => {
        if (m.id === medicineId) {
          const updatedStatuses = m.slotStatuses.map((ss) => {
            if (ss.slot === slot) {
              return {
                ...ss,
                isGiven: nextState,
                givenAt: nextState ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
                givenBy: nextState ? (data.patientName || 'Patient') : null,
              };
            }
            return ss;
          });
          return { ...m, slotStatuses: updatedStatuses };
        }
        return m;
      });

      let total = 0;
      let taken = 0;
      updatedMeds.forEach((m) => {
        m.slotStatuses.forEach((ss) => {
          total++;
          if (ss.isGiven) taken++;
        });
      });

      setData({
        ...data,
        allMedicines: updatedMeds,
        checklistByTime: {
          subah: updatedMeds.filter((m) => m.slots.includes('subah')),
          dopahar: updatedMeds.filter((m) => m.slots.includes('dopahar')),
          shaam: updatedMeds.filter((m) => m.slots.includes('shaam')),
          raat: updatedMeds.filter((m) => m.slots.includes('raat')),
          sos: updatedMeds.filter((m) => m.frequency_code === 'SOS' || m.slots.length === 0),
        },
        adherence: {
          totalDoses: total,
          takenDoses: taken,
          percentage: total > 0 ? Math.round((taken / total) * 100) : 0,
        },
      });
    }

    try {
      await api.markDoseGiven(medicineId, slot, nextState, dischargeId, data?.patientName || 'Patient');
    } catch (err) {
      console.error('Failed to sync dose update to server:', err);
      loadData();
    }
  };

  // Diet item toggle (Meal, Add-On, Measure)
  const handleToggleDietItem = async (itemType: 'meal' | 'addon' | 'measure', itemId: string, currentCompleted: boolean) => {
    const nextCompleted = !currentCompleted;
    if (!dietPlan) return;

    // Optimistic update
    const updatedDiet = { ...dietPlan };
    if (itemType === 'meal') {
      updatedDiet.meals = updatedDiet.meals.map((m) => m.id === itemId ? { ...m, taken: nextCompleted } : m);
    } else if (itemType === 'addon') {
      updatedDiet.add_ons = updatedDiet.add_ons.map((a) => a.id === itemId ? { ...a, taken: nextCompleted } : a);
    } else if (itemType === 'measure') {
      updatedDiet.measures = updatedDiet.measures.map((meas) => meas.id === itemId ? { ...meas, checked: nextCompleted } : meas);
    }
    setDietPlan(updatedDiet);

    try {
      const res = await api.toggleDietItem(dischargeId, itemType, itemId, nextCompleted);
      if (res && res.dietPlan) {
        setDietPlan(res.dietPlan);
      }
    } catch (err) {
      console.error('Failed to toggle diet item:', err);
    }
  };

  // Add custom meal option
  const handleAddMealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeal.title.trim()) return;
    setIsSubmittingItem(true);
    try {
      const mealItem: DietMealItem = {
        id: `meal_custom_${Date.now()}`,
        meal_time: newMeal.meal_time,
        title: newMeal.title,
        items: newMeal.items,
        instructions: newMeal.instructions,
        taken: false,
      };
      const res = await api.addDietCustomItem(dischargeId, 'meal', mealItem);
      if (res && res.dietPlan) {
        setDietPlan(res.dietPlan);
      }
      setNewMeal({ meal_time: 'Mid-Afternoon (4:00 PM)', title: '', items: '', instructions: '' });
      setShowAddMealForm(false);
    } catch (err) {
      console.error('Failed to add meal option:', err);
      alert('Could not add meal option. Please try again.');
    } finally {
      setIsSubmittingItem(false);
    }
  };

  // Add custom dietary add-on
  const handleAddAddOnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddOn.title.trim()) return;
    setIsSubmittingItem(true);
    try {
      const addOnItem: DietAddOnItem = {
        id: `addon_custom_${Date.now()}`,
        title: newAddOn.title,
        timing: newAddOn.timing,
        benefits: newAddOn.benefits,
        instructions: newAddOn.instructions,
        recommended: newAddOn.recommended,
        taken: false,
      };
      const res = await api.addDietCustomItem(dischargeId, 'addon', addOnItem);
      if (res && res.dietPlan) {
        setDietPlan(res.dietPlan);
      }
      setNewAddOn({ title: '', timing: 'Morning', benefits: '', instructions: '', recommended: true });
      setShowAddAddOnForm(false);
    } catch (err) {
      console.error('Failed to add dietary add-on:', err);
      alert('Could not add dietary add-on. Please try again.');
    } finally {
      setIsSubmittingItem(false);
    }
  };

  // Add custom patient care measure / precaution
  const handleAddMeasureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeasure.title.trim()) return;
    setIsSubmittingItem(true);
    try {
      const measureItem: DietMeasureItem = {
        id: `meas_custom_${Date.now()}`,
        title: newMeasure.title,
        category: newMeasure.category || 'Patient Care Measure',
        severity: newMeasure.severity,
        metric_limit: newMeasure.metric_limit,
        instruction: newMeasure.instruction,
        checked: false,
      };
      const res = await api.addDietCustomItem(dischargeId, 'measure', measureItem);
      if (res && res.dietPlan) {
        setDietPlan(res.dietPlan);
      }
      setNewMeasure({ title: '', category: 'General Precaution', severity: 'Important', metric_limit: '', instruction: '' });
      setShowAddMeasureForm(false);
    } catch (err) {
      console.error('Failed to add care measure:', err);
      alert('Could not add care measure. Please try again.');
    } finally {
      setIsSubmittingItem(false);
    }
  };

  // Audio speech synthesis in local language
  const handleListenChecklist = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setVoiceNotice('Audio speech synthesis is not supported in this browser.');
      return;
    }

    window.speechSynthesis.cancel();
    if (isPlayingAudio) {
      setIsPlayingAudio(false);
      return;
    }

    if (!data) return;

    let textToSpeak = `Hello ${data.patientName}. Here is your prescribed recovery plan from ${data.hospitalName}. `;
    
    if (mainTab !== 'diet') {
      textToSpeak += `Medications prescribed by ${data.doctorName}: `;
      data.allMedicines.forEach((m) => {
        textToSpeak += `Take ${m.name} ${m.strength}, ${m.food_instruction}. `;
        if (m.doctor_notes) {
          textToSpeak += `Doctor's note: ${m.doctor_notes}. `;
        }
      });
    }

    if (dietPlan && (mainTab === 'diet' || mainTab === 'all')) {
      textToSpeak += `Hospital Diet Plan: ${dietPlan.diet_type}. Target hydration: ${dietPlan.hydration_target}. Target calories: ${dietPlan.calories_target}. `;
      if (dietPlan.special_instructions) {
        textToSpeak += `Dietary guidelines: ${dietPlan.special_instructions}. `;
      }
      textToSpeak += `Important patient care measures: `;
      dietPlan.measures.forEach((meas) => {
        textToSpeak += `${meas.title}: ${meas.instruction}. `;
      });
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = langMeta.bcp47 || 'en-IN';
    utterance.rate = 0.92;
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="py-24 text-center max-w-lg mx-auto px-4">
        <div className="w-10 h-10 border-4 border-[#1E6F5C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-bold text-[#242A35]">
          {t.patientChecklist?.loadingPlan || 'Loading Prescribed Recovery Plan...'}
        </h3>
        <p className="text-xs text-[#5A6270] mt-1">
          {t.patientChecklist?.loadingPlanDesc || 'Fetching hospital doctor instructions, medicine checklist, and diet plan.'}
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-20 text-center max-w-md mx-auto px-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-[#242A35]">
          {t.patientChecklist?.notFoundTitle || 'Checklist Not Found'}
        </h3>
        <p className="mt-2 text-sm text-[#5A6270]">
          {error || t.patientChecklist?.notFoundDesc || 'Unable to retrieve prescription.'}
        </p>
        <button
          type="button"
          onClick={loadData}
          className="mt-4 px-5 py-2.5 bg-[#1E6F5C] text-white rounded-xl text-xs font-bold cursor-pointer"
        >
          {(t.patientChecklist as any)?.tryAgain || 'Try Again'}
        </button>
      </div>
    );
  }

  // Filter medicines according to selected slot tab
  const filterMedicines = () => {
    if (selectedSlotFilter === 'all') return data.allMedicines;
    if (selectedSlotFilter === 'subah') return data.checklistByTime.subah;
    if (selectedSlotFilter === 'dopahar') return data.checklistByTime.dopahar;
    if (selectedSlotFilter === 'shaam') return data.checklistByTime.shaam;
    if (selectedSlotFilter === 'raat') return data.checklistByTime.raat;
    if (selectedSlotFilter === 'sos') return data.checklistByTime.sos;
    if (selectedSlotFilter === 'pending') {
      return data.allMedicines.filter((m) => m.slotStatuses.some((ss) => !ss.isGiven));
    }
    return data.allMedicines;
  };

  const displayedMedicines = filterMedicines();

  // Diet adherence counts
  const mealsCount = dietPlan?.meals?.length || 0;
  const mealsTakenCount = dietPlan?.meals?.filter((m) => m.taken)?.length || 0;
  const addOnsCount = dietPlan?.add_ons?.length || 0;
  const addOnsTakenCount = dietPlan?.add_ons?.filter((a) => a.taken)?.length || 0;
  const measuresCount = dietPlan?.measures?.length || 0;
  const measuresCheckedCount = dietPlan?.measures?.filter((m) => m.checked)?.length || 0;

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* 1. Official Doctor Prescription Hospital Header Card */}
      <div className="bg-[#FFFDF9] rounded-3xl border border-[#EAE5DB] shadow-md shadow-stone-200/50 overflow-hidden">
        <div className="bg-gradient-to-r from-[#174F41] via-[#1E6754] to-[#257C66] text-white p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/25 text-[11px] font-bold uppercase tracking-wider text-emerald-100 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                  {t.patientChecklist?.portalBadge || 'Official Hospital Recovery Portal'}
                </span>
                <span className="text-xs text-emerald-100/80">
                  {t.patientChecklist?.dischargeDate || t.review?.dischargeDateLabel || 'Discharge Date:'} {data.dischargeDate}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {data.patientName} - {t.patientChecklist?.dailyRecoveryPlan || "Daily Recovery Plan"}
              </h1>
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-emerald-100/90">
                <span className="flex items-center gap-1.5 font-medium">
                  <Building2 className="w-4 h-4 text-emerald-300" />
                  {data.hospitalName}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 font-semibold">
                  <UserCheck className="w-4 h-4 text-emerald-300" />
                  {t.patientChecklist?.prescribedBy || 'Prescribed by'}: {data.doctorName}
                </span>
                <span>•</span>
                <span className="text-emerald-200">
                  {t.patientChecklist?.verifiedBy || 'Verified by'}: {data.nurseName}
                </span>
              </div>
            </div>

            {/* Patient ID & Hospital Helpline Badge */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 flex flex-col gap-2 shrink-0">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                  {t.patientChecklist?.patientAccessIdLabel || 'Hospital Patient Access ID'}
                </span>
                <div className="text-lg sm:text-xl font-mono font-black text-white">
                  {data.patientAccessId}
                </div>
              </div>
              <div className="border-t border-white/15 pt-2 flex items-center justify-between gap-4">
                <div className="text-xs text-emerald-100">
                  <span className="text-[10px] block text-emerald-300">
                    {t.patientChecklist?.helpdesk247 || (t.hero as any)?.receptionDesk || '24x7 Helpdesk'}
                  </span>
                  <span className="font-bold">{data.helpdeskNumber}</span>
                </div>
                <a
                  href={`tel:${data.helpdeskNumber}`}
                  className="px-3 py-1.5 bg-[#FFFDF9] text-[#174F41] hover:bg-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  {t.patientChecklist?.callHelpdesk || (t.hero as any)?.callDesk || 'Call'}
                </a>
              </div>
            </div>

          </div>
        </div>

        {/* Action Toolbar */}
        <div className="px-6 py-3.5 bg-[#F5F1E8] border-t border-[#EAE5DB] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#242A35]">
              {t.patientChecklist?.verifiedRecord || 'Verified Hospital Record:'}
            </span>
            <span className="text-[#5A6270]">
              {t.patientChecklist?.verifiedRecordDesc || 'Doctor notes, exact dosage times, clinical diet plan, and care precautions are synchronized.'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleListenChecklist}
              className={`px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isPlayingAudio
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-[#FFFDF9] hover:bg-white border border-[#DDD7CB] text-[#343C4A]'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5 text-[#1E6F5C]" />
              <span>
                {isPlayingAudio 
                  ? (t.patientChecklist?.stopAudio || 'Stop Audio') 
                  : (t.patientChecklist?.listenInstructions || t.myPlan?.listenPlan || 'Listen Instructions')}
              </span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-[#FFFDF9] hover:bg-white border border-[#DDD7CB] text-[#343C4A] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#5A6270]" />
              <span>{t.patientChecklist?.printSchedule || 'Print Schedule & Diet'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Voice notice popup banner if audio triggered fallback */}
      {voiceNotice && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
          <span>{voiceNotice}</span>
          <button type="button" onClick={() => setVoiceNotice(null)} className="text-amber-700 hover:text-amber-900 font-bold">✕</button>
        </div>
      )}

      {/* 2. MAIN NAVIGATION VIEW SWITCHER: MEDICINES vs HOSPITAL DIET & MEASURES vs ALL */}
      <div className="bg-[#FFFDF9] rounded-2xl p-2 border border-[#EAE5DB] shadow-xs flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setMainTab('all')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            mainTab === 'all'
              ? 'bg-[#1E6F5C] text-white shadow-xs'
              : 'text-[#4A5261] hover:text-[#242A35] hover:bg-[#F3EDE2]'
          }`}
        >
          <span>{t.patientChecklist?.tabAll || '📋 All-in-One Recovery View'}</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('medicines')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            mainTab === 'medicines'
              ? 'bg-[#1E6F5C] text-white shadow-xs'
              : 'text-[#4A5261] hover:text-[#242A35] hover:bg-[#F3EDE2]'
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>{t.patientChecklist?.tabMeds || 'Prescribed Medicines'} ({data.allMedicines.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('diet')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            mainTab === 'diet'
              ? 'bg-[#1E6F5C] text-white shadow-xs'
              : 'text-[#4A5261] hover:text-[#242A35] hover:bg-[#F3EDE2]'
          }`}
        >
          <Salad className="w-4 h-4 text-emerald-400" />
          <span>{t.patientChecklist?.tabDiet || 'Hospital Diet Plan, Add-Ons & Measures'} ({mealsCount + addOnsCount + measuresCount})</span>
        </button>
      </div>

      {/* 3. SECTION: PRESCRIBED MEDICINES (Rendered if mainTab === 'all' or 'medicines') */}
      {(mainTab === 'all' || mainTab === 'medicines') && (
        <div className="space-y-6">
          
          {/* Adherence Progress Meter */}
          <div className="bg-[#FFFDF9] rounded-3xl border border-[#EAE5DB] p-6 sm:p-7 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-[#1E6F5C] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#1E6F5C]" />
                  {t.patientChecklist?.adherenceTitle || "Today's Prescribed Medicine Adherence"}
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#242A35]">
                  {data.adherence.takenDoses} / {data.adherence.totalDoses} {t.patientChecklist?.dosesTakenOf || 'Doses Taken'} ({data.adherence.percentage}%)
                </h2>
                <p className="text-xs text-[#5A6270]">
                  {data.adherence.percentage === 100
                    ? (t.patientChecklist?.progressGood || 'Outstanding! All prescribed medicines have been taken for today.')
                    : data.adherence.percentage >= 50
                    ? (t.patientChecklist?.progressHalf || 'Great progress! Continue following the doctor schedule for your evening and night doses.')
                    : (t.patientChecklist?.progressStart || 'Please take your scheduled medicines according to the doctor timings below.')}
                </p>
              </div>

              {/* Adherence Visual Ring / Indicator */}
              <div className="w-full sm:w-64 bg-[#EFEAE0] rounded-full h-4 overflow-hidden border border-[#E0D9CD] p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#1E6F5C] to-[#2C8B74] transition-all duration-500"
                  style={{ width: `${Math.max(5, data.adherence.percentage)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Time Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#EAE5DB]">
            {[
              { id: 'all', label: `${t.patientChecklist?.tabAll ? t.patientChecklist.tabAll.replace(/[^\\w\\s\\u0900-\\u0D7F]/gu, '').trim() : 'All'} (${data.allMedicines.length})`, icon: Pill },
              { id: 'subah', label: `${t.patientChecklist?.morningTab || t.myPlan?.subah || 'Morning'} (${data.checklistByTime.subah.length})`, icon: Sun },
              { id: 'dopahar', label: `${t.patientChecklist?.afternoonTab || t.myPlan?.dopahar || 'Afternoon'} (${data.checklistByTime.dopahar.length})`, icon: Sun },
              { id: 'shaam', label: `${t.patientChecklist?.eveningTab || t.myPlan?.shaam || 'Evening'} (${data.checklistByTime.shaam.length})`, icon: Sunset },
              { id: 'raat', label: `${t.patientChecklist?.nightTab || t.myPlan?.raat || 'Night'} (${data.checklistByTime.raat.length})`, icon: Moon },
              { id: 'pending', label: t.patientChecklist?.pendingTab || 'Pending Doses Only', icon: Clock },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = selectedSlotFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedSlotFilter(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#1E6F5C] text-white shadow-xs'
                      : 'bg-[#FFFDF9] text-[#4A5261] hover:text-[#242A35] hover:bg-[#F5F1E8] border border-[#DDD7CB]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Medicine Checklist Items with Highlighted Doctor's Note */}
          <div className="space-y-4">
            {displayedMedicines.length === 0 ? (
              <div className="bg-[#FFFDF9] rounded-3xl p-12 text-center border border-[#EAE5DB]">
                <CheckCircle2 className="w-12 h-12 text-[#1E6F5C] mx-auto mb-3" />
                <h3 className="text-lg font-bold text-[#242A35]">
                  {t.patientChecklist?.noPendingSlot || 'No Pending Medicines in this Time Slot'}
                </h3>
                <p className="text-xs text-[#5A6270] mt-1">
                  {t.patientChecklist?.noPendingDesc || 'All doses in this section have been marked taken or none were prescribed for this slot.'}
                </p>
              </div>
            ) : (
              displayedMedicines.map((med) => {
                return (
                  <div
                    key={med.id}
                    className="bg-[#FFFDF9] rounded-3xl border border-[#EAE5DB] hover:border-[#BED6C8] transition-all p-5 sm:p-7 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      
                      {/* Medicine Details */}
                      <div className="space-y-2 flex-grow">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-[#EEF5F1] text-[#1B6151] border border-[#CFE2D7] text-xs font-bold uppercase tracking-wider">
                            {localizeDosageForm(med.dosage_form)}
                          </span>
                          <h3 className="text-xl sm:text-2xl font-extrabold text-[#242A35] tracking-tight">
                            {med.name} {med.strength}
                          </h3>
                          <span className="text-xs text-[#5A6270] font-mono">
                            ({med.frequency_code} · {med.duration})
                          </span>
                        </div>

                        {/* Food Instruction & Prescribed Doctor */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="px-3 py-1 rounded-xl bg-[#FBF4E6] text-[#7A4B10] border border-[#EED7B0] font-semibold flex items-center gap-1.5">
                            <span>🍽️</span>
                            <span>{localizeFoodInstruction(med.food_instruction)}</span>
                          </span>

                          <span className="px-3 py-1 rounded-xl bg-[#EEF2F6] text-[#203957] border border-[#D5DEE8] font-medium flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-[#244265]" />
                            <span>{t.patientChecklist?.prescribedBy || 'Prescribed by'} {med.prescribed_by || data.doctorName}</span>
                          </span>
                        </div>

                        {/* HIGHLIGHTED DOCTOR NOTE (Assigned during prescription) */}
                        {med.doctor_notes && (
                          <div className="mt-2.5 bg-[#EEF6F2] border border-[#BED6C8] rounded-2xl p-4 space-y-1">
                            <div className="flex items-center gap-2 text-xs font-extrabold text-[#14473B]">
                              <Stethoscope className="w-4 h-4 text-[#1E6F5C]" />
                              <span>{t.patientChecklist?.doctorNotesBadge || "Doctor's Special Note & Care Indication:"}</span>
                              <span className="ml-auto text-[10px] bg-white text-[#1B6151] px-2 py-0.5 rounded-full font-bold border border-[#BED6C8]">
                                {t.patientChecklist?.highPriorityBadge || 'High Priority'}
                              </span>
                            </div>
                            <p className="text-xs text-[#2A473D] leading-relaxed font-medium pl-6">
                              {med.doctor_notes}
                            </p>
                          </div>
                        )}

                        <div className="pt-2">
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

                      {/* Nurse Verified Badge */}
                      <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-1 text-[11px] text-[#5A6270]">
                        <span className="inline-flex items-center gap-1 text-[#1B6151] bg-[#EEF5F1] px-2.5 py-1 rounded-full border border-[#CFE2D7] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t.patientChecklist?.nurseVerified || t.review?.badgeApproved || 'Nurse Verified'}
                        </span>
                      </div>
                    </div>

                    {/* Per-Slot Checklist Toggle Buttons */}
                    <div className="border-t border-[#EAE5DB] pt-4">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-[#737C8B] mb-2.5">
                        {t.patientChecklist?.markDoseStatus || 'Mark Dose Status for Today:'}
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {med.slotStatuses.map((status) => {
                          const slotLabel = 
                            status.slot === 'subah' ? (t.patientChecklist?.morningTab || t.myPlan?.subah || 'Morning (8:00 AM)') :
                            status.slot === 'dopahar' ? (t.patientChecklist?.afternoonTab || t.myPlan?.dopahar || 'Afternoon (1:00 PM)') :
                            status.slot === 'shaam' ? (t.patientChecklist?.eveningTab || t.myPlan?.shaam || 'Evening (5:00 PM)') :
                            status.slot === 'raat' ? (t.patientChecklist?.nightTab || t.myPlan?.raat || 'Night (9:00 PM)') : (t.vocabulary?.sos || 'SOS As Needed');

                          return (
                            <button
                              key={status.slot}
                              type="button"
                              onClick={() => handleToggleDose(med.id, status.slot, status.isGiven)}
                              className={`p-3.5 rounded-2xl border transition-all text-left flex items-start gap-3 cursor-pointer ${
                                status.isGiven
                                  ? 'bg-[#EEF6F2] border-[#BED6C8] text-[#134437] shadow-xs'
                                  : 'bg-[#FAF7F2] hover:bg-[#F3EDE2] border-[#DDD7CB] text-[#343C4A]'
                              }`}
                            >
                              <div
                                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors mt-0.5 ${
                                  status.isGiven
                                    ? 'bg-[#1E6F5C] text-white'
                                    : 'border-2 border-[#C8C0B2] bg-[#FFFDF9]'
                                }`}
                              >
                                {status.isGiven && <Check className="w-4 h-4 stroke-[3]" />}
                              </div>

                              <div className="flex-grow">
                                <span className="text-xs font-bold block">
                                  {slotLabel}
                                </span>
                                <span className="text-[11px] text-[#5A6270] block mt-0.5">
                                  {status.isGiven ? (
                                    <span className="text-[#1B6151] font-semibold">
                                      ✓ {t.patientChecklist?.doseTaken || t.myPlan?.given || 'Taken'} {status.givenAt ? `${t.patientChecklist?.takenAt || 'at'} ${status.givenAt}` : ''}
                                    </span>
                                  ) : (
                                    <span className="text-[#8E95A2]">{t.patientChecklist?.markTaken || t.myPlan?.markGiven || 'Click to mark taken'}</span>
                                  )}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 4. SECTION: HOSPITAL DIET PLAN, ADD-ONS & PATIENT CARE MEASURES */}
      {(mainTab === 'all' || mainTab === 'diet') && (
        <div className="space-y-8 pt-4">
          
          {/* Main Hospital Diet Plan Overview Card */}
          <div className="bg-[#FFFDF9] rounded-3xl border border-[#EAE5DB] shadow-sm p-6 sm:p-8 space-y-6">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EAE5DB] pb-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1E6F5C] to-[#2E8B75] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Salad className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#EAF3EE] text-[#1E6F5C] border border-[#CFE2D7] text-[11px] font-extrabold uppercase tracking-wider">
                      {t.patientChecklist?.hospitalDietPlan || 'Hospital Clinical Diet Plan'}
                    </span>
                    <span className="text-xs text-[#5A6270]">
                      {t.patientChecklist?.prescribedBy || 'Prescribed by'}: {dietPlan?.prescribed_by || data.doctorName}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[#242A35] mt-1 tracking-tight">
                    {dietPlan?.diet_type || 'AIIMS Low Sodium Cardiac Care Recovery Diet'}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#5A6270] mt-1">
                    {t.patientChecklist?.dietSubtitle || 'Therapeutic nutrition regimen tailored for vascular recovery, stent protection, and optimal blood pressure regulation.'}
                  </p>
                </div>
              </div>

              {/* Diet Targets Pills */}
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div className="bg-[#FAF7F2] border border-[#DDD7CB] rounded-2xl p-3 flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-orange-100 text-orange-700">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] block font-bold text-[#737C8B] uppercase">
                      {t.patientChecklist?.dailyCalories || 'Daily Calories'}
                    </span>
                    <span className="text-xs font-black text-[#242A35]">{dietPlan?.calories_target || '1,800 kcal / day'}</span>
                  </div>
                </div>

                <div className="bg-[#FAF7F2] border border-[#DDD7CB] rounded-2xl p-3 flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
                    <Droplets className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] block font-bold text-[#737C8B] uppercase">
                      {t.patientChecklist?.fluidCap || 'Strict Fluid Cap'}
                    </span>
                    <span className="text-xs font-black text-[#242A35]">{dietPlan?.hydration_target || '1,500 mL / 24 hrs'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Special Instructions banner */}
            {dietPlan?.special_instructions && (
              <div className="p-4 rounded-2xl bg-[#F7F4EC] border border-[#E7DFD0] flex items-start gap-3">
                <Info className="w-5 h-5 text-[#8A6D3B] shrink-0 mt-0.5" />
                <div className="text-xs text-[#4A5261] space-y-0.5">
                  <span className="font-bold text-[#242A35] block">
                    {t.patientChecklist?.dieticianGuidance || 'Clinical Dietician Guidance:'}
                  </span>
                  <p className="leading-relaxed">{dietPlan.special_instructions}</p>
                </div>
              </div>
            )}

            {/* Nutrition Compliance Summary Meter */}
            <div className="bg-[#FAF7F2] rounded-2xl p-4 sm:p-5 border border-[#EAE5DB] grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="bg-white rounded-xl p-3 border border-[#E3DDCF]">
                <span className="text-xs font-bold text-[#5A6270]">
                  {t.patientChecklist?.mealsEaten || 'Meals Eaten Today'}
                </span>
                <p className="text-xl font-extrabold text-[#1E6F5C] mt-0.5">{mealsTakenCount} / {mealsCount}</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-[#E3DDCF]">
                <span className="text-xs font-bold text-[#5A6270]">
                  {t.patientChecklist?.addOnsTaken || 'Clinical Add-Ons Taken'}
                </span>
                <p className="text-xl font-extrabold text-[#244265] mt-0.5">{addOnsTakenCount} / {addOnsCount}</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-[#E3DDCF]">
                <span className="text-xs font-bold text-[#5A6270]">
                  {t.patientChecklist?.measuresConfirmed || 'Care Measures Confirmed'}
                </span>
                <p className="text-xl font-extrabold text-[#7E241B] mt-0.5">{measuresCheckedCount} / {measuresCount}</p>
              </div>
            </div>

          </div>

          {/* SUBSECTION A: SCHEDULED MEAL OPTIONS & ADD OPTION */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#242A35] flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-[#1E6F5C]" />
                  <span>{t.patientChecklist?.dailyMealsTitle || 'Daily Scheduled Meal Options'} ({dietPlan?.meals?.length || 0})</span>
                </h3>
                <p className="text-xs text-[#5A6270] mt-0.5">
                  {t.patientChecklist?.dailyMealsDesc || 'Follow prescribed breakfast, lunch, and dinner guidelines. Click checkbox after eating to log compliance.'}
                </p>
              </div>

              {/* Add Meal Option Button */}
              <button
                type="button"
                onClick={() => setShowAddMealForm(!showAddMealForm)}
                className="px-4 py-2 rounded-xl bg-[#1E6F5C] hover:bg-[#18594A] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>{t.patientChecklist?.addMealBtn || 'Add Meal Option'}</span>
              </button>
            </div>

            {/* Inline Add Meal Option Form */}
            {showAddMealForm && (
              <form onSubmit={handleAddMealSubmit} className="bg-[#FFFDF9] rounded-2xl border-2 border-[#1E6F5C] p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#EAE5DB] pb-3">
                  <h4 className="text-sm font-bold text-[#1E6F5C] flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    <span>{t.patientChecklist?.addMealModalTitle || 'Add New Meal Option to Recovery Plan'}</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAddMealForm(false)}
                    className="p-1 rounded-lg text-[#5A6270] hover:bg-[#F3EDE2]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-[#242A35] mb-1">Meal Time Slot (e.g. Evening Snack (4:30 PM))</label>
                    <input
                      type="text"
                      value={newMeal.meal_time}
                      onChange={(e) => setNewMeal({ ...newMeal, meal_time: e.target.value })}
                      required
                      placeholder="e.g. Evening Snack (4:30 PM)"
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#DDD7CB] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#242A35] mb-1">Meal Title / Headline</label>
                    <input
                      type="text"
                      value={newMeal.title}
                      onChange={(e) => setNewMeal({ ...newMeal, title: e.target.value })}
                      required
                      placeholder="e.g. Roasted Plain Makhana & Green Tea"
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#DDD7CB] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-[#242A35] mb-1">Food Items & Portions</label>
                    <textarea
                      rows={2}
                      value={newMeal.items}
                      onChange={(e) => setNewMeal({ ...newMeal, items: e.target.value })}
                      required
                      placeholder="e.g. 1 small cup dry roasted fox nuts, 1 cup unsweetened green tea, lemon slice"
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#DDD7CB] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-[#242A35] mb-1">Preparation & Eating Instructions</label>
                    <input
                      type="text"
                      value={newMeal.instructions}
                      onChange={(e) => setNewMeal({ ...newMeal, instructions: e.target.value })}
                      placeholder="e.g. Zero salt, roast with cumin only, eat slowly"
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#DDD7CB] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMealForm(false)}
                    className="px-4 py-2 rounded-xl border border-[#DDD7CB] text-xs font-semibold text-[#5A6270] hover:bg-[#F3EDE2]"
                  >
                    {t.patientChecklist?.cancel || 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingItem}
                    className="px-5 py-2 rounded-xl bg-[#1E6F5C] hover:bg-[#18594A] text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-60"
                  >
                    {isSubmittingItem ? 'Saving Meal Option...' : (t.patientChecklist?.saveMealBtn || 'Save Meal Option')}
                  </button>
                </div>
              </form>
            )}

            {/* Meal Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dietPlan?.meals?.map((meal) => (
                <div
                  key={meal.id}
                  className={`p-5 rounded-3xl border transition-all flex flex-col justify-between gap-4 ${
                    meal.taken
                      ? 'bg-[#EEF6F2] border-[#BED6C8] shadow-xs'
                      : 'bg-[#FFFDF9] border-[#EAE5DB] hover:border-[#BED6C8]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-3 py-1 rounded-full bg-[#FAF7F2] border border-[#E3DDCF] text-xs font-bold text-[#1E6F5C]">
                        {meal.meal_time}
                      </span>
                      {meal.taken && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1B6151] bg-white px-2.5 py-0.5 rounded-full border border-[#BED6C8]">
                          <Check className="w-3.5 h-3.5" />
                          {t.patientChecklist?.eatenToday || 'Eaten Today'}
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-extrabold text-[#242A35]">
                      {meal.title}
                    </h4>

                    <div className="p-3 bg-white/80 rounded-2xl border border-[#EAE5DB] text-xs text-[#343C4A] leading-relaxed">
                      <strong className="text-[#242A35] block mb-0.5">
                        {t.patientChecklist?.recommendedFoods || 'Recommended Foods:'}
                      </strong>
                      {meal.items}
                    </div>

                    {meal.instructions && (
                      <p className="text-[11px] text-[#5A6270] bg-[#FAF7F2] p-2.5 rounded-xl border border-[#EFEAE0]">
                        <span className="font-bold text-[#242A35]">
                          {t.patientChecklist?.instructionsLabel || 'Instructions:'}{' '}
                        </span>
                        {meal.instructions}
                      </p>
                    )}
                  </div>

                  {/* Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleDietItem('meal', meal.id, Boolean(meal.taken))}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      meal.taken
                        ? 'bg-[#1E6F5C] text-white shadow-xs'
                        : 'bg-[#FAF7F2] hover:bg-[#F3EDE2] text-[#343C4A] border border-[#DDD7CB]'
                    }`}
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span>
                      {meal.taken 
                        ? (t.patientChecklist?.markedEatenUndo || 'Marked Eaten (Click to Undo)') 
                        : (t.patientChecklist?.markEaten || 'Mark as Eaten / Consumed')}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* SUBSECTION B: CLINICAL DIETARY ADD-ONS & ADD OPTION */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#242A35] flex items-center gap-2">
                  <Apple className="w-5 h-5 text-[#244265]" />
                  <span>{t.patientChecklist?.dietaryAddonsTitle || 'Clinical Dietary Add-Ons'} ({dietPlan?.add_ons?.length || 0})</span>
                </h3>
                <p className="text-xs text-[#5A6270] mt-0.5">
                  {t.patientChecklist?.dietaryAddonsDesc || 'Natural therapeutic boosters and electrolytes to support cardiac endothelium, blood vessels, and recovery.'}
                </p>
              </div>

              {/* Add Add-On Button */}
              <button
                type="button"
                onClick={() => setShowAddAddOnForm(!showAddAddOnForm)}
                className="px-4 py-2 rounded-xl bg-[#244265] hover:bg-[#1A3451] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>{t.patientChecklist?.addAddonBtn || 'Add Dietary Add-On'}</span>
              </button>
            </div>

            {/* Inline Add Add-On Form */}
            {showAddAddOnForm && (
              <form onSubmit={handleAddAddOnSubmit} className="bg-[#FFFDF9] rounded-2xl border-2 border-[#244265] p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#EAE5DB] pb-3">
                  <h4 className="text-sm font-bold text-[#244265] flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    <span>Add New Clinical Dietary Add-On</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAddAddOnForm(false)}
                    className="p-1 rounded-lg text-[#5A6270] hover:bg-[#F3EDE2]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-[#242A35] mb-1">Add-On Title (e.g. High-Protein Moong Broth)</label>
                    <input
                      type="text"
                      value={newAddOn.title}
                      onChange={(e) => setNewAddOn({ ...newAddOn, title: e.target.value })}
                      required
                      placeholder="e.g. Fresh Tender Coconut Water"
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#DDD7CB] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#244265] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#242A35] mb-1">Timing / Frequency</label>
                    <input
                      type="text"
                      value={newAddOn.timing}
                      onChange={(e) => setNewAddOn({ ...newAddOn, timing: e.target.value })}
                      required
                      placeholder="e.g. Mid-Morning (11:00 AM)"
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#DDD7CB] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#244265] focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-[#242A35] mb-1">Clinical Recovery Benefits</label>
                    <input
                      type="text"
                      value={newAddOn.benefits}
                      onChange={(e) => setNewAddOn({ ...newAddOn, benefits: e.target.value })}
                      required
                      placeholder="e.g. Natural bio-active potassium & magnesium electrolytes to support vascular tone"
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#DDD7CB] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#244265] focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-[#242A35] mb-1">Preparation & Ingestion Instructions</label>
                    <input
                      type="text"
                      value={newAddOn.instructions}
                      onChange={(e) => setNewAddOn({ ...newAddOn, instructions: e.target.value })}
                      placeholder="e.g. Drink freshly opened; do not store in refrigerator or add black salt"
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#DDD7CB] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#244265] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddAddOnForm(false)}
                    className="px-4 py-2 rounded-xl border border-[#DDD7CB] text-xs font-semibold text-[#5A6270] hover:bg-[#F3EDE2]"
                  >
                    {t.patientChecklist?.cancel || 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingItem}
                    className="px-5 py-2 rounded-xl bg-[#244265] hover:bg-[#1A3451] text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-60"
                  >
                    {isSubmittingItem ? 'Saving Add-On...' : 'Save Dietary Add-On'}
                  </button>
                </div>
              </form>
            )}

            {/* Add-Ons Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {dietPlan?.add_ons?.map((addon) => (
                <div
                  key={addon.id}
                  className={`p-5 rounded-3xl border transition-all flex flex-col justify-between gap-4 ${
                    addon.taken
                      ? 'bg-[#EEF3F8] border-[#CFDEEC] shadow-xs'
                      : 'bg-[#FFFDF9] border-[#EAE5DB] hover:border-[#CFDEEC]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#E5EEF6] text-[#244265] text-[10px] font-bold uppercase tracking-wider">
                        {addon.timing}
                      </span>
                      {addon.recommended && (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                          {t.patientChecklist?.hospitalRecommended || 'Hospital Recommended'}
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-extrabold text-[#19324B]">
                      {addon.title}
                    </h4>

                    <div className="p-3 bg-white/90 rounded-2xl border border-[#DFE7EF] text-xs text-[#25456A] leading-relaxed">
                      <strong className="text-[#19324B] block mb-0.5">
                        {t.patientChecklist?.therapeuticBenefit || 'Therapeutic Benefit:'}
                      </strong>
                      {addon.benefits}
                    </div>

                    {addon.instructions && (
                      <p className="text-[11px] text-[#4A5E73] bg-[#F7F9FC] p-2.5 rounded-xl border border-[#E5EDF5]">
                        <span className="font-bold text-[#19324B]">Note: </span>
                        {addon.instructions}
                      </p>
                    )}
                  </div>

                  {/* Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleDietItem('addon', addon.id, Boolean(addon.taken))}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      addon.taken
                        ? 'bg-[#244265] text-white shadow-xs'
                        : 'bg-[#FAF7F2] hover:bg-[#F3EDE2] text-[#343C4A] border border-[#DDD7CB]'
                    }`}
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span>
                      {addon.taken 
                        ? (t.patientChecklist?.addonTakenUndo || 'Taken Today (Click to Undo)') 
                        : (t.patientChecklist?.markAddonTaken || 'Mark as Taken Today')}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* SUBSECTION C: SPACE FOR THE MEASURES THAT SHOULD BE TAKEN CARE OF FOR A PATIENT */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#242A35] flex items-center gap-2">
                  <HeartPulse className="w-5 h-5 text-[#C93B2F]" />
                  <span>{t.patientChecklist?.criticalMeasuresTitle || 'Space for Critical Measures & Precautions'} ({dietPlan?.measures?.length || 0})</span>
                </h3>
                <p className="text-xs text-[#5A6270] mt-0.5">
                  {t.patientChecklist?.criticalMeasuresDesc || 'Mandatory safety restrictions, daily fluid and sodium limits, and vital precautions for patient protection.'}
                </p>
              </div>

              {/* Add Care Measure Button */}
              <button
                type="button"
                onClick={() => setShowAddMeasureForm(!showAddMeasureForm)}
                className="px-4 py-2 rounded-xl bg-[#8C281F] hover:bg-[#721F17] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>{t.patientChecklist?.addMeasureBtn || 'Add Care Measure'}</span>
              </button>
            </div>

            {/* Inline Add Care Measure Form */}
            {showAddMeasureForm && (
              <form onSubmit={handleAddMeasureSubmit} className="bg-[#FFFDF9] rounded-2xl border-2 border-[#8C281F] p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#EAE5DB] pb-3">
                  <h4 className="text-sm font-bold text-[#8C281F] flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    <span>Add New Patient Care Measure / Safety Precaution</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAddMeasureForm(false)}
                    className="p-1 rounded-lg text-[#5A6270] hover:bg-[#F3EDE2]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-[#242A35] mb-1">Precaution Title (e.g. Strict Salt Intake Limit)</label>
                    <input
                      type="text"
                      value={newMeasure.title}
                      onChange={(e) => setNewMeasure({ ...newMeasure, title: e.target.value })}
                      required
                      placeholder="e.g. Strict Sodium (Salt) Restriction"
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#DDD7CB] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#8C281F] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#242A35] mb-1">Severity Level</label>
                    <select
                      value={newMeasure.severity}
                      onChange={(e) => setNewMeasure({ ...newMeasure, severity: e.target.value as any })}
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#DDD7CB] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#8C281F] focus:outline-none"
                    >
                      <option value="Critical">Critical (Immediate Hazard)</option>
                      <option value="Important">Important (Core Recovery)</option>
                      <option value="Warning">Warning (Drug Interaction)</option>
                      <option value="Monitoring">Monitoring (Vitals Check)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-[#242A35] mb-1">Category</label>
                    <input
                      type="text"
                      value={newMeasure.category}
                      onChange={(e) => setNewMeasure({ ...newMeasure, category: e.target.value })}
                      placeholder="e.g. Salt & Electrolytes, Fluid Monitoring"
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#DDD7CB] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#8C281F] focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-[#242A35] mb-1">Metric Limit / Numerical Target</label>
                    <input
                      type="text"
                      value={newMeasure.metric_limit}
                      onChange={(e) => setNewMeasure({ ...newMeasure, metric_limit: e.target.value })}
                      placeholder="e.g. Max 2.0g salt (< 1/2 tsp) / 24 hrs or Max 1,500 mL fluid"
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#DDD7CB] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#8C281F] focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block font-bold text-[#242A35] mb-1">Detailed Clinical Care Instruction</label>
                    <textarea
                      rows={2}
                      value={newMeasure.instruction}
                      onChange={(e) => setNewMeasure({ ...newMeasure, instruction: e.target.value })}
                      required
                      placeholder="e.g. Eliminate pickles, papad, namkeen. Do not keep salt shaker at dining table."
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#DDD7CB] rounded-xl focus:bg-white focus:ring-2 focus:ring-[#8C281F] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMeasureForm(false)}
                    className="px-4 py-2 rounded-xl border border-[#DDD7CB] text-xs font-semibold text-[#5A6270] hover:bg-[#F3EDE2]"
                  >
                    {t.patientChecklist?.cancel || 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingItem}
                    className="px-5 py-2 rounded-xl bg-[#8C281F] hover:bg-[#721F17] text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-60"
                  >
                    {isSubmittingItem ? 'Saving Measure...' : 'Save Care Measure'}
                  </button>
                </div>
              </form>
            )}

            {/* Measures Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dietPlan?.measures?.map((meas) => {
                const severityStyle = 
                  meas.severity === 'Critical'
                    ? 'bg-[#FDF2F0] border-[#F6CBC5] text-[#8C281F]'
                    : meas.severity === 'Warning'
                    ? 'bg-[#FFF8EE] border-[#FCE1B6] text-[#A66113]'
                    : meas.severity === 'Monitoring'
                    ? 'bg-[#F6F4FA] border-[#DED4ED] text-[#553285]'
                    : 'bg-[#EEF3F8] border-[#CFDEEC] text-[#1D3E64]';

                const badgeBg = 
                  meas.severity === 'Critical' ? 'bg-[#C93B2F] text-white' :
                  meas.severity === 'Warning' ? 'bg-[#D97706] text-white' :
                  meas.severity === 'Monitoring' ? 'bg-[#7C3AED] text-white' : 'bg-[#2563EB] text-white';

                return (
                  <div
                    key={meas.id}
                    className={`p-5 rounded-3xl border transition-all flex flex-col justify-between gap-4 ${
                      meas.checked
                        ? 'bg-[#EEF6F2] border-[#BED6C8] shadow-xs'
                        : severityStyle
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${badgeBg}`}>
                          {meas.severity} {t.patientChecklist?.measureWord || 'Measure'}
                        </span>
                        <span className="text-[11px] font-bold text-[#5A6270]">
                          {meas.category}
                        </span>
                      </div>

                      <h4 className="text-base font-extrabold text-[#242A35]">
                        {meas.title}
                      </h4>

                      {meas.metric_limit && (
                        <div className="inline-block px-3 py-1 rounded-xl bg-white/90 border border-current text-xs font-mono font-bold">
                          🎯 {meas.metric_limit}
                        </div>
                      )}

                      <p className="text-xs text-[#343C4A] bg-white/80 p-3 rounded-2xl border border-current/20 leading-relaxed">
                        {meas.instruction}
                      </p>
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleDietItem('measure', meas.id, Boolean(meas.checked))}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        meas.checked
                          ? 'bg-[#1E6F5C] text-white shadow-xs'
                          : 'bg-white hover:bg-[#FAF7F2] text-[#242A35] border border-current/30'
                      }`}
                    >
                      <CheckSquare className="w-4 h-4" />
                      <span>{meas.checked ? (t.patientChecklist?.measureFollowed || '✓ Measure Followed Today') : (t.patientChecklist?.confirmMeasure || 'Confirm Following Measure')}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* 5. Doctor's Follow-up OPD Appointment & Emergency Warning Signs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        
        {/* Follow-up Visit */}
        <div className="bg-[#FFFDF9] rounded-3xl border border-[#EAE5DB] p-6 shadow-xs">
          <div className="flex items-center gap-2.5 text-[#242A35] font-bold text-sm mb-3">
            <Calendar className="w-5 h-5 text-[#244265]" />
            <span>{t.myPlan?.followupTitle || "Doctor's Scheduled OPD Review"}</span>
          </div>
          {data.followUps && data.followUps.length > 0 ? (
            <div className="space-y-2">
              {data.followUps.map((fu) => (
                <div key={fu.id} className="p-4 rounded-2xl bg-[#EEF3F8] border border-[#CFDEEC] text-xs sm:text-sm text-[#1B3552] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">{fu.text}</p>
                    <p className="text-[#25456A] text-xs mt-1">{t.patientChecklist?.dueDate || 'Due Date:'} {fu.due_date || 'Within 7-10 days'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenWhatsApp('Follow-up or appointment', undefined, fu.text)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-[#CFDEEC] hover:border-[#1E6F5C] text-xs font-bold text-[#14473B] inline-flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto shrink-0"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#25D366] fill-[#25D366]" />
                    <span>{t.askWhatsApp?.askAboutFollowup || 'Ask about this follow-up'}</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#5A6270]">
              {t.patientChecklist?.noFollowupDesc || 'Review at OPD as instructed on your discharge card.'}
            </p>
          )}
        </div>

        {/* SOS Emergency Red Warnings */}
        <div className="bg-[#FDF3F1] rounded-3xl border border-[#F5D0C9] p-6 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 text-[#7E241B] font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-[#C93B2F]" />
              <span>{t.review?.warningsHeader || 'Emergency Warning Signs (SOS)'}</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`tel:${data.helpdeskNumber}`}
                className="px-3 py-1 bg-[#C93B2F] hover:bg-[#B32E23] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                {t.hero?.btnCallHelpdesk || 'Call Ward'}
              </a>
              <button
                type="button"
                onClick={() => handleOpenWhatsApp('Side effect or new symptom', undefined, 'Emergency Warning Signs (SOS)')}
                className="px-2.5 py-1 bg-white border border-[#F5D0C9] hover:border-[#1E6F5C] text-[#14473B] rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <MessageSquare className="w-3 h-3 text-[#25D366] fill-[#25D366]" />
                <span>{t.askWhatsApp?.askDoctorIf || 'Ask on WhatsApp'}</span>
              </button>
            </div>
          </div>
          {data.warnings && data.warnings.length > 0 ? (
            <div className="space-y-2">
              {data.warnings.map((w) => (
                <div key={w.id} className="p-3.5 rounded-2xl bg-[#FFFDF9] border border-[#F5D0C9] text-xs text-[#7E241B]">
                  <p className="font-bold text-[#8C281F]">{w.text}</p>
                  {w.action_text && (
                    <p className="text-[#5A6270] mt-1 font-medium">{w.action_text}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#7E241B]">
              {t.patientChecklist?.sosNotice || 'SOS if severe chest discomfort, breathlessness, or sudden weakness. Call emergency desk immediately.'}
            </p>
          )}
        </div>

      </div>

      {/* 6. AI Studio Safety Questions Box */}
      <SafetyBox lang={lang} helpdeskNumber={data.helpdeskNumber} />

      {/* Feature 2: Floating "WhatsApp Reception" Button Fixed to Bottom-Left Corner */}
      <div className="fixed bottom-6 left-6 z-40 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pointer-events-auto">
        <button
          type="button"
          onClick={() => handleOpenWhatsApp()}
          aria-label={t.askWhatsApp?.floatingBtn || 'WhatsApp Reception'}
          className="min-h-[48px] min-w-[48px] px-3.5 sm:px-4 py-3 rounded-2xl bg-[#25D366] hover:bg-[#20BA5A] active:bg-[#1CA04D] text-white font-bold text-xs sm:text-sm shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/20 focus:outline-none focus:ring-4 focus:ring-emerald-400/40"
          title={t.askWhatsApp?.floatingBtn || 'WhatsApp Reception'}
        >
          <MessageSquare className="w-5 h-5 fill-current shrink-0" />
          <span className="hidden sm:inline whitespace-nowrap font-bold">
            {t.askWhatsApp?.floatingBtn || 'WhatsApp Reception'}
          </span>
        </button>
      </div>

      <AskWhatsAppModal
        isOpen={whatsAppModalOpen}
        onClose={() => setWhatsAppModalOpen(false)}
        lang={lang}
        dischargeId={dischargeId}
        patientName={data.patientName}
        medicineList={data.allMedicines.map((m) => `${m.name} (${m.frequency_code || 'Daily'})`)}
        initialCategory={whatsAppModalCategory}
        initialMedicineName={whatsAppModalMedName}
        initialFollowupText={whatsAppModalFollowup}
      />

    </div>
  );
};
