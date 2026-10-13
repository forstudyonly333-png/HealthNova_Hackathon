// CHANGE THE RECEPTION NUMBER HERE. This is the only place it is defined.

/**
 * Single Source of Truth for Hospital Reception Contact Information.
 * Any update to the default reception WhatsApp or Call number must be made here.
 * Alternatively, specify the RECEPTION_WHATSAPP_NUMBER / RECEPTION_CALL_NUMBER
 * (or VITE_RECEPTION_WHATSAPP_NUMBER / VITE_RECEPTION_CALL_NUMBER) environment variables.
 */

function getEnvValue(name: string): string | undefined {
  if (typeof process !== 'undefined' && process?.env && process.env[name]) {
    return process.env[name];
  }
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any)?.env) {
      return (import.meta as any).env[name] || (import.meta as any).env[`VITE_${name}`];
    }
  } catch {}
  return undefined;
}

export const RECEPTION_WHATSAPP_NUMBER =
  getEnvValue('RECEPTION_WHATSAPP_NUMBER') || '917374029569';

export const RECEPTION_CALL_NUMBER =
  getEnvValue('RECEPTION_CALL_NUMBER') || RECEPTION_WHATSAPP_NUMBER;

export const HOSPITAL_NAME = 'AIIMS New Delhi Cardio-Thoracic Centre';

/**
 * Validates whether a phone number string represents a valid 91 + 10-digit Indian mobile number
 * starting with 6, 7, 8, or 9.
 */
export function validateReceptionNumber(rawNumber: string): { isValid: boolean; error: string | null; digits: string } {
  if (!rawNumber || typeof rawNumber !== 'string') {
    return { isValid: false, error: 'Reception number is empty.', digits: '' };
  }
  const digits = rawNumber.replace(/\D/g, '');
  if (!/^91[6-9]\d{9}$/.test(digits)) {
    return {
      isValid: false,
      error: 'Invalid reception number. Expected India country code 91 followed by 10 digits starting with 6-9 (e.g. 917374029569).',
      digits
    };
  }
  return { isValid: true, error: null, digits };
}

/**
 * Returns formatted reception WhatsApp details.
 */
export function getReceptionWhatsApp(overrideNumber?: string) {
  const target = (overrideNumber !== undefined ? overrideNumber : RECEPTION_WHATSAPP_NUMBER).trim();
  const validation = validateReceptionNumber(target);
  const digits = validation.digits;
  const subscriber = digits.startsWith('91') ? digits.slice(2) : digits;
  const formatted = digits.length === 12
    ? `+91 ${subscriber.slice(0, 5)} ${subscriber.slice(5)}`
    : (digits ? `+${digits}` : '');

  return {
    number: digits,
    digits,
    formatted,
    isValid: validation.isValid,
    error: validation.error,
    isConfigured: validation.isValid
  };
}

/**
 * Returns formatted reception voice call details.
 */
export function getReceptionCall(overrideNumber?: string) {
  const target = (overrideNumber !== undefined && overrideNumber !== null && overrideNumber !== '' ? overrideNumber : RECEPTION_CALL_NUMBER).trim();
  const digits = target.replace(/\D/g, '');
  const subscriber = digits.startsWith('91') ? digits.slice(2) : digits;
  const formatted = digits.length === 12
    ? `+91 ${subscriber.slice(0, 5)} ${subscriber.slice(5)}`
    : (digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : (target || '+91 73740 29569'));
  const dialDigits = digits.startsWith('91') ? digits : (digits.length === 10 ? `91${digits}` : digits);
  const telUri = `tel:+${dialDigits}`;

  return {
    digits: dialDigits,
    formatted,
    telUri
  };
}

/**
 * Builds the wa.me link with URL-encoded message text.
 * Strictly uses the configured reception WhatsApp number (or valid override).
 * Returns: https://wa.me/917374029569?text=<URL-encoded message>
 * If the number is invalid, returns empty string "" (never falls back to any other number).
 */
export function buildWhatsAppLink(message: string, overrideNumber?: string): string {
  const reception = getReceptionWhatsApp(overrideNumber);
  if (!reception.isValid) {
    return '';
  }
  const encodedText = encodeURIComponent(message || '');
  return `https://wa.me/${reception.digits}?text=${encodedText}`;
}
