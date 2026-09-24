import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, UserRole, LanguageCode, Hospital } from './types';
import { apiStore } from './services/apiStore';
import { translations } from './utils/translations';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/views/HomeView';
import { SearchView } from './components/views/SearchView';
import { HospitalDetailsView } from './components/views/HospitalDetailsView';
import { DoctorView } from './components/views/DoctorView';
import { AppointmentView } from './components/views/AppointmentView';
import { MyAppointmentsView } from './components/views/MyAppointmentsView';
import { ComplaintView } from './components/views/ComplaintView';
import { FeedbackView } from './components/views/FeedbackView';
import { StaffDashboardView } from './components/views/StaffDashboardView';
import { AdminDashboardView } from './components/views/AdminDashboardView';
import { TeleconsultationView } from './components/views/TeleconsultationView';
import { DigitalTriageView } from './components/views/DigitalTriageView';
import { PatientHealthRecordsView } from './components/views/PatientHealthRecordsView';
import { ReferralTrackingView } from './components/views/ReferralTrackingView';
import { DiagnosticServicesView } from './components/views/DiagnosticServicesView';
import { AppointmentQueueView } from './components/views/AppointmentQueueView';
import { HighRiskFollowUpView } from './components/views/HighRiskFollowUpView';
import { FacilityQualityDashboardView } from './components/views/FacilityQualityDashboardView';
import { LowConnectivityBanner } from './components/LowConnectivityBanner';
import { EmergencyEscalationModal } from './components/EmergencyEscalationModal';
import { AuthModals } from './components/views/AuthModals';
import { testFirebaseConnection } from './services/firebase';
import {
  Building2,
  HeartPulse,
  PhoneCall,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => apiStore.getCurrentUser());
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [fontScale, setFontScale] = useState<number>(100);

  // Navigation State
  const [currentView, setCurrentView] = useState<string>(() => {
    const initialUser = apiStore.getCurrentUser();
    if (initialUser?.role === 'HOSPITAL_STAFF') return 'staff-dashboard';
    if (initialUser?.role === 'ADMIN' || initialUser?.role === 'HOSPITAL_ADMIN') return 'admin-dashboard';
    return 'home';
  });
  const [viewPayload, setViewPayload] = useState<any>({});

  // Auth modal state
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  // Emergency SOS Modal state
  const [emergencyModalOpen, setEmergencyModalOpen] = useState<boolean>(false);
  const [emergencySymptom, setEmergencySymptom] = useState<string>('');

  // Global Dashboard & Telemetry Refresh State
  const [globalRefreshKey, setGlobalRefreshKey] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshNotification, setRefreshNotification] = useState<string | null>(null);
  const [lastRefreshedText, setLastRefreshedText] = useState<string>(() => apiStore.getLastSyncTimestamp());

  const handleRefreshAllDashboards = () => {
    setIsRefreshing(true);
    const { timestamp } = apiStore.refreshAllData();
    setLastRefreshedText(timestamp);
    setGlobalRefreshKey((prev) => prev + 1);
    setRefreshNotification(`All Dashboards Synchronized: Live OPD queues, hospital telemetry, doctor duty rosters, and bed counts refreshed at ${timestamp}.`);

    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);

    setTimeout(() => {
      setRefreshNotification(null);
    }, 4500);
  };

  const handleOpenEmergencySOS = (symptom?: string) => {
    setEmergencySymptom(symptom || '');
    setEmergencyModalOpen(true);
  };

  // GPS User Location State (Default: Vijayawada reference center)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState<boolean>(false);

  // Auto-route staff/admin to their dashboards on login
  const prevUserIdRef = React.useRef<string | null>(currentUser?.id || null);
  useEffect(() => {
    const prevId = prevUserIdRef.current;
    const currentId = currentUser?.id || null;
    if (prevId !== currentId) {
      prevUserIdRef.current = currentId;
      if (currentUser?.role === 'HOSPITAL_STAFF' && currentView === 'home') {
        setCurrentView('staff-dashboard');
      } else if ((currentUser?.role === 'ADMIN' || currentUser?.role === 'HOSPITAL_ADMIN') && currentView === 'home') {
        setCurrentView('admin-dashboard');
      }
    }
  }, [currentUser?.id, currentUser?.role, currentView]);

  // Haversine distance calculator
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  // Get GPS Location
  const handleUseMyLocation = useCallback(() => {
    if (navigator.geolocation) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          apiStore.ensureNearbyHospitalsForCoords(lat, lng);
          setUserCoords({ lat, lng });
          setLocating(false);

          // Scroll smoothly to the interactive map
          setTimeout(() => {
            const mapEl = document.getElementById('interactive-map-section');
            if (mapEl) {
              mapEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 150);
        },
        (err) => {
          console.warn('Geolocation query result:', err);
          setLocating(false);
          if (err.code === 1) {
            alert('Location permission was denied in your browser. Please allow location access in your browser settings to automatically view nearby healthcare centers.');
          } else {
            // Default to AP centroid if GPS unavailable
            setUserCoords({ lat: 16.5062, lng: 80.648 });
          }
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
      setUserCoords({ lat: 16.5062, lng: 80.648 });
    }

    // Ping Firebase test collection
    testFirebaseConnection().catch(() => {});
  }, []);

  // Compute hospitals with distance if coords available
  const hospitalsWithDistance = useMemo(() => {
    const list = userCoords 
      ? apiStore.ensureNearbyHospitalsForCoords(userCoords.lat, userCoords.lng)
      : apiStore.getHospitals();

    if (!userCoords) return list;
    return list
      .map((h) => ({
        ...h,
        distance: calculateDistance(userCoords.lat, userCoords.lng, h.latitude, h.longitude)
      }))
      .sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }, [userCoords, globalRefreshKey]);

  const handleNavigate = (view: string, payload?: any) => {
    if (view === 'login') {
      setAuthModalMode('login');
      setAuthModalOpen(true);
      return;
    }
    if (view === 'register') {
      setAuthModalMode('register');
      setAuthModalOpen(true);
      return;
    }
    if (view === 'emergency' || view === 'sos') {
      setEmergencySymptom(payload?.symptom || '');
      setEmergencyModalOpen(true);
      return;
    }
    if (view === 'profile') {
      if (currentUser?.role === 'HOSPITAL_STAFF') {
        setCurrentView('staff-dashboard');
      } else if (currentUser?.role === 'ADMIN' || currentUser?.role === 'HOSPITAL_ADMIN') {
        setCurrentView('admin-dashboard');
      } else {
        setCurrentView('my-appointments');
      }
      return;
    }
    setCurrentView(view);
    setViewPayload(payload || {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFontScaleChange = (scale: 'normal' | 'large' | 'xlarge' | number) => {
    if (typeof scale === 'number') {
      setFontScale(scale);
    } else if (scale === 'large') {
      setFontScale(115);
    } else if (scale === 'xlarge') {
      setFontScale(130);
    } else {
      setFontScale(100);
    }
  };

  const handleAuthRoleSwitch = (role: UserRole) => {
    const user = apiStore.switchDemoUser(role);
    setCurrentUser(user);
    if (role === 'HOSPITAL_STAFF') {
      setCurrentView('staff-dashboard');
    } else if (role === 'ADMIN' || role === 'HOSPITAL_ADMIN') {
      setCurrentView('admin-dashboard');
    } else {
      setCurrentView('home');
    }
  };

  const handleLogout = () => {
    apiStore.logout();
    setCurrentUser(null);
    setCurrentView('home');
  };

  const t = translations[language];

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors overflow-x-hidden w-full max-w-full ${
        highContrast ? 'bg-black text-white high-contrast' : 'bg-[#F8FAFC] text-slate-800'
      }`}
      style={{ fontSize: `${fontScale}%` }}
    >
      {/* Top Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        currentView={currentView}
        onNavigate={handleNavigate}
        language={language}
        onLanguageChange={setLanguage}
        highContrast={highContrast}
        onToggleContrast={() => setHighContrast((prev) => !prev)}
        onToggleHighContrast={() => setHighContrast((prev) => !prev)}
        fontScale={fontScale}
        onChangeFontScale={handleFontScaleChange}
        onOpenEmergencySOS={() => handleOpenEmergencySOS()}
        onOpenLogin={() => {
          setAuthModalMode('login');
          setAuthModalOpen(true);
        }}
        onOpenRegister={() => {
          setAuthModalMode('register');
          setAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        onSwitchRole={handleAuthRoleSwitch}
        onSwitchRoleQuick={handleAuthRoleSwitch}
        onRefreshAll={handleRefreshAllDashboards}
        isRefreshing={isRefreshing}
        lastRefreshedText={lastRefreshedText}
      />

      {/* Main App Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12 overflow-x-hidden">
        {/* Global Refresh Live Notification Banner */}
        {refreshNotification && (
          <div
            id="global-refresh-alert"
            className="mb-4 p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{refreshNotification}</span>
            </div>
            <button
              type="button"
              onClick={() => setRefreshNotification(null)}
              className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Low-Connectivity & Offline OPD Mode Banner */}
        <div className="mb-4">
          <LowConnectivityBanner
            language={language}
            currentUser={currentUser}
            onNavigateToHospital={(hId) => handleNavigate('hospital-details', { hospitalId: hId })}
            onNavigate={handleNavigate}
          />
        </div>

        {currentView === 'home' && (
          <HomeView
            hospitals={hospitalsWithDistance}
            userCoords={userCoords}
            onUseMyLocation={handleUseMyLocation}
            isLocating={locating}
            onNavigate={handleNavigate}
            language={language}
            currentUser={currentUser}
            onOpenEmergencySOS={handleOpenEmergencySOS}
            onRefreshAll={handleRefreshAllDashboards}
            isRefreshing={isRefreshing}
          />
        )}

        {(currentView === 'search' || currentView === 'hospitals') && (
          <SearchView
            initialQuery={viewPayload.query || ''}
            initialType={viewPayload.type || 'all'}
            hospitals={hospitalsWithDistance}
            userCoords={userCoords}
            onNavigate={handleNavigate}
            language={language}
          />
        )}

        {currentView === 'hospital-details' && (
          <HospitalDetailsView
            hospitalId={viewPayload.hospitalId}
            onNavigate={handleNavigate}
            language={language}
            userCoords={userCoords}
            onUseMyLocation={handleUseMyLocation}
            initialShowRoute={viewPayload.showRoute || false}
          />
        )}

        {currentView === 'doctor-details' && (
          <DoctorView
            doctorId={viewPayload.doctorId}
            currentUser={currentUser}
            onNavigate={handleNavigate}
            language={language}
          />
        )}

        {currentView === 'appointment' && (
          <AppointmentView
            hospitalId={viewPayload.hospitalId}
            doctorId={viewPayload.doctorId}
            prefillDate={viewPayload.prefillDate}
            prefillSlot={viewPayload.prefillSlot}
            currentUser={currentUser}
            onUserAuth={(user) => setCurrentUser(user)}
            onNavigate={handleNavigate}
            language={language}
          />
        )}

        {currentView === 'my-appointments' && (
          <MyAppointmentsView
            currentUser={currentUser}
            onNavigate={handleNavigate}
            language={language}
            refreshKey={globalRefreshKey}
            onRefresh={handleRefreshAllDashboards}
          />
        )}

        {currentView === 'complaints' && (
          <ComplaintView
            currentUser={currentUser}
            onNavigate={handleNavigate}
            language={language}
          />
        )}

        {currentView === 'feedback' && (
          <FeedbackView
            initialHospitalId={viewPayload.hospitalId}
            initialAppointmentId={viewPayload.appointmentId}
            currentUser={currentUser}
            onNavigate={handleNavigate}
            language={language}
          />
        )}

        {currentView === 'teleconsultation' && (
          <TeleconsultationView
            currentUser={currentUser}
            onNavigate={handleNavigate}
            language={language}
            initialDoctorId={viewPayload.doctorId}
            initialHospitalId={viewPayload.hospitalId}
            initialSymptoms={viewPayload.symptoms}
            initialPatientName={viewPayload.patientName}
            initialPatientAge={viewPayload.patientAge}
            initialVitals={viewPayload.vitals}
            startImmediateCall={viewPayload.startImmediateCall}
          />
        )}

        {currentView === 'triage' && (
          <DigitalTriageView
            currentUser={currentUser}
            onNavigate={handleNavigate}
            language={language}
            onOpenEmergencySOS={handleOpenEmergencySOS}
            onNavigateToHospital={(hospId) => handleNavigate('details', { hospitalId: hospId })}
            onOpenEmergencyModal={(symp) => handleOpenEmergencySOS(symp)}
            onNavigateToTeleconsult={(payload) => handleNavigate('teleconsultation', payload)}
            onNavigateToQueue={(payload) => handleNavigate('queue', payload)}
          />
        )}

        {currentView === 'health-records' && (
          <PatientHealthRecordsView
            currentUser={currentUser}
            onNavigate={handleNavigate}
            language={language}
            initialPatientId={viewPayload.patientId}
          />
        )}

        {currentView === 'referrals' && (
          <ReferralTrackingView
            currentUser={currentUser}
            onNavigate={handleNavigate}
            language={language}
            onUserAuth={(user) => setCurrentUser(user)}
          />
        )}

        {currentView === 'diagnostics' && (
          <DiagnosticServicesView
            currentUser={currentUser}
            onNavigate={handleNavigate}
            language={language}
            initialHospitalId={viewPayload.hospitalId}
          />
        )}

        {currentView === 'queue' && (
          <AppointmentQueueView
            currentUser={currentUser}
            onNavigate={handleNavigate}
            language={language}
            initialHospitalId={viewPayload.hospitalId}
            initialDoctorId={viewPayload.doctorId}
            refreshKey={globalRefreshKey}
            onRefresh={handleRefreshAllDashboards}
          />
        )}

        {currentView === 'high-risk' && (
          <HighRiskFollowUpView
            currentUser={currentUser}
            onNavigate={handleNavigate}
            language={language}
          />
        )}

        {currentView === 'quality-dashboard' && (
          <FacilityQualityDashboardView
            onNavigate={handleNavigate}
            language={language}
            userCoords={userCoords}
            refreshKey={globalRefreshKey}
            onRefresh={handleRefreshAllDashboards}
          />
        )}

        {currentView === 'staff-dashboard' && (
          <StaffDashboardView
            currentUser={currentUser}
            onNavigate={handleNavigate}
            language={language}
            refreshKey={globalRefreshKey}
            onRefresh={handleRefreshAllDashboards}
          />
        )}

        {currentView === 'admin-dashboard' && (
          <AdminDashboardView
            currentUser={currentUser}
            onNavigate={handleNavigate}
            language={language}
            onUserAuth={(user) => setCurrentUser(user)}
            refreshKey={globalRefreshKey}
            onRefresh={handleRefreshAllDashboards}
          />
        )}
      </main>

      {/* Global Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 text-xs">
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="bg-blue-600 p-1.5 rounded-lg text-white">
                <HeartPulse className="w-5 h-5" />
              </div>
              <span className="font-bold text-base tracking-tight text-slate-900">
                Care Connect India
              </span>
            </div>
            <p className="text-slate-500 leading-relaxed max-w-lg">
              Smart India Hackathon 2026: Accessibility & Quality of Public Healthcare Services. Real-time discovery of public health facilities, doctors on duty, essential medicine stock, advance OPD queue tokens, and public grievance resolution.
            </p>
            <div className="flex items-center gap-4 text-slate-400 pt-1 text-[11px] font-medium">
              <span>National Health Mission Guidelines</span>
              <span>•</span>
              <span>Free Public Healthcare Services</span>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Quick Navigation</h4>
            <ul className="space-y-2 text-slate-600 font-medium">
              <li>
                <button onClick={() => handleNavigate('search')} className="hover:text-blue-600 transition-colors">
                  Find Nearest Hospital
                </button>
              </li>
              <li>
                <button onClick={() => handleNavigate('appointment')} className="hover:text-blue-600 transition-colors">
                  Digital OPD Token Booking
                </button>
              </li>
              <li>
                <button onClick={() => handleNavigate('complaints')} className="hover:text-blue-600 transition-colors">
                  Lodge Civic Grievance
                </button>
              </li>
              <li>
                <button onClick={() => handleNavigate('feedback')} className="hover:text-blue-600 transition-colors">
                  Hospital Quality Ratings
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">Emergency & Toll-Free</h4>
            <ul className="space-y-2 text-slate-600 font-medium">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>Ambulance & Trauma: <strong className="text-slate-900">108</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>Maternal / Infant Care: <strong className="text-slate-900">102</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                <span>Tele-Consultation: <strong className="text-slate-900">104</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                <span>Women Helpline: <strong className="text-slate-900">181</strong></span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Utility Status Bar */}
        <div className="border-t border-slate-200 bg-slate-50/70 px-4 sm:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          <div className="flex flex-wrap items-center gap-4">
            <span>© 2026 Ministry of Health & Family Welfare</span>
            <span className="hidden sm:inline h-3 w-px bg-slate-200"></span>
            <span className="text-blue-600">Public Grievance Portal</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-bold text-slate-600">Systems Operational</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">v1.0.4-sih</span>
          </div>
        </div>
      </footer>

      {/* Login & Register Modal Dialog */}
      <AuthModals
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          if (user.role === 'HOSPITAL_STAFF') {
            setCurrentView('staff-dashboard');
          } else if (user.role === 'ADMIN') {
            setCurrentView('admin-dashboard');
          }
        }}
      />

      {/* 108 Emergency Ambulance Escalation Modal */}
      <EmergencyEscalationModal
        isOpen={emergencyModalOpen}
        onClose={() => setEmergencyModalOpen(false)}
        language={language}
        currentUser={currentUser}
        userCoords={userCoords}
        initialSymptom={emergencySymptom}
        onNavigateToHospital={(hId) => {
          setEmergencyModalOpen(false);
          handleNavigate('hospital-details', { hospitalId: hId });
        }}
      />
    </div>
  );
}
