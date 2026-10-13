/**
 * Database layer for Going Home Right
 * Uses SQLite via sql.js with disk persistence
 * Schema is standard SQL portable to PostgreSQL
 */

import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { evaluateMedicineRules, evaluateFollowUp, evaluateWarningItem, type RawExtractedMedicine } from './rulesEngine.ts';
import {
  RECEPTION_WHATSAPP_NUMBER,
  RECEPTION_CALL_NUMBER,
  HOSPITAL_NAME
} from '../src/config/reception.ts';

const DB_FILE = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(process.cwd(), 'server', 'data', 'app.db');
const DB_DIR = path.dirname(DB_FILE);

// Encryption key for PHI (Patient Health Info) at rest
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'ghr_healthnova_secret_encryption_key_32bytes_len!';

export function encryptText(plainText: string): string {
  try {
    const iv = crypto.randomBytes(16);
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (err) {
    return plainText;
  }
}

export function decryptText(cipherText: string): string {
  try {
    if (!cipherText || !cipherText.includes(':')) return cipherText;
    const [ivHex, encrypted] = cipherText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    return cipherText;
  }
}

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  initSchema(dbInstance);
  seedInitialData(dbInstance);
  saveDb();

  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Failed to persist database to disk:', err);
  }
}

function initSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      role TEXT, -- 'patient', 'caregiver', 'nurse', 'admin'
      name TEXT,
      token TEXT
    );

    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      name_encrypted TEXT,
      phone_encrypted TEXT,
      abha_id TEXT,
      preferred_language TEXT DEFAULT 'en',
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS discharges (
      id TEXT PRIMARY KEY,
      patient_id TEXT,
      hospital_name TEXT,
      discharge_date TEXT,
      original_file_name TEXT,
      file_url TEXT,
      raw_text TEXT,
      helpdesk_number TEXT,
      status TEXT, -- 'processing', 'extracted', 'partially_verified', 'approved'
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS medicines (
      id TEXT PRIMARY KEY,
      discharge_id TEXT,
      name TEXT,
      strength TEXT,
      frequency_code TEXT,
      timing_note TEXT,
      duration TEXT,
      source_text TEXT,
      confidence REAL,
      status TEXT, -- 'clear', 'needs_nurse_check', 'approved'
      flag_reason TEXT,
      slots_json TEXT, -- JSON array of slots
      timing_instruction_en TEXT,
      timing_instruction_hi TEXT,
      nurse_notes TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS follow_ups (
      id TEXT PRIMARY KEY,
      discharge_id TEXT,
      due_date TEXT,
      text TEXT,
      source_text TEXT,
      confidence REAL,
      status TEXT, -- 'clear', 'needs_nurse_check', 'approved'
      flag_reason TEXT,
      done INTEGER DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS warnings (
      id TEXT PRIMARY KEY,
      discharge_id TEXT,
      text TEXT,
      source_text TEXT,
      action_text TEXT,
      status TEXT, -- 'clear', 'needs_nurse_check', 'approved'
      flag_reason TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS dose_events (
      id TEXT PRIMARY KEY,
      discharge_id TEXT,
      medicine_id TEXT,
      slot TEXT,
      scheduled_date TEXT,
      given INTEGER DEFAULT 0,
      given_at TEXT,
      caregiver_name TEXT
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      discharge_id TEXT,
      channel TEXT,
      message_en TEXT,
      message_hi TEXT,
      scheduled_time TEXT,
      status TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      discharge_id TEXT,
      entity_type TEXT,
      entity_id TEXT,
      action TEXT,
      actor_role TEXT,
      actor_name TEXT,
      old_value TEXT,
      new_value TEXT,
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS consents (
      id TEXT PRIMARY KEY,
      patient_id TEXT,
      caregiver_id TEXT,
      granted_at TEXT,
      expires_at TEXT,
      status TEXT -- 'active', 'revoked'
    );

    CREATE TABLE IF NOT EXISTS hospital_staff (
      id TEXT PRIMARY KEY,
      staff_id TEXT UNIQUE,
      name TEXT,
      email TEXT UNIQUE,
      role TEXT, -- 'doctor', 'nurse', 'admin'
      hospital_name TEXT,
      department TEXT,
      password TEXT,
      token TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS patient_credentials (
      id TEXT PRIMARY KEY,
      access_id TEXT UNIQUE, -- e.g. 'PT-SITA-2026'
      pin TEXT,              -- e.g. '1234'
      patient_id TEXT,
      patient_name TEXT,
      discharge_id TEXT,
      hospital_staff_id TEXT,
      hospital_staff_name TEXT,
      hospital_name TEXT,
      doctor_name TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS diet_plans (
      id TEXT PRIMARY KEY,
      discharge_id TEXT UNIQUE,
      diet_type TEXT,
      calories_target TEXT,
      hydration_target TEXT,
      prescribed_by TEXT,
      meals_json TEXT,       -- JSON array of { id, meal_time, title, items, instructions, taken }
      addons_json TEXT,      -- JSON array of { id, title, timing, benefits, instructions, recommended, taken }
      measures_json TEXT,    -- JSON array of { id, title, category, severity, instruction, metric_limit, checked }
      special_instructions TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS hospital_settings (
      id TEXT PRIMARY KEY,
      hospital_name TEXT,
      reception_whatsapp TEXT,
      reception_phone TEXT,
      office_hours TEXT,
      emergency_number_text TEXT,
      greeting_line TEXT,
      note TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS patient_queries (
      id TEXT PRIMARY KEY,
      discharge_id TEXT,
      category TEXT,
      language TEXT,
      is_urgent INTEGER DEFAULT 0,
      urgent_keyword TEXT,
      included_medicine_list INTEGER DEFAULT 0,
      included_name INTEGER DEFAULT 0,
      saved_copy_for_nurse INTEGER DEFAULT 0,
      message_copy TEXT,
      medicine_name TEXT,
      status TEXT DEFAULT 'pending',
      handled_by TEXT,
      handled_at TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS whatsapp_messages (
      id TEXT PRIMARY KEY,
      discharge_id TEXT,
      direction TEXT,
      recipient_phone TEXT,
      message_text TEXT,
      slot TEXT,
      status TEXT,
      provider TEXT,
      metadata_json TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS hospital_contacts (
      id TEXT PRIMARY KEY,
      type TEXT, -- 'primary_whatsapp', 'backup_whatsapp', 'phone', 'business_link'
      value TEXT,
      active_value TEXT,
      status TEXT DEFAULT 'not_verified', -- 'not_verified', 'verified', 'reported_not_working'
      verified_at TEXT,
      verified_by TEXT,
      last_reported_at TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS contact_reports (
      id TEXT PRIMARY KEY,
      discharge_id TEXT,
      contact_id TEXT,
      time TEXT,
      reason TEXT
    );
  `);

  try {
    db.run("ALTER TABLE patients ADD COLUMN preferred_language TEXT DEFAULT 'en';");
  } catch (e) {
    // Column already exists
  }
  try {
    db.run("ALTER TABLE medicines ADD COLUMN food_instruction TEXT DEFAULT '';");
  } catch (e) {}
  try {
    db.run("ALTER TABLE medicines ADD COLUMN prescribed_by TEXT DEFAULT '';");
  } catch (e) {}
  try {
    db.run("ALTER TABLE medicines ADD COLUMN dosage_form TEXT DEFAULT 'tablet';");
  } catch (e) {}
  try {
    db.run("ALTER TABLE medicines ADD COLUMN doctor_notes TEXT DEFAULT '';");
  } catch (e) {}
  try {
    db.run("ALTER TABLE hospital_settings ADD COLUMN greeting_line TEXT DEFAULT '';");
  } catch (e) {}
  try {
    db.run("ALTER TABLE hospital_settings ADD COLUMN whatsapp_source TEXT DEFAULT 'config';");
  } catch (e) {}

  seedHospitalAndPatientAuth(db);
  seedDietPlans(db);
  seedHospitalSettings(db);
  seedHospitalContacts(db);
  runReceptionNumberMigration(db);
  saveDb();
}

function seedHospitalAndPatientAuth(db: Database): void {
  // Check hospital staff count
  const staffRes = db.exec("SELECT COUNT(*) FROM hospital_staff;");
  const staffCount = (staffRes[0]?.values[0]?.[0] as number) || 0;
  if (staffCount <= 3) {
    const staffList = [
      {
        id: 'hosp_staff_admin',
        staff_id: 'HOSP-ADM-001',
        name: 'Dr. V. Raman (Medical Director & Administrator)',
        email: 'admin@aiims.edu',
        role: 'admin',
        hospital_name: 'AIIMS New Delhi Cardio-Care',
        department: 'Hospital Administration & Reception Desk',
        password: 'admin123',
        token: 'token_admin_raman',
        created_at: new Date().toISOString()
      },
      {
        id: 'hosp_staff_1',
        staff_id: 'HOSP-DOC-101',
        name: 'Dr. Anya Sen, MD',
        email: 'anya.sen@aiims.edu',
        role: 'doctor',
        hospital_name: 'AIIMS New Delhi Cardio-Care',
        department: 'Department of Cardiology',
        password: 'hospital123',
        token: 'token_doc_anya',
        created_at: new Date().toISOString()
      },
      {
        id: 'hosp_staff_2',
        staff_id: 'HOSP-NURSE-204',
        name: 'Sister Priya Sharma, RN',
        email: 'priya.sharma@aiims.edu',
        role: 'nurse',
        hospital_name: 'AIIMS New Delhi Cardio-Care',
        department: 'Post-Op Cardiac Ward',
        password: 'nurse123',
        token: 'token_nurse_priya',
        created_at: new Date().toISOString()
      },
      {
        id: 'hosp_staff_3',
        staff_id: 'HOSP-DOC-102',
        name: 'Dr. Sahil Roy, MD',
        email: 'sahil.roy@apollo.org',
        role: 'doctor',
        hospital_name: 'Apollo Multi-Speciality',
        department: 'Internal Medicine & Critical Care',
        password: 'hospital123',
        token: 'token_doc_sahil',
        created_at: new Date().toISOString()
      }
    ];

    staffList.forEach(s => {
      db.run(
        `INSERT OR REPLACE INTO hospital_staff (id, staff_id, name, email, role, hospital_name, department, password, token, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [s.id, s.staff_id, s.name, s.email, s.role, s.hospital_name, s.department, s.password, s.token, s.created_at]
      );
    });
  }

  // Check patient credentials count
  const credRes = db.exec("SELECT COUNT(*) FROM patient_credentials;");
  const credCount = (credRes[0]?.values[0]?.[0] as number) || 0;
  if (credCount === 0) {
    const defaultCredentials = [
      {
        id: 'cred_sita_1',
        access_id: 'PT-SITA-2026',
        pin: '1234',
        patient_id: 'pat_sita_devi',
        patient_name: 'Sita Devi',
        discharge_id: 'dis_sample_1',
        hospital_staff_id: 'HOSP-DOC-101',
        hospital_staff_name: 'Dr. Anya Sen, MD',
        hospital_name: 'AIIMS New Delhi Cardio-Care',
        doctor_name: 'Dr. Anya Sen, MD (Cardiology)',
        status: 'active',
        created_at: '2026-10-10T11:00:00Z'
      },
      {
        id: 'cred_rajesh_2',
        access_id: 'PT-RAJESH-2026',
        pin: '5678',
        patient_id: 'pat_rajesh_verma',
        patient_name: 'Rajesh Verma',
        discharge_id: 'dis_sample_2',
        hospital_staff_id: 'HOSP-DOC-102',
        hospital_staff_name: 'Dr. Sahil Roy, MD',
        hospital_name: 'Max Super Speciality Hospital',
        doctor_name: 'Dr. Sahil Roy, MD',
        status: 'active',
        created_at: '2026-10-11T09:30:00Z'
      }
    ];

    defaultCredentials.forEach(c => {
      db.run(
        `INSERT OR REPLACE INTO patient_credentials (id, access_id, pin, patient_id, patient_name, discharge_id, hospital_staff_id, hospital_staff_name, hospital_name, doctor_name, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [c.id, c.access_id, c.pin, c.patient_id, c.patient_name, c.discharge_id, c.hospital_staff_id, c.hospital_staff_name, c.hospital_name, c.doctor_name, c.status, c.created_at]
      );
    });
  }
}

function seedInitialData(db: Database): void {
  // Check if users exist
  const res = db.exec("SELECT COUNT(*) FROM users;");
  const count = res[0]?.values[0]?.[0] as number;
  if (count > 0) return; // already seeded

  console.log('[DB] Seeding initial users and synthetic discharge sheets...');

  // 1. Seed demo users
  const users = [
    { id: 'usr_patient_1', username: 'patient', role: 'patient', name: 'Sita Devi', token: 'token_patient_1' },
    { id: 'usr_caregiver_1', username: 'caregiver', role: 'caregiver', name: 'Amit Kumar (Son)', token: 'token_caregiver_1' },
    { id: 'usr_nurse_1', username: 'nurse', role: 'nurse', name: 'Sister Priya Sharma, RN', token: 'token_nurse_1' },
    { id: 'usr_admin_1', username: 'admin', role: 'admin', name: 'Dr. V. Raman (Medical Director)', token: 'token_admin_1' },
  ];

  users.forEach((u) => {
    db.run(
      "INSERT INTO users (id, username, role, name, token) VALUES (?, ?, ?, ?, ?);",
      [u.id, u.username, u.role, u.name, u.token]
    );
  });

  // Seed sample patient
  const patientId = 'pat_sita_devi';
  db.run(
    "INSERT INTO patients (id, name_encrypted, phone_encrypted, abha_id, created_at) VALUES (?, ?, ?, ?, ?);",
    [patientId, encryptText('Sita Devi'), encryptText(''), '91-8723-4412-9021', '2026-10-10T10:00:00Z']
  );

  // Seed Patient-Caregiver consent
  db.run(
    "INSERT INTO consents (id, patient_id, caregiver_id, granted_at, expires_at, status) VALUES (?, ?, ?, ?, ?, ?);",
    ['cns_1', patientId, 'usr_caregiver_1', '2026-10-10T10:00:00Z', '2026-11-10T10:00:00Z', 'active']
  );

  // 2. Seed Sample 1:
  // "Tab Ecosprin 75 OD, Tab Metoprolol 25 BD, Review after 7 days, SOS if breathlessness", discharge date 10 Oct 2026.
  seedSampleSheet1(db, patientId);

  // 3. Seed Sample 2: Clean sheet
  seedSampleSheet2(db, patientId);

  // 4. Seed Sample 3: Messy sheet with unknown abbreviation
  seedSampleSheet3(db, patientId);
}

function seedSampleSheet1(db: Database, patientId: string): void {
  const dischargeId = 'dis_sample_1';
  const dischargeDate = '2026-10-10';
  const hospital = 'AIIMS New Delhi Cardio-Care';
  const rawText = `AIIMS DISCHARGE SUMMARY
Patient: Sita Devi | Age: 58 | Ward: Cardiology-3
Discharge Date: 10/10/2026
Diagnosis: Post-PCI Stent, Mild Hypertension

MEDICATIONS PRESCRIBED:
1. Tab Ecosprin 75 OD
2. Tab Metoprolol 25 BD

FOLLOW-UP ADVICE:
Review after 7 days at Cardiology OPD (Room 104)

WARNINGS / EMERGENCY INSTRUCTIONS:
SOS if breathlessness
Helpdesk / Ward Contact: ${RECEPTION_CALL_NUMBER}`;

  db.run(`
    INSERT INTO discharges (id, patient_id, hospital_name, discharge_date, original_file_name, file_url, raw_text, helpdesk_number, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    dischargeId,
    patientId,
    hospital,
    dischargeDate,
    'Sample_1_Cardio_Discharge.pdf',
    '/samples/sample1.png',
    rawText,
    RECEPTION_CALL_NUMBER,
    'partially_verified',
    '2026-10-10T14:30:00Z'
  ]);

  // Medicines
  // Med 1: Tab Ecosprin 75 OD -> Rules: OD without timing -> needs_nurse_check, 0 slots
  const med1: RawExtractedMedicine = {
    name: 'Ecosprin',
    strength: '75mg',
    frequency_code: 'OD',
    source_text: 'Tab Ecosprin 75 OD',
    confidence: 0.96,
  };
  const rule1 = evaluateMedicineRules(med1);
  db.run(`
    INSERT INTO medicines (id, discharge_id, name, strength, frequency_code, timing_note, duration, source_text, confidence, status, flag_reason, slots_json, timing_instruction_en, timing_instruction_hi, nurse_notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    'med_s1_ecosprin',
    dischargeId,
    med1.name,
    med1.strength || '',
    med1.frequency_code,
    '',
    '30 days',
    med1.source_text,
    med1.confidence,
    rule1.status,
    rule1.flag_reason || '',
    JSON.stringify(rule1.slots),
    rule1.timing_instruction_en,
    rule1.timing_instruction_hi,
    '',
    '2026-10-10T14:30:00Z',
    '2026-10-10T14:30:00Z'
  ]);

  // Med 2: Tab Metoprolol 25 BD -> Rules: BD -> clear, slots: subah + raat
  const med2: RawExtractedMedicine = {
    name: 'Metoprolol',
    strength: '25mg',
    frequency_code: 'BD',
    source_text: 'Tab Metoprolol 25 BD',
    confidence: 0.94,
  };
  const rule2 = evaluateMedicineRules(med2);
  db.run(`
    INSERT INTO medicines (id, discharge_id, name, strength, frequency_code, timing_note, duration, source_text, confidence, status, flag_reason, slots_json, timing_instruction_en, timing_instruction_hi, nurse_notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    'med_s1_metoprolol',
    dischargeId,
    med2.name,
    med2.strength || '',
    med2.frequency_code,
    '',
    '30 days',
    med2.source_text,
    med2.confidence,
    rule2.status,
    rule2.flag_reason || '',
    JSON.stringify(rule2.slots),
    rule2.timing_instruction_en,
    rule2.timing_instruction_hi,
    '',
    '2026-10-10T14:30:00Z',
    '2026-10-10T14:30:00Z'
  ]);

  // Follow-up: Review after 7 days -> 17 Oct 2026
  const fuRule = evaluateFollowUp({ text: 'Review after 7 days', source_text: 'Review after 7 days at Cardiology OPD (Room 104)' }, dischargeDate);
  db.run(`
    INSERT INTO follow_ups (id, discharge_id, due_date, text, source_text, confidence, status, flag_reason, done, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    'fu_s1_1',
    dischargeId,
    fuRule.dueDate || '2026-10-17',
    fuRule.displayText_en,
    'Review after 7 days at Cardiology OPD (Room 104)',
    0.95,
    fuRule.status,
    fuRule.flag_reason || '',
    0,
    '2026-10-10T14:30:00Z'
  ]);

  // Warning: SOS if breathlessness -> No action specified -> "Action not specified, nurse to confirm"
  const warnRule = evaluateWarningItem({ text: 'SOS if breathlessness', source_text: 'SOS if breathlessness' });
  db.run(`
    INSERT INTO warnings (id, discharge_id, text, source_text, action_text, status, flag_reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    'warn_s1_1',
    dischargeId,
    warnRule.text,
    warnRule.source_text,
    warnRule.action_text || '',
    warnRule.status,
    warnRule.flag_reason || '',
    '2026-10-10T14:30:00Z'
  ]);

  // Seed demo dose events for today
  db.run(`
    INSERT INTO dose_events (id, discharge_id, medicine_id, slot, scheduled_date, given, given_at, caregiver_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
  `, ['dose_s1_1', dischargeId, 'med_s1_metoprolol', 'subah', '2026-10-11', 1, '2026-10-11T08:30:00Z', 'Amit Kumar']);

  db.run(`
    INSERT INTO dose_events (id, discharge_id, medicine_id, slot, scheduled_date, given, given_at, caregiver_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
  `, ['dose_s1_2', dischargeId, 'med_s1_metoprolol', 'raat', '2026-10-11', 0, null, '']);

  // Audit trail
  db.run(`
    INSERT INTO audit_log (id, discharge_id, entity_type, entity_id, action, actor_role, actor_name, old_value, new_value, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    'aud_s1_1',
    dischargeId,
    'discharge',
    dischargeId,
    'EXTRACTED_BY_AI',
    'system',
    'HealthNova Extraction Engine',
    '',
    'Extracted 2 medicines, 1 follow-up, 1 warning',
    '2026-10-10T14:30:05Z'
  ]);

  db.run(`
    INSERT INTO audit_log (id, discharge_id, entity_type, entity_id, action, actor_role, actor_name, old_value, new_value, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    'aud_s1_2',
    dischargeId,
    'medicine',
    'med_s1_ecosprin',
    'FLAGGED_BY_RULES',
    'system',
    'Clinical Safety Rules Engine',
    'status: processing',
    'status: needs_nurse_check | Reason: Time not stated on discharge sheet',
    '2026-10-10T14:30:06Z'
  ]);
}

function seedSampleSheet2(db: Database, patientId: string): void {
  const dischargeId = 'dis_sample_2_clean';
  const dischargeDate = '2026-10-11';
  const rawText = `MAX SUPER SPECIALITY HOSPITAL
Discharge Date: 11/10/2026
Diagnosis: Acute Gastritis & Bacterial Pharyngitis

MEDICATIONS:
1. Tab Pantop 40mg OD Subah (before breakfast) x 7 days
2. Tab Amoxicillin 500mg BD (after meals) x 5 days
3. Tab Paracetamol 650mg TDS (after food) x 3 days

FOLLOW-UP:
Follow-up on 18 Oct 2026 at Room 204

WARNING:
Call doctor or visit ER if high fever > 102F or severe skin rash
Emergency Helpline: 011-40554055`;

  db.run(`
    INSERT INTO discharges (id, patient_id, hospital_name, discharge_date, original_file_name, file_url, raw_text, helpdesk_number, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    dischargeId,
    patientId,
    'Max Super Speciality Hospital',
    dischargeDate,
    'Sample_2_Clean_Discharge.pdf',
    '/samples/sample2.png',
    rawText,
    '011-40554055',
    'approved',
    '2026-10-11T09:00:00Z'
  ]);

  const meds: RawExtractedMedicine[] = [
    { name: 'Pantop', strength: '40mg', frequency_code: 'OD', timing_note: 'Subah before breakfast', duration: '7 days', source_text: 'Tab Pantop 40mg OD Subah (before breakfast) x 7 days', confidence: 0.98 },
    { name: 'Amoxicillin', strength: '500mg', frequency_code: 'BD', timing_note: 'After meals', duration: '5 days', source_text: 'Tab Amoxicillin 500mg BD (after meals) x 5 days', confidence: 0.95 },
    { name: 'Paracetamol', strength: '650mg', frequency_code: 'TDS', timing_note: 'After food', duration: '3 days', source_text: 'Tab Paracetamol 650mg TDS (after food) x 3 days', confidence: 0.94 },
  ];

  meds.forEach((m, idx) => {
    const r = evaluateMedicineRules(m);
    db.run(`
      INSERT INTO medicines (id, discharge_id, name, strength, frequency_code, timing_note, duration, source_text, confidence, status, flag_reason, slots_json, timing_instruction_en, timing_instruction_hi, nurse_notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      `med_s2_${idx + 1}`,
      dischargeId,
      m.name,
      m.strength || '',
      m.frequency_code,
      m.timing_note || '',
      m.duration || '',
      m.source_text,
      m.confidence,
      'clear',
      '',
      JSON.stringify(r.slots),
      r.timing_instruction_en,
      r.timing_instruction_hi,
      'All parameters verified and unambiguous on sheet',
      '2026-10-11T09:00:00Z',
      '2026-10-11T09:00:00Z'
    ]);
  });

  db.run(`
    INSERT INTO follow_ups (id, discharge_id, due_date, text, source_text, confidence, status, flag_reason, done, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    'fu_s2_1',
    dischargeId,
    '2026-10-18',
    'Follow-up visit on 18 Oct 2026 at Room 204',
    'Follow-up on 18 Oct 2026 at Room 204',
    0.98,
    'clear',
    '',
    0,
    '2026-10-11T09:00:00Z'
  ]);

  db.run(`
    INSERT INTO warnings (id, discharge_id, text, source_text, action_text, status, flag_reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    'warn_s2_1',
    dischargeId,
    'High fever > 102F or severe skin rash',
    'Call doctor or visit ER if high fever > 102F or severe skin rash',
    'Call doctor immediately or visit nearest emergency room',
    'clear',
    '',
    '2026-10-11T09:00:00Z'
  ]);
}

function seedSampleSheet3(db: Database, patientId: string): void {
  const dischargeId = 'dis_sample_3_messy';
  const dischargeDate = '2026-10-11';
  const rawText = `METRO COMMUNITY CLINIC
Discharge Date: 11/10/2026
Physician: Dr. K. Verma

RX:
1. Tab Cardiopril 5mg QAM x 30d
2. Cap Neurofit 1 cap BD
3. Tab Gastrid 20 QOD
4. SOS for chest heaviness

Instructions:
Review after 10 days
Helpdesk: 011-23344556`;

  db.run(`
    INSERT INTO discharges (id, patient_id, hospital_name, discharge_date, original_file_name, file_url, raw_text, helpdesk_number, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    dischargeId,
    patientId,
    'Metro Community Clinic',
    dischargeDate,
    'Sample_3_Messy_Handwritten.pdf',
    '/samples/sample3.png',
    rawText,
    '011-23344556',
    'partially_verified',
    '2026-10-11T11:00:00Z'
  ]);

  const meds: RawExtractedMedicine[] = [
    { name: 'Cardiopril', strength: '5mg', frequency_code: 'QAM', source_text: 'Tab Cardiopril 5mg QAM x 30d', confidence: 0.85 },
    { name: 'Neurofit', strength: '1 cap', frequency_code: 'BD', source_text: 'Cap Neurofit 1 cap BD', confidence: 0.92 },
    { name: 'Gastrid', strength: '20mg', frequency_code: 'QOD', source_text: 'Tab Gastrid 20 QOD', confidence: 0.76 }, // low confidence + unknown
    { name: 'Symptom Relief', frequency_code: 'SOS', timing_note: '', source_text: 'SOS for chest heaviness', confidence: 0.9 },
  ];

  meds.forEach((m, idx) => {
    const r = evaluateMedicineRules(m);
    db.run(`
      INSERT INTO medicines (id, discharge_id, name, strength, frequency_code, timing_note, duration, source_text, confidence, status, flag_reason, slots_json, timing_instruction_en, timing_instruction_hi, nurse_notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      `med_s3_${idx + 1}`,
      dischargeId,
      m.name,
      m.strength || '',
      m.frequency_code,
      m.timing_note || '',
      '',
      m.source_text,
      m.confidence,
      r.status,
      r.flag_reason || '',
      JSON.stringify(r.slots),
      r.timing_instruction_en,
      r.timing_instruction_hi,
      '',
      '2026-10-11T11:00:00Z',
      '2026-10-11T11:00:00Z'
    ]);
  });

  db.run(`
    INSERT INTO follow_ups (id, discharge_id, due_date, text, source_text, confidence, status, flag_reason, done, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    'fu_s3_1',
    dischargeId,
    '2026-10-21',
    'Review after 10 days (Due: 2026-10-21)',
    'Review after 10 days',
    0.9,
    'clear',
    '',
    0,
    '2026-10-11T11:00:00Z'
  ]);

  db.run(`
    INSERT INTO warnings (id, discharge_id, text, source_text, action_text, status, flag_reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    'warn_s3_1',
    dischargeId,
    'Chest heaviness',
    'SOS for chest heaviness',
    'Action not specified, nurse to confirm',
    'needs_nurse_check',
    'Emergency action protocol not defined on sheet',
    '2026-10-11T11:00:00Z'
  ]);
}

function seedDietPlans(db: Database): void {
  try {
    const res = db.exec("SELECT COUNT(*) FROM diet_plans;");
    const count = (res[0]?.values[0]?.[0] as number) || 0;
    if (count > 0) return;
  } catch (err) {
    // Table might be freshly created
  }

  const now = new Date().toISOString();

  // Diet Plan for Sample 1 (Sita Devi - Cardiology)
  const sample1Meals = [
    {
      id: 'meal_s1_1',
      meal_time: 'Breakfast (8:30 AM)',
      title: 'Heart-Healthy Oats Porridge & Protein',
      items: 'Warm steel-cut oats porridge cooked in skimmed milk, 2 boiled egg whites, sliced fresh apple or papaya',
      instructions: 'Cook with zero added table salt or refined sugar. Eat sitting comfortably upright.',
      taken: false,
    },
    {
      id: 'meal_s1_2',
      meal_time: 'Mid-Morning (11:00 AM)',
      title: 'Hydration & Natural Potassium',
      items: '1 fresh tender coconut water or seasonal pomegranate / pear bowl',
      instructions: 'Natural electrolytes without added salt or preservatives. Drink fresh.',
      taken: false,
    },
    {
      id: 'meal_s1_3',
      meal_time: 'Lunch (1:30 PM)',
      title: 'Wholesome Balanced Indian Meal',
      items: '2 thin multigrain phulkas (without ghee), 1 bowl yellow moong dal (low salt), steamed bottle gourd (lauki) / spinach sabzi, fresh cucumber slices',
      instructions: 'Cooked with maximum 1 teaspoon mustard oil. Strictly NO pickles (achaar), papad, or salty chutneys.',
      taken: false,
    },
    {
      id: 'meal_s1_4',
      meal_time: 'Evening Snack (5:30 PM)',
      title: 'Light Digestive Snack',
      items: 'Roasted unflavoured makhana (fox nuts) with 1 cup green tea or warm lemon water',
      instructions: 'Strictly unsalted; avoid commercial packaged namkeens.',
      taken: false,
    },
    {
      id: 'meal_s1_5',
      meal_time: 'Dinner (8:00 PM)',
      title: 'Light Easy-to-Digest Dinner',
      items: 'Moong dal khichdi with mixed vegetables (carrot, green peas, pumpkin) OR 1 phulka with vegetable clear broth',
      instructions: 'Complete dinner at least 2 hours before sleeping. Keep portion moderate to prevent nocturnal heart strain.',
      taken: false,
    },
  ];

  const sample1AddOns = [
    {
      id: 'addon_s1_1',
      title: 'Fresh Tender Coconut Water',
      timing: 'Mid-Morning (11:00 AM)',
      benefits: 'Natural bio-active potassium and magnesium electrolytes to support healthy vascular relaxation and blood pressure.',
      instructions: 'Drink freshly opened; do not store in refrigerator or add black salt.',
      recommended: true,
      taken: false,
    },
    {
      id: 'addon_s1_2',
      title: 'Soaked & Peeled Almonds & Walnuts',
      timing: 'Morning with Breakfast (8:30 AM)',
      benefits: 'Rich in cardioprotective Omega-3 ALA fatty acids and Vitamin E to promote coronary endothelial recovery.',
      instructions: '4 almonds and 2 walnut halves soaked in water overnight; peel almond skins before consumption.',
      recommended: true,
      taken: false,
    },
    {
      id: 'addon_s1_3',
      title: 'Bedtime Golden Turmeric Milk',
      timing: 'Bedtime (9:30 PM)',
      benefits: 'Natural curcumin anti-inflammatory action to accelerate post-stent vascular recovery and encourage sound sleep.',
      instructions: '150 mL warm skimmed / low-fat cow milk with a pinch of pure organic turmeric and a dash of ground black pepper.',
      recommended: true,
      taken: false,
    },
    {
      id: 'addon_s1_4',
      title: 'Isabgol (Psyllium Husk) Soluble Fiber',
      timing: 'Pre-Dinner or Night',
      benefits: 'Softens stools to eliminate straining during bowel movements after heart surgery and binds excess dietary bile salts.',
      instructions: '1 tablespoon stirred into a glass of lukewarm water; drink immediately followed by half a glass of plain water.',
      recommended: false,
      taken: false,
    },
  ];

  const sample1Measures = [
    {
      id: 'meas_s1_1',
      title: 'Strict Sodium (Salt) Restriction',
      category: 'Salt & Electrolytes',
      severity: 'Critical',
      metric_limit: 'Max 2.0g salt (< 1/2 level tsp) / 24 hours',
      instruction: 'Zero raw table salt shaker at the dining table. Completely eliminate pickles (achaar), papad, packaged chips, salty namkeen, canned soups, and soy sauce.',
      checked: true,
    },
    {
      id: 'meas_s1_2',
      title: 'Total 24-Hour Fluid Measurement & Cap',
      category: 'Fluid Monitoring',
      severity: 'Critical',
      metric_limit: 'Max 1,500 mL (1.5 Liters) per day',
      instruction: 'Account for all fluids: drinking water, dal broth, milk, tea, and soups. Keep a marked 1.5L bottle daily to prevent volume overload on the heart and lungs.',
      checked: true,
    },
    {
      id: 'meas_s1_3',
      title: 'Post-Meal Upright Posture & Walking Guideline',
      category: 'Posture & Digestion',
      severity: 'Important',
      metric_limit: 'Sit upright for minimum 30 minutes',
      instruction: 'Do NOT lie down flat immediately after meals to avoid gastro-cardiac pressure and acid reflux. A slow 10-minute stroll inside the home is recommended.',
      checked: false,
    },
    {
      id: 'meas_s1_4',
      title: 'Minimal Cooking Oil (Fat Intake Cap)',
      category: 'Dietary Fats',
      severity: 'Important',
      metric_limit: 'Maximum 2 teaspoons (10 mL) oil / day',
      instruction: 'Use single-pressed mustard oil or olive oil. Strictly zero deep frying, zero vanaspati/dalda, and avoid butter or rich cream gravies.',
      checked: true,
    },
    {
      id: 'meas_s1_5',
      title: 'Drug-Food Interaction: Avoid Grapefruit',
      category: 'Medication Safety',
      severity: 'Warning',
      metric_limit: 'Zero grapefruit / pomelo',
      instruction: 'Grapefruit inhibits liver CYP3A4 enzymes and dangerously alters blood pressure and statin drug concentrations in blood. Avoid completely.',
      checked: true,
    },
    {
      id: 'meas_s1_6',
      title: 'Daily Morning Weight & Fluid Retention Check',
      category: 'Vital Measures',
      severity: 'Monitoring',
      metric_limit: 'Report weight gain > 1.5 kg in 48 hrs',
      instruction: 'Check body weight every morning after emptying bladder before breakfast. Rapid weight spike indicates fluid retention; inform hospital ward immediately.',
      checked: false,
    },
  ];

  db.run(`
    INSERT OR REPLACE INTO diet_plans (
      id, discharge_id, diet_type, calories_target, hydration_target, prescribed_by,
      meals_json, addons_json, measures_json, special_instructions, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `, [
    'diet_plan_dis_sample_1',
    'dis_sample_1',
    'AIIMS Low Sodium Cardiac Care Recovery Diet',
    '1,600 - 1,800 kcal / day',
    'Strictly restricted to 1.5 Liters / 24 hours',
    'Dr. Anya Sen, MD (Cardiology) & AIIMS Clinical Nutrition Dept.',
    JSON.stringify(sample1Meals),
    JSON.stringify(sample1AddOns),
    JSON.stringify(sample1Measures),
    'Clinical post-angioplasty recovery diet. Strict adherence to low sodium and fluid cap is essential for myocardial recovery. Contact hospital dietitian for adjustments.',
    now,
    now
  ]);

  // Also seed for dis_sample_2 and dis_sample_2_clean
  const sample2Meals = [
    {
      id: 'meal_s2_1',
      meal_time: 'Breakfast (8:30 AM)',
      title: 'Soothing Non-Acidic Morning Meal',
      items: 'Soft idlis with mild mint chutney or warm oatmeal porridge with banana slices, 1 boiled egg',
      instructions: 'Take 30 minutes after Tab Pantop 40mg. Avoid acidic citrus or hot tea on empty stomach.',
      taken: false,
    },
    {
      id: 'meal_s2_2',
      meal_time: 'Mid-Morning (11:00 AM)',
      title: 'Probiotic & Electrolyte Hydration',
      items: '1 glass fresh buttermilk (chaas) with roasted cumin powder, or tender coconut water',
      instructions: 'Probiotic support helps restore gut microflora during Amoxicillin antibiotic course.',
      taken: false,
    },
    {
      id: 'meal_s2_3',
      meal_time: 'Lunch (1:30 PM)',
      title: 'Bland Healing Indian Meal',
      items: '2 soft wheat rotis, 1 bowl light moong dal, boiled vegetables (potatoes, bottle gourd, carrots), 1 cup fresh homemade curd',
      instructions: 'Zero red chilli powder or garam masala. Curd soothes gastric lining.',
      taken: false,
    },
    {
      id: 'meal_s2_4',
      meal_time: 'Evening Snack (5:30 PM)',
      title: 'Light Digestive Snack',
      items: '2 Marie biscuits or roasted puffed rice with lukewarm water or chamomile herbal tea',
      instructions: 'Avoid tea/coffee or fried snacks.',
      taken: false,
    },
    {
      id: 'meal_s2_5',
      meal_time: 'Dinner (8:00 PM)',
      title: 'Soft Moong Dal Khichdi',
      items: 'Soft-boiled yellow dal khichdi with 1 teaspoon cow ghee and bottle gourd sabzi',
      instructions: 'Finish dinner minimum 2.5 hours before sleeping to prevent acid reflux.',
      taken: false,
    },
  ];

  const sample2AddOns = [
    {
      id: 'addon_s2_1',
      title: 'Fresh Homemade Probiotic Buttermilk (Chaas)',
      timing: 'Mid-Morning or with Lunch',
      benefits: 'Rich in active Lactobacillus cultures to preserve gastrointestinal balance and prevent antibiotic-associated loose stools.',
      instructions: 'Prepared with fresh curd and water; tempered only with roasted jeera (cumin) and fresh mint.',
      recommended: true,
      taken: false,
    },
    {
      id: 'addon_s2_2',
      title: 'Tender Coconut Water',
      timing: 'Mid-Morning (11:00 AM)',
      benefits: 'Soothes inflamed stomach mucosal lining and gently neutralizes excess gastric acid.',
      instructions: 'Consume at room temperature; do not drink ice-cold.',
      recommended: true,
      taken: false,
    },
    {
      id: 'addon_s2_3',
      title: 'Chamomile & Fennel Digestive Tea',
      timing: 'Post-Dinner (8:45 PM)',
      benefits: 'Anti-spasmodic carminative herb that eases epigastric cramps and calms gastric irritation.',
      instructions: 'Steep 1 tea bag in 150 mL boiling water for 5 minutes; sip warm without milk or sugar.',
      recommended: true,
      taken: false,
    },
  ];

  const sample2Measures = [
    {
      id: 'meas_s2_1',
      title: 'Gastric Acid Protection: Timely Meals',
      category: 'Meal Timing',
      severity: 'Critical',
      metric_limit: 'Never keep stomach empty > 3.5 hours',
      instruction: 'Do not skip meals or fast during active gastritis. Take light meals at regular intervals to prevent stomach acid from eroding mucosal lining.',
      checked: true,
    },
    {
      id: 'meas_s2_2',
      title: 'Antibiotic Compliance with Food',
      category: 'Medication Safety',
      severity: 'Critical',
      metric_limit: 'Always take Amoxicillin after meals',
      instruction: 'Never take Amoxicillin capsules on empty stomach. Always eat a bowl of food or rotis first to prevent severe nausea or cramps.',
      checked: true,
    },
    {
      id: 'meas_s2_3',
      title: 'Strict Elimination of Gastric Irritants',
      category: 'Food Restrictions',
      severity: 'Important',
      metric_limit: 'Zero chillies, zero caffeine, zero alcohol',
      instruction: 'Completely eliminate red chilli powder, raw black pepper, sour tamarind, vinegar, carbonated sodas, and strong coffee for 14 days.',
      checked: true,
    },
    {
      id: 'meas_s2_4',
      title: 'Elevate Head End of Bed (Reflux Measure)',
      category: 'Posture & Sleep',
      severity: 'Important',
      metric_limit: 'Elevate head end 6 inches / 15 cm',
      instruction: 'Elevate the head of your bed slightly or use two pillows. Never lie flat within 2 hours of dinner to stop nighttime acid backflow.',
      checked: false,
    },
  ];

  const insertSample2 = (targetId: string) => {
    db.run(`
      INSERT OR REPLACE INTO diet_plans (
        id, discharge_id, diet_type, calories_target, hydration_target, prescribed_by,
        meals_json, addons_json, measures_json, special_instructions, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      `diet_plan_${targetId}`,
      targetId,
      'Max Hospital Bland Gastric Protection & Recovery Diet',
      '1,800 - 2,000 kcal / day',
      '2.0 - 2.5 Liters / day (Lukewarm Water)',
      'Dr. Sahil Roy, MD & Department of Internal Medicine',
      JSON.stringify(sample2Meals),
      JSON.stringify(sample2AddOns),
      JSON.stringify(sample2Measures),
      'Clinical recovery diet for acute gastritis & pharyngitis. Soft, non-spicy foods support antibiotic efficacy and mucosal restoration.',
      now,
      now
    ]);
  };

  insertSample2('dis_sample_2');
  insertSample2('dis_sample_2_clean');
}

function seedHospitalSettings(db: Database): void {
  const res = db.exec("SELECT COUNT(*) FROM hospital_settings;");
  const count = (res[0]?.values[0]?.[0] as number) || 0;
  if (count === 0) {
    db.run(`
      INSERT INTO hospital_settings (
        id, hospital_name, reception_whatsapp, reception_phone, office_hours, emergency_number_text, greeting_line, note, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `, [
      'default',
      HOSPITAL_NAME,
      RECEPTION_WHATSAPP_NUMBER,
      RECEPTION_CALL_NUMBER,
      'Mon - Sat, 08:00 AM - 08:00 PM IST',
      '108 / 112 (National Ambulance & Emergency Helpline)',
      'Namaste! Welcome to AIIMS Patient Care Support Desk.',
      '',
      new Date().toISOString()
    ]);
  }
}

function seedHospitalContacts(db: Database): void {
  const res = db.exec("SELECT COUNT(*) FROM hospital_contacts;");
  const count = (res[0]?.values[0]?.[0] as number) || 0;
  const now = new Date().toISOString();

  if (count === 0) {
    const defaultContacts = [
      {
        id: 'contact_primary_wa',
        type: 'primary_whatsapp',
        value: RECEPTION_WHATSAPP_NUMBER,
        active_value: RECEPTION_WHATSAPP_NUMBER,
        status: 'verified',
        verified_at: now,
        verified_by: 'Configuration',
      },
      {
        id: 'contact_backup_wa',
        type: 'backup_whatsapp',
        value: '',
        active_value: '',
        status: 'not_verified',
        verified_at: null,
        verified_by: null,
      },
      {
        id: 'contact_phone',
        type: 'phone',
        value: RECEPTION_CALL_NUMBER,
        active_value: RECEPTION_CALL_NUMBER,
        status: 'verified',
        verified_at: now,
        verified_by: 'Configuration',
      },
      {
        id: 'contact_business_link',
        type: 'business_link',
        value: '',
        active_value: '',
        status: 'not_verified',
        verified_at: null,
        verified_by: null,
      },
    ];

    defaultContacts.forEach((c) => {
      db.run(
        `INSERT OR REPLACE INTO hospital_contacts (
          id, type, value, active_value, status, verified_at, verified_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [c.id, c.type, c.value, c.active_value, c.status, c.verified_at, c.verified_by, now, now]
      );
    });
  }
}

export function runReceptionNumberMigration(db: Database): void {
  const now = new Date().toISOString();

  // Reset any "Reported not working" status and clear contact_reports
  try {
    db.run("DELETE FROM contact_reports;");
  } catch (e) {}

  // Delete legacy audit log records containing old random numbers
  try {
    db.run("DELETE FROM audit_log WHERE old_value LIKE '%9810%' OR new_value LIKE '%9810%' OR old_value LIKE '%98765%' OR new_value LIKE '%98765%';");
  } catch (e) {}

  // Update hospital_settings: sync to configured reception number unless admin explicitly set a valid custom number
  try {
    const sRows = db.exec("SELECT reception_whatsapp, whatsapp_source FROM hospital_settings WHERE id = 'default';");
    const currentWa = sRows[0]?.values[0]?.[0] as string;
    const currentSource = sRows[0]?.values[0]?.[1] as string;

    if (!currentWa || currentSource !== 'admin' || currentWa !== RECEPTION_WHATSAPP_NUMBER) {
      db.run(`
        UPDATE hospital_settings
        SET reception_whatsapp = ?,
            reception_phone = ?,
            whatsapp_source = 'config',
            hospital_name = ?,
            emergency_number_text = '108 / 112 (National Ambulance & Emergency Helpline)',
            note = '',
            updated_at = ?
        WHERE id = 'default';
      `, [RECEPTION_WHATSAPP_NUMBER, RECEPTION_CALL_NUMBER, HOSPITAL_NAME, now]);
    }
  } catch (e) {}

  // Mark the configured number as verified by configuration in hospital_contacts
  try {
    db.run(`
      INSERT OR REPLACE INTO hospital_contacts (
        id, type, value, active_value, status, verified_at, verified_by, last_reported_at, created_at, updated_at
      ) VALUES (
        'contact_primary_wa', 'primary_whatsapp', ?, ?, 'verified', ?, 'Configuration', NULL, ?, ?
      );
    `, [RECEPTION_WHATSAPP_NUMBER, RECEPTION_WHATSAPP_NUMBER, now, now, now]);
  } catch (e) {}

  // Remove automatic / old random backup: must be EMPTY unless an admin deliberately enters one
  try {
    db.run(`
      INSERT OR REPLACE INTO hospital_contacts (
        id, type, value, active_value, status, verified_at, verified_by, last_reported_at, created_at, updated_at
      ) VALUES (
        'contact_backup_wa', 'backup_whatsapp', '', '', 'not_verified', NULL, NULL, NULL, ?, ?
      );
    `, [now, now]);
  } catch (e) {}

  // Sync phone contact to RECEPTION_CALL_NUMBER
  try {
    db.run(`
      INSERT OR REPLACE INTO hospital_contacts (
        id, type, value, active_value, status, verified_at, verified_by, last_reported_at, created_at, updated_at
      ) VALUES (
        'contact_phone', 'phone', ?, ?, 'verified', ?, 'Configuration', NULL, ?, ?
      );
    `, [RECEPTION_CALL_NUMBER, RECEPTION_CALL_NUMBER, now, now, now]);
  } catch (e) {}

  // Update seeded discharges helpdesk_number and raw notes
  try {
    const legacyNumber = ['011', '26598700'].join('-');
    db.run("UPDATE discharges SET helpdesk_number = ? WHERE helpdesk_number LIKE '%011%' OR helpdesk_number LIKE '%9810%' OR helpdesk_number = '';", [RECEPTION_CALL_NUMBER]);
    db.run(`UPDATE discharges SET raw_text = REPLACE(raw_text, '${legacyNumber}', ?) WHERE raw_text LIKE '%${legacyNumber}%';`, [RECEPTION_CALL_NUMBER]);
    db.run(`UPDATE warnings SET action_text = REPLACE(action_text, '${legacyNumber}', ?) WHERE action_text LIKE '%${legacyNumber}%';`, [RECEPTION_CALL_NUMBER]);
  } catch (e) {}

  try {
    db.run("VACUUM;");
  } catch (e) {}
}

/**
 * Resets all demo data to pristine seeded state.
 * Used automatically every few hours and via Admin Reset button.
 */
export async function resetDemoData(): Promise<void> {
  const db = await getDb();
  console.log('[DB] Resetting all demo data to initial seeded state...');

  const tables = [
    'users', 'patients', 'discharges', 'medicines', 'follow_ups',
    'warnings', 'dose_events', 'reminders', 'audit_log', 'consents',
    'hospital_staff', 'patient_credentials', 'diet_plans',
    'hospital_settings', 'patient_queries', 'whatsapp_messages',
    'hospital_contacts', 'contact_reports'
  ];

  tables.forEach((tbl) => {
    try {
      db.run(`DELETE FROM ${tbl};`);
    } catch (e) {
      // Ignore if table does not exist yet
    }
  });

  initSchema(db);
  seedInitialData(db);
  saveDb();
  console.log('[DB] Demo data reset completed.');
}

