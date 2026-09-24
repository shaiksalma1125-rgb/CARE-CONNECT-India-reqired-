import React, { useState, useRef, useEffect } from 'react';
import {
  Home,
  Search,
  Calendar,
  MessageSquare,
  AlertTriangle,
  Building2,
  Activity,
  Sliders,
  ShieldCheck,
  ChevronDown,
  PhoneCall,
  Menu,
  X,
  User as UserIcon,
  LogOut,
  Video,
  FileText,
  GitFork,
  TestTube,
  Clock,
  Award,
  HeartPulse,
  Globe
} from 'lucide-react';
import { User, LanguageCode } from '../types';
import { translations } from '../utils/translations';

interface NavbarProps {
  currentUser: User | null;
  currentView: string;
  onNavigate: (view: string, payload?: any) => void;
  onLogout: () => void;
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  highContrast: boolean;
  onToggleContrast?: () => void;
  onToggleHighContrast?: () => void;
  fontScale?: 'normal' | 'large' | 'xlarge' | number;
  onChangeFontScale?: (scale: 'normal' | 'large' | 'xlarge' | number) => void;
  onSwitchRoleQuick?: (role: 'CITIZEN' | 'HOSPITAL_STAFF' | 'ADMIN') => void;
  onSwitchRole?: (role: 'CITIZEN' | 'HOSPITAL_STAFF' | 'ADMIN') => void;
  onOpenLogin?: () => void;
  onOpenRegister?: () => void;
  onOpenEmergencySOS?: () => void;
  onRefreshAll?: () => void;
  isRefreshing?: boolean;
  lastRefreshedText?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentView,
  onNavigate,
  onLogout,
  language,
  onLanguageChange,
  highContrast,
  onToggleContrast,
  onToggleHighContrast,
  fontScale = 'normal',
  onChangeFontScale,
  onSwitchRoleQuick,
  onSwitchRole,
  onOpenLogin,
  onOpenRegister,
  onOpenEmergencySOS,
  onRefreshAll,
  isRefreshing = false,
  lastRefreshedText
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showA11yMenu, setShowA11yMenu] = useState(false);
  const [showServicesMenu, setShowServicesMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const t = translations[language];

  const servicesMenuRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (servicesMenuRef.current && !servicesMenuRef.current.contains(event.target as Node)) {
        setShowServicesMenu(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clinicalServices = [
    { id: 'teleconsultation', label: t.teleconsultation || 'Teleconsultation', icon: Video },
    { id: 'triage', label: t.digitalTriage || 'Digital Triage', icon: Activity },
    { id: 'health-records', label: t.healthRecords || 'Health Records (ABHA)', icon: FileText },
    { id: 'referrals', label: t.referralTracking || 'Inter-Hospital Referrals', icon: GitFork },
    { id: 'diagnostics', label: t.diagnosticServices || 'Lab Diagnostics & Tests', icon: TestTube },
    { id: 'queue', label: t.appointmentQueue || 'Live OPD Queue & Wait-Time', icon: Clock },
    { id: 'high-risk', label: t.highRiskFollowUp || 'High-Risk Care Continuity', icon: HeartPulse },
    { id: 'quality-dashboard', label: t.facilityQuality || 'Public Hospital Quality Ratings', icon: Award }
  ];

  const handleRoleSwitch = (role: 'CITIZEN' | 'HOSPITAL_STAFF' | 'ADMIN') => {
    if (typeof onSwitchRoleQuick === 'function') {
      onSwitchRoleQuick(role);
    } else if (typeof onSwitchRole === 'function') {
      onSwitchRole(role);
    }
  };

  const handleToggleContrast = () => {
    if (typeof onToggleContrast === 'function') {
      onToggleContrast();
    } else if (typeof onToggleHighContrast === 'function') {
      onToggleHighContrast();
    }
  };

  const currentScale: 'normal' | 'large' | 'xlarge' =
    typeof fontScale === 'number'
      ? fontScale > 120
        ? 'xlarge'
        : fontScale > 105
        ? 'large'
        : 'normal'
      : fontScale === 'large' || fontScale === 'xlarge'
      ? fontScale
      : 'normal';

  const navItems = [
    { id: 'home', label: t.home || 'Home', icon: Home },
    { id: 'search', label: t.searchHealthcare || 'Search Healthcare', icon: Search },
    { id: 'hospitals', label: t.hospitals || 'Hospitals', icon: Building2 },
    { id: 'my-appointments', label: t.appointments || 'Appointments', icon: Calendar },
    { id: 'feedback', label: t.feedback || 'Feedback', icon: MessageSquare },
    { id: 'complaints', label: t.complaints || 'Complaints', icon: AlertTriangle }
  ];

  const languageLabels: Record<LanguageCode, string> = {
    en: 'English',
    hi: 'हिन्दी',
    te: 'తెలుగు'
  };

  const userName = currentUser?.name || 'Shaik Salma';
  const userRole = String(currentUser?.role || 'CITIZEN').replace(/_/g, ' ');

  return (
    <header
      id="main-navbar"
      className={`sticky top-0 z-50 transition-colors w-full ${
        highContrast
          ? 'bg-black text-yellow-300 border-b border-yellow-400'
          : 'bg-[#0B2545] text-white'
      }`}
    >
      {/* Top Bar: Dark Navy Header (matching reference image) */}
      <div className="w-full border-b border-blue-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-3">
          {/* Left: Care Connect India Brand with Blue Heart/Family Icon */}
          <button
            id="brand-logo-btn"
            type="button"
            onClick={() =>
              onNavigate(
                currentUser?.role === 'HOSPITAL_STAFF'
                  ? 'staff-dashboard'
                  : currentUser?.role === 'ADMIN' || currentUser?.role === 'HOSPITAL_ADMIN'
                  ? 'admin-dashboard'
                  : 'home'
              )
            }
            className="flex items-center gap-3 text-left focus:outline-hidden focus:ring-2 focus:ring-blue-400 rounded-xl py-1 pr-2 shrink-0 cursor-pointer"
          >
            {/* Blue circle with heart & family silhouette */}
            <div className="w-11 h-11 rounded-full bg-[#1E65B8] flex items-center justify-center shrink-0 shadow-xs">
              <svg
                viewBox="0 0 36 36"
                className="w-7 h-7"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Outer white heart */}
                <path
                  d="M18 29.5C18 29.5 7.5 22.8 7.5 15C7.5 11 10.5 8 14.5 8C16.8 8 18 9.5 18 9.5C18 9.5 19.2 8 21.5 8C25.5 8 28.5 11 28.5 15C28.5 22.8 18 29.5 18 29.5Z"
                  fill="white"
                />
                {/* Parent silhouette inside */}
                <circle cx="15" cy="14.5" r="2" fill="#1E65B8" />
                <path
                  d="M11 21.5C11 18.5 13.5 17 15.5 17C17.5 17 19.5 18.5 20 21.5"
                  stroke="#1E65B8"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {/* Child silhouette inside */}
                <circle cx="21" cy="16.5" r="1.6" fill="#1E65B8" />
                <path
                  d="M18.5 22C19 20 20.5 19 21.8 19C23.2 19 25 20 25 22.5"
                  stroke="#1E65B8"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-tight whitespace-nowrap">
                Care Connect India
              </span>
              <span className="text-xs sm:text-[13px] text-blue-200 font-medium leading-tight whitespace-nowrap">
                {t.subtitle || 'Accessibility & Quality of Public Healthcare Services'}
              </span>
            </div>
          </button>

          {/* Center: Portal Selectors (Citizen, Staff, Admin) */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-900/50 p-1 rounded-2xl border border-blue-900/40">
            <button
              id="portal-citizen-link"
              type="button"
              onClick={() => onNavigate('home')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentView !== 'staff-dashboard' && currentView !== 'admin-dashboard'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Citizen Portal
            </button>
            <button
              id="portal-staff-link"
              type="button"
              onClick={() => onNavigate('staff-dashboard')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'staff-dashboard'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Hospital Staff Portal
            </button>
            <button
              id="portal-admin-link"
              type="button"
              onClick={() => onNavigate('admin-dashboard')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'admin-dashboard'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Hospital Admin Portal
            </button>
          </div>

          {/* Right: 108 SOS Button & User Profile / Login */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* 108 SOS Red Button */}
            {onOpenEmergencySOS && (
              <button
                id="nav-108-sos-btn"
                type="button"
                onClick={onOpenEmergencySOS}
                className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 bg-[#E11D48] hover:bg-[#BE123C] active:bg-[#9F1239] text-white rounded-full text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0 animate-pulse"
                title="Dial 108 Emergency Ambulance Escalation"
              >
                <PhoneCall className="w-3.5 h-3.5 fill-white" />
                <span className="font-extrabold tracking-wide whitespace-nowrap">108 SOS</span>
              </button>
            )}

            {/* Profile Dropdown matching Reference Image */}
            <div className="relative">
              <button
                id="user-profile-btn"
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 py-1 px-1.5 sm:px-2 rounded-full hover:bg-white/10 transition-colors text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-left leading-tight">
                  <span className="font-bold text-white text-xs block truncate max-w-[120px]">
                    {userName}
                  </span>
                  <span className="text-[10px] text-blue-200/90 font-bold uppercase tracking-wider block">
                    {userRole}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-300 hidden md:block" />
              </button>

              {/* Profile Menu Dropdown */}
              {showProfileMenu && (
                <div
                  className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 text-xs text-slate-800 space-y-1"
                  onMouseLeave={() => setShowProfileMenu(false)}
                >
                  <div className="px-3 py-2 border-b border-slate-100">
                    <span className="font-bold text-slate-900 block truncate">{userName}</span>
                    <span className="text-[11px] text-slate-500 block truncate">
                      {currentUser?.email || 'shaiksalma1125@gmail.com'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onNavigate('profile');
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <UserIcon className="w-4 h-4 text-blue-600" />
                    <span>View Profile</span>
                  </button>

                  <div className="px-3 pt-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Switch Active Mode
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleRoleSwitch('CITIZEN');
                      onNavigate('home');
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>Citizen Portal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleRoleSwitch('HOSPITAL_STAFF');
                      onNavigate('staff-dashboard');
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Hospital Staff Portal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleRoleSwitch('ADMIN');
                      onNavigate('admin-dashboard');
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    <span>Hospital Admin Portal</span>
                  </button>

                  <div className="border-t border-slate-100 my-1"></div>

                  {currentUser ? (
                    <button
                      type="button"
                      onClick={() => {
                        onLogout();
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenLogin) onOpenLogin();
                          else onNavigate('login');
                          setShowProfileMenu(false);
                        }}
                        className="flex-1 text-center py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold cursor-pointer"
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenRegister) onOpenRegister();
                          else onNavigate('register');
                          setShowProfileMenu(false);
                        }}
                        className="flex-1 text-center py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer"
                      >
                        Register
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              id="mobile-menu-toggle"
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Second Bar: White Row with Nav Tabs and Language Dropdown (matching reference image) */}
      <div className="w-full bg-white text-slate-800 border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12 sm:h-13 gap-2">
            {/* Left: Tab Links & Digital Health */}
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none py-1 min-w-0">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-link-${item.id}`}
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                      isActive
                        ? 'text-blue-600 bg-blue-50/80 font-bold'
                        : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              </nav>

              {/* Digital Health Dropdown: Placed outside overflow-x-auto so it cannot be clipped */}
              <div ref={servicesMenuRef} className="relative shrink-0">
                <button
                  id="nav-clinical-services-btn"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowServicesMenu(!showServicesMenu);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    clinicalServices.some((s) => s.id === currentView)
                      ? 'text-blue-600 bg-blue-50/80 font-bold'
                      : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                  }`}
                >
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span>{t.digitalHealthServices || 'Digital Health'}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                      showServicesMenu ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {showServicesMenu && (
                  <div
                    className="absolute left-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-2 z-[999] text-xs space-y-1"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      Digital & Clinical Health Services
                    </div>
                    {clinicalServices.map((svc) => {
                      const SvcIcon = svc.icon;
                      const isSvcActive = currentView === svc.id;
                      return (
                        <button
                          key={svc.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate(svc.id);
                            setShowServicesMenu(false);
                          }}
                          className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left font-medium transition-colors cursor-pointer ${
                            isSvcActive
                              ? 'bg-blue-50 text-blue-700 font-bold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <SvcIcon className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="truncate">{svc.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Language Dropdown & Accessibility */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Clean Language Selector matching Reference Image */}
              <div ref={langMenuRef} className="relative">
                <button
                  id="nav-language-selector-btn"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLangMenu(!showLangMenu);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5 text-slate-500" />
                  <span>{languageLabels[language] || 'English'}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
                      showLangMenu ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {showLangMenu && (
                  <div
                    className="absolute right-0 top-full mt-2 w-36 bg-white rounded-xl shadow-2xl border border-slate-200/90 p-1.5 z-[999] text-xs space-y-1"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onLanguageChange('en');
                        setShowLangMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                        language === 'en' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onLanguageChange('hi');
                        setShowLangMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                        language === 'hi' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      हिन्दी
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onLanguageChange('te');
                        setShowLangMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                        language === 'te' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      తెలుగు
                    </button>
                  </div>
                )}
              </div>

              {/* Accessibility Settings Toggle */}
              <div className="relative">
                <button
                  id="a11y-settings-toggle"
                  type="button"
                  onClick={() => setShowA11yMenu(!showA11yMenu)}
                  title="Accessibility Preferences (Contrast & Font Size)"
                  aria-label="Accessibility settings"
                  className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>

                {showA11yMenu && (
                  <div
                    id="a11y-menu"
                    className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 text-xs text-slate-800 space-y-3"
                    onMouseLeave={() => setShowA11yMenu(false)}
                  >
                    <div className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex items-center justify-between">
                      <span>{t.accessibilitySettings || 'Accessibility Settings'}</span>
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    </div>

                    {/* Contrast Toggle */}
                    <div className="flex items-center justify-between">
                      <span>{t.highContrast || 'High Contrast'}</span>
                      <button
                        id="contrast-toggle-btn"
                        type="button"
                        onClick={handleToggleContrast}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer ${
                          highContrast
                            ? 'bg-yellow-400 text-black'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {highContrast ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    {/* Font Scale */}
                    <div>
                      <span className="block mb-1.5 font-medium text-slate-700">
                        {t.textSize || 'Text Size'}
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={() => onChangeFontScale && onChangeFontScale('normal')}
                          className={`py-1 rounded-lg text-center border font-medium cursor-pointer ${
                            currentScale === 'normal'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          {t.normal || 'Normal'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onChangeFontScale && onChangeFontScale('large')}
                          className={`py-1 rounded-lg text-center border font-medium cursor-pointer ${
                            currentScale === 'large'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          {t.large || 'Large'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onChangeFontScale && onChangeFontScale('xlarge')}
                          className={`py-1 rounded-lg text-center border font-medium cursor-pointer ${
                            currentScale === 'xlarge'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          {t.extraLarge || 'X-Large'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          id="mobile-drawer"
          className="lg:hidden px-4 pt-3 pb-5 space-y-2 border-t border-slate-200 bg-white text-slate-800 shadow-lg"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Navigation</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onNavigate('home');
                  setMobileMenuOpen(false);
                }}
                className="text-[11px] px-2 py-1 rounded bg-blue-50 text-blue-700 font-bold"
              >
                Citizen
              </button>
              <button
                type="button"
                onClick={() => {
                  onNavigate('staff-dashboard');
                  setMobileMenuOpen(false);
                }}
                className="text-[11px] px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium"
              >
                Staff
              </button>
              <button
                type="button"
                onClick={() => {
                  onNavigate('admin-dashboard');
                  setMobileMenuOpen(false);
                }}
                className="text-[11px] px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium"
              >
                Admin
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onNavigate(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold text-left transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4 text-blue-600" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Digital Health Services
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {clinicalServices.map((svc) => (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => {
                    onNavigate(svc.id);
                    setMobileMenuOpen(false);
                  }}
                  className="text-left text-[11px] p-1.5 rounded text-slate-600 hover:bg-slate-50 truncate"
                >
                  • {svc.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
