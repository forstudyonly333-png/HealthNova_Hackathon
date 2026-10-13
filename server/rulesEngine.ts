/**
 * Rules Engine for "Going Home Right" (HealthNova)
 * Principle: AI reads, rules decide, missing means flagged.
 * Pure deterministic code, NOT AI.
 */

export interface RawExtractedMedicine {
  name: string;
  strength?: string;
  frequency_code: string; // e.g. "OD", "BD", "TDS", "QID", "HS", "SOS"
  timing_note?: string;   // e.g. "Subah", "before food", "after meals"
  duration?: string;      // e.g. "7 days", "1 month"
  source_text: string;
  confidence: number;     // 0.0 - 1.0
}

export interface DecodedMedicineRuleResult {
  status: 'clear' | 'needs_nurse_check';
  flag_reason?: string;
  slots: Array<'subah' | 'dopahar' | 'shaam' | 'raat'>;
  timing_instruction_en: string;
  timing_instruction_hi: string;
  normalized_frequency: string;
}

// Medical frequency standard dictionary
const FREQUENCY_MAP: Record<string, {
  name_en: string;
  name_hi: string;
  default_slots?: Array<'subah' | 'dopahar' | 'shaam' | 'raat'>;
  requires_timing_note?: boolean;
}> = {
  'OD': {
    name_en: 'Once Daily',
    name_hi: 'दिन में एक बार',
    requires_timing_note: true, // "OD with no timing on the sheet is NOT placed in any slot and is flagged: time not stated, nurse to confirm"
  },
  'BD': {
    name_en: 'Twice Daily (Morning + Night)',
    name_hi: 'दिन में दो बार (सुबह + रात)',
    default_slots: ['subah', 'raat'],
  },
  'BID': {
    name_en: 'Twice Daily (Morning + Night)',
    name_hi: 'दिन में दो बार (सुबह + रात)',
    default_slots: ['subah', 'raat'],
  },
  'TDS': {
    name_en: 'Three Times Daily (Morning + Afternoon + Night)',
    name_hi: 'दिन में तीन बार (सुबह + दोपहर + रात)',
    default_slots: ['subah', 'dopahar', 'raat'],
  },
  'TID': {
    name_en: 'Three Times Daily (Morning + Afternoon + Night)',
    name_hi: 'दिन में तीन बार (सुबह + दोपहर + रात)',
    default_slots: ['subah', 'dopahar', 'raat'],
  },
  'QID': {
    name_en: 'Four Times Daily (Morning + Afternoon + Evening + Night)',
    name_hi: 'दिन में चार बार (सुबह + दोपहर + शाम + रात)',
    default_slots: ['subah', 'dopahar', 'shaam', 'raat'],
  },
  'HS': {
    name_en: 'At Bedtime (Night)',
    name_hi: 'सोने से पहले (रात)',
    default_slots: ['raat'],
  },
  'SOS': {
    name_en: 'As Needed (Emergency/Discomfort only)',
    name_hi: 'ज़रूरत पड़ने पर (केवल आपात स्थिति/तकलीफ होने पर)',
    default_slots: [],
  },
};

/**
 * Evaluates medicine extraction against clinical rules
 */
export function evaluateMedicineRules(med: RawExtractedMedicine): DecodedMedicineRuleResult {
  // 1. Confidence check
  if (med.confidence < 0.8) {
    return {
      status: 'needs_nurse_check',
      flag_reason: `Low OCR extraction confidence (${Math.round(med.confidence * 100)}%). Nurse verification required.`,
      slots: [],
      timing_instruction_en: 'Pending nurse review due to unclear handwriting',
      timing_instruction_hi: 'अस्पष्ट लिखावट के कारण नर्स सत्यापन लंबित',
      normalized_frequency: med.frequency_code || 'UNSPECIFIED',
    };
  }

  // 2. Missing essential medicine name
  if (!med.name || med.name.trim().length === 0) {
    return {
      status: 'needs_nurse_check',
      flag_reason: 'Medicine name missing or unreadable on discharge sheet.',
      slots: [],
      timing_instruction_en: 'Unspecified medicine line',
      timing_instruction_hi: 'अनिर्दिष्ट दवा',
      normalized_frequency: 'UNKNOWN',
    };
  }

  // Normalize code
  const code = (med.frequency_code || '').trim().toUpperCase();
  const rule = FREQUENCY_MAP[code];

  // 3. Unknown abbreviation
  if (!rule) {
    return {
      status: 'needs_nurse_check',
      flag_reason: `Unknown or non-standard frequency abbreviation: "${med.frequency_code}". Never infer a dose or time.`,
      slots: [],
      timing_instruction_en: `Nurse must confirm timing for "${med.frequency_code}"`,
      timing_instruction_hi: `नर्स को "${med.frequency_code}" के समय की पुष्टि करनी होगी`,
      normalized_frequency: code || 'UNKNOWN',
    };
  }

  // 4. Special Rule for OD (Once Daily):
  // "OD with no timing on the sheet is NOT placed in any slot and is flagged 'time not stated, nurse to confirm'"
  if (code === 'OD') {
    const timing = (med.timing_note || '').toLowerCase();
    const hasMorning = timing.includes('subah') || timing.includes('morning') || timing.includes('am') || timing.includes('breakfast');
    const hasNoon = timing.includes('dopahar') || timing.includes('afternoon') || timing.includes('lunch') || timing.includes('noon');
    const hasNight = timing.includes('raat') || timing.includes('night') || timing.includes('dinner') || timing.includes('bedtime') || timing.includes('pm');

    if (hasMorning) {
      return {
        status: 'clear',
        slots: ['subah'],
        timing_instruction_en: 'Once daily in the Morning (Subah)',
        timing_instruction_hi: 'दिन में एक बार सुबह',
        normalized_frequency: 'OD (Morning)',
      };
    } else if (hasNoon) {
      return {
        status: 'clear',
        slots: ['dopahar'],
        timing_instruction_en: 'Once daily in the Afternoon (Dopahar)',
        timing_instruction_hi: 'दिन में एक बार दोपहर',
        normalized_frequency: 'OD (Afternoon)',
      };
    } else if (hasNight) {
      return {
        status: 'clear',
        slots: ['raat'],
        timing_instruction_en: 'Once daily at Night (Raat)',
        timing_instruction_hi: 'दिन में एक बार रात',
        normalized_frequency: 'OD (Night)',
      };
    } else {
      // Missing timing -> FLAG IT! Never infer morning!
      return {
        status: 'needs_nurse_check',
        flag_reason: 'Time not stated on discharge sheet, nurse to confirm whether Morning or Night.',
        slots: [], // NOT placed in any slot
        timing_instruction_en: 'Time not stated on sheet — nurse must confirm slot',
        timing_instruction_hi: 'पर्चे पर समय नहीं लिखा — नर्स से स्लॉट की पुष्टि आवश्यक',
        normalized_frequency: 'OD (Unspecified slot)',
      };
    }
  }

  // 5. Rule for SOS:
  if (code === 'SOS') {
    const hasCondition = med.timing_note && med.timing_note.trim().length > 0;
    if (!hasCondition) {
      return {
        status: 'needs_nurse_check',
        flag_reason: 'SOS trigger reason not specified on sheet. Nurse must clarify when to administer.',
        slots: [],
        timing_instruction_en: 'SOS - specific symptom trigger pending nurse confirmation',
        timing_instruction_hi: 'एसओएस - लक्षण का कारण नर्स से स्पष्ट होना बाकी',
        normalized_frequency: 'SOS',
      };
    }
    return {
      status: 'clear',
      slots: [],
      timing_instruction_en: `As needed (SOS): ${med.timing_note}`,
      timing_instruction_hi: `ज़रूरत पड़ने पर (एसओएस): ${med.timing_note}`,
      normalized_frequency: 'SOS',
    };
  }

  // 6. Standard multi-dose rules (BD, TDS, QID, HS)
  const slots = rule.default_slots || [];
  let noteEn = rule.name_en;
  let noteHi = rule.name_hi;

  if (med.timing_note) {
    noteEn += ` · ${med.timing_note}`;
    noteHi += ` · ${med.timing_note}`;
  }

  return {
    status: 'clear',
    slots,
    timing_instruction_en: noteEn,
    timing_instruction_hi: noteHi,
    normalized_frequency: code,
  };
}

/**
 * Evaluates Follow-up text:
 * Must not infer a date if vague or missing.
 */
export function evaluateFollowUp(followUp?: { text: string; source_text: string } | null, dischargeDateStr?: string) {
  if (!followUp || !followUp.text || followUp.text.trim().length === 0) {
    return {
      status: 'needs_nurse_check',
      flag_reason: 'No follow-up visit timeline detected on discharge sheet.',
      dueDate: null,
      displayText_en: 'Follow-up timeline not stated — nurse to clarify with hospital OPD',
      displayText_hi: 'फॉलो-अप तारीख नहीं दी गई — अस्पताल ओपीडी से नर्स द्वारा पुष्टि',
    };
  }

  const text = followUp.text.trim();
  // Check for "after X days"
  const daysMatch = text.match(/after\s+(\d+)\s+days?/i);
  if (daysMatch && dischargeDateStr) {
    const days = parseInt(daysMatch[1], 10);
    const baseDate = new Date(dischargeDateStr);
    if (!isNaN(baseDate.getTime())) {
      const dueDate = new Date(baseDate);
      dueDate.setDate(dueDate.getDate() + days);
      const iso = dueDate.toISOString().split('T')[0];
      return {
        status: 'clear',
        dueDate: iso,
        displayText_en: `Review after ${days} days (Due: ${iso})`,
        displayText_hi: `${days} दिनों बाद समीक्षा (नियत तारीख: ${iso})`,
      };
    }
  }

  // Check for explicit date like "18 Oct 2026" or "2026-10-18"
  const dateMatch = text.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);
  if (dateMatch) {
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };
    const day = dateMatch[1].padStart(2, '0');
    const month = months[dateMatch[2].toLowerCase().substring(0, 3)] || '01';
    const year = dateMatch[3];
    const iso = `${year}-${month}-${day}`;
    return {
      status: 'clear',
      dueDate: iso,
      displayText_en: text,
      displayText_hi: text,
    };
  }

  return {
    status: 'clear',
    dueDate: null,
    displayText_en: text,
    displayText_hi: text,
  };
}

/**
 * Evaluates warning items:
 * "Call the doctor if... card built ONLY from warnings printed on the sheet; if the sheet gives no action, show 'Action not specified, nurse to confirm'."
 */
export function evaluateWarningItem(warning: { text: string; source_text: string; action_text?: string }) {
  const hasAction = warning.action_text && warning.action_text.trim().length > 0;
  
  if (!hasAction) {
    return {
      text: warning.text,
      source_text: warning.source_text,
      action_text: 'Action not specified, nurse to confirm',
      status: 'needs_nurse_check' as const,
      flag_reason: 'Warning trigger present without specific emergency action. Nurse must confirm steps.',
    };
  }

  return {
    text: warning.text,
    source_text: warning.source_text,
    action_text: warning.action_text,
    status: 'clear' as const,
  };
}
