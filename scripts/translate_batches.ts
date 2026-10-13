import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI();
const enPath = path.resolve('src/i18n/translations/en.json');
const hiPath = path.resolve('src/i18n/translations/hi.json');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const hi = JSON.parse(fs.readFileSync(hiPath, 'utf8'));

const LANGUAGES = [
  { id: 'as', name: 'Assamese', script: 'Bengali-Assamese script (অসমীয়া)' },
  { id: 'bn', name: 'Bengali', script: 'Bengali script (বাংলা)' },
  { id: 'brx', name: 'Bodo', script: 'Devanagari script (बड़ो)' },
  { id: 'doi', name: 'Dogri', script: 'Devanagari script (डोगरी)' },
  { id: 'gu', name: 'Gujarati', script: 'Gujarati script (ગુજરાતી)' },
  { id: 'kn', name: 'Kannada', script: 'Kannada script (ಕನ್ನಡ)' },
  { id: 'ks', name: 'Kashmiri', script: 'Perso-Arabic script (کٲشُر, RTL)' },
  { id: 'kok', name: 'Konkani', script: 'Devanagari script (कोंकणी)' },
  { id: 'mai', name: 'Maithili', script: 'Devanagari script (मैथिली)' },
  { id: 'ml', name: 'Malayalam', script: 'Malayalam script (മലയാളം)' },
  { id: 'mni', name: 'Manipuri', script: 'Meitei Mayek script (ꯃꯦꯅꯤꯄꯨꯔꯤ)' },
  { id: 'mr', name: 'Marathi', script: 'Devanagari script (मराठी)' },
  { id: 'ne', name: 'Nepali', script: 'Devanagari script (नेपाली)' },
  { id: 'or', name: 'Odia', script: 'Odia script (ଓଡ଼ିଆ)' },
  { id: 'pa', name: 'Punjabi', script: 'Gurmukhi script (ਪੰਜਾਬੀ)' },
  { id: 'sa', name: 'Sanskrit', script: 'Devanagari script (संस्कृतम्)' },
  { id: 'sat', name: 'Santali', script: 'Ol Chiki script (ᱥᱟᱱᱛᱟᱲᱤ)' },
  { id: 'sd', name: 'Sindhi', script: 'Perso-Arabic script (سنڌي, RTL)' },
  { id: 'ta', name: 'Tamil', script: 'Tamil script (தமிழ்)' },
  { id: 'te', name: 'Telugu', script: 'Telugu script (తెలుగు)' },
  { id: 'ur', name: 'Urdu', script: 'Perso-Arabic script (اردو, RTL)' },
  { id: 'mwr', name: 'Marwari (Rajasthani variety)', script: 'Devanagari script (मारवाड़ी)' },
  { id: 'dhd', name: 'Dhundhari (Rajasthani variety)', script: 'Devanagari script (ढूंढाड़ी)' },
  { id: 'mtr', name: 'Mewari (Rajasthani variety)', script: 'Devanagari script (मेवाड़ी)' },
  { id: 'swv', name: 'Shekhawati (Rajasthani variety)', script: 'Devanagari script (शेखावाटी)' },
  { id: 'hoj', name: 'Hadauti (Rajasthani variety)', script: 'Devanagari script (हाड़ौती)' },
];

function fillMissingKeys(source: any, target: any): any {
  if (typeof source !== 'object' || source === null) {
    return target !== undefined ? target : source;
  }
  const result: any = Array.isArray(source) ? [] : {};
  for (const k of Object.keys(source)) {
    if (target && target[k] !== undefined) {
      if (typeof source[k] === 'object' && source[k] !== null && !Array.isArray(source[k])) {
        result[k] = fillMissingKeys(source[k], target[k]);
      } else {
        result[k] = target[k];
      }
    } else {
      result[k] = source[k];
    }
  }
  return result;
}

async function translateLanguage(lang: typeof LANGUAGES[0], retryCount = 0): Promise<void> {
  const filePath = path.resolve(`src/i18n/translations/${lang.id}.json`);
  console.log(`[START] Translating ${lang.name} (${lang.id})...`);

  const prompt = `You are an expert translator specializing in Indian healthcare applications.
Translate the following English user-interface JSON for "Going Home Right" (a post-discharge care app for families) into ${lang.name} using ${lang.script}.
For Rajasthani varieties (Marwari, Dhundhari, Mewari, Shekhawati, Hadauti), use authentic local colloquial expressions in Devanagari script.
For Kashmiri and Sindhi and Urdu, use standard Perso-Arabic script.
For Santali, use Ol Chiki script.
For Manipuri, use Meitei Mayek script.

CRITICAL RULES:
1. Maintain the EXACT SAME JSON structure, object hierarchy, and key names as the source English JSON.
2. DO NOT change medicine names (e.g. Ecosprin 75 OD, Metoprolol 25 BD, Pantop 40 OD, Amoxicillin 500, Paracetamol 650), dosages, abbreviations (BD, OD, TDS, QID, HS, AC, PC, SOS), helpline numbers (108, 112, +91 73740 29569), or times (08:00 AM - 10:00 AM).
3. Ensure natural, clear, patient-friendly phrasing in ${lang.name}.
4. Return ONLY a single raw valid JSON object. No Markdown code fences, no explanations, no prefix or suffix.

Source JSON:
${JSON.stringify(en, null, 2)}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text?.trim() || '';
    const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleaned);

    // Ensure all keys from 'en' are present
    const completed = fillMissingKeys(en, parsed);

    fs.writeFileSync(filePath, JSON.stringify(completed, null, 2), 'utf8');
    console.log(`[SUCCESS] Wrote complete translation for ${lang.name} (${lang.id})`);
  } catch (err: any) {
    console.error(`[ERROR] Failed for ${lang.name} (${lang.id}):`, err?.message || err);
    if (retryCount < 2) {
      console.log(`[RETRY] Retrying ${lang.name} in 3 seconds...`);
      await new Promise((r) => setTimeout(r, 3000));
      return translateLanguage(lang, retryCount + 1);
    }
  }
}

async function main() {
  const specificLang = process.argv[2];
  let targets = LANGUAGES;
  if (specificLang) {
    targets = LANGUAGES.filter((l) => l.id === specificLang);
  }

  console.log(`Total target languages to process: ${targets.length}`);

  // Process in batches of 4 to stay within limits and avoid timeouts
  const BATCH_SIZE = 4;
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    console.log(`\n=== Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(targets.length / BATCH_SIZE)}: ${batch.map(b => b.id).join(', ')} ===`);
    await Promise.all(batch.map((l) => translateLanguage(l)));
    if (i + BATCH_SIZE < targets.length) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log('\nAll language translations generated successfully!');
}

main().catch(console.error);
