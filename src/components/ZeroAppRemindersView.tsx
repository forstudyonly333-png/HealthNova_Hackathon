import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Smartphone, 
  ShieldCheck, 
  RefreshCw, 
  ArrowRight, 
  Sparkles,
  Check,
  User,
  History,
  Info
} from 'lucide-react';
import { api, WhatsAppMessageRecord, DischargePlan } from '../api';
import { Language, translations } from '../i18n';

interface ZeroAppRemindersViewProps {
  lang: Language;
  discharge: DischargePlan | null;
  onDoseUpdated?: () => void;
}

export const ZeroAppRemindersView: React.FC<ZeroAppRemindersViewProps> = ({
  lang,
  discharge,
  onDoseUpdated,
}) => {
  const t = translations[lang];

  const dischargeId = discharge?.id || 'dis_sample_1';
  const patientName = discharge?.patient_name || 'Sita Devi';

  const [selectedSlot, setSelectedSlot] = useState<'subah' | 'dopahar' | 'shaam' | 'raat'>('subah');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccessNotice, setSendSuccessNotice] = useState<string | null>(null);

  // Phone Simulator state
  const [simulatedReplyText, setSimulatedReplyText] = useState('1');
  const [isSimulatingReply, setIsSimulatingReply] = useState(false);
  const [simulationResult, setSimulationResult] = useState<{
    actionTaken: string;
    confirmationReply: string;
    isUrgent: boolean;
  } | null>(null);

  // Message Log
  const [messages, setMessages] = useState<WhatsAppMessageRecord[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const loadMessages = async () => {
    setLoadingMessages(true);
    try {
      const list = await api.getWhatsAppMessages(dischargeId);
      setMessages(list);
    } catch (err) {
      console.warn('Could not load WhatsApp messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [dischargeId]);

  // Dispatch reminder from server
  const handleSendReminder = async () => {
    setIsSending(true);
    setSendSuccessNotice(null);
    try {
      const res = await api.sendDoseReminder(dischargeId, selectedSlot);
      setSendSuccessNotice(`Reminder dispatched for ${selectedSlot.toUpperCase()} slot!`);
      await loadMessages();
      setTimeout(() => setSendSuccessNotice(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Failed to dispatch reminder');
    } finally {
      setIsSending(false);
    }
  };

  // Simulate patient reply (e.g. '1', '2', '3')
  const handleSimulateReply = async (textToSend: string) => {
    setIsSimulatingReply(true);
    setSimulationResult(null);
    try {
      const res = await api.simulateWhatsAppReply(textToSend, dischargeId);
      setSimulationResult(res);
      await loadMessages();
      if (onDoseUpdated) {
        onDoseUpdated();
      }
    } catch (err: any) {
      alert(err?.message || 'Simulation error');
    } finally {
      setIsSimulatingReply(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-[#14473B] via-[#1E6F5C] to-[#25826D] text-white rounded-3xl p-6 sm:p-8 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-lg">
              <MessageSquare className="w-7 h-7 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-emerald-100 text-[10px] font-bold uppercase tracking-wider">
                  Zero-App Adherence
                </span>
                <span className="text-xs text-emerald-100/80">
                  Provider: SimulatedProvider (Standard)
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight">
                Zero-App WhatsApp Medicine Reminders
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
                Families do not need to install or open any app. The server sends automated WhatsApp messages at scheduled dose times, and the patient or caregiver replies with a single number (<strong>1 = Taken</strong>) to confirm adherence.
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-xs shrink-0 sm:max-w-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-200">
              <ShieldCheck className="w-4 h-4" />
              <span>Provider Abstraction</span>
            </div>
            <p className="text-[11px] text-white/90 leading-relaxed">
              Active: <strong>SimulatedProvider</strong> (configurable via <code>WHATSAPP_PROVIDER</code> env). Ready for Meta WhatsApp Cloud API or Twilio.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Server Trigger & Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Dispatch Dose Reminder Panel */}
          <div className="bg-[#FFFDF9] rounded-3xl border border-[#EAE5DB] p-6 sm:p-7 shadow-xs space-y-5">
            <div className="border-b border-[#EAE5DB] pb-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1E6F5C] mb-1">
                <Clock className="w-4 h-4" />
                <span>Scheduled Dose Dispatch</span>
              </div>
              <h3 className="text-lg font-bold text-[#242A35]">
                Trigger Server Dose Reminder for {patientName}
              </h3>
              <p className="text-xs text-[#5A6270] mt-0.5">
                Select a medication slot to dispatch the localized WhatsApp prompt to the patient&apos;s phone.
              </p>
            </div>

            {sendSuccessNotice && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{sendSuccessNotice}</span>
              </div>
            )}

            {/* Slot selector chips */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5A6270]">
                Choose Dose Time Slot:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'subah', label: 'Morning (Subah)', time: '8:00 AM' },
                  { id: 'dopahar', label: 'Afternoon (Dopahar)', time: '1:00 PM' },
                  { id: 'shaam', label: 'Evening (Shaam)', time: '6:00 PM' },
                  { id: 'raat', label: 'Night (Raat)', time: '8:30 PM' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSlot(s.id as any)}
                    className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                      selectedSlot === s.id
                        ? 'bg-[#1E6F5C] text-white border-[#1E6F5C] shadow-xs'
                        : 'bg-[#FAF7F2] text-[#242A35] border-[#DDD7CB] hover:bg-[#F3EDE2]'
                    }`}
                  >
                    <div className="text-xs font-bold leading-tight">{s.label.split(' ')[0]}</div>
                    <div className={`text-[10px] mt-0.5 ${selectedSlot === s.id ? 'text-emerald-100' : 'text-[#737C8B]'}`}>
                      {s.time}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Dispatch Action */}
            <div className="pt-2 flex items-center justify-between">
              <div className="text-xs text-[#737C8B]">
                Patient Ref: <strong className="font-mono text-[#242A35]">{dischargeId}</strong>
              </div>
              <button
                type="button"
                onClick={handleSendReminder}
                disabled={isSending}
                className="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20BA5A] active:bg-[#1CA04D] text-white text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 fill-current" />
                    <span>Send Dose Reminder Now</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Interactive Phone Simulator */}
          <div className="bg-[#FFFDF9] rounded-3xl border border-[#EAE5DB] p-6 sm:p-7 shadow-xs space-y-5">
            <div className="border-b border-[#EAE5DB] pb-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1E6F5C] mb-1">
                <Smartphone className="w-4 h-4" />
                <span>Zero-App Phone Simulator</span>
              </div>
              <h3 className="text-lg font-bold text-[#242A35]">
                Simulate Patient WhatsApp Reply
              </h3>
              <p className="text-xs text-[#5A6270] mt-0.5">
                Simulate the patient replying from their mobile phone to test immediate database adherence updates without launching an app.
              </p>
            </div>

            {/* Quick reply action pills */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5A6270]">
                Simulate Standard Number Replies:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSimulateReply('1')}
                  disabled={isSimulatingReply}
                  className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-950 text-left transition-all cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-emerald-700">Reply &ldquo;1&rdquo;</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-[11px] text-emerald-800 mt-1 font-medium">
                    &ldquo;Taken all doses&rdquo; → Marks medication as taken in care plan!
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleSimulateReply('2')}
                  disabled={isSimulatingReply}
                  className="p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 text-left transition-all cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-amber-700">Reply &ldquo;2&rdquo;</span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-[11px] text-amber-800 mt-1 font-medium">
                    &ldquo;Missed a dose&rdquo; → Returns safe non-doubling guidance.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleSimulateReply('3')}
                  disabled={isSimulatingReply}
                  className="p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-950 text-left transition-all cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-rose-700">Reply &ldquo;3&rdquo;</span>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  </div>
                  <p className="text-[11px] text-rose-800 mt-1 font-medium">
                    &ldquo;Need nurse help&rdquo; → Routes to Nurse Verification Station!
                  </p>
                </button>
              </div>
            </div>

            {/* Custom text reply input */}
            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5A6270]">
                Or Simulate Custom Text from Patient Phone:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={simulatedReplyText}
                  onChange={(e) => setSimulatedReplyText(e.target.value)}
                  placeholder="e.g. 1 or 'Feeling mild dizziness after morning tablet'"
                  className="flex-1 px-3.5 py-2.5 bg-[#FAF7F2] border border-[#DDD7CB] rounded-xl text-xs sm:text-sm text-[#242A35] focus:bg-white focus:ring-2 focus:ring-[#1E6F5C] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleSimulateReply(simulatedReplyText)}
                  disabled={isSimulatingReply || !simulatedReplyText.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#1E6F5C] hover:bg-[#18594A] text-white text-xs sm:text-sm font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>Send</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Simulation Response Callout */}
            {simulationResult && (
              <div className="p-4 rounded-2xl bg-[#EEF5F1] border border-[#BED6C8] space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-[#14473B]">
                  <span>Server Automated WhatsApp Response:</span>
                  <span className="px-2 py-0.5 rounded-full bg-white text-[10px] uppercase font-mono border border-[#BED6C8]">
                    {simulationResult.actionTaken}
                  </span>
                </div>
                <div className="text-xs text-[#242A35] leading-relaxed whitespace-pre-line font-medium bg-white p-3 rounded-xl border border-[#BED6C8]">
                  {simulationResult.confirmationReply}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Right Column: Live Message Feed (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#FFFDF9] rounded-3xl border border-[#EAE5DB] p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAE5DB] pb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1E6F5C]">
                <History className="w-4 h-4" />
                <span>Live WhatsApp Message Log</span>
              </div>
              <button
                type="button"
                onClick={loadMessages}
                className="text-xs text-[#5A6270] hover:text-[#242A35] flex items-center gap-1 cursor-pointer"
                title="Refresh logs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingMessages ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {messages.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#737C8B]">
                No messages logged yet. Click &ldquo;Send Dose Reminder Now&rdquo; to test dispatching your first Zero-App reminder!
              </div>
            ) : (
              <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
                {messages.map((m) => {
                  const isOutbound = m.direction === 'outbound';
                  return (
                    <div
                      key={m.id}
                      className={`p-3.5 rounded-2xl text-xs space-y-1.5 transition-all ${
                        isOutbound
                          ? 'bg-[#EEF5F1] border border-[#CFE2D7] ml-2'
                          : 'bg-[#FAF7F2] border border-[#DDD7CB] mr-2'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-[#737C8B] font-mono">
                        <span className="font-bold flex items-center gap-1">
                          {isOutbound ? (
                            <span className="text-[#1E6F5C]">🟢 Outgoing Reminder</span>
                          ) : (
                            <span className="text-[#244265]">🔵 Incoming Reply</span>
                          )}
                          <span>· {m.recipient_phone}</span>
                        </span>
                        <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div className="text-[11px] text-[#242A35] leading-relaxed whitespace-pre-line break-words">
                        {m.message_text}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[#737C8B] pt-0.5">
                        <span>Status: <strong className="text-emerald-700">{m.status}</strong></span>
                        <span>Provider: {m.provider}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
};
