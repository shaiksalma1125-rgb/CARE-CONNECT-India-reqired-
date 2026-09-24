import React, { useState, useMemo } from 'react';
import {
  Video,
  PhoneCall,
  UserCheck,
  Calendar,
  Clock,
  Heart,
  Activity,
  CheckCircle2,
  FileText,
  AlertCircle,
  Plus,
  ShieldCheck,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  Stethoscope,
  Send,
  Building2,
  Pill
} from 'lucide-react';
import { apiStore } from '../../services/apiStore';
import { Teleconsultation, User, LanguageCode } from '../../types';
import { translations } from '../../utils/translations';

interface TeleconsultationViewProps {
  language: LanguageCode;
  currentUser: User | null;
  onNavigateToHospital?: (hospitalId: string) => void;
  onNavigate?: (view: any, payload?: any) => void;
  initialDoctorId?: string;
  initialHospitalId?: string;
  initialSymptoms?: string;
  initialPatientName?: string;
  initialPatientAge?: number;
  initialVitals?: {
    bpSystolic?: number;
    bpDiastolic?: number;
    pulse?: number | string;
    temp?: number | string;
    spo2?: number | string;
  };
  startImmediateCall?: boolean;
}

export const TeleconsultationView: React.FC<TeleconsultationViewProps> = ({
  language,
  currentUser,
  onNavigateToHospital,
  onNavigate,
  initialDoctorId,
  initialHospitalId,
  initialSymptoms,
  initialPatientName,
  initialPatientAge,
  initialVitals,
  startImmediateCall
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'book' | 'session' | 'history'>('book');

  // Booking state
  const hospitals = useMemo(() => apiStore.getHospitals(), []);
  const [selectedHospitalId, setSelectedHospitalId] = useState(initialHospitalId || hospitals[0]?.id || 'hosp-1');
  const doctors = useMemo(() => apiStore.getDoctors(selectedHospitalId), [selectedHospitalId]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(initialDoctorId || doctors[0]?.id || '');
  const [patientName, setPatientName] = useState(initialPatientName || currentUser?.name || 'Shaik Salma');
  const [patientAge, setPatientAge] = useState(initialPatientAge || 38);
  const [patientGender, setPatientGender] = useState<'Male' | 'Female' | 'Other'>('Female');
  const [patientPhone, setPatientPhone] = useState(currentUser?.mobile || '9849112501');
  const [symptoms, setSymptoms] = useState(initialSymptoms || 'Persistent dry cough and mild fever for 3 days');
  const [assistedByAsha, setAssistedByAsha] = useState(true);
  const [ashaWorkerName, setAshaWorkerName] = useState('Lakshmi Devi (ASHA - Ward 12)');
  const [ashaWorkerPhone, setAshaWorkerPhone] = useState('+91 98480 12345');

  // Vitals
  const [bpSystolic, setBpSystolic] = useState(initialVitals?.bpSystolic ?? 120);
  const [bpDiastolic, setBpDiastolic] = useState(initialVitals?.bpDiastolic ?? 80);
  const [pulse, setPulse] = useState(Number(initialVitals?.pulse) || 76);
  const [temperature, setTemperature] = useState(Number(initialVitals?.temp) || 98.6);
  const [spo2, setSpo2] = useState(Number(initialVitals?.spo2) || 99);

  // Sync if props change
  React.useEffect(() => {
    if (initialHospitalId) setSelectedHospitalId(initialHospitalId);
    if (initialDoctorId) setSelectedDoctorId(initialDoctorId);
    if (initialPatientName) setPatientName(initialPatientName);
    if (initialSymptoms) setSymptoms(initialSymptoms);
    if (initialPatientAge) setPatientAge(initialPatientAge);
    if (initialVitals?.pulse) setPulse(Number(initialVitals.pulse));
    if (initialVitals?.temp) setTemperature(Number(initialVitals.temp));
    if (initialVitals?.spo2) setSpo2(Number(initialVitals.spo2));
  }, [initialHospitalId, initialDoctorId, initialPatientName, initialSymptoms, initialPatientAge, initialVitals]);

  // Live session simulation
  const [activeSession, setActiveSession] = useState<Teleconsultation | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);

  // History
  const [historyKey, setHistoryKey] = useState(0);
  const consultations = useMemo(() => {
    return apiStore.getTeleconsultations();
  }, [historyKey, activeSession]);

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      const hosp = hospitals.find((h) => h.id === selectedHospitalId);
      const doc = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];

      const newTC = apiStore.bookTeleconsultation({
        patientName,
        patientAge,
        patientGender,
        patientPhone,
        hospitalId: selectedHospitalId,
        hospitalName: hosp?.name || 'Government General Hospital',
        doctorId: doc?.id,
        doctorName: doc?.name || 'Dr. K. Srinivas Rao, MD',
        doctorSpecialization: doc?.specialization || 'General Medicine',
        assistedByAsha,
        ashaWorkerName: assistedByAsha ? ashaWorkerName : undefined,
        ashaWorkerPhone: assistedByAsha ? ashaWorkerPhone : undefined,
        symptoms,
        scheduledTime: 'Immediate eSanjeevani Tele-OPD',
        vitals: {
          bp: `${bpSystolic}/${bpDiastolic}`,
          bloodPressure: `${bpSystolic}/${bpDiastolic} mmHg`,
          pulse: Number(pulse) || 76,
          pulseRate: pulse,
          temp: Number(temperature) || 98.4,
          spO2: Number(spo2) || 98
        }
      });

      setIsSubmitting(false);
      setBookingSuccessMsg(`Teleconsultation booked successfully! Room ID: ${newTC.teleconsultId}`);
      setActiveSession(newTC);
      setHistoryKey((k) => k + 1);
      setActiveTab('session');
    }, 400);
  };

  const handleEndCall = () => {
    if (activeSession) {
      apiStore.updateTeleconsultationStatus(activeSession.id, 'COMPLETED', {
        diagnosis: 'Acute Upper Respiratory Tract Infection (URTI) with Low-grade Pyrexia',
        advice: 'Rest, hydration, and steam inhalation twice daily.',
        medicines: [
          {
            name: 'Paracetamol 500mg',
            dosage: '1 tablet thrice daily after food',
            duration: '3 days',
            janAushadhiAvailable: true
          },
          {
            name: 'Cetirizine 10mg',
            dosage: '1 tablet at bedtime',
            duration: '5 days',
            janAushadhiAvailable: true
          }
        ],
        instructions: 'Drink warm water. If temperature exceeds 101°F or breathing becomes difficult, visit CHC casualty immediately.',
        issuedBy: activeSession.doctorName
      });
      setHistoryKey((k) => k + 1);
    }
    setActiveSession(null);
    setActiveTab('history');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/60 border border-blue-400/30 text-xs font-semibold mb-2">
              <Video className="w-3.5 h-3.5 text-blue-200" />
              <span>Ayushman Bharat Digital Mission (eSanjeevani Assist)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t.teleconsultation}
            </h1>
            <p className="text-sm text-blue-100 mt-1 max-w-2xl leading-relaxed">
              {t.teleconsultationDesc}. Connect with verified government specialists from your Sub-Centre, PHC, or home with real-time ASHA vital sign telemetry.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('book')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'book'
                  ? 'bg-white text-blue-900 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              Book Teleconsult
            </button>
            {activeSession && (
              <button
                onClick={() => setActiveTab('session')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'session'
                    ? 'bg-rose-500 text-white shadow-md animate-pulse'
                    : 'bg-rose-600/80 hover:bg-rose-600 text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-white"></span>
                <span>Active Call</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-blue-900 shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              Consultation Records ({consultations.length})
            </button>
          </div>
        </div>
      </div>

      {bookingSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-emerald-900 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold">{bookingSuccessMsg}</span>
          </div>
          <button
            onClick={() => setBookingSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB: Book Teleconsultation */}
      {activeTab === 'book' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleBook} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-blue-600" />
                <span>Schedule Remote Government Doctor Teleconsult</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Select Government Hospital</label>
                  <select
                    value={selectedHospitalId}
                    onChange={(e) => setSelectedHospitalId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    {hospitals.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.type}) - {h.district}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Available Specialist / MO</label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.specialization}) - {d.availabilityStatus}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Patient Basic Info */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Demographics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Patient Full Name</label>
                    <input
                      type="text"
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Age (Years)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={110}
                      value={patientAge}
                      onChange={(e) => setPatientAge(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Gender</label>
                    <select
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="text-xs">
                  <label className="block font-medium text-slate-700 mb-1">Presenting Symptoms & Duration</label>
                  <textarea
                    rows={2}
                    required
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="Describe main symptoms, fever duration, cough, pain location..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* ASHA Assistance & Vitals telemetry */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">ASHA / ANM Health Worker Assistance</span>
                    <span className="text-[11px] text-slate-500">
                      Enable if an ASHA worker is present with the patient to record digital vitals
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assistedByAsha}
                      onChange={(e) => setAssistedByAsha(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {assistedByAsha && (
                  <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-medium text-blue-950 mb-1">ASHA Worker Name & Sector</label>
                        <input
                          type="text"
                          value={ashaWorkerName}
                          onChange={(e) => setAshaWorkerName(e.target.value)}
                          className="w-full px-3 py-2 bg-white rounded-xl border border-blue-200 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-blue-950 mb-1">ASHA Contact Mobile</label>
                        <input
                          type="text"
                          value={ashaWorkerPhone}
                          onChange={(e) => setAshaWorkerPhone(e.target.value)}
                          className="w-full px-3 py-2 bg-white rounded-xl border border-blue-200 text-xs"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <span className="text-[11px] font-bold text-blue-900 uppercase block mb-2">
                        Pre-Consultation Vitals Measured by ASHA
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="bg-white p-2.5 rounded-xl border border-blue-200">
                          <span className="text-[10px] text-slate-500 block">BP (Systolic/Dia)</span>
                          <div className="flex items-center gap-1 font-bold mt-0.5">
                            <input
                              type="number"
                              value={bpSystolic}
                              onChange={(e) => setBpSystolic(Number(e.target.value))}
                              className="w-12 text-center border-b border-slate-300"
                            />
                            <span>/</span>
                            <input
                              type="number"
                              value={bpDiastolic}
                              onChange={(e) => setBpDiastolic(Number(e.target.value))}
                              className="w-12 text-center border-b border-slate-300"
                            />
                          </div>
                        </div>

                        <div className="bg-white p-2.5 rounded-xl border border-blue-200">
                          <span className="text-[10px] text-slate-500 block">Pulse Rate</span>
                          <div className="flex items-center gap-1 font-bold mt-0.5">
                            <input
                              type="number"
                              value={pulse}
                              onChange={(e) => setPulse(Number(e.target.value))}
                              className="w-14 text-center border-b border-slate-300"
                            />
                            <span className="text-[10px] text-slate-400">bpm</span>
                          </div>
                        </div>

                        <div className="bg-white p-2.5 rounded-xl border border-blue-200">
                          <span className="text-[10px] text-slate-500 block">Body Temp</span>
                          <div className="flex items-center gap-1 font-bold mt-0.5">
                            <input
                              type="number"
                              step="0.1"
                              value={temperature}
                              onChange={(e) => setTemperature(Number(e.target.value))}
                              className="w-14 text-center border-b border-slate-300"
                            />
                            <span className="text-[10px] text-slate-400">°F</span>
                          </div>
                        </div>

                        <div className="bg-white p-2.5 rounded-xl border border-blue-200">
                          <span className="text-[10px] text-slate-500 block">Oxygen SpO2</span>
                          <div className="flex items-center gap-1 font-bold mt-0.5">
                            <input
                              type="number"
                              value={spo2}
                              onChange={(e) => setSpo2(Number(e.target.value))}
                              className="w-14 text-center border-b border-slate-300"
                            />
                            <span className="text-[10px] text-slate-400">%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 bg-blue-700 hover:bg-blue-800 text-white rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  <span>{isSubmitting ? 'Scheduling eSanjeevani Session...' : 'Confirm & Launch Teleconsultation'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Info Box */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>eSanjeevani Protocol Benefits</span>
              </h3>
              <ul className="space-y-2.5 text-slate-600 leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Zero travel needed for routine follow-ups or chronic hypertension/diabetes consultations.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Digital prescriptions automatically linked to your ABHA health record locker.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Prescribed medicines mapped directly to free Jan Aushadhi and government hospital dispensaries.</span>
                </li>
              </ul>
            </div>

            {/* Quick Doctor Preview */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Duty Officer On Call</span>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 font-black">
                  DR
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">{doctors[0]?.name || 'Dr. K. Srinivas Rao'}</h4>
                  <p className="text-[11px] text-slate-500">{doctors[0]?.specialization} &bull; {doctors[0]?.hospitalName}</p>
                  <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    Available for Immediate Audio/Video
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Live Call Session */}
      {activeTab === 'session' && (
        <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 sm:p-8 text-white shadow-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/40 px-2 py-0.5 rounded font-mono uppercase font-bold">
                Live Video Encrypted Session
              </span>
              <h2 className="text-xl font-bold mt-1">
                {activeSession?.doctorName || 'Dr. K. Srinivas Rao, MD'} &bull; {activeSession?.doctorSpecialization}
              </h2>
              <p className="text-xs text-slate-400">
                Patient: {activeSession?.patientName} ({activeSession?.patientAge}y/{activeSession?.patientGender}) &bull; Room: {activeSession?.teleconsultId || 'TC-2026-LIVE'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isMuted ? 'bg-rose-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setIsVideoOff(!isVideoOff)}
                className={`p-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isVideoOff ? 'bg-rose-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
                title={isVideoOff ? 'Start Video' : 'Stop Video'}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
              <button
                onClick={handleEndCall}
                className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <PhoneOff className="w-5 h-5" />
                <span>End & Generate Prescription</span>
              </button>
            </div>
          </div>

          {/* Video Simulator Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Doctor Screen */}
            <div className="md:col-span-2 aspect-video bg-slate-950 rounded-2xl border border-slate-800 relative overflow-hidden flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="w-24 h-24 rounded-full bg-blue-900/60 border-2 border-blue-400/40 flex items-center justify-center mx-auto text-blue-200 text-2xl font-bold">
                  <Stethoscope className="w-12 h-12 text-blue-300 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-200">{activeSession?.doctorName || 'Dr. K. Srinivas Rao'}</h3>
                  <p className="text-xs text-blue-300">Connected via Government Tele-Health Hub</p>
                </div>
              </div>

              {/* Patient PIP Window */}
              <div className="absolute bottom-4 right-4 w-36 h-28 bg-slate-800 rounded-xl border border-slate-700 p-2 flex flex-col items-center justify-center text-center">
                {isVideoOff ? (
                  <VideoOff className="w-6 h-6 text-slate-500" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                    {activeSession?.patientName.charAt(0) || 'P'}
                  </div>
                )}
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {isVideoOff ? 'Video Off' : 'You (Patient)'}
                </span>
              </div>
            </div>

            {/* Live Vitals HUD */}
            <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-5 space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Live Vitals Telemetry</span>
              </h4>

              <div className="space-y-2.5 text-xs">
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Blood Pressure</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {activeSession?.vitals?.bloodPressure || '120/80 mmHg'}
                  </span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Pulse Rate</span>
                  <span className="font-mono font-bold text-blue-400">
                    {activeSession?.vitals?.pulseRate || '76 bpm'}
                  </span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Body Temp</span>
                  <span className="font-mono font-bold text-amber-400">
                    {activeSession?.vitals?.temperature || '98.6 °F'}
                  </span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Oxygen SpO2</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {activeSession?.vitals?.spo2 || '99%'}
                  </span>
                </div>
              </div>

              {activeSession?.assistedByAsha && (
                <div className="bg-blue-950/60 p-3 rounded-xl border border-blue-900 text-[11px] text-blue-200">
                  <span className="font-bold block">Assisted by ASHA</span>
                  <span>{activeSession.ashaWorkerName} ({activeSession.ashaWorkerPhone})</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Past Teleconsultations & Prescriptions</h2>
            <button
              onClick={() => setActiveTab('book')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Consultation</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {consultations.map((tc) => (
              <div key={tc.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {tc.teleconsultId}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 mt-1">{tc.doctorName}</h3>
                    <p className="text-xs text-slate-500">{tc.doctorSpecialization} &bull; {tc.hospitalName}</p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                      tc.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : tc.status === 'IN_PROGRESS'
                        ? 'bg-blue-100 text-blue-800 animate-pulse'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {tc.status}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                  <p className="text-slate-700">
                    <strong>Symptoms:</strong> {tc.symptoms}
                  </p>
                  {tc.vitals && (
                    <p className="text-slate-500 text-[11px]">
                      Vitals: BP {tc.vitals.bloodPressure} | Pulse {tc.vitals.pulseRate} | SpO2 {tc.vitals.spo2}
                    </p>
                  )}
                </div>

                {tc.prescription && (
                  <div className="border border-emerald-200 bg-emerald-50/60 p-3.5 rounded-xl space-y-2 text-xs">
                    <span className="font-bold text-emerald-950 flex items-center gap-1">
                      <Pill className="w-3.5 h-3.5 text-emerald-700" />
                      E-Prescription & Jan Aushadhi Medicines:
                    </span>
                    <ul className="space-y-1">
                      {tc.prescription.medicines.map((med, idx) => (
                        <li key={idx} className="text-slate-800 text-[11px] flex items-center justify-between">
                          <span>&bull; {med.name} - {med.dosage} ({med.duration})</span>
                          {med.janAushadhiAvailable && (
                            <span className="text-[9px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold">
                              Jan Aushadhi 100% Free
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {tc.prescription.instructions && (
                      <p className="text-[10px] text-slate-600 italic mt-1 border-t border-emerald-200/60 pt-1">
                        Doctor Note: {tc.prescription.instructions}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                  <span className="text-slate-400 text-[11px]">
                    {new Date(tc.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => onNavigateToHospital(tc.hospitalId)}
                    className="text-blue-600 hover:underline font-bold text-[11px]"
                  >
                    View Facility Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
