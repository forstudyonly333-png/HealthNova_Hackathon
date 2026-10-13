/**
 * API client for Going Home Right
 */

export interface DietMealItem {
  id: string;
  meal_time: string; // e.g. "Breakfast (8:30 AM)"
  title: string;     // e.g. "Heart-Healthy Oats Porridge & Protein"
  items: string;     // e.g. "Warm oats in skimmed milk, 2 boiled egg whites, sliced apple"
  instructions: string; // e.g. "Zero added salt, eat sitting upright"
  taken?: boolean;
}

export interface DietAddOnItem {
  id: string;
  title: string;     // e.g. "Fresh Tender Coconut Water"
  timing: string;    // e.g. "Mid-Morning (11:00 AM)"
  benefits: string;  // e.g. "Natural electrolytes & vascular tone support"
  instructions: string;
  recommended: boolean;
  taken?: boolean;
}

export interface DietMeasureItem {
  id: string;
  title: string;     // e.g. "Strict Sodium (Salt) Restriction"
  category: string;  // e.g. "Salt & Electrolytes", "Fluid Monitoring", "Posture", "Vital Check"
  severity: 'Critical' | 'Important' | 'Warning' | 'Monitoring';
  instruction: string;
  metric_limit?: string; // e.g. "Max 1,500 mL / 24 hours", "Under 2g salt (< 1/2 tsp)"
  checked?: boolean;
}

export interface DietPlan {
  id: string;
  discharge_id: string;
  diet_type: string;
  calories_target: string;
  hydration_target: string;
  prescribed_by: string;
  meals: DietMealItem[];
  add_ons: DietAddOnItem[];
  measures: DietMeasureItem[];
  special_instructions: string;
  created_at?: string;
  updated_at?: string;
}

export interface Medicine {
  id: string;
  discharge_id: string;
  name: string;
  strength: string;
  frequency_code: string;
  timing_note: string;
  duration: string;
  source_text: string;
  confidence: number;
  status: 'clear' | 'needs_nurse_check' | 'approved';
  flag_reason: string;
  slots_json: string;
  slots: Array<'subah' | 'dopahar' | 'shaam' | 'raat'>;
  timing_instruction_en: string;
  timing_instruction_hi: string;
  nurse_notes: string;
  doctor_notes?: string;
  food_instruction?: string;
  dosage_form?: string;
  prescribed_by?: string;
}

export interface FollowUp {
  id: string;
  discharge_id: string;
  due_date: string;
  text: string;
  source_text: string;
  confidence: number;
  status: 'clear' | 'needs_nurse_check' | 'approved';
  flag_reason: string;
  done: number;
}

export interface Warning {
  id: string;
  discharge_id: string;
  text: string;
  source_text: string;
  action_text: string;
  status: 'clear' | 'needs_nurse_check' | 'approved';
  flag_reason?: string;
}

export interface DischargePlan {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_phone?: string;
  abha_id?: string;
  hospital_name: string;
  discharge_date: string;
  original_file_name: string;
  helpdesk_number: string;
  status: 'processing' | 'extracted' | 'partially_verified' | 'approved';
  medicines: Medicine[];
  follow_ups: FollowUp[];
  warnings: Warning[];
  diet_plan?: DietPlan | null;
  dose_events: Array<{
    id: string;
    medicine_id: string;
    slot: string;
    given: number;
    given_at?: string;
  }>;
}

export interface NurseQueueItem {
  queueLength: number;
  medicines: (Medicine & { hospital_name: string; discharge_date: string })[];
  warnings: (Warning & { hospital_name: string; discharge_date: string })[];
}

export interface AnalyticsData {
  totalMedicines: number;
  flaggedItemsCount: number;
  flagSharePercent: number;
  awaitingNurseVerification: number;
  approvedByNurse: number;
  autoClearedByRules: number;
  dosesGiven: number;
  dosesMissed: number;
  adherenceRatePercent: number;
  totalFollowups: number;
  completedFollowups: number;
  pendingFollowups: number;
  patientQueries?: {
    totalQueries: number;
    urgentQueriesCount: number;
    queriesHandledCount: number;
    pendingQueriesCount: number;
    queriesByCategory: Record<string, number>;
  };
}

export const api = {
  async getConfig(): Promise<{ demoMode: boolean; whatsappProvider: string; uptime: number }> {
    try {
      const res = await fetch('/api/config');
      if (!res.ok) return { demoMode: true, whatsappProvider: 'simulated', uptime: 0 };
      return res.json();
    } catch {
      return { demoMode: true, whatsappProvider: 'simulated', uptime: 0 };
    }
  },

  async loginAsDemoRole(role: 'family' | 'nurse' | 'admin'): Promise<{ roleType: 'hospital' | 'patient'; user: any; dischargeId?: string }> {
    const res = await fetch('/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) throw new Error('Demo login failed');
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('ghr_auth_token', data.token);
    }
    return data;
  },

  async resetDemoData(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/admin/reset-demo-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to reset demo data');
    return res.json();
  },

  async getDischarges(): Promise<DischargePlan[]> {
    const res = await fetch('/api/discharges');
    if (!res.ok) throw new Error('Failed to fetch discharges');
    return res.json();
  },

  async getDischarge(id: string): Promise<DischargePlan> {
    const res = await fetch(`/api/discharges/${id}`);
    if (!res.ok) throw new Error('Failed to fetch discharge plan');
    return res.json();
  },

  async uploadDischarge(formData: FormData): Promise<{ id: string; status: string; medicinesCount: number; flaggedCount: number }> {
    const res = await fetch('/api/discharges', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Upload failed');
    }
    return res.json();
  },

  async getNurseQueue(): Promise<NurseQueueItem> {
    const res = await fetch('/api/nurse/queue');
    if (!res.ok) throw new Error('Failed to fetch nurse queue');
    return res.json();
  },

  async updateItem(id: string, data: { slots?: string[]; timing_note?: string; strength?: string; nurse_notes?: string }): Promise<any> {
    const res = await fetch(`/api/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update item');
    return res.json();
  },

  async approveItem(id: string, data: { slots?: string[]; nurse_notes?: string; action_text?: string }): Promise<any> {
    const res = await fetch(`/api/items/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to approve item');
    return res.json();
  },

  async getAuditTrail(id: string): Promise<any[]> {
    const res = await fetch(`/api/discharges/${id}/audit`);
    if (!res.ok) throw new Error('Failed to fetch audit trail');
    return res.json();
  },

  async markDoseGiven(medicineId: string, slot: string, given: boolean, dischargeId: string, caregiverName?: string): Promise<any> {
    const res = await fetch(`/api/doses/${medicineId}/given`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot, given, dischargeId, caregiverName }),
    });
    if (!res.ok) throw new Error('Failed to mark dose');
    return res.json();
  },

  async markFollowupDone(fuId: string, done: boolean): Promise<any> {
    const res = await fetch(`/api/followups/${fuId}/done`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done }),
    });
    if (!res.ok) throw new Error('Failed to mark follow-up');
    return res.json();
  },

  async getAnalytics(): Promise<AnalyticsData> {
    const res = await fetch('/api/analytics');
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  async getFhirBundle(id: string): Promise<any> {
    const res = await fetch(`/api/discharges/${id}/fhir`);
    if (!res.ok) throw new Error('Failed to fetch FHIR bundle');
    return res.json();
  },

  async askSafetyQuestion(question: string, lang: string): Promise<{ refusal: boolean; reply: string }> {
    const res = await fetch('/api/safety/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, lang }),
    });
    if (!res.ok) throw new Error('Failed to submit question');
    return res.json();
  },

  async savePreferredLanguage(language: string, patientId?: string): Promise<{ success: boolean; language: string }> {
    try {
      const res = await fetch('/api/patients/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, patientId }),
      });
      return res.json();
    } catch {
      return { success: false, language };
    }
  },

  async getPreferredLanguage(patientId?: string): Promise<string> {
    try {
      const res = await fetch(`/api/patients/language${patientId ? `?patientId=${patientId}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        return data.language || 'en';
      }
    } catch {
      // fallback
    }
    return 'en';
  },

  async translateText(text: string, targetLang: string): Promise<{ translatedText: string; isMachineTranslated: boolean }> {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang }),
    });
    if (!res.ok) throw new Error('Translation failed');
    return res.json();
  },

  // --- Security & Role Authentication ---
  async hospitalLogin(staffIdOrEmail: string, password: string): Promise<{ success: boolean; token: string; user: HospitalStaffUser }> {
    const res = await fetch('/api/auth/hospital-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffIdOrEmail, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hospital authentication failed');
    if (typeof window !== 'undefined') {
      localStorage.setItem('ghr_auth_token', data.token);
      localStorage.setItem('ghr_auth_user', JSON.stringify(data.user));
    }
    return data;
  },

  async patientLogin(accessId: string, pin: string): Promise<{ success: boolean; token: string; user: PatientUser; dischargeId: string }> {
    const res = await fetch('/api/auth/patient-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessId, pin }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Patient access verification failed');
    if (typeof window !== 'undefined') {
      localStorage.setItem('ghr_auth_token', data.token);
      localStorage.setItem('ghr_auth_user', JSON.stringify(data.user));
    }
    return data;
  },

  async getCurrentSession(): Promise<{ roleType: 'hospital' | 'patient' | 'guest'; user: any; dischargeId?: string }> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ghr_auth_token') : null;
    const res = await fetch('/api/auth/current', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return { roleType: 'guest', user: null };
    return res.json();
  },

  async logout(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ghr_auth_token');
      localStorage.removeItem('ghr_auth_user');
    }
  },

  // --- Hospital Portal Actions ---
  async getHospitalStaff(): Promise<HospitalStaffUser[]> {
    const res = await fetch('/api/hospital/staff');
    if (!res.ok) throw new Error('Failed to fetch hospital staff list');
    return res.json();
  },

  async getHospitalPatientCredentials(): Promise<PatientCredentialItem[]> {
    const res = await fetch('/api/hospital/patient-credentials');
    if (!res.ok) throw new Error('Failed to fetch patient credentials');
    return res.json();
  },

  async issuePatientCredential(data: {
    dischargeId: string;
    patientName?: string;
    doctorName?: string;
    hospitalName?: string;
    staffId?: string;
    staffName?: string;
  }): Promise<{ success: boolean; credential: PatientCredentialItem }> {
    const res = await fetch('/api/hospital/patient-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to generate Patient Access ID');
    return result;
  },

  async prescribeMedications(payload: PrescribePayload): Promise<{
    success: boolean;
    dischargeId: string;
    accessId: string;
    pin: string;
    patientName: string;
    medicinesCount: number;
    doctorName: string;
    hospitalName: string;
  }> {
    const res = await fetch('/api/hospital/prescribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to upload prescription');
    return result;
  },

  // --- Patient Doctor-Prescribed Checklist ---
  async getPatientChecklist(dischargeId: string): Promise<PatientChecklistData> {
    const res = await fetch(`/api/patient/checklist/${dischargeId}`);
    if (!res.ok) throw new Error('Failed to load patient medicine checklist');
    return res.json();
  },

  // --- Hospital Diet Plan ---
  async getDietPlan(dischargeId: string): Promise<DietPlan> {
    const res = await fetch(`/api/discharges/${dischargeId}/diet`);
    if (!res.ok) throw new Error('Failed to fetch diet plan');
    return res.json();
  },

  async saveDietPlan(dischargeId: string, dietPlan: Partial<DietPlan>): Promise<{ success: boolean; dietPlan: DietPlan }> {
    const res = await fetch(`/api/discharges/${dischargeId}/diet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dietPlan),
    });
    if (!res.ok) throw new Error('Failed to save diet plan');
    return res.json();
  },

  async toggleDietItem(dischargeId: string, itemType: 'meal' | 'addon' | 'measure', itemId: string, completed: boolean): Promise<{ success: boolean; dietPlan: DietPlan }> {
    const res = await fetch(`/api/discharges/${dischargeId}/diet/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemType, itemId, completed }),
    });
    if (!res.ok) throw new Error('Failed to update diet item');
    return res.json();
  },

  async addDietCustomItem(dischargeId: string, itemType: 'meal' | 'addon' | 'measure', item: any): Promise<{ success: boolean; newItem: any; dietPlan: DietPlan }> {
    const res = await fetch(`/api/discharges/${dischargeId}/diet/custom-item`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemType, item }),
    });
    if (!res.ok) throw new Error('Failed to add diet item');
    return res.json();
  },

  async getHospitalContact(): Promise<HospitalContactSettings> {
    const res = await fetch('/api/settings/contact');
    if (!res.ok) throw new Error('Failed to fetch hospital contact settings');
    return res.json();
  },

  async updateHospitalContact(settings: Partial<HospitalContactSettings>, actorRole: string = 'admin', actorName: string = 'Dr. V. Raman'): Promise<{ success: boolean; message: string; settings?: HospitalContactSettings }> {
    const res = await fetch('/api/settings/contact', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-staff-role': actorRole
      },
      body: JSON.stringify({ ...settings, actorName }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to update hospital contact settings');
    }
    return res.json();
  },

  async verifyHospitalContact(
    contactId: string,
    result: 'verified' | 'failed',
    actorName: string = 'Dr. V. Raman',
    actorRole: string = 'admin'
  ): Promise<{ success: boolean; contact: HospitalContactItem }> {
    const res = await fetch('/api/settings/contact/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-staff-role': actorRole
      },
      body: JSON.stringify({ contact_id: contactId, result, actorName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to verify hospital contact');
    }
    return res.json();
  },

  async reportHospitalContact(
    contactId: string,
    dischargeId: string,
    reason: string = 'WhatsApp did not open'
  ): Promise<{ success: boolean; fallback_target?: string; message: string }> {
    const res = await fetch('/api/contact/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_id: contactId, discharge_id: dischargeId, reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit contact report');
    }
    return res.json();
  },

  async logPatientQuery(payload: PatientQueryPayload): Promise<{ success: boolean; queryId: string; isUrgent: boolean; matchedKeyword: string | null }> {
    const res = await fetch('/api/queries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to log patient query');
    return res.json();
  },

  async getPatientQueries(): Promise<PatientQueryRecord[]> {
    const res = await fetch('/api/queries', {
      headers: { 'x-staff-role': 'nurse' },
    });
    if (!res.ok) throw new Error('Failed to fetch patient queries');
    return res.json();
  },

  async markQueryHandled(queryId: string, staffName?: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/queries/${queryId}/handle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffName, role: 'nurse' }),
    });
    if (!res.ok) throw new Error('Failed to mark query as handled');
    return res.json();
  },

  async sendDoseReminder(dischargeId: string, slot: string = 'subah', patientPhone?: string): Promise<{ success: boolean; messageId: string; messageText: string; recipient: string; status: string }> {
    const res = await fetch('/api/reminders/send-dose-reminder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dischargeId, slot, patientPhone }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to dispatch dose reminder');
    }
    return res.json();
  },

  async simulateWhatsAppReply(body: string, dischargeId?: string, from?: string): Promise<{ actionTaken: string; confirmationReply: string; isUrgent: boolean; dischargeId: string }> {
    const res = await fetch('/api/whatsapp/simulate-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, dischargeId, from }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to process WhatsApp reply');
    }
    return res.json();
  },

  async getWhatsAppMessages(dischargeId?: string): Promise<WhatsAppMessageRecord[]> {
    const url = dischargeId ? `/api/whatsapp/messages?dischargeId=${encodeURIComponent(dischargeId)}` : '/api/whatsapp/messages';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch WhatsApp message log');
    return res.json();
  },
};

export interface WhatsAppMessageRecord {
  id: string;
  discharge_id: string;
  direction: 'outbound' | 'inbound';
  recipient_phone: string;
  message_text: string;
  slot?: string;
  status: string;
  provider: string;
  metadata_json?: string;
  created_at: string;
}

export interface HospitalContactItem {
  id: string;
  type: 'primary_whatsapp' | 'backup_whatsapp' | 'phone' | 'business_link';
  value: string;
  active_value: string;
  status: 'not_verified' | 'verified' | 'reported_not_working';
  verified_at?: string | null;
  verified_by?: string | null;
  last_reported_at?: string | null;
}

export interface HospitalContactSettings {
  hospital_name: string;
  reception_whatsapp: string;
  reception_phone: string;
  office_hours: string;
  emergency_number_text: string;
  greeting_line?: string;
  note?: string;
  primary_whatsapp?: string;
  backup_whatsapp?: string;
  business_link?: string;
  active_whatsapp_target?: string;
  active_whatsapp_type?: string;
  has_verified_whatsapp?: boolean;
  is_fallback?: boolean;
  fallback_reason?: string | null;
  has_broken_whatsapp_alert?: boolean;
  broken_reports_count?: number;
  whatsapp_source?: string;
  is_valid?: boolean;
  validation_error?: string | null;
  contacts?: HospitalContactItem[];
}

export interface PatientQueryPayload {
  dischargeId: string;
  category: string;
  language: string;
  userMessage?: string;
  medicineName?: string;
  includedMedicineList?: boolean;
  includedName?: boolean;
  saveCopyForNurse?: boolean;
}

export interface PatientQueryRecord {
  id: string;
  discharge_id: string;
  category: string;
  language: string;
  is_urgent: number;
  urgent_keyword?: string;
  included_medicine_list: number;
  included_name: number;
  saved_copy_for_nurse: number;
  message_copy?: string | null;
  medicine_name?: string;
  status: 'pending' | 'handled';
  handled_by?: string;
  handled_at?: string;
  created_at: string;
  hospital_name?: string;
  discharge_date?: string;
}

export interface HospitalStaffUser {
  id: string;
  staff_id: string;
  name: string;
  email: string;
  role: 'doctor' | 'nurse' | 'admin';
  roleType: 'hospital';
  hospital_name: string;
  department: string;
}

export interface PatientUser {
  id: string;
  access_id: string;
  patient_id: string;
  patient_name: string;
  discharge_id: string;
  hospital_name: string;
  doctor_name: string;
  hospital_staff_name?: string;
  roleType: 'patient';
}

export type AuthUser = HospitalStaffUser | PatientUser;

export interface PatientCredentialItem {
  id: string;
  access_id: string;
  pin: string;
  patient_id: string;
  patient_name: string;
  discharge_id: string;
  hospital_staff_id: string;
  hospital_staff_name: string;
  hospital_name: string;
  doctor_name: string;
  status: string;
  created_at: string;
  discharge_status?: string;
}

export interface PrescribePayloadMedicine {
  name: string;
  strength: string;
  dosageForm?: string;
  frequencyCode?: string;
  slots: Array<'subah' | 'dopahar' | 'shaam' | 'raat'>;
  foodInstruction: string;
  timingNote?: string;
  duration?: string;
  notes?: string;
  doctorNotes?: string;
}

export interface PrescribePayload {
  patientName: string;
  patientAge?: string;
  patientPhone?: string;
  hospitalName?: string;
  doctorName?: string;
  department?: string;
  helpdeskNumber?: string;
  medicines: PrescribePayloadMedicine[];
  followUpText?: string;
  warningsText?: string;
  staffId?: string;
  staffName?: string;
  dietPlan?: Partial<DietPlan>;
}

export interface PatientChecklistSlotStatus {
  slot: 'subah' | 'dopahar' | 'shaam' | 'raat' | 'sos';
  isGiven: boolean;
  givenAt: string | null;
  givenBy: string | null;
}

export interface PatientChecklistMedicine {
  id: string;
  name: string;
  strength: string;
  dosage_form: string;
  frequency_code: string;
  food_instruction: string;
  timing_instruction_en: string;
  timing_instruction_hi: string;
  doctor_notes: string;
  prescribed_by: string;
  duration: string;
  status: string;
  slots: Array<'subah' | 'dopahar' | 'shaam' | 'raat'>;
  slotStatuses: PatientChecklistSlotStatus[];
}

export interface PatientChecklistData {
  dischargeId: string;
  patientName: string;
  patientAccessId: string;
  pin: string;
  hospitalName: string;
  doctorName: string;
  nurseName: string;
  dischargeDate: string;
  helpdeskNumber: string;
  allMedicines: PatientChecklistMedicine[];
  checklistByTime: {
    subah: PatientChecklistMedicine[];
    dopahar: PatientChecklistMedicine[];
    shaam: PatientChecklistMedicine[];
    raat: PatientChecklistMedicine[];
    sos: PatientChecklistMedicine[];
  };
  adherence: {
    totalDoses: number;
    takenDoses: number;
    percentage: number;
  };
  followUps: FollowUp[];
  warnings: Warning[];
  dietPlan?: DietPlan | null;
}
