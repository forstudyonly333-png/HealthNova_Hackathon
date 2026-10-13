import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Stethoscope, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  KeyRound, 
  Copy, 
  Check, 
  FileText, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  UserPlus, 
  Upload, 
  Calendar,
  ExternalLink,
  Info,
  Salad,
  Utensils,
  Apple,
  Sparkles,
  X,
  Heart,
  ChevronDown,
  ChevronUp,
  MessageSquare
} from 'lucide-react';
import { 
  api, 
  HospitalStaffUser, 
  PatientCredentialItem, 
  PrescribePayload, 
  PrescribePayloadMedicine,
  DietMealItem,
  DietAddOnItem,
  DietMeasureItem,
  DietPlan
} from '../api';
import { Language, translations } from '../i18n';
import { HospitalSettingsPage } from './HospitalSettingsPage';
import { ZeroAppRemindersView } from './ZeroAppRemindersView';
import { getReceptionCall } from '../config/reception';

interface HospitalPortalProps {
  lang: Language;
  staffUser: HospitalStaffUser;
  onViewPatientChecklist: (dischargeId: string) => void;
  onNavigateToNurse: () => void;
  onNavigateToUpload: () => void;
}

export const HospitalPortal: React.FC<HospitalPortalProps> = ({
  lang,
  staffUser,
  onViewPatientChecklist,
  onNavigateToNurse,
  onNavigateToUpload,
}) => {
  const [activeTab, setActiveTab] = useState<'prescribe' | 'credentials' | 'settings' | 'reminders'>('prescribe');
  const t = translations[lang];

  // Prescribe Form State
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('58');
  const [patientPhone, setPatientPhone] = useState(getReceptionCall().formatted);
  const [hospitalName, setHospitalName] = useState(staffUser.hospital_name || 'AIIMS New Delhi Cardio-Care');
  const [doctorName, setDoctorName] = useState(staffUser.name || 'Dr. Anya Sen, MD');
  const [department, setDepartment] = useState(staffUser.department || 'Cardiology');
  const [helpdeskNumber, setHelpdeskNumber] = useState(getReceptionCall().formatted);
  const [followUpText, setFollowUpText] = useState('Review after 7 days at Cardiology OPD (Room 104)');
  const [warningsText, setWarningsText] = useState('SOS if breathlessness or severe chest heaviness');

  // Medicines List in Prescription (with Doctor Notes)
  const [medicines, setMedicines] = useState<PrescribePayloadMedicine[]>([
    {
      name: 'Ecosprin',
      strength: '75mg',
      dosageForm: 'tablet',
      frequencyCode: 'OD',
      slots: ['subah'],
      foodInstruction: 'Take after breakfast with a full glass of water (8:30 AM)',
      timingNote: 'Morning (8:00 AM)',
      duration: '30 days',
      notes: 'Blood thinner to maintain coronary stent patency. Do not skip.',
      doctorNotes: 'Take strictly after breakfast with lukewarm water. If mild bruising occurs, note it for your 7-day review. Never take on empty stomach.',
    },
    {
      name: 'Metoprolol',
      strength: '25mg',
      dosageForm: 'tablet',
      frequencyCode: 'BD',
      slots: ['subah', 'raat'],
      foodInstruction: 'Take after meals (8:30 AM & 8:30 PM)',
      timingNote: 'Morning & Night after meals',
      duration: '30 days',
      notes: 'Maintains healthy resting heart rate and blood pressure.',
      doctorNotes: 'Check pulse before taking; if resting pulse is below 55 bpm or if feeling lightheaded, sit down and consult cardiac ward immediately.',
    },
  ]);

  // --- Hospital Diet Plan State ---
  const [dietType, setDietType] = useState('AIIMS Low Sodium Cardiac Care Recovery Diet');
  const [caloriesTarget, setCaloriesTarget] = useState('1,600 - 1,800 kcal / day');
  const [hydrationTarget, setHydrationTarget] = useState('Strictly restricted to 1.5 Liters / 24 hours');
  const [dietSpecialInstructions, setDietSpecialInstructions] = useState('Strict adherence to low sodium (< 2g/day) and fluid restriction (1.5L max) is vital for coronary stent longevity and myocardial healing.');

  // Daily Meal Schedule
  const [meals, setMeals] = useState<DietMealItem[]>([
    {
      id: 'meal_1',
      meal_time: 'Breakfast (8:30 AM)',
      title: 'Heart-Healthy Oats Porridge & Protein',
      items: 'Warm steel-cut oats cooked in skimmed milk, 2 boiled egg whites, sliced fresh apple or papaya',
      instructions: 'Cook with zero added table salt or refined sugar. Eat sitting comfortably upright.',
    },
    {
      id: 'meal_2',
      meal_time: 'Mid-Morning (11:00 AM)',
      title: 'Hydration & Natural Potassium',
      items: '1 fresh tender coconut water or seasonal pomegranate / pear bowl',
      instructions: 'Natural electrolytes without added salt or preservatives. Drink fresh.',
    },
    {
      id: 'meal_3',
      meal_time: 'Lunch (1:30 PM)',
      title: 'Wholesome Balanced Indian Meal',
      items: '2 thin multigrain phulkas (without ghee), 1 bowl yellow moong dal (low salt), steamed bottle gourd (lauki) / spinach sabzi, cucumber slices',
      instructions: 'Cooked with maximum 1 teaspoon mustard oil. Strictly NO pickles (achaar), papad, or salty chutneys.',
    },
    {
      id: 'meal_4',
      meal_time: 'Evening Snack (5:30 PM)',
      title: 'Light Digestive Snack',
      items: 'Roasted unflavoured makhana (fox nuts) with 1 cup green tea or warm lemon water',
      instructions: 'Strictly unsalted; avoid commercial packaged namkeens.',
    },
    {
      id: 'meal_5',
      meal_time: 'Dinner (8:00 PM)',
      title: 'Light Easy-to-Digest Dinner',
      items: 'Moong dal khichdi with mixed vegetables (carrot, green peas, pumpkin) or 1 phulka with vegetable clear broth',
      instructions: 'Complete dinner at least 2 hours before sleeping. Keep portion moderate to prevent nocturnal heart strain.',
    },
  ]);

  // Clinical Dietary Add-Ons ("both option add option and of add ons as well")
  const [addOns, setAddOns] = useState<DietAddOnItem[]>([
    {
      id: 'addon_1',
      title: 'Fresh Tender Coconut Water',
      timing: 'Mid-Morning (11:00 AM)',
      benefits: 'Natural bio-active potassium and magnesium electrolytes to support healthy vascular tone and blood pressure.',
      instructions: 'Drink freshly opened; do not store in refrigerator or add black salt.',
      recommended: true,
    },
    {
      id: 'addon_2',
      title: 'Soaked & Peeled Almonds & Walnuts',
      timing: 'Morning with Breakfast (8:30 AM)',
      benefits: 'Rich in cardioprotective Omega-3 ALA fatty acids and Vitamin E to promote coronary endothelial recovery.',
      instructions: '4 almonds and 2 walnut halves soaked in water overnight; peel almond skins before consumption.',
      recommended: true,
    },
    {
      id: 'addon_3',
      title: 'Bedtime Golden Turmeric Milk',
      timing: 'Bedtime (9:30 PM)',
      benefits: 'Natural curcumin anti-inflammatory action to accelerate post-stent vascular recovery and encourage sound sleep.',
      instructions: '150 mL warm skimmed / low-fat cow milk with a pinch of pure organic turmeric and a dash of ground black pepper.',
      recommended: true,
    },
  ]);

  // Measures that should be taken care of for a patient ("and also space for the measure that should be taken care of for a paitient")
  const [measures, setMeasures] = useState<DietMeasureItem[]>([
    {
      id: 'meas_1',
      title: 'Strict Sodium (Salt) Restriction',
      category: 'Salt & Electrolytes',
      severity: 'Critical',
      metric_limit: 'Max 2.0g salt (< 1/2 level tsp) / 24 hours',
      instruction: 'Zero raw table salt shaker at dining table. Completely eliminate pickles (achaar), papad, packaged chips, salty namkeen, and canned soups.',
      checked: true,
    },
    {
      id: 'meas_2',
      title: 'Total 24-Hour Fluid Measurement & Cap',
      category: 'Fluid Monitoring',
      severity: 'Critical',
      metric_limit: 'Max 1,500 mL (1.5 Liters) per day',
      instruction: 'Account for all fluids: drinking water, dal broth, milk, tea, and soups. Keep a marked 1.5L bottle daily to prevent volume overload on coronary stent.',
      checked: true,
    },
    {
      id: 'meas_3',
      title: 'Post-Meal Upright Posture & Walking Guideline',
      category: 'Posture & Digestion',
      severity: 'Important',
      metric_limit: 'Sit upright for minimum 30 minutes',
      instruction: 'Do NOT lie down flat immediately after meals to avoid gastro-cardiac pressure and acid reflux. A slow 10-minute stroll inside the home is recommended.',
      checked: false,
    },
    {
      id: 'meas_4',
      title: 'Minimal Cooking Oil (Fat Intake Cap)',
      category: 'Dietary Fats',
      severity: 'Important',
      metric_limit: 'Maximum 2 teaspoons (10 mL) oil / day',
      instruction: 'Use single-pressed mustard oil or olive oil. Strictly zero deep frying, zero vanaspati/dalda, and avoid butter or rich cream gravies.',
      checked: true,
    },
    {
      id: 'meas_5',
      title: 'Drug-Food Interaction: Avoid Grapefruit',
      category: 'Medication Safety',
      severity: 'Warning',
      metric_limit: 'Zero grapefruit / pomelo',
      instruction: 'Grapefruit inhibits liver CYP3A4 enzymes and dangerously alters blood pressure and statin drug concentrations in blood. Avoid completely.',
      checked: true,
    },
    {
      id: 'meas_6',
      title: 'Daily Morning Weight & Fluid Retention Check',
      category: 'Vital Measures',
      severity: 'Monitoring',
      metric_limit: 'Report weight gain > 1.5 kg in 48 hrs',
      instruction: 'Check body weight every morning after emptying bladder before breakfast. Rapid weight spike indicates fluid retention; inform hospital ward immediately.',
      checked: false,
    },
  ]);

  // Modal State for Viewing / Editing Diet Plan on Existing Issued Credentials
  const [dietModalCred, setDietModalCred] = useState<PatientCredentialItem | null>(null);
  const [modalDietPlan, setModalDietPlan] = useState<DietPlan | null>(null);
  const [loadingModalDiet, setLoadingModalDiet] = useState(false);
  const [savingModalDiet, setSavingModalDiet] = useState(false);

  // New Custom Item Form states for Diet Plan builder
  const [showAddMealForm, setShowAddMealForm] = useState(false);
  const [newMeal, setNewMeal] = useState({ meal_time: 'Mid-Afternoon (4:00 PM)', title: '', items: '', instructions: '' });
  
  const [showAddAddOnForm, setShowAddAddOnForm] = useState(false);
  const [newAddOn, setNewAddOn] = useState({ title: '', timing: 'Morning', benefits: '', instructions: '', recommended: true });

  const [showAddMeasureForm, setShowAddMeasureForm] = useState(false);
  const [newMeasure, setNewMeasure] = useState({ title: '', category: 'General Precaution', severity: 'Important' as const, metric_limit: '', instruction: '' });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedResult, setIssuedResult] = useState<{
    dischargeId: string;
    accessId: string;
    pin: string;
    patientName: string;
    medicinesCount: number;
  } | null>(null);

  // Credentials list
  const [credentialsList, setCredentialsList] = useState<PatientCredentialItem[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [loadingCreds, setLoadingCreds] = useState(false);

  const loadCredentials = async () => {
    setLoadingCreds(true);
    try {
      const data = await api.getHospitalPatientCredentials();
      setCredentialsList(data);
    } catch (err) {
      console.warn('Could not load credentials:', err);
    } finally {
      setLoadingCreds(false);
    }
  };

  useEffect(() => {
    loadCredentials();
  }, []);

  const handleAddMedicine = () => {
    setMedicines([
      ...medicines,
      {
        name: '',
        strength: '',
        dosageForm: 'tablet',
        frequencyCode: 'OD',
        slots: ['subah'],
        foodInstruction: 'Take after food with water',
        timingNote: 'Morning (8:00 AM)',
        duration: '15 days',
        notes: '',
      },
    ]);
  };

  const handleRemoveMedicine = (index: number) => {
    if (medicines.length <= 1) return;
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const handleUpdateMedicine = (index: number, field: keyof PrescribePayloadMedicine, value: any) => {
    const updated = [...medicines];
    updated[index] = { ...updated[index], [field]: value };
    setMedicines(updated);
  };

  const handleToggleSlot = (index: number, slot: 'subah' | 'dopahar' | 'shaam' | 'raat') => {
    const med = medicines[index];
    let slots = [...med.slots];
    if (slots.includes(slot)) {
      if (slots.length > 1) {
        slots = slots.filter((s) => s !== slot);
      }
    } else {
      slots.push(slot);
    }
    handleUpdateMedicine(index, 'slots', slots);
  };

  const applyDietPreset = (preset: 'cardiac' | 'diabetic' | 'gastric') => {
    if (preset === 'cardiac') {
      setDietType('AIIMS Low Sodium Cardiac Care Recovery Diet');
      setCaloriesTarget('1,600 - 1,800 kcal / day');
      setHydrationTarget('Strictly restricted to 1.5 Liters / 24 hours');
      setDietSpecialInstructions('Strict adherence to low sodium (< 2g/day) and fluid restriction (1.5L max) is vital for coronary stent longevity and myocardial healing.');
      setMeals([
        { id: 'm_c1', meal_time: 'Breakfast (8:30 AM)', title: 'Heart-Healthy Oats Porridge & Protein', items: 'Steel-cut oats in skimmed milk, 2 boiled egg whites, 1 apple', instructions: 'Zero added table salt or sugar. Eat sitting upright.' },
        { id: 'm_c2', meal_time: 'Mid-Morning (11:00 AM)', title: 'Natural Electrolyte Hydration', items: '1 fresh tender coconut water or seasonal papaya bowl', instructions: 'Natural hydration; do not add salt.' },
        { id: 'm_c3', meal_time: 'Lunch (1:30 PM)', title: 'Low-Salt Balanced Indian Meal', items: '2 multigrain phulkas (no ghee), yellow moong dal, steamed bottle gourd sabzi, cucumber', instructions: 'Max 1 tsp mustard oil. Zero pickles or papad.' },
        { id: 'm_c4', meal_time: 'Evening Snack (5:30 PM)', title: 'Digestive Snack', items: 'Roasted unsalted makhana (fox nuts) with green tea', instructions: 'Strictly unsalted; avoid packaged namkeen.' },
        { id: 'm_c5', meal_time: 'Dinner (8:00 PM)', title: 'Light Moong Dal Khichdi', items: 'Moong dal vegetable khichdi or 1 phulka with clear soup', instructions: 'Eat 2 hours before bedtime.' },
      ]);
      setAddOns([
        { id: 'a_c1', title: 'Fresh Tender Coconut Water', timing: 'Mid-Morning (11:00 AM)', benefits: 'Natural potassium & magnesium electrolytes to support vascular relaxation.', instructions: 'Drink fresh; do not add salt.', recommended: true },
        { id: 'a_c2', title: 'Soaked & Peeled Almonds & Walnuts', timing: 'Morning with Breakfast', benefits: 'Cardioprotective Omega-3 ALA fatty acids & Vitamin E for stent endothelial healing.', instructions: '4 almonds + 2 walnut halves soaked overnight; peel skin.', recommended: true },
        { id: 'a_c3', title: 'Bedtime Golden Turmeric Milk', timing: 'Bedtime (9:30 PM)', benefits: 'Curcumin anti-inflammatory action accelerates recovery and sound sleep.', instructions: '150 mL warm skimmed milk with pinch of organic turmeric & black pepper.', recommended: true },
      ]);
      setMeasures([
        { id: 'ms_c1', title: 'Strict Sodium (Salt) Restriction', category: 'Salt & Electrolytes', severity: 'Critical', metric_limit: 'Max 2.0g salt (< 1/2 level tsp) / 24 hours', instruction: 'Zero raw table salt shaker. Strictly eliminate pickles, papad, chips, namkeen, and canned soups.', checked: true },
        { id: 'ms_c2', title: 'Total 24-Hour Fluid Measurement & Cap', category: 'Fluid Monitoring', severity: 'Critical', metric_limit: 'Max 1,500 mL (1.5 Liters) per day', instruction: 'Account for all fluids: water, dal soup, tea, milk. Keep a marked 1.5L bottle daily.', checked: true },
        { id: 'ms_c3', title: 'Post-Meal Upright Posture', category: 'Posture & Digestion', severity: 'Important', metric_limit: 'Sit upright for minimum 30 minutes', instruction: 'Do NOT lie down flat immediately after meals. A slow 10-minute stroll is recommended.', checked: false },
        { id: 'ms_c4', title: 'Cooking Oil & Fat Intake Cap', category: 'Dietary Fats', severity: 'Important', metric_limit: 'Maximum 2 teaspoons (10 mL) oil / day', instruction: 'Use single-pressed mustard oil or olive oil. Strictly zero deep frying.', checked: true },
        { id: 'ms_c5', title: 'Drug-Food Interaction: Avoid Grapefruit', category: 'Medication Safety', severity: 'Warning', metric_limit: 'Zero grapefruit / pomelo', instruction: 'Grapefruit inhibits CYP3A4 enzymes and dangerously alters cardiac medication levels.', checked: true },
        { id: 'ms_c6', title: 'Daily Morning Weight & Fluid Check', category: 'Vital Measures', severity: 'Monitoring', metric_limit: 'Report weight gain > 1.5 kg in 48 hrs', instruction: 'Check weight every morning before breakfast. Rapid weight spike indicates fluid retention.', checked: false },
      ]);
    } else if (preset === 'diabetic') {
      setDietType('Diabetic & Glycemic Control Recovery Diet');
      setCaloriesTarget('1,500 - 1,700 kcal / day');
      setHydrationTarget('2.0 - 2.5 Liters / day');
      setDietSpecialInstructions('Low glycemic index foods with consistent meal intervals. Strictly zero refined sugars or jaggery.');
      setMeals([
        { id: 'm_d1', meal_time: 'Breakfast (8:30 AM)', title: 'High-Fiber Sprouted Moong & Methi Missi Roti', items: '1 multigrain missi roti with methi, 1 bowl sprouted moong salad with lemon, 1 boiled egg', instructions: 'High fiber slows carbohydrate absorption.' },
        { id: 'm_d2', meal_time: 'Mid-Morning (11:00 AM)', title: 'Glycemic Snack', items: '1 small green apple or guava slices, handful roasted chana', instructions: 'Avoid mangoes, grapes, chiku, or bananas.' },
        { id: 'm_d3', meal_time: 'Lunch (1:30 PM)', title: 'Balanced Fiber & Protein Thali', items: '2 barley-wheat rotis, 1 bowl black chana or rajma, steamed bhindi (okra) or karela, salad', instructions: 'Eat salad first before carbohydrates.' },
        { id: 'm_d4', meal_time: 'Evening Snack (5:30 PM)', title: 'Light Snack', items: '1 cup cinnamon green tea with roasted flaxseeds and almonds', instructions: 'No biscuits or rusks.' },
        { id: 'm_d5', meal_time: 'Dinner (8:00 PM)', title: 'Light Low-Carb Dinner', items: 'Vegetable daliya (broken wheat) with tofu / paneer or grilled fish with steamed beans', instructions: 'Finish by 8 PM.' },
      ]);
      setAddOns([
        { id: 'a_d1', title: 'Fenugreek (Methi) Seeds Infusion', timing: 'Early Morning (7:00 AM)', benefits: 'Galactomannan soluble fiber improves insulin sensitivity.', instructions: '1 tsp methi seeds soaked in water overnight; drink water and chew seeds.', recommended: true },
        { id: 'a_d2', title: 'Roasted Chia & Flax Seeds Powder', timing: 'With Breakfast', benefits: 'Omega-3 fatty acids assist cardiovascular lipid control.', instructions: '1 tablespoon sprinkled over salad or curd.', recommended: true },
      ]);
      setMeasures([
        { id: 'ms_d1', title: 'Blood Glucose Monitoring Protocol', category: 'Glycemic Control', severity: 'Critical', metric_limit: 'Fasting: 80-120 mg/dL, Post-meal < 160 mg/dL', instruction: 'Check fasting and 2-hour post-meal blood sugar 3 times weekly.', checked: true },
        { id: 'ms_d2', title: 'Hypoglycemia Emergency SOS Readiness', category: 'Patient Safety', severity: 'Critical', metric_limit: 'Blood sugar < 70 mg/dL', instruction: 'Keep glucose tablets or candy in bedside pocket. If sweating or trembling, take immediately.', checked: true },
        { id: 'ms_d3', title: 'Strict Elimination of Simple Sugars', category: 'Dietary Restriction', severity: 'Important', metric_limit: 'Zero refined sugar or sweets', instruction: 'Completely eliminate sugar, honey, jaggery (gur), and fruit juices.', checked: true },
      ]);
    } else if (preset === 'gastric') {
      setDietType('Bland Gastric Mucosal Protection Diet');
      setCaloriesTarget('1,700 - 1,900 kcal / day');
      setHydrationTarget('2.0 Liters / day (Lukewarm)');
      setDietSpecialInstructions('Non-spicy, soothing foods to protect gastric and esophageal mucosa during antibiotic and PPI therapy.');
      setMeals([
        { id: 'm_g1', meal_time: 'Breakfast (8:30 AM)', title: 'Soothing Breakfast', items: 'Soft idlis with mild mint chutney or warm oatmeal with banana slices', instructions: 'Take 30 mins after Pantoprazole. Avoid acidic citrus.' },
        { id: 'm_g2', meal_time: 'Mid-Morning (11:00 AM)', title: 'Probiotic Hydration', items: '1 glass fresh buttermilk (chaas) with roasted cumin powder', instructions: 'Probiotics protect gut flora during antibiotics.' },
        { id: 'm_g3', meal_time: 'Lunch (1:30 PM)', title: 'Bland Healing Indian Meal', items: '2 soft rotis, light moong dal, boiled potatoes/lauki, fresh curd', instructions: 'Zero red chilli or garam masala.' },
        { id: 'm_g4', meal_time: 'Evening Snack (5:30 PM)', title: 'Light Snack', items: '2 Marie biscuits with chamomile herbal tea', instructions: 'Avoid coffee, strong tea, or fried snacks.' },
        { id: 'm_g5', meal_time: 'Dinner (8:00 PM)', title: 'Soft Khichdi', items: 'Yellow moong dal khichdi with 1 tsp cow ghee', instructions: 'Eat minimum 2.5 hours before sleeping.' },
      ]);
      setAddOns([
        { id: 'a_g1', title: 'Probiotic Curd & Buttermilk (Chaas)', timing: 'Mid-Morning & Lunch', benefits: 'Replenishes healthy microbiome and soothes burning sensation.', instructions: 'Freshly prepared; no sour curd.', recommended: true },
        { id: 'a_g2', title: 'Chamomile & Fennel Digestive Infusion', timing: 'Post-Dinner (8:45 PM)', benefits: 'Eases epigastric cramps and smooth muscle spasms.', instructions: 'Steep in warm water for 5 mins; sip slowly.', recommended: true },
      ]);
      setMeasures([
        { id: 'ms_g1', title: 'Timely Regular Meals (Never Empty Stomach)', category: 'Meal Timing', severity: 'Critical', metric_limit: 'Never empty stomach > 3.5 hrs', instruction: 'Never fast or skip meals during gastritis. Small frequent meals prevent acid erosion.', checked: true },
        { id: 'ms_g2', title: 'Antibiotics strictly with Food', category: 'Medication Safety', severity: 'Critical', metric_limit: 'Take after meals', instruction: 'Never take Amoxicillin on empty stomach. Always consume food first to prevent nausea.', checked: true },
        { id: 'ms_g3', title: 'Elevate Head of Bed (Reflux Prevention)', category: 'Posture & Sleep', severity: 'Important', metric_limit: 'Elevate 6 inches / 15 cm', instruction: 'Never lie flat within 2 hours of dinner to prevent acid reflux.', checked: false },
      ]);
    }
  };

  const handleAddMealItem = () => {
    if (!newMeal.title.trim()) return;
    setMeals([
      ...meals,
      {
        id: `meal_${Date.now()}`,
        meal_time: newMeal.meal_time,
        title: newMeal.title,
        items: newMeal.items,
        instructions: newMeal.instructions,
      }
    ]);
    setNewMeal({ meal_time: 'Mid-Afternoon (4:00 PM)', title: '', items: '', instructions: '' });
    setShowAddMealForm(false);
  };

  const handleRemoveMeal = (index: number) => {
    if (meals.length <= 1) return;
    setMeals(meals.filter((_, i) => i !== index));
  };

  const handleAddAddOnItem = () => {
    if (!newAddOn.title.trim()) return;
    setAddOns([
      ...addOns,
      {
        id: `addon_${Date.now()}`,
        title: newAddOn.title,
        timing: newAddOn.timing,
        benefits: newAddOn.benefits,
        instructions: newAddOn.instructions,
        recommended: newAddOn.recommended,
      }
    ]);
    setNewAddOn({ title: '', timing: 'Morning', benefits: '', instructions: '', recommended: true });
    setShowAddAddOnForm(false);
  };

  const handleRemoveAddOn = (index: number) => {
    setAddOns(addOns.filter((_, i) => i !== index));
  };

  const handleAddMeasureItem = () => {
    if (!newMeasure.title.trim()) return;
    setMeasures([
      ...measures,
      {
        id: `meas_${Date.now()}`,
        title: newMeasure.title,
        category: newMeasure.category,
        severity: newMeasure.severity,
        metric_limit: newMeasure.metric_limit,
        instruction: newMeasure.instruction,
        checked: false,
      }
    ]);
    setNewMeasure({ title: '', category: 'General Precaution', severity: 'Important', metric_limit: '', instruction: '' });
    setShowAddMeasureForm(false);
  };

  const handleRemoveMeasure = (index: number) => {
    setMeasures(measures.filter((_, i) => i !== index));
  };

  // Open Diet Modal for existing patient
  const handleOpenDietModal = async (cred: PatientCredentialItem) => {
    setDietModalCred(cred);
    setLoadingModalDiet(true);
    try {
      const diet = await api.getDietPlan(cred.discharge_id);
      setModalDietPlan(diet);
    } catch {
      // Create empty template if none exists
      setModalDietPlan({
        id: `diet_${cred.discharge_id}`,
        discharge_id: cred.discharge_id,
        diet_type: 'Hospital Prescribed Clinical Recovery Diet',
        calories_target: '1,600 - 1,800 kcal / day',
        hydration_target: '1.5 - 2.0 Liters / day',
        prescribed_by: `${staffUser.name} & Clinical Dietetics`,
        meals: [...meals],
        add_ons: [...addOns],
        measures: [...measures],
        special_instructions: dietSpecialInstructions,
      });
    } finally {
      setLoadingModalDiet(false);
    }
  };

  const handleSaveModalDiet = async () => {
    if (!modalDietPlan || !dietModalCred) return;
    setSavingModalDiet(true);
    try {
      await api.saveDietPlan(dietModalCred.discharge_id, modalDietPlan);
      alert('Hospital Diet Plan updated successfully for patient!');
      setDietModalCred(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update diet plan.');
    } finally {
      setSavingModalDiet(false);
    }
  };

  const handlePrescribeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      alert('Please enter patient name.');
      return;
    }
    if (medicines.some((m) => !m.name.trim())) {
      alert('Please provide a name for all medicines.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: PrescribePayload = {
        patientName,
        patientAge,
        patientPhone,
        hospitalName,
        doctorName,
        department,
        helpdeskNumber,
        medicines,
        followUpText,
        warningsText,
        staffId: staffUser.staff_id,
        staffName: staffUser.name,
        dietPlan: {
          diet_type: dietType,
          calories_target: caloriesTarget,
          hydration_target: hydrationTarget,
          prescribed_by: `${staffUser.name} & Clinical Dietetics`,
          meals,
          add_ons: addOns,
          measures,
          special_instructions: dietSpecialInstructions,
        },
      };

      const result = await api.prescribeMedications(payload);
      setIssuedResult({
        dischargeId: result.dischargeId,
        accessId: result.accessId,
        pin: result.pin,
        patientName: result.patientName,
        medicinesCount: result.medicinesCount,
      });
      loadCredentials();
    } catch (err: any) {
      alert(err.message || 'Failed to submit prescription.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Staff Identity Ribbon */}
      <div className="bg-gradient-to-r from-[#19324B] via-[#1F3D5B] to-[#142639] text-white rounded-3xl p-6 sm:p-8 shadow-md mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
              <Stethoscope className="w-7 h-7 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold uppercase tracking-wider">
                  Verified Hospital Staff
                </span>
                <span className="text-xs text-indigo-200">
                  ID: {staffUser.staff_id}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight">
                {staffUser.name}
              </h1>
              <p className="text-sm text-indigo-200/90 mt-0.5">
                {staffUser.department} · {staffUser.hospital_name}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onNavigateToNurse}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm transition-all border border-white/15 flex items-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{t.nav?.nurseSignoff || 'Nurse Signoff Queue'}</span>
            </button>
            <button
              type="button"
              onClick={onNavigateToUpload}
              className="px-4 py-2.5 rounded-xl bg-[#1E6F5C] hover:bg-[#18594A] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>{t.nav?.upload || 'Upload Discharge Scan'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-[#EAE5DB] mb-8 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('prescribe')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'prescribe'
              ? 'bg-[#1E6F5C] text-white shadow-xs'
              : 'text-[#4A5261] hover:text-[#242A35] hover:bg-[#F3EDE2]'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>{t.portalSwitcher?.prescribeTab || 'Upload & Prescribe Medicine Checklist'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('credentials');
            loadCredentials();
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'credentials'
              ? 'bg-[#1E6F5C] text-white shadow-xs'
              : 'text-[#4A5261] hover:text-[#242A35] hover:bg-[#F3EDE2]'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>{t.portalSwitcher?.credentialsTab || 'Issued Patient Access IDs'} ({credentialsList.length})</span>
        </button>

        {/* Feature 1: Hospital Settings Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-[#1E6F5C] text-white shadow-xs'
              : 'text-[#4A5261] hover:text-[#242A35] hover:bg-[#F3EDE2]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>{t.portalSwitcher?.settingsTab || 'Hospital Settings'}</span>
        </button>

        {/* Feature 3: Zero-App WhatsApp Reminders Tab */}
        <button
          type="button"
          onClick={() => setActiveTab('reminders')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'reminders'
              ? 'bg-[#1E6F5C] text-white shadow-xs'
              : 'text-[#4A5261] hover:text-[#242A35] hover:bg-[#F3EDE2]'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-emerald-400 fill-current" />
          <span>{t.portalSwitcher?.remindersTab || 'Zero-App WhatsApp Reminders'}</span>
        </button>
      </div>

      {/* TAB 1: PRESCRIBE MEDICATIONS & ISSUE PATIENT ACCESS ID */}
      {activeTab === 'prescribe' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Prescription Entry Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#FFFDF9] rounded-3xl border border-[#EAE5DB] p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#EAE5DB] pb-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-[#242A35]">
                    {t.hospitalPortal?.uploadTitle || 'Official Hospital Prescription Upload'}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#5A6270] mt-0.5">
                    {t.hospitalPortal?.uploadSubtitle || "Enter the doctor's prescribed medicines and timing instructions. Submitting will generate a secure Patient Access ID and PIN."}
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#EEF2F6] text-[#203957] border border-[#D5DEE8] rounded-lg text-xs font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  {t.hospitalPortal?.doctorSigned || 'Doctor Signed'}
                </div>
              </div>

              <form onSubmit={handlePrescribeSubmit} className="space-y-6">
                {/* Patient Information Section */}
                <div className="bg-[#F7F4EC] rounded-2xl p-5 border border-[#E5DFD2]">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#5A6270] mb-3">
                    {t.hospitalPortal?.patientDetailsSection || '1. Patient & Hospital Facility Details'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#242A35] mb-1">
                        {t.hospitalPortal?.patientNameLabel || 'Patient Full Name *'}
                      </label>
                      <input
                        type="text"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="e.g. Sita Devi or Sunil Kumar"
                        className="w-full px-3.5 py-2.5 bg-[#FFFDF9] border border-[#DDD7CB] rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#242A35] mb-1">
                        {t.hospitalPortal?.patientAgeLabel || 'Patient Age / Ward'}
                      </label>
                      <input
                        type="text"
                        value={patientAge}
                        onChange={(e) => setPatientAge(e.target.value)}
                        placeholder="e.g. 58 / Cardiology Bed 12"
                        className="w-full px-3.5 py-2.5 bg-[#FFFDF9] border border-[#DDD7CB] rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#242A35] mb-1">
                        {t.hospitalPortal?.helpdeskLabel || 'Hospital 24x7 Helpdesk Phone'}
                      </label>
                      <input
                        type="text"
                        value={helpdeskNumber}
                        onChange={(e) => setHelpdeskNumber(e.target.value)}
                        placeholder={getReceptionCall().formatted}
                        className="w-full px-3.5 py-2.5 bg-[#FFFDF9] border border-[#DDD7CB] rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Medicines List Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#5A6270]">
                      {t.hospitalPortal?.prescribedMedsSection || '2. Prescribed Medicines & Exact Timings'} ({medicines.length})
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddMedicine}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EAF2ED] hover:bg-[#DEEBE3] text-[#1B6151] border border-[#CCDED3] text-xs font-bold transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.hospitalPortal?.addMedBtn || 'Add Medicine'}</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {medicines.map((med, index) => (
                      <div
                        key={index}
                        className="p-5 rounded-2xl border border-[#EAE5DB] bg-[#FAF7F2] hover:bg-[#FFFDF9] hover:border-[#BED6C8] transition-all space-y-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="w-6 h-6 rounded-full bg-[#EAE5DB] text-[#242A35] font-extrabold text-xs flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-grow">
                            <div>
                              <label className="block text-[11px] font-bold text-[#4A5261] mb-1">
                                Medicine Name *
                              </label>
                              <input
                                type="text"
                                value={med.name}
                                onChange={(e) => handleUpdateMedicine(index, 'name', e.target.value)}
                                placeholder="e.g. Ecosprin"
                                className="w-full px-3 py-2 bg-[#FFFDF9] border border-[#DDD7CB] rounded-lg text-xs font-semibold focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-[#4A5261] mb-1">
                                Strength & Form
                              </label>
                              <input
                                type="text"
                                value={med.strength}
                                onChange={(e) => handleUpdateMedicine(index, 'strength', e.target.value)}
                                placeholder="e.g. 75mg Tablet"
                                className="w-full px-3 py-2 bg-[#FFFDF9] border border-[#DDD7CB] rounded-lg text-xs focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-[#4A5261] mb-1">
                                Duration
                              </label>
                              <input
                                type="text"
                                value={med.duration}
                                onChange={(e) => handleUpdateMedicine(index, 'duration', e.target.value)}
                                placeholder="e.g. 30 days"
                                className="w-full px-3 py-2 bg-[#FFFDF9] border border-[#DDD7CB] rounded-lg text-xs focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none"
                              />
                            </div>
                          </div>

                          {medicines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMedicine(index)}
                              className="p-1.5 rounded-lg text-[#8E95A2] hover:text-rose-600 hover:bg-[#FDF0EE] transition-colors shrink-0 cursor-pointer"
                              title="Remove medication"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Timing Slots Checklist Buttons */}
                        <div>
                          <label className="block text-[11px] font-bold text-[#4A5261] mb-1.5">
                            Daily Schedule Timings (Doctor Specified):
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                              { id: 'subah', label: 'Morning (8:00 AM)', emoji: '🌅' },
                              { id: 'dopahar', label: 'Afternoon (1:00 PM)', emoji: '☀️' },
                              { id: 'shaam', label: 'Evening (5:00 PM)', emoji: '🌇' },
                              { id: 'raat', label: 'Night (9:00 PM)', emoji: '🌙' },
                            ].map((slot) => {
                              const isSelected = med.slots.includes(slot.id as any);
                              return (
                                <button
                                  key={slot.id}
                                  type="button"
                                  onClick={() => handleToggleSlot(index, slot.id as any)}
                                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-[#1E6F5C] border-[#1E6F5C] text-white shadow-xs'
                                      : 'bg-[#FFFDF9] border-[#DDD7CB] text-[#4A5261] hover:border-[#BDB5A4]'
                                  }`}
                                >
                                  <span>{slot.emoji}</span>
                                  <span>{slot.label.split(' ')[0]}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 ml-1" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Food Relation Instruction & Purpose */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-[11px] font-bold text-[#4A5261] mb-1">
                              Food Relation & Timing Instruction:
                            </label>
                            <input
                              type="text"
                              value={med.foodInstruction}
                              onChange={(e) => handleUpdateMedicine(index, 'foodInstruction', e.target.value)}
                              placeholder="e.g. Take after breakfast with water"
                              className="w-full px-3 py-2 bg-[#FFFDF9] border border-[#DDD7CB] rounded-lg text-xs focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#4A5261] mb-1">
                              Medical Indication / Purpose:
                            </label>
                            <input
                              type="text"
                              value={med.notes || ''}
                              onChange={(e) => handleUpdateMedicine(index, 'notes', e.target.value)}
                              placeholder="e.g. Blood thinner to protect cardiac stent"
                              className="w-full px-3 py-2 bg-[#FFFDF9] border border-[#DDD7CB] rounded-lg text-xs focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Dedicated Option to add a Note while assigning the medicine to the patient */}
                        <div className="p-3.5 bg-[#EEF6F2] rounded-xl border border-[#BED6C8] space-y-1.5">
                          <label className="block text-[11px] font-bold text-[#14473B] flex flex-wrap items-center justify-between gap-1">
                            <span className="flex items-center gap-1.5 text-[#134437]">
                              <Stethoscope className="w-3.5 h-3.5 text-[#1E6F5C]" />
                              Doctor's Note for Patient (Special Advice / Precautions / Warning):
                            </span>
                            <span className="text-[10px] text-[#288470] font-semibold bg-white/80 px-2 py-0.5 rounded border border-[#BED6C8]">
                              Assigned by Doctor
                            </span>
                          </label>
                          <textarea
                            rows={2}
                            value={med.doctorNotes || ''}
                            onChange={(e) => handleUpdateMedicine(index, 'doctorNotes', e.target.value)}
                            placeholder="e.g. Take strictly after breakfast with half glass lukewarm water. If mild dizziness occurs, rest for 15 minutes. Never take on empty stomach."
                            className="w-full px-3 py-2 bg-[#FFFDF9] border border-[#BED6C8] rounded-lg text-xs text-[#242A35] font-medium focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none leading-relaxed"
                          />
                          <p className="text-[10px] text-[#4A5261]">
                            This doctor note will be prominently highlighted with a badge on the patient's daily checklist, mobile reminders, and printed schedule.
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. HOSPITAL DIET PLAN, ADD-ONS & PATIENT CARE MEASURES */}
                <div className="bg-[#FAF7F2] rounded-2xl p-5 sm:p-6 border border-[#E3DDCF] space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E3DDCF] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#E8F2EC] border border-[#BED6C8] flex items-center justify-center text-[#1E6F5C] shrink-0">
                        <Salad className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-[#242A35] flex items-center gap-2">
                          <span>3. Hospital Diet Plan, Add-Ons & Patient Care Measures</span>
                          <span className="text-[10px] bg-[#EEF5F1] text-[#1B6151] px-2 py-0.5 rounded-full font-bold border border-[#CFE2D7]">
                            Clinical Nutrition
                          </span>
                        </h3>
                        <p className="text-[11px] text-[#5A6270] mt-0.5">
                          Prescribe a balanced meal plan, therapeutic add-ons, and critical dietary measures for patient recovery.
                        </p>
                      </div>
                    </div>

                    {/* Quick Diet Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                      <span className="text-[10px] font-bold text-[#5A6270] uppercase">Presets:</span>
                      <button
                        type="button"
                        onClick={() => applyDietPreset('cardiac')}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#FFFDF9] border border-[#DDD7CB] hover:border-[#1E6F5C] hover:text-[#1E6F5C] transition-all cursor-pointer"
                        title="Low Sodium Cardiac Diet"
                      >
                        🫀 Cardiac Care
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDietPreset('diabetic')}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#FFFDF9] border border-[#DDD7CB] hover:border-[#1E6F5C] hover:text-[#1E6F5C] transition-all cursor-pointer"
                        title="Diabetic Glycemic Diet"
                      >
                        🩺 Diabetic
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDietPreset('gastric')}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#FFFDF9] border border-[#DDD7CB] hover:border-[#1E6F5C] hover:text-[#1E6F5C] transition-all cursor-pointer"
                        title="Bland Gastric Protection"
                      >
                        🍲 Bland Gastric
                      </button>
                    </div>
                  </div>

                  {/* Diet Plan Overview Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-[11px] font-bold text-[#4A5261] mb-1">
                        Prescribed Diet Category *
                      </label>
                      <input
                        type="text"
                        value={dietType}
                        onChange={(e) => setDietType(e.target.value)}
                        placeholder="e.g. AIIMS Low Sodium Cardiac Diet"
                        className="w-full px-3 py-2 bg-[#FFFDF9] border border-[#DDD7CB] rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#4A5261] mb-1">
                        Daily Caloric Target
                      </label>
                      <input
                        type="text"
                        value={caloriesTarget}
                        onChange={(e) => setCaloriesTarget(e.target.value)}
                        placeholder="e.g. 1,600 - 1,800 kcal / day"
                        className="w-full px-3 py-2 bg-[#FFFDF9] border border-[#DDD7CB] rounded-xl text-xs focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#4A5261] mb-1">
                        Hydration Target & Limit
                      </label>
                      <input
                        type="text"
                        value={hydrationTarget}
                        onChange={(e) => setHydrationTarget(e.target.value)}
                        placeholder="e.g. Max 1.5 Liters / 24 hours"
                        className="w-full px-3 py-2 bg-[#FFFDF9] border border-[#DDD7CB] rounded-xl text-xs focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* A. Daily Meals Schedule */}
                  <div className="bg-[#FFFDF9] rounded-xl p-4 border border-[#E3DDCF] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#F0ECE1] pb-2">
                      <span className="text-xs font-bold text-[#242A35] flex items-center gap-1.5">
                        <Utensils className="w-3.5 h-3.5 text-[#1E6F5C]" />
                        Daily Meals Schedule ({meals.length} Recommended Slots)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddMealForm(!showAddMealForm)}
                        className="text-[11px] font-bold text-[#1E6F5C] hover:text-[#14473B] flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Meal Option</span>
                      </button>
                    </div>

                    {/* Inline Add Meal Form */}
                    {showAddMealForm && (
                      <div className="p-3 bg-[#F4F9F6] border border-[#CDE5D8] rounded-xl space-y-2.5">
                        <div className="text-xs font-bold text-[#134437]">Add Meal Slot Recommendation:</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Meal Time (e.g. Mid-Afternoon 4:00 PM)"
                            value={newMeal.meal_time}
                            onChange={(e) => setNewMeal({ ...newMeal, meal_time: e.target.value })}
                            className="px-2.5 py-1.5 bg-white border border-[#DDD7CB] rounded-lg text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Meal Title (e.g. Light Digestive Snack)"
                            value={newMeal.title}
                            onChange={(e) => setNewMeal({ ...newMeal, title: e.target.value })}
                            className="px-2.5 py-1.5 bg-white border border-[#DDD7CB] rounded-lg text-xs"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Recommended Food Items (e.g. Roasted unsalted makhana, green tea)"
                          value={newMeal.items}
                          onChange={(e) => setNewMeal({ ...newMeal, items: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-[#DDD7CB] rounded-lg text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Preparation / Care Instructions (e.g. Zero salt, eat warm)"
                          value={newMeal.instructions}
                          onChange={(e) => setNewMeal({ ...newMeal, instructions: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-[#DDD7CB] rounded-lg text-xs"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowAddMealForm(false)}
                            className="px-2.5 py-1 text-xs text-[#5A6270] hover:text-[#242A35] cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleAddMealItem}
                            className="px-3 py-1 bg-[#1E6F5C] text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Add to Diet Plan
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Meal list */}
                    <div className="space-y-2.5">
                      {meals.map((m, mIdx) => (
                        <div
                          key={m.id || mIdx}
                          className="p-3 rounded-xl border border-[#EAE5DB] bg-[#FAF7F2] flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="flex-grow space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-[#EEF5F1] text-[#1B6151] font-bold text-[10px]">
                                {m.meal_time}
                              </span>
                              <span className="font-bold text-[#242A35]">{m.title}</span>
                            </div>
                            <p className="text-[#343C4A] font-medium pl-1">
                              {m.items}
                            </p>
                            {m.instructions && (
                              <p className="text-[11px] text-[#5A6270] pl-1 italic">
                                Note: {m.instructions}
                              </p>
                            )}
                          </div>
                          {meals.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMeal(mIdx)}
                              className="text-[#8E95A2] hover:text-rose-600 p-1 cursor-pointer"
                              title="Remove meal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* B. Clinical Dietary Add-Ons ("both option add option and of add ons as well") */}
                  <div className="bg-[#FFFDF9] rounded-xl p-4 border border-[#E3DDCF] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#F0ECE1] pb-2">
                      <span className="text-xs font-bold text-[#242A35] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        Clinical Dietary Add-Ons & Supplements ({addOns.length} Included)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddAddOnForm(!showAddAddOnForm)}
                        className="text-[11px] font-bold text-[#1E6F5C] hover:text-[#14473B] flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Add-On Item</span>
                      </button>
                    </div>

                    {/* Pre-set Add-on Quick Inclusion Chips */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-[#5A6270] font-semibold">Quick Add:</span>
                      {[
                        { title: 'Fresh Tender Coconut Water', timing: 'Mid-Morning (11:00 AM)', benefits: 'Natural potassium & electrolytes for vascular health.', instructions: 'Drink freshly opened; zero black salt.', recommended: true },
                        { title: 'Soaked Almonds & Walnuts', timing: 'Morning with Breakfast', benefits: 'Omega-3 ALA fatty acids for heart healing.', instructions: '4 almonds + 2 walnuts soaked overnight; peel skin.', recommended: true },
                        { title: 'Bedtime Golden Turmeric Milk', timing: 'Bedtime (9:30 PM)', benefits: 'Curcumin anti-inflammatory recovery & sound sleep.', instructions: '150ml warm skimmed milk + pinch of turmeric & pepper.', recommended: true },
                        { title: 'Isabgol (Psyllium Husk) Soluble Fiber', timing: 'Pre-Dinner / Night', benefits: 'Softens stools to eliminate straining after surgery.', instructions: '1 tbsp in lukewarm water; drink immediately.', recommended: false },
                        { title: 'Probiotic Buttermilk (Chaas)', timing: 'With Lunch', benefits: 'Restores gut microflora during antibiotic course.', instructions: 'Fresh curd with roasted jeera; zero salt.', recommended: true },
                      ].map((presetAddOn, paIdx) => {
                        const alreadyAdded = addOns.some(a => a.title.toLowerCase().includes(presetAddOn.title.toLowerCase().slice(0, 10)));
                        if (alreadyAdded) return null;
                        return (
                          <button
                            key={paIdx}
                            type="button"
                            onClick={() => setAddOns([...addOns, { ...presetAddOn, id: `addon_${Date.now()}_${paIdx}` }])}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-[#F4F9F6] hover:bg-[#E8F2EC] text-[#1B6151] border border-[#CFE2D7] font-semibold transition-all cursor-pointer"
                          >
                            + {presetAddOn.title.split(' ')[0]} {presetAddOn.title.split(' ')[1] || ''}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Add-on Form */}
                    {showAddAddOnForm && (
                      <div className="p-3 bg-[#FFFBF0] border border-[#EED7B0] rounded-xl space-y-2.5">
                        <div className="text-xs font-bold text-[#7A4B10]">Add Custom Dietary Add-On:</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Add-On Name (e.g. Herbal Chamomile Tea)"
                            value={newAddOn.title}
                            onChange={(e) => setNewAddOn({ ...newAddOn, title: e.target.value })}
                            className="px-2.5 py-1.5 bg-white border border-[#DDD7CB] rounded-lg text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Timing (e.g. Post-Dinner 8:30 PM)"
                            value={newAddOn.timing}
                            onChange={(e) => setNewAddOn({ ...newAddOn, timing: e.target.value })}
                            className="px-2.5 py-1.5 bg-white border border-[#DDD7CB] rounded-lg text-xs"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Clinical Benefit / Purpose (e.g. Eases digestive cramps)"
                          value={newAddOn.benefits}
                          onChange={(e) => setNewAddOn({ ...newAddOn, benefits: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-[#DDD7CB] rounded-lg text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Preparation / Instructions (e.g. Steep 1 bag in warm water)"
                          value={newAddOn.instructions}
                          onChange={(e) => setNewAddOn({ ...newAddOn, instructions: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-[#DDD7CB] rounded-lg text-xs"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowAddAddOnForm(false)}
                            className="px-2.5 py-1 text-xs text-[#5A6270] hover:text-[#242A35] cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleAddAddOnItem}
                            className="px-3 py-1 bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Add Dietary Add-On
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Add-ons list */}
                    <div className="space-y-2">
                      {addOns.map((addon, aIdx) => (
                        <div
                          key={addon.id || aIdx}
                          className="p-3 rounded-xl border border-[#EAE5DB] bg-[#FAF7F2] flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="flex-grow space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#242A35]">{addon.title}</span>
                              <span className="text-[10px] text-[#5A6270] font-mono bg-white px-2 py-0.5 rounded border border-[#DDD7CB]">
                                {addon.timing}
                              </span>
                              {addon.recommended && (
                                <span className="text-[10px] text-[#1B6151] font-bold bg-[#EEF5F1] px-1.5 py-0.5 rounded border border-[#CFE2D7]">
                                  Doctor Recommended
                                </span>
                              )}
                            </div>
                            <p className="text-[#343C4A] text-[11px] leading-relaxed">
                              <strong>Benefit:</strong> {addon.benefits}
                            </p>
                            {addon.instructions && (
                              <p className="text-[11px] text-[#5A6270] italic">
                                <strong>Instructions:</strong> {addon.instructions}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAddOn(aIdx)}
                            className="text-[#8E95A2] hover:text-rose-600 p-1 cursor-pointer"
                            title="Remove add-on"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* C. Space for the Measure that should be taken care of for a patient */}
                  <div className="bg-[#FFFDF9] rounded-xl p-4 border border-[#E3DDCF] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#F0ECE1] pb-2">
                      <span className="text-xs font-bold text-[#242A35] flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        Patient Care Measures & Clinical Restrictions ({measures.length} Critical Guidelines)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddMeasureForm(!showAddMeasureForm)}
                        className="text-[11px] font-bold text-[#1E6F5C] hover:text-[#14473B] flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Care Measure</span>
                      </button>
                    </div>

                    {/* Custom Measure Form */}
                    {showAddMeasureForm && (
                      <div className="p-3 bg-[#FDF4F2] border border-[#F6CBC5] rounded-xl space-y-2.5">
                        <div className="text-xs font-bold text-[#8C281F]">Add Patient Care Measure / Precaution:</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            placeholder="Measure Title (e.g. Foot Swelling Check)"
                            value={newMeasure.title}
                            onChange={(e) => setNewMeasure({ ...newMeasure, title: e.target.value })}
                            className="px-2.5 py-1.5 bg-white border border-[#DDD7CB] rounded-lg text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Category (e.g. Physical Monitoring)"
                            value={newMeasure.category}
                            onChange={(e) => setNewMeasure({ ...newMeasure, category: e.target.value })}
                            className="px-2.5 py-1.5 bg-white border border-[#DDD7CB] rounded-lg text-xs"
                          />
                          <select
                            value={newMeasure.severity}
                            onChange={(e: any) => setNewMeasure({ ...newMeasure, severity: e.target.value })}
                            className="px-2.5 py-1.5 bg-white border border-[#DDD7CB] rounded-lg text-xs font-semibold"
                          >
                            <option value="Critical">Critical Priority</option>
                            <option value="Important">Important Guideline</option>
                            <option value="Warning">Warning / Interaction</option>
                            <option value="Monitoring">Vital Monitoring</option>
                          </select>
                        </div>
                        <input
                          type="text"
                          placeholder="Metric Limit / Threshold (e.g. Report swelling immediately)"
                          value={newMeasure.metric_limit}
                          onChange={(e) => setNewMeasure({ ...newMeasure, metric_limit: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-[#DDD7CB] rounded-lg text-xs"
                        />
                        <textarea
                          rows={2}
                          placeholder="Detailed Instructions & Precaution for Patient / Caregiver"
                          value={newMeasure.instruction}
                          onChange={(e) => setNewMeasure({ ...newMeasure, instruction: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-[#DDD7CB] rounded-lg text-xs"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowAddMeasureForm(false)}
                            className="px-2.5 py-1 text-xs text-[#5A6270] hover:text-[#242A35] cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleAddMeasureItem}
                            className="px-3 py-1 bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Add Measure to Plan
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Measures list */}
                    <div className="space-y-2.5">
                      {measures.map((meas, measIdx) => (
                        <div
                          key={meas.id || measIdx}
                          className="p-3 rounded-xl border border-[#EAE5DB] bg-[#FAF7F2] flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="flex-grow space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  meas.severity === 'Critical'
                                    ? 'bg-[#FDF0EE] text-[#8C281F] border border-[#F6CBC5]'
                                    : meas.severity === 'Warning'
                                    ? 'bg-[#FFF8E7] text-[#8A5800] border border-[#F0D599]'
                                    : meas.severity === 'Monitoring'
                                    ? 'bg-[#EEF5F1] text-[#1B6151] border border-[#CFE2D7]'
                                    : 'bg-[#EEF3F8] text-[#1A3451] border border-[#CFDEEC]'
                                }`}
                              >
                                {meas.severity}
                              </span>
                              <span className="font-bold text-[#242A35]">{meas.title}</span>
                              <span className="text-[10px] text-[#5A6270]">({meas.category})</span>
                            </div>
                            {meas.metric_limit && (
                              <div className="text-[11px] font-mono font-bold text-[#14473B]">
                                Target Limit: {meas.metric_limit}
                              </div>
                            )}
                            <p className="text-[#343C4A] text-xs leading-relaxed">
                              {meas.instruction}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveMeasure(measIdx)}
                            className="text-[#8E95A2] hover:text-rose-600 p-1 cursor-pointer shrink-0"
                            title="Remove measure"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Special Doctor / Dietitian Note */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#4A5261] mb-1">
                      Clinical Dietitian's Special Instructions for Patient
                    </label>
                    <textarea
                      rows={2}
                      value={dietSpecialInstructions}
                      onChange={(e) => setDietSpecialInstructions(e.target.value)}
                      placeholder="e.g. Strict adherence to low sodium (<2g/day) and fluid restriction (1.5L max) is vital for coronary stent longevity."
                      className="w-full px-3 py-2 bg-[#FFFDF9] border border-[#DDD7CB] rounded-xl text-xs focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none"
                    />
                  </div>
                </div>

                {/* 4. Follow-up and Emergency Warnings */}
                <div className="bg-[#F7F4EC] rounded-2xl p-5 border border-[#E5DFD2] space-y-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#5A6270]">
                    4. OPD Follow-up & Red Flag Warning Signs
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#242A35] mb-1">
                        Doctor's Follow-up Instructions
                      </label>
                      <input
                        type="text"
                        value={followUpText}
                        onChange={(e) => setFollowUpText(e.target.value)}
                        placeholder="Review after 7 days at OPD Room 104"
                        className="w-full px-3.5 py-2.5 bg-[#FFFDF9] border border-[#DDD7CB] rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#242A35] mb-1">
                        Emergency Red-Flag Symptoms (SOS)
                      </label>
                      <input
                        type="text"
                        value={warningsText}
                        onChange={(e) => setWarningsText(e.target.value)}
                        placeholder="SOS if severe chest pain or breathlessness"
                        className="w-full px-3.5 py-2.5 bg-[#FFFDF9] border border-[#DDD7CB] rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 px-6 rounded-2xl bg-[#1E6F5C] hover:bg-[#18594A] active:bg-[#14473B] text-white font-bold text-base shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <span>Saving Prescription & Generating Patient ID...</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        <span>Sign Prescription & Issue Patient Access ID</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Issued ID Modal / Hospital Protocol Info */}
          <div className="space-y-6">
            
            {/* Newly Issued Result Card */}
            {issuedResult ? (
              <div className="bg-[#EEF6F2] border-2 border-[#1E6F5C] rounded-3xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-center gap-2 text-[#134437] font-extrabold text-sm mb-2">
                  <CheckCircle2 className="w-5 h-5 text-[#1E6F5C]" />
                  Prescription Signed & Patient ID Created!
                </div>
                <p className="text-xs text-[#1A5C4D] mb-4">
                  Please hand these official credentials to <strong>{issuedResult.patientName}</strong> or print on their discharge card:
                </p>

                <div className="bg-[#FFFDF9] rounded-2xl p-4 border border-[#BED6C8] shadow-xs space-y-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6270]">
                      Patient Access ID
                    </span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-lg font-mono font-extrabold text-[#14473B]">
                        {issuedResult.accessId}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(issuedResult.accessId, 'result_id')}
                        className="p-1.5 rounded-lg text-[#5A6270] hover:text-[#1E6F5C] hover:bg-[#EAF2ED] cursor-pointer"
                        title="Copy Patient ID"
                      >
                        {copiedKey === 'result_id' ? <Check className="w-4 h-4 text-[#1E6F5C]" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-[#EAE5DB] pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6270]">
                      Discharge Security PIN
                    </span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-lg font-mono font-extrabold text-[#242A35] tracking-widest">
                        {issuedResult.pin}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(issuedResult.pin, 'result_pin')}
                        className="p-1.5 rounded-lg text-[#5A6270] hover:text-[#1E6F5C] hover:bg-[#EAF2ED] cursor-pointer"
                        title="Copy PIN"
                      >
                        {copiedKey === 'result_pin' ? <Check className="w-4 h-4 text-[#1E6F5C]" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => onViewPatientChecklist(issuedResult.dischargeId)}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#1E6F5C] hover:bg-[#18594A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>View Patient's Medicine Checklist</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIssuedResult(null);
                      setPatientName('');
                    }}
                    className="w-full py-2 px-4 rounded-xl bg-[#FFFDF9] hover:bg-[#F7F4EC] text-[#242A35] text-xs font-semibold border border-[#DDD7CB] transition-all cursor-pointer"
                  >
                    Issue Another Prescription
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[#FFFDF9] rounded-3xl border border-[#EAE5DB] p-6 shadow-xs">
                <div className="flex items-center gap-2 text-[#242A35] font-bold text-sm mb-3">
                  <ShieldCheck className="w-5 h-5 text-[#1E6F5C]" />
                  Hospital Security Protocol
                </div>
                <ul className="text-xs text-[#5A6270] space-y-2.5 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#1E6F5C] mt-1.5 shrink-0" />
                    <span><strong>Staff-Authorized IDs:</strong> Only hospital doctors & nurses can generate Patient Access IDs.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#1E6F5C] mt-1.5 shrink-0" />
                    <span><strong>Pre-Approved Timings:</strong> Timings entered by hospital staff are automatically stamped with clinical safety approval.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#1E6F5C] mt-1.5 shrink-0" />
                    <span><strong>Interactive Checklist:</strong> Patients log into their portal using this ID to mark daily medicine doses.</span>
                  </li>
                </ul>
              </div>
            )}

            {/* Quick Actions Card */}
            <div className="bg-[#F7F4EC] border border-[#E5DFD2] rounded-3xl p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#242A35] mb-3">
                Hospital Tools
              </h3>
              <div className="space-y-2.5 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('credentials')}
                  className="w-full text-left p-3 rounded-xl bg-[#FFFDF9] hover:bg-white border border-[#DDD7CB] font-semibold text-[#242A35] flex items-center justify-between transition-all cursor-pointer"
                >
                  <span>View All Generated Patient IDs</span>
                  <KeyRound className="w-4 h-4 text-[#1E6F5C]" />
                </button>
                <button
                  type="button"
                  onClick={onNavigateToNurse}
                  className="w-full text-left p-3 rounded-xl bg-[#FFFDF9] hover:bg-white border border-[#DDD7CB] font-semibold text-[#242A35] flex items-center justify-between transition-all cursor-pointer"
                >
                  <span>Nurse Verification Queue</span>
                  <ShieldCheck className="w-4 h-4 text-[#1E6F5C]" />
                </button>
                <button
                  type="button"
                  onClick={onNavigateToUpload}
                  className="w-full text-left p-3 rounded-xl bg-[#FFFDF9] hover:bg-white border border-[#DDD7CB] font-semibold text-[#242A35] flex items-center justify-between transition-all cursor-pointer"
                >
                  <span>Upload Scanned Paper Summary</span>
                  <Upload className="w-4 h-4 text-[#1E6F5C]" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: ISSUED PATIENT CREDENTIALS DIRECTORY */}
      {activeTab === 'credentials' && (
        <div className="bg-[#FFFDF9] rounded-3xl border border-[#EAE5DB] p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAE5DB] pb-5 mb-6">
            <div>
              <h2 className="text-xl font-bold text-[#242A35]">
                Hospital-Issued Patient Access Credentials
              </h2>
              <p className="text-xs sm:text-sm text-[#5A6270] mt-0.5">
                Every record below was generated by verified hospital staff. Patients use these IDs to log in and access their doctor's prescribed medicine checklist.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('prescribe')}
              className="px-4 py-2.5 rounded-xl bg-[#1E6F5C] hover:bg-[#18594A] text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Issue New Patient ID</span>
            </button>
          </div>

          {loadingCreds ? (
            <div className="py-12 text-center text-[#8E95A2]">Loading issued IDs...</div>
          ) : credentialsList.length === 0 ? (
            <div className="py-12 text-center text-[#5A6270]">
              <KeyRound className="w-10 h-10 text-[#C8C0B2] mx-auto mb-2" />
              <p className="font-semibold">No patient IDs issued yet.</p>
              <p className="text-xs text-[#8E95A2] mt-1">Prescribe a medication schedule above to create your first patient access ID.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#EAE5DB] text-[#737C8B] uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3">Patient Name</th>
                    <th className="py-3 px-3">Patient Access ID</th>
                    <th className="py-3 px-3">Security PIN</th>
                    <th className="py-3 px-3">Prescribing Doctor</th>
                    <th className="py-3 px-3">Hospital Facility</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2ECE1]">
                  {credentialsList.map((cred) => (
                    <tr key={cred.id} className="hover:bg-[#FAF7F2] transition-colors">
                      <td className="py-3.5 px-3 font-bold text-[#242A35]">
                        {cred.patient_name}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-mono font-bold text-[#14473B] bg-[#EEF5F1] px-2 py-0.5 rounded border border-[#CFE2D7]">
                          {cred.access_id}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[#242A35] font-bold tracking-wider">
                        {cred.pin}
                      </td>
                      <td className="py-3.5 px-3 text-[#4A5261]">
                        {cred.doctor_name || 'Dr. Anya Sen, MD'}
                      </td>
                      <td className="py-3.5 px-3 text-[#5A6270] text-xs">
                        {cred.hospital_name || staffUser.hospital_name}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1B6151] bg-[#EEF5F1] px-2 py-0.5 rounded-full border border-[#CFE2D7]">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyText(`Patient ID: ${cred.access_id} | PIN: ${cred.pin}`, cred.id)}
                            className="px-2.5 py-1.5 rounded-lg border border-[#DDD7CB] bg-[#FFFDF9] hover:bg-[#F2ECE1] text-[#343C4A] text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                            title="Copy credentials"
                          >
                            {copiedKey === cred.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-[#1E6F5C]" />
                                <span className="text-[#1E6F5C]">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDietModal(cred)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#EAF2ED] hover:bg-[#D5E5DC] text-[#1B6151] border border-[#BED6C8] text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                            title="View / Edit Hospital Diet Plan"
                          >
                            <Salad className="w-3 h-3 text-[#1E6F5C]" />
                            <span>Diet Plan</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onViewPatientChecklist(cred.discharge_id)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#1E6F5C] hover:bg-[#18594A] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <span>Checklist</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: HOSPITAL SETTINGS (FEATURE 1: EDITABLE RECEPTION NUMBER) */}
      {activeTab === 'settings' && (
        <HospitalSettingsPage
          lang={lang}
          staffUser={staffUser}
        />
      )}

      {/* TAB 4: ZERO-APP WHATSAPP MEDICINE REMINDERS (FEATURE 3) */}
      {activeTab === 'reminders' && (
        <ZeroAppRemindersView
          lang={lang}
          discharge={null}
        />
      )}

      {/* DIET PLAN MODAL FOR ISSUED CREDENTIALS */}
      {dietModalCred && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#FFFDF9] rounded-3xl border border-[#EAE5DB] shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden my-8">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-[#174F41] to-[#257C66] text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-emerald-100 text-[10px] font-bold uppercase tracking-wider">
                    Hospital Diet & Clinical Nutrition
                  </span>
                  <span className="text-xs text-emerald-200 font-mono">
                    ID: {dietModalCred.access_id}
                  </span>
                </div>
                <h3 className="text-xl font-bold mt-1">
                  {dietModalCred.patient_name}'s Hospital Diet Plan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDietModalCred(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-grow">
              {loadingModalDiet ? (
                <div className="py-12 text-center text-[#5A6270]">Loading patient diet plan...</div>
              ) : modalDietPlan ? (
                <div className="space-y-5">
                  {/* Category and Targets */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-[11px] font-bold text-[#4A5261] mb-1">
                        Diet Category
                      </label>
                      <input
                        type="text"
                        value={modalDietPlan.diet_type}
                        onChange={(e) => setModalDietPlan({ ...modalDietPlan, diet_type: e.target.value })}
                        className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#DDD7CB] rounded-xl text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#4A5261] mb-1">
                        Daily Caloric Target
                      </label>
                      <input
                        type="text"
                        value={modalDietPlan.calories_target}
                        onChange={(e) => setModalDietPlan({ ...modalDietPlan, calories_target: e.target.value })}
                        className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#DDD7CB] rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#4A5261] mb-1">
                        Hydration Limit
                      </label>
                      <input
                        type="text"
                        value={modalDietPlan.hydration_target}
                        onChange={(e) => setModalDietPlan({ ...modalDietPlan, hydration_target: e.target.value })}
                        className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#DDD7CB] rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  {/* Meals */}
                  <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#EAE5DB] space-y-3">
                    <h4 className="text-xs font-bold text-[#242A35] flex items-center gap-1.5 uppercase tracking-wider">
                      <Utensils className="w-3.5 h-3.5 text-[#1E6F5C]" />
                      Daily Meals Schedule ({modalDietPlan.meals?.length || 0})
                    </h4>
                    <div className="space-y-2">
                      {modalDietPlan.meals?.map((m, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-white border border-[#EAE5DB] text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#14473B]">{m.meal_time} · {m.title}</span>
                          </div>
                          <p className="text-[#343C4A] font-medium">{m.items}</p>
                          {m.instructions && <p className="text-[11px] text-[#5A6270] italic">Guidelines: {m.instructions}</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add-ons */}
                  <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#EAE5DB] space-y-3">
                    <h4 className="text-xs font-bold text-[#242A35] flex items-center gap-1.5 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      Clinical Dietary Add-Ons ({modalDietPlan.add_ons?.length || 0})
                    </h4>
                    <div className="space-y-2">
                      {modalDietPlan.add_ons?.map((a, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-white border border-[#EAE5DB] text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#242A35]">{a.title} ({a.timing})</span>
                            {a.recommended && <span className="text-[10px] text-[#1B6151] font-bold bg-[#EEF5F1] px-2 py-0.5 rounded">Recommended</span>}
                          </div>
                          <p className="text-[11px] text-[#4A5261]"><strong>Benefit:</strong> {a.benefits}</p>
                          {a.instructions && <p className="text-[11px] text-[#5A6270] italic">Instructions: {a.instructions}</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Measures */}
                  <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#EAE5DB] space-y-3">
                    <h4 className="text-xs font-bold text-[#242A35] flex items-center gap-1.5 uppercase tracking-wider">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      Patient Care Measures & Restrictions ({modalDietPlan.measures?.length || 0})
                    </h4>
                    <div className="space-y-2">
                      {modalDietPlan.measures?.map((meas, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-white border border-[#EAE5DB] text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#242A35]">{meas.title}</span>
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              {meas.severity}
                            </span>
                          </div>
                          {meas.metric_limit && <p className="text-[11px] font-mono text-[#14473B] font-bold">Limit: {meas.metric_limit}</p>}
                          <p className="text-[11px] text-[#4A5261]">{meas.instruction}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Special note */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#4A5261] mb-1">
                      Hospital Special Instructions
                    </label>
                    <textarea
                      rows={2}
                      value={modalDietPlan.special_instructions}
                      onChange={(e) => setModalDietPlan({ ...modalDietPlan, special_instructions: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#DDD7CB] rounded-xl text-xs"
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#F5F1E8] border-t border-[#EAE5DB] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setDietModalCred(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5A6270] hover:text-[#242A35] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveModalDiet}
                disabled={savingModalDiet}
                className="px-5 py-2.5 rounded-xl bg-[#1E6F5C] hover:bg-[#18594A] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Check className="w-4 h-4" />
                <span>{savingModalDiet ? 'Saving Updates...' : 'Save Diet Plan Updates'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
