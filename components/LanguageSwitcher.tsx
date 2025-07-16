import React, { useState, useRef, useEffect } from 'react';

// A globe icon for the switcher button
const GlobeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

interface LanguageSwitcherProps {
  language: string;
  setLanguage: (lang: 'en' | 'my') => void;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ language, setLanguage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectLanguage = (lang: 'en' | 'my') => {
    setLanguage(lang);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-sm text-gray-600 hover:text-black transition-colors px-3 py-1.5 rounded-md bg-gray-200/60 hover:bg-gray-300/60"
      >
        <GlobeIcon className="w-4 h-4" />
        <span>{language === 'en' ? 'English' : 'မြန်မာ'}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg border border-gray-200/80 z-20 animate-fadeInUp" style={{ animationDuration: '0.2s' }}>
          <ul className="py-1">
            <li>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); selectLanguage('en'); }}
                className={`block px-4 py-2 text-sm ${language === 'en' ? 'font-bold text-black' : 'text-gray-700'} hover:bg-gray-100`}
              >
                English
              </a>
            </li>
            <li>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); selectLanguage('my'); }}
                className={`block px-4 py-2 text-sm ${language === 'my' ? 'font-bold text-black' : 'text-gray-700'} hover:bg-gray-100`}
              >
                မြန်မာ
              </a>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
