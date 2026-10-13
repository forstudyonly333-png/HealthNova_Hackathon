/**
 * Comprehensive test suite for Reception WhatsApp & Voice Call configuration
 * Tests:
 * 1. buildWhatsAppLink starts with https://wa.me/917374029569?text= and UTF-8 encodes Hindi and English
 * 2. Invalid numbers are strictly rejected and never fall back to any other number
 * 3. Full project-wide scan ensuring NO unexpected phone numbers exist in code, seeds, or DB
 * 4. End-to-end patient reception sheet URL verification (targets 917374029569 with prefilled query)
 * 5. Primary unavailable banner is gone and Call Reception targets +91 73740 29569
 */

import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';
import {
  RECEPTION_WHATSAPP_NUMBER,
  RECEPTION_CALL_NUMBER,
  HOSPITAL_NAME,
  validateReceptionNumber,
  getReceptionWhatsApp,
  getReceptionCall,
  buildWhatsAppLink
} from '../src/config/reception.ts';
import { buildWhatsAppMessage } from '../src/utils/whatsappUtils.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` (${detail})` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n=== RUNNING RECEPTION NUMBER VERIFICATION TESTS ===\n');

  // TEST 1: Unit Test - buildWhatsAppLink and UTF-8 Encoding
  console.log('--- Test Suite 1: buildWhatsAppLink Link & Encoding ---');
  
  const englishMsg = 'Hello, this is regarding Discharge Ref dis_sample_1. Category: Medicine question. My message: Can I take Tab Ecosprin after dinner? Please assist.';
  const englishUrl = buildWhatsAppLink(englishMsg);
  
  assert(
    englishUrl.startsWith('https://wa.me/917374029569?text='),
    'English link starts with https://wa.me/917374029569?text=',
    englishUrl
  );
  assert(
    englishUrl.includes(encodeURIComponent(englishMsg)),
    'English message is fully and correctly URL encoded'
  );

  const hindiMsg = 'नमस्ते, यह डिस्चार्ज संदर्भ dis_sample_1 के संबंध में है। श्रेणी: Medicine question। मेरा संदेश: क्या मैं रात के खाने के बाद दवा ले सकता हूँ? कृपया मार्गदर्शन करें।';
  const hindiUrl = buildWhatsAppLink(hindiMsg);

  assert(
    hindiUrl.startsWith('https://wa.me/917374029569?text='),
    'Hindi link starts with https://wa.me/917374029569?text=',
    hindiUrl
  );
  assert(
    hindiUrl.includes('%E0%A4%A8%E0%A4%AE%E0%A4%B8%E0%A5%8D%E0%A4%A4%E0%A5%87'),
    'Hindi characters are properly UTF-8 URL encoded without corruption'
  );

  // TEST 2: Unit Test - Validation & Rejection of Invalid Numbers
  console.log('\n--- Test Suite 2: Invalid Number Rejection & Zero Fallback ---');

  const validRes = validateReceptionNumber('917374029569');
  assert(validRes.isValid === true && validRes.digits === '917374029569', 'Valid 91 + 10-digit number accepted');

  const invalidNumbers = [
    '12345',              // Too short
    '915555555555',       // Starts with 5 (invalid Indian mobile)
    '9810555444',         // Missing 91 country code
    '91981055544',        // Only 9 subscriber digits
    '+1 800 555 1234',    // Non-Indian country code
    '',                   // Empty
    'random_string'       // Non-numeric
  ];

  for (const num of invalidNumbers) {
    const res = validateReceptionNumber(num);
    const link = buildWhatsAppLink('Test message', num);
    assert(
      res.isValid === false,
      `Invalid number "${num}" is properly rejected by validateReceptionNumber`
    );
    assert(
      link === '',
      `Invalid number "${num}" returns empty string and NEVER falls back to any other number`
    );
  }

  // TEST 3: Project-wide Phone Number Scan
  console.log('\n--- Test Suite 3: Project-Wide Phone Number Scan ---');

  function walk(dir: string, fileList: string[] = []): string[] {
    for (const file of fs.readdirSync(dir)) {
      if (file === 'node_modules' || file === '.git' || file === 'dist' || file === '.aistudio') continue;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath, fileList);
      } else {
        fileList.push(fullPath);
      }
    }
    return fileList;
  }

  const allFiles = walk('.');
  const forbiddenPatterns = [
    { pattern: /98105\s*55444/g, desc: 'Random backup number 98105 55444' },
    { pattern: /9810555444/g, desc: 'Random backup number 9810555444' },
    { pattern: /9810123456/g, desc: 'Old demo number 9810123456' },
    { pattern: /9810999888/g, desc: 'Old demo number 9810999888' },
    { pattern: /98100\s*23456/g, desc: 'Hardcoded number 98100 23456' },
    { pattern: /9810023456/g, desc: 'Hardcoded number 9810023456' },
    { pattern: /9811054321/g, desc: 'Hardcoded placeholder 9811054321' },
    { pattern: /98765\s*43210/g, desc: 'Generic sample 98765 43210' },
    { pattern: /011-26598700/g, desc: 'Old hardcoded landline 011-26598700' },
    { pattern: /18002273669/g, desc: 'Old hardcoded toll-free 18002273669' },
    { pattern: /919999900001/g, desc: 'Old webhook test number 919999900001' }
  ];

  let violations: string[] = [];

  for (const filePath of allFiles) {
    // Skip binary files and test files itself
    if (
      filePath.endsWith('.png') ||
      filePath.endsWith('.jpg') ||
      filePath.endsWith('.ico') ||
      filePath.endsWith('.lock') ||
      filePath === 'test/reception.test.ts'
    ) {
      continue;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        for (const item of forbiddenPatterns) {
          if (item.pattern.test(line)) {
            violations.push(`${filePath}:${idx + 1} (${item.desc}) -> ${line.trim()}`);
          }
        }
      });
    } catch {}
  }

  // Also check database file rows
  try {
    const SQL = await initSqlJs();
    const dbBuf = fs.readFileSync('server/data/app.db');
    const db = new SQL.Database(dbBuf);
    
    const contactRows = db.exec("SELECT * FROM hospital_contacts;");
    const contactsJson = JSON.stringify(contactRows);
    
    for (const item of forbiddenPatterns) {
      if (item.pattern.test(contactsJson)) {
        violations.push(`server/data/app.db (hospital_contacts table) -> matched ${item.desc}`);
      }
    }

    const settingsRows = db.exec("SELECT * FROM hospital_settings;");
    const settingsJson = JSON.stringify(settingsRows);
    for (const item of forbiddenPatterns) {
      if (item.pattern.test(settingsJson)) {
        violations.push(`server/data/app.db (hospital_settings table) -> matched ${item.desc}`);
      }
    }
  } catch (err: any) {
    console.warn('DB inspection warning:', err.message);
  }

  assert(
    violations.length === 0,
    `Project-wide scan found zero forbidden phone numbers across all files & DB`,
    violations.join('\n')
  );

  // TEST 4: End-to-End Patient Flow Simulation
  console.log('\n--- Test Suite 4: End-to-End Patient Sheet & Flow Simulation ---');

  // Simulate discharge ref dis_sample_1 with "Medicine question"
  const sampleMessage = buildWhatsAppMessage({
    lang: 'en',
    dischargeRef: 'dis_sample_1',
    category: 'Medicine question',
    userMessage: 'Is it safe to take Tab Metoprolol before breakfast?',
    medicineName: 'Metoprolol',
    patientName: 'Sita Devi',
    includeName: false
  });

  const patientWhatsAppUrl = buildWhatsAppLink(sampleMessage);
  
  assert(
    patientWhatsAppUrl.startsWith('https://wa.me/917374029569?text='),
    'Patient sheet WhatsApp button opens chat targeting 917374029569',
    patientWhatsAppUrl
  );

  assert(
    patientWhatsAppUrl.includes('Discharge%20Ref%20dis_sample_1') &&
    patientWhatsAppUrl.includes('Category%3A%20Medicine%20question') &&
    patientWhatsAppUrl.includes('Metoprolol'),
    'WhatsApp message contains prefilled discharge reference, category, and medicine question'
  );

  // TEST 5: Call Reception and Settings Verification
  console.log('\n--- Test Suite 5: Call Reception & Config Settings ---');

  const callInfo = getReceptionCall();
  assert(
    callInfo.telUri === 'tel:+917374029569',
    'Call Reception button dials tel:+917374029569',
    callInfo.telUri
  );
  assert(
    callInfo.formatted === '+91 73740 29569',
    'Call Reception displays formatted number +91 73740 29569',
    callInfo.formatted
  );

  // Check database current state
  const SQL = await initSqlJs();
  const dbBuf = fs.readFileSync('server/data/app.db');
  const db = new SQL.Database(dbBuf);
  
  const contacts = db.exec("SELECT id, type, value, active_value, status FROM hospital_contacts WHERE type IN ('primary_whatsapp', 'backup_whatsapp');");
  const values = contacts[0]?.values || [];
  
  const primaryRow = values.find((v: any) => v[1] === 'primary_whatsapp');
  const backupRow = values.find((v: any) => v[1] === 'backup_whatsapp');

  assert(
    Boolean(primaryRow && primaryRow[2] === '917374029569' && primaryRow[3] === '917374029569' && primaryRow[4] === 'verified'),
    'Primary WhatsApp in database is verified and set to 917374029569'
  );

  assert(
    Boolean(backupRow && backupRow[2] === '' && backupRow[3] === '' && backupRow[4] === 'not_verified'),
    'Backup WhatsApp in database is empty (no automatic random backup)'
  );

  const reportCount = db.exec("SELECT COUNT(*) FROM contact_reports;")[0]?.values[0]?.[0];
  assert(
    reportCount === 0,
    'contact_reports table is clear (no false reported_not_working alarms)'
  );

  console.log(`\n=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
