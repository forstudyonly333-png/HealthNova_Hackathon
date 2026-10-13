/**
 * WhatsApp Utility for Going Home Right (Team HealthNova)
 * Handles phone number cleaning, urgent keyword detection, localized message formatting,
 * and standard URL encoding across all Indian scripts and languages.
 */

export interface WhatsAppMessageParams {
  lang?: string;
  dischargeRef: string;
  category: string;
  userMessage: string;
  medicineName?: string;
  followupText?: string;
  patientName?: string;
  includeName?: boolean;
  medicineList?: string[];
  includeMedicineList?: boolean;
}

import {
  buildWhatsAppLink,
  getReceptionWhatsApp,
  getReceptionCall,
  validateReceptionNumber,
  RECEPTION_WHATSAPP_NUMBER,
  RECEPTION_CALL_NUMBER,
  HOSPITAL_NAME
} from '../config/reception.ts';

export {
  buildWhatsAppLink,
  getReceptionWhatsApp,
  getReceptionCall,
  validateReceptionNumber,
  RECEPTION_WHATSAPP_NUMBER,
  RECEPTION_CALL_NUMBER,
  HOSPITAL_NAME
};

/**
 * Formats a phone number for wa.me by stripping all non-digit characters,
 * spaces, plus signs (+), dashes (-), and parentheses.
 */
export function formatWhatsAppNumber(raw: string): string {
  if (!raw) return '';
  return raw.replace(/\D/g, '');
}

/**
 * Strips spaces, dashes, brackets, parentheses, and leading plus or zero
 * to extract clean raw subscriber digits.
 */
export function cleanSubscriberDigits(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.replace(/[^\d]/g, '');
  // Strip leading zero if present for local subscriber entry
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
}

/**
 * Validates a reception contact phone number according to hospital security rules:
 * - Reject obvious placeholders (repeated digits, sequential digits)
 * - For India (+91), require exactly 10 digits starting with 6, 7, 8 or 9
 */
export function validateReceptionPhone(
  digits: string,
  countryCode: string = '+91'
): { isValid: boolean; error: string | null } {
  const clean = cleanSubscriberDigits(digits);

  if (!clean) {
    return { isValid: false, error: 'Please enter a reception phone number.' };
  }

  // 1. Reject obvious placeholder and test numbers (repeated digits or trivial sequences)
  const isRepeatedDigits = /^(\d)\1{6,}$/.test(clean);
  const forwardSeq = '01234567890';
  const reverseSeq = forwardSeq.split('').reverse().join('');
  const isSequential = forwardSeq.includes(clean) || reverseSeq.includes(clean);

  if (isRepeatedDigits || isSequential) {
    return {
      isValid: false,
      error: 'This looks like a sample number. Please enter the real reception WhatsApp number.'
    };
  }

  // 2. Specific validation for India (+91)
  if (countryCode === '+91' || countryCode === '91') {
    if (clean.length !== 10) {
      return {
        isValid: false,
        error: `Indian mobile numbers must contain exactly 10 digits (currently ${clean.length}).`
      };
    }
    const firstDigit = clean.charAt(0);
    if (!['6', '7', '8', '9'].includes(firstDigit)) {
      return {
        isValid: false,
        error: 'Indian mobile numbers must start with 6, 7, 8, or 9.'
      };
    }
  } else {
    // International numbers
    if (clean.length < 7 || clean.length > 13) {
      return {
        isValid: false,
        error: 'Invalid phone number length for selected country (expected 7-13 digits).'
      };
    }
  }

  return { isValid: true, error: null };
}

/**
 * Validates a WhatsApp Business link:
 * Must be either empty (optional) or start with https://wa.me/ or https://wa.link/
 */
export function validateBusinessLink(link: string): { isValid: boolean; error: string | null } {
  if (!link || !link.trim()) {
    return { isValid: true, error: null };
  }
  const trimmed = link.trim();
  if (
    trimmed.startsWith('https://wa.me/') ||
    trimmed.startsWith('https://wa.link/') ||
    trimmed.startsWith('http://wa.me/') ||
    trimmed.startsWith('http://wa.link/')
  ) {
    return { isValid: true, error: null };
  }
  return {
    isValid: false,
    error: 'WhatsApp Business link must start with https://wa.me/ or https://wa.link/'
  };
}

/**
 * Urgent clinical keywords in English and Hindi.
 * If user text contains any of these or chooses the side-effect category,
 * an urgent coral alert is triggered immediately before the WhatsApp action.
 */
export const URGENT_KEYWORDS_EN = [
  'breathlessness',
  'chest pain',
  'bleeding',
  'unconscious',
  'seizure',
  'severe',
  'difficulty breathing',
  'shortness of breath',
  'heart attack',
  'collapse',
  'emergency',
  'convulsion',
  'fainting',
  'vomiting blood',
  'choking',
  'stroke'
];

export const URGENT_KEYWORDS_HI = [
  'बेहोश',
  'सांस फूलना',
  'छाती में दर्द',
  'सीने में दर्द',
  'खून',
  'दौरा',
  'गंभीर',
  'सांस लेने में तकलीफ',
  'दिल का दौरा',
  'रक्तस्राव',
  'अचेत'
];

/**
 * Detects whether a query contains urgent clinical symptoms or selects the
 * "Side effect or new symptom" category.
 */
export function detectUrgentKeywords(text: string = '', category: string = ''): {
  isUrgent: boolean;
  matchedKeyword: string | null;
} {
  const normCategory = (category || '').toLowerCase();
  if (
    normCategory.includes('side effect') ||
    normCategory.includes('new symptom') ||
    normCategory.includes('दुष्प्रभाव') ||
    normCategory.includes('लक्षण')
  ) {
    return {
      isUrgent: true,
      matchedKeyword: 'Side effect or new symptom'
    };
  }

  const normText = (text || '').toLowerCase();

  for (const kw of URGENT_KEYWORDS_EN) {
    if (normText.includes(kw)) {
      return { isUrgent: true, matchedKeyword: kw };
    }
  }

  for (const kw of URGENT_KEYWORDS_HI) {
    if (normText.includes(kw)) {
      return { isUrgent: true, matchedKeyword: kw };
    }
  }

  return { isUrgent: false, matchedKeyword: null };
}

/**
 * Builds the exact message string according to the user requirements:
 * - Patient's preferred language (Hindi or English fallback)
 * - Discharge reference ID (always included)
 * - Category
 * - User's own text
 * - Optionally name (OFF by default)
 * - Optionally medicine list (OFF by default)
 * - Never includes diagnoses, uploaded scans or full medical history
 */
export function buildWhatsAppMessage(params: WhatsAppMessageParams): string {
  const {
    lang = 'en',
    dischargeRef,
    category,
    userMessage,
    medicineName,
    followupText,
    patientName,
    includeName = false,
    medicineList = [],
    includeMedicineList = false
  } = params;

  const isHindi = lang === 'hi';

  const cleanRef = dischargeRef ? dischargeRef.trim() : 'GHR-PATIENT';
  const cleanMsg = (userMessage || '').trim();

  // Name inclusion: strictly OFF by default, uses first name only
  const firstName = patientName ? patientName.trim().split(' ')[0] : '';
  const namePart = (includeName && firstName)
    ? (isHindi ? ` मरीज: ${firstName}।` : ` Patient: ${firstName}.`)
    : '';

  // Medicine target (if asking about specific medicine card)
  const medPart = (medicineName && medicineName.trim())
    ? (isHindi ? ` संबंधित दवा: ${medicineName.trim()}।` : ` Regarding Medicine: ${medicineName.trim()}.`)
    : '';

  // Follow-up target (if asking about specific appointment)
  const fuPart = (followupText && followupText.trim())
    ? (isHindi ? ` फॉलो-अप संदर्भ: ${followupText.trim()}।` : ` Follow-up Ref: ${followupText.trim()}.`)
    : '';

  // Medicine list inclusion: strictly OFF by default
  const medListPart = (includeMedicineList && Array.isArray(medicineList) && medicineList.length > 0)
    ? (isHindi
        ? ` वर्तमान दवाएं: ${medicineList.join(', ')}।`
        : ` Current Medicines: ${medicineList.join(', ')}.`)
    : '';

  if (isHindi) {
    const msgBody = cleanMsg || 'कृपया सहायता करें।';
    return `नमस्ते, यह डिस्चार्ज संदर्भ ${cleanRef} के संबंध में है।${namePart} श्रेणी: ${category}।${medPart}${fuPart} मेरा संदेश: ${msgBody}${medListPart} कृपया मार्गदर्शन करें।`;
  }

  // English (and default fallback for other languages)
  const msgBody = cleanMsg || 'Please help.';
  return `Hello, this is regarding Discharge Ref ${cleanRef}.${namePart} Category: ${category}.${medPart}${fuPart} My message: ${msgBody}${medListPart} Please assist.`;
}

/**
 * Generates the WhatsApp wa.me link with URL-encoded message text.
 * Strictly uses buildWhatsAppLink from reception config.
 */
export function generateWhatsAppUrl(phoneNumber: string, message: string): string {
  return buildWhatsAppLink(message, phoneNumber);
}

/**
 * Checks whether current time falls within hospital reception office hours
 * (defaults to 08:00 to 20:00 Indian Standard Time).
 */
export function isWithinHospitalOfficeHours(
  officeHoursText: string = 'Mon - Sat, 08:00 AM - 08:00 PM IST'
): {
  isWithin: boolean;
  officeHoursNotice: string;
} {
  try {
    const now = new Date();
    // Get Indian Standard Time hours (UTC + 5.5)
    const utcMinutes = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istTime = new Date(utcMinutes + (330 * 60000));
    const hours = istTime.getHours();
    const day = istTime.getDay(); // 0 is Sunday

    // Mon - Sat: 8 AM to 8 PM (08:00 - 20:00)
    const isWorkingHours = day !== 0 && hours >= 8 && hours < 20;

    return {
      isWithin: isWorkingHours,
      officeHoursNotice: isWorkingHours
        ? `Reception is currently open (${officeHoursText}).`
        : `Reception may reply later outside hours (${officeHoursText}). For urgent problems call hospital emergency helpline.`
    };
  } catch {
    return {
      isWithin: true,
      officeHoursNotice: `Office hours: ${officeHoursText}`
    };
  }
}
