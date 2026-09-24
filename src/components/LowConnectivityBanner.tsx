import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  WifiOff,
  Wifi,
  QrCode,
  Clock,
  Building2,
  Phone,
  MessageSquare,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Ticket,
  AlertTriangle,
  Send,
  Copy,
  Users,
  Check,
  Stethoscope,
  Volume2,
  XCircle,
  ExternalLink
} from 'lucide-react';
import { apiStore } from '../services/apiStore';
import {
  offlineQueueService,
  getDetailedNetworkStatus,
  getHospitalShortCode,
  getDepartmentShortCode,
  NetworkMode
} from '../services/offlineQueueService';
import { LanguageCode, User, OfflineOPDToken } from '../types';
import { translations } from '../utils/translations';

interface LowConnectivityBannerProps {
  language: LanguageCode;
  currentUser?: User | null;
  onNavigateToHospital?: (hospitalId: string) => void;
  onNavigate?: (view: any, payload?: any) => void;
}

const DEPARTMENTS = [
  'General Medicine OPD',
  'Pediatrics OPD',
  'Cardiology OPD',
  'Orthopedics OPD',
  'Obstetrics & Gynecology OPD',
  'Dermatology OPD',
  'ENT OPD',
  'Ophthalmology OPD',
  'General Surgery OPD',
  'Dental OPD'
];

export const LowConnectivityBanner: React.FC<LowConnectivityBannerProps> = ({
  language,
  currentUser,
  onNavigateToHospital,
  onNavigate
}) => {
  const t = translations[language] || translations.en;

  // Network Detection
  const [networkStatus, setNetworkStatus] = useState<NetworkMode>(() => {
    return getDetailedNetworkStatus().mode;
  });

  const [isLowBandwidthMode, setIsLowBandwidthMode] = useState<boolean>(() => {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('sih_low_bandwidth_mode');
      if (stored !== null) return stored === 'true';
    }
    const net = getDetailedNetworkStatus();
    return net.mode === 'OFFLINE' || net.mode === 'LOW_CONNECTIVITY';
  });

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'pass' | 'generate' | 'all' | 'sms-ussd' | 'staff'>(
    'pass'
  );

  const [offlineTokens, setOfflineTokens] = useState<OfflineOPDToken[]>(() => {
    return offlineQueueService.getTokens();
  });

  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [copiedSMS, setCopiedSMS] = useState<boolean>(false);

  // Form State for Booking Offline Token
  const hospitals = useMemo(() => apiStore.getHospitals(), []);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(() => {
    if (currentUser?.hospitalId) return currentUser.hospitalId;
    return hospitals[0]?.id || 'hosp-1';
  });
  const [selectedDept, setSelectedDept] = useState<string>('General Medicine OPD');
  const [patientNameInput, setPatientNameInput] = useState<string>(() => {
    return currentUser?.name || '';
  });
  const [patientPhoneInput, setPatientPhoneInput] = useState<string>(() => {
    return currentUser?.mobile || '';
  });
  const [generatedTokenAlert, setGeneratedTokenAlert] = useState<string | null>(null);

  // Synchronize network state listeners
  const checkNetwork = useCallback(() => {
    const detailed = getDetailedNetworkStatus();
    setNetworkStatus(detailed.mode);

    // Auto-switch to low-connectivity mode when offline or slow 2G
    if (detailed.mode === 'OFFLINE' || detailed.mode === 'LOW_CONNECTIVITY') {
      if (!isLowBandwidthMode) {
        setIsLowBandwidthMode(true);
        localStorage.setItem('sih_low_bandwidth_mode', 'true');
        document.body.classList.add('low-bandwidth-mode');
      }
    }
  }, [isLowBandwidthMode]);

  useEffect(() => {
    checkNetwork();

    const handleOnline = () => {
      checkNetwork();
      // Real-time synchronization when internet returns
      triggerSync(true);
    };

    const handleOffline = () => {
      checkNetwork();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const conn = (navigator as any)?.connection || (navigator as any)?.mozConnection || (navigator as any)?.webkitConnection;
    if (conn && conn.addEventListener) {
      conn.addEventListener('change', checkNetwork);
    }

    const handleTokensChanged = () => {
      setOfflineTokens(offlineQueueService.getTokens());
    };
    window.addEventListener('sih_offline_tokens_changed', handleTokensChanged);
    window.addEventListener('sih_offline_sync_completed', handleTokensChanged);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (conn && conn.removeEventListener) {
        conn.removeEventListener('change', checkNetwork);
      }
      window.removeEventListener('sih_offline_tokens_changed', handleTokensChanged);
      window.removeEventListener('sih_offline_sync_completed', handleTokensChanged);
    };
  }, [checkNetwork]);

  // Sync token list
  useEffect(() => {
    setOfflineTokens(offlineQueueService.getTokens());
  }, [isExpanded]);

  const toggleMode = () => {
    const next = !isLowBandwidthMode;
    setIsLowBandwidthMode(next);
    localStorage.setItem('sih_low_bandwidth_mode', String(next));
    if (next) {
      document.body.classList.add('low-bandwidth-mode');
    } else {
      document.body.classList.remove('low-bandwidth-mode');
    }
  };

  // Trigger synchronization
  const triggerSync = (isAuto = false) => {
    if (syncing) return;
    const net = getDetailedNetworkStatus();
    if (!net.isOnline || net.mode === 'OFFLINE') {
      if (!isAuto) {
        setSyncFeedback('Cannot sync while offline. Records remain securely saved on this device.');
        setTimeout(() => setSyncFeedback(null), 4000);
      }
      return;
    }

    setSyncing(true);
    setSyncFeedback('Connecting to apex health database & synchronizing...');

    setTimeout(() => {
      const result = offlineQueueService.syncPendingTokens();
      setOfflineTokens(offlineQueueService.getTokens());
      setSyncing(false);
      if (result.syncedCount > 0) {
        setSyncFeedback(`Successfully synchronized ${result.syncedCount} offline OPD record(s) to central database!`);
      } else {
        setSyncFeedback('All offline tokens are already synchronized and up-to-date.');
      }
      setTimeout(() => setSyncFeedback(null), 4000);
    }, 600);
  };

  // Selected hospital metadata
  const selectedHospital = useMemo(() => {
    return hospitals.find((h) => h.id === selectedHospitalId) || hospitals[0];
  }, [hospitals, selectedHospitalId]);

  // Generate Offline Token
  const handleGenerateOfflineToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHospital) return;

    const token = offlineQueueService.issueOfflineToken({
      hospitalId: selectedHospital.id,
      hospitalName: selectedHospital.name,
      department: selectedDept,
      patientName: patientNameInput.trim() || currentUser?.name || 'Citizen Patient',
      patientPhone: patientPhoneInput.trim() || currentUser?.mobile || '',
      source: 'WEB_OFFLINE'
    });

    setOfflineTokens(offlineQueueService.getTokens());
    setGeneratedTokenAlert(`Offline OPD Token ${token.tokenCode} generated! Room: ${token.roomNumber}`);
    setActiveSubTab('pass');
    setTimeout(() => setGeneratedTokenAlert(null), 5000);
  };

  // Filter tokens
  const isStaff = currentUser?.role === 'HOSPITAL_STAFF';
  const staffHospitalId = currentUser?.hospitalId || 'hosp-1';

  const myTokens = useMemo(() => {
    if (!currentUser || currentUser.role === 'CITIZEN') {
      return offlineTokens;
    }
    return offlineTokens;
  }, [offlineTokens, currentUser]);

  const latestToken = myTokens[0];

  const pendingCount = useMemo(() => {
    return offlineTokens.filter((t) => t.syncStatus === 'PENDING').length;
  }, [offlineTokens]);

  const staffTokens = useMemo(() => {
    return offlineTokens.filter((t) => t.hospitalId === staffHospitalId);
  }, [offlineTokens, staffHospitalId]);

  // SMS Text Construction (Dynamic according to selected hospital & department)
  const smsPayload = useMemo(() => {
    const hospCode = getHospitalShortCode(selectedHospital?.name || 'GGH Vijayawada', selectedHospital?.id);
    const deptCode = getDepartmentShortCode(selectedDept);
    const pName = (patientNameInput.trim() || currentUser?.name || 'PATIENT').split(' ')[0].toUpperCase();
    return `OPD ${hospCode} ${deptCode} ${pName}`;
  }, [selectedHospital, selectedDept, patientNameInput, currentUser]);

  const smsHref = `sms:166?body=${encodeURIComponent(smsPayload)}`;
  const ussdTel = `tel:*99*108%23`;

  const handleCopySMS = () => {
    navigator.clipboard?.writeText?.(smsPayload);
    setCopiedSMS(true);
    setTimeout(() => setCopiedSMS(false), 3000);
  };

  return (
    <div className="bg-slate-800 text-white rounded-2xl border border-slate-700 text-xs transition-all overflow-hidden shadow-xs w-full">
      {/* Main Top Banner Bar */}
      <div className="w-full px-4 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status Indicator Icon */}
          <div
            className={`p-1.5 rounded-md flex items-center justify-center ${
              networkStatus === 'OFFLINE'
                ? 'bg-rose-500 text-white font-bold'
                : networkStatus === 'LOW_CONNECTIVITY'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-emerald-600 text-white font-bold'
            }`}
            title={`Network Status: ${networkStatus}`}
          >
            {networkStatus === 'OFFLINE' ? (
              <WifiOff className="w-3.5 h-3.5" />
            ) : networkStatus === 'LOW_CONNECTIVITY' ? (
              <WifiOff className="w-3.5 h-3.5" />
            ) : (
              <Wifi className="w-3.5 h-3.5" />
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="font-semibold text-slate-100 flex items-center gap-1.5">
              {networkStatus === 'OFFLINE' ? (
                <span className="text-rose-400 font-bold">Offline Mode Active</span>
              ) : networkStatus === 'LOW_CONNECTIVITY' ? (
                <span className="text-amber-300 font-bold">2G / Low-Connectivity Active</span>
              ) : (
                <span className="text-emerald-300 font-bold">Online (Broadband/4G)</span>
              )}
            </span>

            {/* Network Badge */}
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                networkStatus === 'OFFLINE'
                  ? 'bg-rose-950/70 text-rose-300 border-rose-500/40'
                  : networkStatus === 'LOW_CONNECTIVITY'
                  ? 'bg-amber-950/70 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
              }`}
            >
              Status: {networkStatus === 'LOW_CONNECTIVITY' ? '2G-Low Connectivity' : networkStatus}
            </span>

            <span className="hidden md:inline text-[11px] text-slate-400">
              {networkStatus === 'OFFLINE'
                ? 'Instant local tokens & cached queue preserved'
                : isLowBandwidthMode
                ? 'Lightweight text mode, zero data loss in rural areas'
                : 'Full connectivity with automated cloud sync'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Real-time Sync Status Button */}
          <button
            type="button"
            onClick={() => triggerSync(false)}
            disabled={syncing}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              pendingCount > 0
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/50 animate-pulse'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600'
            }`}
            title={pendingCount > 0 ? `${pendingCount} token(s) pending sync` : 'All tokens synced with server'}
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin text-blue-400' : ''}`} />
            <span>
              {syncing
                ? 'Syncing...'
                : pendingCount > 0
                ? `Pending Sync (${pendingCount})`
                : 'Synced'}
            </span>
          </button>

          {/* Offline OPD Drawer Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-[11px] font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>
              {latestToken
                ? `Offline Token (${latestToken.tokenCode})`
                : 'Offline OPD Tokens & Booking'}
            </span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* 2G Mode Manual Toggle */}
          <button
            type="button"
            onClick={toggleMode}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer border ${
              isLowBandwidthMode
                ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 border-amber-300'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600'
            }`}
          >
            {isLowBandwidthMode ? 'Turn Off 2G Mode' : 'Enable 2G Mode'}
          </button>
        </div>
      </div>

      {/* Sync Feedback Toast */}
      {syncFeedback && (
        <div className="bg-slate-900 px-4 py-2 border-t border-slate-700 text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2 text-slate-200">
            {syncing ? (
              <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
            ) : syncFeedback.includes('Cannot') ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="font-semibold text-[11px]">{syncFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncFeedback(null)}
            className="text-[10px] text-slate-400 hover:text-white uppercase font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Token Generated Success Toast */}
      {generatedTokenAlert && (
        <div className="bg-emerald-900/90 text-emerald-100 px-4 py-2 border-t border-emerald-700 text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span className="font-bold text-[11px]">{generatedTokenAlert}</span>
          </div>
          <button
            type="button"
            onClick={() => setGeneratedTokenAlert(null)}
            className="text-[10px] text-emerald-300 hover:text-white uppercase font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Expanded Offline Multi-Functional Drawer */}
      {isExpanded && (
        <div className="bg-slate-900 border-t border-slate-700 p-4 sm:p-6 transition-all animate-in slide-in-from-top-2 space-y-4">
          {/* Sub-Tabs Navigation */}
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-3 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveSubTab('pass')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'pass'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Active Offline Pass {latestToken ? `(${latestToken.tokenCode})` : ''}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('generate')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'generate'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Generate Offline OPD Token</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Stored Tokens ({offlineTokens.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('sms-ussd')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'sms-ussd'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>SMS & USSD Direct Booking</span>
            </button>

            {isStaff && (
              <button
                type="button"
                onClick={() => setActiveSubTab('staff')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeSubTab === 'staff'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-purple-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Hospital Staff Queue ({staffTokens.length})</span>
              </button>
            )}
          </div>

          {/* Sub-Tab 1: Active Offline Token Pass */}
          {activeSubTab === 'pass' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {latestToken ? (
                <div className="bg-white text-slate-900 rounded-2xl p-5 border border-slate-300 shadow-lg space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          latestToken.syncStatus === 'SYNCED' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      ></span>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Offline Verified OPD Token Pass
                      </span>
                    </div>

                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${
                        latestToken.syncStatus === 'SYNCED'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {latestToken.syncStatus === 'SYNCED' ? '● Synced to Server' : '● Pending Sync'}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Patient Name</span>
                      <h4 className="text-base font-extrabold text-slate-900">{latestToken.patientName}</h4>
                      {latestToken.patientPhone && (
                        <span className="text-[11px] text-slate-500 block">📞 {latestToken.patientPhone}</span>
                      )}
                      <span className="text-xs font-bold text-blue-700 block mt-1">{latestToken.hospitalName}</span>
                      <span className="text-[11px] font-semibold text-slate-600 block">{latestToken.department}</span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Token Code</span>
                      <span className="text-3xl sm:text-4xl font-black text-blue-800 font-mono tracking-tight block">
                        {latestToken.tokenCode}
                      </span>
                      <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded inline-block mt-1">
                        Chamber: {latestToken.roomNumber}
                      </span>
                    </div>
                  </div>

                  {/* Queue Details Box */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">Date of Visit</span>
                      <span className="font-bold text-slate-800">{latestToken.date}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">Est. Waiting Time</span>
                      <span className="font-bold text-emerald-700 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        ~{latestToken.estimatedWaitMins} mins
                      </span>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">Call Status</span>
                      <span
                        className={`font-bold uppercase text-[11px] ${
                          latestToken.status === 'CALLING'
                            ? 'text-amber-700 animate-pulse'
                            : latestToken.status === 'COMPLETED' || latestToken.status === 'SERVED'
                            ? 'text-emerald-700'
                            : 'text-blue-700'
                        }`}
                      >
                        {latestToken.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Issued: {new Date(latestToken.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {onNavigateToHospital && (
                      <button
                        type="button"
                        onClick={() => onNavigateToHospital(latestToken.hospitalId)}
                        className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Facility Info</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <p className="text-[10px] text-slate-500 bg-blue-50/70 p-2.5 rounded-lg border border-blue-100 text-center leading-relaxed">
                    Present this screen directly at the hospital OPD registration desk or doctor chamber. This pass is cryptographically and locally registered for zero-network validation.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 text-slate-300 text-xs space-y-3 flex flex-col justify-center items-center text-center">
                  <Ticket className="w-10 h-10 text-slate-500 mb-1" />
                  <h4 className="font-bold text-sm text-slate-100">No Offline OPD Pass Stored</h4>
                  <p className="text-[11px] text-slate-400 max-w-sm">
                    You have not generated an offline OPD token on this device yet. Generate an instant token below to secure your queue slot even when offline.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('generate')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Generate Offline Token Now
                  </button>
                </div>
              )}

              {/* Quick Info & Direct Channel Links */}
              <div className="space-y-4">
                <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 space-y-2.5">
                  <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    How Offline 2G Mode Works
                  </h4>
                  <ul className="text-[11px] text-slate-300 space-y-1.5 list-disc list-inside">
                    <li>Tokens are calculated and stored locally on your device with zero data latency.</li>
                    <li>When your phone reconnects to 4G, Wi-Fi, or broadband, records sync automatically.</li>
                    <li>Works across all public hospitals and primary health facilities in Andhra Pradesh.</li>
                  </ul>
                </div>

                <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 space-y-2.5">
                  <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-amber-400" />
                    Need to Book Without Smart Web App?
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Use our toll-free GSM SMS or keypad USSD codes directly from any basic phone:
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('sms-ussd')}
                      className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs cursor-pointer flex items-center gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                      <span>SMS & USSD Options &rarr;</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: Generate Offline OPD Token */}
          {activeSubTab === 'generate' && (
            <form onSubmit={handleGenerateOfflineToken} className="bg-slate-800/90 p-5 rounded-2xl border border-slate-700 space-y-4 max-w-2xl">
              <div className="border-b border-slate-700 pb-3">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-teal-400" />
                  <span>Generate Offline OPD Token (All Participating Hospitals)</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Select your facility and department. A queue token is generated instantly using local device storage even without an active internet connection.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Hospital Selection */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Select Hospital / Health Facility
                  </label>
                  <select
                    value={selectedHospitalId}
                    onChange={(e) => setSelectedHospitalId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 text-white border border-slate-700 font-medium text-xs cursor-pointer"
                  >
                    {hospitals.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Department Selection */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Clinical Department
                  </label>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 text-white border border-slate-700 font-medium text-xs cursor-pointer"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Patient Full Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Patient Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={patientNameInput}
                    onChange={(e) => setPatientNameInput(e.target.value)}
                    placeholder="Enter patient full name"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 text-white border border-slate-700 font-medium text-xs"
                  />
                </div>

                {/* Patient Phone Number (Optional) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Mobile Phone (Optional for SMS Sync)
                  </label>
                  <input
                    type="tel"
                    value={patientPhoneInput}
                    onChange={(e) => setPatientPhoneInput(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 text-white border border-slate-700 font-medium text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('pass')}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>Issue Offline Token</span>
                </button>
              </div>
            </form>
          )}

          {/* Sub-Tab 3: Stored Tokens List */}
          {activeSubTab === 'all' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                  All Locally Stored Tokens on this Device ({offlineTokens.length})
                </h4>
                <button
                  type="button"
                  onClick={() => triggerSync(false)}
                  disabled={syncing}
                  className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                  <span>Sync Pending Records</span>
                </button>
              </div>

              {offlineTokens.length === 0 ? (
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 text-center text-slate-400 text-xs">
                  No tokens stored locally.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {offlineTokens.map((t) => (
                    <div
                      key={t.id}
                      className="bg-slate-800 p-3.5 rounded-xl border border-slate-700 space-y-2 text-xs hover:border-slate-600"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-blue-400 text-sm">{t.tokenCode}</span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                            t.syncStatus === 'SYNCED'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-600/40'
                              : 'bg-amber-950 text-amber-300 border-amber-600/40'
                          }`}
                        >
                          {t.syncStatus}
                        </span>
                      </div>

                      <div>
                        <span className="font-bold text-slate-100 block">{t.patientName}</span>
                        <span className="text-[11px] text-slate-400 block">{t.hospitalName}</span>
                        <span className="text-[10px] text-blue-300 block">{t.department}</span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-700/60 pt-1.5">
                        <span>{t.date}</span>
                        <span className="text-slate-300 font-semibold">{t.roomNumber}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 4: SMS & USSD Direct Booking Channels */}
          {activeSubTab === 'sms-ussd' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SMS Booking Box */}
              <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 space-y-4">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <MessageSquare className="w-4 h-4" />
                  <span>SMS OPD Token Booking (Toll-Free 166)</span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Send a standardized SMS message from any cellular mobile phone. The gateway replies with an official digital queue token.
                </p>

                {/* Facility & Department Quick Selector for SMS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Facility</label>
                    <select
                      value={selectedHospitalId}
                      onChange={(e) => setSelectedHospitalId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 text-white border border-slate-700 text-xs"
                    >
                      {hospitals.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Department</label>
                    <select
                      value={selectedDept}
                      onChange={(e) => setSelectedDept(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 text-white border border-slate-700 text-xs"
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Formatted SMS Payload */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Generated SMS Text</span>
                  <div className="font-mono text-sm text-amber-300 font-bold tracking-wider">{smsPayload}</div>
                  <span className="text-[10px] text-slate-400 block">Recipient Phone Number: <strong>166</strong></span>
                </div>

                {/* Honest SMS Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={smsHref}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Launch Device SMS</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopySMS}
                    className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedSMS ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSMS ? 'Copied to Clipboard!' : 'Copy SMS Syntax'}</span>
                  </button>
                </div>

                <p className="text-[10px] text-slate-400 italic">
                  Note: Clicking &quot;Launch Device SMS&quot; opens your device&apos;s native messaging composer. Delivery relies on your mobile network carrier.
                </p>
              </div>

              {/* USSD Keypad Dialing Box */}
              <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Phone className="w-4 h-4" />
                  <span>USSD Keypad Direct Dialing (*99*108#)</span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Interactive voice/text menu for basic 2G feature phones without any data connection. Dial directly from your phone keypad to navigate OPD queues.
                </p>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">USSD Dial String</span>
                  <div className="font-mono text-base text-emerald-300 font-bold tracking-wider">*99*108#</div>
                  <span className="text-[10px] text-slate-400 block">Toll-free across all GSM carriers in Andhra Pradesh</span>
                </div>

                {/* Honest USSD Actions */}
                <div className="flex items-center gap-2">
                  <a
                    href={ussdTel}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Dial *99*108# on Mobile</span>
                  </a>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/70 text-[10px] text-slate-400 space-y-1 leading-relaxed">
                  <strong className="text-slate-300 block">Device Capability Disclosure:</strong>
                  USSD sessions require GSM cellular hardware. Clicking on mobile devices will trigger your phone dialer. Desktop and laptop web browsers do not possess cellular modems and cannot execute interactive USSD sessions.
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 5: Hospital Staff Queue Controls */}
          {activeSubTab === 'staff' && isStaff && (
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700 pb-3">
                <div>
                  <h4 className="font-bold text-sm text-purple-300 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4" />
                    <span>Hospital Staff - Offline 2G Tokens for this Facility ({staffTokens.length})</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Call next waiting patient, update consultation status, and sync offline chamber records with apex servers.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => triggerSync(false)}
                  disabled={syncing}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span>Sync Facility Queue</span>
                </button>
              </div>

              {staffTokens.length === 0 ? (
                <div className="bg-slate-900 p-6 rounded-xl text-center text-slate-400 text-xs">
                  No offline tokens registered for your facility currently.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase font-bold border-b border-slate-700">
                      <tr>
                        <th className="p-2.5">Token Code</th>
                        <th className="p-2.5">Patient Name</th>
                        <th className="p-2.5">Department</th>
                        <th className="p-2.5">Chamber</th>
                        <th className="p-2.5">Sync</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5 text-right">Staff Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60">
                      {staffTokens.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-700/40">
                          <td className="p-2.5 font-mono font-bold text-blue-400">{st.tokenCode}</td>
                          <td className="p-2.5 font-bold text-slate-200">{st.patientName}</td>
                          <td className="p-2.5 text-slate-300">{st.department}</td>
                          <td className="p-2.5 text-slate-400">{st.roomNumber}</td>
                          <td className="p-2.5">
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                                st.syncStatus === 'SYNCED'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-600/40'
                                  : 'bg-amber-950 text-amber-300 border-amber-600/40'
                              }`}
                            >
                              {st.syncStatus}
                            </span>
                          </td>
                          <td className="p-2.5 font-bold uppercase text-[10px] text-slate-300">{st.status}</td>
                          <td className="p-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {st.status !== 'CALLING' && st.status !== 'COMPLETED' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    offlineQueueService.updateTokenStatus(st.id, 'CALLING');
                                    setOfflineTokens(offlineQueueService.getTokens());
                                  }}
                                  className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                >
                                  <Volume2 className="w-3 h-3" />
                                  <span>Call</span>
                                </button>
                              )}

                              {st.status !== 'COMPLETED' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    offlineQueueService.updateTokenStatus(st.id, 'COMPLETED');
                                    setOfflineTokens(offlineQueueService.getTokens());
                                  }}
                                  className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] cursor-pointer"
                                >
                                  Served
                                </button>
                              )}

                              {st.status !== 'NO_SHOW' && st.status !== 'COMPLETED' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    offlineQueueService.updateTokenStatus(st.id, 'NO_SHOW');
                                    setOfflineTokens(offlineQueueService.getTokens());
                                  }}
                                  className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-[10px] cursor-pointer"
                                >
                                  No-Show
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
    </div>
  );
};
