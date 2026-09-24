import React, { useState, useMemo, useEffect } from 'react';
import {
  GitFork,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  User,
  Phone,
  Truck,
  Plus,
  QrCode,
  Search,
  Filter,
  FileCheck,
  ShieldCheck,
  Calendar,
  Stethoscope,
  ChevronRight,
  Lock,
  ExternalLink,
  Eye,
  RefreshCw,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { apiStore } from '../../services/apiStore';
import { PatientReferral, LanguageCode, User as UserType } from '../../types';
import { translations } from '../../utils/translations';
import {
  REFERRAL_STAGES,
  normalizeReferralStatus,
  getReferralStepIndex,
  getNextReferralStatus,
  isReferralForUser,
  REGISTERED_PATIENTS,
  createCitizenUserFromPatient
} from '../../utils/referralUtils';

interface ReferralTrackingViewProps {
  language: LanguageCode;
  currentUser: UserType | null;
  onNavigate?: (view: string, payload?: any) => void;
  onNavigateToHospital?: (hospitalId: string) => void;
  onUserAuth?: (user: UserType) => void;
}

export const ReferralTrackingView: React.FC<ReferralTrackingViewProps> = ({
  language,
  currentUser,
  onNavigate,
  onNavigateToHospital,
  onUserAuth
}) => {
  const t = translations[language];
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<PatientReferral | null>(null);
  const [referralsKey, setReferralsKey] = useState(0);

  // Quick verification lookup for offline / unauthenticated citizens
  const [lookupReferralId, setLookupReferralId] = useState('');
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupResult, setLookupResult] = useState<PatientReferral | null>(null);
  const [lookupError, setLookupError] = useState('');

  // Hospital staff / testing toggle for previewing citizen perspective
  const [simulatedCitizenUser, setSimulatedCitizenUser] = useState<UserType | null>(null);

  const hospitals = useMemo(() => apiStore.getHospitals(), []);
  const registeredPatients = REGISTERED_PATIENTS;

  // Listen for referral status updates broadcast from Hospital Staff Portal
  useEffect(() => {
    const handleReferralUpdate = () => {
      setReferralsKey((k) => k + 1);
    };

    window.addEventListener('healthcare-referrals-updated', handleReferralUpdate);
    window.addEventListener('storage', handleReferralUpdate);

    return () => {
      window.removeEventListener('healthcare-referrals-updated', handleReferralUpdate);
      window.removeEventListener('storage', handleReferralUpdate);
    };
  }, []);

  // 8-field Referral Creation Form State (Hospital Staff mode)
  const [refPatientMode, setRefPatientMode] = useState<'REGISTERED' | 'CUSTOM'>('REGISTERED');
  const [refSelectedPatientId, setRefSelectedPatientId] = useState(
    registeredPatients[0]?.id || 'user-google-salma'
  );
  const [patientName, setPatientName] = useState(
    registeredPatients[0]?.name || 'Shaik Salma'
  );
  const [patientAge, setPatientAge] = useState(
    registeredPatients[0]?.age || 28
  );
  const [patientGender, setPatientGender] = useState<'Male' | 'Female' | 'Other'>(
    (registeredPatients[0]?.gender as any) || 'Female'
  );
  const [patientPhone, setPatientPhone] = useState(
    registeredPatients[0]?.mobile || '9849112501'
  );
  const [patientEmail, setPatientEmail] = useState(
    registeredPatients[0]?.email || 'shaiksalma1125@gmail.com'
  );

  const [fromHospitalId, setFromHospitalId] = useState(hospitals[1]?.id || 'hosp-2');
  const [toHospitalId, setToHospitalId] = useState(hospitals[0]?.id || 'hosp-1');
  const [referredByDoctor, setReferredByDoctor] = useState('Dr. S. Anitha (Medical Officer In-charge)');
  const [doctorSpecialist, setDoctorSpecialist] = useState(
    'Dr. K. Srinivas Rao (Interventional Cardiologist)'
  );
  const [referralReason, setReferralReason] = useState(
    'Refractory ischemic chest pain with non-ST elevation myocardial infarction'
  );
  const [clinicalSummary, setClinicalSummary] = useState(
    'Vitals: BP 144/92, SpO2 96% on room air, ECG demonstrates deep T-wave inversions V2-V5. Loading dose Aspirin and Clopidogrel administered.'
  );
  const [referralDate, setReferralDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [priority, setPriority] = useState<PatientReferral['priority']>('URGENT');
  const [referralStatus, setReferralStatus] = useState<PatientReferral['status']>('Pending');
  const [transportMode, setTransportMode] = useState<PatientReferral['transportMode']>('AMBULANCE_108');

  // User role checking
  const isStaffOrAdmin = Boolean(
    currentUser && (currentUser.role === 'HOSPITAL_STAFF' || currentUser.role === 'HOSPITAL_ADMIN' || currentUser.role === 'ADMIN')
  );

  // Determine active view mode (Citizen vs Hospital Staff)
  const effectiveCitizen = useMemo(() => {
    // A logged-in citizen ALWAYS views strictly their own referrals
    if (currentUser?.role === 'CITIZEN') return currentUser;
    if (currentUser && !isStaffOrAdmin) return currentUser;
    if (simulatedCitizenUser) return simulatedCitizenUser;
    return null;
  }, [currentUser, simulatedCitizenUser, isStaffOrAdmin]);

  const isCitizenMode = Boolean(effectiveCitizen || (!currentUser && !simulatedCitizenUser));

  // All referrals from centralized storage
  const allReferrals = useMemo(() => {
    return apiStore.getReferrals();
  }, [referralsKey]);

  // Citizen's private referrals (strictly filtered to protect patient confidentiality)
  const citizenReferrals = useMemo(() => {
    if (!effectiveCitizen) return [];
    return apiStore.getReferralsForCitizen(effectiveCitizen);
  }, [effectiveCitizen, referralsKey, allReferrals]);

  // Handle patient select in referral creation
  const handlePatientSelect = (val: string) => {
    if (val === 'CUSTOM') {
      setRefPatientMode('CUSTOM');
      setRefSelectedPatientId('');
      setPatientName('');
      setPatientPhone('');
      setPatientEmail('');
      setPatientAge(40);
    } else {
      setRefPatientMode('REGISTERED');
      setRefSelectedPatientId(val);
      const pat = registeredPatients.find((p) => p.id === val);
      if (pat) {
        setPatientName(pat.name);
        setPatientPhone(pat.mobile || '+91 98480 22338');
        setPatientEmail(pat.email || '');
        setPatientAge(pat.age || 38);
        setPatientGender((pat.gender as any) || 'Female');
      }
    }
  };

  // Hospital staff referral creation handler with all 8 fields
  const handleCreateReferral = (e: React.FormEvent) => {
    e.preventDefault();
    const fromH = hospitals.find((h) => h.id === fromHospitalId);
    const toH = hospitals.find((h) => h.id === toHospitalId);

    const newRef = apiStore.createReferral({
      patientId: refPatientMode === 'REGISTERED' ? refSelectedPatientId : undefined,
      patientName,
      patientAge,
      patientGender,
      patientPhone,
      patientEmail,
      fromHospitalId,
      fromHospitalName: fromH?.name || 'Primary Health Centre',
      toHospitalId,
      toHospitalName: toH?.name || 'Government General Hospital',
      department: 'Specialist Clinical Referral',
      reason: referralReason,
      referralReason,
      clinicalSummary,
      referredByDoctor,
      doctorName: referredByDoctor,
      doctorSpecialist,
      referralDate,
      priority,
      status: referralStatus,
      transportRequired: transportMode === 'SELF_TRANSPORT' ? 'SELF_TRANSPORT' : '108_AMBULANCE',
      transportMode
    });

    setReferralsKey((k) => k + 1);
    setShowCreateModal(false);
    setSelectedSlip(newRef);
  };

  // Update referral status and broadcast to all portal views
  const handleUpdateStatus = (refId: string, newStatus: PatientReferral['status']) => {
    apiStore.updateReferralStatus(refId, newStatus);
    setReferralsKey((k) => k + 1);
  };

  // Manual slip lookup handler for citizens
  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError('');
    setLookupResult(null);

    const refIdClean = String(lookupReferralId || '').trim().toUpperCase();
    const phoneDigits = String(lookupPhone || '').replace(/\D/g, '').slice(-10);

    const match = allReferrals.find((r) => {
      const matchId = String(r.referralId || '').toUpperCase() === refIdClean || r.id === String(lookupReferralId || '').trim();
      const rPhoneDigits = r.patientPhone ? String(r.patientPhone).replace(/\D/g, '').slice(-10) : '';
      const matchPhone = !phoneDigits || rPhoneDigits === phoneDigits;
      return matchId && matchPhone;
    });

    if (match) {
      setLookupResult(match);
    } else {
      setLookupError('No matching referral found. Please verify the Referral ID and phone number.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-xs font-semibold">
              <GitFork className="w-3.5 h-3.5 text-blue-300" />
              <span>National Health Mission • Inter-Facility Referral Highway</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {t.referralTracking}
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/90 max-w-2xl leading-relaxed">
              Connects Primary Health Centres, Community Health Centres, and Apex District Hospitals.
              Referrals created by doctors automatically synchronize to patient accounts with verified bed allocation and live status progress.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isStaffOrAdmin && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-slate-950 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>+ Create Patient Referral</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setReferralsKey((k) => k + 1)}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Refresh referral statuses"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Live Status</span>
            </button>
          </div>
        </div>

        {/* Staff Preview Assistant Bar (if staff/admin wants to test citizen view) */}
        {isStaffOrAdmin && (
          <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-300" />
              <span className="text-blue-200 font-medium">Citizen Portal Preview Mode:</span>
              <span className="font-bold text-white">
                {effectiveCitizen ? `Viewing as ${effectiveCitizen.name} (Citizen)` : 'Hospital Staff Registry'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const salma = registeredPatients.find((p) => p.email?.includes('salma')) || registeredPatients[0];
                  setSimulatedCitizenUser(createCitizenUserFromPatient(salma));
                }}
                className={`px-3 py-1 rounded-xl font-bold text-[11px] transition-all cursor-pointer ${
                  simulatedCitizenUser?.name === 'Shaik Salma'
                    ? 'bg-blue-500 text-slate-950'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Preview as Shaik Salma
              </button>

              <button
                type="button"
                onClick={() => {
                  const rajesh = registeredPatients.find((p) => p.email?.includes('rajesh')) || registeredPatients[1];
                  setSimulatedCitizenUser(createCitizenUserFromPatient(rajesh));
                }}
                className={`px-3 py-1 rounded-xl font-bold text-[11px] transition-all cursor-pointer ${
                  simulatedCitizenUser?.name === 'Rajesh Kumar Verma'
                    ? 'bg-blue-500 text-slate-950'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Preview as Rajesh Kumar
              </button>

              {simulatedCitizenUser && (
                <button
                  type="button"
                  onClick={() => setSimulatedCitizenUser(null)}
                  className="px-2.5 py-1 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 rounded-xl font-bold text-[11px] cursor-pointer"
                >
                  Exit Preview
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* CITIZEN PORTAL VIEW: Dedicated, private referral tracking for the patient */}
      {/* ========================================================================= */}
      {effectiveCitizen ? (
        <div className="space-y-6">
          {/* Confidential Citizen Banner */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                    Confidential Citizen Portal
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                    Live Sync Active
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  {effectiveCitizen.name}&apos;s Inter-Facility Referral Slips
                </h2>
                <p className="text-xs text-slate-500">
                  Phone: {effectiveCitizen.mobile || 'Registered Mobile'} • Email: {effectiveCitizen.email || 'Registered Email'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-500">
                Found {citizenReferrals.length} Clinical Transfer{citizenReferrals.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {/* Citizen Referrals List */}
          {citizenReferrals.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 mx-auto rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <GitFork className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-base">
                  No Active Referrals for {effectiveCitizen.name}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  When a medical officer at your local PHC or Community Health Centre refers you to a District or General Hospital, your official referral slip and receiving specialist allocation will automatically appear here.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const salma = registeredPatients.find((p) => p.email?.includes('salma')) || registeredPatients[0];
                    if (salma && onUserAuth) onUserAuth(createCitizenUserFromPatient(salma));
                  }}
                  className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Try Demo Account with Active Referral (Shaik Salma)
                </button>
              </div>
            </div>
          ) : (
            citizenReferrals.map((ref) => {
              const normStatus = normalizeReferralStatus(ref.status);
              const currentStepIdx = getReferralStepIndex(ref.status);

              return (
                <div
                  key={ref.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs hover:border-blue-300 transition-all space-y-6"
                >
                  {/* Top Badge Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl">
                        {ref.referralId}
                      </span>

                      <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Referral Date: <strong className="text-slate-700">{ref.referralDate}</strong></span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {ref.priority === 'EMERGENCY' && (
                        <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Priority: EMERGENCY
                        </span>
                      )}
                      {ref.priority === 'URGENT' && (
                        <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs">
                          Priority: URGENT
                        </span>
                      )}
                      {ref.priority === 'ROUTINE' && (
                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs">
                          Priority: ROUTINE
                        </span>
                      )}

                      <span
                        className={`px-3.5 py-1 rounded-full font-bold text-xs border ${
                          normStatus === 'Pending'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : normStatus === 'Accepted'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : normStatus === 'In Progress'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : normStatus === 'Rejected'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        Current Status: ● {normStatus}
                      </span>
                    </div>
                  </div>

                  {/* 4-STAGE VISUAL PROGRESS / JOURNEY (Pending → Accepted → In Progress → Completed) OR Rejected alert */}
                  <div className="bg-slate-50/70 p-5 sm:p-6 rounded-2xl border border-slate-200/80 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <GitFork className="w-4 h-4 text-blue-600" />
                        <span>Referral Progress</span>
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        Current Status: <span className={`font-bold ${normStatus === 'Rejected' ? 'text-rose-600' : 'text-blue-700'}`}>{normStatus}</span>
                      </span>
                    </div>

                    {normStatus === 'Rejected' ? (
                      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <h5 className="font-bold text-xs text-rose-900">Referral Request Declined / Rejected</h5>
                          <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                            This inter-facility referral was reviewed and declined by the receiving facility or medical board. Please consult your referring medical officer for alternative tertiary care facilities or treatment adjustments.
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* Stepper container */
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                        {REFERRAL_STAGES.map((st, idx) => {
                          const isDone = idx < currentStepIdx;
                          const isCurrent = idx === currentStepIdx;
                          const isFuture = idx > currentStepIdx;

                          return (
                            <div
                              key={st.key}
                              className={`p-3.5 rounded-2xl border transition-all ${
                                isDone
                                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                                  : isCurrent
                                  ? 'bg-blue-50 border-blue-300 text-blue-950 shadow-xs ring-2 ring-blue-500/20'
                                  : 'bg-white border-slate-200 text-slate-400'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    isDone
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : isCurrent
                                      ? 'bg-blue-600 text-white font-black'
                                      : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  Step {st.step}
                                </span>

                                {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                                {isCurrent && (
                                  <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
                                  </span>
                                )}
                              </div>

                              <p
                                className={`font-bold text-xs ${
                                  isDone
                                    ? 'text-emerald-900'
                                    : isCurrent
                                    ? 'text-blue-900 font-extrabold'
                                    : 'text-slate-600'
                                }`}
                              >
                                {st.title}
                              </p>
                              <p className="text-[11px] leading-tight text-slate-500 mt-1">
                                {st.subtitle}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Transfer Route & Clinical Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Referred by hospital/doctor (Origin) */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                          Referred by hospital/doctor
                        </span>
                        <Building2 className="w-4 h-4 text-slate-400" />
                      </div>
                      <p className="font-bold text-slate-900 text-sm">{ref.fromHospitalName}</p>
                      <p className="text-slate-600 text-[11px] flex items-center gap-1">
                        <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                        <span>Referred by Doctor: <strong className="text-slate-800">{ref.referredByDoctor || ref.doctorName || 'Medical Officer'}</strong></span>
                      </p>
                    </div>

                    {/* Referred to hospital (Destination) */}
                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-blue-700 tracking-wider">
                          Referred to hospital
                        </span>
                        <Building2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <p className="font-bold text-blue-950 text-sm">{ref.toHospitalName}</p>
                      <p className="text-blue-800 text-[11px] flex items-center gap-1">
                        <Stethoscope className="w-3.5 h-3.5 text-blue-500" />
                        <span>Referred doctor/specialist: <strong className="text-blue-950">{ref.doctorSpecialist || 'Assigned Specialist Consultant'}</strong></span>
                      </p>
                    </div>
                  </div>

                  {/* Clinical Reason for Referral */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1 text-xs">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                      Reason for Referral
                    </span>
                    <p className="font-semibold text-slate-900 text-sm leading-relaxed">
                      {ref.referralReason || ref.reason}
                    </p>
                    {ref.clinicalSummary && ref.clinicalSummary !== ref.reason && (
                      <p className="text-slate-600 text-xs mt-1 pt-1 border-t border-slate-200/60 leading-relaxed">
                        <strong className="text-slate-700 font-semibold">Clinical Summary: </strong>
                        {ref.clinicalSummary}
                      </p>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedSlip(ref)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>View & Print Official Referral Slip (QR)</span>
                      </button>

                      {ref.transportMode && (
                        <span className="text-slate-500 flex items-center gap-1.5 text-[11px] font-medium">
                          <Truck className="w-3.5 h-3.5 text-blue-600" />
                          <span>Transit: {String(ref.transportMode).replace(/_/g, ' ')}</span>
                        </span>
                      )}
                    </div>

                    {onNavigateToHospital && (
                      <button
                        type="button"
                        onClick={() => onNavigateToHospital(ref.toHospitalId)}
                        className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>View {ref.toHospitalName} Info</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* CITIZEN NOT LOGGED IN: Offer 1-click citizen login + offline referral ID lookup */
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Citizen Health Record Verification
                </h2>
                <p className="text-xs text-slate-500">
                  To protect patient privacy, inter-facility referral journeys are private. Sign in to your citizen account or verify via your digital referral slip ID.
                </p>
              </div>
            </div>

            {/* 1-Click Citizen Sign-in */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                Option 1: Sign in with Registered Citizen Account
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const salma = registeredPatients.find((p) => p.email?.includes('salma')) || registeredPatients[0];
                    if (onUserAuth) onUserAuth(createCitizenUserFromPatient(salma));
                  }}
                  className="p-4 rounded-2xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 text-left transition-all cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">Shaik Salma</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                      Active Referral
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">9849112501 • Cardiology & Neurology Referrals</p>
                  <p className="text-[11px] text-blue-700 font-bold pt-1">
                    Sign in to track live transfer journey &rarr;
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const rajesh = registeredPatients.find((p) => p.email?.includes('rajesh')) || registeredPatients[1];
                    if (onUserAuth) onUserAuth(createCitizenUserFromPatient(rajesh));
                  }}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-all cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">Rajesh Kumar Verma</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                      Active Referral
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">9848022334 • Orthopedic Referral</p>
                  <p className="text-[11px] text-slate-700 font-bold pt-1">
                    Sign in to track live transfer journey &rarr;
                  </p>
                </button>
              </div>
            </div>

            {/* Option 2: Verify by Referral ID & Mobile */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                Option 2: Verify by Referral Slip ID (e.g. REF-2026-NTR-0842)
              </span>

              <form onSubmit={handleLookupSubmit} className="space-y-3 text-xs max-w-xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Referral Slip ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={lookupReferralId}
                      onChange={(e) => setLookupReferralId(e.target.value)}
                      placeholder="e.g. REF-2026-NTR-0842"
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Patient Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={lookupPhone}
                      onChange={(e) => setLookupPhone(e.target.value)}
                      placeholder="e.g. 9848022338"
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {lookupError && (
                  <p className="text-rose-600 text-xs font-semibold">{lookupError}</p>
                )}

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Verify & Track Referral
                </button>
              </form>
            </div>
          </div>

          {/* Direct Lookup Result Card */}
          {lookupResult && (
            <div className="bg-white rounded-3xl border-2 border-blue-500 p-6 sm:p-8 shadow-md space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-wide block">
                    Verified Digital Referral Record
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    {lookupResult.patientName}&apos;s Referral Slip
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-bold text-xs">
                  {normalizeReferralStatus(lookupResult.status)}
                </span>
              </div>

              {/* Stepper */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {REFERRAL_STAGES.map((st, idx) => {
                  const stepIdx = getReferralStepIndex(lookupResult.status);
                  const isDone = idx < stepIdx;
                  const isCurrent = idx === stepIdx;

                  return (
                    <div
                      key={st.key}
                      className={`p-3 rounded-xl border text-xs ${
                        isDone
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : isCurrent
                          ? 'bg-blue-50 text-blue-900 border-blue-300 font-bold'
                          : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}
                    >
                      <p className="font-bold">{st.title}</p>
                      <p className="text-[10px] text-slate-500">{st.subtitle}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold">REFERRING HOSPITAL</span>
                  <p className="font-bold text-slate-900">{lookupResult.fromHospitalName}</p>
                  <p className="text-slate-500">By: {lookupResult.referredByDoctor || 'Medical Officer'}</p>
                </div>
                <div>
                  <span className="text-blue-600 block text-[10px] font-bold">REFERRED HOSPITAL</span>
                  <p className="font-bold text-slate-900">{lookupResult.toHospitalName}</p>
                  <p className="text-blue-700 font-medium">Doctor/Specialist: {lookupResult.doctorSpecialist || 'Specialist'}</p>
                </div>
              </div>

              <div className="text-xs bg-slate-50 p-4 rounded-2xl">
                <span className="text-slate-400 block text-[10px] font-bold">REASON FOR REFERRAL</span>
                <p className="font-semibold text-slate-800">{lookupResult.referralReason || lookupResult.reason}</p>
                <p className="text-slate-500 text-[11px] mt-1">{lookupResult.clinicalSummary}</p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSlip(lookupResult)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-xs"
                >
                  View Full Official QR Slip
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* HOSPITAL STAFF PORTAL: Registry, Status Advancement, and Creation Modal  */}
      {/* ========================================================================= */}
      {isStaffOrAdmin && !simulatedCitizenUser && (
        <div className="space-y-6 pt-4 border-t border-slate-200">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                  Hospital Staff & Referral Desk
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  All Network Inter-Facility Referrals ({allReferrals.length})
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-700"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Accepted">Accepted</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {allReferrals.map((r) => {
                const norm = normalizeReferralStatus(r.status);

                return (
                  <div
                    key={r.id}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-blue-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-900 bg-blue-100/60 px-2 py-0.5 rounded">
                          {r.referralId}
                        </span>
                        <span className="font-bold text-slate-900">{r.patientName}</span>
                        <span className="text-slate-400 font-normal">({r.patientAge}y • {r.patientGender})</span>
                      </div>
                      <p className="text-slate-600">
                        {r.fromHospitalName} &rarr; <strong className="text-slate-800">{r.toHospitalName}</strong>
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        Doctor/Specialist: {r.doctorSpecialist || 'Assigned Specialist'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={norm}
                        onChange={(e) =>
                          handleUpdateStatus(r.id, e.target.value as PatientReferral['status'])
                        }
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 font-bold text-xs bg-white text-slate-800 shadow-xs cursor-pointer"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Accepted">Accepted</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Rejected">Rejected</option>
                      </select>

                      {norm !== 'Completed' && norm !== 'Rejected' && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = getNextReferralStatus(norm);
                            handleUpdateStatus(r.id, next);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                        >
                          Advance to {getNextReferralStatus(norm)} &rarr;
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedSlip(r)}
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
                      >
                        QR Slip
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CREATE REFERRAL MODAL (With All 8 Fields) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div>
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                  Inter-Facility Clinical Referral
                </span>
                <h3 className="font-bold text-lg text-slate-900">
                  Generate Inter-Facility Referral Slip
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl cursor-pointer p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateReferral} className="space-y-4 text-xs">
              {/* 1. PATIENT SELECTION */}
              <div className="space-y-2 p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900">1. Patient *</label>
                  <span className="text-[11px] text-blue-700 font-medium">
                    Links directly to Citizen Portal
                  </span>
                </div>

                <select
                  value={refPatientMode === 'CUSTOM' ? 'CUSTOM' : refSelectedPatientId}
                  onChange={(e) => handlePatientSelect(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <optgroup label="Registered Citizen Accounts">
                    {registeredPatients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.mobile || 'No Phone'} • {p.email})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Other">
                    <option value="CUSTOM">+ Enter Custom Patient Details</option>
                  </optgroup>
                </select>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                        Age
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={patientAge}
                        onChange={(e) => setPatientAge(Number(e.target.value))}
                        className="w-full p-2 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                        Gender
                      </label>
                      <select
                        value={patientGender}
                        onChange={(e) => setPatientGender(e.target.value as any)}
                        className="w-full p-2 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white"
                      >
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2 & 3. REFERRING & REFERRED HOSPITAL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    2. Referring Hospital (Origin) *
                  </label>
                  <select
                    value={fromHospitalId}
                    onChange={(e) => setFromHospitalId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white"
                  >
                    {hospitals.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.hospitalType})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    3. Referred Hospital (Destination) *
                  </label>
                  <select
                    value={toHospitalId}
                    onChange={(e) => setToHospitalId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white"
                  >
                    {hospitals.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.hospitalType})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4. DOCTOR / SPECIALIST */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Referring Doctor Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={referredByDoctor}
                    onChange={(e) => setReferredByDoctor(e.target.value)}
                    placeholder="e.g. Dr. S. Anitha (Medical Officer In-charge)"
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    4. Receiving Doctor / Specialist *
                  </label>
                  <input
                    type="text"
                    required
                    value={doctorSpecialist}
                    onChange={(e) => setDoctorSpecialist(e.target.value)}
                    placeholder="e.g. Dr. K. Srinivas Rao (Interventional Cardiologist)"
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white"
                  />
                </div>
              </div>

              {/* 5. REASON FOR REFERRAL */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  5. Reason for Referral *
                </label>
                <textarea
                  rows={2}
                  required
                  value={referralReason}
                  onChange={(e) => setReferralReason(e.target.value)}
                  placeholder="Primary diagnosis & clinical indication for inter-facility escalation..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white"
                />
              </div>

              {/* CLINICAL SUMMARY */}
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Clinical Summary & Vitals
                </label>
                <textarea
                  rows={2}
                  value={clinicalSummary}
                  onChange={(e) => setClinicalSummary(e.target.value)}
                  placeholder="BP, SpO2, initial medical management, investigations..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 bg-white"
                />
              </div>

              {/* 6, 7, 8. REFERRAL DATE, PRIORITY & INITIAL STATUS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    6. Referral Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={referralDate}
                    onChange={(e) => setReferralDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    7. Priority *
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white"
                  >
                    <option value="ROUTINE">Routine (Non-Emergency)</option>
                    <option value="URGENT">Urgent (Within 4 Hours)</option>
                    <option value="EMERGENCY">Emergency (Immediate)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    8. Referral Status *
                  </label>
                  <select
                    value={referralStatus}
                    onChange={(e) => setReferralStatus(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Accepted">Accepted</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* TRANSPORT MODE */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Transport Linkage
                </label>
                <select
                  value={transportMode}
                  onChange={(e) => setTransportMode(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white"
                >
                  <option value="AMBULANCE_108">108 Emergency Ambulance (ALS/BLS)</option>
                  <option value="GOVT_TRANSPORT">Government Patient Transport Vehicle</option>
                  <option value="SELF_TRANSPORT">Self / Family Transport</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition-colors"
                >
                  Issue & Sync Referral Slip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL REFERRAL SLIP PRINT / QR MODAL */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 text-slate-800">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-slate-900">
                  National Health Gateway Referral Slip
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlip(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer p-1"
              >
                &times;
              </button>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
              <div className="w-24 h-24 mx-auto bg-white border-2 border-slate-900 rounded-xl flex items-center justify-center p-2 shadow-xs">
                <QrCode className="w-20 h-20 text-slate-900" />
              </div>
              <div>
                <span className="font-mono font-bold text-sm text-slate-900 block">
                  {selectedSlip.referralId}
                </span>
                <span className="text-[10px] text-slate-500 font-mono block">
                  {selectedSlip.qrCodeToken}
                </span>
              </div>
              <div className="pt-1">
                <span
                  className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold ${
                    normalizeReferralStatus(selectedSlip.status) === 'Completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : normalizeReferralStatus(selectedSlip.status) === 'In Progress'
                      ? 'bg-purple-100 text-purple-800'
                      : normalizeReferralStatus(selectedSlip.status) === 'Accepted'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Status: {normalizeReferralStatus(selectedSlip.status)}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold">PATIENT</span>
                  <span className="font-bold text-slate-900 block">{selectedSlip.patientName}</span>
                  <span className="text-slate-500 text-[11px]">{selectedSlip.patientPhone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold">
                    DATE & PRIORITY
                  </span>
                  <span className="font-bold text-slate-900 block">{selectedSlip.referralDate}</span>
                  <span className="text-blue-700 font-bold text-[11px]">
                    {selectedSlip.priority}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold">ORIGIN</span>
                  <span className="font-medium text-slate-800 block">
                    {selectedSlip.fromHospitalName}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    By: {selectedSlip.referredByDoctor || 'Medical Officer'}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-blue-600 block text-[10px] font-semibold">
                    DESTINATION FACILITY
                  </span>
                  <span className="font-bold text-slate-900 block">
                    {selectedSlip.toHospitalName}
                  </span>
                  <span className="text-blue-700 text-[11px] font-medium">
                    Doctor/Specialist: {selectedSlip.doctorSpecialist || 'Specialist Consultant'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] font-semibold">
                  CLINICAL INDICATION & REASON
                </span>
                <p className="text-slate-800 font-semibold mt-0.5">
                  {selectedSlip.referralReason || selectedSlip.reason}
                </p>
                {selectedSlip.clinicalSummary && (
                  <p className="text-slate-600 text-[11px] mt-1">{selectedSlip.clinicalSummary}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <FileCheck className="w-4 h-4" />
                <span>Print Official Slip</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSlip(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
