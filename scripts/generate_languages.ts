/**
 * Script to generate high-quality translation dictionaries for all 28 Indian languages.
 * Strict rules:
 * - Same keys across all files
 * - Placeholders, numbers, doses, and medicine names strictly preserved
 * - Simple everyday words, zero invented medical jargon
 * - Rajasthani varieties (Marwari, Dhundhari, Mewari, Shekhawati, Hadauti) use simple Hindi-adjacent vocabulary
 */

import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve(process.cwd(), 'src', 'i18n', 'translations');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

import { en } from './baseEnglish';
export { en };

// Hindi verified dictionary
export const hi = {
  appName: 'गोइंग होम राइट',
  tagline: 'टीम हेल्थनोवा · अस्पताल डिस्चार्ज दैनिक देखभाल योजना और सुरक्षा सत्यापन',
  nav: {
    home: 'होम',
    upload: 'अपलोड',
    review: 'समीक्षा',
    myPlan: 'मेरी योजना',
    nurseSignoff: 'नर्स सत्यापन',
    analytics: 'एनालिटिक्स',
    doctors: 'डॉक्टर्स',
    solutions: 'समाधान',
    contact: 'संपर्क करें',
    about: 'हमारे बारे में',
    joinUs: 'जुड़ें',
  },
  safetyBanner: 'यह योजना आपके डिस्चार्ज पर्चे पर आधारित है। यह आपके डॉक्टर की सलाह का स्थान नहीं लेती है।',
  machineTranslatedNotice: 'यह भाषा मशीन-अनुवादित है और इसमें त्रुटियाँ हो सकती हैं। कृपया अपनी नर्स से पुष्टि करें।',
  translateTextBtn: 'इस पाठ का अनुवाद करें',
  translating: 'अनुवाद हो रहा है...',
  machineTranslationDisclaimer: 'मशीनी अनुवाद, अपनी नर्स या डॉक्टर से पुष्टि करें',
  hero: {
    badge: 'हेल्थकेयर : बेहतर कल के लिए जीवन रेखा',
    title1: 'आपका स्वास्थ्य,',
    title2: 'हमारी सर्वोच्च प्राथमिकता',
    desc: 'अस्पताल के डिस्चार्ज पर्चे को परिवार के देखभालकर्ता के लिए सरल, स्पष्ट भाषा में दैनिक दवा समय-सारणी में बदलता है। एआई पढ़ता है, नियम तय करते हैं, जो छूटा है उसे फ्लैग किया जाता है।',
    quote: '"पहला सुख निरोगी काया — सकारात्मक रहें।"',
    btnUpload: 'डिस्चार्ज पर्चा अपलोड करें',
    btnCallHelpdesk: 'हेल्पडेस्क पर कॉल करें',
    btnMailUs: 'ईमेल करें',
    card1Title: 'स्व-देखभाल',
    card1Caption: 'स्पष्ट दैनिक योजना',
    card2Title: 'हमारा समुदाय',
    card2Caption: 'नर्स द्वारा सत्यापित',
    card3Title: 'हमारे प्रशिक्षक',
    card3Caption: 'सुरक्षा सर्वोपरि',
    trustStrip: '24/7 सहायता · लाइसेंस प्राप्त मेडिकल टीम · गोपनीय सेवा · आभा / एफएचआईआर मानक',
  },
  upload: {
    title: 'डिस्चार्ज पर्चा अपलोड करें',
    subtitle: 'अस्पताल के डिस्चार्ज पर्चे की स्पष्ट फोटो, पीडीएफ या स्कैन अपलोड करें।',
    dropzoneTitle: 'डिस्चार्ज फोटो या पीडीएफ यहाँ खींचें और छोड़ें',
    dropzoneDesc: 'JPG, PNG, WebP, PDF 15MB तक। न्यूनतम 400x400 पिक्सेल गुणवत्ता।',
    browseBtn: 'डिवाइस से फाइल चुनें',
    trySampleTitle: 'या एक डेमो अस्पताल डिस्चार्ज पर्चा आज़माएँ:',
    sample1Btn: 'सैंपल 1: कार्डियोलॉजी पर्चा (एम्स)',
    sample1Desc: 'इकोस्प्रिन 75 ओडी (समय नहीं लिखा) + मेटोप्रोलॉल 25 बीडी + 7 दिन बाद समीक्षा + सांस फूलने पर एसओएस',
    sample2Btn: 'सैंपल 2: स्पष्ट पर्चा (मैक्स अस्पताल)',
    sample2Desc: 'पैंटॉप 40 ओडी सुबह + अमोक्सिसिलिन 500 बीडी + पैरासिटामोल 650 टीडीएस स्पष्ट समय के साथ',
    sample3Btn: 'सैंपल 3: अस्पष्ट पर्चा जिसमें अज्ञात कोड हैं',
    sample3Desc: 'गैर-मानक लैटिन संक्षिप्त नाम (QAM, QOD) जो नर्स समीक्षा के लिए फ्लैग किए गए हैं',
    qualityChecking: 'फोटो की स्पष्टता और पठनीयता जांची जा रही है...',
    processingDoc: 'दवाइयों की पहचान और क्लिनिकल सुरक्षा नियमों का मूल्यांकन किया जा रहा है...',
    rescanNotice: 'कृपया दोबारा स्कैन करें — सुरक्षित दवा पहचान के लिए फोटो का रिज़ॉल्यूशन बहुत कम या धुंधला है।',
  },
  review: {
    title: 'डिस्चार्ज पर्चे की समीक्षा',
    subtitle: 'पर्चे पर लिखे मूल पाठ की तुलना आसान भाषा में बनी दैनिक योजना से करें।',
    badgeClear: 'स्पष्ट',
    badgeNeedsCheck: 'नर्स जांच आवश्यक',
    badgeApproved: 'नर्स द्वारा स्वीकृत',
    sourceLineLabel: 'पर्चे की मूल पंक्ति:',
    decodedMeaningLabel: 'स्पष्ट दैनिक अर्थ:',
    slotsLabel: 'निर्धारित दैनिक समय (स्लॉट):',
    confidenceLabel: 'ओसीआर विश्वसनीयता:',
    followupHeader: 'फॉलो-अप परामर्श की समय-सीमा',
    warningsHeader: 'चेतावनी लक्षण और आपातकालीन निर्देश',
  },
  myPlan: {
    title: 'परिवार की दैनिक देखभाल योजना',
    subtitle: 'दवा देने वाले परिजन के लिए आसान समय-सारणी। दवा देने के बाद टिक करें।',
    subah: 'सुबह',
    subahTime: '08:00 AM - 10:00 AM',
    dopahar: 'दोपहर',
    dopaharTime: '01:00 PM - 02:30 PM',
    raat: 'रात',
    raatTime: '08:00 PM - 09:30 PM',
    shaam: 'शाम',
    shaamTime: '05:00 PM - 06:30 PM',
    given: 'दी गई',
    markGiven: 'दी गई के रूप में दर्ज करें',
    listenPlan: 'दैनिक योजना सुनें (ऑडियो)',
    audioNotAvailable: 'आपके डिवाइस पर इस भाषा में ऑडियो उपलब्ध नहीं है',
    whatsappShare: 'व्हाट्सएप पर रिमाइंडर भेजें',
    waitingForNurseTitle: 'नर्स की स्वीकृति की प्रतीक्षा में',
    waitingForNurseDesc: 'इन दवाइयों का समय पर्चे पर स्पष्ट नहीं था। जब तक नर्स पुष्टि नहीं करती, इन्हें शेड्यूल में शामिल नहीं किया जाएगा।',
    followupTitle: 'अस्पताल फॉलो-अप अपॉइंटमेंट',
    addToCalendar: 'कैलेंडर में जोड़ें (.ics)',
    markAttended: 'संपन्न दर्ज करें',
    callDoctorIfTitle: 'डॉक्टर को तुरंत कॉल करें यदि...',
    callDoctorActionUnspecified: 'कार्रवाई निर्दिष्ट नहीं है, नर्स से पुष्टि की जाएगी',
    noMedicinesInSlot: 'इस समय के लिए कोई दवा निर्धारित नहीं है।',
  },
  nurse: {
    title: 'नर्स सत्यापन और स्वीकृति कतार',
    subtitle: 'क्लिनिकल समीक्षा स्टेशन। परिवार की योजना को अंतिम रूप देने से पहले प्रत्येक फ्लैग की जांच की जाती है।',
    queueEmpty: 'सभी लंबित डिस्चार्ज मदों की समीक्षा और स्वीकृति पूर्ण हो चुकी है!',
    editModalTitle: 'दवा का समय और खुराक संपादित करें',
    approveBtn: 'स्वीकृत करें और परिवार को भेजें',
    editBtn: 'समय / स्लॉट संपादित करें',
    auditTrailTitle: 'ऑडिट लॉग (परिवर्तन इतिहास)',
    notesPlaceholder: 'नर्स सत्यापन टिप्पणी या डॉक्टर से बातचीत का विवरण दर्ज करें...',
    patientPreferredLangLabel: 'मरीज की पसंदीदा भाषा:',
  },
  analytics: {
    title: 'अस्पताल डिस्चार्ज सुरक्षा एनालिटिक्स',
    subtitle: 'गुणवत्ता आश्वासन मेट्रिक्स: नियम फ्लैग, नर्स समीक्षा गति और परिवार की दवा अनुपालन दर।',
    hospitalName: 'अस्पताल सुरक्षा डैशबोर्ड',
    flagShare: 'नियमों द्वारा फ्लैग किए गए आइटम',
    awaitingNurse: 'नर्स स्वीकृति की प्रतीक्षा में',
    dosesAdherence: 'दवा अनुपालन दर (Adherence)',
    followupsDue: 'फॉलो-अप पूरे बनाम शेष',
    safetyHeadline: 'क्लिनिकल सिद्धांत: एआई पढ़ता है, नियम तय करते हैं, जो छूटा है उसे फ्लैग किया जाता है।',
  },
  safetyBox: {
    title: 'अपनी देखभाल योजना के बारे में कोई प्रश्न है?',
    placeholder: 'दवा के समय या डिस्चार्ज निर्देशों के बारे में पूछें...',
    askBtn: 'सहायता पूछें',
    refusalNotice: 'सूचना: हम बीमारी का निदान नहीं कर सकते, नई दवा नहीं बता सकते और खुराक नहीं बदल सकते। चिकित्सीय फैसलों के लिए हमेशा डॉक्टर से संपर्क करें।',
    fixedRefusal: 'यह दैनिक देखभाल योजना आपके डिस्चार्ज पर्चे पर आधारित है। यह आपके डॉक्टर की सलाह का स्थान नहीं लेती है। हम किसी बीमारी का निदान नहीं कर सकते, नई दवाइयाँ नहीं सुझा सकते और न ही आपकी खुराक बदल सकते हैं। कृपया अपने संबंधित डॉक्टर से संपर्क करें या अस्पताल के हेल्पलाइन पर कॉल करें।',
  },
  vocabulary: {
    odMorning: 'दिन में एक बार सुबह',
    odAfternoon: 'दिन में एक बार दोपहर',
    odNight: 'दिन में एक बार रात',
    odUnspecified: 'पर्चे पर समय नहीं लिखा — नर्स से स्लॉट की पुष्टि आवश्यक',
    bd: 'दिन में दो बार (सुबह + रात)',
    tds: 'दिन में तीन बार (सुबह + दोपहर + रात)',
    qid: 'दिन में चार बार (सुबह + दोपहर + शाम + रात)',
    hs: 'सोने से पहले (रात)',
    ac: 'भोजन से पहले',
    pc: 'भोजन के बाद',
    sos: 'ज़रूरत पड़ने पर (केवल आपात स्थिति/तकलीफ होने पर)',
    statusClear: 'स्पष्ट',
    statusNeedsCheck: 'नर्स जांच आवश्यक',
    statusApproved: 'नर्स द्वारा स्वीकृत',
  },
};

// Specialized translations for all 26 additional languages
// Custom curated dictionaries matching the exact structure of `en`
import { customLanguageMap } from './customLanguages';

export function generateAllLanguages() {
  // Write en & hi
  fs.writeFileSync(path.join(OUT_DIR, 'en.json'), JSON.stringify(en, null, 2), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'hi.json'), JSON.stringify(hi, null, 2), 'utf8');

  // Write all 26 other languages
  for (const [code, trans] of Object.entries(customLanguageMap)) {
    fs.writeFileSync(path.join(OUT_DIR, `${code}.json`), JSON.stringify(trans, null, 2), 'utf8');
  }

  console.log('Successfully generated 28 language translation files in', OUT_DIR);
}

generateAllLanguages();
