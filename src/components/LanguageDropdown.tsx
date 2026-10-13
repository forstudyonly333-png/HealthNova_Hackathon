import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Globe, Search, Check, ChevronDown } from 'lucide-react';
import { Language, LANGUAGES, LanguageMeta, getLanguageMeta } from '../i18n';

interface LanguageDropdownProps {
  currentLang: Language;
  onSelectLanguage: (lang: Language) => void;
}

export const LanguageDropdown: React.FC<LanguageDropdownProps> = ({
  currentLang,
  onSelectLanguage,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentMeta = getLanguageMeta(currentLang);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Group languages: Top (English, Hindi), Rajasthani, Scheduled (alphabetical)
  const groupedLanguages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const matches = (l: LanguageMeta) =>
      l.name.toLowerCase().includes(query) ||
      l.englishName.toLowerCase().includes(query) ||
      l.id.toLowerCase().includes(query);

    const filtered = query ? LANGUAGES.filter(matches) : LANGUAGES;

    const top = filtered.filter((l) => l.group === 'top');
    const rajasthani = filtered.filter((l) => l.group === 'rajasthani');
    const scheduled = filtered
      .filter((l) => l.group === 'scheduled')
      .sort((a, b) => a.englishName.localeCompare(b.englishName));

    return { top, rajasthani, scheduled };
  }, [searchQuery]);

  const handleSelect = (lang: Language) => {
    onSelectLanguage(lang);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      
      {/* Trigger Button - Compact, matching existing navbar style */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 hover:border-emerald-600 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 shadow-sm"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span className="font-medium truncate max-w-[110px]">{currentMeta.name}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          
          {/* Search Box */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/80">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search language (भाषा खोजें)..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 bg-white"
              />
            </div>
          </div>

          {/* Languages List */}
          <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-100">
            
            {/* Top Languages (English, Hindi) */}
            {groupedLanguages.top.length > 0 && (
              <div className="pb-2">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Standard / मानक
                </div>
                {groupedLanguages.top.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => handleSelect(l.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left ${
                      currentLang === l.id
                        ? 'bg-emerald-50 text-emerald-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="font-semibold">{l.name}</span>
                      <span className="text-[11px] text-slate-400 ml-1.5">({l.englishName})</span>
                    </div>
                    {currentLang === l.id && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </button>
                ))}
              </div>
            )}

            {/* Rajasthani Group */}
            {groupedLanguages.rajasthani.length > 0 && (
              <div className="py-2">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center justify-between">
                  <span>राजस्थानी बोलियां (Rajasthani)</span>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">Regional</span>
                </div>
                {groupedLanguages.rajasthani.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => handleSelect(l.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left ${
                      currentLang === l.id
                        ? 'bg-emerald-50 text-emerald-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="font-semibold">{l.name}</span>
                      <span className="text-[11px] text-slate-400 ml-1.5">({l.englishName})</span>
                    </div>
                    {currentLang === l.id && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </button>
                ))}
              </div>
            )}

            {/* Scheduled Languages */}
            {groupedLanguages.scheduled.length > 0 && (
              <div className="pt-2">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Scheduled Languages / अनुसूचित भाषाएं
                </div>
                {groupedLanguages.scheduled.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => handleSelect(l.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left ${
                      currentLang === l.id
                        ? 'bg-emerald-50 text-emerald-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="font-semibold">{l.name}</span>
                      <span className="text-[11px] text-slate-400 ml-1.5">({l.englishName})</span>
                      {l.dir === 'rtl' && (
                        <span className="ml-1 text-[9px] text-amber-600 font-mono">RTL</span>
                      )}
                    </div>
                    {currentLang === l.id && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </button>
                ))}
              </div>
            )}

            {groupedLanguages.top.length === 0 &&
              groupedLanguages.rajasthani.length === 0 &&
              groupedLanguages.scheduled.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400">
                  No language found matching &ldquo;{searchQuery}&rdquo;
                </div>
              )}

          </div>

        </div>
      )}

    </div>
  );
};
