import React, { useState, useRef } from 'react';
import { Upload, FileText, Camera, CheckCircle2, AlertCircle, RefreshCw, Sparkles, ArrowRight } from 'lucide-react';
import { Language, translations } from '../i18n';
import { api, DischargePlan } from '../api';
import { SafetyBox } from './SafetyBox';

interface UploadPageProps {
  lang: Language;
  onUploadSuccess: (dischargeId: string) => void;
}

export const UploadPage: React.FC<UploadPageProps> = ({ lang, onUploadSuccess }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const t = translations[lang];

  const handleFileUpload = async (file: File) => {
    setErrorMessage(null);
    setSelectedFileName(file.name);

    // Image-quality check: if image is smaller than 4KB, show friendly re-scan notice
    if (file.size < 4096 && !file.type.includes('pdf')) {
      setErrorMessage(t.upload.rescanNotice);
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.uploadDischarge(formData);
      onUploadSuccess(res.id);
    } catch (err: any) {
      setErrorMessage(err.message || t.upload.rescanNotice);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSampleClick = async (sampleKey: 'sample1' | 'sample2' | 'sample3') => {
    setErrorMessage(null);
    setIsProcessing(true);
    setSelectedFileName(
      sampleKey === 'sample1' ? 'Sample_1_Cardio_AIIMS.pdf' :
      sampleKey === 'sample2' ? 'Sample_2_Clean_Max.pdf' :
      'Sample_3_Messy_Handwritten.pdf'
    );

    try {
      const formData = new FormData();
      formData.append('sampleKey', sampleKey);
      const res = await api.uploadDischarge(formData);
      onUploadSuccess(res.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load sample sheet');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Title */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
          Discharge Summary Ingestion
        </span>
        <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          {t.upload.title}
        </h2>
        <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
          {t.upload.subtitle}
        </p>
      </div>

      {/* Safety Notice */}
      <SafetyBox lang={lang} />

      {/* Upload Box / Dropzone */}
      <div className="bg-[#FFFDF9] rounded-3xl border-2 border-dashed border-[#DCD5C9] p-8 sm:p-12 text-center hover:border-[#1E6F5C] transition-colors shadow-sm relative overflow-hidden">
        
        {isProcessing ? (
          <div className="py-12 flex flex-col items-center">
            <RefreshCw className="w-12 h-12 text-[#1E6F5C] animate-spin mb-4" />
            <h3 className="text-lg font-bold text-[#242A35]">
              {t.upload.qualityChecking}
            </h3>
            <p className="mt-1 text-sm text-[#5A6270] max-w-sm">
              {t.upload.processingDoc}
            </p>
            {selectedFileName && (
              <span className="mt-4 inline-block text-xs font-mono bg-[#EFEBE4] text-[#5A6270] px-3 py-1 rounded-full">
                {selectedFileName}
              </span>
            )}
          </div>
        ) : (
          <div>
            <div className="w-16 h-16 rounded-2xl bg-[#EAF2ED] border border-[#D5E5DC] text-[#1E6F5C] mx-auto flex items-center justify-center mb-5">
              <Upload className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-[#242A35]">
              {t.upload.dropzoneTitle}
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-[#5A6270] max-w-md mx-auto">
              {t.upload.dropzoneDesc}
            </p>

            {/* Error / Rescan notification */}
            {errorMessage && (
              <div className="mt-6 max-w-lg mx-auto p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm flex flex-col gap-2.5 text-left shadow-sm">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Notice & Fallback Available:</p>
                    <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-amber-200 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-amber-900">Recommended for demo:</span>
                  <button
                    type="button"
                    onClick={() => handleSampleClick('sample1')}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-200 hover:bg-amber-300 text-amber-950 border border-amber-300 transition-colors cursor-pointer"
                  >
                    Sample 1 (Cardio)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSampleClick('sample2')}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-200 hover:bg-amber-300 text-amber-950 border border-amber-300 transition-colors cursor-pointer"
                  >
                    Sample 2 (Clean)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSampleClick('sample3')}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-200 hover:bg-amber-300 text-amber-950 border border-amber-300 transition-colors cursor-pointer"
                  >
                    Sample 3 (Messy)
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 rounded-xl font-semibold text-sm text-white bg-[#1E6F5C] hover:bg-[#18594A] shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>{t.upload.browseBtn}</span>
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="px-6 py-3 rounded-xl font-semibold text-sm text-[#3E4552] bg-[#EFEBE4] hover:bg-[#E5DFD6] border border-[#DDD6CA] transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4 text-[#5A6270]" />
                <span>Use Camera</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </div>
          </div>
        )}

      </div>

      {/* Synthetic Hospital Discharge Sheets */}
      <div className="mt-12 bg-[#F3EFE7] rounded-3xl p-6 sm:p-8 border border-[#E4DDD1]">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-[#1E6F5C]" />
          <h3 className="text-base sm:text-lg font-bold text-[#242A35]">
            {t.upload.trySampleTitle}
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-[#5A6270] mb-6">
          Test the end-to-end extraction, deterministic clinical rules engine, and nurse verification with these realistic synthetic samples:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Sample 1 */}
          <div className="bg-[#FFFDF9] rounded-2xl p-5 border border-[#EAE5DB] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  SAMPLE 1
                </span>
                <span className="text-[11px] text-amber-600 font-semibold">1 Item Flagged</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                {t.upload.sample1Btn}
              </h4>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                {t.upload.sample1Desc}
              </p>
            </div>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleSampleClick('sample1')}
              className="mt-4 w-full py-2.5 px-3 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Test Sample 1 Flow</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sample 2 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  SAMPLE 2
                </span>
                <span className="text-[11px] text-emerald-600 font-semibold">100% Clear</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                {t.upload.sample2Btn}
              </h4>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                {t.upload.sample2Desc}
              </p>
            </div>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleSampleClick('sample2')}
              className="mt-4 w-full py-2.5 px-3 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Test Sample 2 Flow</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sample 3 */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  SAMPLE 3
                </span>
                <span className="text-[11px] text-rose-600 font-semibold">Needs Nurse Check</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                {t.upload.sample3Btn}
              </h4>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                {t.upload.sample3Desc}
              </p>
            </div>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleSampleClick('sample3')}
              className="mt-4 w-full py-2.5 px-3 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Test Sample 3 Flow</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
