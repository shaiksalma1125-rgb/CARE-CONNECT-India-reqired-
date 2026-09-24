import React, { useState, useMemo } from 'react';
import {
  Clock,
  Users,
  Building2,
  CheckCircle2,
  AlertCircle,
  Bell,
  RefreshCw,
  QrCode,
  Ticket,
  ChevronRight,
  ShieldCheck,
  Stethoscope,
  Volume2
} from 'lucide-react';
import { apiStore } from '../../services/apiStore';
import { OPDQueueInfo, LanguageCode, User } from '../../types';
import { translations } from '../../utils/translations';

interface AppointmentQueueViewProps {
  language: LanguageCode;
  currentUser: User | null;
  onNavigateToHospital?: (hospitalId: string) => void;
  onNavigate?: (view: any, payload?: any) => void;
  initialHospitalId?: string;
  initialDoctorId?: string;
  initialDepartment?: string;
  initialPatientName?: string;
  refreshKey?: number;
  onRefresh?: () => void;
}

export const AppointmentQueueView: React.FC<AppointmentQueueViewProps> = ({
  language,
  currentUser,
  onNavigateToHospital,
  onNavigate,
  initialHospitalId,
  initialDepartment,
  initialPatientName,
  refreshKey,
  onRefresh
}) => {
  const t = translations[language];
  const [queuesKey, setQueuesKey] = useState(0);

  React.useEffect(() => {
    if (refreshKey !== undefined) {
      setQueuesKey((k) => k + 1);
    }
  }, [refreshKey]);

  const hospitals = useMemo(() => apiStore.getHospitals(), [queuesKey]);
  const [selectedHospitalId, setSelectedHospitalId] = useState(initialHospitalId || hospitals[0]?.id || 'hosp-1');

  const isStaff = currentUser?.role === 'HOSPITAL_STAFF';

  // Walk-in token generator state
  const [patientName, setPatientName] = useState(initialPatientName || currentUser?.name || '');
  const [selectedDept, setSelectedDept] = useState(initialDepartment || 'General Medicine OPD');
  const [myTokenInfo, setMyTokenInfo] = useState<{
    tokenNumber: number;
    tokenCode: string;
    estimatedWaitMins: number;
    roomNumber: string;
    hospitalName: string;
    department: string;
  } | null>(null);

  // Sync props
  React.useEffect(() => {
    if (initialHospitalId) setSelectedHospitalId(initialHospitalId);
    if (initialDepartment) setSelectedDept(initialDepartment);
    if (initialPatientName) setPatientName(initialPatientName);
  }, [initialHospitalId, initialDepartment, initialPatientName]);

  // Load existing offline token if available
  React.useEffect(() => {
    const offlineTokens = apiStore.getOfflineTokens();
    if (offlineTokens && offlineTokens.length > 0 && !myTokenInfo) {
      const latest = offlineTokens[0];
      const hosp = hospitals.find((h) => h.id === latest.hospitalId);
      setMyTokenInfo({
        tokenNumber: latest.tokenNumber || 1,
        tokenCode: latest.tokenCode || 'TK-01',
        estimatedWaitMins: latest.estimatedWaitMins || 10,
        roomNumber: latest.roomNumber || 'Room 101',
        hospitalName: latest.hospitalName || hosp?.name || 'Government Health Centre',
        department: latest.department || 'General Medicine OPD'
      });
    }
  }, [hospitals]);

  const [callAlert, setCallAlert] = useState<string | null>(null);

  const queues = useMemo(() => {
    return apiStore.getQueues(selectedHospitalId);
  }, [selectedHospitalId, queuesKey]);

  const handleIssueToken = (e: React.FormEvent) => {
    e.preventDefault();
    const hosp = hospitals.find((h) => h.id === selectedHospitalId);
    const pName = patientName.trim() || currentUser?.name || 'Citizen Patient';
    const res = apiStore.issueQueueToken(selectedHospitalId, selectedDept, pName);
    setMyTokenInfo({
      ...res,
      hospitalName: hosp?.name || 'Government Health Centre',
      department: selectedDept
    });
    setQueuesKey((k) => k + 1);
  };

  const handleCallNext = (queueId: string) => {
    const updated = apiStore.callNextQueueToken(queueId);
    if (updated) {
      setCallAlert(`Chamber Announcement: Now Calling ${updated.currentServingToken} for ${updated.department} at ${updated.roomNumber}!`);
      setQueuesKey((k) => k + 1);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-xs font-semibold mb-2">
              <Ticket className="w-3.5 h-3.5 text-teal-300" />
              <span>National OPD Digitization & Token Management System</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t.appointmentQueue}
            </h1>
            <p className="text-sm text-teal-100 mt-1 max-w-2xl leading-relaxed">
              {t.appointmentQueueDesc}. Live token display by chamber, algorithmic wait-time calculations, and automated SMS/offline token passes for transparent public healthcare access.
            </p>
          </div>

          {/* Hospital selector & Live Refresh Button */}
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/20 flex flex-col gap-2">
            <label className="block text-[11px] font-bold text-teal-200 uppercase">Select Facility</label>
            <div className="flex items-center gap-2">
              <select
                value={selectedHospitalId}
                onChange={(e) => setSelectedHospitalId(e.target.value)}
                className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-semibold border border-slate-700"
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.type})
                  </option>
                ))}
              </select>
              <button
                id="queue-refresh-board-btn"
                type="button"
                onClick={() => {
                  if (onRefresh) {
                    onRefresh();
                  } else {
                    setQueuesKey((k) => k + 1);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs border border-teal-400/40"
                title="Refresh live OPD queue chamber status and token countdowns"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {callAlert && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-center justify-between text-amber-950 text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Volume2 className="w-5 h-5 text-amber-700 animate-pulse" />
            <span className="font-bold text-sm">{callAlert}</span>
          </div>
          <button
            onClick={() => setCallAlert(null)}
            className="text-amber-700 hover:text-amber-900 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Live Queue Cards & Token Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Live OPD Department Token Boards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600" />
              <span>Live Department Token Calling Display</span>
            </h2>
            <button
              onClick={() => setQueuesKey((k) => k + 1)}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Refresh queue"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {queues.map((q) => {
              const queueRemaining = Math.max(0, q.totalTokensIssued - q.currentTokenNumber);
              const estWait = queueRemaining * q.avgWaitTimePerPatientMinutes;

              return (
                <div
                  key={q.id}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                          {q.roomNumber}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 leading-snug">{q.department}</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                          <span>{q.doctorName}</span>
                        </p>
                      </div>

                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase">
                        {q.status}
                      </span>
                    </div>

                    {/* Big Live Token Box */}
                    <div className="bg-slate-900 text-white rounded-2xl p-4 text-center space-y-1 shadow-inner">
                      <span className="text-[10px] text-teal-400 uppercase font-bold tracking-wider">
                        {t.nowServing}
                      </span>
                      <div className="text-4xl font-black font-mono tracking-tight text-teal-300">
                        {q.currentServingToken}
                      </div>
                      <span className="text-[11px] text-slate-400 block">
                        Updated {q.lastUpdated}
                      </span>
                    </div>

                    {/* Queue Statistics */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block">In Waiting Line</span>
                        <span className="font-bold text-slate-800 text-sm">{queueRemaining} Patients</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">{t.estimatedWait}</span>
                        <span className="font-bold text-emerald-700 text-sm">~{estWait} mins</span>
                      </div>
                    </div>
                  </div>

                  {/* Chamber Staff Calling Simulation / Live Status */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Total Issued: {q.totalTokensIssued}
                    </span>
                    {isStaff ? (
                      <button
                        onClick={() => handleCallNext(q.id)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Call Next Token</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping"></span>
                        Live Queue Active
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Get OPD Token & My Token Card */}
        <div className="space-y-6">
          {/* Active Citizen Token Card if generated */}
          {myTokenInfo && (
            <div className="bg-gradient-to-br from-teal-600 to-emerald-700 text-white rounded-3xl p-6 shadow-lg space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-teal-400/40 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-100 flex items-center gap-1.5">
                  <Ticket className="w-4 h-4" />
                  Your Active Token
                </span>
                <span className="text-[10px] bg-white text-teal-900 px-2 py-0.5 rounded font-mono font-bold">
                  OFFLINE SAVED
                </span>
              </div>

              <div className="text-center py-2">
                <span className="text-[11px] text-teal-100 uppercase tracking-widest block">Token Number</span>
                <div className="text-5xl font-black font-mono tracking-tight text-white mt-1">
                  {myTokenInfo.tokenCode}
                </div>
                <p className="text-xs font-semibold text-teal-100 mt-1">{myTokenInfo.department}</p>
                <p className="text-[11px] text-teal-200">{myTokenInfo.hospitalName} &bull; {myTokenInfo.roomNumber}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/20 text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-teal-200 uppercase block">Estimated Wait</span>
                  <span className="font-bold text-white text-sm">~{myTokenInfo.estimatedWaitMins} Minutes</span>
                </div>
                <QrCode className="w-8 h-8 text-white/90" />
              </div>

              <p className="text-[10px] text-teal-100 text-center leading-relaxed">
                This token is cached offline in your Low-Connectivity 2G mode. Proceed to {myTokenInfo.roomNumber} when your number approaches.
              </p>
            </div>
          )}

          {/* Issue Walk-In OPD Token Form */}
          <form onSubmit={handleIssueToken} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-teal-600" />
              <span>Generate Instant OPD Token</span>
            </h3>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Skip crowded hospital registration counters. Generate a digital queue token from your mobile.
            </p>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Patient Full Name</label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Clinical Department</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold"
              >
                <option value="General Medicine">General Medicine (Room 101)</option>
                <option value="Cardiology">Cardiology (Room 104)</option>
                <option value="Obstetrics & Gynaecology">Obstetrics & Gynaecology (Room 203)</option>
                <option value="Pediatrics">Pediatrics (Room 108)</option>
                <option value="Orthopaedics">Orthopaedics (Room 205)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Ticket className="w-4 h-4" />
              <span>Generate Token & Join Queue</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
