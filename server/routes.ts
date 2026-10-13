/**
 * API Routes for "Going Home Right" (HealthNova)
 * Implements all 12 specification requirements
 */

import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { getDb, saveDb, decryptText, encryptText, resetDemoData } from './db.ts';
import { evaluateMedicineRules, evaluateFollowUp, evaluateWarningItem } from './rulesEngine.ts';
import { extractDischargeSheet, checkImageQuality, evaluateSafetyQuestion } from './extractor.ts';
import { 
  detectUrgentKeywords, 
  formatWhatsAppNumber, 
  validateReceptionPhone, 
  validateBusinessLink, 
  cleanSubscriberDigits 
} from '../src/utils/whatsappUtils.ts';
import {
  RECEPTION_WHATSAPP_NUMBER,
  RECEPTION_CALL_NUMBER,
  HOSPITAL_NAME,
  getReceptionCall,
  validateReceptionNumber,
  buildWhatsAppLink
} from '../src/config/reception.ts';
import { sendDoseReminder, handleIncomingWhatsAppReply } from './whatsapp/reminderService.ts';
import crypto from 'crypto';

const router = Router();
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB maximum for security
  storage: multer.memoryStorage(),
});

// GET /api/config — system capabilities and demo mode configuration
router.get('/config', (req: Request, res: Response) => {
  res.json({
    demoMode: process.env.DEMO_MODE !== 'false',
    whatsappProvider: (process.env.WHATSAPP_PROVIDER || 'simulated').toLowerCase(),
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// POST /api/auth/demo-login — 1-click passwordless instant demo sign-in
router.post('/auth/demo-login', async (req: Request, res: Response) => {
  const { role } = req.body; // 'family' | 'nurse' | 'admin'

  if (role === 'family') {
    return res.json({
      roleType: 'patient',
      token: 'token_pat_PT-SITA-2026',
      dischargeId: 'dis_sample_1',
      user: {
        id: 'cred_sita_1',
        access_id: 'PT-SITA-2026',
        patient_id: 'pat_sita_devi',
        patient_name: 'Sita Devi',
        discharge_id: 'dis_sample_1',
        hospital_name: 'AIIMS New Delhi Cardio-Care',
        doctor_name: 'Dr. Anya Sen, MD (Cardiology)',
        hospital_staff_name: 'Dr. Anya Sen, MD',
        roleType: 'patient',
      },
    });
  }

  if (role === 'nurse') {
    return res.json({
      roleType: 'hospital',
      token: 'token_nurse_priya',
      user: {
        id: 'hosp_staff_2',
        staff_id: 'HOSP-NURSE-204',
        name: 'Sister Priya Sharma, RN',
        email: 'priya.sharma@aiims.edu',
        role: 'nurse',
        roleType: 'hospital',
        hospital_name: 'AIIMS New Delhi Cardio-Care',
        department: 'Post-Op Cardiac Ward',
      },
    });
  }

  if (role === 'admin') {
    return res.json({
      roleType: 'hospital',
      token: 'token_admin_raman',
      user: {
        id: 'hosp_staff_admin',
        staff_id: 'HOSP-ADM-001',
        name: 'Dr. V. Raman (Medical Director & Administrator)',
        email: 'admin@aiims.edu',
        role: 'admin',
        roleType: 'hospital',
        hospital_name: 'AIIMS New Delhi Cardio-Care',
        department: 'Hospital Administration & Reception Desk',
      },
    });
  }

  return res.status(400).json({ error: 'Invalid demo role requested' });
});

// POST /api/admin/reset-demo-data — Resets all state to pristine seeded demo data
router.post('/admin/reset-demo-data', async (req: Request, res: Response) => {
  try {
    await resetDemoData();
    res.json({
      success: true,
      message: 'Demo dataset successfully reset to initial seeded state.',
      resetAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reset demo data: ' + err.message });
  }
});

// Middleware for demo auth via Authorization header (Bearer token) or query ?token=
function authMiddleware(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '') || (req.query.token as string) || '';
  
  // Attach user context
  (req as any).userToken = token;
  next();
}

router.use(authMiddleware);

// Utility helper to query sql.js and return rows as JS objects
export function queryRows(db: any, sql: string, params: any[] = []): any[] {
  try {
    const res = db.exec(sql, params);
    if (!res.length || !res[0].values.length) return [];
    const cols = res[0].columns;
    return res[0].values.map((row: any[]) => {
      const obj: any = {};
      cols.forEach((c: string, idx: number) => {
        obj[c] = row[idx];
      });
      return obj;
    });
  } catch (err) {
    console.error('SQL query error:', err);
    return [];
  }
}

/**
 * POST /api/auth/hospital-login
 * Authenticates verified hospital medical staff (Doctors, Nurses, Care Managers)
 */
router.post('/auth/hospital-login', async (req: Request, res: Response) => {
  const db = await getDb();
  const { staffIdOrEmail, password } = req.body;

  if (!staffIdOrEmail || !password) {
    return res.status(400).json({ error: 'Please enter your Hospital Staff ID or Official Email, and password.' });
  }

  const staff = queryRows(
    db,
    `SELECT * FROM hospital_staff 
     WHERE (LOWER(staff_id) = LOWER(?) OR LOWER(email) = LOWER(?)) 
       AND password = ?;`,
    [staffIdOrEmail.trim(), staffIdOrEmail.trim(), password.trim()]
  );

  if (!staff.length) {
    return res.status(401).json({
      error: 'Invalid hospital staff credentials. Only authorized hospital personnel (Doctors, Nurses, Staff) can log into the Hospital Portal.'
    });
  }

  const user = staff[0];
  const token = user.token || `token_staff_${user.id}`;

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      staff_id: user.staff_id,
      name: user.name,
      email: user.email,
      role: user.role,
      roleType: 'hospital',
      hospital_name: user.hospital_name,
      department: user.department,
    }
  });
});

/**
 * POST /api/auth/patient-login
 * Authenticates patient using Patient Access ID created ONLY by hospital staff
 */
router.post('/auth/patient-login', async (req: Request, res: Response) => {
  const db = await getDb();
  const { accessId, pin } = req.body;

  if (!accessId || !pin) {
    return res.status(400).json({ error: 'Please enter both your Hospital-Issued Patient Access ID and 4-digit Security PIN.' });
  }

  const cleanedId = accessId.trim().toUpperCase();
  const cleanedPin = pin.trim();

  // Strict check: Only IDs created by hospital staff exist in patient_credentials
  const creds = queryRows(
    db,
    `SELECT * FROM patient_credentials WHERE UPPER(access_id) = UPPER(?) AND status = 'active';`,
    [cleanedId]
  );

  if (!creds.length) {
    return res.status(401).json({
      error: 'Access Denied: Patient ID not found in Hospital System. For security, only Patient Access IDs created and authorized by Hospital Staff upon discharge are valid. Please check your hospital discharge papers or contact your hospital helpdesk.'
    });
  }

  const cred = creds[0];
  if (cred.pin !== cleanedPin) {
    return res.status(401).json({
      error: 'Incorrect Security PIN. Please verify the 4-digit PIN issued on your hospital discharge slip.'
    });
  }

  const token = `token_pat_${cred.access_id}`;

  res.json({
    success: true,
    token,
    user: {
      id: cred.id,
      access_id: cred.access_id,
      patient_id: cred.patient_id,
      patient_name: cred.patient_name,
      discharge_id: cred.discharge_id,
      hospital_name: cred.hospital_name,
      doctor_name: cred.doctor_name,
      hospital_staff_name: cred.hospital_staff_name,
      roleType: 'patient',
    },
    dischargeId: cred.discharge_id,
  });
});

/**
 * GET /api/auth/current
 * Checks current session from token (hospital staff or patient or fallback)
 */
router.get('/auth/current', async (req: Request, res: Response) => {
  const db = await getDb();
  const token = (req as any).userToken;

  if (!token) {
    return res.json({ roleType: 'guest', user: null });
  }

  // Check hospital staff
  const staff = queryRows(db, `SELECT * FROM hospital_staff WHERE token = ?;`, [token]);
  if (staff.length) {
    const user = staff[0];
    return res.json({
      roleType: 'hospital',
      user: {
        id: user.id,
        staff_id: user.staff_id,
        name: user.name,
        email: user.email,
        role: user.role,
        roleType: 'hospital',
        hospital_name: user.hospital_name,
        department: user.department,
      }
    });
  }

  // Check patient token
  if (token.startsWith('token_pat_')) {
    const accessId = token.replace('token_pat_', '');
    const creds = queryRows(db, `SELECT * FROM patient_credentials WHERE UPPER(access_id) = UPPER(?) AND status = 'active';`, [accessId]);
    if (creds.length) {
      const cred = creds[0];
      return res.json({
        roleType: 'patient',
        user: {
          id: cred.id,
          access_id: cred.access_id,
          patient_id: cred.patient_id,
          patient_name: cred.patient_name,
          discharge_id: cred.discharge_id,
          hospital_name: cred.hospital_name,
          doctor_name: cred.doctor_name,
          hospital_staff_name: cred.hospital_staff_name,
          roleType: 'patient',
        },
        dischargeId: cred.discharge_id,
      });
    }
  }

  // Check legacy users table
  const legacy = queryRows(db, `SELECT id, username, role, name, token FROM users WHERE token = ?;`, [token]);
  if (legacy.length) {
    const u = legacy[0];
    return res.json({
      roleType: u.role === 'nurse' || u.role === 'admin' ? 'hospital' : 'patient',
      user: {
        id: u.id,
        name: u.name,
        role: u.role,
        username: u.username,
        roleType: u.role === 'nurse' || u.role === 'admin' ? 'hospital' : 'patient',
      }
    });
  }

  return res.json({ roleType: 'guest', user: null });
});

/**
 * GET /api/users/current
 */
router.get('/users/current', async (req: Request, res: Response) => {
  const db = await getDb();
  const token = (req as any).userToken;
  const result = db.exec("SELECT id, username, role, name, token FROM users WHERE token = ?;", [token]);
  
  if (result.length > 0 && result[0].values.length > 0) {
    const [id, username, role, name] = result[0].values[0];
    res.json({ id, username, role, name, token });
  } else {
    // Default fallback to caregiver
    res.json({ id: 'usr_caregiver_1', username: 'caregiver', role: 'caregiver', name: 'Amit Kumar (Son)', token: 'token_caregiver_1' });
  }
});

/**
 * GET /api/discharges
 * Lists patient discharge records
 */
router.get('/discharges', async (req: Request, res: Response) => {
  const db = await getDb();
  const result = db.exec(`
    SELECT d.id, d.patient_id, d.hospital_name, d.discharge_date, d.original_file_name,
           d.helpdesk_number, d.status, d.created_at, p.name_encrypted, p.abha_id
    FROM discharges d
    LEFT JOIN patients p ON d.patient_id = p.id
    ORDER BY d.created_at DESC;
  `);

  if (!result.length || !result[0].values.length) {
    return res.json([]);
  }

  const columns = result[0].columns;
  const list = result[0].values.map((row) => {
    const item: any = {};
    columns.forEach((col, idx) => {
      item[col] = row[idx];
    });
    item.patient_name = decryptText(item.name_encrypted || '');
    return item;
  });

  res.json(list);
});

/**
 * GET /api/discharges/:id
 * Fetches full discharge plan with medicines, follow_ups, warnings, dose_events
 */
router.get('/discharges/:id', async (req: Request, res: Response) => {
  const db = await getDb();
  const dischargeId = req.params.id;

  const dRes = db.exec("SELECT * FROM discharges WHERE id = ?;", [dischargeId]);
  if (!dRes.length || !dRes[0].values.length) {
    return res.status(404).json({ error: 'Discharge record not found' });
  }

  const dCols = dRes[0].columns;
  const dRow = dRes[0].values[0];
  const discharge: any = {};
  dCols.forEach((col, idx) => (discharge[col] = dRow[idx]));

  // Patient
  const pRes = db.exec("SELECT * FROM patients WHERE id = ?;", [discharge.patient_id]);
  if (pRes.length && pRes[0].values.length) {
    discharge.patient_name = decryptText(pRes[0].values[0][1] as string);
    discharge.patient_phone = decryptText(pRes[0].values[0][2] as string);
    discharge.abha_id = pRes[0].values[0][3];
    discharge.patient_preferred_language = pRes[0].values[0][4] || 'en';
  } else {
    discharge.patient_preferred_language = 'en';
  }

  // Medicines
  const mRes = db.exec("SELECT * FROM medicines WHERE discharge_id = ? ORDER BY created_at ASC;", [dischargeId]);
  discharge.medicines = [];
  if (mRes.length && mRes[0].values.length) {
    const mCols = mRes[0].columns;
    discharge.medicines = mRes[0].values.map((row) => {
      const med: any = {};
      mCols.forEach((c, i) => (med[c] = row[i]));
      try {
        med.slots = JSON.parse(med.slots_json || '[]');
      } catch {
        med.slots = [];
      }
      return med;
    });
  }

  // Follow-ups
  const fuRes = db.exec("SELECT * FROM follow_ups WHERE discharge_id = ?;", [dischargeId]);
  discharge.follow_ups = [];
  if (fuRes.length && fuRes[0].values.length) {
    const fuCols = fuRes[0].columns;
    discharge.follow_ups = fuRes[0].values.map((row) => {
      const fu: any = {};
      fuCols.forEach((c, i) => (fu[c] = row[i]));
      return fu;
    });
  }

  // Warnings
  const wRes = db.exec("SELECT * FROM warnings WHERE discharge_id = ?;", [dischargeId]);
  discharge.warnings = [];
  if (wRes.length && wRes[0].values.length) {
    const wCols = wRes[0].columns;
    discharge.warnings = wRes[0].values.map((row) => {
      const w: any = {};
      wCols.forEach((c, i) => (w[c] = row[i]));
      return w;
    });
  }

  // Dose Events for today
  const deRes = db.exec("SELECT * FROM dose_events WHERE discharge_id = ?;", [dischargeId]);
  discharge.dose_events = [];
  if (deRes.length && deRes[0].values.length) {
    const deCols = deRes[0].columns;
    discharge.dose_events = deRes[0].values.map((row) => {
      const de: any = {};
      deCols.forEach((c, i) => (de[c] = row[i]));
      return de;
    });
  }

  // Diet Plan
  const dietRes = queryRows(db, "SELECT * FROM diet_plans WHERE discharge_id = ? LIMIT 1;", [dischargeId]);
  if (dietRes.length) {
    const rawDiet = dietRes[0];
    discharge.diet_plan = {
      id: rawDiet.id,
      discharge_id: rawDiet.discharge_id,
      diet_type: rawDiet.diet_type,
      calories_target: rawDiet.calories_target,
      hydration_target: rawDiet.hydration_target,
      prescribed_by: rawDiet.prescribed_by,
      meals: JSON.parse(rawDiet.meals_json || '[]'),
      add_ons: JSON.parse(rawDiet.addons_json || '[]'),
      measures: JSON.parse(rawDiet.measures_json || '[]'),
      special_instructions: rawDiet.special_instructions,
      created_at: rawDiet.created_at,
      updated_at: rawDiet.updated_at,
    };
  } else {
    discharge.diet_plan = null;
  }

  res.json(discharge);
});

/**
 * POST /api/discharges
 * Upload discharge file or load synthetic sample
 */
router.post('/discharges', upload.single('file'), async (req: Request, res: Response) => {
  const db = await getDb();
  const sampleKey = req.body.sampleKey; // 'sample1' | 'sample2' | 'sample3'
  
  let fileName = 'discharge_upload.jpg';
  let mimeType = 'image/jpeg';
  let fileBuffer: Buffer | null = null;

  if (req.file) {
    fileName = req.file.originalname;
    mimeType = req.file.mimetype;
    fileBuffer = req.file.buffer;

    // Image quality check
    const quality = checkImageQuality(fileBuffer, mimeType);
    if (!quality.valid) {
      return res.status(400).json({ error: quality.reason });
    }
  }

  let extractedData;
  if (sampleKey === 'sample1') {
    extractedData = {
      hospital_name: 'AIIMS New Delhi Cardio-Care',
      discharge_date: '2026-10-10',
      helpdesk_number: RECEPTION_CALL_NUMBER,
      medicines: [
        { name: 'Ecosprin', strength: '75mg', frequency_code: 'OD', timing_note: '', duration: '30 days', source_text: 'Tab Ecosprin 75 OD', confidence: 0.96 },
        { name: 'Metoprolol', strength: '25mg', frequency_code: 'BD', timing_note: '', duration: '30 days', source_text: 'Tab Metoprolol 25 BD', confidence: 0.94 },
      ],
      follow_up: { text: 'Review after 7 days', source_text: 'Review after 7 days' },
      warnings: [{ text: 'SOS if breathlessness', source_text: 'SOS if breathlessness', action_text: '' }],
      raw_text: 'Tab Ecosprin 75 OD, Tab Metoprolol 25 BD, Review after 7 days, SOS if breathlessness',
    };
  } else if (sampleKey === 'sample2') {
    extractedData = {
      hospital_name: 'Max Super Speciality Hospital',
      discharge_date: '2026-10-11',
      helpdesk_number: '011-40554055',
      medicines: [
        { name: 'Pantop', strength: '40mg', frequency_code: 'OD', timing_note: 'Subah before breakfast', duration: '7 days', source_text: 'Tab Pantop 40mg OD Subah (before breakfast) x 7 days', confidence: 0.98 },
        { name: 'Amoxicillin', strength: '500mg', frequency_code: 'BD', timing_note: 'After meals', duration: '5 days', source_text: 'Tab Amoxicillin 500mg BD (after meals) x 5 days', confidence: 0.95 },
        { name: 'Paracetamol', strength: '650mg', frequency_code: 'TDS', timing_note: 'After food', duration: '3 days', source_text: 'Tab Paracetamol 650mg TDS (after food) x 3 days', confidence: 0.94 },
      ],
      follow_up: { text: 'Follow-up on 18 Oct 2026 at Room 204', source_text: 'Follow-up on 18 Oct 2026 at Room 204' },
      warnings: [{ text: 'High fever > 102F or severe skin rash', source_text: 'Call doctor or visit ER if high fever > 102F or severe skin rash', action_text: 'Call doctor or visit ER immediately' }],
      raw_text: 'Clean sheet with complete timings',
    };
  } else if (sampleKey === 'sample3') {
    extractedData = {
      hospital_name: 'Metro Community Clinic',
      discharge_date: '2026-10-11',
      helpdesk_number: '011-23344556',
      medicines: [
        { name: 'Cardiopril', strength: '5mg', frequency_code: 'QAM', timing_note: '', duration: '30 days', source_text: 'Tab Cardiopril 5mg QAM x 30d', confidence: 0.85 },
        { name: 'Neurofit', strength: '1 cap', frequency_code: 'BD', timing_note: '', duration: '', source_text: 'Cap Neurofit 1 cap BD', confidence: 0.92 },
        { name: 'Gastrid', strength: '20mg', frequency_code: 'QOD', timing_note: '', duration: '', source_text: 'Tab Gastrid 20 QOD', confidence: 0.74 },
        { name: 'Symptom Relief', strength: '', frequency_code: 'SOS', timing_note: '', duration: '', source_text: 'SOS for chest heaviness', confidence: 0.9 },
      ],
      follow_up: { text: 'Review after 10 days', source_text: 'Review after 10 days' },
      warnings: [{ text: 'Chest heaviness', source_text: 'SOS for chest heaviness', action_text: '' }],
      raw_text: 'Messy sheet with non-standard abbreviations',
    };
  } else if (fileBuffer) {
    extractedData = await extractDischargeSheet(fileBuffer, mimeType, fileName);
  } else {
    // Default fallback to Sample 1
    extractedData = {
      hospital_name: 'City Care Hospital',
      discharge_date: '2026-10-11',
      helpdesk_number: '1800-CARE-NOW',
      medicines: [
        { name: 'Metoprolol', strength: '25mg', frequency_code: 'BD', source_text: 'Tab Metoprolol 25 BD', confidence: 0.95 },
        { name: 'Ecosprin', strength: '75mg', frequency_code: 'OD', source_text: 'Tab Ecosprin 75 OD', confidence: 0.92 },
      ],
      follow_up: { text: 'Review after 7 days', source_text: 'Review after 7 days' },
      warnings: [{ text: 'SOS if breathlessness', source_text: 'SOS if breathlessness', action_text: '' }],
      raw_text: 'Tab Metoprolol 25 BD, Tab Ecosprin 75 OD, Review after 7 days',
    };
  }

  const dischargeId = `dis_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const patientId = 'pat_sita_devi';

  // Evaluate Rules on each item
  let hasFlaggedItems = false;
  const processedMeds = extractedData.medicines.map((m, idx) => {
    const rule = evaluateMedicineRules(m);
    if (rule.status === 'needs_nurse_check') hasFlaggedItems = true;
    return {
      id: `med_${dischargeId}_${idx + 1}`,
      discharge_id: dischargeId,
      name: m.name,
      strength: m.strength || '',
      frequency_code: m.frequency_code,
      timing_note: m.timing_note || '',
      duration: m.duration || '',
      source_text: m.source_text,
      confidence: m.confidence,
      status: rule.status,
      flag_reason: rule.flag_reason || '',
      slots_json: JSON.stringify(rule.slots),
      timing_instruction_en: rule.timing_instruction_en,
      timing_instruction_hi: rule.timing_instruction_hi,
      nurse_notes: '',
    };
  });

  const fuRule = evaluateFollowUp(extractedData.follow_up, extractedData.discharge_date);
  if (fuRule.status === 'needs_nurse_check') hasFlaggedItems = true;

  const processedWarnings = (extractedData.warnings || []).map((w, idx) => {
    const wRule = evaluateWarningItem(w);
    if (wRule.status === 'needs_nurse_check') hasFlaggedItems = true;
    return {
      id: `warn_${dischargeId}_${idx + 1}`,
      discharge_id: dischargeId,
      text: wRule.text,
      source_text: wRule.source_text,
      action_text: wRule.action_text,
      status: wRule.status,
      flag_reason: (wRule as any).flag_reason || '',
    };
  });

  const overallStatus = hasFlaggedItems ? 'partially_verified' : 'approved';

  // Persist into database
  db.run(`
    INSERT INTO discharges (id, patient_id, hospital_name, discharge_date, original_file_name, file_url, raw_text, helpdesk_number, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    dischargeId,
    patientId,
    extractedData.hospital_name || 'Hospital Discharge Summary',
    extractedData.discharge_date || '2026-10-11',
    fileName,
    `/uploads/${fileName}`,
    extractedData.raw_text || '',
    extractedData.helpdesk_number || '1800-CARE-NOW',
    overallStatus,
    new Date().toISOString()
  ]);

  // Insert medicines
  processedMeds.forEach((pm) => {
    db.run(`
      INSERT INTO medicines (id, discharge_id, name, strength, frequency_code, timing_note, duration, source_text, confidence, status, flag_reason, slots_json, timing_instruction_en, timing_instruction_hi, nurse_notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      pm.id, pm.discharge_id, pm.name, pm.strength, pm.frequency_code, pm.timing_note, pm.duration, pm.source_text, pm.confidence, pm.status, pm.flag_reason, pm.slots_json, pm.timing_instruction_en, pm.timing_instruction_hi, pm.nurse_notes, new Date().toISOString(), new Date().toISOString()
    ]);
  });

  // Insert Follow-up
  if (extractedData.follow_up) {
    db.run(`
      INSERT INTO follow_ups (id, discharge_id, due_date, text, source_text, confidence, status, flag_reason, done, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      `fu_${dischargeId}_1`,
      dischargeId,
      fuRule.dueDate || '2026-10-18',
      fuRule.displayText_en,
      extractedData.follow_up.source_text,
      0.95,
      fuRule.status,
      fuRule.flag_reason || '',
      0,
      new Date().toISOString()
    ]);
  }

  // Insert warnings
  processedWarnings.forEach((pw) => {
    db.run(`
      INSERT INTO warnings (id, discharge_id, text, source_text, action_text, status, flag_reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      pw.id, pw.discharge_id, pw.text, pw.source_text, pw.action_text, pw.status, pw.flag_reason, new Date().toISOString()
    ]);
  });

  // Log in audit trail
  db.run(`
    INSERT INTO audit_log (id, discharge_id, entity_type, entity_id, action, actor_role, actor_name, old_value, new_value, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    `aud_${Date.now()}`,
    dischargeId,
    'discharge',
    dischargeId,
    'UPLOAD_AND_INGESTION',
    'caregiver',
    'Family Member / Caregiver',
    '',
    `Created discharge plan. Extracted ${processedMeds.length} medicines. Status: ${overallStatus}`,
    new Date().toISOString()
  ]);

  // Generate hospital-authorized Patient Access ID & PIN for this patient
  const accessId = `PT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const pin = `${Math.floor(1000 + Math.random() * 9000)}`;
  const patientDisplayName = sampleKey === 'sample2' ? 'Rajesh Verma' : 'Sita Devi';

  db.run(`
    INSERT INTO patient_credentials (id, access_id, pin, patient_id, patient_name, discharge_id, hospital_staff_id, hospital_staff_name, hospital_name, doctor_name, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    `cred_${dischargeId}`,
    accessId,
    pin,
    patientId,
    patientDisplayName,
    dischargeId,
    'HOSP-DOC-101',
    'Dr. Anya Sen, MD',
    extractedData.hospital_name || 'Hospital Care',
    'Dr. Anya Sen, MD (Cardiology)',
    'active',
    new Date().toISOString()
  ]);

  saveDb();

  res.status(201).json({
    id: dischargeId,
    status: overallStatus,
    medicinesCount: processedMeds.length,
    flaggedCount: processedMeds.filter((m) => m.status === 'needs_nurse_check').length,
    accessId,
    pin,
    patientName: patientDisplayName,
  });
});

/**
 * GET /api/nurse/queue
 * Returns items requiring nurse verification
 */
router.get('/nurse/queue', async (req: Request, res: Response) => {
  const db = await getDb();
  
  // Flagged medicines
  const mRes = db.exec(`
    SELECT m.*, d.hospital_name, d.discharge_date, d.patient_id
    FROM medicines m
    JOIN discharges d ON m.discharge_id = d.id
    WHERE m.status = 'needs_nurse_check'
    ORDER BY m.created_at ASC;
  `);

  const flaggedMedicines: any[] = [];
  if (mRes.length && mRes[0].values.length) {
    const cols = mRes[0].columns;
    mRes[0].values.forEach((row) => {
      const item: any = {};
      cols.forEach((c, i) => (item[c] = row[i]));
      try {
        item.slots = JSON.parse(item.slots_json || '[]');
      } catch {
        item.slots = [];
      }
      flaggedMedicines.push(item);
    });
  }

  // Flagged warnings
  const wRes = db.exec(`
    SELECT w.*, d.hospital_name, d.discharge_date
    FROM warnings w
    JOIN discharges d ON w.discharge_id = d.id
    WHERE w.status = 'needs_nurse_check'
    ORDER BY w.created_at ASC;
  `);

  const flaggedWarnings: any[] = [];
  if (wRes.length && wRes[0].values.length) {
    const cols = wRes[0].columns;
    wRes[0].values.forEach((row) => {
      const item: any = {};
      cols.forEach((c, i) => (item[c] = row[i]));
      flaggedWarnings.push(item);
    });
  }

  res.json({
    queueLength: flaggedMedicines.length + flaggedWarnings.length,
    medicines: flaggedMedicines,
    warnings: flaggedWarnings,
  });
});

/**
 * PATCH /api/items/:id
 * Nurse edits a medicine's slot, strength, notes, or timing
 */
router.patch('/items/:id', async (req: Request, res: Response) => {
  const db = await getDb();
  const itemId = req.params.id;
  const { slots, timing_note, strength, nurse_notes } = req.body;

  const current = db.exec("SELECT * FROM medicines WHERE id = ?;", [itemId]);
  if (!current.length || !current[0].values.length) {
    return res.status(404).json({ error: 'Medicine not found' });
  }

  const oldSlots = current[0].values[0][11];
  const dischargeId = current[0].values[0][1];

  let newSlotsJson = oldSlots;
  if (Array.isArray(slots)) {
    newSlotsJson = JSON.stringify(slots);
  }

  db.run(`
    UPDATE medicines
    SET slots_json = ?,
        timing_note = COALESCE(?, timing_note),
        strength = COALESCE(?, strength),
        nurse_notes = COALESCE(?, nurse_notes),
        updated_at = ?
    WHERE id = ?;
  `, [
    newSlotsJson,
    timing_note || null,
    strength || null,
    nurse_notes || null,
    new Date().toISOString(),
    itemId
  ]);

  // Audit log
  db.run(`
    INSERT INTO audit_log (id, discharge_id, entity_type, entity_id, action, actor_role, actor_name, old_value, new_value, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    `aud_${Date.now()}`,
    dischargeId,
    'medicine',
    itemId,
    'NURSE_EDITED_ITEM',
    'nurse',
    'Sister Priya Sharma, RN',
    `slots: ${oldSlots}`,
    `slots: ${newSlotsJson} | notes: ${nurse_notes || ''}`,
    new Date().toISOString()
  ]);

  saveDb();
  res.json({ success: true, itemId, updatedSlots: slots });
});

/**
 * POST /api/items/:id/approve
 * Nurse approves a flagged medicine or warning. Turns plan item green!
 */
router.post('/items/:id/approve', async (req: Request, res: Response) => {
  const db = await getDb();
  const itemId = req.params.id;
  const { slots, nurse_notes, action_text } = req.body;

  // Check if medicine
  const mRes = db.exec("SELECT * FROM medicines WHERE id = ?;", [itemId]);
  if (mRes.length && mRes[0].values.length) {
    const med = mRes[0].values[0];
    const dischargeId = med[1];
    const slotsToSet = Array.isArray(slots) && slots.length > 0 
      ? JSON.stringify(slots) 
      : JSON.stringify(['subah']); // default assigned slot on approval if none was set

    db.run(`
      UPDATE medicines
      SET status = 'approved',
          slots_json = ?,
          nurse_notes = ?,
          flag_reason = '',
          updated_at = ?
      WHERE id = ?;
    `, [
      slotsToSet,
      nurse_notes || 'Approved after clinical review with discharge doctor',
      new Date().toISOString(),
      itemId
    ]);

    // Check if all medicines for this discharge are now approved/clear
    const remaining = db.exec("SELECT COUNT(*) FROM medicines WHERE discharge_id = ? AND status = 'needs_nurse_check';", [dischargeId]);
    const remCount = remaining[0]?.values[0]?.[0] as number;
    if (remCount === 0) {
      db.run("UPDATE discharges SET status = 'approved' WHERE id = ?;", [dischargeId]);
    }

    // Audit log
    db.run(`
      INSERT INTO audit_log (id, discharge_id, entity_type, entity_id, action, actor_role, actor_name, old_value, new_value, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      `aud_${Date.now()}`,
      dischargeId,
      'medicine',
      itemId,
      'NURSE_APPROVED_MEDICINE',
      'nurse',
      'Sister Priya Sharma, RN',
      'status: needs_nurse_check',
      `status: approved | slots: ${slotsToSet}`,
      new Date().toISOString()
    ]);

    saveDb();
    return res.json({ success: true, itemId, status: 'approved' });
  }

  // Check if warning
  const wRes = db.exec("SELECT * FROM warnings WHERE id = ?;", [itemId]);
  if (wRes.length && wRes[0].values.length) {
    const warn = wRes[0].values[0];
    const dischargeId = warn[1];

    db.run(`
      UPDATE warnings
      SET status = 'approved',
          action_text = ?,
          flag_reason = ''
      WHERE id = ?;
    `, [
      action_text || 'Call hospital emergency helpline immediately or visit local ER',
      itemId
    ]);

    // Audit log
    db.run(`
      INSERT INTO audit_log (id, discharge_id, entity_type, entity_id, action, actor_role, actor_name, old_value, new_value, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      `aud_${Date.now()}`,
      dischargeId,
      'warning',
      itemId,
      'NURSE_APPROVED_WARNING',
      'nurse',
      'Sister Priya Sharma, RN',
      'status: needs_nurse_check',
      `status: approved | action: ${action_text}`,
      new Date().toISOString()
    ]);

    saveDb();
    return res.json({ success: true, itemId, status: 'approved' });
  }

  return res.status(404).json({ error: 'Item not found' });
});

/**
 * GET /api/discharges/:id/audit
 * Returns full audit trail
 */
router.get('/discharges/:id/audit', async (req: Request, res: Response) => {
  const db = await getDb();
  const dischargeId = req.params.id;

  const result = db.exec("SELECT * FROM audit_log WHERE discharge_id = ? ORDER BY timestamp DESC;", [dischargeId]);
  if (!result.length || !result[0].values.length) {
    return res.json([]);
  }

  const cols = result[0].columns;
  const list = result[0].values.map((row) => {
    const item: any = {};
    cols.forEach((c, idx) => (item[c] = row[idx]));
    return item;
  });

  res.json(list);
});

/**
 * POST /api/doses/:id/given
 * Marks a scheduled dose as administered
 */
router.post('/doses/:id/given', async (req: Request, res: Response) => {
  const db = await getDb();
  const medicineId = req.params.id;
  const { slot, given, dischargeId, caregiverName } = req.body;

  const dateStr = new Date().toISOString().split('T')[0];
  const eventId = `dose_${medicineId}_${slot}_${dateStr}`;

  // Check if exists
  const existing = db.exec("SELECT * FROM dose_events WHERE id = ?;", [eventId]);
  if (existing.length && existing[0].values.length) {
    db.run(`
      UPDATE dose_events
      SET given = ?, given_at = ?, caregiver_name = ?
      WHERE id = ?;
    `, [given ? 1 : 0, given ? new Date().toISOString() : null, caregiverName || 'Caregiver', eventId]);
  } else {
    db.run(`
      INSERT INTO dose_events (id, discharge_id, medicine_id, slot, scheduled_date, given, given_at, caregiver_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `, [eventId, dischargeId || 'dis_sample_1', medicineId, slot, dateStr, given ? 1 : 0, given ? new Date().toISOString() : null, caregiverName || 'Caregiver']);
  }

  // Audit
  db.run(`
    INSERT INTO audit_log (id, discharge_id, entity_type, entity_id, action, actor_role, actor_name, old_value, new_value, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    `aud_${Date.now()}`,
    dischargeId || 'dis_sample_1',
    'dose_event',
    eventId,
    given ? 'DOSE_MARKED_GIVEN' : 'DOSE_UNMARKED',
    'caregiver',
    caregiverName || 'Caregiver',
    '',
    `Medicine: ${medicineId} | Slot: ${slot} | Given: ${given}`,
    new Date().toISOString()
  ]);

  saveDb();
  res.json({ success: true, eventId, given });
});

/**
 * POST /api/followups/:id/done
 * Marks follow-up as completed
 */
router.post('/followups/:id/done', async (req: Request, res: Response) => {
  const db = await getDb();
  const fuId = req.params.id;
  const { done } = req.body;

  db.run("UPDATE follow_ups SET done = ? WHERE id = ?;", [done ? 1 : 0, fuId]);
  saveDb();
  res.json({ success: true, fuId, done });
});

/**
 * GET /api/hospital/staff
 * Lists registered hospital medical personnel
 */
router.get('/hospital/staff', async (req: Request, res: Response) => {
  const db = await getDb();
  const staff = queryRows(
    db,
    `SELECT id, staff_id, name, email, role, hospital_name, department, created_at 
     FROM hospital_staff 
     ORDER BY name ASC;`
  );
  res.json(staff);
});

/**
 * GET /api/hospital/patient-credentials
 * Hospital staff can view all generated patient access credentials
 */
router.get('/hospital/patient-credentials', async (req: Request, res: Response) => {
  const db = await getDb();
  const list = queryRows(
    db,
    `SELECT c.*, d.hospital_name, d.discharge_date, d.status as discharge_status
     FROM patient_credentials c
     LEFT JOIN discharges d ON c.discharge_id = d.id
     ORDER BY c.created_at DESC;`
  );
  res.json(list);
});

/**
 * POST /api/hospital/patient-credentials
 * Hospital staff generates an official Patient Access ID & PIN for a patient
 */
router.post('/hospital/patient-credentials', async (req: Request, res: Response) => {
  const db = await getDb();
  const { dischargeId, patientName, doctorName, hospitalName, staffId, staffName } = req.body;

  if (!dischargeId) {
    return res.status(400).json({ error: 'Discharge record ID is required.' });
  }

  const accessId = `PT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const pin = `${Math.floor(1000 + Math.random() * 9000)}`;
  const credId = `cred_${Date.now()}`;

  db.run(`
    INSERT INTO patient_credentials (id, access_id, pin, patient_id, patient_name, discharge_id, hospital_staff_id, hospital_staff_name, hospital_name, doctor_name, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    credId,
    accessId,
    pin,
    `pat_${accessId}`,
    patientName || 'Discharged Patient',
    dischargeId,
    staffId || 'HOSP-DOC-101',
    staffName || 'Hospital Medical Staff',
    hospitalName || 'Hospital Care Center',
    doctorName || 'Attending Physician, MD',
    'active',
    new Date().toISOString()
  ]);

  saveDb();

  res.status(201).json({
    success: true,
    credential: {
      id: credId,
      access_id: accessId,
      pin,
      patient_name: patientName || 'Discharged Patient',
      discharge_id: dischargeId,
      hospital_name: hospitalName,
      doctor_name: doctorName,
    }
  });
});

/**
 * POST /api/hospital/prescribe
 * Hospital staff directly uploads & prescribes patient medications, timings, and instructions,
 * generating a verified Patient Access ID and prescription checklist.
 */
router.post('/hospital/prescribe', async (req: Request, res: Response) => {
  const db = await getDb();
  const {
    patientName,
    patientAge,
    patientPhone,
    hospitalName,
    doctorName,
    department,
    helpdeskNumber,
    medicines, // Array of { name, strength, dosageForm, frequencyCode, slots, foodInstruction, timingNote, duration, notes }
    followUpText,
    warningsText,
    staffId,
    staffName,
    dietPlan,
  } = req.body;

  if (!patientName || !medicines || !Array.isArray(medicines) || medicines.length === 0) {
    return res.status(400).json({ error: 'Patient name and at least one medication are required.' });
  }

  const dischargeId = `dis_hosp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const patientId = `pat_${Date.now()}`;
  const now = new Date().toISOString();
  const todayDate = now.split('T')[0];

  // 1. Create Patient record
  db.run(`
    INSERT INTO patients (id, name_encrypted, phone_encrypted, abha_id, preferred_language, created_at)
    VALUES (?, ?, ?, ?, ?, ?);
  `, [
    patientId,
    encryptText(patientName),
    encryptText(patientPhone || getReceptionCall().formatted),
    `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
    'en',
    now
  ]);

  // 2. Create Discharge summary
  db.run(`
    INSERT INTO discharges (id, patient_id, hospital_name, discharge_date, original_file_name, file_url, raw_text, helpdesk_number, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    dischargeId,
    patientId,
    hospitalName || 'Hospital Care Center',
    todayDate,
    `Prescription_${patientName.replace(/\s+/g, '_')}.pdf`,
    '/hospital/prescription-slip',
    `Prescribed by ${doctorName || 'Attending Physician'} (${department || 'General Medicine'}). Medications: ${medicines.map((m: any) => m.name).join(', ')}`,
    helpdeskNumber || RECEPTION_CALL_NUMBER,
    'approved', // Direct prescription by hospital doctor is pre-approved
    now
  ]);

  // 3. Insert each medicine uploaded by hospital
  medicines.forEach((med: any, index: number) => {
    const medId = `med_${dischargeId}_${index + 1}`;
    const slots = Array.isArray(med.slots) && med.slots.length > 0 ? med.slots : ['subah'];
    
    // Construct timing instructions in plain language
    const slotNamesEn = slots.map((s: string) => {
      if (s === 'subah') return 'Morning (8:00 AM)';
      if (s === 'dopahar') return 'Afternoon (1:00 PM)';
      if (s === 'shaam') return 'Evening (5:00 PM)';
      if (s === 'raat') return 'Night (9:00 PM)';
      return s;
    }).join(' and ');

    const timingEn = `${slotNamesEn}. ${med.foodInstruction || 'After meals'}`;
    const timingHi = `${slots.map((s: string) => s === 'subah' ? 'सुबह' : s === 'dopahar' ? 'दोपहर' : s === 'shaam' ? 'शाम' : 'रात').join(' और ')}। ${med.foodInstruction || 'खाने के बाद'}`;
    const doctorNotesText = med.doctorNotes || med.notes || '';

    db.run(`
      INSERT INTO medicines (
        id, discharge_id, name, strength, frequency_code, timing_note, duration,
        source_text, confidence, status, flag_reason, slots_json, timing_instruction_en,
        timing_instruction_hi, nurse_notes, food_instruction, prescribed_by, dosage_form, doctor_notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      medId,
      dischargeId,
      med.name,
      med.strength || '',
      med.frequencyCode || (slots.length === 1 ? 'OD' : slots.length === 2 ? 'BD' : 'TDS'),
      med.timingNote || timingEn,
      med.duration || '30 days',
      `Dr. ${doctorName || 'Physician'}: ${med.name} ${med.strength || ''} ${doctorNotesText}`,
      1.0,
      'approved',
      '',
      JSON.stringify(slots),
      timingEn,
      timingHi,
      med.notes || `Prescribed by Dr. ${doctorName || 'Hospital Staff'}.`,
      med.foodInstruction || 'After meals with water',
      doctorName || 'Attending Physician',
      med.dosageForm || 'tablet',
      doctorNotesText,
      now,
      now
    ]);
  });

  // 4. Follow-up
  if (followUpText) {
    db.run(`
      INSERT INTO follow_ups (id, discharge_id, due_date, text, source_text, confidence, status, flag_reason, done, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      `fu_${dischargeId}_1`,
      dischargeId,
      todayDate,
      followUpText,
      followUpText,
      1.0,
      'approved',
      '',
      0,
      now
    ]);
  }

  // 5. Emergency Warning
  if (warningsText) {
    db.run(`
      INSERT INTO warnings (id, discharge_id, text, source_text, action_text, status, flag_reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      `warn_${dischargeId}_1`,
      dischargeId,
      warningsText,
      warningsText,
      `Contact Hospital Helpdesk (${helpdeskNumber || RECEPTION_CALL_NUMBER}) or visit Emergency immediately`,
      'approved',
      '',
      now
    ]);
  }

  // 5b. Diet Plan given by hospital
  const dietId = `diet_${dischargeId}`;
  const dType = dietPlan?.diet_type || dietPlan?.dietType || 'Hospital Prescribed Clinical Recovery Diet';
  const dCal = dietPlan?.calories_target || dietPlan?.caloriesTarget || '1,600 - 1,800 kcal/day';
  const dHyd = dietPlan?.hydration_target || dietPlan?.hydrationTarget || '1.5 - 2.0 L/day';
  const dMeals = Array.isArray(dietPlan?.meals) ? dietPlan.meals : [];
  const dAddOns = Array.isArray(dietPlan?.add_ons) ? dietPlan.add_ons : (Array.isArray(dietPlan?.addOns) ? dietPlan.addOns : []);
  const dMeasures = Array.isArray(dietPlan?.measures) ? dietPlan.measures : [];
  const dSpec = dietPlan?.special_instructions || dietPlan?.specialInstructions || 'Follow hospital dietary recommendations and precautions.';

  db.run(`
    INSERT OR REPLACE INTO diet_plans (
      id, discharge_id, diet_type, calories_target, hydration_target, prescribed_by,
      meals_json, addons_json, measures_json, special_instructions, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    dietId,
    dischargeId,
    dType,
    dCal,
    dHyd,
    staffName || doctorName || 'Hospital Care Team',
    JSON.stringify(dMeals),
    JSON.stringify(dAddOns),
    JSON.stringify(dMeasures),
    dSpec,
    now,
    now
  ]);

  // 6. Generate official Patient Access ID and PIN
  const accessId = `PT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const pin = `${Math.floor(1000 + Math.random() * 9000)}`;

  db.run(`
    INSERT INTO patient_credentials (
      id, access_id, pin, patient_id, patient_name, discharge_id, hospital_staff_id,
      hospital_staff_name, hospital_name, doctor_name, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    `cred_${dischargeId}`,
    accessId,
    pin,
    patientId,
    patientName,
    dischargeId,
    staffId || 'HOSP-DOC-101',
    staffName || doctorName || 'Dr. Anya Sen, MD',
    hospitalName || 'Hospital Care Center',
    doctorName || 'Attending Physician, MD',
    'active',
    now
  ]);

  // 7. Audit Log
  db.run(`
    INSERT INTO audit_log (id, discharge_id, entity_type, entity_id, action, actor_role, actor_name, old_value, new_value, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    `aud_${Date.now()}`,
    dischargeId,
    'prescription',
    dischargeId,
    'HOSPITAL_PRESCRIPTION_UPLOAD',
    'hospital_doctor',
    staffName || doctorName || 'Hospital Doctor',
    '',
    `Uploaded prescription for ${patientName}: ${medicines.length} medicines, Patient ID: ${accessId}`,
    now
  ]);

  saveDb();

  res.status(201).json({
    success: true,
    dischargeId,
    accessId,
    pin,
    patientName,
    medicinesCount: medicines.length,
    doctorName: doctorName || 'Attending Physician',
    hospitalName: hospitalName || 'Hospital Care Center'
  });
});

/**
 * GET /api/patient/checklist/:dischargeId
 * Returns the well-organized medicine checklist according to the doctor's prescription.
 * Includes time blocks, food directions, today's administration status, and adherence stats.
 */
router.get('/patient/checklist/:dischargeId', async (req: Request, res: Response) => {
  const db = await getDb();
  const dischargeId = req.params.dischargeId;
  const todayDate = new Date().toISOString().split('T')[0];

  // Fetch discharge info
  const dRes = queryRows(db, "SELECT * FROM discharges WHERE id = ?;", [dischargeId]);
  if (!dRes.length) {
    return res.status(404).json({ error: 'Prescription or discharge record not found.' });
  }
  const discharge = dRes[0];

  // Fetch Patient info
  const pRes = queryRows(db, "SELECT * FROM patients WHERE id = ?;", [discharge.patient_id]);
  const patient = pRes.length ? pRes[0] : null;
  const patientName = patient ? decryptText(patient.name_encrypted || '') : 'Patient';

  // Fetch Credential (issued by hospital)
  const cRes = queryRows(db, "SELECT * FROM patient_credentials WHERE discharge_id = ? LIMIT 1;", [dischargeId]);
  const credential = cRes.length ? cRes[0] : null;

  // Fetch Medicines
  const meds = queryRows(db, "SELECT * FROM medicines WHERE discharge_id = ? ORDER BY created_at ASC;", [dischargeId]);

  // Fetch today's dose events
  const doseEvents = queryRows(
    db,
    "SELECT * FROM dose_events WHERE discharge_id = ? AND scheduled_date = ?;",
    [dischargeId, todayDate]
  );
  const doseMap: Record<string, { given: boolean; given_at: string | null; caregiver_name: string | null }> = {};
  doseEvents.forEach((de: any) => {
    const key = `${de.medicine_id}_${de.slot}`;
    doseMap[key] = {
      given: Boolean(de.given),
      given_at: de.given_at,
      caregiver_name: de.caregiver_name,
    };
  });

  // Parse slots and format each medicine
  const processedMeds = meds.map((m: any) => {
    let slots: string[] = [];
    try {
      slots = JSON.parse(m.slots_json || '[]');
    } catch {
      slots = ['subah'];
    }
    if (slots.length === 0) {
      if (m.frequency_code === 'BD') slots = ['subah', 'raat'];
      else if (m.frequency_code === 'TDS') slots = ['subah', 'dopahar', 'raat'];
      else slots = ['subah'];
    }

    return {
      id: m.id,
      name: m.name,
      strength: m.strength || '',
      dosage_form: m.dosage_form || 'tablet',
      frequency_code: m.frequency_code,
      food_instruction: m.food_instruction || m.timing_note || 'Take after meals with water',
      timing_instruction_en: m.timing_instruction_en || m.timing_note,
      timing_instruction_hi: m.timing_instruction_hi,
      doctor_notes: m.doctor_notes || m.nurse_notes || m.source_text || '',
      prescribed_by: m.prescribed_by || credential?.doctor_name || 'Hospital Doctor',
      duration: m.duration || '30 days',
      status: m.status,
      slots,
      // Status for each slot today
      slotStatuses: slots.map((s: string) => {
        const key = `${m.id}_${s}`;
        const record = doseMap[key];
        return {
          slot: s,
          isGiven: record ? record.given : false,
          givenAt: record?.given_at || null,
          givenBy: record?.caregiver_name || null,
        };
      })
    };
  });

  // Calculate adherence statistics for today
  let totalDoseSlotsToday = 0;
  let takenDoseSlotsToday = 0;

  processedMeds.forEach((pm: any) => {
    pm.slotStatuses.forEach((ss: any) => {
      totalDoseSlotsToday++;
      if (ss.isGiven) takenDoseSlotsToday++;
    });
  });

  const adherencePercentage = totalDoseSlotsToday > 0 
    ? Math.round((takenDoseSlotsToday / totalDoseSlotsToday) * 100) 
    : 100;

  // Group into time checklist buckets
  const checklistByTime = {
    subah: processedMeds.filter((m: any) => m.slots.includes('subah')),
    dopahar: processedMeds.filter((m: any) => m.slots.includes('dopahar')),
    shaam: processedMeds.filter((m: any) => m.slots.includes('shaam')),
    raat: processedMeds.filter((m: any) => m.slots.includes('raat')),
    sos: processedMeds.filter((m: any) => m.frequency_code === 'SOS' || m.slots.length === 0),
  };

  // Follow ups & warnings
  const followUps = queryRows(db, "SELECT * FROM follow_ups WHERE discharge_id = ?;", [dischargeId]);
  const warnings = queryRows(db, "SELECT * FROM warnings WHERE discharge_id = ?;", [dischargeId]);

  // Diet Plan
  const dietRes = queryRows(db, "SELECT * FROM diet_plans WHERE discharge_id = ? LIMIT 1;", [dischargeId]);
  let dietPlan = null;
  if (dietRes.length) {
    const rawDiet = dietRes[0];
    dietPlan = {
      id: rawDiet.id,
      discharge_id: rawDiet.discharge_id,
      diet_type: rawDiet.diet_type,
      calories_target: rawDiet.calories_target,
      hydration_target: rawDiet.hydration_target,
      prescribed_by: rawDiet.prescribed_by,
      meals: JSON.parse(rawDiet.meals_json || '[]'),
      add_ons: JSON.parse(rawDiet.addons_json || '[]'),
      measures: JSON.parse(rawDiet.measures_json || '[]'),
      special_instructions: rawDiet.special_instructions,
      created_at: rawDiet.created_at,
      updated_at: rawDiet.updated_at,
    };
  }

  res.json({
    dischargeId,
    patientName,
    patientAccessId: credential?.access_id || 'PT-HOSPITAL',
    pin: credential?.pin || '****',
    hospitalName: discharge.hospital_name,
    doctorName: credential?.doctor_name || 'Attending Physician, MD',
    nurseName: credential?.hospital_staff_name || 'Sister Priya Sharma, RN',
    dischargeDate: discharge.discharge_date,
    helpdeskNumber: discharge.helpdesk_number,
    allMedicines: processedMeds,
    checklistByTime,
    adherence: {
      totalDoses: totalDoseSlotsToday,
      takenDoses: takenDoseSlotsToday,
      percentage: adherencePercentage,
    },
    followUps,
    warnings,
    dietPlan,
  });
});

/**
 * GET /api/discharges/:dischargeId/diet
 * Retrieves the hospital diet plan for a discharge
 */
router.get('/discharges/:dischargeId/diet', async (req: Request, res: Response) => {
  const db = await getDb();
  const dischargeId = req.params.dischargeId;
  const dietRes = queryRows(db, "SELECT * FROM diet_plans WHERE discharge_id = ? LIMIT 1;", [dischargeId]);
  if (!dietRes.length) {
    return res.status(404).json({ error: 'Diet plan not found for this patient discharge.' });
  }
  const rawDiet = dietRes[0];
  res.json({
    id: rawDiet.id,
    discharge_id: rawDiet.discharge_id,
    diet_type: rawDiet.diet_type,
    calories_target: rawDiet.calories_target,
    hydration_target: rawDiet.hydration_target,
    prescribed_by: rawDiet.prescribed_by,
    meals: JSON.parse(rawDiet.meals_json || '[]'),
    add_ons: JSON.parse(rawDiet.addons_json || '[]'),
    measures: JSON.parse(rawDiet.measures_json || '[]'),
    special_instructions: rawDiet.special_instructions,
    created_at: rawDiet.created_at,
    updated_at: rawDiet.updated_at,
  });
});

/**
 * POST /api/discharges/:dischargeId/diet
 * Creates or updates the hospital diet plan
 */
router.post('/discharges/:dischargeId/diet', async (req: Request, res: Response) => {
  const db = await getDb();
  const dischargeId = req.params.dischargeId;
  const {
    dietType,
    caloriesTarget,
    hydrationTarget,
    prescribedBy,
    meals,
    addOns,
    measures,
    specialInstructions,
  } = req.body;

  const now = new Date().toISOString();
  const dietId = `diet_${dischargeId}`;

  db.run(`
    INSERT OR REPLACE INTO diet_plans (
      id, discharge_id, diet_type, calories_target, hydration_target, prescribed_by,
      meals_json, addons_json, measures_json, special_instructions, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    dietId,
    dischargeId,
    dietType || 'Clinical Hospital Diet Plan',
    caloriesTarget || '1,600 - 1,800 kcal/day',
    hydrationTarget || '1.5 - 2.0 L/day',
    prescribedBy || 'Attending Physician & Clinical Dietitian',
    JSON.stringify(meals || []),
    JSON.stringify(addOns || []),
    JSON.stringify(measures || []),
    specialInstructions || '',
    now,
    now
  ]);

  saveDb();

  res.json({
    success: true,
    dietPlan: {
      id: dietId,
      discharge_id: dischargeId,
      diet_type: dietType,
      calories_target: caloriesTarget,
      hydration_target: hydrationTarget,
      prescribed_by: prescribedBy,
      meals: meals || [],
      add_ons: addOns || [],
      measures: measures || [],
      special_instructions: specialInstructions,
      updated_at: now,
    }
  });
});

/**
 * POST /api/discharges/:dischargeId/diet/toggle
 * Toggles a meal, add-on, or measure taken/checked status
 */
router.post('/discharges/:dischargeId/diet/toggle', async (req: Request, res: Response) => {
  const db = await getDb();
  const dischargeId = req.params.dischargeId;
  const { itemType, itemId, completed } = req.body;

  const dietRes = queryRows(db, "SELECT * FROM diet_plans WHERE discharge_id = ? LIMIT 1;", [dischargeId]);
  if (!dietRes.length) {
    return res.status(404).json({ error: 'Diet plan not found' });
  }

  const rawDiet = dietRes[0];
  let meals = JSON.parse(rawDiet.meals_json || '[]');
  let addOns = JSON.parse(rawDiet.addons_json || '[]');
  let measures = JSON.parse(rawDiet.measures_json || '[]');

  if (itemType === 'meal') {
    meals = meals.map((m: any) => m.id === itemId ? { ...m, taken: completed } : m);
  } else if (itemType === 'addon') {
    addOns = addOns.map((a: any) => a.id === itemId ? { ...a, taken: completed } : a);
  } else if (itemType === 'measure') {
    measures = measures.map((meas: any) => meas.id === itemId ? { ...meas, checked: completed } : meas);
  }

  const now = new Date().toISOString();
  db.run(`
    UPDATE diet_plans 
    SET meals_json = ?, addons_json = ?, measures_json = ?, updated_at = ?
    WHERE discharge_id = ?;
  `, [
    JSON.stringify(meals),
    JSON.stringify(addOns),
    JSON.stringify(measures),
    now,
    dischargeId
  ]);

  saveDb();

  res.json({
    success: true,
    dietPlan: {
      id: rawDiet.id,
      discharge_id: dischargeId,
      diet_type: rawDiet.diet_type,
      calories_target: rawDiet.calories_target,
      hydration_target: rawDiet.hydration_target,
      prescribed_by: rawDiet.prescribed_by,
      meals,
      add_ons: addOns,
      measures,
      special_instructions: rawDiet.special_instructions,
      updated_at: now,
    }
  });
});

/**
 * POST /api/discharges/:dischargeId/diet/custom-item
 * Appends a custom meal, add-on, or measure to the diet plan
 */
router.post('/discharges/:dischargeId/diet/custom-item', async (req: Request, res: Response) => {
  const db = await getDb();
  const dischargeId = req.params.dischargeId;
  const { itemType, item } = req.body;

  const dietRes = queryRows(db, "SELECT * FROM diet_plans WHERE discharge_id = ? LIMIT 1;", [dischargeId]);
  if (!dietRes.length) {
    return res.status(404).json({ error: 'Diet plan not found' });
  }

  const rawDiet = dietRes[0];
  let meals = JSON.parse(rawDiet.meals_json || '[]');
  let addOns = JSON.parse(rawDiet.addons_json || '[]');
  let measures = JSON.parse(rawDiet.measures_json || '[]');

  const newItem = {
    ...item,
    id: item.id || `${itemType}_${Date.now()}`,
  };

  if (itemType === 'meal') {
    meals.push(newItem);
  } else if (itemType === 'addon') {
    addOns.push(newItem);
  } else if (itemType === 'measure') {
    measures.push(newItem);
  }

  const now = new Date().toISOString();
  db.run(`
    UPDATE diet_plans 
    SET meals_json = ?, addons_json = ?, measures_json = ?, updated_at = ?
    WHERE discharge_id = ?;
  `, [
    JSON.stringify(meals),
    JSON.stringify(addOns),
    JSON.stringify(measures),
    now,
    dischargeId
  ]);

  saveDb();

  res.json({
    success: true,
    newItem,
    dietPlan: {
      id: rawDiet.id,
      discharge_id: dischargeId,
      diet_type: rawDiet.diet_type,
      calories_target: rawDiet.calories_target,
      hydration_target: rawDiet.hydration_target,
      prescribed_by: rawDiet.prescribed_by,
      meals,
      add_ons: addOns,
      measures,
      special_instructions: rawDiet.special_instructions,
      updated_at: now,
    }
  });
});

/**
 * GET /api/settings/contact
 * Hospital reception contact info for WhatsApp & phone.
 * Strict Fail-Safe: Patients and caregivers receive ONLY active, verified contacts.
 * If no verified WhatsApp exists, reception_whatsapp is returned empty ('').
 * If contact reported not working in the last 24h, automatically falls back to backup WhatsApp or phone.
 */
router.get('/settings/contact', async (req: Request, res: Response) => {
  const db = await getDb();
  const settingsRows = queryRows(db, "SELECT * FROM hospital_settings WHERE id = 'default' LIMIT 1;");
  const s = settingsRows.length ? settingsRows[0] : {
    hospital_name: HOSPITAL_NAME,
    reception_whatsapp: RECEPTION_WHATSAPP_NUMBER,
    reception_phone: getReceptionCall().formatted,
    office_hours: 'Mon - Sat, 08:00 AM - 08:00 PM IST',
    emergency_number_text: '108 / 112 (National Ambulance & Emergency Helpline)',
    greeting_line: 'Namaste! Welcome to AIIMS Patient Care Support Desk.',
    whatsapp_source: 'config',
    note: ''
  };

  // Fetch structured contacts
  const contactRows = queryRows(db, "SELECT * FROM hospital_contacts ORDER BY id ASC;");
  const primaryWa = contactRows.find((c: any) => c.type === 'primary_whatsapp');
  const backupWa = contactRows.find((c: any) => c.type === 'backup_whatsapp');
  const businessLink = contactRows.find((c: any) => c.type === 'business_link');
  const phoneContact = contactRows.find((c: any) => c.type === 'phone');

  // Check 24-hour report status for primary WhatsApp
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let primaryReportedRecently = false;
  let totalBrokenReports24h = 0;

  if (primaryWa) {
    const repCountRows = queryRows(db, "SELECT COUNT(*) as cnt FROM contact_reports WHERE contact_id = ? AND time >= ?;", [primaryWa.id, twentyFourHoursAgo]);
    totalBrokenReports24h = repCountRows[0]?.cnt || 0;
    if (primaryWa.status === 'reported_not_working' || totalBrokenReports24h >= 2) {
      primaryReportedRecently = true;
    } else if (primaryWa.last_reported_at) {
      const reportTime = new Date(primaryWa.last_reported_at).getTime();
      if (!isNaN(reportTime) && (Date.now() - reportTime) < 24 * 60 * 60 * 1000) {
        primaryReportedRecently = true;
      }
    }
  }

  // Active Reception WhatsApp selection:
  // Single Source of Truth: by default, uses RECEPTION_WHATSAPP_NUMBER unless admin customized it.
  const configuredPrimary = (primaryWa?.value || s.reception_whatsapp || RECEPTION_WHATSAPP_NUMBER).trim();
  const primaryVal = validateReceptionNumber(configuredPrimary);

  // Requirement: "Remove the automatic "backup" switching. There must be NO backup number unless an admin deliberately enters one in Hospital Settings. Without a backup, the patient flow must use only the configured primary number. Reset any "Reported not working" status and clear contact_reports, so the banner "Primary WhatsApp is currently unavailable..." no longer appears. Mark the configured number as verified by configuration. The banner may appear again only if an admin has configured a backup AND patients have actually reported problems."
  const hasAdminBackup = Boolean(backupWa && backupWa.value && backupWa.status === 'verified');

  let activeWhatsappTarget = '';
  let activeWhatsappType = '';
  let isFallback = false;
  let fallbackReason: string | null = null;

  if (hasAdminBackup && primaryReportedRecently) {
    isFallback = true;
    activeWhatsappTarget = formatWhatsAppNumber(backupWa.active_value || backupWa.value || '');
    activeWhatsappType = 'backup_whatsapp';
    fallbackReason = 'Primary WhatsApp is currently unavailable. Connecting you via backup.';
  } else if (primaryVal.isValid) {
    activeWhatsappTarget = primaryVal.digits;
    activeWhatsappType = 'primary_whatsapp';
    isFallback = false;
    fallbackReason = null;
  } else {
    // If the number is invalid, show a clear error in hospital settings and fall back to Call & Copy options. Never fall back to any other number.
    activeWhatsappTarget = '';
    activeWhatsappType = '';
    isFallback = false;
    fallbackReason = null;
  }

  const phoneValue = (phoneContact?.value || s.reception_phone || getReceptionCall().formatted).trim();
  const whatsappSource = s.whatsapp_source === 'admin' ? 'set by admin' : 'from config file';

  res.json({
    hospital_name: s.hospital_name || HOSPITAL_NAME,
    reception_whatsapp: activeWhatsappTarget, // For backwards compatibility
    active_whatsapp_target: activeWhatsappTarget,
    active_whatsapp_type: activeWhatsappType,
    has_verified_whatsapp: Boolean(activeWhatsappTarget && primaryVal.isValid),
    reception_phone: phoneValue,
    office_hours: s.office_hours || 'Mon - Sat, 08:00 AM - 08:00 PM IST',
    emergency_number_text: s.emergency_number_text || '108 / 112 (National Emergency Helpline)',
    greeting_line: s.greeting_line || '',
    note: s.note || '',
    is_fallback: isFallback,
    fallback_reason: fallbackReason,
    has_broken_whatsapp_alert: Boolean(isFallback && totalBrokenReports24h >= 2),
    broken_reports_count: totalBrokenReports24h,
    whatsapp_source: whatsappSource,
    is_valid: primaryVal.isValid,
    validation_error: primaryVal.error,
    // Administrative detail for Hospital Settings UI
    contacts: contactRows,
    primary_whatsapp: configuredPrimary,
    backup_whatsapp: backupWa?.value || '',
    business_link: businessLink?.value || ''
  });
});

/**
 * PUT /api/settings/contact
 * Admin-only endpoint to update hospital contact settings
 * Fields: hospital name, primary WhatsApp, backup WhatsApp, phone, business link, office hours, greeting line
 * - Validates country code, strips spaces/dashes, rejects sample/placeholder numbers
 * - If a verified number is edited, status resets to 'not_verified' while old number stays active
 * - Writes every change to audit_log (who, when, old value, new value)
 * - Nurses have view-only access.
 */
router.put('/settings/contact', async (req: Request, res: Response) => {
  const db = await getDb();
  const role = (req.headers['x-staff-role'] as string) || '';
  const token = (req as any).userToken;
  const adminSecret = req.body.adminSecret || (req.headers['x-admin-key'] as string);

  // Check if caller is admin
  let isAdmin = role.toLowerCase() === 'admin' || adminSecret === 'ghr_admin';
  let actorName = req.body.actorName || 'Dr. V. Raman (Hospital Administrator)';

  if (!isAdmin && token) {
    const staffMatch = queryRows(db, "SELECT * FROM hospital_staff WHERE token = ? AND role = 'admin';", [token]);
    const userMatch = queryRows(db, "SELECT * FROM users WHERE token = ? AND role = 'admin';", [token]);
    if (staffMatch.length) {
      isAdmin = true;
      actorName = staffMatch[0].name;
    } else if (userMatch.length) {
      isAdmin = true;
      actorName = userMatch[0].name;
    }
  }

  // Strict enforcement: Only admin role can edit; nurses can view only
  if (!isAdmin) {
    return res.status(403).json({
      error: 'Access denied: Only admin role can edit hospital contact settings. Nurses and medical staff have view-only access.'
    });
  }

  const {
    hospital_name,
    primary_whatsapp,
    backup_whatsapp,
    reception_whatsapp, // backward compat alias for primary
    reception_phone,
    business_link,
    office_hours,
    emergency_number_text,
    greeting_line,
    note
  } = req.body;

  const targetPrimary = (primary_whatsapp !== undefined ? primary_whatsapp : reception_whatsapp) || '';
  const targetBackup = backup_whatsapp || '';
  const targetBusinessLink = (business_link || '').trim();

  // Validate Primary WhatsApp if provided
  let cleanPrimary = '';
  if (targetPrimary.trim()) {
    const validation = validateReceptionPhone(targetPrimary, req.body.primary_country_code || '+91');
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }
    const countryPrefix = (req.body.primary_country_code || '+91').replace(/\D/g, '');
    const subscriberDigits = cleanSubscriberDigits(targetPrimary);
    cleanPrimary = subscriberDigits.startsWith(countryPrefix) ? subscriberDigits : `${countryPrefix}${subscriberDigits}`;
  }

  // Validate Backup WhatsApp if provided
  let cleanBackup = '';
  if (targetBackup.trim()) {
    const validation = validateReceptionPhone(targetBackup, req.body.backup_country_code || '+91');
    if (!validation.isValid) {
      return res.status(400).json({ error: `Backup WhatsApp: ${validation.error}` });
    }
    const countryPrefix = (req.body.backup_country_code || '+91').replace(/\D/g, '');
    const subscriberDigits = cleanSubscriberDigits(targetBackup);
    cleanBackup = subscriberDigits.startsWith(countryPrefix) ? subscriberDigits : `${countryPrefix}${subscriberDigits}`;
  }

  // Validate Business Link if provided
  if (targetBusinessLink) {
    const validation = validateBusinessLink(targetBusinessLink);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }
  }

  const now = new Date().toISOString();

  // Retrieve current contacts from DB
  const existingContacts = queryRows(db, "SELECT * FROM hospital_contacts;");
  const getExisting = (type: string) => existingContacts.find((c: any) => c.type === type);

  // Helper to upsert a contact with audit log & safe status transition
  const updateContactRecord = (
    id: string,
    type: string,
    newValue: string
  ) => {
    const existing = getExisting(type);
    const oldValue = existing ? existing.value : '';
    const oldActiveValue = existing ? existing.active_value : '';
    const oldStatus = existing ? existing.status : 'not_verified';

    // If edited, resets status to 'not_verified' until tested again.
    // The old number stays active until the new one is verified!
    const valueChanged = oldValue !== newValue;
    const newStatus = valueChanged ? 'not_verified' : oldStatus;
    const activeValueToKeep = valueChanged ? oldActiveValue : (existing?.active_value || '');

    db.run(`
      INSERT OR REPLACE INTO hospital_contacts (
        id, type, value, active_value, status, verified_at, verified_by, last_reported_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      id,
      type,
      newValue,
      activeValueToKeep,
      newStatus,
      valueChanged ? null : (existing?.verified_at || null),
      valueChanged ? null : (existing?.verified_by || null),
      existing?.last_reported_at || null,
      existing?.created_at || now,
      now
    ]);

    if (valueChanged) {
      const auditId = `aud_cnt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      db.run(`
        INSERT INTO audit_log (
          id, discharge_id, entity_type, entity_id, action, actor_role, actor_name, old_value, new_value, timestamp
        ) VALUES (?, 'system_settings', 'hospital_contacts', ?, 'UPDATE_CONTACT_VALUE', 'admin', ?, ?, ?, ?);
      `, [
        auditId,
        id,
        actorName,
        JSON.stringify({ type, value: oldValue, status: oldStatus }),
        JSON.stringify({ type, value: newValue, status: newStatus }),
        now
      ]);
    }
  };

  if (targetPrimary !== undefined) {
    updateContactRecord('contact_primary_wa', 'primary_whatsapp', cleanPrimary);
  }
  if (backup_whatsapp !== undefined) {
    updateContactRecord('contact_backup_wa', 'backup_whatsapp', cleanBackup);
  }
  if (business_link !== undefined) {
    updateContactRecord('contact_business_link', 'business_link', targetBusinessLink);
  }
  if (reception_phone !== undefined) {
    updateContactRecord('contact_phone', 'phone', (reception_phone || '').trim());
  }

  // Update hospital_settings table
  const oldSettingsRows = queryRows(db, "SELECT * FROM hospital_settings WHERE id = 'default' LIMIT 1;");
  const oldVal = oldSettingsRows.length ? oldSettingsRows[0] : {};

  const newHospitalName = hospital_name !== undefined ? hospital_name.trim() : (oldVal.hospital_name || HOSPITAL_NAME);
  const newPhone = reception_phone !== undefined ? reception_phone.trim() : (oldVal.reception_phone || getReceptionCall().formatted);
  const newHours = office_hours !== undefined ? office_hours.trim() : (oldVal.office_hours || 'Mon - Sat, 08:00 AM - 08:00 PM IST');
  const newEmergency = emergency_number_text !== undefined ? emergency_number_text.trim() : (oldVal.emergency_number_text || '108 / 112 (National Emergency Helpline)');
  const newGreeting = greeting_line !== undefined ? greeting_line.trim() : (oldVal.greeting_line || '');
  const newNote = note !== undefined ? note.trim() : '';

  const isSetByAdmin = cleanPrimary && cleanPrimary !== RECEPTION_WHATSAPP_NUMBER;
  const whatsappSource = isSetByAdmin ? 'admin' : (oldVal.whatsapp_source || 'config');

  db.run(`
    INSERT OR REPLACE INTO hospital_settings (
      id, hospital_name, reception_whatsapp, reception_phone, office_hours, emergency_number_text, greeting_line, note, whatsapp_source, updated_at
    ) VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    newHospitalName,
    cleanPrimary || RECEPTION_WHATSAPP_NUMBER,
    newPhone,
    newHours,
    newEmergency,
    newGreeting,
    newNote,
    whatsappSource,
    now
  ]);

  // Write master audit log entry
  const auditId = `aud_set_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  db.run(`
    INSERT INTO audit_log (
      id, discharge_id, entity_type, entity_id, action, actor_role, actor_name, old_value, new_value, timestamp
    ) VALUES (?, 'system_settings', 'hospital_settings', 'default', 'UPDATE_HOSPITAL_CONTACT_SETTINGS', 'admin', ?, ?, ?, ?);
  `, [
    auditId,
    actorName,
    JSON.stringify({
      hospital_name: oldVal.hospital_name,
      primary_whatsapp: oldVal.reception_whatsapp,
      phone: oldVal.reception_phone,
      office_hours: oldVal.office_hours
    }),
    JSON.stringify({
      hospital_name: newHospitalName,
      primary_whatsapp: cleanPrimary,
      backup_whatsapp: cleanBackup,
      business_link: targetBusinessLink,
      phone: newPhone,
      office_hours: newHours
    }),
    now
  ]);

  saveDb();

  res.json({
    success: true,
    message: 'Hospital contact settings updated successfully and audit log recorded.',
    settings: {
      hospital_name: newHospitalName,
      reception_whatsapp: cleanPrimary,
      reception_phone: newPhone,
      office_hours: newHours,
      emergency_number_text: newEmergency,
      greeting_line: newGreeting,
      note: newNote,
      updated_at: now
    }
  });
});

/**
 * POST /api/settings/contact/verify
 * Admin-only verification flow:
 * Sets contact to 'verified' or 'not_verified'.
 * Updates active_value and logs verification result to audit_log.
 */
router.post(['/settings/contact/verify', '/settings/contact/:id/verify'], async (req: Request, res: Response) => {
  const db = await getDb();
  const role = (req.headers['x-staff-role'] as string) || '';
  const token = (req as any).userToken;
  const adminSecret = req.body.adminSecret || (req.headers['x-admin-key'] as string);

  let isAdmin = role.toLowerCase() === 'admin' || adminSecret === 'ghr_admin';
  let actorName = req.body.actorName || 'Dr. V. Raman (Hospital Administrator)';

  if (!isAdmin && token) {
    const staffMatch = queryRows(db, "SELECT * FROM hospital_staff WHERE token = ? AND role = 'admin';", [token]);
    if (staffMatch.length) {
      isAdmin = true;
      actorName = staffMatch[0].name;
    }
  }

  if (!isAdmin) {
    return res.status(403).json({ error: 'Access denied: Only admin role can verify reception contacts.' });
  }

  const contact_id = req.params.id || req.body.contact_id;
  const { result } = req.body;
  if (!contact_id || !['verified', 'failed'].includes(result)) {
    return res.status(400).json({ error: 'contact_id and result ("verified" | "failed") are required.' });
  }

  const existingRows = queryRows(db, "SELECT * FROM hospital_contacts WHERE id = ? LIMIT 1;", [contact_id]);
  if (!existingRows.length) {
    return res.status(404).json({ error: `Contact ID ${contact_id} not found.` });
  }

  const contact = existingRows[0];
  const now = new Date().toISOString();
  const newStatus = result === 'verified' ? 'verified' : 'not_verified';
  const newActiveValue = result === 'verified' ? contact.value : contact.active_value;

  db.run(`
    UPDATE hospital_contacts
    SET status = ?,
        active_value = ?,
        verified_at = ?,
        verified_by = ?,
        updated_at = ?
    WHERE id = ?;
  `, [
    newStatus,
    newActiveValue,
    result === 'verified' ? now : null,
    result === 'verified' ? actorName : null,
    now,
    contact_id
  ]);

  // If this contact was primary_whatsapp or business_link and verified, sync active value to hospital_settings
  if (result === 'verified' && (contact.type === 'primary_whatsapp' || contact.type === 'business_link')) {
    db.run("UPDATE hospital_settings SET reception_whatsapp = ?, updated_at = ? WHERE id = 'default';", [
      contact.value,
      now
    ]);
  }

  // Audit log record for verification
  const auditId = `aud_ver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  db.run(`
    INSERT INTO audit_log (
      id, discharge_id, entity_type, entity_id, action, actor_role, actor_name, old_value, new_value, timestamp
    ) VALUES (?, 'system_settings', 'hospital_contacts', ?, ?, 'admin', ?, ?, ?, ?);
  `, [
    auditId,
    contact_id,
    result === 'verified' ? 'VERIFY_CONTACT_SUCCESS' : 'VERIFY_CONTACT_FAILED',
    actorName,
    JSON.stringify({ old_status: contact.status, old_active: contact.active_value }),
    JSON.stringify({ new_status: newStatus, new_active: newActiveValue, result }),
    now
  ]);

  saveDb();

  const updatedRows = queryRows(db, "SELECT * FROM hospital_contacts WHERE id = ? LIMIT 1;", [contact_id]);
  res.json({
    success: true,
    contact: updatedRows[0]
  });
});

/**
 * POST /api/contact/report
 * Patients and caregivers report that a WhatsApp contact did not open or is broken.
 * - Logs report in contact_reports table
 * - Sets status to 'reported_not_working'
 * - Records audit_log entry
 * - Returns fallback target (backup WhatsApp or phone)
 */
router.post(['/contact/report', '/contact-reports'], async (req: Request, res: Response) => {
  const db = await getDb();
  const { contact_id, discharge_id = 'GHR-PATIENT', reason = 'Patient reported WhatsApp did not open' } = req.body;

  const now = new Date().toISOString();
  const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // Find target contact
  let targetContactId = contact_id;
  if (!targetContactId) {
    const primary = queryRows(db, "SELECT id FROM hospital_contacts WHERE type = 'primary_whatsapp' LIMIT 1;");
    targetContactId = primary.length ? primary[0].id : 'contact_primary_wa';
  }

  // 1. Insert into contact_reports
  db.run(`
    INSERT INTO contact_reports (id, discharge_id, contact_id, time, reason)
    VALUES (?, ?, ?, ?, ?);
  `, [reportId, discharge_id, targetContactId, now, reason]);

  // 2. Count reports within last 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentReports = queryRows(
    db, 
    "SELECT COUNT(*) as cnt FROM contact_reports WHERE contact_id = ? AND time >= ?;", 
    [targetContactId, twentyFourHoursAgo]
  );
  const count24h = recentReports[0]?.cnt || 1;

  // Prompt requirement: "When two or more reports arrive for the same contact within 24 hours: mark the contact 'Reported not working'"
  if (count24h >= 2) {
    db.run(`
      UPDATE hospital_contacts
      SET status = 'reported_not_working', last_reported_at = ?, updated_at = ?
      WHERE id = ?;
    `, [now, now, targetContactId]);
  } else {
    // Record last reported time
    db.run(`
      UPDATE hospital_contacts
      SET last_reported_at = ?, updated_at = ?
      WHERE id = ?;
    `, [now, now, targetContactId]);
  }

  // 3. Write to audit_log
  const auditId = `aud_rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  db.run(`
    INSERT INTO audit_log (
      id, discharge_id, entity_type, entity_id, action, actor_role, actor_name, old_value, new_value, timestamp
    ) VALUES (?, ?, 'hospital_contacts', ?, 'REPORT_CONTACT_NOT_WORKING', 'patient', 'Patient / Caregiver', 'verified', 'reported_not_working', ?);
  `, [auditId, discharge_id, targetContactId, now]);

  // 4. Find fallback contact (Backup WhatsApp if verified, otherwise phone)
  const backupRows = queryRows(db, "SELECT * FROM hospital_contacts WHERE type = 'backup_whatsapp' AND status = 'verified' LIMIT 1;");
  const phoneRows = queryRows(db, "SELECT * FROM hospital_contacts WHERE type = 'phone' LIMIT 1;");

  let fallbackTarget = '';
  let fallbackType = 'phone';

  if (backupRows.length && (backupRows[0].active_value || backupRows[0].value)) {
    fallbackTarget = formatWhatsAppNumber(backupRows[0].active_value || backupRows[0].value);
    fallbackType = 'backup_whatsapp';
  } else if (phoneRows.length && (phoneRows[0].active_value || phoneRows[0].value)) {
    fallbackTarget = phoneRows[0].active_value || phoneRows[0].value;
    fallbackType = 'phone';
  }

  saveDb();

  res.json({
    success: true,
    message: 'Report received. Fallback assistance activated.',
    fallback_target: fallbackTarget,
    fallback_type: fallbackType
  });
});

/**
 * POST /api/reminders/send-dose-reminder
 * Triggers sending a Zero-App WhatsApp medication reminder for a discharge slot
 */
router.post('/reminders/send-dose-reminder', async (req: Request, res: Response) => {
  try {
    const { dischargeId, slot = 'subah', patientPhone, patientName } = req.body;
    if (!dischargeId) {
      return res.status(400).json({ error: 'dischargeId is required' });
    }

    const result = await sendDoseReminder({
      dischargeId,
      slot,
      patientPhone,
      patientName
    });

    res.json(result);
  } catch (err: any) {
    console.error('Error dispatching dose reminder:', err);
    res.status(500).json({ error: err?.message || 'Failed to dispatch reminder' });
  }
});

/**
 * POST /api/whatsapp/webhook
 * Handles incoming WhatsApp webhook messages (both Meta Cloud API format and simulated direct format)
 */
router.post('/whatsapp/webhook', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    // Check if Meta WhatsApp webhook format
    let fromNumber = '';
    let messageText = '';
    let dischargeId = '';

    if (body.object === 'whatsapp_business_account' && body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const msg = body.entry[0].changes[0].value.messages[0];
      fromNumber = msg.from;
      messageText = msg.text?.body || msg.button?.text || '';
    } else {
      // Direct or simulated payload
      fromNumber = body.from || body.phone || RECEPTION_WHATSAPP_NUMBER;
      messageText = body.body || body.message || '';
      dischargeId = body.dischargeId || '';
    }

    const result = await handleIncomingWhatsAppReply({
      from: fromNumber,
      body: messageText,
      dischargeId
    });

    res.json(result);
  } catch (err: any) {
    console.error('Error handling WhatsApp webhook:', err);
    res.status(500).json({ error: err?.message || 'Failed to process WhatsApp webhook' });
  }
});

/**
 * POST /api/whatsapp/simulate-reply
 * Simulator endpoint for UI to test patient replying with '1', '2', '3', or custom text
 */
router.post('/whatsapp/simulate-reply', async (req: Request, res: Response) => {
  try {
    const { from = RECEPTION_WHATSAPP_NUMBER, body = '1', dischargeId } = req.body;
    const result = await handleIncomingWhatsAppReply({
      from,
      body,
      dischargeId
    });

    res.json(result);
  } catch (err: any) {
    console.error('Error processing simulated WhatsApp reply:', err);
    res.status(500).json({ error: err?.message || 'Failed to process reply' });
  }
});

/**
 * GET /api/whatsapp/messages
 * Retrieves log of WhatsApp messages (outbound reminders and inbound replies)
 */
router.get('/whatsapp/messages', async (req: Request, res: Response) => {
  const db = await getDb();
  const dischargeId = req.query.dischargeId as string;

  let sql = "SELECT * FROM whatsapp_messages ";
  const params: any[] = [];
  if (dischargeId) {
    sql += "WHERE discharge_id = ? ";
    params.push(dischargeId);
  }
  sql += "ORDER BY created_at DESC LIMIT 50;";

  const rows = queryRows(db, sql, params);
  res.json(rows);
});

/**
 * POST /api/queries
 * Logs patient / caregiver query before opening WhatsApp.
 * PRIVACY GUARD: Never stores free-text message unless user ticked 'Save a copy for the nurse'.
 */
router.post('/queries', async (req: Request, res: Response) => {
  const db = await getDb();
  const {
    dischargeId,
    category,
    language = 'en',
    userMessage = '',
    medicineName = '',
    includedMedicineList = false,
    includedName = false,
    saveCopyForNurse = false
  } = req.body;

  if (!dischargeId) {
    return res.status(400).json({ error: 'dischargeId is required' });
  }

  // Detect urgent keywords
  const { isUrgent, matchedKeyword } = detectUrgentKeywords(userMessage, category);
  const now = new Date().toISOString();
  const queryId = `query_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Privacy invariant: ONLY store message_copy if saveCopyForNurse is true
  const messageCopy = saveCopyForNurse ? userMessage.trim().substring(0, 300) : null;

  db.run(`
    INSERT INTO patient_queries (
      id, discharge_id, category, language, is_urgent, urgent_keyword,
      included_medicine_list, included_name, saved_copy_for_nurse,
      message_copy, medicine_name, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?);
  `, [
    queryId,
    dischargeId,
    category || 'General query',
    language,
    isUrgent ? 1 : 0,
    matchedKeyword || '',
    includedMedicineList ? 1 : 0,
    includedName ? 1 : 0,
    saveCopyForNurse ? 1 : 0,
    messageCopy,
    medicineName || '',
    now
  ]);

  saveDb();

  res.json({
    success: true,
    queryId,
    isUrgent,
    matchedKeyword,
    savedCopyForNurse: Boolean(saveCopyForNurse)
  });
});

/**
 * GET /api/queries
 * Nurse & Admin view of recent patient queries
 */
router.get('/queries', async (req: Request, res: Response) => {
  const db = await getDb();
  const role = (req.headers['x-staff-role'] as string) || '';
  const token = (req as any).userToken;

  // Access control: only nurse, doctor or admin roles can view queries list
  const isAuthorizedStaff = ['nurse', 'doctor', 'admin'].includes(role.toLowerCase()) || token;
  if (!isAuthorizedStaff) {
    return res.status(403).json({ error: 'Only clinical nurses and hospital staff can access patient queries queue.' });
  }

  const rows = queryRows(db, `
    SELECT q.*, d.hospital_name, d.discharge_date
    FROM patient_queries q
    LEFT JOIN discharges d ON q.discharge_id = d.id
    ORDER BY q.created_at DESC
    LIMIT 100;
  `);

  res.json(rows);
});

/**
 * POST /api/queries/:id/handle
 * Marks a patient query as handled by nurse/staff and logs to audit_log
 */
router.post('/queries/:id/handle', async (req: Request, res: Response) => {
  const db = await getDb();
  const queryId = req.params.id;
  const staffName = req.body.staffName || 'Sister Priya Sharma, RN';
  const role = req.body.role || 'nurse';
  const now = new Date().toISOString();

  const qRes = queryRows(db, "SELECT * FROM patient_queries WHERE id = ? LIMIT 1;", [queryId]);
  if (!qRes.length) {
    return res.status(404).json({ error: 'Query not found' });
  }

  const queryItem = qRes[0];

  db.run(`
    UPDATE patient_queries
    SET status = 'handled', handled_by = ?, handled_at = ?
    WHERE id = ?;
  `, [staffName, now, queryId]);

  // Insert to audit_log
  const auditId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  db.run(`
    INSERT INTO audit_log (
      id, discharge_id, entity_type, entity_id, action, actor_role, actor_name, old_value, new_value, timestamp
    ) VALUES (?, ?, 'patient_query', ?, 'MARK_QUERY_HANDLED', ?, ?, 'pending', 'handled', ?);
  `, [
    auditId,
    queryItem.discharge_id,
    queryId,
    role,
    staffName,
    now
  ]);

  saveDb();
  res.json({ success: true, message: 'Query marked as handled' });
});

/**
 * GET /api/analytics
 * Hospital metrics dashboard including query counts by category and urgent flags
 */
router.get('/analytics', async (req: Request, res: Response) => {
  const db = await getDb();

  const totalMedsRes = db.exec("SELECT COUNT(*) FROM medicines;");
  const totalMeds = (totalMedsRes[0]?.values[0]?.[0] as number) || 0;

  const flaggedMedsRes = db.exec("SELECT COUNT(*) FROM medicines WHERE status = 'needs_nurse_check';");
  const flaggedMeds = (flaggedMedsRes[0]?.values[0]?.[0] as number) || 0;

  const approvedMedsRes = db.exec("SELECT COUNT(*) FROM medicines WHERE status = 'approved';");
  const approvedMeds = (approvedMedsRes[0]?.values[0]?.[0] as number) || 0;

  const clearMedsRes = db.exec("SELECT COUNT(*) FROM medicines WHERE status = 'clear';");
  const clearMeds = (clearMedsRes[0]?.values[0]?.[0] as number) || 0;

  const dosesGivenRes = db.exec("SELECT COUNT(*) FROM dose_events WHERE given = 1;");
  const dosesGiven = (dosesGivenRes[0]?.values[0]?.[0] as number) || 0;

  const dosesMissedRes = db.exec("SELECT COUNT(*) FROM dose_events WHERE given = 0;");
  const dosesMissed = (dosesMissedRes[0]?.values[0]?.[0] as number) || 0;

  const totalFollowupsRes = db.exec("SELECT COUNT(*) FROM follow_ups;");
  const totalFollowups = (totalFollowupsRes[0]?.values[0]?.[0] as number) || 0;

  const completedFollowupsRes = db.exec("SELECT COUNT(*) FROM follow_ups WHERE done = 1;");
  const completedFollowups = (completedFollowupsRes[0]?.values[0]?.[0] as number) || 0;

  const flagSharePercent = totalMeds > 0 ? Math.round((flaggedMeds / totalMeds) * 100) : 0;
  const adherenceRatePercent = (dosesGiven + dosesMissed) > 0 ? Math.round((dosesGiven / (dosesGiven + dosesMissed)) * 100) : 92;

  // Patient queries metrics
  const totalQueriesRes = db.exec("SELECT COUNT(*) FROM patient_queries;");
  const totalQueries = (totalQueriesRes[0]?.values[0]?.[0] as number) || 0;

  const urgentQueriesRes = db.exec("SELECT COUNT(*) FROM patient_queries WHERE is_urgent = 1;");
  const urgentQueriesCount = (urgentQueriesRes[0]?.values[0]?.[0] as number) || 0;

  const handledQueriesRes = db.exec("SELECT COUNT(*) FROM patient_queries WHERE status = 'handled';");
  const queriesHandledCount = (handledQueriesRes[0]?.values[0]?.[0] as number) || 0;

  const pendingQueriesCount = Math.max(0, totalQueries - queriesHandledCount);

  const queryCatsRes = db.exec("SELECT category, COUNT(*) FROM patient_queries GROUP BY category;");
  const queriesByCategory: Record<string, number> = {};
  if (queryCatsRes.length && queryCatsRes[0].values.length) {
    queryCatsRes[0].values.forEach(([cat, cnt]) => {
      queriesByCategory[cat as string] = cnt as number;
    });
  }

  res.json({
    totalMedicines: totalMeds,
    flaggedItemsCount: flaggedMeds,
    flagSharePercent,
    awaitingNurseVerification: flaggedMeds,
    approvedByNurse: approvedMeds,
    autoClearedByRules: clearMeds,
    dosesGiven,
    dosesMissed,
    adherenceRatePercent,
    totalFollowups,
    completedFollowups,
    pendingFollowups: totalFollowups - completedFollowups,
    patientQueries: {
      totalQueries,
      urgentQueriesCount,
      queriesHandledCount,
      pendingQueriesCount,
      queriesByCategory,
    }
  });
});

/**
 * GET /api/discharges/:id/fhir
 * FHIR-style bundle with Patient, MedicationRequest, and Appointment resources
 * Label: "FHIR-style, designed for ABDM alignment, not certified"
 */
router.get('/discharges/:id/fhir', async (req: Request, res: Response) => {
  const db = await getDb();
  const dischargeId = req.params.id;

  const dRes = db.exec("SELECT * FROM discharges WHERE id = ?;", [dischargeId]);
  if (!dRes.length || !dRes[0].values.length) {
    return res.status(404).json({ error: 'Discharge record not found' });
  }

  const mRes = db.exec("SELECT * FROM medicines WHERE discharge_id = ?;", [dischargeId]);
  const fuRes = db.exec("SELECT * FROM follow_ups WHERE discharge_id = ?;", [dischargeId]);

  const fhirBundle = {
    resourceType: 'Bundle',
    type: 'document',
    timestamp: new Date().toISOString(),
    _metaNotice: 'FHIR-style, designed for ABDM alignment, not certified. Synthetic medical record representation.',
    entry: [
      {
        resource: {
          resourceType: 'Patient',
          id: 'pat_sita_devi',
          identifier: [
            {
              system: 'https://healthid.ndhm.gov.in',
              value: '91-8723-4412-9021',
              type: { text: 'ABHA Number (Mocked)' }
            }
          ],
          name: [{ text: 'Sita Devi (Synthetic Demo)' }],
          gender: 'female',
        }
      },
      ...(mRes.length && mRes[0].values.length ? mRes[0].values.map((medRow: any) => ({
        resource: {
          resourceType: 'MedicationRequest',
          id: medRow[0],
          status: medRow[9] === 'needs_nurse_check' ? 'draft' : 'active',
          intent: 'order',
          medicationCodeableConcept: {
            text: `${medRow[2]} ${medRow[3]}`,
          },
          dosageInstruction: [
            {
              text: medRow[12] || medRow[4],
              timing: {
                code: { text: medRow[4] }
              }
            }
          ],
          note: [{ text: medRow[14] ? `Nurse note: ${medRow[14]}` : `Source text: ${medRow[7]}` }]
        }
      })) : []),
      ...(fuRes.length && fuRes[0].values.length ? fuRes[0].values.map((fuRow: any) => ({
        resource: {
          resourceType: 'Appointment',
          id: fuRow[0],
          status: fuRow[8] === 1 ? 'fulfilled' : 'booked',
          start: fuRow[2] ? `${fuRow[2]}T09:00:00Z` : undefined,
          description: fuRow[3],
        }
      })) : [])
    ]
  };

  res.json(fhirBundle);
});

/**
 * POST /api/safety/ask
 * Handles questions with strict safety refusals for diagnosis or dose changes
 */
router.post('/safety/ask', (req: Request, res: Response) => {
  const { question, lang } = req.body;
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Question required' });
  }

  const result = evaluateSafetyQuestion(question, lang || 'en');
  res.json(result);
});

/**
 * POST /api/patients/language
 * Update patient preferred language
 */
router.post('/patients/language', async (req: Request, res: Response) => {
  const db = await getDb();
  const { language, patientId } = req.body;
  const pId = patientId || 'pat_sita_devi';
  if (language) {
    db.run("UPDATE patients SET preferred_language = ? WHERE id = ?;", [language, pId]);
    saveDb();
  }
  res.json({ success: true, language, patientId: pId });
});

/**
 * GET /api/patients/language
 * Retrieve patient preferred language
 */
router.get('/patients/language', async (req: Request, res: Response) => {
  const db = await getDb();
  const patientId = (req.query.patientId as string) || 'pat_sita_devi';
  const result = db.exec("SELECT preferred_language FROM patients WHERE id = ?;", [patientId]);
  const lang = result.length && result[0].values.length ? (result[0].values[0][0] as string) : 'en';
  res.json({ language: lang, patientId });
});

/**
 * POST /api/translate
 * Translates clinical notes into target Indian language
 * Preserves brand names, dosage numbers and units without change
 */
router.post('/translate', async (req: Request, res: Response) => {
  const { text, targetLang } = req.body;
  if (!text || !targetLang) {
    return res.status(400).json({ error: 'text and targetLang required' });
  }

  if (targetLang === 'en') {
    return res.json({ translatedText: text, isMachineTranslated: false });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 10) {
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Translate this hospital discharge instruction line into the Indian language with code "${targetLang}".
IMPORTANT MEDICAL RULES:
1. Do NOT translate or change medicine names, tablet/capsule strengths (e.g. 75mg, 500mg), numbers, or frequencies (OD, BD, TDS). Keep them in their exact original form.
2. Only translate clinical action phrases (e.g., "Review after 7 days", "SOS if breathlessness", "before meals", "after food", "at bedtime").
3. Return ONLY the translated sentence, without any preamble, explanation, or quotes.

Original line: "${text}"`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const translated = response.text?.trim() || text;
      return res.json({ translatedText: translated, isMachineTranslated: true });
    } catch (err) {
      console.warn('Gemini translation error, falling back to clinical rules:', err);
    }
  }

  // Clinical dictionary fallback for standard discharge instructions
  const lower = text.toLowerCase();
  let translated = text;

  // Multi-lingual fallback dictionary for core medical phrases
  const phraseMap: Record<string, Record<string, string>> = {
    'review after 7 days': {
      hi: '7 दिनों के बाद डॉक्टर को दिखाएं (Review)',
      mwr: '7 दिनां पछै डाक्टर नै दिखावणो (Review)',
      ta: '7 நாட்களுக்குப் பிறகு மருத்துவரை அணுகவும்',
      te: '7 రోజుల తర్వాత వైద్యుడిని సంప్రదించండి',
      bn: '৭ দিন পর ডাক্তারকে দেখান',
      mr: '७ दिवसांनंतर डॉक्टरांना दाखवा',
      gu: '૭ દિવસ પછી ડૉક્ટરને બતાવો',
    },
    'sos if breathlessness': {
      hi: 'सांस फूलने पर आपातकालीन दवा लें या तुरंत संपर्क करें',
      mwr: 'सांस फूलण पे तुरंत डाक्टर नै फोन लगाओ',
      ta: 'மூச்சுத் திணறல் ஏற்பட்டால் உடனடியாக தொடர்பு கொள்ளவும்',
      te: 'శ్వాస తీసుకోవడంలో ఇబ్బంది ఉంటే వెంటనే అత్యవసర సంప్రదించండి',
      bn: 'শ্বাসকষ্ট হলে অবিলম্বে জরুরি যোগাযোগ করুন',
      mr: 'श्वास घेण्यास त्रास झाल्यास तातडीने संपर्क साधा',
      gu: 'શ્વાસ લેવામાં તકલીફ થાય તો તરત જ સંપર્ક કરો',
    },
    'after food': {
      hi: 'खाना खाने के बाद',
      mwr: 'रोटी खाया पछै',
      ta: 'உணவுக்குப் பின்',
      te: 'భోజనం తర్వాత',
      bn: 'খাবারের পর',
      mr: 'जेवणानंतर',
      gu: 'જમ્યા પછી',
    },
    'before breakfast': {
      hi: 'सुबह नाश्ते से पहले',
      mwr: 'सवेरे कलेवा सूं पैली',
      ta: 'காலை உணவுக்கு முன்',
      te: 'ఉదయం అల్పాహారానికి ముందు',
      bn: 'সকালের নাস্তার আগে',
      mr: 'सकाळच्या नाश्त्यापूर्वी',
      gu: 'સવારના નાસ્તા પહેલાં',
    }
  };

  for (const [phrase, translationsByLang] of Object.entries(phraseMap)) {
    if (lower.includes(phrase)) {
      if (translationsByLang[targetLang]) {
        translated = text.replace(new RegExp(phrase, 'i'), translationsByLang[targetLang]);
        break;
      } else if (translationsByLang['hi']) {
        translated = text.replace(new RegExp(phrase, 'i'), translationsByLang['hi']);
        break;
      }
    }
  }

  return res.json({ translatedText: translated, isMachineTranslated: true });
});

/**
 * OpenAPI Specification endpoint
 */
router.get('/openapi.json', (req: Request, res: Response) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Going Home Right - Clinical Discharge API',
      version: '1.0.0',
      description: 'API for transforming hospital discharge summaries into plain-language daily family care plans with strict clinical safety rules and nurse sign-off.',
    },
    paths: {
      '/api/discharges': {
        get: { summary: 'List patient discharge records' },
        post: { summary: 'Ingest and extract discharge summary with rules engine' },
      },
      '/api/discharges/{id}': {
        get: { summary: 'Get full discharge plan and medicine schedule' },
      },
      '/api/nurse/queue': {
        get: { summary: 'List items awaiting nurse verification' },
      },
      '/api/items/{id}': {
        patch: { summary: 'Nurse edits slot/dosage on flagged medicine' },
      },
      '/api/items/{id}/approve': {
        post: { summary: 'Nurse approves flagged item, finalizing the family plan' },
      },
      '/api/discharges/{id}/audit': {
        get: { summary: 'Get audit log trail for discharge sheet' },
      },
      '/api/doses/{id}/given': {
        post: { summary: 'Record administered medication dose' },
      },
      '/api/followups/{id}/done': {
        post: { summary: 'Mark follow-up visit attended' },
      },
      '/api/analytics': {
        get: { summary: 'Hospital safety and adherence analytics' },
      },
      '/api/discharges/{id}/fhir': {
        get: { summary: 'Export FHIR-style bundle with ABHA identifier' },
      },
      '/api/safety/ask': {
        post: { summary: 'Submit safety question with enforced refusal for diagnosis/dose adjustments' },
      },
    },
  });
});

export default router;
