/**
 * i18n Loader & Fallback Engine for Going Home Right
 * Supports 28 Indian languages with strict fallback (Current -> Hindi -> English)
 * RTL support for Urdu, Kashmiri, Sindhi
 * Dynamic font loader for Indic scripts
 */

import { Language, LANGUAGES, LanguageMeta, getLanguageMeta } from './config';
import enDict from './translations/en.json';
import hiDict from './translations/hi.json';
import asDict from './translations/as.json';
import bnDict from './translations/bn.json';
import brxDict from './translations/brx.json';
import dhdDict from './translations/dhd.json';
import doiDict from './translations/doi.json';
import guDict from './translations/gu.json';
import hojDict from './translations/hoj.json';
import knDict from './translations/kn.json';
import kokDict from './translations/kok.json';
import ksDict from './translations/ks.json';
import maiDict from './translations/mai.json';
import mlDict from './translations/ml.json';
import mniDict from './translations/mni.json';
import mrDict from './translations/mr.json';
import mtrDict from './translations/mtr.json';
import mwrDict from './translations/mwr.json';
import neDict from './translations/ne.json';
import orDict from './translations/or.json';
import paDict from './translations/pa.json';
import saDict from './translations/sa.json';
import satDict from './translations/sat.json';
import sdDict from './translations/sd.json';
import swvDict from './translations/swv.json';
import taDict from './translations/ta.json';
import teDict from './translations/te.json';
import urDict from './translations/ur.json';

// In-memory cache of loaded dictionaries - fully pre-loaded for all 28 languages
export const dictionaryCache: Record<string, any> = {
  en: enDict,
  hi: hiDict,
  as: asDict,
  bn: bnDict,
  brx: brxDict,
  dhd: dhdDict,
  doi: doiDict,
  gu: guDict,
  hoj: hojDict,
  kn: knDict,
  kok: kokDict,
  ks: ksDict,
  mai: maiDict,
  ml: mlDict,
  mni: mniDict,
  mr: mrDict,
  mtr: mtrDict,
  mwr: mwrDict,
  ne: neDict,
  or: orDict,
  pa: paDict,
  sa: saDict,
  sat: satDict,
  sd: sdDict,
  swv: swvDict,
  ta: taDict,
  te: teDict,
  ur: urDict,
};

/**
 * Load dictionary on demand (instant lookup since all 28 are cached in memory)
 */
export async function loadLanguageDictionary(lang: Language): Promise<any> {
  if (dictionaryCache[lang]) {
    return dictionaryCache[lang];
  }
  return dictionaryCache['hi'] || dictionaryCache['en'];
}

/**
 * Nested key getter with fallback to Hindi, then English
 */
export function getNestedTranslation(obj: any, path: string): string | undefined {
  if (!obj) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

/**
 * Resolves a key with guaranteed fallback:
 * Selected Language -> Hindi -> English -> Fallback default
 */
export function resolveTranslation(lang: Language, keyPath: string, defaultText?: string): string {
  const currentDict = dictionaryCache[lang];
  const hiDictRef = dictionaryCache['hi'] || hiDict;
  const enDictRef = dictionaryCache['en'] || enDict;

  const currentVal = getNestedTranslation(currentDict, keyPath);
  if (currentVal) return currentVal;

  const hiVal = getNestedTranslation(hiDictRef, keyPath);
  if (hiVal) return hiVal;

  const enVal = getNestedTranslation(enDictRef, keyPath);
  if (enVal) return enVal;

  return defaultText || keyPath;
}

/**
 * Font loader: adds Google Fonts stylesheet if not already loaded
 */
export function applyLanguageFontAndDirection(lang: Language) {
  const meta = getLanguageMeta(lang);

  // Set RTL direction on HTML root
  if (typeof document !== 'undefined') {
    document.documentElement.dir = meta.dir;
    document.documentElement.lang = meta.bcp47;

    // Apply font-family style to body
    document.body.style.fontFamily = `${meta.fontFamily}, 'Plus Jakarta Sans', system-ui, sans-serif`;

    // Complex scripts line-height optical adjustment
    if (['ta', 'te', 'ml', 'kn', 'or', 'bn', 'as', 'mni', 'ur', 'ks', 'sd'].includes(lang)) {
      document.body.style.lineHeight = '1.75';
    } else {
      document.body.style.lineHeight = '1.5';
    }

    // Lazy load Google Font if needed
    if (meta.googleFont) {
      const linkId = `google-font-${lang}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${meta.googleFont}&display=swap`;
        document.head.appendChild(link);
      }
    }
  }
}

/**
 * Check if the browser currently has an installed voice for a language
 */
export function checkSpeechVoiceAvailable(bcp47: string): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }
  const voices = window.speechSynthesis.getVoices();
  const prefix = bcp47.split('-')[0].toLowerCase();
  return voices.some((v) => {
    const vLang = v.lang.toLowerCase();
    return vLang === bcp47.toLowerCase() || vLang.startsWith(prefix);
  });
}

export * from './config';
