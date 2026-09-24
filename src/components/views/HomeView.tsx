import React, { useState } from 'react';
import {
  Search,
  MapPin,
  Mic,
  Building2,
  Hospital as HospitalIcon,
  Stethoscope,
  Pill,
  Activity,
  Calendar,
  AlertTriangle,
  Star,
  Clock,
  PhoneCall,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Navigation,
  Video,
  FileText,
  GitFork,
  TestTube,
  Award,
  HeartPulse,
  Ambulance,
  RotateCw
} from 'lucide-react';
import { Hospital, LanguageCode, User } from '../../types';
import { translations } from '../../utils/translations';
import { HospitalMap } from '../HospitalMap';
import { useSpeechRecognition } from '../../utils/useSpeechRecognition';

interface HomeViewProps {
  hospitals: (Hospital & { distance?: number })[];
  userCoords: { lat: number; lng: number } | null;
  onUseMyLocation: () => void;
  isLocating?: boolean;
  onNavigate: (view: string, payload?: any) => void;
  language: LanguageCode;
  currentUser: User | null;
  onOpenEmergencySOS?: (symptom?: string) => void;
  onRefreshAll?: () => void;
  isRefreshing?: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  hospitals,
  userCoords,
  onUseMyLocation,
  isLocating = false,
  onNavigate,
  language,
  currentUser,
  onOpenEmergencySOS,
  onRefreshAll,
  isRefreshing = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const t = translations[language];

  const { isListening, isSupported, startListening } = useSpeechRecognition((transcript) => {
    setSearchQuery(transcript);
    onNavigate('search', { query: transcript });
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate('search', { query: searchQuery });
  };

  const quickCards = [
    {
      id: 'quick-hospitals',
      title: t.quickHospitals,
      desc: 'Discover government hospitals, CHCs & rural PHCs with beds & facilities',
      icon: HospitalIcon,
      action: () => onNavigate('hospitals')
    },
    {
      id: 'quick-doctors',
      title: t.quickDoctors,
      desc: 'Specialists on duty, OPD hours & live consultation statuses',
      icon: Stethoscope,
      action: () => onNavigate('search', { type: 'doctor' })
    },
    {
      id: 'quick-medicines',
      title: t.quickMedicines,
      desc: 'Real-time essential formulary & Jan Aushadhi generic availability',
      icon: Pill,
      action: () => onNavigate('search', { type: 'medicine' })
    },
    {
      id: 'quick-services',
      title: t.quickServices,
      desc: 'Free Diagnostic Labs, Digital X-Ray, Sonography & Dialysis wait times',
      icon: Activity,
      action: () => onNavigate('search', { type: 'service' })
    },
    {
      id: 'quick-teleconsultation',
      title: t.teleconsultation,
      desc: 'eSanjeevani assisted video consultation with government doctors & specialists',
      icon: Video,
      action: () => onNavigate('teleconsultation')
    },
    {
      id: 'quick-triage',
      title: t.digitalTriage,
      desc: 'Protocol symptom checker, severity triage & immediate care guidance',
      icon: HeartPulse,
      action: () => onNavigate('triage')
    },
    {
      id: 'quick-health-records',
      title: t.healthRecords,
      desc: 'ABHA linked OPD prescriptions, discharge notes & diagnostic lab reports',
      icon: FileText,
      action: () => onNavigate('health-records')
    },
    {
      id: 'quick-referrals',
      title: t.referralTracking,
      desc: 'Track inter-hospital patient transfers, transport & specialist referrals',
      icon: Ambulance,
      action: () => onNavigate('referrals')
    },
    {
      id: 'quick-diagnostics',
      title: t.diagnosticServices,
      desc: 'Diagnostic labs coordination, test availability & digital report retrieval',
      icon: TestTube,
      action: () => onNavigate('diagnostics')
    },
    {
      id: 'quick-queue',
      title: t.appointmentQueue,
      desc: 'Live chamber queue, current token being served & estimated wait time',
      icon: Clock,
      action: () => onNavigate('queue')
    },
    {
      id: 'quick-high-risk',
      title: t.highRiskFollowUp,
      desc: 'Maternal ANC/PNC tracking, chronic NCD care & automated ASHA reminders',
      icon: HeartPulse,
      action: () => onNavigate('high-risk')
    },
    {
      id: 'quick-quality-dashboard',
      title: t.facilityQuality,
      desc: 'Hospital quality metrics: waiting times, medicine stock & diagnostic readiness',
      icon: Award,
      action: () => onNavigate('quality-dashboard')
    },
    {
      id: 'quick-appointments',
      title: t.quickAppointments,
      desc: 'Digital OPD tokens & booking without standing in long queues',
      icon: Calendar,
      action: () => onNavigate('my-appointments')
    },
    {
      id: 'quick-complaints',
      title: t.quickComplaints,
      desc: 'Report unavailable doctor, medicine shortage or grievance directly to Govt',
      icon: AlertTriangle,
      action: () => onNavigate('complaints')
    },
    {
      id: 'quick-feedback',
      title: t.quickFeedback,
      desc: 'Rate cleanliness, doctor consultation & improve public health quality',
      icon: Star,
      action: () => onNavigate('feedback')
    }
  ];

  const pastelStyles: Record<string, { bg: string; hoverBg: string; border: string; iconColor: string; iconBg: string }> = {
    'quick-hospitals': {
      bg: 'bg-[#EFF6FF]',
      hoverBg: 'hover:bg-[#DBEAFE]',
      border: 'border-blue-200/80',
      iconColor: 'text-[#1D4ED8]',
      iconBg: 'bg-blue-100/90',
    },
    'quick-doctors': {
      bg: 'bg-[#ECFDF5]',
      hoverBg: 'hover:bg-[#D1FAE5]',
      border: 'border-emerald-200/80',
      iconColor: 'text-[#059669]',
      iconBg: 'bg-emerald-100/90',
    },
    'quick-medicines': {
      bg: 'bg-[#FFFBEB]',
      hoverBg: 'hover:bg-[#FEF3C7]',
      border: 'border-amber-200/80',
      iconColor: 'text-[#D97706]',
      iconBg: 'bg-amber-100/90',
    },
    'quick-services': {
      bg: 'bg-[#FAF5FF]',
      hoverBg: 'hover:bg-[#F3E8FF]',
      border: 'border-purple-200/80',
      iconColor: 'text-[#9333EA]',
      iconBg: 'bg-purple-100/90',
    },
    'quick-teleconsultation': {
      bg: 'bg-[#F0FDFA]',
      hoverBg: 'hover:bg-[#CCFBF1]',
      border: 'border-teal-200/80',
      iconColor: 'text-[#0D9488]',
      iconBg: 'bg-teal-100/90',
    },
    'quick-triage': {
      bg: 'bg-[#F0FDF4]',
      hoverBg: 'hover:bg-[#DCFCE7]',
      border: 'border-green-200/80',
      iconColor: 'text-[#16A34A]',
      iconBg: 'bg-green-100/90',
    },
    'quick-health-records': {
      bg: 'bg-[#EEF2FF]',
      hoverBg: 'hover:bg-[#E0E7FF]',
      border: 'border-indigo-200/80',
      iconColor: 'text-[#4F46E5]',
      iconBg: 'bg-indigo-100/90',
    },
    'quick-referrals': {
      bg: 'bg-[#F5F3FF]',
      hoverBg: 'hover:bg-[#EDE9FE]',
      border: 'border-violet-200/80',
      iconColor: 'text-[#7C3AED]',
      iconBg: 'bg-violet-100/90',
    },
    'quick-diagnostics': {
      bg: 'bg-[#FDF4FF]',
      hoverBg: 'hover:bg-[#FAE8FF]',
      border: 'border-fuchsia-200/80',
      iconColor: 'text-[#C026D3]',
      iconBg: 'bg-fuchsia-100/90',
    },
    'quick-queue': {
      bg: 'bg-[#FEFCE8]',
      hoverBg: 'hover:bg-[#FEF9C3]',
      border: 'border-yellow-200/80',
      iconColor: 'text-[#CA8A04]',
      iconBg: 'bg-yellow-100/90',
    },
    'quick-high-risk': {
      bg: 'bg-[#FDF2F8]',
      hoverBg: 'hover:bg-[#FCE7F3]',
      border: 'border-pink-200/80',
      iconColor: 'text-[#DB2777]',
      iconBg: 'bg-pink-100/90',
    },
    'quick-quality-dashboard': {
      bg: 'bg-[#ECFEFF]',
      hoverBg: 'hover:bg-[#CFFAFE]',
      border: 'border-cyan-200/80',
      iconColor: 'text-[#0891B2]',
      iconBg: 'bg-cyan-100/90',
    },
    'quick-appointments': {
      bg: 'bg-[#FFF1F2]',
      hoverBg: 'hover:bg-[#FFE4E6]',
      border: 'border-rose-200/80',
      iconColor: 'text-[#E11D48]',
      iconBg: 'bg-rose-100/90',
    },
    'quick-complaints': {
      bg: 'bg-[#FFF7ED]',
      hoverBg: 'hover:bg-[#FFEDD5]',
      border: 'border-orange-200/80',
      iconColor: 'text-[#EA580C]',
      iconBg: 'bg-orange-100/90',
    },
    'quick-feedback': {
      bg: 'bg-[#F7FEE7]',
      hoverBg: 'hover:bg-[#ECFCCB]',
      border: 'border-lime-200/80',
      iconColor: 'text-[#65A30D]',
      iconBg: 'bg-lime-100/90',
    }
  };

  return (
    <div className="space-y-8 pb-12 w-full max-w-full overflow-x-hidden">
      {/* Hero Section matching Reference Image 1 */}
      <section className="bg-gradient-to-r from-[#EFF6FF] via-[#F5F9FF] to-[#EBF4FE] border border-blue-100 rounded-3xl p-5 sm:p-7 lg:p-8 shadow-xs relative overflow-hidden">
        {/* Top Row: Title on Left, Location + Refresh Buttons on Top-Right */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
              {t.findNearbyHeader || 'Healthcare Near You'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {t.findNearbySubtitle || 'Find trusted government healthcare services, book appointments, check service status, verified medicine stocks & citizen-driven quality ratings.'}
            </p>
          </div>

          {/* Top-Right Action Buttons: Use My Location + Refresh */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              id="home-use-location-btn"
              onClick={onUseMyLocation}
              disabled={isLocating}
              className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer ${
                userCoords
                  ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white hover:bg-blue-50 border-blue-200 text-blue-700'
              }`}
            >
              {isLocating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                  <span>Detecting...</span>
                </>
              ) : userCoords ? (
                <>
                  <Navigation className="w-3.5 h-3.5 text-white fill-white" />
                  <span>Location Active</span>
                </>
              ) : (
                <>
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>Use My Location</span>
                </>
              )}
            </button>

            {onRefreshAll && (
              <button
                type="button"
                id="home-hero-refresh-btn"
                onClick={onRefreshAll}
                disabled={isRefreshing}
                className="px-3.5 py-2 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                title="Refresh all real-time healthcare data"
              >
                <RotateCw className={`w-3.5 h-3.5 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Center/Lower Section: Left (Search Bar + 4 Cards), Right (Building Illustration) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center mt-5">
          {/* Left Column: Search Bar + 4 Feature Cards */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            {/* Search Bar matching Image 1 */}
            <form
              id="home-search-form"
              onSubmit={handleSearchSubmit}
              className="relative"
            >
              <div className="relative flex items-center bg-white border border-slate-200 rounded-2xl shadow-xs p-1 sm:p-1.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
                <input
                  id="home-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search hospital, doctor, service (e.g. X-Ray) or medicine..."
                  className="flex-1 bg-transparent border-0 focus:outline-none text-xs sm:text-sm text-slate-800 placeholder-slate-400 font-medium px-3 py-2 min-w-0"
                />
                <div className="flex items-center gap-1.5 shrink-0 pr-1">
                  <button
                    type="button"
                    id="home-voice-search-btn"
                    onClick={startListening}
                    title={isSupported ? t.voiceSearchTitle : 'Voice search not supported in current browser'}
                    className={`p-2 sm:p-2.5 rounded-xl transition-colors cursor-pointer ${
                      isListening
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                  <button
                    type="submit"
                    id="home-search-submit-btn"
                    className="bg-[#0B2545] hover:bg-slate-900 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                  >
                    Search
                  </button>
                </div>
              </div>

              {isListening && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  <span>{t.listening}</span>
                </div>
              )}
            </form>

            {/* 4 Summary Feature Cards below search bar (matching Image 1) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="bg-[#FDF2F2] border border-red-100/90 p-3 rounded-2xl flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block font-bold text-xs sm:text-sm text-slate-900 leading-tight">24x7 Ready</span>
                  <span className="text-[10px] sm:text-[11px] text-slate-500 truncate block">Emergency & Trauma</span>
                </div>
              </div>

              <div className="bg-[#F0FDF4] border border-emerald-100/90 p-3 rounded-2xl flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <Pill className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block font-bold text-xs sm:text-sm text-slate-900 leading-tight">Daily Stock</span>
                  <span className="text-[10px] sm:text-[11px] text-slate-500 truncate block">Essential Medicines</span>
                </div>
              </div>

              <div className="bg-[#FAF5FF] border border-purple-100/90 p-3 rounded-2xl flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block font-bold text-xs sm:text-sm text-slate-900 leading-tight">Civic Redress</span>
                  <span className="text-[10px] sm:text-[11px] text-slate-500 truncate block">Direct Govt Escalation</span>
                </div>
              </div>

              <div className="bg-[#FEFCE8] border border-amber-100/90 p-3 rounded-2xl flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block font-bold text-xs sm:text-sm text-slate-900 leading-tight">Verified Facilities</span>
                  <span className="text-[10px] sm:text-[11px] text-slate-500 truncate block">Trusted & Rated</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Hospital Building Illustration matching Reference Image */}
          <div className="lg:col-span-5 xl:col-span-4 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[270px] sm:max-w-[300px] lg:max-w-[325px] select-none pointer-events-none">
              <div className="flex flex-col items-end mb-1 pr-1">
                <span className="text-base sm:text-[17px] font-bold text-[#1B4A84] tracking-tight leading-tight">
                  Better Access
                </span>
                <span className="text-base sm:text-[17px] font-bold text-[#1B4A84] tracking-tight leading-tight mt-0.5">
                  Brighter Communities
                </span>
                {/* Two-tone accent bar from reference screenshot */}
                <div className="mt-1.5 w-11 h-[3px] rounded-full bg-gradient-to-r from-[#4F46E5] via-[#3B82F6] to-[#38BDF8]" />
              </div>

              <svg
                viewBox="0 0 340 205"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-auto drop-shadow-xs"
              >
                {/* Soft rounded puffy cloud sky backdrop */}
                <path
                  d="M48 160 C28 160 14 144 14 122 C14 103 28 88 46 86 C52 61 74 42 102 42 C118 42 133 50 143 62 C154 46 173 37 194 37 C222 37 246 56 252 82 C260 80 268 79 277 79 C302 79 322 98 322 122 C322 144 306 160 284 160 Z"
                  fill="#DCEEFE"
                />
                <ellipse cx="170" cy="130" rx="146" ry="62" fill="#EAF4FE" />

                {/* Network / constellation nodes & blueprint lines in the cloud backdrop */}
                <g stroke="#B8DAFB" strokeWidth="1.2" strokeLinecap="round" opacity="0.8">
                  {/* Central hub & connections */}
                  <circle cx="118" cy="92" r="4" fill="#EAF4FE" stroke="#A8D0F8" strokeWidth="1.5" />
                  <line x1="118" y1="92" x2="82" y2="76" />
                  <circle cx="82" cy="76" r="2.5" fill="#A8D0F8" />
                  <line x1="118" y1="92" x2="102" y2="132" />
                  <circle cx="102" cy="132" r="2.5" fill="#A8D0F8" />
                  <line x1="118" y1="92" x2="152" y2="68" />
                  <circle cx="152" cy="68" r="2.5" fill="#A8D0F8" />
                  <line x1="118" y1="92" x2="142" y2="118" />
                  <circle cx="142" cy="118" r="2.5" fill="#A8D0F8" />

                  {/* Right side network lines */}
                  <line x1="250" y1="88" x2="278" y2="112" />
                  <circle cx="250" cy="88" r="3" fill="#EAF4FE" stroke="#A8D0F8" strokeWidth="1.5" />
                  <circle cx="278" cy="112" r="2.5" fill="#A8D0F8" />
                  <line x1="250" y1="88" x2="238" y2="64" />
                  <circle cx="238" cy="64" r="2" fill="#A8D0F8" />
                </g>

                {/* Ground platform line */}
                <line x1="18" y1="190" x2="322" y2="190" stroke="#BDD6F5" strokeWidth="2.5" strokeLinecap="round" />

                {/* Left Wing of Hospital */}
                <rect x="74" y="112" width="52" height="78" rx="1.5" fill="#88BAF5" />
                <rect x="71" y="108" width="58" height="4.5" rx="1.5" fill="#4B8CE2" />
                {/* Left Wing Windows: Exactly 2 rows x 2 cols (4 windows) */}
                <rect x="82" y="122" width="15" height="14" rx="1.5" fill="#FFFFFF" stroke="#6FA7EE" strokeWidth="0.8" />
                <rect x="103" y="122" width="15" height="14" rx="1.5" fill="#FFFFFF" stroke="#6FA7EE" strokeWidth="0.8" />
                <rect x="82" y="146" width="15" height="14" rx="1.5" fill="#FFFFFF" stroke="#6FA7EE" strokeWidth="0.8" />
                <rect x="103" y="146" width="15" height="14" rx="1.5" fill="#FFFFFF" stroke="#6FA7EE" strokeWidth="0.8" />

                {/* Right Wing of Hospital */}
                <rect x="214" y="112" width="52" height="78" rx="1.5" fill="#88BAF5" />
                <rect x="211" y="108" width="58" height="4.5" rx="1.5" fill="#4B8CE2" />
                {/* Right Wing Windows: Exactly 2 rows x 2 cols (4 windows) */}
                <rect x="222" y="122" width="15" height="14" rx="1.5" fill="#FFFFFF" stroke="#6FA7EE" strokeWidth="0.8" />
                <rect x="243" y="122" width="15" height="14" rx="1.5" fill="#FFFFFF" stroke="#6FA7EE" strokeWidth="0.8" />
                <rect x="222" y="146" width="15" height="14" rx="1.5" fill="#FFFFFF" stroke="#6FA7EE" strokeWidth="0.8" />
                <rect x="243" y="146" width="15" height="14" rx="1.5" fill="#FFFFFF" stroke="#6FA7EE" strokeWidth="0.8" />

                {/* Center Main Hospital Tower Body */}
                <rect x="126" y="78" width="88" height="112" rx="2" fill="#88BAF5" />
                <rect x="122" y="74" width="96" height="5" rx="1.5" fill="#4B8CE2" />

                {/* Top of the Building: Arch Dome with White Center & Blue Medical Cross */}
                <path
                  d="M147 74 L147 56 C147 42 193 42 193 56 L193 74 Z"
                  fill="#4B8CE2"
                />
                {/* White Circle inside Arch Dome */}
                <circle cx="170" cy="57" r="13.5" fill="#FFFFFF" />
                {/* Blue Medical Cross (+) inside the White Circle */}
                <rect x="167.5" y="49" width="5" height="16" rx="1.2" fill="#4B8CE2" />
                <rect x="162" y="54.5" width="16" height="5" rx="1.2" fill="#4B8CE2" />

                {/* Center Tower Windows: Exactly 8 Windows (Row 1: 3, Row 2: 3, Row 3: 2 beside door) */}
                {/* Row 1 (Top) */}
                <rect x="136" y="90" width="15" height="14" rx="1.5" fill="#FFFFFF" stroke="#6FA7EE" strokeWidth="0.8" />
                <rect x="162.5" y="90" width="15" height="14" rx="1.5" fill="#FFFFFF" stroke="#6FA7EE" strokeWidth="0.8" />
                <rect x="189" y="90" width="15" height="14" rx="1.5" fill="#FFFFFF" stroke="#6FA7EE" strokeWidth="0.8" />

                {/* Row 2 (Middle) */}
                <rect x="136" y="114" width="15" height="14" rx="1.5" fill="#FFFFFF" stroke="#6FA7EE" strokeWidth="0.8" />
                <rect x="162.5" y="114" width="15" height="14" rx="1.5" fill="#FFFFFF" stroke="#6FA7EE" strokeWidth="0.8" />
                <rect x="189" y="114" width="15" height="14" rx="1.5" fill="#FFFFFF" stroke="#6FA7EE" strokeWidth="0.8" />

                {/* Row 3 (Bottom - Flanking the Door) */}
                <rect x="136" y="142" width="15" height="14" rx="1.5" fill="#FFFFFF" stroke="#6FA7EE" strokeWidth="0.8" />
                <rect x="189" y="142" width="15" height="14" rx="1.5" fill="#FFFFFF" stroke="#6FA7EE" strokeWidth="0.8" />

                {/* Entrance: Double Blue Door with Divider */}
                <rect x="158" y="152" width="24" height="38" rx="1.5" fill="#2B6CB0" />
                <line x1="170" y1="152" x2="170" y2="190" stroke="#1E4D8C" strokeWidth="1.2" />
                <circle cx="167" cy="172" r="1.1" fill="#FFFFFF" />
                <circle cx="173" cy="172" r="1.1" fill="#FFFFFF" />

                {/* Left Tree with Foliage & Ground Mound */}
                <rect x="47" y="152" width="4" height="38" rx="1.5" fill="#475569" />
                <ellipse cx="49" cy="146" rx="14" ry="22" fill="#38B9A6" />
                <line x1="49" y1="132" x2="49" y2="158" stroke="#2BA08E" strokeWidth="1.5" strokeLinecap="round" />
                <ellipse cx="49" cy="189" rx="14" ry="3.5" fill="#38B9A6" />

                {/* Right Tree with Foliage & Ground Mound */}
                <rect x="289" y="148" width="4" height="42" rx="1.5" fill="#475569" />
                <ellipse cx="291" cy="142" rx="15" ry="24" fill="#38B9A6" />
                <line x1="291" y1="126" x2="291" y2="156" stroke="#2BA08E" strokeWidth="1.5" strokeLinecap="round" />
                <ellipse cx="291" cy="189" rx="15" ry="3.5" fill="#38B9A6" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Access Action Cards - Styled with Image 2 Pastel Aesthetic */}
      <section aria-labelledby="quick-access-heading" className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 id="quick-access-heading" className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Quick Access
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('search')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors group"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {quickCards.map((card) => {
            const Icon = card.icon;
            const style = pastelStyles[card.id] || {
              bg: 'bg-[#EFF6FF]',
              hoverBg: 'hover:bg-[#DBEAFE]',
              border: 'border-blue-200/80',
              iconColor: 'text-[#1D4ED8]',
              iconBg: 'bg-blue-100/90',
            };
            return (
              <button
                key={card.id}
                id={card.id}
                onClick={card.action}
                className={`${style.bg} ${style.hoverBg} ${style.border} border p-4 sm:p-4.5 rounded-2xl shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group flex flex-col justify-between text-left h-full min-h-[142px]`}
              >
                <div className="w-full">
                  {/* Top Row: Suitable Medical Icon on left, Arrow Direction Icon on right */}
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 ${style.iconBg} rounded-xl flex items-center justify-center ${style.iconColor} shadow-2xs group-hover:scale-105 transition-transform`}>
                      <Icon className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                    </div>
                    <div className="w-7 h-7 rounded-full bg-white/80 group-hover:bg-white flex items-center justify-center text-slate-400 group-hover:text-slate-800 shadow-2xs transition-colors">
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 mb-1 leading-snug line-clamp-1">
                    {card.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 leading-tight line-clamp-2">
                    {card.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>


      {/* Interactive Map & Live Quality Insights Section (Split Bento Layout) */}
      <section id="interactive-map-section" className="space-y-4 pt-2 scroll-mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <span>Interactive Public Healthcare Map & Live District Status</span>
            </h2>
            <p className="text-xs text-slate-500">
              {userCoords
                ? `Showing verified public facilities with real-time distance from your GPS coordinates (${userCoords.lat.toFixed(4)}°N, ${userCoords.lng.toFixed(4)}°E)`
                : 'Using NTR District reference center (Vijayawada). Click "Use My Current Location" above for real-time GPS distances.'}
            </p>
          </div>
          <button
            id="view-all-hospitals-btn"
            onClick={() => onNavigate('hospitals')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>View All Public Facilities</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Interactive Map with Utility Overlays */}
          <div className="lg:col-span-2 space-y-3">
            <div className="relative bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <HospitalMap
                hospitals={hospitals}
                userCoords={userCoords}
                onSelectHospital={(h) => onNavigate('hospital-details', { hospitalId: h.id })}
                height="380px"
              />
            </div>

            {/* Bottom Map Status Bar */}
            <div className="bg-white border border-slate-200 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Facilities Shown</span>
                  <span className="text-sm font-bold text-slate-900">{hospitals.length} Centers</span>
                </div>
                <div className="h-6 w-px bg-slate-200"></div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Emergency Units</span>
                  <span className="text-sm font-bold text-slate-900">
                    {hospitals.filter((h) => h.emergencyAvailable).length} Available
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-200"></div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Digital OPD</span>
                  <span className="text-sm font-bold text-emerald-600">Active Live</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('search')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  Filter Map
                </button>
                <button
                  onClick={() => onNavigate('hospitals')}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  Hospital Directory
                </button>
              </div>
            </div>
          </div>

          {/* Right 1 Col: Quality Insights Panel (Clean Utility / Minimal dark card) */}
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xs flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Quality Insights</h3>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-emerald-400 font-bold tracking-wide">
                  LIVE UPDATE
                </span>
              </div>

              <div className="space-y-5">
                {/* Circular indicator stat */}
                <div className="flex items-center gap-4 bg-slate-800/60 p-3 rounded-2xl border border-slate-800">
                  <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold">84%</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Service Availability</p>
                    <p className="text-xs text-slate-400">District Average: 72%</p>
                  </div>
                </div>

                {/* Essential Medicines Stock Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-300">Essential Formulary in Stock</span>
                    <span className="text-blue-400 font-bold">92%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                  </div>
                  <span className="text-[10px] text-slate-400">Verified by Jan Aushadhi & Govt Depots</span>
                </div>

                {/* Top Rated Facility */}
                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-blue-400">Top Rated Facility in Area</span>
                  <p className="font-bold text-slate-200">Community Health Centre, Mangalagiri</p>
                  <p className="text-slate-400 text-[11px]">⭐ 4.6/5.0 from 210+ verified citizen reviews</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Public Quality Score</span>
              <button
                onClick={() => onNavigate('feedback')}
                className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
              >
                <span>View Audits</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Public Hospitals List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Government Facilities with Live OPD & Emergency Care
          </h2>
          <button
            onClick={() => onNavigate('hospitals')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700"
          >
            See All Facilities
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hospitals.slice(0, 6).map((hosp) => (
            <div
              key={hosp.id}
              id={`hospital-card-${hosp.id}`}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {hosp.hospitalType}
                  </span>
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>{hosp.rating}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({hosp.totalReviews})</span>
                  </div>
                </div>

                <h3
                  className="font-bold text-base text-slate-900 leading-snug group-hover:text-blue-600 transition-colors cursor-pointer"
                  onClick={() => onNavigate('hospital-details', { hospitalId: hosp.id })}
                >
                  {hosp.name}
                </h3>

                <p className="text-xs text-slate-500 line-clamp-2">
                  📍 {hosp.address}, {hosp.district}, {hosp.state} - {hosp.pincode}
                </p>

                {hosp.distance !== undefined && (
                  <div className="text-xs font-semibold text-blue-600 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{hosp.distance} km away from your location</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {hosp.facilities.slice(0, 3).map((f, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium"
                    >
                      {f}
                    </span>
                  ))}
                  {hosp.facilities.length > 3 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-400">
                      +{hosp.facilities.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  id={`btn-details-${hosp.id}`}
                  onClick={() => onNavigate('hospital-details', { hospitalId: hosp.id })}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                >
                  {t.viewDetails}
                </button>
                <button
                  id={`btn-book-${hosp.id}`}
                  onClick={() => onNavigate('appointment', { hospitalId: hosp.id })}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  {t.bookAppointment}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 108 Emergency Ambulance Rapid Escalation Banner */}
      <section className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
            <PhoneCall className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold mb-1">
              <span>National Emergency Escalation • 108 Dispatch</span>
            </div>
            <h3 className="font-bold text-base text-slate-900 leading-snug">
              Medical Emergency, Trauma or Cardiac Distress?
            </h3>
            <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
              Initiate immediate 108 ambulance dispatch with live GPS coordinate transmission and automatic emergency casualty triage at the nearest equipped government trauma hospital.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpenEmergencySOS ? onOpenEmergencySOS() : onNavigate('hospitals')}
          className="w-full md:w-auto px-5 py-3 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <PhoneCall className="w-4 h-4" />
          <span>Launch 108 Emergency SOS</span>
        </button>
      </section>
    </div>
  );
};
