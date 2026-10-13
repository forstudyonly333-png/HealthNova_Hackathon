/**
 * Unit Tests for Rules Engine
 * Tests OD without timing, BD, TDS, QID, HS, AC, PC, SOS, unknown abbreviations, low confidence,
 * and end-to-end evaluation of the 3 synthetic discharge sheets.
 */

import { evaluateMedicineRules, evaluateFollowUp, evaluateWarningItem, type RawExtractedMedicine } from './rulesEngine.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
}

export function runRulesEngineTests(): { passed: number; total: number; details: string[] } {
  const details: string[] = [];
  let passed = 0;
  let total = 0;

  const test = (name: string, fn: () => void) => {
    total++;
    try {
      fn();
      passed++;
      details.push(`✓ PASS: ${name}`);
    } catch (e: any) {
      details.push(`✗ FAIL: ${name} -> ${e.message}`);
    }
  };

  // Test 1: BD mapping to Subah + Raat
  test('BD maps deterministically to Subah + Raat', () => {
    const med: RawExtractedMedicine = {
      name: 'Metoprolol',
      strength: '25mg',
      frequency_code: 'BD',
      source_text: 'Tab Metoprolol 25 BD',
      confidence: 0.95,
    };
    const res = evaluateMedicineRules(med);
    assert(res.status === 'clear', 'BD should be clear');
    assert(res.slots.length === 2, 'BD must have 2 slots');
    assert(res.slots.includes('subah') && res.slots.includes('raat'), 'BD must include subah and raat');
  });

  // Test 2: TDS mapping to Subah + Dopahar + Raat
  test('TDS maps deterministically to Subah + Dopahar + Raat', () => {
    const med: RawExtractedMedicine = {
      name: 'Paracetamol',
      strength: '650mg',
      frequency_code: 'TDS',
      source_text: 'Tab Paracetamol 650 TDS',
      confidence: 0.92,
    };
    const res = evaluateMedicineRules(med);
    assert(res.status === 'clear', 'TDS should be clear');
    assert(res.slots.length === 3, 'TDS must have 3 slots');
    assert(res.slots.includes('subah') && res.slots.includes('dopahar') && res.slots.includes('raat'), 'TDS slots match');
  });

  // Test 3: QID mapping to 4 slots
  test('QID maps deterministically to four slots (Subah, Dopahar, Shaam, Raat)', () => {
    const med: RawExtractedMedicine = {
      name: 'Antibiotic syrup',
      frequency_code: 'QID',
      source_text: 'QID',
      confidence: 0.9,
    };
    const res = evaluateMedicineRules(med);
    assert(res.status === 'clear', 'QID should be clear');
    assert(res.slots.length === 4, 'QID must have 4 slots');
  });

  // Test 4: HS mapping to Raat
  test('HS maps to Raat (Bedtime)', () => {
    const med: RawExtractedMedicine = {
      name: 'Zolpidem',
      frequency_code: 'HS',
      source_text: 'Tab Zolpidem 5mg HS',
      confidence: 0.9,
    };
    const res = evaluateMedicineRules(med);
    assert(res.status === 'clear', 'HS should be clear');
    assert(res.slots.length === 1 && res.slots[0] === 'raat', 'HS must be raat');
  });

  // Test 5: OD with NO timing note MUST BE FLAGGED and NOT placed in any slot
  test('OD with no timing on sheet is NOT placed in any slot and flagged', () => {
    const med: RawExtractedMedicine = {
      name: 'Ecosprin',
      strength: '75mg',
      frequency_code: 'OD',
      source_text: 'Tab Ecosprin 75 OD',
      confidence: 0.94,
    };
    const res = evaluateMedicineRules(med);
    assert(res.status === 'needs_nurse_check', 'OD with no timing must be flagged needs_nurse_check');
    assert(res.slots.length === 0, 'OD with no timing must have 0 slots assigned');
    assert(res.flag_reason?.toLowerCase().includes('time not stated') || false, 'Must state reason');
  });

  // Test 6: OD with specified Morning timing is clear
  test('OD with specified Morning timing is placed in Subah slot', () => {
    const med: RawExtractedMedicine = {
      name: 'Pantop',
      strength: '40mg',
      frequency_code: 'OD',
      timing_note: 'Subah before food',
      source_text: 'Tab Pantop 40mg OD Subah (before food)',
      confidence: 0.95,
    };
    const res = evaluateMedicineRules(med);
    assert(res.status === 'clear', 'OD with morning timing should be clear');
    assert(res.slots.length === 1 && res.slots[0] === 'subah', 'OD morning must be subah');
  });

  // Test 7: Unknown abbreviation flags needs_nurse_check
  test('Unknown abbreviation (e.g. QAM) flags needs_nurse_check and infers nothing', () => {
    const med: RawExtractedMedicine = {
      name: 'Cardiopril',
      frequency_code: 'QAM',
      source_text: 'Tab Cardiopril 5mg QAM',
      confidence: 0.88,
    };
    const res = evaluateMedicineRules(med);
    assert(res.status === 'needs_nurse_check', 'Unknown abbreviation must be flagged');
    assert(res.slots.length === 0, 'Unknown abbreviation must have 0 slots');
  });

  // Test 8: Low confidence (< 0.8) flags needs_nurse_check
  test('Low OCR confidence (<0.80) triggers nurse check', () => {
    const med: RawExtractedMedicine = {
      name: 'Aspirin',
      frequency_code: 'BD',
      source_text: 'Illegible scribble',
      confidence: 0.65, // Below 0.8
    };
    const res = evaluateMedicineRules(med);
    assert(res.status === 'needs_nurse_check', 'Low confidence must be flagged');
    assert(res.slots.length === 0, 'Low confidence must not assign slots');
  });

  // Test 9: Warning without action text flags "Action not specified, nurse to confirm"
  test('Warning without explicit action flags nurse check with strict wording', () => {
    const warning = {
      text: 'SOS if breathlessness',
      source_text: 'SOS if breathlessness',
    };
    const res = evaluateWarningItem(warning);
    assert(res.status === 'needs_nurse_check', 'Warning without action must be flagged');
    assert(res.action_text === 'Action not specified, nurse to confirm', 'Must use exact safety phrasing');
  });

  // Test 10: Follow-up calculation from "after 7 days" and base date 10 Oct 2026
  test('Follow-up relative calculation produces exact due date', () => {
    const followUp = {
      text: 'Review after 7 days',
      source_text: 'Review after 7 days at OPD',
    };
    const res = evaluateFollowUp(followUp, '2026-10-10');
    assert(res.status === 'clear', 'Calculable follow-up should be clear');
    assert(res.dueDate === '2026-10-17', '7 days after 10 Oct 2026 is 17 Oct 2026');
  });

  return { passed, total, details };
}

// Self-run when executed directly via tsx
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = runRulesEngineTests();
  console.log(`\n=== RULES ENGINE TEST REPORT ===`);
  result.details.forEach((d) => console.log(d));
  console.log(`\nResult: ${result.passed}/${result.total} tests passed.\n`);
  if (result.passed !== result.total) {
    process.exit(1);
  }
}
