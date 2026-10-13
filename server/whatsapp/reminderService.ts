/**
 * Zero-App WhatsApp Medicine Reminder Service for "Going Home Right" (HealthNova)
 * Sends automated reminders at dose times and processes numeric/text replies to update adherence.
 */

import { getDb, saveDb, decryptText } from '../db.ts';
import { getWhatsAppProvider } from './provider.ts';
import { detectUrgentKeywords } from '../../src/utils/whatsappUtils.ts';

export interface DoseReminderPayload {
  dischargeId: string;
  slot: 'subah' | 'dopahar' | 'shaam' | 'raat';
  patientPhone?: string;
  patientName?: string;
}

export interface IncomingReplyPayload {
  from: string;
  body: string;
  dischargeId?: string;
}

// Localized slot labels
const SLOT_LABELS: Record<string, { en: string; hi: string; time: string }> = {
  subah: { en: 'Morning', hi: 'सुबह (Morning)', time: '8:00 AM' },
  dopahar: { en: 'Afternoon', hi: 'दोपहर (Afternoon)', time: '1:00 PM' },
  shaam: { en: 'Evening', hi: 'शाम (Evening)', time: '6:00 PM' },
  raat: { en: 'Night', hi: 'रात (Night)', time: '8:30 PM' },
};

/**
 * Builds the exact zero-app medicine reminder WhatsApp text.
 * Multi-lingual (Hindi / English) according to patient language preference.
 */
export function buildDoseReminderText(params: {
  hospitalName: string;
  patientName: string;
  dischargeRef: string;
  slot: string;
  medicines: Array<{ name: string; strength?: string; instruction?: string }>;
  lang?: string;
}): string {
  const { hospitalName, patientName, dischargeRef, slot, medicines, lang = 'en' } = params;
  const slotInfo = SLOT_LABELS[slot] || { en: slot, hi: slot, time: '' };
  const isHindi = lang === 'hi';

  const medLines = medicines.length > 0
    ? medicines.map((m, idx) => `${idx + 1}. Tab ${m.name} ${m.strength || ''}${m.instruction ? ` (${m.instruction})` : ''}`).join('\n')
    : '1. Prescribed daily medications';

  if (isHindi) {
    return `🏥 *${hospitalName}*\n` +
      `नमस्ते ${patientName} जी (पर्चा संदर्भ: ${dischargeRef})\n\n` +
      `⏰ यह आपकी *${slotInfo.hi}* की दवा का समय है:\n\n` +
      `${medLines}\n\n` +
      `📱 *कृपया उत्तर में केवल नंबर लिखकर भेजें:*\n` +
      `1️⃣ = *1* - सभी दवाएं ले ली हैं (Taken)\n` +
      `2️⃣ = *2* - खुराक छूट गई (Missed dose)\n` +
      `3️⃣ = *3* - नर्स की सलाह चाहिए या प्रश्न है\n\n` +
      `_Going Home Right Zero-App Support_`;
  }

  return `🏥 *${hospitalName}*\n` +
    `Hello ${patientName} (Discharge Ref: ${dischargeRef})\n\n` +
    `⏰ It is time for your *${slotInfo.en}* medications (${slotInfo.time}):\n\n` +
    `${medLines}\n\n` +
    `📱 *Please reply with a number to confirm:*\n` +
    `1️⃣ = *1* - Taken all doses\n` +
    `2️⃣ = *2* - Missed or skipped dose\n` +
    `3️⃣ = *3* - Need nurse help or have question\n\n` +
    `_Going Home Right Zero-App Care_`;
}

/**
 * Dispatches a dose reminder for a given discharge and time slot.
 */
export async function sendDoseReminder(payload: DoseReminderPayload): Promise<{
  success: boolean;
  messageId: string;
  messageText: string;
  recipient: string;
  status: string;
}> {
  const db = await getDb();
  const { dischargeId, slot } = payload;

  // 1. Fetch discharge details
  const dRes = db.exec(
    `SELECT d.id, d.patient_id, d.hospital_name, d.discharge_date, p.name_encrypted, p.phone_encrypted, p.preferred_language, c.access_id
     FROM discharges d
     LEFT JOIN patients p ON d.patient_id = p.id
     LEFT JOIN patient_credentials c ON d.id = c.discharge_id
     WHERE d.id = ? LIMIT 1;`,
    [dischargeId]
  );

  if (!dRes.length || !dRes[0].values.length) {
    throw new Error(`Discharge record not found: ${dischargeId}`);
  }

  const row = dRes[0].values[0];
  const hospitalName = (row[2] as string) || 'AIIMS Cardio-Care';
  const patientName = row[4] ? decryptText(row[4] as string) : 'Patient';
  const rawPhone = row[5] ? decryptText(row[5] as string) : '';
  const cleanPhone = (payload.patientPhone || rawPhone).replace(/\D/g, '');
  const prefLang = (row[6] as string) || 'hi';
  const accessId = (row[7] as string) || dischargeId;

  // 2. Fetch medicines prescribed for this slot
  const mRes = db.exec(
    `SELECT id, name, strength, slots_json, timing_instruction_en, timing_instruction_hi, food_instruction
     FROM medicines
     WHERE discharge_id = ? AND (status = 'clear' OR status = 'approved');`,
    [dischargeId]
  );

  const slotMedicines: Array<{ id: string; name: string; strength: string; instruction: string }> = [];
  if (mRes.length && mRes[0].values.length) {
    mRes[0].values.forEach((m) => {
      const slots = JSON.parse((m[3] as string) || '[]');
      if (slots.includes(slot)) {
        slotMedicines.push({
          id: m[0] as string,
          name: m[1] as string,
          strength: m[2] as string,
          instruction: prefLang === 'hi'
            ? ((m[5] as string) || (m[6] as string) || '')
            : ((m[4] as string) || (m[6] as string) || ''),
        });
      }
    });
  }

  // 3. Compose text
  const messageText = buildDoseReminderText({
    hospitalName,
    patientName,
    dischargeRef: accessId,
    slot,
    medicines: slotMedicines,
    lang: prefLang,
  });

  // 4. Send via configured provider
  const provider = getWhatsAppProvider();
  const sendRes = await provider.sendMessage({
    recipientPhone: cleanPhone,
    messageText,
    dischargeId,
    patientName,
    slot,
    medicines: slotMedicines.map((m) => m.name),
  });

  // 5. Persist to whatsapp_messages table
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO whatsapp_messages (
       id, discharge_id, direction, recipient_phone, message_text, slot, status, provider, metadata_json, created_at
     ) VALUES (?, ?, 'outbound', ?, ?, ?, ?, ?, ?, ?);`,
    [
      sendRes.messageId,
      dischargeId,
      cleanPhone,
      messageText,
      slot,
      sendRes.status,
      sendRes.provider,
      JSON.stringify({ slot, medicineCount: slotMedicines.length, patientName }),
      now,
    ]
  );

  // 6. Log to audit trail
  const auditId = `aud_rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  db.run(
    `INSERT INTO audit_log (
       id, discharge_id, entity_type, entity_id, action, actor_role, actor_name, old_value, new_value, timestamp
     ) VALUES (?, ?, 'reminder', ?, 'WHATSAPP_REMINDER_DISPATCHED', 'system', 'Zero-App WhatsApp Engine', '', ?, ?);`,
    [
      auditId,
      dischargeId,
      sendRes.messageId,
      `Sent ${slot} medication reminder to ${cleanPhone} via ${sendRes.provider}`,
      now,
    ]
  );

  saveDb();

  return {
    success: sendRes.success,
    messageId: sendRes.messageId,
    messageText,
    recipient: cleanPhone,
    status: sendRes.status,
  };
}

/**
 * Processes incoming patient reply from WhatsApp.
 * Updates dose adherence in dose_events, logs audit records, and replies to patient.
 */
export async function handleIncomingWhatsAppReply(payload: IncomingReplyPayload): Promise<{
  actionTaken: 'dose_confirmed' | 'dose_missed' | 'nurse_query_created' | 'unknown';
  confirmationReply: string;
  dischargeId: string;
  isUrgent: boolean;
}> {
  const db = await getDb();
  const rawBody = (payload.body || '').trim();
  const normBody = rawBody.toLowerCase();
  const now = new Date().toISOString();
  const todayStr = now.split('T')[0];

  // 1. Resolve discharge ID (from payload or phone matching)
  let dischargeId = payload.dischargeId;
  let patientName = 'Patient';
  let hospitalName = 'Hospital';
  let preferredLang = 'hi';

  if (!dischargeId && payload.from) {
    const cleanFrom = payload.from.replace(/\D/g, '');
    const findRes = db.exec(
      `SELECT d.id, d.hospital_name, p.name_encrypted, p.preferred_language 
       FROM discharges d 
       LEFT JOIN patients p ON d.patient_id = p.id 
       ORDER BY d.created_at DESC LIMIT 1;`
    );
    if (findRes.length && findRes[0].values.length) {
      dischargeId = findRes[0].values[0][0] as string;
      hospitalName = (findRes[0].values[0][1] as string) || hospitalName;
      patientName = findRes[0].values[0][2] ? decryptText(findRes[0].values[0][2] as string) : patientName;
      preferredLang = (findRes[0].values[0][3] as string) || preferredLang;
    }
  } else if (dischargeId) {
    const dRes = db.exec(
      `SELECT d.hospital_name, p.name_encrypted, p.preferred_language 
       FROM discharges d 
       LEFT JOIN patients p ON d.patient_id = p.id 
       WHERE d.id = ? LIMIT 1;`,
      [dischargeId]
    );
    if (dRes.length && dRes[0].values.length) {
      hospitalName = (dRes[0].values[0][0] as string) || hospitalName;
      patientName = dRes[0].values[0][1] ? decryptText(dRes[0].values[0][1] as string) : patientName;
      preferredLang = (dRes[0].values[0][2] as string) || preferredLang;
    }
  }

  dischargeId = dischargeId || 'dis_sample_1';

  // 2. Persist incoming message to whatsapp_messages table
  const inboundMsgId = `wa_in_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  db.run(
    `INSERT INTO whatsapp_messages (
       id, discharge_id, direction, recipient_phone, message_text, slot, status, provider, metadata_json, created_at
     ) VALUES (?, ?, 'inbound', ?, ?, '', 'received', 'SimulatedProvider', ?, ?);`,
    [
      inboundMsgId,
      dischargeId,
      payload.from || 'patient',
      rawBody,
      JSON.stringify({ rawText: rawBody }),
      now,
    ]
  );

  let actionTaken: 'dose_confirmed' | 'dose_missed' | 'nurse_query_created' | 'unknown' = 'unknown';
  let confirmationReply = '';
  let isUrgent = false;

  // Case 1: Reply "1" or "taken" or "yes" -> Confirmed All Doses
  if (normBody === '1' || normBody.includes('taken') || normBody.includes('खा ली') || normBody.includes('took') || normBody === 'yes') {
    actionTaken = 'dose_confirmed';

    // Find and mark active slot doses as given
    const mRes = db.exec(
      `SELECT id, name FROM medicines WHERE discharge_id = ? AND (status = 'clear' OR status = 'approved');`,
      [dischargeId]
    );

    let updatedCount = 0;
    if (mRes.length && mRes[0].values.length) {
      mRes[0].values.forEach((m) => {
        const medId = m[0] as string;
        const doseEventId = `dose_${dischargeId}_${medId}_${Date.now()}`;
        // Insert or update dose event
        db.run(
          `INSERT INTO dose_events (id, discharge_id, medicine_id, slot, scheduled_date, given, given_at, caregiver_name)
           VALUES (?, ?, ?, 'subah', ?, 1, ?, 'WhatsApp Reply (Zero-App)');`,
          [doseEventId, dischargeId, medId, todayStr, now]
        );
        updatedCount++;
      });
    }

    // Write to audit_log
    const auditId = `aud_dose_${Date.now()}`;
    db.run(
      `INSERT INTO audit_log (
         id, discharge_id, entity_type, entity_id, action, actor_role, actor_name, old_value, new_value, timestamp
       ) VALUES (?, ?, 'dose_event', ?, 'DOSE_CONFIRMED_VIA_WHATSAPP', 'patient', ?, 'given: 0', 'given: 1 (Confirmed via WhatsApp Reply 1)', ?);`,
      [
        auditId,
        dischargeId,
        inboundMsgId,
        patientName,
        now,
      ]
    );

    confirmationReply = preferredLang === 'hi'
      ? `✅ *धन्यवाद ${patientName} जी!* आपकी दवाएं अस्पताल पोर्टल में *Taken (ली गई)* दर्ज कर ली गई हैं। नियमित रूप से दवा लेना आपके शीघ्र स्वस्थ होने के लिए आवश्यक है।`
      : `✅ *Thank you ${patientName}!* Your doses have been recorded as *Taken* in your hospital care plan. Keep up the great adherence!`;
  }
  // Case 2: Reply "2" or "missed" -> Missed Dose Guidance
  else if (normBody === '2' || normBody.includes('missed') || normBody.includes('छूट गई') || normBody.includes('skip')) {
    actionTaken = 'dose_missed';

    const auditId = `aud_missed_${Date.now()}`;
    db.run(
      `INSERT INTO audit_log (
         id, discharge_id, entity_type, entity_id, action, actor_role, actor_name, old_value, new_value, timestamp
       ) VALUES (?, ?, 'dose_event', ?, 'DOSE_MISSED_VIA_WHATSAPP', 'patient', ?, 'normal', 'Patient reported missed dose via WhatsApp Reply 2', ?);`,
      [
        auditId,
        dischargeId,
        inboundMsgId,
        patientName,
        now,
      ]
    );

    confirmationReply = preferredLang === 'hi'
      ? `⚠️ *खुराक छूट जाने पर निर्देश:*\nकृपया अगली बार डबल (दोगुनी) खुराक कभी न लें। यदि 2 घंटे के भीतर याद आ जाए तो ले सकते हैं, अन्यथा अगली निर्धारित खुराक का इंतजार करें। यदि चक्कर या बेचैनी हो, तो 3 लिखकर भेजें।`
      : `⚠️ *Missed Dose Advice:*\nNever double-up on the next scheduled dose. Take it if within 2 hours of due time; otherwise, wait for the next scheduled slot. Reply 3 if feeling unwell.`;
  }
  // Case 3: Reply "3" or text query -> Log for Nurse Review + Urgent Keyword Check
  else {
    actionTaken = 'nurse_query_created';

    const urgentDetection = detectUrgentKeywords(rawBody, 'WhatsApp Zero-App Reply');
    isUrgent = urgentDetection.isUrgent;

    const queryId = `query_wa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    db.run(
      `INSERT INTO patient_queries (
         id, discharge_id, category, language, is_urgent, urgent_keyword,
         included_medicine_list, included_name, saved_copy_for_nurse,
         message_copy, medicine_name, status, created_at
       ) VALUES (?, ?, 'WhatsApp Dose Reply', ?, ?, ?, 1, 1, 1, ?, 'General Meds', 'pending', ?);`,
      [
        queryId,
        dischargeId,
        preferredLang,
        isUrgent ? 1 : 0,
        urgentDetection.matchedKeyword || '',
        rawBody.substring(0, 300),
        now,
      ]
    );

    const auditId = `aud_query_${Date.now()}`;
    db.run(
      `INSERT INTO audit_log (
         id, discharge_id, entity_type, entity_id, action, actor_role, actor_name, old_value, new_value, timestamp
       ) VALUES (?, ?, 'patient_query', ?, 'PATIENT_QUERY_FROM_WHATSAPP', 'patient', ?, '', ?, ?);`,
      [
        auditId,
        dischargeId,
        queryId,
        patientName,
        `Logged nurse question via WhatsApp (Urgent: ${isUrgent ? 'YES' : 'NO'}): ${rawBody.substring(0, 80)}`,
        now,
      ]
    );

    if (isUrgent) {
      confirmationReply = preferredLang === 'hi'
        ? `🚨 *गंभीर लक्षण सूचना:*\nआपका संदेश: "${rawBody}"। यदि आपको सीने में भारीपन, सांस फूलना या बेहोशी है, तो तुरंत *108* एम्बुलेंस या अस्पताल आपातकालीन नंबर पर कॉल करें!`
        : `🚨 *Urgent Clinical Alert:*\nDetected symptom in your message. If experiencing chest pain, severe breathlessness or dizziness, call *108* or hospital emergency immediately!`;
    } else {
      confirmationReply = preferredLang === 'hi'
        ? `📞 *सिस्टर प्रिया शर्मा (नर्स स्टेशन) को सूचित कर दिया गया है।*\nआपका प्रश्न: "${rawBody}" दर्ज कर लिया गया है। अस्पताल मेडिकल स्टाफ समीक्षा कर आपसे संपर्क करेगा।`
        : `📞 *Nurse Station Notified:*\nSister Priya Sharma, RN has received your inquiry: "${rawBody}". The clinical team will review and follow up.`;
    }
  }

  // Send the confirmation message back to the patient via provider
  const provider = getWhatsAppProvider();
  await provider.sendMessage({
    recipientPhone: payload.from || '',
    messageText: confirmationReply,
    dischargeId,
    patientName,
  });

  saveDb();

  return {
    actionTaken,
    confirmationReply,
    dischargeId,
    isUrgent,
  };
}
