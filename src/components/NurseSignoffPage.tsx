import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  Edit3, 
  History, 
  Check, 
  Clock, 
  ShieldCheck, 
  FileText,
  UserCheck,
  MessageSquare,
  Filter,
  CheckCircle2,
  X
} from 'lucide-react';
import { Language, translations, getLanguageMeta } from '../i18n';
import { api, NurseQueueItem, Medicine, PatientQueryRecord } from '../api';
import { SafetyBox } from './SafetyBox';

interface NurseSignoffPageProps {
  lang: Language;
  onItemApproved: () => void;
  activeDischargeId?: string;
}

export const NurseSignoffPage: React.FC<NurseSignoffPageProps> = ({
  lang,
  onItemApproved,
  activeDischargeId,
}) => {
  const [queue, setQueue] = useState<NurseQueueItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingMed, setEditingMed] = useState<Medicine | null>(null);
  const [editSlots, setEditSlots] = useState<string[]>(['subah']);
  const [editNote, setEditNote] = useState('');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [patientPreferredLang, setPatientPreferredLang] = useState<string>('en');

  // Patient Queries State (Feature 2)
  const [queries, setQueries] = useState<PatientQueryRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'meds' | 'queries' | 'audit'>('meds');
  const [queryFilter, setQueryFilter] = useState<'all' | 'pending' | 'urgent' | 'handled'>('all');
  const [handlingQueryId, setHandlingQueryId] = useState<string | null>(null);

  const t = translations[lang];

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const q = await api.getNurseQueue();
      setQueue(q);
      const prefLang = await api.getPreferredLanguage('pat_sita_devi');
      setPatientPreferredLang(prefLang || 'en');
      if (activeDischargeId) {
        const logs = await api.getAuditTrail(activeDischargeId);
        setAuditLogs(logs);
      }
      const qList = await api.getPatientQueries().catch(() => []);
      setQueries(qList);
    } catch (err) {
      console.error('Failed to fetch nurse queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [activeDischargeId]);

  const handleOpenEdit = (med: Medicine) => {
    setEditingMed(med);
    setEditSlots(med.slots && med.slots.length > 0 ? med.slots : ['subah']);
    setEditNote(med.nurse_notes || 'Verified with treating doctor');
  };

  const handleApprove = async (itemId: string, slots: string[], nurseNote: string) => {
    try {
      await api.approveItem(itemId, {
        slots,
        nurse_notes: nurseNote || 'Approved by Sister Priya Sharma, RN after doctor verification',
      });
      setEditingMed(null);
      await fetchQueue();
      onItemApproved();
    } catch (err) {
      console.error('Failed to approve item:', err);
    }
  };

  const handleMarkQueryHandled = async (queryId: string) => {
    setHandlingQueryId(queryId);
    try {
      await api.markQueryHandled(queryId, 'Sister Priya Sharma, RN');
      await fetchQueue();
    } catch (err) {
      console.error('Failed to mark query handled:', err);
    } finally {
      setHandlingQueryId(null);
    }
  };

  const toggleSlot = (slot: string) => {
    if (editSlots.includes(slot)) {
      if (editSlots.length > 1) {
        setEditSlots(editSlots.filter((s) => s !== slot));
      }
    } else {
      setEditSlots([...editSlots, slot]);
    }
  };

  const pendingQueriesCount = queries.filter((q) => q.status === 'pending').length;
  const urgentQueriesCount = queries.filter((q) => q.is_urgent === 1).length;

  const filteredQueries = queries.filter((q) => {
    if (queryFilter === 'pending') return q.status === 'pending';
    if (queryFilter === 'urgent') return q.is_urgent === 1;
    if (queryFilter === 'handled') return q.status === 'handled';
    return true;
  });

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full font-mono">
              {t.nursePage?.roleLabel || 'Role: Registered Clinical Nurse (Sister Priya Sharma, RN)'}
            </span>
            <span className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
              {t.nurse.patientPreferredLangLabel || 'Patient Language Preference:'} {getLanguageMeta(patientPreferredLang as any).name} ({getLanguageMeta(patientPreferredLang as any).englishName})
            </span>
          </div>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {t.nurse.title}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            {t.nurse.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchQueue}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm self-start sm:self-auto flex items-center gap-1.5 cursor-pointer"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{t.nursePage?.refreshBtn || 'Refresh Queue'}</span>
        </button>
      </div>

      {/* Safety Notice */}
      <SafetyBox lang={lang} />

      {/* Tabs Navigation (Feature 2: "Patient queries" tab on the nurse page) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('meds')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'meds'
              ? 'bg-[#1E6F5C] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{t.nursePage?.medQueueTab || 'Medication Verification Queue'} ({queue?.queueLength || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('queries')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'queries'
              ? 'bg-[#1E6F5C] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>{t.nursePage?.patientQueriesTab || 'Patient Queries'} ({pendingQueriesCount})</span>
          {urgentQueriesCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-mono">
              {urgentQueriesCount} urgent
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-[#1E6F5C] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>{t.nursePage?.auditLogTab || 'Audit Log Trail'} ({auditLogs.length})</span>
        </button>
      </div>

      {/* TAB 2: PATIENT QUERIES VIEW (FEATURE 2) */}
      {activeTab === 'queries' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {t.nursePage?.queriesQueueTitle || 'Patient & Caregiver Queries Queue'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t.nursePage?.queriesQueueDesc || 'Questions submitted from the patient WhatsApp desk. Free-text message is only stored when the patient opted-in to save a copy for the nurse.'}
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              {(['all', 'pending', 'urgent', 'handled'] as const).map((f) => {
                const label = 
                  f === 'all' ? (t.nursePage?.filterAll || 'All') :
                  f === 'pending' ? (t.nursePage?.filterPending || 'Pending') :
                  f === 'urgent' ? (t.nursePage?.filterUrgent || 'Urgent') :
                  (t.nursePage?.filterHandled || 'Handled');
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setQueryFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer ${
                      queryFilter === f
                        ? f === 'urgent'
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-900 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {label} {f === 'pending' && `(${pendingQueriesCount})`}
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400">Loading queries...</div>
          ) : filteredQueries.length === 0 ? (
            <div className="bg-slate-50 rounded-3xl p-10 text-center border border-slate-200">
              <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900">
                No Queries In This Filter
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No patient questions match this filter criteria. All pending inquiries have been resolved.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQueries.map((q) => {
                const isHandled = q.status === 'handled';
                return (
                  <div
                    key={q.id}
                    className={`bg-white rounded-2xl border p-5 sm:p-6 transition-all ${
                      q.is_urgent
                        ? 'border-rose-300 ring-1 ring-rose-200 bg-rose-50/20'
                        : isHandled
                        ? 'border-slate-200 bg-slate-50/50 opacity-90'
                        : 'border-slate-200 shadow-xs'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {q.is_urgent === 1 ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Urgent Clinical Flag</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                              {q.category}
                            </span>
                          )}

                          <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            Ref: {q.discharge_id}
                          </span>

                          <span className="text-xs text-slate-500">
                            Lang: <strong>{getLanguageMeta(q.language as any).englishName}</strong> ({q.language})
                          </span>

                          <span className="text-xs text-slate-400">
                            · {new Date(q.created_at).toLocaleString()}
                          </span>
                        </div>

                        {/* Urgent Symptom Warning Callout */}
                        {q.is_urgent === 1 && (
                          <div className="p-3 rounded-xl bg-rose-100/70 border border-rose-300 text-xs text-rose-950 font-medium">
                            <strong className="text-rose-900 font-bold">🚨 Urgent keyword detected:</strong>{' '}
                            &ldquo;{q.urgent_keyword || q.category}&rdquo;. Patient was provided direct emergency helpline guidance before WhatsApp dispatch.
                          </div>
                        )}

                        {/* Stored message body (Feature 2 privacy rule: only stored if saveCopyForNurse was true) */}
                        <div className="text-xs text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                          {q.saved_copy_for_nurse === 1 && q.message_copy ? (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Patient Saved Message Copy:
                              </span>
                              <p className="font-medium text-slate-900 break-words">
                                &ldquo;{q.message_copy}&rdquo;
                              </p>
                            </div>
                          ) : (
                            <div className="text-slate-500 italic flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>Free-text message not stored on server (Patient did not opt-in to save copy for privacy).</span>
                            </div>
                          )}
                        </div>

                        {/* Handled status line */}
                        {isHandled && (
                          <div className="text-xs text-emerald-800 flex items-center gap-1.5 font-medium pt-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Marked as handled by {q.handled_by || 'Sister Priya Sharma, RN'} on {new Date(q.handled_at || q.created_at).toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      {/* "Mark as handled" button (Feature 2 requirement: writes to audit_log) */}
                      {!isHandled ? (
                        <button
                          type="button"
                          onClick={() => handleMarkQueryHandled(q.id)}
                          disabled={handlingQueryId === q.id}
                          className="px-4 py-2 rounded-xl bg-[#1E6F5C] hover:bg-[#18594A] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-60"
                        >
                          {handlingQueryId === q.id ? (
                            <span>Updating...</span>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Mark as Handled</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shrink-0">
                          Handled
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 1: MEDICATION QUEUE ITEMS */}
      {activeTab === 'meds' && (
        loading ? (
          <div className="py-16 text-center text-slate-400">Loading nurse queue...</div>
        ) : queue && queue.queueLength === 0 ? (
          <div className="bg-emerald-50 rounded-3xl p-10 text-center border border-emerald-200">
            <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-emerald-950">
              {t.nurse.queueEmpty}
            </h3>
            <p className="text-xs text-emerald-800 mt-1 max-w-sm mx-auto">
              All extracted medications and instructions comply with clinical safety rules. The family daily care plan is active and green!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Pending Flagged Items ({queue?.queueLength || 0})</span>
              <span>Clinical Verification Station</span>
            </div>

          {queue?.medicines.map((med) => (
            <div
              key={med.id}
              className="bg-white rounded-3xl border border-amber-200 p-6 sm:p-7 shadow-sm hover:shadow transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      FLAGGED
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Hospital: {med.hospital_name}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mt-1">
                    {med.name} {med.strength && <span className="text-sm font-normal text-slate-500">({med.strength})</span>}
                  </h3>

                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-mono text-slate-800">
                    Source Line: &ldquo;{med.source_text}&rdquo;
                  </div>

                  <div className="mt-3 text-xs text-rose-700 font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Reason: {med.flag_reason}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(med)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="w-4 h-4 text-slate-600" />
                    <span>{t.nurse.editBtn}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApprove(med.id, ['subah'], 'Approved after doctor phone consult')}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{t.nurse.approveBtn}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Flagged Warnings in Queue */}
          {queue?.warnings.map((warn) => (
            <div
              key={warn.id}
              className="bg-white rounded-3xl border border-rose-200 p-6 sm:p-7 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-mono font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                    WARNING ACTION NEEDED
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-2">
                    {warn.text}
                  </h3>
                  <p className="mt-1 text-xs font-mono text-slate-600">
                    Source: &ldquo;{warn.source_text}&rdquo;
                  </p>
                  <p className="mt-2 text-xs text-rose-700 font-semibold">
                    Flag: {warn.flag_reason || 'Action not specified on sheet'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleApprove(warn.id, [], 'Call hospital helpline immediately if breathlessness occurs')}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                >
                  <Check className="w-4 h-4" />
                  <span>Approve Standard Triage Action</span>
                </button>
              </div>
            </div>
          ))}

        </div>
      ))}

      {/* Edit Medication Slots Modal */}
      {editingMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {t.nurse.editModalTitle}
              </h3>
              <button
                type="button"
                onClick={() => setEditingMed(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <span className="text-xs text-slate-500 font-medium">Medication:</span>
                <h4 className="text-lg font-bold text-slate-900">{editingMed.name}</h4>
                <p className="text-xs font-mono text-slate-500 mt-0.5">&ldquo;{editingMed.source_text}&rdquo;</p>
              </div>

              {/* Slot Selectors */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Select Daily Care Slots:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['subah', 'dopahar', 'raat'].map((slot) => {
                    const isSelected = editSlots.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => toggleSlot(slot)}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold capitalize border transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-500'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nurse Clinical Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nurse Clinical Audit Note:
                </label>
                <textarea
                  rows={3}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder={t.nurse.notesPlaceholder}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMed(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleApprove(editingMed.id, editSlots, editNote)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  Save & Approve
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Read-Only Audit List (MANDATORY REQUIREMENT) */}
      {(activeTab === 'audit' || activeTab === 'meds') && (
        <div className="mt-8 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-slate-600" />
          <h3 className="text-base font-bold text-slate-900">
            {t.nurse.auditTrailTitle}
          </h3>
        </div>

        {auditLogs.length > 0 ? (
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] mb-1">
                  <span>{log.action} · Actor: {log.actor_name} ({log.actor_role})</span>
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-slate-800 font-medium">{log.new_value}</p>
                {log.old_value && (
                  <p className="text-[11px] text-slate-500 mt-0.5">Previous: {log.old_value}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            No audit events logged yet for this discharge summary.
          </p>
        )}
      </div>
    )}

    </div>
  );
};
