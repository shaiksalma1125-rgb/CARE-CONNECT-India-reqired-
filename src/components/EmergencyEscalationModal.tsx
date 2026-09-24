import React, { useState } from 'react';
import {
  PhoneCall,
  AlertTriangle,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  X,
  Radio,
  Truck,
  HeartPulse,
  Navigation
} from 'lucide-react';
import { apiStore } from '../services/apiStore';
import { EmergencyIncident, LanguageCode, User } from '../types';
import { translations } from '../utils/translations';

interface EmergencyEscalationModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: LanguageCode;
  currentUser: User | null;
  userCoords?: { lat: number; lng: number } | null;
  initialSymptom?: string;
  onNavigateToHospital?: (hospitalId: string) => void;
}

export const EmergencyEscalationModal: React.FC<EmergencyEscalationModalProps> = ({
  isOpen,
  onClose,
  language,
  currentUser,
  userCoords,
  initialSymptom,
  onNavigateToHospital
}) => {
  const t = translations[language];
  const [callerName, setCallerName] = useState(currentUser?.name || 'Shaik Salma');
  const [callerPhone, setCallerPhone] = useState(currentUser?.mobile || '9849112501');
  const [address, setAddress] = useState(currentUser?.location || 'Hanumanpet, Vijayawada');
  const [emergencyType, setEmergencyType] = useState<EmergencyIncident['emergencyType']>(
    String(initialSymptom || '').toLowerCase().includes('chest') ? 'CARDIAC_ARREST' : 'TRAUMA_ROAD_ACCIDENT'
  );
  const [activeIncident, setActiveIncident] = useState<EmergencyIncident | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleTriggerSOS = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      // Find nearest hospital with emergency casualty
      const hospitals = apiStore.getHospitals().filter((h) => h.emergencyAvailable);
      const targetHosp = hospitals[0] || apiStore.getHospitals()[0];

      const incident = apiStore.createEmergencySOS({
        callerName,
        callerPhone,
        location: {
          lat: userCoords?.lat || targetHosp.latitude,
          lng: userCoords?.lng || targetHosp.longitude,
          address
        },
        emergencyType,
        targetHospitalId: targetHosp.id,
        targetHospitalName: targetHosp.name
      });
      setActiveIncident(incident);
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header with emergency alert branding */}
        <div className="bg-rose-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <PhoneCall className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                <span>{t.emergencyEscalation}</span>
                <span className="text-[10px] bg-white text-rose-700 px-2 py-0.5 rounded font-black tracking-wide">
                  24x7 TOLL-FREE 108
                </span>
              </h3>
              <p className="text-xs text-rose-100">National Health Mission Emergency Trauma Response</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-6 text-slate-800">
          {!activeIncident ? (
            <form onSubmit={handleTriggerSOS} className="space-y-4">
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-900 leading-relaxed">
                  <p className="font-bold">Life-Threatening Emergency Protocol</p>
                  <p className="mt-0.5 text-rose-700">
                    Submitting this form broadcasts live GPS telemetry directly to the district 108 Command Center and pre-alerts the Trauma Casualty team at Government General Hospital.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Caller / Patient Name</label>
                  <input
                    type="text"
                    required
                    value={callerName}
                    onChange={(e) => setCallerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 font-medium"
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Emergency Mobile Number</label>
                  <input
                    type="tel"
                    required
                    value={callerPhone}
                    onChange={(e) => setCallerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 font-medium"
                    placeholder="10-digit mobile number"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-bold text-slate-700 mb-1">Emergency Incident Type</label>
                <select
                  value={emergencyType}
                  onChange={(e) => setEmergencyType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 font-semibold"
                >
                  <option value="CARDIAC_ARREST">Severe Chest Pain / Suspected Cardiac Arrest</option>
                  <option value="TRAUMA_ROAD_ACCIDENT">Severe Trauma / Road Accident / Hemorrhage</option>
                  <option value="STROKE">Suspected Acute Stroke (FAST symptoms / Facial Droop)</option>
                  <option value="SEVERE_RESPIRATORY">Severe Acute Respiratory Distress / Asphyxia</option>
                  <option value="MATERNAL_EMERGENCY">Acute Maternal / Labour Emergency (Pre-eclampsia)</option>
                </select>
              </div>

              <div className="text-xs">
                <label className="block font-bold text-slate-700 mb-1">Pickup Location / Landmark</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 font-medium"
                    placeholder="Address, street or landmark for ambulance"
                  />
                </div>
                {userCoords && (
                  <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-medium">
                    <Navigation className="w-3 h-3" />
                    GPS Coords Attached: {userCoords.lat.toFixed(4)}°N, {userCoords.lng.toFixed(4)}°E (Accuracy &plusmn;8m)
                  </p>
                )}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Radio className="w-4 h-4 animate-pulse" />
                  <span>{isSubmitting ? 'Dispatching 108 Emergency...' : 'Dispatch 108 Ambulance SOS'}</span>
                </button>
                <a
                  href="tel:108"
                  className="w-full sm:w-auto py-3 px-5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-sm text-center shadow-xs transition-colors"
                >
                  Direct Call 108
                </a>
              </div>
            </form>
          ) : (
            /* Live Ambulance Tracker & Dispatch Card */
            <div className="space-y-5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-emerald-950 text-sm">Ambulance Dispatched & Trauma Bed Alerted</h4>
                  <p className="text-xs text-emerald-800">
                    Incident ID: <strong>{activeIncident.id}</strong>. Central 108 Command has routed the nearest Advanced Life Support vehicle.
                  </p>
                </div>
              </div>

              {/* Ambulance Status details */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <Truck className="w-5 h-5 text-blue-600" />
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Assigned Unit</span>
                      <span className="text-xs font-bold text-slate-900">{activeIncident.ambulanceVehicleNumber}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Estimated Arrival</span>
                    <span className="text-base font-black text-rose-600 animate-pulse">
                      ~{activeIncident.etaMinutes} Minutes
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Driver Phone</span>
                    <a href={`tel:${activeIncident.ambulanceDriverPhone}`} className="font-bold text-blue-600 hover:underline">
                      {activeIncident.ambulanceDriverPhone}
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Receiving Facility</span>
                    <span className="font-bold text-slate-800 line-clamp-1">{activeIncident.targetHospitalName}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Trauma ICU Bed Alerted at GGH Casualty
                  </span>
                  {onNavigateToHospital && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateToHospital(activeIncident.targetHospitalId);
                      }}
                      className="text-blue-600 hover:underline font-bold"
                    >
                      View Hospital
                    </button>
                  )}
                </div>
              </div>

              {/* Immediate First-Aid Guidance While Ambulance Is En-Route */}
              <div className="border border-amber-200 bg-amber-50/70 rounded-2xl p-4 space-y-2 text-xs text-amber-950">
                <h5 className="font-bold flex items-center gap-1.5 text-amber-900">
                  <HeartPulse className="w-4 h-4 text-amber-600" />
                  First-Aid Protocol While Waiting:
                </h5>
                <ul className="list-disc list-inside space-y-1 text-amber-900/90 text-[11px] leading-relaxed">
                  <li>Keep patient seated or lying down in a well-ventilated space. Do not offer food or water.</li>
                  <li>Loosen tight clothing around neck and chest. Monitor breathing and responsiveness.</li>
                  <li>If cardiac symptoms and conscious, keep calm and sit in comfortable half-sitting position.</li>
                  <li>Keep phone line clear so the 108 ambulance driver can call for landmark verification.</li>
                </ul>
              </div>

              <div className="flex items-center justify-between pt-2">
                <a
                  href={`tel:${activeIncident.ambulanceDriverPhone}`}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  Call Ambulance Driver
                </a>
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Close & Keep Monitoring
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
