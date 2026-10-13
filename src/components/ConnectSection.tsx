import React, { useState, useRef } from 'react';
import { 
  Send, 
  Video, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  X, 
  Award, 
  Stethoscope, 
  Building, 
  Clock, 
  UserCheck 
} from 'lucide-react';
import { Doctor, ContactFormData } from '../types';
import { Language, translations } from '../i18n';

interface ConnectSectionProps {
  selectedDoctor: Doctor;
  allDoctors: Doctor[];
  onSelectDoctor: (doctor: Doctor) => void;
  lang?: Language;
}

export const ConnectSection: React.FC<ConnectSectionProps> = ({
  selectedDoctor,
  allDoctors,
  onSelectDoctor,
  lang = 'en',
}) => {
  const t = translations[lang];
  const c = t.connect || {
    title: 'Connect With Our Doctors',
    badge: 'Consultation Portal',
    subtitle: 'Send your health query, schedule an in-person or video appointment, and share reports securely with your assigned physician.',
    formTitle: 'Connect with me',
    fullName: 'Name',
    fullNamePlaceholder: 'Enter your full name',
    mobile: 'Mobile Number',
    mobilePlaceholder: 'Enter your mobile number',
    address: 'Address',
    addressPlaceholder: 'Enter your city or address',
    healthConcern: 'Health Issue',
    healthConcernPlaceholder: 'e.g., Cardiology recovery, High BP...',
    query: 'Your Query (Optional)',
    queryPlaceholder: 'Describe your symptoms or questions in detail...',
    attachSummary: 'Attach Reports',
    sendBtn: 'Submit',
    videoBtn: 'Request Video Call',
  };

  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    mobile: '',
    address: '',
    issue: '',
    query: '',
    uploadedFileName: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submissionStatus, setSubmissionStatus] = useState<
    'idle' | 'submitting' | 'submitted' | 'video_requested'
  >('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) {
      errs.name = 'Please provide your name.';
    }
    if (!formData.mobile.trim()) {
      errs.mobile = 'Please provide your mobile number.';
    } else if (!/^[0-9+\-\s()]{7,15}$/.test(formData.mobile.trim())) {
      errs.mobile = 'Please enter a valid phone number (at least 7 digits).';
    }
    if (!formData.issue.trim()) {
      errs.issue = 'Please specify your health issue or concern.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmissionStatus('submitting');
    setTimeout(() => {
      setSubmissionStatus('submitted');
      setStatusMessage(
        `Thank you, ${formData.name}. Your inquiry has been forwarded to Dr. ${selectedDoctor.name}. A clinic representative will contact you at ${formData.mobile} within 24 hours.`
      );
    }, 600);
  };

  const handleVideoCallRequest = () => {
    if (!validate()) return;

    setSubmissionStatus('submitting');
    setTimeout(() => {
      setSubmissionStatus('video_requested');
      setStatusMessage(
        `Telehealth video consultation request logged for Dr. ${selectedDoctor.name}. Please ensure your mobile (${formData.mobile}) is reachable for the video link confirmation.`
      );
    }, 600);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds 10MB limit. Please upload a smaller file.');
        return;
      }
      setFormData((prev) => ({ ...prev, uploadedFileName: file.name }));
    }
  };

  const handleRemoveFile = () => {
    setFormData((prev) => ({ ...prev, uploadedFileName: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      mobile: '',
      address: '',
      issue: '',
      query: '',
      uploadedFileName: '',
    });
    setErrors({});
    setSubmissionStatus('idle');
    setStatusMessage('');
  };

  return (
    <section id="contact" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            {c.badge}
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            {c.title}
          </h2>
          <p className="mt-3 text-slate-600 text-base">
            {c.subtitle}
          </p>
        </div>

        {/* Two-Column Grid: Left (Doctor Card) / Right (Connect with me Form) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Selected Doctor Card (Faithful to original screenshot) */}
          <div className="lg:col-span-5 bg-slate-50 rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 mb-6">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Assigned Specialist
              </span>
              <div className="text-xs text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded font-medium">
                Active Selection
              </div>
            </div>

            {/* Doctor Avatar */}
            <div className="flex flex-col items-center text-center">
              <div className="w-40 h-40 rounded-full p-2 bg-white shadow-sm border border-slate-200 overflow-hidden flex items-center justify-center">
                <img
                  src={selectedDoctor.image}
                  alt={selectedDoctor.name}
                  className="w-full h-full object-contain"
                />
              </div>

              <h3 className="mt-5 text-2xl font-bold text-slate-900">
                Dr. {selectedDoctor.name}
              </h3>
            </div>

            {/* Structured Info Card (Preserving original labels) */}
            <div className="mt-6 space-y-3 bg-white rounded-xl p-4 border border-slate-200/90 text-sm">
              <div>
                <span className="text-xs text-slate-500 font-semibold block">Qualification:</span>
                <span className="font-medium text-slate-800">{selectedDoctor.qualifications}</span>
              </div>

              <div>
                <span className="text-xs text-slate-500 font-semibold block">Specialization:</span>
                <span className="font-medium text-emerald-700">{selectedDoctor.specialization}</span>
              </div>

              <div>
                <span className="text-xs text-slate-500 font-semibold block">Organization:</span>
                <span className="font-mono text-xs text-slate-600">{selectedDoctor.organization}</span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{selectedDoctor.availability}</span>
              </div>
            </div>

            {/* Quick Switch Doctor option */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <label htmlFor="doctor-switch" className="block text-xs font-semibold text-slate-500 mb-2">
                Need a different specialist?
              </label>
              <select
                id="doctor-switch"
                value={selectedDoctor.id}
                onChange={(e) => {
                  const found = allDoctors.find((d) => d.id === e.target.value);
                  if (found) onSelectDoctor(found);
                }}
                className="w-full text-sm bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {allDoctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.name} ({doc.specialization})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Column: Connect Form */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <h3 className="text-2xl font-bold text-slate-900 border-b border-slate-200 pb-4 mb-6">
              {c.formTitle}
            </h3>

            {/* Success / Status Banner */}
            {submissionStatus === 'submitted' || submissionStatus === 'video_requested' ? (
              <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-base">
                      {submissionStatus === 'video_requested'
                        ? 'Video Consultation Request Queued'
                        : 'Query Submitted Successfully'}
                    </h4>
                    <p className="mt-2 text-sm text-emerald-800 leading-relaxed">
                      {statusMessage}
                    </p>
                    {formData.uploadedFileName && (
                      <p className="mt-2 text-xs text-emerald-700 flex items-center gap-1.5 font-medium">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Attached Document: {formData.uploadedFileName}</span>
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleReset}
                      className="mt-5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm"
                    >
                      Send Another Message
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Name */}
                <div>
                  <label htmlFor="patient-name" className="block text-sm font-semibold text-slate-700 mb-1">
                    {c.fullName}: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="patient-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (errors.name) setErrors({ ...errors, name: '' });
                    }}
                    placeholder={c.fullNamePlaceholder}
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 ${
                      errors.name
                        ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/20'
                        : 'border-slate-300 focus:border-emerald-600 focus:ring-emerald-600/20'
                    }`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.name}
                    </p>
                  )}
                </div>

                {/* Mobile Number */}
                <div>
                  <label htmlFor="patient-mobile" className="block text-sm font-semibold text-slate-700 mb-1">
                    {c.mobile}: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="patient-mobile"
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => {
                      setFormData({ ...formData, mobile: e.target.value });
                      if (errors.mobile) setErrors({ ...errors, mobile: '' });
                    }}
                    placeholder={c.mobilePlaceholder}
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 ${
                      errors.mobile
                        ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/20'
                        : 'border-slate-300 focus:border-emerald-600 focus:ring-emerald-600/20'
                    }`}
                  />
                  {errors.mobile && (
                    <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.mobile}
                    </p>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label htmlFor="patient-address" className="block text-sm font-semibold text-slate-700 mb-1">
                    {c.address}:
                  </label>
                  <input
                    id="patient-address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder={c.addressPlaceholder}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-colors"
                  />
                </div>

                {/* Issue */}
                <div>
                  <label htmlFor="patient-issue" className="block text-sm font-semibold text-slate-700 mb-1">
                    {c.healthConcern}: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="patient-issue"
                    type="text"
                    value={formData.issue}
                    onChange={(e) => {
                      setFormData({ ...formData, issue: e.target.value });
                      if (errors.issue) setErrors({ ...errors, issue: '' });
                    }}
                    placeholder={c.healthConcernPlaceholder}
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 ${
                      errors.issue
                        ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/20'
                        : 'border-slate-300 focus:border-emerald-600 focus:ring-emerald-600/20'
                    }`}
                  />
                  {errors.issue && (
                    <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.issue}
                    </p>
                  )}
                </div>

                {/* Your Query */}
                <div>
                  <label htmlFor="patient-query" className="block text-sm font-semibold text-slate-700 mb-1">
                    {c.query}:
                  </label>
                  <textarea
                    id="patient-query"
                    rows={4}
                    value={formData.query}
                    onChange={(e) => setFormData({ ...formData, query: e.target.value })}
                    placeholder={c.queryPlaceholder}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-colors resize-y"
                  />
                </div>

                {/* Uploaded File display */}
                {formData.uploadedFileName && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate font-medium">{formData.uploadedFileName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded"
                      aria-label="Remove uploaded file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="hidden"
                />

                {/* Action Buttons */}
                <div className="pt-4 space-y-4">
                  <button
                    type="submit"
                    disabled={submissionStatus === 'submitting'}
                    className="w-full py-3 px-6 rounded-xl font-semibold text-base text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submissionStatus === 'submitting' ? 'Submitting...' : c.sendBtn}</span>
                  </button>

                  {/* Clean Divider */}
                  <div className="relative flex items-center justify-center">
                    <div className="border-t border-slate-200 w-full" />
                    <span className="bg-white px-3 text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      - or -
                    </span>
                  </div>

                  {/* Secondary Buttons Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={handleVideoCallRequest}
                      disabled={submissionStatus === 'submitting'}
                      className="py-3 px-4 rounded-xl font-semibold text-sm text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                    >
                      <Video className="w-4 h-4 text-emerald-700" />
                      <span>{c.videoBtn}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="py-3 px-4 rounded-xl font-semibold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-600"
                    >
                      <Upload className="w-4 h-4 text-slate-600" />
                      <span>{formData.uploadedFileName ? 'Change File' : c.attachSummary}</span>
                    </button>
                  </div>

                </div>

              </form>
            )}

          </div>

        </div>

      </div>
    </section>
  );
};
