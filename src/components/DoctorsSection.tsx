import React, { useState, useMemo } from 'react';
import { Search, Stethoscope, Award, Building, Star, CheckCircle, ArrowRight } from 'lucide-react';
import { Doctor } from '../types';
import { Language, translations } from '../i18n';

interface DoctorsSectionProps {
  doctors: Doctor[];
  selectedDoctor: Doctor;
  onSelectDoctor: (doctor: Doctor) => void;
  lang?: Language;
}

export const DoctorsSection: React.FC<DoctorsSectionProps> = ({
  doctors,
  selectedDoctor,
  onSelectDoctor,
  lang = 'en',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const t = translations[lang];
  const d = t.doctors || {
    title: 'Our Doctors',
    badge: 'Our Medical Experts',
    subtitle: 'Consult experienced medical specialists and physiotherapy experts dedicated to your personalized healing and wellbeing.',
    searchPlaceholder: 'Search by doctor name, specialty, or qualification...',
    searchBtn: 'Search',
    clearBtn: 'Clear',
    showingResults: 'Showing {n} results',
    consultBtn: 'Connect with me',
    experience: 'Experience',
    qualifications: 'Qualification',
    hospitalAffiliation: 'Organization',
    specialty: 'Specialization',
  };

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const matchSearch =
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.qualifications.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [doctors, searchTerm]);

  return (
    <section id="doctors" className="py-20 bg-slate-50 border-t border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            {d.badge}
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            {d.title}
          </h2>
          <p className="mt-3 text-slate-600 text-base">
            {d.subtitle}
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto mb-12">
          <div className="relative flex items-center shadow-sm rounded-xl overflow-hidden bg-white border border-slate-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20 transition-all">
            <div className="pl-4 text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={d.searchPlaceholder}
              className="w-full px-3 py-3.5 text-sm text-slate-900 bg-transparent placeholder-slate-400 focus:outline-none"
              aria-label="Search doctors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="px-2 text-xs text-slate-400 hover:text-slate-600"
              >
                {d.clearBtn}
              </button>
            )}
            <button
              type="button"
              className="px-6 py-3.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-colors shrink-0"
            >
              {d.searchBtn}
            </button>
          </div>
          {searchTerm && (
            <p className="mt-2 text-xs text-slate-500 text-center">
              {d.showingResults.replace('{n}', String(filteredDoctors.length))} &ldquo;{searchTerm}&rdquo;
            </p>
          )}
        </div>

        {/* Doctors Grid */}
        {filteredDoctors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredDoctors.map((doc) => {
              const isSelected = selectedDoctor.id === doc.id;
              return (
                <div
                  key={doc.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col overflow-hidden ${
                    isSelected
                      ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                      : 'border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300'
                  }`}
                >
                  {/* Doctor Profile Illustration Container */}
                  <div className="relative p-6 pb-2 flex flex-col items-center bg-gradient-to-b from-slate-50/80 to-transparent">
                    <div className="relative w-36 h-36 rounded-full p-1 bg-white shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden">
                      <img
                        src={doc.image}
                        alt={`Dr. ${doc.name}`}
                        className="w-full h-full object-contain transition-transform hover:scale-105 duration-300"
                        onError={(e) => {
                          // Fallback to placeholder if image fails
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    {/* Verified Badge */}
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md font-medium">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Verified Specialist</span>
                    </div>
                  </div>

                  {/* Doctor Profile Details (Retaining original fields faithfully) */}
                  <div className="p-6 pt-3 flex-1 flex flex-col text-center">
                    {/* Doctor Name */}
                    <h3 className="text-xl font-bold text-slate-900">
                      Dr. {doc.name}
                    </h3>

                    {/* Metadata list */}
                    <div className="mt-4 space-y-2 text-left bg-slate-50/80 rounded-xl p-3.5 border border-slate-100 text-sm">
                      <div className="flex items-start gap-2">
                        <Award className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-semibold text-slate-500 block">{d.qualifications}</span>
                          <span className="font-medium text-slate-800">{doc.qualifications}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Stethoscope className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-semibold text-slate-500 block">{d.specialty}</span>
                          <span className="font-medium text-emerald-800">{doc.specialization}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Building className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-semibold text-slate-500 block">{d.hospitalAffiliation}</span>
                          <span className="font-mono text-xs text-slate-700">{doc.organization}</span>
                        </div>
                      </div>
                    </div>

                    {/* Connect With Me CTA Button */}
                    <div className="mt-6 pt-2">
                      <button
                        type="button"
                        onClick={() => onSelectDoctor(doc)}
                        className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                          isSelected
                            ? 'bg-emerald-700 text-white shadow'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow'
                        }`}
                      >
                        <span>{d.consultBtn}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 max-w-md mx-auto">
            <p className="text-slate-600 text-base">No doctor found matching your search.</p>
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="mt-4 px-4 py-2 text-sm font-semibold text-emerald-700 hover:underline"
            >
              Reset search
            </button>
          </div>
        )}

      </div>
    </section>
  );
};
