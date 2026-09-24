import React from 'react';
import {
  HeartPulse,
  AlertTriangle,
  Calendar,
  Phone,
  ShieldAlert,
  Building2,
  CheckCircle2,
  Clock,
  Activity,
  FileText,
  AlertOctagon,
  ArrowRight,
  Stethoscope,
  ShieldCheck,
  FlaskConical,
  Bell
} from 'lucide-react';
import { apiStore } from '../../services/apiStore';
import { LanguageCode, User as UserType, FollowUpType, HighRiskCategory } from '../../types';
import { translations } from '../../utils/translations';
import { HighRiskStaffManagement } from './HighRiskStaffManagement';

interface HighRiskFollowUpViewProps {
  language: LanguageCode;
  currentUser: UserType | null;
  onNavigate?: (view: any, payload?: any) => void;
  onNavigateToHospital?: (hospitalId: string) => void;
}

export const HighRiskFollowUpView: React.FC<HighRiskFollowUpViewProps> = ({
  language,
  currentUser,
  onNavigate,
  onNavigateToHospital
}) => {
  const t = translations[language] || translations.en;
  const todayStr = new Date().toISOString().split('T')[0];

  // Auto-detect role: Hospital Staff / Admins vs Citizen
  const isStaffOrAdmin =
    currentUser?.role === 'HOSPITAL_STAFF' ||
    currentUser?.role === 'HOSPITAL_ADMIN' ||
    currentUser?.role === 'ADMIN';

  // 1. HOSPITAL STAFF PORTAL: MANAGEMENT DASHBOARD
  if (isStaffOrAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <HighRiskStaffManagement
          hospitalId={currentUser?.hospitalId}
          currentUser={currentUser}
          onNavigateToHospital={onNavigateToHospital}
        />
      </div>
    );
  }

  // 2. UNAUTHENTICATED VISITOR NOTICE (No separate login page or fake cards)
  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto text-rose-600 shadow-xs">
          <HeartPulse className="w-8 h-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          High-Risk Patient Follow-up & Care Continuity
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          Please sign in to Care Connect India using the Login button in the top navigation bar to view your personal high-risk care schedule or staff management console.
        </p>
      </div>
    );
  }

  // =========================================================================
  // 3. CITIZEN PORTAL: PERSONAL HIGH-RISK FOLLOW-UP ONLY
  // Strictly scoped to the logged-in patient's own unique ID.
  // Real-time synchronization with Hospital Staff Portal updates.
  // No other patients, no staff controls, no enrollment forms, no risk-management controls.
  // =========================================================================
  const [followUps, setFollowUps] = React.useState<any[]>(() =>
    currentUser ? apiStore.getFollowUpsForPatient(currentUser) : []
  );

  React.useEffect(() => {
    if (!currentUser) {
      setFollowUps([]);
      return;
    }

    const loadData = () => {
      const updated = apiStore.getFollowUpsForPatient(currentUser);
      setFollowUps(updated);
    };

    loadData();

    window.addEventListener('high_risk_data_updated', loadData);
    window.addEventListener('storage', loadData);

    return () => {
      window.removeEventListener('high_risk_data_updated', loadData);
      window.removeEventListener('storage', loadData);
    };
  }, [currentUser?.id, currentUser?.email, currentUser?.mobile]);

  const hospitals = apiStore.getHospitals();

  const getCategoryBadge = (cat?: HighRiskCategory) => {
    switch (cat) {
      case 'MATERNAL':
        return (
          <span className="px-2.5 py-1 rounded-full bg-pink-100 text-pink-800 text-[11px] font-extrabold border border-pink-200">
            Maternal ANC Care
          </span>
        );
      case 'CHRONIC_DISEASE':
        return (
          <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[11px] font-extrabold border border-blue-200">
            Chronic Disease (NCD)
          </span>
        );
      case 'CHILD':
        return (
          <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 text-[11px] font-extrabold border border-purple-200">
            Child Health Care
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-extrabold border border-amber-200">
            High-Risk Care Surveillance
          </span>
        );
    }
  };

  const getFollowUpTypeTitle = (type?: FollowUpType) => {
    switch (type) {
      case 'CHECKUP':
        return 'Clinical Check-up';
      case 'TEST_DIAGNOSTIC_REVIEW':
        return 'Diagnostic Test / Lab Review';
      case 'MEDICATION_REVIEW':
        return 'Medication Review';
      case 'SPECIALIST_REVIEW':
        return 'Specialist Review';
      default:
        return 'Clinical Follow-up Review';
    }
  };

  const getFollowUpTypeDescription = (type?: FollowUpType) => {
    switch (type) {
      case 'CHECKUP':
        return 'In-person clinical physical exam and vital signs monitoring.';
      case 'TEST_DIAGNOSTIC_REVIEW':
        return 'Diagnostic evaluation of laboratory reports, blood investigations, or imaging scans.';
      case 'MEDICATION_REVIEW':
        return 'Review of drug prescription, dosage adjustment, and therapy compliance.';
      case 'SPECIALIST_REVIEW':
        return 'Senior specialist consultation and advanced therapy planning.';
      default:
        return 'Regular clinical surveillance with your hospital medical team.';
    }
  };

  // Derive explicit status: Upcoming / Due / Completed / Missed
  const getFollowUpStatusInfo = (status: string, nextDate: string) => {
    if (status === 'COMPLETED') {
      return {
        label: 'Completed',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        type: 'COMPLETED' as const
      };
    }
    if (status === 'MISSED' || (nextDate < todayStr && status !== 'COMPLETED')) {
      return {
        label: 'Missed',
        badgeClass: 'bg-red-100 text-red-800 border-red-300 font-black',
        type: 'MISSED' as const
      };
    }
    if (nextDate === todayStr) {
      return {
        label: 'Due Today',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-black animate-pulse',
        type: 'DUE' as const
      };
    }
    return {
      label: 'Upcoming',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 font-bold',
      type: 'UPCOMING' as const
    };
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Patient Header Banner */}
      <div className="bg-gradient-to-r from-rose-900 via-pink-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/30 text-xs font-bold text-rose-300">
              <HeartPulse className="w-4 h-4 text-rose-400" />
              <span>Personal Care Continuity Plan</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {t.highRiskFollowUp || 'My High-Risk Follow-up'}
            </h1>
            <p className="text-xs sm:text-sm text-rose-100/90 max-w-xl">
              Monitored follow-up schedule and instructions coordinated directly by your hospital physicians.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-left sm:text-right shrink-0">
            <div className="text-[10px] uppercase font-bold text-rose-200 tracking-wider">
              Patient Identification
            </div>
            <div className="text-sm font-black text-white">{currentUser.name}</div>
            <div className="text-xs font-mono text-rose-200">ID: {currentUser.id}</div>
            {currentUser.mobile && (
              <div className="text-[11px] text-rose-300 font-mono">Mobile: {currentUser.mobile}</div>
            )}
          </div>
        </div>
      </div>

      {followUps.length === 0 ? (
        /* Reassuring message when citizen has no active high-risk follow-up */
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-black text-slate-900">
              No High-Risk Care Continuity Plan Assigned
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Your patient record (ID: <span className="font-mono font-bold text-slate-800">{currentUser.id}</span>) does not currently have an active high-risk follow-up scheduled. High-risk care tracking is initiated by your hospital doctor when continued clinical monitoring (such as maternal ANC, severe chronic NCDs, or post-procedure recovery) is clinically required.
            </p>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => onNavigate && onNavigate('appointments')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Book General OPD Appointment
            </button>
            <button
              onClick={() => onNavigate && onNavigate('health-records')}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              View My Health Records (ABHA)
            </button>
          </div>
        </div>
      ) : (
        /* Citizen's Active Follow-up Plans */
        <div className="space-y-6">
          {followUps.map((followUp) => {
            const nextDate = followUp.nextFollowUpDate || followUp.nextFollowUpDueDate || '';
            const statusInfo = getFollowUpStatusInfo(followUp.status, nextDate);
            const hosp = hospitals.find((h) => h.id === followUp.hospitalId);

            // Determine specific required test/check-up detail
            const testDetail =
              followUp.followUpType === 'TEST_DIAGNOSTIC_REVIEW'
                ? followUp.instruction.includes('Lab') || followUp.instruction.includes('test') || followUp.instruction.includes('CBC')
                  ? followUp.instruction
                  : 'Diagnostic laboratory investigations and report review at hospital diagnostic centre.'
                : followUp.followUpType === 'MEDICATION_REVIEW'
                ? 'Comprehensive prescription review, medication tolerance, and dosage titration.'
                : followUp.followUpType === 'SPECIALIST_REVIEW'
                ? 'Specialist clinical assessment and advanced therapy review.'
                : 'Routine vitals examination (blood pressure, blood glucose, heart rate) and physical check-up.';

            return (
              <div
                key={followUp.id}
                className={`bg-white rounded-3xl border transition-all p-6 sm:p-8 space-y-6 shadow-sm ${
                  statusInfo.type === 'MISSED'
                    ? 'border-red-300 ring-2 ring-red-100'
                    : statusInfo.type === 'DUE'
                    ? 'border-amber-300 ring-2 ring-amber-100'
                    : 'border-slate-200'
                }`}
              >
                {/* 1. STATUS & REMINDER BANNER */}
                {statusInfo.type === 'COMPLETED' ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-900">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-xs font-extrabold block">Follow-up Completed</span>
                      <span className="text-[11px] text-emerald-800">
                        Your scheduled clinical check-up has been completed. Your hospital care team continues regular monitoring.
                      </span>
                    </div>
                  </div>
                ) : statusInfo.type === 'DUE' ? (
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-center gap-3 text-amber-950 animate-pulse">
                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                    <div>
                      <span className="text-xs font-black block">Follow-up Due Today!</span>
                      <span className="text-[11px] text-amber-900 font-medium">
                        Your scheduled high-risk review is due today ({nextDate}). Please attend your check-up at {followUp.hospitalName}.
                      </span>
                    </div>
                  </div>
                ) : statusInfo.type === 'MISSED' ? (
                  <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex items-center gap-3 text-red-950">
                    <AlertOctagon className="w-6 h-6 text-red-600 shrink-0" />
                    <div>
                      <span className="text-xs font-black block">Urgent Alert: Follow-up Missed</span>
                      <span className="text-[11px] text-red-900 font-medium">
                        Your scheduled follow-up was on {nextDate}. Please book a follow-up appointment or contact the hospital immediately to avoid health complications.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3 text-blue-950">
                    <Clock className="w-5 h-5 text-blue-600 shrink-0" />
                    <div>
                      <span className="text-xs font-extrabold block">Upcoming Scheduled Follow-up</span>
                      <span className="text-[11px] text-blue-800">
                        Your clinical review is scheduled on {nextDate}. Automated reminders have been scheduled to your registered phone.
                      </span>
                    </div>
                  </div>
                )}

                {/* 2. CORE INFORMATION GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* High-Risk Condition & Category */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-rose-500" />
                        High-Risk Condition & Category
                      </span>
                      {getCategoryBadge(followUp.riskCategory)}
                    </div>
                    <div className="text-sm font-black text-slate-900 leading-snug">
                      {followUp.condition}
                    </div>
                    {followUp.riskLevel && (
                      <div className="text-[11px] font-bold text-slate-600">
                        Clinical Severity Level:{' '}
                        <span
                          className={`font-black uppercase ${
                            followUp.riskLevel === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'
                          }`}
                        >
                          {followUp.riskLevel}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Next Follow-up Date & Status */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        Next Follow-up Date
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusInfo.badgeClass}`}
                      >
                        Status: {statusInfo.label}
                      </span>
                    </div>
                    <div className="text-lg font-black text-slate-900">
                      {new Date(nextDate + 'T00:00:00').toLocaleDateString(undefined, {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="text-xs font-semibold text-slate-500">
                      Scheduled Due Date: <span className="font-mono text-slate-800">{nextDate}</span>
                    </div>
                  </div>

                  {/* Assigned Hospital & Doctor */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-purple-500" />
                      Assigned Hospital & Doctor
                    </span>
                    <div className="text-sm font-black text-slate-900 leading-snug">
                      {followUp.hospitalName}
                    </div>
                    <div className="text-xs font-bold text-slate-700 flex items-center gap-1 pt-0.5">
                      <Stethoscope className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{followUp.assignedTo || 'Medical Officer'}</span>
                      {followUp.assignedRole && (
                        <span className="text-slate-500 font-normal">({followUp.assignedRole})</span>
                      )}
                    </div>
                    {followUp.ashaWorkerName && (
                      <div className="text-[11px] text-slate-500 pt-0.5">
                        Field Care Worker: <span className="font-semibold text-slate-700">{followUp.ashaWorkerName}</span>
                      </div>
                    )}
                  </div>

                  {/* Required Follow-up Type */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                      Required Follow-up Type
                    </span>
                    <div className="text-sm font-black text-slate-900">
                      {getFollowUpTypeTitle(followUp.followUpType)}
                    </div>
                    <div className="text-[11px] text-slate-600 font-medium">
                      {getFollowUpTypeDescription(followUp.followUpType)}
                    </div>
                  </div>
                </div>

                {/* 3. REQUIRED TEST / CHECK-UP */}
                <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 sm:p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-xs font-black text-blue-950 uppercase tracking-wider">
                      Required Test / Check-up
                    </span>
                  </div>
                  <p className="text-xs font-bold text-blue-950 leading-relaxed">
                    {testDetail}
                  </p>
                </div>

                {/* 4. FOLLOW-UP INSTRUCTIONS */}
                <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 sm:p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="text-xs font-black text-rose-950 uppercase tracking-wider">
                      Doctor's Follow-up Instructions
                    </span>
                  </div>
                  <p className="text-xs font-bold text-rose-950 leading-relaxed">
                    {followUp.instruction}
                  </p>
                </div>

                {/* 5. REMINDER STATUS */}
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                  <Bell className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-xs text-amber-950">
                    <span className="font-black block">Follow-up Reminder Notice</span>
                    <p className="text-[11px] font-medium leading-relaxed">
                      Reminders are automatically sent to your registered mobile (
                      <span className="font-mono font-bold">
                        {followUp.patientPhone || currentUser.mobile || 'Registered Mobile'}
                      </span>
                      ). Please arrive 15 minutes before your consultation and carry all current prescriptions and laboratory reports.
                    </p>
                  </div>
                </div>

                {/* 6. "BOOK FOLLOW-UP APPOINTMENT" ACTION WHEN APPLICABLE */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`tel:${hosp?.phone || '08662572222'}`}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Call Hospital Helpdesk</span>
                    </a>

                    {onNavigateToHospital && hosp && (
                      <button
                        onClick={() => onNavigateToHospital(hosp.id)}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Building2 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Hospital Details & Services</span>
                      </button>
                    )}
                  </div>

                  {/* Primary Appointment Booking */}
                  {statusInfo.type !== 'COMPLETED' && (
                    <button
                      onClick={() =>
                        onNavigate &&
                        onNavigate('appointment', {
                          hospitalId: followUp.hospitalId,
                          hospitalName: followUp.hospitalName,
                          doctorName: followUp.assignedTo,
                          appointmentType: followUp.followUpType,
                          notes: `High-Risk Follow-up: ${followUp.condition} - ${followUp.instruction}`
                        })
                      }
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Book Follow-up Appointment</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* 7. PATIENT'S PREVIOUS FOLLOW-UP HISTORY */}
                {followUp.outcomes && followUp.outcomes.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>My Previous Clinical History & Provider Notes</span>
                    </h4>

                    <div className="space-y-2">
                      {followUp.outcomes.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between font-bold text-slate-800">
                            <span>Recorded by: {item.recordedBy || 'Hospital Care Provider'}</span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {new Date(item.recordedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-slate-700 font-medium">{item.notes}</p>
                          {item.vitals && (
                            <div className="text-[11px] text-rose-700 font-mono font-semibold">
                              Recorded Clinical Vitals: {item.vitals}
                            </div>
                          )}
                          {item.nextAction && (
                            <div className="text-[11px] text-blue-700 font-medium">
                              Care Plan: {item.nextAction}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
