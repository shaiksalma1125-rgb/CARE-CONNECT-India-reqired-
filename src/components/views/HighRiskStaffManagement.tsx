import React, { useState, useMemo, useEffect } from 'react';
import {
  HeartPulse,
  AlertTriangle,
  Send,
  CheckCircle2,
  Calendar,
  Phone,
  User as UserIcon,
  ShieldAlert,
  Building2,
  Plus,
  Search,
  Filter,
  Activity,
  Clock,
  MessageCircle,
  FileText,
  History,
  AlertOctagon,
  Stethoscope,
  X,
  ChevronRight,
  ExternalLink,
  ClipboardList,
  Edit3
} from 'lucide-react';
import { apiStore } from '../../services/apiStore';
import {
  HighRiskPatient,
  HighRiskCategory,
  FollowUpType,
  FollowUpStatus,
  FollowUpOutcome,
  User
} from '../../types';

interface HighRiskStaffManagementProps {
  hospitalId?: string;
  currentUser: User | null;
  onNavigateToHospital?: (hospitalId: string) => void;
}

export const HighRiskStaffManagement: React.FC<HighRiskStaffManagementProps> = ({
  hospitalId: initialHospitalId,
  currentUser,
  onNavigateToHospital
}) => {
  const hospitals = useMemo(() => apiStore.getHospitals(), []);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(
    initialHospitalId || currentUser?.hospitalId || hospitals[0]?.id || 'hosp-1'
  );

  const [renderKey, setRenderKey] = useState(0);
  const [timingFilter, setTimingFilter] = useState<'ALL' | 'DUE_TODAY' | 'OVERDUE' | 'UPCOMING' | 'COMPLETED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [contactingPatient, setContactingPatient] = useState<HighRiskPatient | null>(null);
  const [outcomePatient, setOutcomePatient] = useState<HighRiskPatient | null>(null);
  const [historyPatient, setHistoryPatient] = useState<HighRiskPatient | null>(null);
  const [escalatingPatient, setEscalatingPatient] = useState<HighRiskPatient | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Today's date string YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  // Retrieve follow-ups for the selected hospital (or all if admin)
  const allFollowUps = useMemo(() => {
    return apiStore.getHighRiskPatients(selectedHospitalId);
  }, [selectedHospitalId, renderKey]);

  // Registered citizens for selection
  const registeredPatients = useMemo(() => {
    return apiStore.getUsers().filter((u) => u.role === 'CITIZEN');
  }, [renderKey]);

  // Hospital Doctors for assignment
  const hospitalDoctors = useMemo(() => {
    return apiStore.getDoctors(selectedHospitalId);
  }, [selectedHospitalId]);

  // Counts & Categories
  const stats = useMemo(() => {
    let dueToday = 0;
    let overdue = 0;
    let upcoming = 0;
    let completed = 0;
    let escalated = 0;

    allFollowUps.forEach((p) => {
      const nextDate = p.nextFollowUpDate || p.nextFollowUpDueDate || '';
      if (p.status === 'COMPLETED') {
        completed++;
      } else if (nextDate === todayStr) {
        dueToday++;
      } else if (nextDate < todayStr || p.status === 'MISSED' || p.urgentEscalation) {
        overdue++;
      } else if (nextDate > todayStr) {
        upcoming++;
      }

      if (p.urgentEscalation || p.status === 'MISSED' || (nextDate < todayStr && p.status !== 'COMPLETED')) {
        escalated++;
      }
    });

    return { total: allFollowUps.length, dueToday, overdue, upcoming, completed, escalated };
  }, [allFollowUps, todayStr]);

  // Filtered follow-up list
  const filteredFollowUps = useMemo(() => {
    const q = String(searchQuery || '').trim().toLowerCase();

    return allFollowUps.filter((p) => {
      const nextDate = p.nextFollowUpDate || p.nextFollowUpDueDate || '';

      // Timing filter
      if (timingFilter === 'DUE_TODAY' && (nextDate !== todayStr || p.status === 'COMPLETED')) {
        return false;
      }
      if (timingFilter === 'OVERDUE' && !(nextDate < todayStr || p.status === 'MISSED') || (timingFilter === 'OVERDUE' && p.status === 'COMPLETED')) {
        return false;
      }
      if (timingFilter === 'UPCOMING' && (nextDate <= todayStr || p.status === 'COMPLETED')) {
        return false;
      }
      if (timingFilter === 'COMPLETED' && p.status !== 'COMPLETED') {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'ALL' && p.riskCategory !== categoryFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && p.status !== statusFilter) {
        return false;
      }

      // Text search
      if (q) {
        const matchName = String(p.patientName || '').toLowerCase().includes(q);
        const matchId = String(p.patientId || p.id || '').toLowerCase().includes(q);
        const matchCond = String(p.condition || p.conditionType || '').toLowerCase().includes(q);
        const matchDoc = String(p.assignedTo || p.ashaWorkerName || '').toLowerCase().includes(q);
        const matchPhone = String(p.patientPhone || p.phone || '').includes(q);
        if (!matchName && !matchId && !matchCond && !matchDoc && !matchPhone) {
          return false;
        }
      }

      return true;
    });
  }, [allFollowUps, timingFilter, categoryFilter, statusFilter, searchQuery, todayStr]);

  // Create Follow-up Form State
  const [patientSelectMode, setPatientSelectMode] = useState<'REGISTERED' | 'CUSTOM'>('REGISTERED');
  const [selectedPatientId, setSelectedPatientId] = useState<string>(registeredPatients[0]?.id || '');
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [customPatientId, setCustomPatientId] = useState('');
  const [customPatientName, setCustomPatientName] = useState('');
  const [customPatientPhone, setCustomPatientPhone] = useState('');
  const [customPatientAge, setCustomPatientAge] = useState('28');
  const [customPatientGender, setCustomPatientGender] = useState('Female');

  const [isHighRisk, setIsHighRisk] = useState(true);
  const [riskCategory, setRiskCategory] = useState<HighRiskCategory>('MATERNAL');
  const [condition, setCondition] = useState('Severe Gestational Anemia (Hb 7.6 g/dL)');
  const [riskLevel, setRiskLevel] = useState<'CRITICAL' | 'HIGH' | 'MODERATE'>('HIGH');
  const [followUpType, setFollowUpType] = useState<FollowUpType>('TEST_DIAGNOSTIC_REVIEW');
  const [assignedDoctorName, setAssignedDoctorName] = useState(hospitalDoctors[0]?.name || (currentUser?.name || 'Medical Officer'));
  const [assignedRole, setAssignedRole] = useState('Senior Consultant');
  const [nextFollowUpDate, setNextFollowUpDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [instruction, setInstruction] = useState('Complete repeat CBC and iron study at central lab; review dose adjustments in OPD.');
  const [initialNotes, setInitialNotes] = useState('Patient identified as high-risk during outpatient screening.');

  // Outcome recording form state
  const [outcomeStatus, setOutcomeStatus] = useState<FollowUpStatus>('CONTACTED');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [outcomeVitals, setOutcomeVitals] = useState('');
  const [outcomeNextAction, setOutcomeNextAction] = useState('');

  // Escalation form state
  const [escalationReason, setEscalationReason] = useState('Patient missed critical follow-up check; phone unreachable.');

  // Real-time synchronization with shared high-risk follow-up store
  useEffect(() => {
    const handleUpdate = () => {
      setRenderKey((k) => k + 1);
    };
    window.addEventListener('high_risk_data_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('high_risk_data_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Editing follow-up state
  const [editingPatient, setEditingPatient] = useState<HighRiskPatient | null>(null);
  const [editRiskCategory, setEditRiskCategory] = useState<HighRiskCategory>('MATERNAL');
  const [editCondition, setEditCondition] = useState('');
  const [editRiskLevel, setEditRiskLevel] = useState<'CRITICAL' | 'HIGH' | 'MODERATE'>('HIGH');
  const [editFollowUpType, setEditFollowUpType] = useState<FollowUpType>('CHECKUP');
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [editAssignedRole, setEditAssignedRole] = useState('');
  const [editNextFollowUpDate, setEditNextFollowUpDate] = useState('');
  const [editInstruction, setEditInstruction] = useState('');
  const [editStatus, setEditStatus] = useState<FollowUpStatus>('SCHEDULED');

  const handleOpenEdit = (patient: HighRiskPatient) => {
    setEditingPatient(patient);
    setEditRiskCategory(patient.riskCategory || 'MATERNAL');
    setEditCondition(patient.condition || '');
    setEditRiskLevel(patient.riskLevel || 'HIGH');
    setEditFollowUpType(patient.followUpType || 'CHECKUP');
    setEditAssignedTo(patient.assignedTo || '');
    setEditAssignedRole(patient.assignedRole || 'Medical Care Provider');
    setEditNextFollowUpDate(patient.nextFollowUpDate || patient.nextFollowUpDueDate || todayStr);
    setEditInstruction(patient.instruction || '');
    setEditStatus(patient.status || 'SCHEDULED');
  };

  const handleSaveEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;

    apiStore.updateHighRiskFollowUp(
      editingPatient.id,
      {
        riskCategory: editRiskCategory,
        condition: editCondition,
        riskLevel: editRiskLevel,
        followUpType: editFollowUpType,
        assignedTo: editAssignedTo,
        assignedRole: editAssignedRole,
        nextFollowUpDate: editNextFollowUpDate,
        instruction: editInstruction,
        status: editStatus
      },
      currentUser?.name || 'Hospital Staff'
    );

    setEditingPatient(null);
    setRenderKey((k) => k + 1);
    setToastMessage(`Follow-up plan for ${editingPatient.patientName} updated and synchronized.`);
  };

  const handleCreateFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    const hosp = hospitals.find((h) => h.id === selectedHospitalId);

    let finalPatientId = '';
    let finalPatientName = '';
    let finalPatientPhone = '';
    let finalPatientEmail = '';
    let finalAge = 25;
    let finalGender = 'Female';

    if (patientSelectMode === 'REGISTERED') {
      const reg = registeredPatients.find((p) => p.id === selectedPatientId);
      if (!reg) {
        alert('Please select a valid registered patient.');
        return;
      }
      finalPatientId = reg.id;
      finalPatientName = reg.name;
      finalPatientPhone = reg.mobile || '';
      finalPatientEmail = reg.email || '';
      finalAge = parseInt(customPatientAge) || 28;
      finalGender = customPatientGender;
    } else {
      if (!customPatientId.trim() || !customPatientName.trim() || !customPatientPhone.trim()) {
        alert('Please enter Patient ID, Name, and Contact Phone number.');
        return;
      }
      finalPatientId = customPatientId.trim();
      finalPatientName = customPatientName.trim();
      finalPatientPhone = customPatientPhone.trim();
      finalAge = parseInt(customPatientAge) || 28;
      finalGender = customPatientGender;
    }

    apiStore.createHighRiskFollowUp({
      patientId: finalPatientId,
      patientName: finalPatientName,
      patientPhone: finalPatientPhone,
      patientEmail: finalPatientEmail,
      age: finalAge,
      gender: finalGender,
      hospitalId: selectedHospitalId,
      hospitalName: hosp?.name || 'Government General Hospital',
      isHighRisk,
      riskCategory,
      condition,
      riskLevel,
      followUpType,
      assignedTo: assignedDoctorName,
      assignedRole,
      nextFollowUpDate,
      instruction,
      initialNotes,
      staffName: currentUser?.name || 'Hospital Care Team'
    });

    setToastMessage(`High-risk follow-up created successfully for ${finalPatientName} (${finalPatientId})!`);
    setShowCreateModal(false);
    setRenderKey((k) => k + 1);
  };

  const handleSaveOutcome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcomePatient) return;

    apiStore.updateFollowUpStatus(
      outcomePatient.id,
      outcomeStatus,
      outcomeNotes,
      outcomeVitals,
      currentUser?.name || 'Hospital Staff',
      outcomeNextAction
    );

    setToastMessage(`Follow-up outcome recorded for ${outcomePatient.patientName}. Status updated to ${outcomeStatus}.`);
    setOutcomePatient(null);
    setOutcomeNotes('');
    setOutcomeVitals('');
    setOutcomeNextAction('');
    setRenderKey((k) => k + 1);
  };

  const handleTriggerEscalation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalatingPatient) return;

    apiStore.escalateHighRiskFollowUp(
      escalatingPatient.id,
      escalationReason,
      currentUser?.name || 'Hospital Clinical Coordinator'
    );

    setToastMessage(`🚨 Urgent clinical escalation initiated for ${escalatingPatient.patientName}! Alert sent to Medical Officer & ASHA team.`);
    setEscalatingPatient(null);
    setRenderKey((k) => k + 1);
  };

  const handleSendReminder = (patient: HighRiskPatient) => {
    apiStore.sendHighRiskReminder(patient.id);
    setToastMessage(`Automated SMS & WhatsApp reminder dispatched to ${patient.patientName} (${patient.patientPhone || patient.phone})!`);
    setRenderKey((k) => k + 1);
  };

  const getFollowUpTypeLabel = (type?: FollowUpType) => {
    switch (type) {
      case 'CHECKUP':
        return 'Check-up & Physical Exam';
      case 'TEST_DIAGNOSTIC_REVIEW':
        return 'Test / Diagnostic Review';
      case 'MEDICATION_REVIEW':
        return 'Medication Review & Titration';
      case 'SPECIALIST_REVIEW':
        return 'Specialist Clinical Review';
      default:
        return 'Clinical Follow-up';
    }
  };

  const getRiskCategoryBadge = (cat?: HighRiskCategory) => {
    switch (cat) {
      case 'MATERNAL':
        return <span className="px-2 py-0.5 rounded-md bg-pink-100 text-pink-800 text-[11px] font-bold">Maternal ANC Care</span>;
      case 'CHRONIC_DISEASE':
        return <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">Chronic NCD Care</span>;
      case 'CHILD':
        return <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[11px] font-bold">Child Health</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-bold">High-Risk Care</span>;
    }
  };

  const getStatusBadge = (status?: FollowUpStatus, nextDate?: string) => {
    const isOverdue = nextDate && nextDate < todayStr && status !== 'COMPLETED';
    if (isOverdue || status === 'MISSED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-xs font-extrabold border border-red-200 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
          {status === 'MISSED' ? 'Missed Follow-up' : 'Overdue'}
        </span>
      );
    }
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Completed
          </span>
        );
      case 'CONTACTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold border border-indigo-200">
            <Phone className="w-3.5 h-3.5 text-indigo-600" />
            Contacted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            Scheduled
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast alert */}
      {toastMessage && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex items-center justify-between text-emerald-900 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:text-emerald-950 text-xs font-bold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hospital Selector & Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/30 text-xs font-bold text-rose-300">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Hospital Staff Portal • High-Risk Care Continuity & Follow-up Registry</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              High-Risk Patient Follow-up Management
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Identify and enroll high-risk maternal ANC, chronic NCD, pediatric malnutrition, and post-surgical patients. Set mandatory clinical review schedules, monitor due dates, contact patients, record care outcomes, and escalate missed visits to prevent complications.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Hospital Switcher */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/15">
              <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider px-2 mb-1">
                Facility Scope
              </label>
              <select
                value={selectedHospitalId}
                onChange={(e) => setSelectedHospitalId(e.target.value)}
                className="bg-slate-800 text-white text-xs font-semibold rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500 w-full sm:w-60"
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-3.5 bg-rose-500 hover:bg-rose-400 text-slate-950 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg hover:shadow-rose-500/25 transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create High-Risk Follow-up</span>
            </button>
          </div>
        </div>
      </div>

      {/* Escalation Alert Box (if any overdue/missed) */}
      {stats.escalated > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-3xl p-5 sm:p-6 shadow-md text-red-950 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-600 text-white rounded-2xl shrink-0 mt-0.5">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-red-900 flex items-center gap-2">
                  <span>Urgent Clinical Escalation Alert</span>
                  <span className="px-2 py-0.5 bg-red-200 text-red-900 rounded-full text-xs font-black">
                    {stats.escalated} Action Required
                  </span>
                </h3>
                <p className="text-xs text-red-800 mt-1 leading-relaxed font-medium">
                  High-risk patients have missed scheduled follow-ups or are significantly overdue. Standard protocol mandates immediate telephonic outreach, Medical Officer review, or dispatching an ASHA field health worker for a home visit.
                </p>
              </div>
            </div>
            <button
              onClick={() => setTimingFilter('OVERDUE')}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
            >
              View Overdue ({stats.overdue})
            </button>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          onClick={() => setTimingFilter('ALL')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            timingFilter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">All Registered</span>
            <HeartPulse className={`w-4 h-4 ${timingFilter === 'ALL' ? 'text-rose-400' : 'text-slate-400'}`} />
          </div>
          <div className="text-2xl font-black mt-2">{stats.total}</div>
          <div className="text-[11px] opacity-80 mt-0.5">Under Care Plan</div>
        </button>

        <button
          onClick={() => setTimingFilter('DUE_TODAY')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            timingFilter === 'DUE_TODAY'
              ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-600/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Due Today</span>
            <Calendar className={`w-4 h-4 ${timingFilter === 'DUE_TODAY' ? 'text-white' : 'text-amber-500'}`} />
          </div>
          <div className="text-2xl font-black mt-2 text-amber-500 group-hover:text-amber-600">
            <span className={timingFilter === 'DUE_TODAY' ? 'text-white' : 'text-amber-600'}>{stats.dueToday}</span>
          </div>
          <div className="text-[11px] opacity-80 mt-0.5">Action Scheduled Today</div>
        </button>

        <button
          onClick={() => setTimingFilter('OVERDUE')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            timingFilter === 'OVERDUE'
              ? 'bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-600/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Overdue / Missed</span>
            <AlertTriangle className={`w-4 h-4 ${timingFilter === 'OVERDUE' ? 'text-white' : 'text-red-500'}`} />
          </div>
          <div className="text-2xl font-black mt-2">
            <span className={timingFilter === 'OVERDUE' ? 'text-white' : 'text-red-600'}>{stats.overdue}</span>
          </div>
          <div className="text-[11px] opacity-80 mt-0.5">High Escalation Risk</div>
        </button>

        <button
          onClick={() => setTimingFilter('UPCOMING')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            timingFilter === 'UPCOMING'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Upcoming</span>
            <Clock className={`w-4 h-4 ${timingFilter === 'UPCOMING' ? 'text-white' : 'text-blue-500'}`} />
          </div>
          <div className="text-2xl font-black mt-2">
            <span className={timingFilter === 'UPCOMING' ? 'text-white' : 'text-blue-600'}>{stats.upcoming}</span>
          </div>
          <div className="text-[11px] opacity-80 mt-0.5">Scheduled Ahead</div>
        </button>

        <button
          onClick={() => setTimingFilter('COMPLETED')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            timingFilter === 'COMPLETED'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-600/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold">Completed</span>
            <CheckCircle2 className={`w-4 h-4 ${timingFilter === 'COMPLETED' ? 'text-white' : 'text-emerald-500'}`} />
          </div>
          <div className="text-2xl font-black mt-2">
            <span className={timingFilter === 'COMPLETED' ? 'text-white' : 'text-emerald-600'}>{stats.completed}</span>
          </div>
          <div className="text-[11px] opacity-80 mt-0.5">Review Successfully Done</div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient ID, name, condition, doctor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="ALL">All Categories</option>
            <option value="MATERNAL">Maternal ANC Care</option>
            <option value="CHRONIC_DISEASE">Chronic Disease (NCD)</option>
            <option value="CHILD">Child Health</option>
            <option value="OTHER_HIGH_RISK">Other High-Risk Care</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="CONTACTED">Contacted</option>
            <option value="COMPLETED">Completed</option>
            <option value="MISSED">Missed</option>
          </select>
        </div>
      </div>

      {/* Follow-up Cards List */}
      {filteredFollowUps.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-xs">
          <HeartPulse className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="text-base font-bold text-slate-700">No High-Risk Follow-ups Match Your Filter</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try resetting the search filters or create a new high-risk follow-up for a patient.
          </p>
          <button
            onClick={() => {
              setTimingFilter('ALL');
              setCategoryFilter('ALL');
              setStatusFilter('ALL');
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredFollowUps.map((patient) => {
            const nextDate = patient.nextFollowUpDate || patient.nextFollowUpDueDate || '';
            const isDueToday = nextDate === todayStr;
            const isOverdue = nextDate < todayStr && patient.status !== 'COMPLETED';
            const isMissed = patient.status === 'MISSED';

            return (
              <div
                key={patient.id}
                className={`bg-white rounded-3xl border transition-all p-5 sm:p-6 space-y-4 shadow-xs hover:shadow-md ${
                  isOverdue || isMissed || patient.urgentEscalation
                    ? 'border-red-300 bg-red-50/20 ring-1 ring-red-200'
                    : isDueToday
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-slate-200'
                }`}
              >
                {/* Header Row: Patient ID, Name, Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-mono font-bold">
                        ID: {patient.patientId || patient.id}
                      </span>
                      {getRiskCategoryBadge(patient.riskCategory)}
                      {patient.riskLevel === 'CRITICAL' && (
                        <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-black uppercase tracking-wider">
                          Critical
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                      <span>{patient.patientName}</span>
                      {patient.patientAge && (
                        <span className="text-xs font-semibold text-slate-500">
                          ({patient.patientAge}y, {patient.gender || 'F'})
                        </span>
                      )}
                    </h3>
                  </div>

                  <div className="text-right shrink-0">
                    {getStatusBadge(patient.status, nextDate)}
                  </div>
                </div>

                {/* Condition & Follow-up Type */}
                <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2 border border-slate-100">
                  <div className="flex items-start gap-2">
                    <Activity className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        High-Risk Condition
                      </span>
                      <span className="text-xs font-extrabold text-slate-900">
                        {patient.condition || patient.conditionType || 'High-Risk Care Surveillance'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Required Follow-up Type
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {getFollowUpTypeLabel(patient.followUpType)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Responsible Care Provider
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {patient.assignedTo || patient.ashaWorkerName || 'Assigned Medical Officer'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Date & Instructions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Next Follow-up Due Date:
                    </span>
                    <span
                      className={`font-black px-2.5 py-0.5 rounded-lg ${
                        isOverdue || isMissed
                          ? 'bg-red-100 text-red-700'
                          : isDueToday
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-50 text-blue-800'
                      }`}
                    >
                      {nextDate} {isDueToday ? '• TODAY' : isOverdue ? '• OVERDUE' : ''}
                    </span>
                  </div>

                  {patient.instruction && (
                    <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs text-amber-950 font-medium">
                      <span className="font-bold text-amber-900 block text-[10px] uppercase tracking-wider mb-0.5">
                        Follow-up Instruction
                      </span>
                      {patient.instruction}
                    </div>
                  )}

                  {patient.urgentEscalation && patient.escalationReason && (
                    <div className="bg-red-100 border border-red-300 rounded-xl p-2.5 text-xs text-red-900 font-bold flex items-center gap-2">
                      <AlertOctagon className="w-4 h-4 text-red-600 shrink-0" />
                      <span>ESCALATED: {patient.escalationReason}</span>
                    </div>
                  )}
                </div>

                {/* Actions Row */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setContactingPatient(patient)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Contact patient via Phone/WhatsApp"
                    >
                      <Phone className="w-3.5 h-3.5 text-blue-600" />
                      <span>Contact</span>
                    </button>

                    <button
                      onClick={() => handleSendReminder(patient)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Send automated reminder SMS/WhatsApp"
                    >
                      <Send className="w-3.5 h-3.5 text-blue-600" />
                      <span>Send Reminder</span>
                    </button>

                    <button
                      onClick={() => setHistoryPatient(patient)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="View previous follow-up history"
                    >
                      <History className="w-3.5 h-3.5 text-slate-500" />
                      <span>History ({patient.outcomes?.length || 1})</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(patient)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Edit follow-up plan, reschedule date, or update care provider"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                      <span>Edit / Reschedule</span>
                    </button>

                    <button
                      onClick={() => {
                        setOutcomePatient(patient);
                        setOutcomeStatus(patient.status || 'CONTACTED');
                      }}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Record Outcome</span>
                    </button>

                    {(isOverdue || isMissed || !patient.urgentEscalation) && (
                      <button
                        onClick={() => {
                          setEscalatingPatient(patient);
                          setEscalationReason(`Patient missed scheduled follow-up on ${nextDate}. Requires immediate ASHA field visit.`);
                        }}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                        title="Escalate to Medical Officer / ASHA supervisor"
                      >
                        <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
                        <span>Escalate</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE HIGH-RISK FOLLOW-UP */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
                  Care Continuity Protocol
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  Create High-Risk Patient Follow-up
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFollowUp} className="space-y-5">
              {/* STEP 1: SELECT PATIENT USING UNIQUE PATIENT ID */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <UserIcon className="w-4 h-4 text-blue-600" />
                    <span>Select Patient (Unique Patient ID)</span>
                  </label>
                  <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setPatientSelectMode('REGISTERED')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        patientSelectMode === 'REGISTERED'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Registered Citizens ({registeredPatients.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPatientSelectMode('CUSTOM')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        patientSelectMode === 'CUSTOM'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Enter Patient ID
                    </button>
                  </div>
                </div>

                {patientSelectMode === 'REGISTERED' ? (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      placeholder="Search patient by ID, name, or phone..."
                      value={patientSearchTerm}
                      onChange={(e) => setPatientSearchTerm(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-200 text-xs font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500"
                    />
                    <select
                      value={selectedPatientId}
                      onChange={(e) => setSelectedPatientId(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-rose-500"
                    >
                      {registeredPatients
                        .filter((p) => {
                          if (!patientSearchTerm.trim()) return true;
                          const q = patientSearchTerm.toLowerCase().trim();
                          return (
                            p.name.toLowerCase().includes(q) ||
                            p.id.toLowerCase().includes(q) ||
                            (p.mobile && p.mobile.includes(q))
                          );
                        })
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            ID: {p.id} • {p.name} • Mobile: {p.mobile} ({p.location || p.district})
                          </option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Unique Patient ID *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. PT-2026-8812"
                        value={customPatientId}
                        onChange={(e) => setCustomPatientId(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-300 text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Patient Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. K. Sailaja"
                        value={customPatientName}
                        onChange={(e) => setCustomPatientName(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-300 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Contact Mobile Phone *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 9849211002"
                        value={customPatientPhone}
                        onChange={(e) => setCustomPatientPhone(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-300 text-xs font-mono font-bold"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Age
                        </label>
                        <input
                          type="number"
                          value={customPatientAge}
                          onChange={(e) => setCustomPatientAge(e.target.value)}
                          className="w-full p-2 rounded-xl border border-slate-300 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Gender
                        </label>
                        <select
                          value={customPatientGender}
                          onChange={(e) => setCustomPatientGender(e.target.value)}
                          className="w-full p-2 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                        >
                          <option value="Female">Female</option>
                          <option value="Male">Male</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 2: MARK AS HIGH RISK & SELECT RISK/CONDITION */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-rose-50 p-3 rounded-xl border border-rose-200">
                  <input
                    type="checkbox"
                    id="markHighRisk"
                    checked={isHighRisk}
                    onChange={(e) => setIsHighRisk(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded-sm focus:ring-rose-500"
                  />
                  <label htmlFor="markHighRisk" className="text-xs font-black text-rose-950 cursor-pointer">
                    Mark Patient as High Risk (Enables priority tracking and missed follow-up escalation)
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Risk Category *
                    </label>
                    <select
                      value={riskCategory}
                      onChange={(e) => setRiskCategory(e.target.value as HighRiskCategory)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                    >
                      <option value="MATERNAL">Maternal ANC Care (High-Risk Pregnancy, Pre-eclampsia)</option>
                      <option value="CHRONIC_DISEASE">Chronic Disease (Diabetes, Hypertension, CKD)</option>
                      <option value="CHILD">Child Health (Malnutrition, Pediatric Respiratory)</option>
                      <option value="OTHER_HIGH_RISK">Other High-Risk Care (Post-Surgical, Cardiac)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Risk Severity Level
                    </label>
                    <select
                      value={riskLevel}
                      onChange={(e) => setRiskLevel(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                    >
                      <option value="CRITICAL">Critical (High Complication Risk)</option>
                      <option value="HIGH">High Risk</option>
                      <option value="MODERATE">Moderate Risk</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Specific Diagnosis / Condition Details *
                  </label>
                  <input
                    type="text"
                    required
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    placeholder="e.g. Gestational Diabetes with Polyhydramnios & Anemia (Hb 8.4 g/dL)"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold"
                  />
                </div>
              </div>

              {/* STEP 3: REQUIRED FOLLOW-UP TYPE & ASSIGNED PROVIDER */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Required Follow-up Type *
                  </label>
                  <select
                    value={followUpType}
                    onChange={(e) => setFollowUpType(e.target.value as FollowUpType)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                  >
                    <option value="CHECKUP">Clinical Check-up & Physical Examination</option>
                    <option value="TEST_DIAGNOSTIC_REVIEW">Test / Diagnostic Review (Lab / Ultrasound)</option>
                    <option value="MEDICATION_REVIEW">Medication Review & Dosage Titration</option>
                    <option value="SPECIALIST_REVIEW">Specialist / Super-Specialist Review</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assign Doctor / Health Worker *
                  </label>
                  <input
                    type="text"
                    required
                    value={assignedDoctorName}
                    onChange={(e) => setAssignedDoctorName(e.target.value)}
                    placeholder="e.g. Dr. Ananya Sen / Lakshmi Devi (ASHA)"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold"
                  />
                </div>
              </div>

              {/* STEP 4: NEXT FOLLOW-UP DATE & INSTRUCTION */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Next Follow-up Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={nextFollowUpDate}
                    onChange={(e) => setNextFollowUpDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Provider Clinical Role
                  </label>
                  <input
                    type="text"
                    value={assignedRole}
                    onChange={(e) => setAssignedRole(e.target.value)}
                    placeholder="e.g. Consultant OB/GYN or ASHA Worker"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Short Follow-up Instruction for Patient & Staff *
                </label>
                <textarea
                  rows={2}
                  required
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="e.g. Fasting blood glucose test at 8 AM, then visit OPD Room 104 with previous prescription."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                >
                  Save & Enroll Follow-up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RECORD OUTCOME & UPDATE STATUS */}
      {/* ========================================================================= */}
      {outcomePatient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                  Clinical Care Log
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Record Follow-up Outcome
                </h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Patient: {outcomePatient.patientName} (ID: {outcomePatient.patientId || outcomePatient.id})
                </p>
              </div>
              <button
                onClick={() => setOutcomePatient(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOutcome} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Update Follow-up Status *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['SCHEDULED', 'CONTACTED', 'COMPLETED', 'MISSED'] as FollowUpStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setOutcomeStatus(st)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border text-center ${
                        outcomeStatus === st
                          ? st === 'COMPLETED'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : st === 'MISSED'
                            ? 'bg-red-600 text-white border-red-600 shadow-xs'
                            : st === 'CONTACTED'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Follow-up Notes / Consultation Findings *
                </label>
                <textarea
                  rows={3}
                  required
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  placeholder="e.g. Patient attended OPD. Examined by Dr. Ananya Sen. Hemoglobin improved to 9.2 g/dL. Tolerating oral iron supplements well."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Vitals Recorded (Optional)
                </label>
                <input
                  type="text"
                  value={outcomeVitals}
                  onChange={(e) => setOutcomeVitals(e.target.value)}
                  placeholder="e.g. BP 128/82 mmHg, Pulse 76, FHR 144 bpm"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Next Clinical Action / Next Review
                </label>
                <input
                  type="text"
                  value={outcomeNextAction}
                  onChange={(e) => setOutcomeNextAction(e.target.value)}
                  placeholder="e.g. Next routine ANC scan at 36 weeks; continue home BP monitoring."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOutcomePatient(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                >
                  Save Outcome & History
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CONTACT PATIENT */}
      {/* ========================================================================= */}
      {contactingPatient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                  Patient Communication
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Contact High-Risk Patient
                </h3>
              </div>
              <button
                onClick={() => setContactingPatient(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-900 text-sm">
                {contactingPatient.patientName}
              </div>
              <div className="text-xs text-slate-600 font-mono">
                Patient ID: {contactingPatient.patientId || contactingPatient.id}
              </div>
              <div className="text-xs text-slate-600">
                Contact Phone:{' '}
                <span className="font-black text-slate-900">
                  {contactingPatient.patientPhone || contactingPatient.phone || '9849112501'}
                </span>
              </div>
              <div className="text-xs text-slate-600">
                Due Date: <span className="font-bold text-rose-700">{contactingPatient.nextFollowUpDate}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <a
                href={`tel:${contactingPatient.patientPhone || contactingPatient.phone || '9849112501'}`}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>Call Patient Mobile Directly</span>
              </a>

              <a
                href={`https://wa.me/91${(contactingPatient.patientPhone || contactingPatient.phone || '9849112501').replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(
                  `Hello ${contactingPatient.patientName}, this is Care Connect from ${contactingPatient.hospitalName}. This is a reminder for your high-risk follow-up (${contactingPatient.condition}) scheduled on ${contactingPatient.nextFollowUpDate}. Instruction: ${contactingPatient.instruction}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Open WhatsApp Chat & Reminder</span>
              </a>

              <button
                onClick={() => {
                  handleSendReminder(contactingPatient);
                  setContactingPatient(null);
                }}
                className="w-full py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Send Automated System SMS</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: PATIENT PREVIOUS FOLLOW-UP HISTORY */}
      {/* ========================================================================= */}
      {historyPatient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Care Continuity History
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Follow-up History & Outcome Log
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {historyPatient.patientName} • Patient ID: {historyPatient.patientId || historyPatient.id}
                </p>
              </div>
              <button
                onClick={() => setHistoryPatient(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 flex-1">
              {(!historyPatient.outcomes || historyPatient.outcomes.length === 0) ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No prior follow-up outcomes recorded for this patient yet.
                </div>
              ) : (
                historyPatient.outcomes.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="relative pl-6 pb-4 border-l-2 border-slate-200 last:border-transparent space-y-1.5"
                  >
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 border-rose-500" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-slate-900">
                        {item.recordedBy || 'Hospital Staff'}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(item.recordedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      {getStatusBadge(item.status)}
                    </div>

                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed font-medium">
                      {item.notes}
                    </p>

                    {item.vitals && (
                      <div className="text-[11px] text-slate-600 bg-rose-50/70 px-2.5 py-1 rounded-lg font-mono">
                        <span className="font-bold text-rose-900">Vitals: </span>
                        {item.vitals}
                      </div>
                    )}

                    {item.nextAction && (
                      <div className="text-[11px] text-blue-700 font-semibold">
                        Next Action: {item.nextAction}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setHistoryPatient(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: URGENT ESCALATION */}
      {/* ========================================================================= */}
      {escalatingPatient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl border-2 border-red-300">
            <div className="flex items-center justify-between border-b border-red-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-red-600 text-white rounded-xl">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-red-950">
                    Clinical Escalation
                  </h3>
                  <p className="text-xs text-red-700 font-semibold">
                    {escalatingPatient.patientName} (ID: {escalatingPatient.patientId || escalatingPatient.id})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEscalatingPatient(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTriggerEscalation} className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Escalating flags this case to the hospital Senior Medical Officer, ASHA field supervisor, and clinical triage unit for urgent intervention.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Reason for Clinical Escalation *
                </label>
                <textarea
                  rows={3}
                  required
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  placeholder="e.g. Patient missed critical gestational diabetes follow-up. High risk of fetal distress. Urgent home visit needed."
                  className="w-full p-2.5 rounded-xl border border-red-300 text-xs font-medium focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEscalatingPatient(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <AlertOctagon className="w-4 h-4" />
                  <span>Confirm Escalation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: EDIT / RESCHEDULE HIGH-RISK FOLLOW-UP */}
      {/* ========================================================================= */}
      {editingPatient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                  Care Continuity Management
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  Edit & Reschedule High-Risk Follow-up
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Patient: <span className="font-bold text-slate-800">{editingPatient.patientName}</span> • Unique Patient ID: <span className="font-mono font-bold text-rose-600">{editingPatient.patientId || editingPatient.id}</span>
                </p>
              </div>
              <button
                onClick={() => setEditingPatient(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Risk Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">
                    Risk Category *
                  </label>
                  <select
                    value={editRiskCategory}
                    onChange={(e) => setEditRiskCategory(e.target.value as HighRiskCategory)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MATERNAL">Maternal ANC Care</option>
                    <option value="CHRONIC_DISEASE">Chronic Disease (NCD)</option>
                    <option value="CHILD">Child Health Care</option>
                    <option value="OTHER">Other High Risk Surveillance</option>
                  </select>
                </div>

                {/* Risk Severity Level */}
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">
                    Severity Level *
                  </label>
                  <select
                    value={editRiskLevel}
                    onChange={(e) => setEditRiskLevel(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CRITICAL">Critical (High vulnerability)</option>
                    <option value="HIGH">High (Regular surveillance)</option>
                    <option value="MODERATE">Moderate (Routine review)</option>
                  </select>
                </div>
              </div>

              {/* Condition */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  High-Risk Condition / Clinical Indication *
                </label>
                <input
                  type="text"
                  required
                  value={editCondition}
                  onChange={(e) => setEditCondition(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Follow-up Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">
                    Follow-up Type *
                  </label>
                  <select
                    value={editFollowUpType}
                    onChange={(e) => setEditFollowUpType(e.target.value as FollowUpType)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CHECKUP">Clinical Check-up</option>
                    <option value="TEST_DIAGNOSTIC_REVIEW">Test / Diagnostic Review</option>
                    <option value="MEDICATION_REVIEW">Medication Review</option>
                    <option value="SPECIALIST_REVIEW">Specialist Review</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">
                    Follow-up Status *
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as FollowUpStatus)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="MISSED">Missed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Assigned Doctor / Provider */}
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">
                    Responsible Doctor / Health Worker *
                  </label>
                  <input
                    type="text"
                    required
                    value={editAssignedTo}
                    onChange={(e) => setEditAssignedTo(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Next Follow-up Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1">
                    Next Follow-up Date (Reschedule) *
                  </label>
                  <input
                    type="date"
                    required
                    value={editNextFollowUpDate}
                    onChange={(e) => setEditNextFollowUpDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Follow-up Instructions (Visible to Citizen) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={editInstruction}
                  onChange={(e) => setEditInstruction(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPatient(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save & Synchronize Follow-up</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
