/**
 * Central i18n Bridge for Going Home Right
 * Re-exports language metadata, configurations, loaders, and fallback dictionary proxy.
 */

import { Language, LANGUAGES, LanguageMeta, getLanguageMeta } from './i18n/config';
import { 
  loadLanguageDictionary, 
  applyLanguageFontAndDirection, 
  checkSpeechVoiceAvailable, 
  resolveTranslation,
  dictionaryCache
} from './i18n/index';

import enDict from './i18n/translations/en.json';
import hiDict from './i18n/translations/hi.json';
import { uiExtensionsByLang } from './i18n/uiExtensions';

export type { Language, LanguageMeta };
export { 
  LANGUAGES, 
  getLanguageMeta, 
  loadLanguageDictionary, 
  applyLanguageFontAndDirection, 
  checkSpeechVoiceAvailable, 
  resolveTranslation,
  dictionaryCache
};

export interface Translations {
  appName: string;
  tagline: string;
  nav: {
    home: string;
    upload: string;
    review: string;
    myPlan: string;
    nurseSignoff: string;
    analytics: string;
    doctors: string;
    solutions: string;
    contact: string;
    about: string;
    joinUs: string;
  };
  safetyBanner: string;
  machineTranslatedNotice?: string;
  translateTextBtn?: string;
  translating?: string;
  machineTranslationDisclaimer?: string;
  hero: {
    badge: string;
    title1: string;
    title2: string;
    desc: string;
    quote: string;
    btnUpload: string;
    btnCallHelpdesk: string;
    btnMailUs: string;
    card1Title: string;
    card1Caption: string;
    card2Title: string;
    card2Caption: string;
    card3Title: string;
    card3Caption: string;
    trustStrip: string;
  };
  upload: {
    title: string;
    subtitle: string;
    dropzoneTitle: string;
    dropzoneDesc: string;
    browseBtn: string;
    trySampleTitle: string;
    sample1Btn: string;
    sample1Desc: string;
    sample2Btn: string;
    sample2Desc: string;
    sample3Btn: string;
    sample3Desc: string;
    qualityChecking: string;
    processingDoc: string;
    rescanNotice: string;
  };
  review: {
    title: string;
    subtitle: string;
    badgeClear: string;
    badgeNeedsCheck: string;
    badgeApproved: string;
    sourceLineLabel: string;
    decodedMeaningLabel: string;
    slotsLabel: string;
    confidenceLabel: string;
    followupHeader: string;
    warningsHeader: string;
    noSheetLoaded?: string;
    noSheetDesc?: string;
    dischargeDateLabel?: string;
    decodedMedsHeader?: string;
    tapToHighlight?: string;
    sourceVerified?: string;
    noFollowupDetected?: string;
    noWarningsDetected?: string;
  };
  myPlan: {
    title: string;
    subtitle: string;
    subah: string;
    subahTime: string;
    dopahar: string;
    dopaharTime: string;
    raat: string;
    raatTime: string;
    shaam: string;
    shaamTime: string;
    given: string;
    markGiven: string;
    listenPlan: string;
    audioNotAvailable?: string;
    whatsappShare: string;
    waitingForNurseTitle: string;
    waitingForNurseDesc: string;
    followupTitle: string;
    addToCalendar: string;
    markAttended: string;
    callDoctorIfTitle: string;
    callDoctorActionUnspecified: string;
    noMedicinesInSlot: string;
  };
  nurse: {
    title: string;
    subtitle: string;
    queueEmpty: string;
    editModalTitle: string;
    approveBtn: string;
    editBtn: string;
    auditTrailTitle: string;
    notesPlaceholder: string;
    patientPreferredLangLabel?: string;
  };
  analytics: {
    title: string;
    subtitle: string;
    hospitalName: string;
    flagShare: string;
    awaitingNurse: string;
    dosesAdherence: string;
    followupsDue: string;
    safetyHeadline: string;
  };
  safetyBox: {
    title: string;
    placeholder: string;
    askBtn: string;
    refusalNotice: string;
    fixedRefusal?: string;
  };
  askWhatsApp?: {
    floatingBtn: string;
    askAboutMedicine: string;
    askAboutFollowup: string;
    askDoctorIf: string;
    modalTitle: string;
    modalSubtitle: string;
    emergencyBanner: string;
    urgentWarning: string;
    call108: string;
    call112: string;
    categories: {
      medicine: string;
      missed: string;
      sideEffect: string;
      followup: string;
      report: string;
      other: string;
    };
    messageLabel: string;
    placeholder: string;
    voiceBtn: string;
    listening: string;
    includeMedsLabel: string;
    includeMedsHelp: string;
    includeNameLabel: string;
    includeNameHelp: string;
    saveCopyLabel: string;
    saveCopyHelp: string;
    previewTitle: string;
    openWhatsAppBtn: string;
    callReceptionBtn: string;
    mailUsBtn: string;
    copyMessageBtn: string;
    copied: string;
    offlineNotice: string;
    outsideHoursNotice: string;
    officeHours: string;
  };
  vocabulary?: Record<string, string>;
  doctors?: {
    title: string;
    badge: string;
    subtitle: string;
    searchPlaceholder: string;
    searchBtn: string;
    clearBtn: string;
    showingResults: string;
    consultBtn: string;
    experience: string;
    qualifications: string;
    hospitalAffiliation: string;
    patientsTreated: string;
    bookConsultation: string;
    consultationFee: string;
    specialty?: string;
  };
  connect?: {
    title: string;
    badge: string;
    subtitle: string;
    formTitle: string;
    fullName: string;
    fullNamePlaceholder: string;
    mobile: string;
    mobilePlaceholder: string;
    address: string;
    addressPlaceholder: string;
    healthConcern: string;
    healthConcernPlaceholder: string;
    query: string;
    queryPlaceholder: string;
    attachSummary: string;
    chooseFile: string;
    removeFile: string;
    sendBtn: string;
    videoBtn: string;
    hotlineTitle: string;
    hotlineDesc: string;
    ambulanceTitle: string;
    ambulanceDesc: string;
    hoursTitle: string;
    hoursDesc: string;
  };
  aboutSection?: {
    badge: string;
    principleHeadline: string;
    principleBody1: string;
    principleBody2: string;
    pillar1Title: string;
    pillar1Desc: string;
    pillar2Title: string;
    pillar2Desc: string;
    shieldTitle: string;
    shieldDesc: string;
    shieldBadge: string;
    teamTitle: string;
    teamDesc: string;
  };
  solutionsSection?: {
    badge: string;
    title: string;
    subtitle: string;
    step1Title: string;
    step1Desc: string;
    step1Btn: string;
    step2Title: string;
    step2Desc: string;
    step2Btn: string;
    step3Title: string;
    step3Desc: string;
    step3Btn: string;
    step4Title: string;
    step4Desc: string;
    step4Btn: string;
  };
  demoMode?: {
    bannerNotice: string;
    bannerBadge: string;
    evalAccess: string;
    chooseRole: string;
    roleDesc: string;
    familyTitle: string;
    familyRole: string;
    familyDesc: string;
    familyBtn: string;
    nurseTitle: string;
    nurseRole: string;
    nurseDesc: string;
    nurseBtn: string;
    adminTitle: string;
    adminRole: string;
    adminDesc: string;
    adminBtn: string;
  };
  portalSwitcher?: {
    hospitalPortalTitle: string;
    patientPortalTitle: string;
    dualAccess: string;
    loggedIn: string;
    idLabel: string;
    subtitle: string;
    btnHospital: string;
    btnPatient: string;
    btnSignIn: string;
    btnLogout: string;
    prescribeTab?: string;
    credentialsTab?: string;
    settingsTab?: string;
    remindersTab?: string;
  };
  patientChecklist?: {
    listenInstructions: string;
    stopAudio: string;
    printSchedule: string;
    tabAll: string;
    tabMeds: string;
    tabDiet: string;
    adherenceTitle: string;
    dosesTakenOf: string;
    progressGood: string;
    progressHalf: string;
    progressStart: string;
    allDosesDone: string;
    morningTab: string;
    afternoonTab: string;
    eveningTab: string;
    nightTab: string;
    pendingTab: string;
    noPendingSlot: string;
    noPendingDesc: string;
    doctorNotesBadge: string;
    takeInstruction: string;
    markTaken: string;
    doseTaken: string;
    takenAt: string;
    verifiedRecord?: string;
    verifiedRecordDesc?: string;
    nurseVerified?: string;
    markDoseStatus?: string;
    prescribedBy?: string;
    portalBadge?: string;
    dischargeDate?: string;
    dailyRecoveryPlan?: string;
    patientAccessIdLabel?: string;
    verifiedBy?: string;
    helpdesk247?: string;
    callHelpdesk?: string;
    highPriorityBadge?: string;
    mealsEaten?: string;
    addOnsTaken?: string;
    measuresConfirmed?: string;
    mealTaken?: string;
    markMealTaken?: string;
    addonTaken?: string;
    markAddonTaken?: string;
    measureFollowed?: string;
    markMeasureFollowed?: string;
    hospitalDietPlan?: string;
    dietSubtitle?: string;
    dailyCalories?: string;
    fluidCap?: string;
    dieticianGuidance?: string;
    dailyMealsTitle?: string;
    dailyMealsDesc?: string;
    addMealBtn?: string;
    addMealModalTitle?: string;
    saveMealBtn?: string;
    cancel?: string;
    eatenToday?: string;
    recommendedFoods?: string;
    instructionsLabel?: string;
    markedEatenUndo?: string;
    markEaten?: string;
    dietaryAddonsTitle?: string;
    dietaryAddonsDesc?: string;
    addAddonBtn?: string;
    hospitalRecommended?: string;
    therapeuticBenefit?: string;
    addonTakenUndo?: string;
    criticalMeasuresTitle?: string;
    criticalMeasuresDesc?: string;
    addMeasureBtn?: string;
    measureWord?: string;
    confirmMeasure?: string;
    dueDate?: string;
    noFollowupDesc?: string;
    sosNotice?: string;
    loadingPlan?: string;
    loadingPlanDesc?: string;
    notFoundTitle?: string;
    notFoundDesc?: string;
  };
  hospitalPortal?: Record<string, string>;
  loginPage?: Record<string, string>;
  nursePage?: Record<string, string>;
  footer?: {
    carePortalTitle: string;
    specsTitle: string;
    hotlineTitle: string;
    allRights: string;
    emergencyCall: string;
    addressNationwide: string;
    hotline247: string;
  };
  modals?: {
    callTitle: string;
    callSubtitle: string;
    mailTitle: string;
    mailSubtitle: string;
    joinTitle: string;
    joinSubtitle: string;
    requestCallback: string;
    yourName: string;
    yourEmail: string;
    yourPhone: string;
    subject: string;
    message: string;
    close: string;
    submit: string;
    send: string;
  };
}

// Fallback UI extensions for English
const enUIExtension = {
  doctors: {
    title: 'Our Doctors',
    badge: 'Our Medical Experts',
    subtitle: 'Consult experienced medical specialists and physiotherapy experts dedicated to your personalized healing and wellbeing.',
    searchPlaceholder: 'Search by doctor name, specialty, or qualification...',
    searchBtn: 'Search',
    clearBtn: 'Clear',
    showingResults: 'Showing {n} results',
    consultBtn: 'Consultation',
    experience: 'Experience',
    qualifications: 'Qualifications',
    hospitalAffiliation: 'Hospital Affiliation',
    patientsTreated: 'Patients Treated',
    bookConsultation: 'Book Consultation',
    consultationFee: 'Consultation Fee',
    specialty: 'Specialization',
  },
  connect: {
    title: 'Connect with Our Care Specialists',
    badge: 'Clinical Helpdesk & Direct Contact',
    subtitle: 'We are here to assist with any questions about medicines, doctor visits, and discharge recovery.',
    formTitle: 'Send a Direct Health Inquiry',
    fullName: 'Full Name',
    fullNamePlaceholder: 'e.g. Ramesh Kumar',
    mobile: 'Mobile Number',
    mobilePlaceholder: 'e.g. +91 73740 29569',
    address: 'Your Residential Address',
    addressPlaceholder: 'City, State or PIN code',
    healthConcern: 'Health Concern / Department',
    healthConcernPlaceholder: 'e.g. Post-discharge cardiac recovery, BP fluctuation...',
    query: 'Your Specific Question or Medical History',
    queryPlaceholder: 'Provide details of current symptoms, dose doubts, or recovery timeline...',
    attachSummary: 'Attach Prescription or Discharge Summary (Optional)',
    chooseFile: 'Choose file',
    removeFile: 'Remove',
    sendBtn: 'Send Message',
    videoBtn: 'Request Video Consultation',
    hotlineTitle: 'Direct Helpdesk Hotline',
    hotlineDesc: 'Available 24/7 for urgent medication and follow-up doubts.',
    ambulanceTitle: 'Emergency Ambulance & SOS',
    ambulanceDesc: 'For acute chest pain, severe breathlessness, or collapse.',
    hoursTitle: 'OPD & Nursing Ward Hours',
    hoursDesc: 'Mon - Sat: 8:00 AM - 8:00 PM · Emergency: 24 Hours Open',
  },
  aboutSection: {
    badge: 'Team HealthNova · Going Home Right',
    principleHeadline: 'Principle: AI reads, rules decide, missing means flagged.',
    principleBody1: 'When a patient returns home after discharge, ambiguous medical abbreviations (OD, BD, TDS, SOS) cause dangerous medication errors for family caregivers. Going Home Right bridges this high-risk transition.',
    principleBody2: 'Our deterministic safety engine strictly forbids inferring times, doses, or follow-up dates. If the doctor wrote OD without specifying Morning or Night, the drug is never automatically scheduled — it is routed to the nurse sign-off queue.',
    pillar1Title: 'Zero Guessed Doses',
    pillar1Desc: 'Strict dictionary validation; missing information triggers clinical alerts.',
    pillar2Title: 'ABDM & Privacy First',
    pillar2Desc: 'Encrypted patient data at rest and FHIR-style bundle export format.',
    shieldTitle: 'The HealthNova Care Shield',
    shieldDesc: 'Representing Patient Safety, Clinical Verification, Caregiver Clarity, and Continuous Telehealth Follow-up.',
    shieldBadge: 'ABDM Ready · FHIR Document Specification',
    teamTitle: 'Our Medical & Care Governance Team',
    teamDesc: 'Experienced clinicians, nursing supervisors, and healthcare engineers ensuring patient safety across India.',
  },
  solutionsSection: {
    badge: 'Care Pathway & Flow',
    title: 'The 4-Step Patient Safety Flow',
    subtitle: 'Turning complex discharge papers into unmistakable family routines. Built by Team HealthNova.',
    step1Title: '1. Upload Discharge Summary',
    step1Desc: 'Upload a smartphone photo, PDF, or scan of the printed discharge summary. Image quality is checked immediately.',
    step1Btn: 'Try Ingestion Flow',
    step2Title: '2. AI Reads, Rules Decide',
    step2Desc: 'Pure deterministic clinical rules engine. BD maps to Morning + Night. OD with no time stated is flagged, never guessed.',
    step2Btn: 'View Safety Rules',
    step3Title: '3. Clinical Nurse Sign-off',
    step3Desc: 'Every flagged item is reviewed in the nurse verification queue. Only approved items enter the family schedule.',
    step3Btn: 'Open Nurse Queue',
    step4Title: '4. Plain-Language Family Plan',
    step4Desc: 'Subah, Dopahar, Raat daily schedule with Indic voice read-out, WhatsApp reminders, and .ics calendar sync.',
    step4Btn: 'View Daily Plan',
  },
  demoMode: {
    bannerNotice: 'Demo with synthetic data. Do not enter real patient information.',
    bannerBadge: 'Zero Login Required',
    evalAccess: 'Instant Hackathon Evaluation Access',
    chooseRole: 'Choose a Role to Explore the End-to-End System',
    roleDesc: 'Click any role below to sign in instantly with seeded synthetic medical data. No password or sign-up needed.',
    familyTitle: 'Try as Family',
    familyRole: 'Patient & Family',
    familyDesc: "Follow patient Sita Devi's daily medicine schedule (Subah/Dopahar/Raat), log doses, review dietary rules, and test emergency SOS.",
    familyBtn: 'Enter Patient View',
    nurseTitle: 'Try as Nurse',
    nurseRole: 'Clinical Verification',
    nurseDesc: 'Sister Priya Sharma, RN: Clinical safety gatekeeper. Resolve amber "Needs nurse check" flags on Ecosprin, confirm morning timing, and approve.',
    nurseBtn: 'Enter Nurse Queue',
    adminTitle: 'Try as Hospital Admin',
    adminRole: 'Hospital Admin',
    adminDesc: 'Dr. V. Raman: Configure verified reception desk contacts, inspect FHIR records, verify WhatsApp desk, and access the "Reset Demo Data" button.',
    adminBtn: 'Enter Admin Portal',
  },
  portalSwitcher: {
    hospitalPortalTitle: 'Hospital Medical Portal',
    patientPortalTitle: 'Patient Care Portal',
    dualAccess: 'Dual Access Security',
    loggedIn: 'Logged in',
    idLabel: 'ID',
    subtitle: 'Hospital staff upload doctor prescriptions and issue patient access IDs; patients follow their verified daily medicine checklists.',
    btnHospital: '🏥 Hospital Staff Portal',
    btnPatient: '💊 Patient Medicine Checklist',
    btnSignIn: 'Sign In / Login',
    btnLogout: 'Log Out',
    prescribeTab: 'Upload & Prescribe Medicine Checklist',
    credentialsTab: 'Issued Patient Access IDs',
    settingsTab: 'Hospital Settings',
    remindersTab: 'Zero-App WhatsApp Reminders',
  },
  patientChecklist: {
    listenInstructions: 'Listen Instructions',
    stopAudio: 'Stop Audio',
    printSchedule: 'Print Schedule & Diet',
    tabAll: '📋 All-in-One Recovery View',
    tabMeds: '💊 Prescribed Medicines',
    tabDiet: '🥗 Hospital Diet Plan, Add-Ons & Measures',
    adherenceTitle: "Today's Prescribed Medicine Adherence",
    dosesTakenOf: 'Doses Taken',
    progressGood: 'Outstanding! All prescribed medicines have been taken for today.',
    progressHalf: 'Great progress! Continue following the doctor schedule for your evening and night doses.',
    progressStart: 'Please take your scheduled medicines according to the doctor timings below.',
    allDosesDone: 'All doses taken',
    morningTab: 'Morning · 8 AM',
    afternoonTab: 'Afternoon · 1 PM',
    eveningTab: 'Evening · 5 PM',
    nightTab: 'Night · 9 PM',
    pendingTab: 'Pending Doses Only',
    noPendingSlot: 'No Pending Medicines in this Time Slot',
    noPendingDesc: 'All doses in this section have been marked taken or none were prescribed for this slot.',
    doctorNotesBadge: "Doctor's Special Care Note:",
    takeInstruction: 'Take',
    markTaken: 'Mark Given',
    doseTaken: 'Given',
    takenAt: 'Taken at',
    verifiedRecord: 'Verified Hospital Record:',
    verifiedRecordDesc: 'Doctor notes, exact dosage times, clinical diet plan, and care precautions are synchronized.',
    nurseVerified: 'Nurse Verified',
    markDoseStatus: 'Mark Dose Status for Today:',
    prescribedBy: 'Prescribed by',
    portalBadge: 'Official Hospital Recovery Portal',
    dischargeDate: 'Discharge Date:',
    dailyRecoveryPlan: 'Daily Recovery Plan',
    patientAccessIdLabel: 'Hospital Patient Access ID',
    verifiedBy: 'Verified by',
    helpdesk247: '24x7 Helpdesk',
    callHelpdesk: 'Call',
    highPriorityBadge: 'High Priority',
    mealsEaten: 'Meals Eaten Today',
    addOnsTaken: 'Clinical Add-Ons Taken',
    measuresConfirmed: 'Care Measures Confirmed',
    mealTaken: '✓ Meal Consumed',
    markMealTaken: 'Mark Meal as Eaten',
    addonTaken: '✓ Add-On Taken Today',
    markAddonTaken: 'Confirm Add-On Taken',
    measureFollowed: '✓ Measure Followed Today',
    markMeasureFollowed: 'Confirm Following Measure',
  },
  footer: {
    carePortalTitle: 'Care Portal',
    specsTitle: 'Clinical Specs & API',
    hotlineTitle: 'Contact Emergency Helpdesk',
    allRights: 'All rights reserved. Designed with clinical safety principles.',
    emergencyCall: 'Emergency Helpline',
    addressNationwide: 'New Delhi, India · Available Nationwide',
    hotline247: '24/7 Care Coordination Hotline',
  },
  modals: {
    callTitle: 'HealthCare Direct Call',
    callSubtitle: '24/7 Telephone & Callback Support',
    mailTitle: 'Send Us an Email',
    mailSubtitle: 'Direct Patient Care & Ingestion Inquiries',
    joinTitle: 'Join Our Healthcare Network',
    joinSubtitle: 'Empowering Caregivers, Hospitals & Volunteers',
    requestCallback: 'Request a Quick Callback',
    yourName: 'Your Name',
    yourEmail: 'Your Email',
    yourPhone: 'Phone Number',
    subject: 'Subject',
    message: 'Message',
    close: 'Close',
    submit: 'Submit',
    send: 'Send Email',
  },
};

// Fallback UI extensions for Hindi
const hiUIExtension = {
  doctors: {
    title: 'हमारे डॉक्टर्स',
    badge: 'हमारे चिकित्सा विशेषज्ञ',
    subtitle: 'आपके व्यक्तिगत स्वास्थ्य और उपचार के लिए समर्पित अनुभवी विशेषज्ञ चिकित्सकों और फिजियोथेरेपिस्ट से परामर्श लें।',
    searchPlaceholder: 'डॉक्टर का नाम, विशेषता या योग्यता से खोजें...',
    searchBtn: 'खोजें',
    clearBtn: 'हटाएं',
    showingResults: '{n} परिणाम दिखाए जा रहे हैं',
    consultBtn: 'परामर्श',
    experience: 'अनुभव',
    qualifications: 'योग्यताएं',
    hospitalAffiliation: 'अस्पताल संबंध',
    patientsTreated: 'मरीजों का उपचार',
    bookConsultation: 'परामर्श बुक करें',
    consultationFee: 'परामर्श शुल्क',
    specialty: 'विशेषज्ञता',
  },
  connect: {
    title: 'हमारे देखभाल विशेषज्ञों से संपर्क करें',
    badge: 'क्लिनिकल हेल्पडेस्क और सीधा संपर्क',
    subtitle: 'दवाइयों, डॉक्टर के अपॉइंटमेंट और डिस्चार्ज के बाद देखभाल से जुड़े किसी भी सवाल के लिए हम उपस्थित हैं।',
    formTitle: 'सीधा स्वास्थ्य प्रश्न भेजें',
    fullName: 'पूरा नाम',
    fullNamePlaceholder: 'उदा. रमेश कुमार',
    mobile: 'मोबाइल नंबर',
    mobilePlaceholder: 'उदा. +91 73740 29569',
    address: 'घर का पता',
    addressPlaceholder: 'शहर, राज्य या पिन कोड',
    healthConcern: 'स्वास्थ्य समस्या / विभाग',
    healthConcernPlaceholder: 'उदा. डिस्चार्ज के बाद कार्डियक देखभाल, बीपी...',
    query: 'आपका विशेष सवाल या मेडिकल विवरण',
    queryPlaceholder: 'मौजूदा लक्षण, दवा के समय में भ्रम या ठीक होने से जुड़े विवरण लिखें...',
    attachSummary: 'पर्चा या डिस्चार्ज समरी जोड़ें (वैकल्पिक)',
    chooseFile: 'फाइल चुनें',
    removeFile: 'हटाएं',
    sendBtn: 'संदेश भेजें',
    videoBtn: 'वीडियो परामर्श का अनुरोध करें',
    hotlineTitle: 'सीधी हेल्पडेस्क हेल्पलाइन',
    hotlineDesc: 'तत्काल दवा और फॉलो-अप के सवालों के लिए 24/7 उपलब्ध।',
    ambulanceTitle: 'आपातकालीन एम्बुलेंस और एसओएस',
    ambulanceDesc: 'गंभीर सीने में दर्द, सांस फूलने या बेहोशी की स्थिति में।',
    hoursTitle: 'ओपीडी और नर्सिंग वार्ड का समय',
    hoursDesc: 'सोम - शनि: 8:00 AM - 8:00 PM · आपातकालीन: 24 घंटे खुला',
  },
  aboutSection: {
    badge: 'टीम हेल्थनोवा · गोइंग होम राइट',
    principleHeadline: 'सिद्धांत: एआई पढ़ता है, नियम तय करते हैं, जो छूटा है उसे फ्लैग किया जाता है।',
    principleBody1: 'जब मरीज अस्पताल से घर लौटता है, तो डिस्चार्ज पर्चे पर लिखी जटिल लैटिन शब्दावली (ओडी, बीडी, टीडीएस, एसओएस) परिवार के सदस्यों के लिए भ्रम पैदा करती है। गोइंग होम राइट (टीम हेल्थनोवा) इस समस्या को समाप्त करता है।',
    principleBody2: 'हमारा सख्त क्लिनिकल नियम इंजन कभी भी समय या खुराक का अनुमान नहीं लगाता। यदि पर्चे पर समय स्पष्ट नहीं है, तो उसे तुरंत नर्स समीक्षा के लिए फ्लैग किया जाता है।',
    pillar1Title: 'शून्य अनुमानित खुराक',
    pillar1Desc: 'सख्त डिक्शनरी सत्यापन; छूटी हुई जानकारी पर क्लिनिकल चेतावनी।',
    pillar2Title: 'आभा और डेटा गोपनीयता',
    pillar2Desc: 'सुरक्षित एन्क्रिप्टेड डेटा और एफएचआईआर बंडल एक्सपोर्ट प्रारूप।',
    shieldTitle: 'द हेल्थनोवा केयर शील्ड',
    shieldDesc: 'मरीज सुरक्षा, क्लिनिकल सत्यापन, आसान भाषा और निरंतर टेलीहेल्थ फॉलो-अप का प्रतीक।',
    shieldBadge: 'आभा सक्षम · एफएचआईआर दस्तावेज मानक',
    teamTitle: 'हमारी मेडिकल और केयर संचालन टीम',
    teamDesc: 'पूरे भारत में मरीज की सुरक्षा सुनिश्चित करने वाले अनुभवी डॉक्टर, नर्स और स्वास्थ्य विशेषज्ञ।',
  },
  solutionsSection: {
    badge: 'देखभाल मार्ग और प्रक्रिया',
    title: '4-चरणीय मरीज सुरक्षा समाधान',
    subtitle: 'अस्पताल से घर लौटने पर गलत दवा लेने की आशंका को समाप्त करने वाला सिद्ध क्लिनिकल वर्कफ़्लो।',
    step1Title: '1. डिस्चार्ज पर्चा अपलोड करें',
    step1Desc: 'अस्पताल के डिस्चार्ज पर्चे की फोटो, पीडीएफ या कैमरा स्कैन अपलोड करें। सिस्टम तुरंत इमेज क्वालिटी जांचता है।',
    step1Btn: 'अपलोड शुरू करें',
    step2Title: '2. एआई पढ़ता है, नियम तय करते हैं',
    step2Desc: 'क्लिनिकल नियमों का सख्त पालन: बीडी का अर्थ सुबह + रात; ओडी में समय न होने पर कभी अनुमान नहीं लगाया जाता, बल्कि नर्स के लिए फ्लैग किया जाता है।',
    step2Btn: 'सुरक्षा नियम देखें',
    step3Title: '3. क्लिनिकल नर्स का सत्यापन',
    step3Desc: 'कोई भी अस्पष्ट संक्षिप्त नाम या लापता समय सीधे रजिस्टर्ड नर्स की कतार में जाता है। डॉक्टर से पुष्टि के बाद ही परिवार का प्लान सक्रिय होता है।',
    step3Btn: 'नर्स कतार खोलें',
    step4Title: '4. सरल पारिवारिक समय-सारणी',
    step4Desc: 'सुबह, दोपहर, रात के स्लॉट, ऑडियो वाचन (स्पीच), व्हाट्सएप रिमाइंडर, और खुराक देने के बाद टिक मार्क की सुविधा।',
    step4Btn: 'दैनिक प्लान देखें',
  },
  demoMode: {
    bannerNotice: 'सिंथेटिक डेटा के साथ डेमो। वास्तविक मरीज की जानकारी दर्ज न करें।',
    bannerBadge: 'लॉगिन की आवश्यकता नहीं',
    evalAccess: 'त्वरित मूल्यांकन सुविधा',
    chooseRole: 'पूरा सिस्टम देखने के लिए कोई भूमिका चुनें',
    roleDesc: 'बिना पासवर्ड के तुरंत डेमो डेटा के साथ देखने के लिए नीचे किसी भी विकल्प पर क्लिक करें।',
    familyTitle: 'परिवार के रूप में देखें',
    familyRole: 'मरीज और परिवार',
    familyDesc: 'मरीज सीता देवी की दैनिक दवा समय-सारणी (सुबह/दोपहर/रात) देखें, दवा टिक करें, आहार नियम और आपातकालीन एसओएस जांचें।',
    familyBtn: 'मरीज पृष्ठ पर जाएं',
    nurseTitle: 'नर्स के रूप में देखें',
    nurseRole: 'क्लिनिकल सत्यापन',
    nurseDesc: 'सिस्टर प्रिया शर्मा, आरएन: इकोस्प्रिन पर पीले रंग के "नर्स जांच आवश्यक" फ्लैग की पुष्टि करें और स्वीकृत करें।',
    nurseBtn: 'नर्स कतार में जाएं',
    adminTitle: 'अस्पताल एडमिन के रूप में देखें',
    adminRole: 'अस्पताल एडमिन',
    adminDesc: 'डॉ. वी. रमन: अस्पताल रिसेप्शन संपर्क सेट करें, एफएचआईआर रिकॉर्ड देखें और डेमो डेटा रीसेट करें।',
    adminBtn: 'एडमिन पोर्टल पर जाएं',
  },
  portalSwitcher: {
    hospitalPortalTitle: 'अस्पताल मेडिकल पोर्टल',
    patientPortalTitle: 'मरीज देखभाल पोर्टल',
    dualAccess: 'सुरक्षित दोहरी पहुंच',
    loggedIn: 'लॉग इन हैं',
    idLabel: 'आईडी',
    subtitle: 'अस्पताल स्टाफ डॉक्टर के पर्चे अपलोड करते हैं और मरीज आईडी जारी करते हैं; मरीज अपनी दैनिक दवा सूची का पालन करते हैं।',
    btnHospital: '🏥 अस्पताल स्टाफ पोर्टल',
    btnPatient: '💊 मरीज दवा चेकलिस्ट',
    btnSignIn: 'साइन इन / लॉगिन',
    btnLogout: 'लॉग आउट',
    prescribeTab: 'दवा चेकलिस्ट अपलोड और जारी करें',
    credentialsTab: 'जारी किए गए मरीज एक्सेस आईडी',
    settingsTab: 'अस्पताल सेटिंग्स',
    remindersTab: 'जीरो-ऐप व्हाट्सएप रिमाइंडर्स',
  },
  patientChecklist: {
    listenInstructions: 'निर्देश सुनें (ऑडियो)',
    stopAudio: 'ऑडियो रोकें',
    printSchedule: 'शेड्यूल और डाइट प्रिंट करें',
    tabAll: '📋 संपूर्ण देखभाल पृष्ठ',
    tabMeds: '💊 निर्धारित दवाइयां',
    tabDiet: '🥗 अस्पताल आहार योजना और सावधानियां',
    adherenceTitle: 'आज की निर्धारित दवा खुराक दर',
    dosesTakenOf: 'खुराक ली गई',
    progressGood: 'उत्कृष्ट! आज की सभी निर्धारित दवाएं ले ली गई हैं।',
    progressHalf: 'बहुत अच्छा! अपनी शाम और रात की दवाओं के लिए डॉक्टर के समय का पालन जारी रखें।',
    progressStart: 'कृपया नीचे दिए गए डॉक्टर के समय के अनुसार अपनी निर्धारित दवाइयां लें।',
    allDosesDone: 'सभी खुराक पूर्ण',
    morningTab: 'सुबह · 8 AM',
    afternoonTab: 'दोपहर · 1 PM',
    eveningTab: 'शाम · 5 PM',
    nightTab: 'रात · 9 PM',
    pendingTab: 'केवल बाकी दवाएं',
    noPendingSlot: 'इस समय स्लॉट में कोई लंबित दवा नहीं है',
    noPendingDesc: 'इस स्लॉट की सभी दवाएं ली जा चुकी हैं या कोई दवा निर्धारित नहीं थी।',
    doctorNotesBadge: 'डॉक्टर का विशेष निर्देश:',
    takeInstruction: 'लें',
    markTaken: 'दी गई के रूप में दर्ज करें',
    doseTaken: 'दी गई',
    takenAt: 'समय पर ली गई',
    verifiedRecord: 'सत्यापित अस्पताल रिकॉर्ड:',
    verifiedRecordDesc: 'डॉक्टर के निर्देश, सटीक खुराक समय, आहार योजना और सावधानियां सिंक्रनाइज़ हैं।',
    nurseVerified: 'नर्स द्वारा सत्यापित',
    markDoseStatus: 'आज की खुराक स्थिति दर्ज करें:',
    prescribedBy: 'द्वारा निर्धारित',
    portalBadge: 'आधिकारिक अस्पताल रिकवरी पोर्टल',
    dischargeDate: 'डिस्चार्ज तारीख:',
    dailyRecoveryPlan: 'दैनिक रिकवरी योजना',
    patientAccessIdLabel: 'अस्पताल मरीज एक्सेस आईडी',
    verifiedBy: 'सत्यापित कर्ता',
    helpdesk247: '24x7 हेल्पडेस्क',
    callHelpdesk: 'कॉल करें',
    highPriorityBadge: 'उच्च प्राथमिकता',
    mealsEaten: 'आज लिए गए भोजन',
    addOnsTaken: 'क्लिनिकल ऐड-ऑन लिए गए',
    measuresConfirmed: 'देखभाल सावधानियां पुष्ट की गईं',
    mealTaken: '✓ भोजन कर लिया गया',
    markMealTaken: 'भोजन लिया गया दर्ज करें',
    addonTaken: '✓ ऐड-ऑन लिया गया',
    markAddonTaken: 'ऐड-ऑन की पुष्टि करें',
    measureFollowed: '✓ सावधानी का पालन किया गया',
    markMeasureFollowed: 'सावधानी की पुष्टि करें',
  },
  footer: {
    carePortalTitle: 'केयर पोर्टल',
    specsTitle: 'क्लिनिकल मानक और एपीआई',
    hotlineTitle: 'आपातकालीन हेल्पडेस्क',
    allRights: 'सर्वाधिकार सुरक्षित। क्लिनिकल सुरक्षा सिद्धांतों पर आधारित।',
    emergencyCall: 'आपातकालीन हेल्पलाइन',
    addressNationwide: 'नई दिल्ली, भारत · पूरे देश में उपलब्ध',
    hotline247: '24/7 देखभाल समन्वय हेल्पलाइन',
  },
  modals: {
    callTitle: 'हेल्थकेयर डायरेक्ट कॉल',
    callSubtitle: '24/7 फोन और कॉलबैक सहायता',
    mailTitle: 'हमें ईमेल भेजें',
    mailSubtitle: 'मरीज देखभाल और डिस्चार्ज सहायता',
    joinTitle: 'हमारे हेल्थकेयर नेटवर्क से जुड़ें',
    joinSubtitle: 'देखभालकर्ताओं, अस्पतालों और स्वयंसेवकों को सशक्त बनाना',
    requestCallback: 'त्वरित कॉलबैक का अनुरोध करें',
    yourName: 'आपका नाम',
    yourEmail: 'आपका ईमेल',
    yourPhone: 'फोन नंबर',
    subject: 'विषय',
    message: 'संदेश',
    close: 'बंद करें',
    submit: 'जमा करें',
    send: 'ईमेल भेजें',
  },
};

// Listen to loader updates
export function setCachedDictionary(lang: string, dict: any) {
  dictionaryCache[lang] = dict;
}

/**
 * Creates a recursive fallback proxy:
 * target -> fallback1 (Hindi) -> fallback2 (English)
 */
function createFallbackProxy(current: any, fallback1: any, fallback2: any): any {
  return new Proxy(current || {}, {
    get(target, prop) {
      if (typeof prop !== 'string') return target[prop];
      
      const val = target[prop];
      const f1 = fallback1 ? fallback1[prop] : undefined;
      const f2 = fallback2 ? fallback2[prop] : undefined;

      const effective = val !== undefined && val !== null ? val : (f1 !== undefined && f1 !== null ? f1 : f2);

      if (effective && typeof effective === 'object' && !Array.isArray(effective)) {
        return createFallbackProxy(val, f1, f2);
      }
      return effective;
    },
  });
}

/**
 * Get merged translations for a specific language
 */
export function getTranslations(lang: Language): Translations {
  const current = dictionaryCache[lang] || (lang === 'en' ? dictionaryCache['en'] : dictionaryCache['hi']) || dictionaryCache['en'];
  
  // Base English and Hindi extensions enriched with uiExtensionsByLang
  const enExt = { ...enUIExtension, ...(uiExtensionsByLang.en || {}) };
  const hiExt = { ...hiUIExtension, ...(uiExtensionsByLang.hi || {}) };

  const effectiveEn = { ...enDict, ...enExt };
  const effectiveHi = { ...hiDict, ...hiExt };
  const effectiveCurrent = { ...current };

  // If current language has specific UI extension (e.g. bn, ta, te, mr, gu, pa, hi, en)
  const specificLangExt = uiExtensionsByLang[lang];
  if (specificLangExt) {
    for (const [sectionKey, sectionVal] of Object.entries(specificLangExt)) {
      effectiveCurrent[sectionKey] = {
        ...(effectiveCurrent[sectionKey] || {}),
        ...(sectionVal as any),
      };
    }
  }

  if (lang === 'en') {
    Object.assign(effectiveCurrent, enExt);
    return createFallbackProxy(effectiveCurrent, effectiveEn, effectiveEn);
  } else if (lang === 'hi') {
    Object.assign(effectiveCurrent, hiExt);
    return createFallbackProxy(effectiveCurrent, effectiveHi, effectiveEn);
  }

  return createFallbackProxy(effectiveCurrent, effectiveHi, effectiveEn);
}

/**
 * Global translations accessor supporting all 28 languages via Proxy
 * Example: translations[lang].hero.btnUpload
 */
export const translations: Record<Language, Translations> = new Proxy({} as any, {
  get(_target, prop: string) {
    return getTranslations(prop as Language);
  },
});

