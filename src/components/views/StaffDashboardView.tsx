import React, { useState, useMemo } from 'react';
import {
  Hospital,
  Doctor,
  HospitalService,
  MedicineStock,
  Appointment,
  Complaint,
  User,
  LanguageCode,
  PatientReferral,
  OfflineOPDToken,
  OfflineTokenCallStatus
} from '../../types';
import { apiStore } from '../../services/apiStore';
import { offlineQueueService, getDetailedNetworkStatus } from '../../services/offlineQueueService';
import { translations } from '../../utils/translations';
import {
  normalizeReferralStatus,
  getNextReferralStatus,
  getReferralStepIndex
} from '../../utils/referralUtils';
import {
  LayoutDashboard,
  Stethoscope,
  Activity,
  Pill,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Save,
  Building2,
  RefreshCw,
  Clock,
  Mail,
  Lock,
  LogIn,
  GitFork,
  QrCode,
  ArrowRight,
  Search,
  FileCheck,
  Truck,
  ShieldCheck,
  UserCheck,
  Wifi,
  WifiOff,
  Volume2,
  Ticket,
  HeartPulse
} from 'lucide-react';
import { HighRiskStaffManagement } from './HighRiskStaffManagement';

interface StaffDashboardViewProps {
  currentUser: User | null;
  onNavigate: (view: string, payload?: any) => void;
  language: LanguageCode;
  onUserAuth?: (user: User) => void;
  refreshKey?: number;
  onRefresh?: () => void;
}

export const StaffDashboardView: React.FC<StaffDashboardViewProps> = ({
  currentUser,
  onNavigate,
  language,
  onUserAuth,
  refreshKey,
  onRefresh
}) => {
  const t = translations[language];
  const [renderCount, setRenderCount] = useState(0);

  React.useEffect(() => {
    if (refreshKey !== undefined) {
      setRenderCount((c) => c + 1);
    }
  }, [refreshKey]);

  const hospitals = useMemo(() => apiStore.getHospitals(), [renderCount]);

  // Staff manual authentication state
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Determine hospital managed by this staff member
  const initialHospitalId = currentUser?.hospitalId || (hospitals[0] ? hospitals[0].id : '');
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(initialHospitalId);
  const [activeTab, setActiveTab] = useState<
    'doctors' | 'services' | 'medicines' | 'appointments' | 'complaints' | 'referrals' | 'high-risk'
  >('doctors');
  const [notification, setNotification] = useState<string | null>(null);

  // Referrals state & filters
  const [showCreateReferralModal, setShowCreateReferralModal] = useState(false);
  const [selectedReferralSlip, setSelectedReferralSlip] = useState<PatientReferral | null>(null);
  const [referralFilterStatus, setReferralFilterStatus] = useState<string>('ALL');
  const [referralSearchQuery, setReferralSearchQuery] = useState<string>('');
  const [referralScope, setReferralScope] = useState<'HOSPITAL' | 'ALL'>('HOSPITAL');

  // Registered patients for staff selection
  const registeredPatients = useMemo(
    () => apiStore.getUsers().filter((u) => u.role === 'CITIZEN'),
    [renderCount]
  );

  // Referral creation form state (all 8 requested parameters)
  const [refPatientMode, setRefPatientMode] = useState<'REGISTERED' | 'CUSTOM'>('REGISTERED');
  const [refSelectedPatientId, setRefSelectedPatientId] = useState<string>(
    registeredPatients[0]?.id || 'user-google-salma'
  );
  const [refPatientName, setRefPatientName] = useState<string>(
    registeredPatients[0]?.name || 'Shaik Salma'
  );
  const [refPatientAge, setRefPatientAge] = useState<number>(28);
  const [refPatientGender, setRefPatientGender] = useState<string>('Female');
  const [refPatientPhone, setRefPatientPhone] = useState<string>(
    registeredPatients[0]?.mobile || '9849112501'
  );
  const [refPatientEmail, setRefPatientEmail] = useState<string>(
    registeredPatients[0]?.email || 'shaiksalma1125@gmail.com'
  );
  const [refCustomPatientId, setRefCustomPatientId] = useState<string>('');

  const [refFromHospitalId, setRefFromHospitalId] = useState<string>(selectedHospitalId);
  const [refToHospitalId, setToHospitalId] = useState<string>(
    hospitals.find((h) => h.id !== selectedHospitalId)?.id || hospitals[0]?.id || 'hosp-1'
  );
  const [refDoctorName, setRefDoctorName] = useState<string>('Dr. S. Anitha (Medical Officer)');
  const [refDoctorSpecialist, setRefDoctorSpecialist] = useState<string>(
    'Dr. K. Srinivas Rao (Interventional Cardiologist)'
  );
  const [refReason, setRefReason] = useState<string>(
    'Exertional angina with ST segment depression in Lead II, III; requires urgent 2D Echo and invasive evaluation.'
  );
  const [refClinicalSummary, setRefClinicalSummary] = useState<string>(
    'Vitals: BP 145/95 mmHg, SpO2 97%, Pulse 88 bpm. Initial ECG shows acute ischemic changes. Immediate tertiary cardiology admission recommended.'
  );
  const [refDate, setRefDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [refPriority, setRefPriority] = useState<PatientReferral['priority']>('URGENT');
  const [refStatus, setRefStatus] = useState<PatientReferral['status']>('Pending');
  const [refTransport, setRefTransport] = useState<string>('108_AMBULANCE');

  // Real-time listener for referral updates across portal
  React.useEffect(() => {
    const handleReferralsUpdated = () => {
      setRenderCount((c) => c + 1);
    };
    window.addEventListener('healthcare-referrals-updated', handleReferralsUpdated);
    window.addEventListener('storage', handleReferralsUpdated);
    return () => {
      window.removeEventListener('healthcare-referrals-updated', handleReferralsUpdated);
      window.removeEventListener('storage', handleReferralsUpdated);
    };
  }, []);

  // Sync Referring hospital when selected hospital changes
  React.useEffect(() => {
    setRefFromHospitalId(selectedHospitalId);
  }, [selectedHospitalId]);

  const handlePatientSelectChange = (patientId: string) => {
    setRefSelectedPatientId(patientId);
    if (patientId === 'CUSTOM') {
      setRefPatientMode('CUSTOM');
      setRefPatientName('');
      setRefPatientPhone('');
      setRefPatientEmail('');
      setRefPatientAge(35);
      setRefPatientGender('Male');
    } else {
      setRefPatientMode('REGISTERED');
      const found = registeredPatients.find((p) => p.id === patientId);
      if (found) {
        setRefPatientName(found.name);
        setRefPatientPhone(found.mobile);
        setRefPatientEmail(found.email);
        setRefPatientAge(found.id === 'user-google-salma' ? 28 : 42);
        setRefPatientGender(found.id === 'user-google-salma' ? 'Female' : 'Male');
      }
    }
  };

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const user = apiStore.login(authEmail.trim(), authPassword, 'HOSPITAL_STAFF');
      if (!user) {
        setAuthError('Invalid hospital staff credentials. Please check your official email and password.');
        return;
      }
      if (onUserAuth) {
        onUserAuth(user);
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const currentHospital = useMemo(
    () => apiStore.getHospitalById(selectedHospitalId),
    [selectedHospitalId]
  );

  const doctors = useMemo(
    () => apiStore.getDoctors(selectedHospitalId),
    [selectedHospitalId, renderCount]
  );

  const services = useMemo(
    () => apiStore.getServices(selectedHospitalId),
    [selectedHospitalId, renderCount]
  );

  const medicines = useMemo(
    () => apiStore.getMedicines(selectedHospitalId),
    [selectedHospitalId, renderCount]
  );

  const appointments = useMemo(
    () => apiStore.getAppointments(selectedHospitalId),
    [selectedHospitalId, renderCount]
  );

  const complaints = useMemo(
    () => apiStore.getComplaints(selectedHospitalId),
    [selectedHospitalId, renderCount]
  );

  const allReferrals = useMemo(() => apiStore.getReferrals(), [renderCount]);

  const displayedReferrals = useMemo(() => {
    let list =
      referralScope === 'HOSPITAL'
        ? allReferrals.filter(
            (r) => r.fromHospitalId === selectedHospitalId || r.toHospitalId === selectedHospitalId
          )
        : allReferrals;

    if (referralFilterStatus !== 'ALL') {
      list = list.filter((r) => normalizeReferralStatus(r.status) === referralFilterStatus);
    }

    if (referralSearchQuery.trim()) {
      const q = referralSearchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          String(r.patientName || '').toLowerCase().includes(q) ||
          String(r.referralId || '').toLowerCase().includes(q) ||
          String(r.fromHospitalName || '').toLowerCase().includes(q) ||
          String(r.toHospitalName || '').toLowerCase().includes(q) ||
          String(r.doctorSpecialist || '').toLowerCase().includes(q) ||
          String(r.reason || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [allReferrals, selectedHospitalId, referralScope, referralFilterStatus, referralSearchQuery]);

  const referralCounts = useMemo(() => {
    const list =
      referralScope === 'HOSPITAL'
        ? allReferrals.filter(
            (r) => r.fromHospitalId === selectedHospitalId || r.toHospitalId === selectedHospitalId
          )
        : allReferrals;
    return {
      total: list.length,
      pending: list.filter((r) => normalizeReferralStatus(r.status) === 'Pending').length,
      accepted: list.filter((r) => normalizeReferralStatus(r.status) === 'Accepted').length,
      inProgress: list.filter((r) => normalizeReferralStatus(r.status) === 'In Progress').length,
      completed: list.filter((r) => normalizeReferralStatus(r.status) === 'Completed').length,
      rejected: list.filter((r) => normalizeReferralStatus(r.status) === 'Rejected').length
    };
  }, [allReferrals, selectedHospitalId, referralScope]);

  const highRiskCount = useMemo(
    () => apiStore.getHighRiskPatients(selectedHospitalId).length,
    [selectedHospitalId, renderCount, refreshKey]
  );

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // REFERRAL HANDLERS
  const handleCreateReferralSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refPatientName.trim()) {
      showToast('Please specify a patient name');
      return;
    }
    if (!refReason.trim()) {
      showToast('Please provide reason for referral');
      return;
    }

    const fromH = hospitals.find((h) => h.id === refFromHospitalId) || currentHospital;
    const toH = hospitals.find((h) => h.id === refToHospitalId) || hospitals[0];

    const finalPatientId =
      refPatientMode === 'REGISTERED'
        ? refSelectedPatientId
        : refCustomPatientId.trim() || undefined;

    const created = apiStore.createReferral({
      patientId: finalPatientId,
      patientName: refPatientName.trim(),
      patientAge: Number(refPatientAge) || 30,
      patientGender: refPatientGender,
      patientPhone: refPatientPhone.trim(),
      patientEmail: refPatientEmail.trim() || undefined,
      fromHospitalId: refFromHospitalId,
      fromHospitalName: fromH?.name || 'Referring Hospital',
      toHospitalId: refToHospitalId,
      toHospitalName: toH?.name || 'Referred Hospital',
      department: 'Specialist Consultation & Triage',
      doctorName: refDoctorName.trim(),
      referredByDoctor: refDoctorName.trim(),
      specialist: refDoctorSpecialist.trim(),
      doctorSpecialist: refDoctorSpecialist.trim(),
      reason: refReason.trim(),
      referralReason: refReason.trim(),
      clinicalSummary: refClinicalSummary.trim(),
      referralDate: refDate || new Date().toISOString().split('T')[0],
      priority: refPriority,
      status: refStatus,
      transportRequired: refTransport,
      transportMode: refTransport
    });

    setRenderCount((c) => c + 1);
    setShowCreateReferralModal(false);
    setSelectedReferralSlip(created);
    showToast(
      `✓ Referral ${created.referralId} created for ${created.patientName}. Synchronized to Citizen Portal!`
    );
  };

  const handleUpdateReferralStatus = (id: string, newStatus: PatientReferral['status']) => {
    apiStore.updateReferralStatus(id, newStatus);
    setRenderCount((c) => c + 1);
    showToast(`✓ Referral status updated to "${newStatus}". Synced to patient.`);
  };

  // DOCTOR HANDLERS
  const handleDoctorStatusChange = (
    doctorId: string,
    status: 'AVAILABLE' | 'IN_CONSULTATION' | 'ON_LEAVE'
  ) => {
    apiStore.updateDoctorStatus(doctorId, status);
    setRenderCount((c) => c + 1);
    showToast('Doctor consultation status updated in real-time');
  };

  // SERVICE HANDLERS
  const handleServiceToggle = (serviceId: string, available: boolean, waitTime: string) => {
    apiStore.updateServiceStatus(serviceId, available, waitTime);
    setRenderCount((c) => c + 1);
    showToast('Service availability and queue wait time saved');
  };

  // MEDICINE HANDLERS
  const handleMedicineQuantity = (medicineId: string, qty: number) => {
    apiStore.updateMedicineStock(medicineId, qty);
    setRenderCount((c) => c + 1);
    showToast('Dispensary stock count updated');
  };

  // APPOINTMENT HANDLERS
  const [appointmentSubTab, setAppointmentSubTab] = useState<'online' | 'offline_2g'>('online');
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);

  const handleAppointmentStatus = (
    aptId: string,
    status: 'BOOKED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  ) => {
    apiStore.updateAppointmentStatus(aptId, status);
    setRenderCount((c) => c + 1);
    showToast(`Appointment status changed to ${status}`);
  };

  // OFFLINE 2G QUEUE HANDLERS (For Hospital Staff)
  const staffOfflineTokens = useMemo(() => {
    return offlineQueueService.getTokens(selectedHospitalId);
  }, [selectedHospitalId, renderCount]);

  const handleOfflineTokenCall = (tokenId: string, status: OfflineTokenCallStatus) => {
    const updated = offlineQueueService.updateTokenStatus(tokenId, status);
    if (updated) {
      setRenderCount((c) => c + 1);
      const token = staffOfflineTokens.find((t) => t.id === tokenId);
      if (status === 'CALLING') {
        showToast(`📢 Chamber Announcement: Now Calling ${token?.tokenCode || 'Token'} for ${token?.department || 'OPD'} at ${token?.roomNumber || 'Chamber'}!`);
      } else {
        showToast(`Offline OPD token marked as ${status}`);
      }
    }
  };

  const handleSyncOfflineStaffQueue = () => {
    setIsSyncingOffline(true);
    setTimeout(() => {
      const result = offlineQueueService.syncPendingTokens();
      setRenderCount((c) => c + 1);
      setIsSyncingOffline(false);
      if (result.syncedCount > 0) {
        showToast(`✓ Synchronized ${result.syncedCount} offline OPD token(s) to apex hospital server!`);
      } else {
        showToast('All facility offline tokens are synchronized.');
      }
    }, 500);
  };

  // COMPLAINT RESOLUTION STATE & HANDLERS
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<Complaint['status']>('RESOLVED');
  const [resolutionRemarks, setResolutionRemarks] = useState<string>('');

  const handleResolveComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaintId) return;
    apiStore.updateComplaintStatus(selectedComplaintId, resolutionStatus, resolutionRemarks);
    setSelectedComplaintId(null);
    setResolutionRemarks('');
    setRenderCount((c) => c + 1);
    showToast('Grievance status & resolution remarks recorded for citizen view');
  };

  if (!currentUser || currentUser.role !== 'HOSPITAL_STAFF') {
    return (
      <div className="max-w-xl mx-auto my-8 px-4 py-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 text-white p-6 sm:p-8 space-y-2 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 mb-3 shadow-inner">
              <Building2 className="w-7 h-7" />
            </div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-blue-400 bg-blue-950/80 px-3 py-1 rounded-full border border-blue-800 inline-block">
              Hospital Operations Gateway
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Hospital Staff Duty Portal
            </h1>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              Authorized clinical officers, OPD staff, and pharmacists must authenticate to manage doctor duty rosters, diagnostic availability, and medicine inventory.
            </p>
          </div>

          {/* Current user notice if logged in as different role */}
          {currentUser && (
            <div className="p-4 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
              <div className="space-y-0.5">
                <p className="font-semibold">
                  Signed in as {currentUser.name} ({String(currentUser.role || 'STAFF').replace(/_/g, ' ')})
                </p>
                <p className="text-[11px] text-amber-700">
                  Hospital staff credentials are required to modify hospital records. Please authenticate below.
                </p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleStaffLogin} className="p-6 sm:p-8 space-y-4 text-xs">
            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-semibold flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{authError}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Official Hospital Email / Staff ID *
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="e.g. staff@ggh.gov.in"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Staff Account Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Enter your staff password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <LogIn className="w-4 h-4" />
              <span>{authLoading ? 'Authenticating Staff...' : 'Sign In to Hospital Workspace'}</span>
            </button>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 space-y-1">
              <span className="font-semibold text-slate-700 block">Registered Staff System Account:</span>
              <p>• Official Staff Email: <span className="font-mono text-slate-800 font-medium">staff@ggh.gov.in</span></p>
              <p>• Password: <span className="font-mono text-slate-800 font-medium">password123</span></p>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                ← Return to Public Citizen Services
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Staff Operational Command
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Operator: {currentUser?.name}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Hospital Staff Daily Management Portal
            </h1>
            <p className="text-xs text-slate-500">
              Live updates directly synchronize with citizen discovery search, OPD appointment tokens and stock monitors.
            </p>
          </div>

          {/* Hospital Switcher & Refresh Button */}
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <select
              id="staff-hospital-switcher"
              value={selectedHospitalId}
              onChange={(e) => setSelectedHospitalId(e.target.value)}
              className="p-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
            >
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.hospitalType})
                </option>
              ))}
            </select>
            <button
              id="staff-create-referral-quick-btn"
              type="button"
              onClick={() => {
                setActiveTab('referrals');
                setShowCreateReferralModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs whitespace-nowrap"
              title="Create Inter-Facility Referral"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Referral</span>
            </button>
            <button
              id="staff-refresh-dashboard-btn"
              type="button"
              onClick={() => {
                if (onRefresh) {
                  onRefresh();
                } else {
                  setRenderCount((c) => c + 1);
                  showToast('Staff workspace refreshed');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-all cursor-pointer shadow-xs"
              title="Refresh staff duty roster, service status, and medicine inventory"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {notification && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{notification}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border border-slate-200 bg-white rounded-2xl p-1.5 shadow-xs flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('doctors')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'doctors'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>Doctor Duty ({doctors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'services'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Diagnostic Services ({services.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('medicines')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'medicines'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>Dispensary Stock ({medicines.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('appointments')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'appointments'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>OPD Appointments ({appointments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('complaints')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'complaints'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Grievances ({complaints.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('referrals')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'referrals'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <GitFork className="w-4 h-4" />
          <span>Inter-Facility Referrals ({referralCounts.total})</span>
        </button>

        <button
          onClick={() => setActiveTab('high-risk')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'high-risk'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          <span>High-Risk Follow-ups ({highRiskCount})</span>
        </button>
      </div>

      {/* TAB 1: DOCTORS DUTY ROSTER */}
      {activeTab === 'doctors' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Physician & Specialist Roster Management
              </h3>
              <p className="text-xs text-slate-500">
                Toggle live status when doctors start OPD consultation, take rounds or go on leave.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">Doctor</th>
                  <th className="p-3">Specialization</th>
                  <th className="p-3">OPD Schedule</th>
                  <th className="p-3">Current Consultation Status</th>
                  <th className="p-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {doctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70">
                    <td className="p-3">
                      <strong className="text-slate-900 text-sm block">{doc.name}</strong>
                      <span className="text-[11px] text-slate-500">{doc.qualification}</span>
                    </td>
                    <td className="p-3 font-semibold text-blue-700">{doc.specialization}</td>
                    <td className="p-3 text-slate-600">
                      <div>{doc.availableDays.join(', ')}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{doc.timeSlots[0]}</div>
                    </td>
                    <td className="p-3">
                      <select
                        value={doc.availabilityStatus}
                        onChange={(e) =>
                          handleDoctorStatusChange(doc.id, e.target.value as any)
                        }
                        className={`p-1.5 rounded-lg border font-bold text-xs ${
                          doc.availabilityStatus === 'AVAILABLE'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                            : doc.availabilityStatus === 'IN_CONSULTATION'
                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                            : 'bg-rose-50 text-rose-900 border-rose-300'
                        }`}
                      >
                        <option value="AVAILABLE">AVAILABLE</option>
                        <option value="IN_CONSULTATION">IN_CONSULTATION</option>
                        <option value="ON_LEAVE">ON_LEAVE</option>
                      </select>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() =>
                          handleDoctorStatusChange(
                            doc.id,
                            doc.availabilityStatus === 'AVAILABLE' ? 'ON_LEAVE' : 'AVAILABLE'
                          )
                        }
                        className="text-[11px] font-semibold text-blue-700 hover:underline"
                      >
                        Toggle Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SERVICES STATUS */}
      {activeTab === 'services' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-base text-slate-900">
              Diagnostic Labs, Radiology & Clinical Services
            </h3>
            <p className="text-xs text-slate-500">
              Inform waiting citizens of equipment availability and approximate test queue durations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((srv) => (
              <div
                key={srv.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{srv.serviceName}</h4>
                    <span className="text-[11px] text-slate-500">{srv.category}</span>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={srv.available}
                      onChange={(e) =>
                        handleServiceToggle(srv.id, e.target.checked, srv.waitingTime)
                      }
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                    <span className={`text-xs font-bold ${srv.available ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {srv.available ? 'Operational' : 'Down/Closed'}
                    </span>
                  </label>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <label className="text-slate-500 font-medium">Estimated Queue Wait:</label>
                  <input
                    type="text"
                    defaultValue={srv.waitingTime}
                    onBlur={(e) => handleServiceToggle(srv.id, srv.available, e.target.value)}
                    className="p-1 px-2 rounded-lg border border-slate-200 font-bold text-slate-800 w-28 bg-white shadow-xs"
                  />
                </div>

                <p className="text-[11px] text-slate-500 italic">{srv.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MEDICINE STOCK */}
      {activeTab === 'medicines' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-base text-slate-900">
              Government Formulary & Dispensary Drug Stock
            </h3>
            <p className="text-xs text-slate-500">
              Threshold alert triggers automatic indent generation for state central medical warehouse replenishment.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">Medicine Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Units in Stock</th>
                  <th className="p-3">Threshold Limit</th>
                  <th className="p-3">Live Stock Status</th>
                  <th className="p-3 text-right">Update Inventory</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medicines.map((med) => {
                  const isLow = med.quantity <= med.minimumThreshold && med.quantity > 0;
                  const isOut = med.quantity === 0;

                  return (
                    <tr key={med.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-bold text-slate-900">{med.medicineName}</td>
                      <td className="p-3 text-slate-500">{med.category}</td>
                      <td className="p-3 font-mono font-bold text-slate-900">{med.quantity}</td>
                      <td className="p-3 font-mono text-slate-400">{med.minimumThreshold}</td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                            isOut
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : isLow
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {isOut ? '🔴 Out of Stock' : isLow ? '⚠️ Low Stock' : '🟢 In Stock'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleMedicineQuantity(med.id, Math.max(0, med.quantity - 10))}
                            className="w-7 h-7 rounded-lg bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors"
                          >
                            -10
                          </button>
                          <button
                            onClick={() => handleMedicineQuantity(med.id, med.quantity + 50)}
                            className="w-7 h-7 rounded-lg bg-blue-50 font-bold text-blue-700 hover:bg-blue-100 flex items-center justify-center transition-colors"
                          >
                            +50
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Digital OPD Patient Tokens & Queue Control
              </h3>
              <p className="text-xs text-slate-500">
                Manage online appointments and offline 2G low-connectivity queue tokens for this facility.
              </p>
            </div>

            {/* Sub-tab switcher between Online & Offline 2G */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setAppointmentSubTab('online')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  appointmentSubTab === 'online'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Online Appointments ({appointments.length})
              </button>
              <button
                type="button"
                onClick={() => setAppointmentSubTab('offline_2g')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  appointmentSubTab === 'offline_2g'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Offline 2G Queue ({staffOfflineTokens.length})</span>
              </button>
            </div>
          </div>

          {/* ONLINE APPOINTMENTS VIEW */}
          {appointmentSubTab === 'online' && (
            <>
              {appointments.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-4 text-center">No OPD appointments logged for this facility.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                      <tr>
                        <th className="p-3">Token ID</th>
                        <th className="p-3">Patient Name</th>
                        <th className="p-3">Doctor</th>
                        <th className="p-3">Visit Date & Slot</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Status Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {appointments.map((apt) => (
                        <tr key={apt.id} className="hover:bg-slate-50/70">
                          <td className="p-3 font-mono font-bold text-blue-700">{apt.appointmentId}</td>
                          <td className="p-3 font-bold text-slate-900">{apt.patientName}</td>
                          <td className="p-3 text-slate-600">{apt.doctorName}</td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{apt.appointmentDate}</div>
                            <div className="text-[11px] text-slate-400">{apt.appointmentTime}</div>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                apt.status === 'COMPLETED'
                                  ? 'bg-slate-100 text-slate-700 border-slate-200'
                                  : apt.status === 'CONFIRMED'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : apt.status === 'CANCELLED'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              ● {apt.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {apt.status === 'BOOKED' && (
                                <button
                                  onClick={() => handleAppointmentStatus(apt.id, 'CONFIRMED')}
                                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[10px] shadow-xs transition-colors cursor-pointer"
                                >
                                  Confirm
                                </button>
                              )}
                              {apt.status === 'CONFIRMED' && (
                                <button
                                  onClick={() => handleAppointmentStatus(apt.id, 'COMPLETED')}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-white font-semibold text-[10px] shadow-xs transition-colors cursor-pointer"
                                >
                                  Complete
                                </button>
                              )}
                              {apt.status !== 'CANCELLED' && apt.status !== 'COMPLETED' && (
                                <button
                                  onClick={() => handleAppointmentStatus(apt.id, 'CANCELLED')}
                                  className="px-2 py-1 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-700 font-semibold text-[10px] transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* OFFLINE 2G QUEUE VIEW */}
          {appointmentSubTab === 'offline_2g' && (
            <div className="space-y-4">
              {/* Network Status & Sync Header */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold">
                    <WifiOff className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">Rural 2G / Offline Queue Manager</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-500/40">
                        Status: {getDetailedNetworkStatus().mode === 'LOW_CONNECTIVITY' ? '2G-Low Connectivity' : getDetailedNetworkStatus().mode}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Tokens generated in low-connectivity areas or via SMS (166) / USSD (*99*108#).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSyncOfflineStaffQueue}
                    disabled={isSyncingOffline}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingOffline ? 'animate-spin' : ''}`} />
                    <span>{isSyncingOffline ? 'Syncing...' : 'Sync Offline Records'}</span>
                  </button>
                </div>
              </div>

              {staffOfflineTokens.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-2">
                  <Ticket className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-bold text-slate-700">No Offline 2G Tokens Pending for this Hospital</p>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                    When patients or ASHA workers generate offline tokens or book via SMS/USSD, they appear dynamically here for chamber calling and clinical management.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Token Code</th>
                        <th className="p-3">Patient Name</th>
                        <th className="p-3">Department</th>
                        <th className="p-3">Chamber</th>
                        <th className="p-3">Channel</th>
                        <th className="p-3">Sync Status</th>
                        <th className="p-3">Call Status</th>
                        <th className="p-3 text-right">Queue Calling Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {staffOfflineTokens.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-50/70">
                          <td className="p-3 font-mono font-black text-blue-700 text-sm">{st.tokenCode}</td>
                          <td className="p-3">
                            <span className="font-bold text-slate-900 block">{st.patientName}</span>
                            {st.patientPhone && (
                              <span className="text-[10px] text-slate-500 block">📞 {st.patientPhone}</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-700 font-medium">{st.department}</td>
                          <td className="p-3 text-slate-600 font-semibold">{st.roomNumber}</td>
                          <td className="p-3">
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {st.source === 'SMS' ? '📱 SMS (166)' : st.source === 'USSD' ? '📞 USSD (*99*108#)' : '🌐 Offline 2G'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                st.syncStatus === 'SYNCED'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {st.syncStatus === 'SYNCED' ? '● Synced' : '● Pending Sync'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                                st.status === 'CALLING'
                                  ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                                  : st.status === 'COMPLETED' || st.status === 'SERVED'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : st.status === 'NO_SHOW'
                                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                                  : st.status === 'CANCELLED'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              ● {st.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {st.status !== 'CALLING' && st.status !== 'COMPLETED' && (
                                <button
                                  type="button"
                                  onClick={() => handleOfflineTokenCall(st.id, 'CALLING')}
                                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                                  title="Announce token and call patient into chamber"
                                >
                                  <Volume2 className="w-3 h-3" />
                                  <span>Call Next</span>
                                </button>
                              )}

                              {st.status !== 'COMPLETED' && (
                                <button
                                  type="button"
                                  onClick={() => handleOfflineTokenCall(st.id, 'COMPLETED')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-xs transition-colors cursor-pointer"
                                >
                                  Served
                                </button>
                              )}

                              {st.status !== 'NO_SHOW' && st.status !== 'COMPLETED' && (
                                <button
                                  type="button"
                                  onClick={() => handleOfflineTokenCall(st.id, 'NO_SHOW')}
                                  className="px-2 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-[10px] transition-colors cursor-pointer"
                                >
                                  No-Show
                                </button>
                              )}

                              {st.status !== 'CANCELLED' && st.status !== 'COMPLETED' && (
                                <button
                                  type="button"
                                  onClick={() => handleOfflineTokenCall(st.id, 'CANCELLED')}
                                  className="px-2 py-1 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-700 font-semibold text-[10px] transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: COMPLAINTS & GRIEVANCE REDRESSAL */}
      {activeTab === 'complaints' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-base text-slate-900">
                Public Grievances Filed Against this Facility
              </h3>
              <p className="text-xs text-slate-500">
                Provide transparent remarks and update status to RESOLVED or IN PROGRESS for citizen tracking.
              </p>
            </div>

            {complaints.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-4 text-center">Zero grievances registered against this facility.</p>
            ) : (
              <div className="space-y-3">
                {complaints.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-700 text-xs">
                          {c.complaintId}
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-white border border-slate-200 font-semibold text-slate-800">
                          {c.category}
                        </span>
                      </div>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border self-start ${
                          c.status === 'RESOLVED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : c.status === 'IN PROGRESS'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        ● {c.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-800 italic bg-white p-3 rounded-xl border border-slate-200/80">
                      "{c.description}"
                    </p>

                    {c.resolutionRemarks && (
                      <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
                        <strong className="text-emerald-900 block text-[11px]">Existing Action Remarks:</strong>
                        <span className="text-emerald-950 font-medium">{c.resolutionRemarks}</span>
                      </div>
                    )}

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => {
                          setSelectedComplaintId(c.id);
                          setResolutionStatus(c.status);
                          setResolutionRemarks(c.resolutionRemarks || '');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors"
                      >
                        Respond / Update Grievance Status
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal / Inline Response Box */}
          {selectedComplaintId && (
            <div className="bg-white rounded-3xl border-2 border-blue-500 p-6 shadow-md space-y-4">
              <h4 className="font-bold text-sm text-slate-900">
                Hospital Staff Redressal Form (Complaint #{complaints.find((c) => c.id === selectedComplaintId)?.complaintId})
              </h4>

              <form onSubmit={handleResolveComplaint} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Update Status *</label>
                  <select
                    value={resolutionStatus}
                    onChange={(e) => setResolutionStatus(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
                  >
                    <option value="UNDER REVIEW">UNDER REVIEW</option>
                    <option value="IN PROGRESS">IN PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Resolution Remarks *</label>
                  <textarea
                    rows={3}
                    value={resolutionRemarks}
                    onChange={(e) => setResolutionRemarks(e.target.value)}
                    placeholder="e.g. Additional doctor deployed on OPD duty; 200 boxes of Paracetamol restocked from District Medical Store..."
                    className="w-full p-3 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
                  ></textarea>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedComplaintId(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs transition-colors"
                  >
                    Submit Resolution Update
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: INTER-FACILITY REFERRAL TRACKING */}
      {activeTab === 'referrals' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] tracking-wide uppercase">
                    Inter-Facility Referral Tracking
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500 font-medium">
                    National Health Service Network
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  Hospital Referral Intake & Transfer Management
                </h3>
                <p className="text-xs text-slate-500 max-w-2xl">
                  Create clinical referrals to tertiary and district facilities, assign receiving
                  specialists, and update transfer statuses. Changes automatically reflect in the
                  Citizen Portal in real time.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateReferralModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Patient Referral</span>
                </button>
              </div>
            </div>

            {/* Metric Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-100">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 block">Total Referrals</span>
                <span className="text-xl font-black text-slate-900 mt-1 block">
                  {referralCounts.total}
                </span>
              </div>
              <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-100">
                <span className="text-[11px] font-semibold text-amber-700 block">1. Pending</span>
                <span className="text-xl font-black text-amber-900 mt-1 block">
                  {referralCounts.pending}
                </span>
              </div>
              <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100">
                <span className="text-[11px] font-semibold text-blue-700 block">2. Accepted</span>
                <span className="text-xl font-black text-blue-900 mt-1 block">
                  {referralCounts.accepted}
                </span>
              </div>
              <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-100">
                <span className="text-[11px] font-semibold text-purple-700 block">3. In Progress</span>
                <span className="text-xl font-black text-purple-900 mt-1 block">
                  {referralCounts.inProgress}
                </span>
              </div>
              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                <span className="text-[11px] font-semibold text-emerald-700 block">4. Completed</span>
                <span className="text-xl font-black text-emerald-900 mt-1 block">
                  {referralCounts.completed}
                </span>
              </div>
              <div className="p-3 bg-rose-50/60 rounded-2xl border border-rose-100">
                <span className="text-[11px] font-semibold text-rose-700 block">5. Rejected</span>
                <span className="text-xl font-black text-rose-900 mt-1 block">
                  {referralCounts.rejected}
                </span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setReferralScope('HOSPITAL')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      referralScope === 'HOSPITAL'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    This Hospital
                  </button>
                  <button
                    onClick={() => setReferralScope('ALL')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      referralScope === 'ALL'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    All Facilities
                  </button>
                </div>

                <select
                  value={referralFilterStatus}
                  onChange={(e) => setReferralFilterStatus(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Accepted">Accepted</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={referralSearchQuery}
                  onChange={(e) => setReferralSearchQuery(e.target.value)}
                  placeholder="Search patient, ID, doctor..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Referrals List */}
          <div className="space-y-4">
            {displayedReferrals.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <GitFork className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">No referrals match current filter</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  There are no referrals matching your search or filter settings. Click &quot;Create
                  Patient Referral&quot; to initiate a clinical transfer.
                </p>
              </div>
            ) : (
              displayedReferrals.map((ref) => {
                const normStatus = normalizeReferralStatus(ref.status);
                const stepIdx = getReferralStepIndex(ref.status);
                const isOrigin = ref.fromHospitalId === selectedHospitalId;
                const isDestination = ref.toHospitalId === selectedHospitalId;

                return (
                  <div
                    key={ref.id}
                    className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-blue-200 transition-all space-y-4"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200">
                          {ref.referralId}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          Date: {ref.referralDate}
                        </span>
                        {isOrigin && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            Outgoing Referral
                          </span>
                        )}
                        {isDestination && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Incoming Transfer
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {ref.priority === 'EMERGENCY' && (
                          <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px] flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            EMERGENCY
                          </span>
                        )}
                        {ref.priority === 'URGENT' && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                            URGENT
                          </span>
                        )}
                        {ref.priority === 'ROUTINE' && (
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[11px]">
                            ROUTINE
                          </span>
                        )}

                        <span
                          className={`px-3 py-1 rounded-full font-bold text-xs border ${
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
                          ● {normStatus}
                        </span>
                      </div>
                    </div>

                    {/* Patient & Facility Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {/* Patient Details */}
                      <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                            Patient
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {ref.patientAge}y • {ref.patientGender}
                          </span>
                        </div>
                        <p className="font-bold text-slate-900 text-sm">{ref.patientName}</p>
                        <p className="text-slate-600 flex items-center gap-1.5">
                          <span>Phone: {ref.patientPhone}</span>
                        </p>
                        {ref.patientEmail && (
                          <p className="text-slate-500 text-[11px] truncate">
                            Email: {ref.patientEmail}
                          </p>
                        )}
                      </div>

                      {/* Origin & Destination Facilities */}
                      <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100 space-y-2 md:col-span-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                            Facility Transfer Route
                          </span>
                          <span className="text-[11px] font-semibold text-blue-700">
                            Transit: {ref.transportMode || ref.transportRequired || 'Self'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-400 font-semibold block">
                              Referring Facility (Origin)
                            </span>
                            <p className="font-bold text-slate-800 text-xs">
                              {ref.fromHospitalName}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              By: {ref.referredByDoctor || ref.doctorName || 'Medical Officer'}
                            </p>
                          </div>

                          <div className="space-y-0.5 sm:border-l sm:pl-3 border-slate-200">
                            <span className="text-[10px] text-blue-600 font-semibold block">
                              Referred Facility (Destination)
                            </span>
                            <p className="font-bold text-slate-900 text-xs">{ref.toHospitalName}</p>
                            <p className="text-[11px] text-blue-700 font-medium">
                              Doctor/Specialist: {ref.doctorSpecialist || 'Specialist Consultant'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Clinical Indication */}
                    <div className="bg-blue-50/40 p-3.5 rounded-2xl border border-blue-100/60 text-xs space-y-1">
                      <span className="text-[10px] font-bold uppercase text-blue-800 tracking-wider block">
                        Reason for Referral & Clinical Notes
                      </span>
                      <p className="font-semibold text-slate-800">
                        {ref.referralReason || ref.reason}
                      </p>
                      {ref.clinicalSummary && ref.clinicalSummary !== ref.reason && (
                        <p className="text-[11px] text-slate-600 mt-1">{ref.clinicalSummary}</p>
                      )}
                    </div>

                    {/* Action Bar & Interactive Status Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                      {/* Status changer dropdown for hospital staff */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-700">Update Status:</span>
                        <select
                          value={normStatus}
                          onChange={(e) =>
                            handleUpdateReferralStatus(
                              ref.id,
                              e.target.value as PatientReferral['status']
                            )
                          }
                          className="px-3 py-1.5 rounded-xl border border-slate-200 font-bold text-xs bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs cursor-pointer"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Accepted">Accepted</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Rejected">Rejected</option>
                        </select>

                        {normStatus !== 'Completed' && normStatus !== 'Rejected' && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const next = getNextReferralStatus(normStatus);
                                handleUpdateReferralStatus(ref.id, next);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <span>Advance to {getNextReferralStatus(normStatus)}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateReferralStatus(ref.id, 'Rejected')}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors cursor-pointer"
                              title="Mark referral as Rejected"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>

                      {/* Official QR Slip button */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedReferralSlip(ref)}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5 text-slate-700" />
                          <span>View Official QR Slip</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* CREATE REFERRAL MODAL (All 8 requested fields) */}
      {showCreateReferralModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                  Inter-Facility Patient Referral
                </span>
                <h3 className="font-bold text-lg text-slate-900">
                  Create New Clinical Referral Slip
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateReferralModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl cursor-pointer p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateReferralSubmit} className="space-y-4 text-xs">
              {/* 1. PATIENT SELECTION */}
              <div className="space-y-2 p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900">1. Select Patient *</label>
                  <span className="text-[11px] text-blue-700 font-medium">
                    Links to Citizen Portal for tracking
                  </span>
                </div>

                <select
                  value={refPatientMode === 'CUSTOM' ? 'CUSTOM' : refSelectedPatientId}
                  onChange={(e) => handlePatientSelectChange(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <optgroup label="Registered Citizen Accounts">
                    {registeredPatients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (ID: {p.id} • {p.mobile || 'No Phone'} • {p.email})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Other">
                    <option value="CUSTOM">+ Enter Custom Patient Details</option>
                  </optgroup>
                </select>

                {refPatientMode === 'REGISTERED' ? (
                  <div className="flex items-center gap-2 p-2 bg-blue-100/70 border border-blue-200 rounded-xl text-blue-900 text-xs font-medium">
                    <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
                    <span>
                      Linked to Patient Account ID:{' '}
                      <strong className="font-mono text-blue-950 font-bold">{refSelectedPatientId}</strong>{' '}
                      (Only this citizen will see this referral in their portal)
                    </span>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Target Citizen/Patient ID (Optional - or leave blank for auto-generation)
                    </label>
                    <input
                      type="text"
                      value={refCustomPatientId}
                      onChange={(e) => setRefCustomPatientId(e.target.value)}
                      placeholder="e.g. user-citizen-b or unique citizen ID"
                      className="w-full p-2 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Patient Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={refPatientName}
                      onChange={(e) => setRefPatientName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full p-2 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={refPatientPhone}
                      onChange={(e) => setRefPatientPhone(e.target.value)}
                      placeholder="10-digit mobile"
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
                        value={refPatientAge}
                        onChange={(e) => setRefPatientAge(Number(e.target.value))}
                        className="w-full p-2 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                        Gender
                      </label>
                      <select
                        value={refPatientGender}
                        onChange={(e) => setRefPatientGender(e.target.value)}
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
                    value={refFromHospitalId}
                    onChange={(e) => setRefFromHospitalId(e.target.value)}
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
                    value={refToHospitalId}
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
                    value={refDoctorName}
                    onChange={(e) => setRefDoctorName(e.target.value)}
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
                    value={refDoctorSpecialist}
                    onChange={(e) => setRefDoctorSpecialist(e.target.value)}
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
                  value={refReason}
                  onChange={(e) => setRefReason(e.target.value)}
                  placeholder="Primary diagnosis, reason for inter-facility escalation..."
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
                  value={refClinicalSummary}
                  onChange={(e) => setRefClinicalSummary(e.target.value)}
                  placeholder="BP, SpO2, pulse, initial medication administered, investigations..."
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
                    value={refDate}
                    onChange={(e) => setRefDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    7. Priority *
                  </label>
                  <select
                    value={refPriority}
                    onChange={(e) => setRefPriority(e.target.value as any)}
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
                    value={refStatus}
                    onChange={(e) => setRefStatus(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Accepted">Accepted</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* TRANSPORT MODE */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Transport Assistance
                </label>
                <select
                  value={refTransport}
                  onChange={(e) => setRefTransport(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white"
                >
                  <option value="108_AMBULANCE">108 Emergency Ambulance (ALS/BLS)</option>
                  <option value="GOVT_PATIENT_VAN">Government Patient Transport Vehicle</option>
                  <option value="SELF_TRANSPORT">Self / Family Transport</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateReferralModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition-colors"
                >
                  Issue & Synchronize Referral Slip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 7: HIGH-RISK PATIENT FOLLOW-UP MANAGEMENT */}
      {activeTab === 'high-risk' && (
        <HighRiskStaffManagement
          hospitalId={selectedHospitalId}
          currentUser={currentUser}
          onNavigateToHospital={(hId) => setSelectedHospitalId(hId)}
        />
      )}

      {/* OFFICIAL REFERRAL SLIP MODAL */}
      {selectedReferralSlip && (
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
                onClick={() => setSelectedReferralSlip(null)}
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
                  {selectedReferralSlip.referralId}
                </span>
                <span className="text-[10px] text-slate-500 font-mono block">
                  {selectedReferralSlip.qrCodeToken}
                </span>
              </div>
              <div className="pt-1">
                <span
                  className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold ${
                    normalizeReferralStatus(selectedReferralSlip.status) === 'Completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : normalizeReferralStatus(selectedReferralSlip.status) === 'In Progress'
                      ? 'bg-purple-100 text-purple-800'
                      : normalizeReferralStatus(selectedReferralSlip.status) === 'Accepted'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Status: {normalizeReferralStatus(selectedReferralSlip.status)}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold">PATIENT</span>
                  <span className="font-bold text-slate-900 block">
                    {selectedReferralSlip.patientName}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    {selectedReferralSlip.patientPhone}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold">
                    DATE & PRIORITY
                  </span>
                  <span className="font-bold text-slate-900 block">
                    {selectedReferralSlip.referralDate}
                  </span>
                  <span className="text-blue-700 font-bold text-[11px]">
                    {selectedReferralSlip.priority}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold">ORIGIN</span>
                  <span className="font-medium text-slate-800 block">
                    {selectedReferralSlip.fromHospitalName}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    By: {selectedReferralSlip.referredByDoctor || 'Medical Officer'}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-blue-600 block text-[10px] font-semibold">
                    DESTINATION FACILITY
                  </span>
                  <span className="font-bold text-slate-900 block">
                    {selectedReferralSlip.toHospitalName}
                  </span>
                  <span className="text-blue-700 text-[11px] font-medium">
                    Doctor/Specialist: {selectedReferralSlip.doctorSpecialist || 'Specialist Consultant'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px] font-semibold">
                  CLINICAL INDICATION & NOTES
                </span>
                <p className="text-slate-800 font-semibold mt-0.5">
                  {selectedReferralSlip.referralReason || selectedReferralSlip.reason}
                </p>
                {selectedReferralSlip.clinicalSummary && (
                  <p className="text-slate-600 text-[11px] mt-1">
                    {selectedReferralSlip.clinicalSummary}
                  </p>
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
                onClick={() => setSelectedReferralSlip(null)}
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

