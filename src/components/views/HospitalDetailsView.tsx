import React, { useState, useMemo } from 'react';
import {
  Hospital,
  Doctor,
  HospitalService,
  MedicineStock,
  Feedback,
  LanguageCode
} from '../../types';
import { translations } from '../../utils/translations';
import { apiStore } from '../../services/apiStore';
import { HospitalMap } from '../HospitalMap';
import {
  Building2,
  MapPin,
  Phone,
  PhoneCall,
  Clock,
  Star,
  Stethoscope,
  Activity,
  Pill,
  Navigation,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Video,
  TestTube,
  Award
} from 'lucide-react';

interface HospitalDetailsViewProps {
  hospitalId: string;
  onNavigate: (view: string, payload?: any) => void;
  language: LanguageCode;
  userCoords?: { lat: number; lng: number } | null;
  onUseMyLocation?: () => void;
  initialShowRoute?: boolean;
}

export const HospitalDetailsView: React.FC<HospitalDetailsViewProps> = ({
  hospitalId,
  onNavigate,
  language,
  userCoords,
  onUseMyLocation,
  initialShowRoute = false
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'doctors' | 'services' | 'medicines' | 'quality' | 'map'>(
    initialShowRoute ? 'map' : 'doctors'
  );
  const [showRoute, setShowRoute] = useState<boolean>(initialShowRoute);

  const handleGetDirections = () => {
    setActiveTab('map');
    setShowRoute(true);
    if (!userCoords && onUseMyLocation) {
      onUseMyLocation();
    }
    setTimeout(() => {
      const el = document.getElementById('hospital-map-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const hospital = useMemo(() => apiStore.getHospitalById(hospitalId), [hospitalId]);
  const singleHospitalList = useMemo(() => (hospital ? [hospital] : []), [hospital]);
  const doctors = useMemo(() => apiStore.getDoctors(hospitalId), [hospitalId]);
  const services = useMemo(() => apiStore.getServices(hospitalId), [hospitalId]);
  const medicines = useMemo(() => apiStore.getMedicines(hospitalId), [hospitalId]);
  const feedbacks = useMemo(() => apiStore.getFeedbacks(hospitalId), [hospitalId]);

  if (!hospital) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Hospital Facility Not Found</h2>
        <p className="text-sm text-slate-500">The requested public health center does not exist or has been relocated.</p>
        <button
          onClick={() => onNavigate('search')}
          className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
        >
          Back to Healthcare Search
        </button>
      </div>
    );
  }

  // Quality ratings computation
  const qualityBreakdown = useMemo(() => {
    if (feedbacks.length === 0) {
      return {
        doctor: 4.5,
        waiting: 4.1,
        staff: 4.2,
        cleanliness: 4.3,
        medicine: 4.2,
        service: 4.4,
        overall: hospital.rating
      };
    }
    const sum = (fn: (f: Feedback) => number) =>
      Math.round((feedbacks.reduce((a, b) => a + fn(b), 0) / feedbacks.length) * 10) / 10;
    return {
      doctor: sum((f) => f.doctorRating),
      waiting: sum((f) => f.waitingRating),
      staff: sum((f) => f.staffRating),
      cleanliness: sum((f) => f.cleanlinessRating),
      medicine: sum((f) => f.medicineRating),
      service: sum((f) => f.serviceRating),
      overall: hospital.rating
    };
  }, [feedbacks, hospital.rating]);

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb Header */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <button onClick={() => onNavigate('home')} className="hover:text-blue-600 transition-colors">Home</button>
        <ChevronRight className="w-3.5 h-3.5" />
        <button onClick={() => onNavigate('search')} className="hover:text-blue-600 transition-colors">Hospitals</button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-800 font-bold truncate">{hospital.name}</span>
      </div>

      {/* Main Hospital Information Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {hospital.hospitalType}
              </span>
              {hospital.emergencyAvailable && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
                  24x7 Emergency Casualty
                </span>
              )}
              <span className="text-xs font-bold text-emerald-600 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
                {hospital.isOpen ? 'Open Now' : 'Closed'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-snug">
              {hospital.name}
            </h1>

            <p className="text-sm text-slate-500 flex items-start gap-1.5">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <span>{hospital.address}, {hospital.village}, {hospital.mandal}, {hospital.district}, {hospital.state} - {hospital.pincode}</span>
            </p>
          </div>

          {/* Rating Block & Main CTA */}
          <div className="flex sm:flex-col items-end justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 text-amber-500 font-bold text-xl">
                <Star className="w-5 h-5 fill-amber-500" />
                <span>{hospital.rating}</span>
                <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
              </div>
              <span className="text-xs text-slate-500 block">
                Based on {hospital.totalReviews} verified citizen reviews
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="hospital-details-directions-btn"
                type="button"
                onClick={handleGetDirections}
                className="px-4 py-2.5 rounded-xl border border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="View actual driving route on map"
              >
                <Navigation className="w-4 h-4 text-blue-600" />
                <span>{t.getDirections}</span>
              </button>

              <button
                id="hospital-details-book-btn"
                onClick={() => onNavigate('appointment', { hospitalId: hospital.id })}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Calendar className="w-4 h-4" />
                <span>Book Appointment</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Contact & Working Hours Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <Clock className="w-4 h-4 text-blue-600" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Timings</span>
              <span className="font-semibold text-slate-800">{hospital.openingHours}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <Phone className="w-4 h-4 text-blue-600" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">General Helpline</span>
              <a href={`tel:${hospital.phone}`} className="font-semibold text-slate-800 hover:underline">
                {hospital.phone}
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200">
            <PhoneCall className="w-4 h-4 text-rose-600 animate-pulse" />
            <div>
              <span className="text-rose-600 block text-[10px] uppercase font-bold">Emergency Helpline</span>
              <span className="font-bold text-rose-950">{hospital.emergencyPhone}</span>
            </div>
          </div>
        </div>

        {/* Facilities Chips */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Hospital Facilities</h4>
          <div className="flex flex-wrap gap-2">
            {hospital.facilities.map((fac, idx) => (
              <span
                key={idx}
                className="text-xs px-3 py-1 rounded-xl bg-slate-100 text-slate-700 font-semibold border border-slate-200/60"
              >
                ✓ {fac}
              </span>
            ))}
          </div>
        </div>

        {/* Connected Digital Health Quick Services */}
        <div className="pt-2 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Connected Public Health Services</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => onNavigate('queue', { hospitalId: hospital.id })}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-left transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="overflow-hidden">
                <span className="block text-xs font-bold text-slate-800 truncate">OPD Live Queue</span>
                <span className="block text-[10px] text-slate-500 truncate">Chamber token wait</span>
              </div>
            </button>

            <button
              onClick={() => onNavigate('teleconsultation', { hospitalId: hospital.id })}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-left transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Video className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="overflow-hidden">
                <span className="block text-xs font-bold text-slate-800 truncate">Teleconsultation</span>
                <span className="block text-[10px] text-slate-500 truncate">eSanjeevani Tele-OPD</span>
              </div>
            </button>

            <button
              onClick={() => onNavigate('diagnostics', { hospitalId: hospital.id })}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-left transition-colors flex items-center gap-2 cursor-pointer"
            >
              <TestTube className="w-4 h-4 text-indigo-600 shrink-0" />
              <div className="overflow-hidden">
                <span className="block text-xs font-bold text-slate-800 truncate">Diagnostic Labs</span>
                <span className="block text-[10px] text-slate-500 truncate">Test slots & reports</span>
              </div>
            </button>

            <button
              onClick={() => onNavigate('quality-dashboard')}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-left transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Award className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="overflow-hidden">
                <span className="block text-xs font-bold text-slate-800 truncate">Quality Metrics</span>
                <span className="block text-[10px] text-slate-500 truncate">Kayakalp score</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 bg-white rounded-2xl p-1.5 shadow-xs flex flex-wrap gap-1">
        <button
          id="tab-doctors"
          onClick={() => setActiveTab('doctors')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'doctors'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>Doctors on Duty ({doctors.length})</span>
        </button>

        <button
          id="tab-services"
          onClick={() => setActiveTab('services')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'services'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Healthcare Services ({services.length})</span>
        </button>

        <button
          id="tab-medicines"
          onClick={() => setActiveTab('medicines')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'medicines'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>Medicine Stocks ({medicines.length})</span>
        </button>

        <button
          id="tab-quality"
          onClick={() => setActiveTab('quality')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'quality'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Star className="w-4 h-4" />
          <span>Quality Ratings ({feedbacks.length})</span>
        </button>

        <button
          id="tab-map"
          onClick={() => setActiveTab('map')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'map'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Map & Directions</span>
        </button>
      </div>

      {/* TAB CONTENT 1: DOCTORS */}
      {activeTab === 'doctors' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900">
              Specialists & Medical Officers Available at this Center
            </h3>
            <span className="text-xs text-slate-500">Government OPD Consultation Fee: ₹0 (Free)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {doctors.map((doc) => {
              const isAvail = doc.availabilityStatus === 'AVAILABLE';
              const isInConsult = doc.availabilityStatus === 'IN_CONSULTATION';

              return (
                <div
                  key={doc.id}
                  id={`doctor-card-${doc.id}`}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold text-base">
                          👨‍⚕️
                        </div>
                        <div>
                          <h4 className="font-bold text-base text-slate-900 leading-tight">{doc.name}</h4>
                          <p className="text-xs font-semibold text-blue-600">{doc.specialization}</p>
                          <p className="text-[11px] text-slate-500">{doc.qualification}</p>
                        </div>
                      </div>

                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                          isAvail
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : isInConsult
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                      >
                        {isAvail ? '● Available' : isInConsult ? '● In Consultation' : '● On Leave'}
                      </span>
                    </div>

                    <div className="pt-2 text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                      <div>
                        <span className="text-slate-400 font-medium">Experience: </span>
                        <span className="font-semibold text-slate-800">{doc.experience} Years</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">OPD Days: </span>
                        <span className="font-semibold text-slate-800">{doc.availableDays.join(', ')}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Time Slots: </span>
                        <span className="font-semibold text-slate-800">{doc.timeSlots.join(' | ')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                    <button
                      onClick={() => onNavigate('doctor-details', { doctorId: doc.id })}
                      className="text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors"
                    >
                      View Profile
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onNavigate('queue', { hospitalId: hospital.id, doctorId: doc.id })}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold transition-colors"
                        title="View Live Queue"
                      >
                        Queue
                      </button>
                      <button
                        onClick={() => onNavigate('teleconsultation', { hospitalId: hospital.id, doctorId: doc.id })}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-semibold transition-colors flex items-center gap-1"
                        title="Teleconsult with doctor"
                      >
                        <Video className="w-3 h-3" />
                        <span>Teleconsult</span>
                      </button>
                      <button
                        id={`book-with-doc-${doc.id}`}
                        onClick={() =>
                          onNavigate('appointment', { hospitalId: hospital.id, doctorId: doc.id })
                        }
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors"
                      >
                        Book OPD
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: SERVICES */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Diagnostic & Clinical Services Real-Time Status
              </h3>
              <p className="text-xs text-slate-500">
                Live updates directly synced from hospital staff log. Free of cost under state welfare guidelines.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold">
                  <tr>
                    <th className="p-4">Service Name</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Availability</th>
                    <th className="p-4">Estimated Waiting Time</th>
                    <th className="p-4">Description / Notes</th>
                    <th className="p-4 text-right">Last Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {services.map((srv) => (
                    <tr key={srv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-bold text-slate-900 text-sm">{srv.serviceName}</td>
                      <td className="p-4 text-slate-600 font-medium">{srv.category}</td>
                      <td className="p-4">
                        {srv.available ? (
                          <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Available Now
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            Unavailable
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-bold text-slate-800">{srv.waitingTime}</td>
                      <td className="p-4 text-slate-500 max-w-xs">{srv.description}</td>
                      <td className="p-4 text-right text-slate-400 font-mono text-[11px]">{srv.updatedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: MEDICINE AVAILABILITY */}
      {activeTab === 'medicines' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Jan Aushadhi & Hospital Dispensary Stock
              </h3>
              <p className="text-xs text-slate-500">
                Public stock transparency preventing arbitrary out-of-stock refusals. Threshold triggers automatic supply indents.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {medicines.map((med) => {
              const isOut = med.status === 'OUT_OF_STOCK' || med.quantity === 0;
              const isLow = med.status === 'LOW_STOCK';

              return (
                <div
                  key={med.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isOut
                      ? 'bg-rose-50/60 border-rose-200'
                      : isLow
                      ? 'bg-amber-50/60 border-amber-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      {med.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isOut
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : isLow
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {isOut ? '🔴 Out of Stock' : isLow ? '⚠️ Low Stock' : '🟢 Available'}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-slate-900 mb-1">{med.medicineName}</h4>
                  <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-200/50">
                    <span>Units In Stock: <strong className="text-slate-900">{med.quantity}</strong></span>
                    <span className="text-[11px] text-slate-400">Min Alert: {med.minimumThreshold}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: QUALITY RATINGS & FEEDBACK */}
      {activeTab === 'quality' && (
        <div className="space-y-6">
          {/* Quality Scorecard */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div>
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                  Citizen-Driven Quality Metric
                </span>
                <h3 className="text-xl font-bold text-slate-900">
                  Hospital Quality Score (HQS): {qualityBreakdown.overall} / 5.0
                </h3>
                <p className="text-xs text-slate-500">
                  Aggregated from citizen feedback across 6 operational pillars
                </p>
              </div>

              <button
                onClick={() => onNavigate('feedback', { hospitalId: hospital.id })}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs self-start md:self-auto transition-colors"
              >
                ★ Submit Your Visit Feedback
              </button>
            </div>

            {/* Pillar Ratings Progress Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between font-bold">
                  <span>Doctor Availability</span>
                  <span className="text-blue-700">⭐ {qualityBreakdown.doctor}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${(qualityBreakdown.doctor / 5) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between font-bold">
                  <span>Waiting Time Experience</span>
                  <span className="text-blue-700">⭐ {qualityBreakdown.waiting}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${(qualityBreakdown.waiting / 5) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between font-bold">
                  <span>Staff Courtesy & Behavior</span>
                  <span className="text-blue-700">⭐ {qualityBreakdown.staff}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${(qualityBreakdown.staff / 5) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between font-bold">
                  <span>Facility Cleanliness & Hygiene</span>
                  <span className="text-blue-700">⭐ {qualityBreakdown.cleanliness}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${(qualityBreakdown.cleanliness / 5) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between font-bold">
                  <span>Medicine Dispensing Fulfillment</span>
                  <span className="text-blue-700">⭐ {qualityBreakdown.medicine}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${(qualityBreakdown.medicine / 5) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between font-bold">
                  <span>Diagnostic Service Availability</span>
                  <span className="text-blue-700">⭐ {qualityBreakdown.service}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${(qualityBreakdown.service / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Citizen Testimonials / Reviews */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-slate-800">Recent Citizen Reviews</h4>
            {feedbacks.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No citizen reviews yet for this facility. Be the first to share your experience!</p>
            ) : (
              feedbacks.map((fb) => (
                <div key={fb.id} className="bg-white p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{fb.userName}</span>
                    <span className="font-bold text-amber-600">⭐ {fb.overallRating} / 5.0</span>
                  </div>
                  <p className="text-slate-600 italic">"{fb.comment}"</p>
                  <span className="text-[10px] text-slate-400 block">{fb.createdAt.substring(0, 10)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: MAP & DIRECTIONS */}
      {activeTab === 'map' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Hospital Geographic Location & Navigation Route
              </h3>
              <p className="text-xs text-slate-500">
                Latitude: {hospital.latitude}, Longitude: {hospital.longitude} (OpenStreetMap Data)
              </p>
            </div>
            <button
              type="button"
              id="hospital-tab-get-directions-btn"
              onClick={handleGetDirections}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              <span>{showRoute ? 'Recalculate Route' : 'Get Directions'}</span>
            </button>
          </div>

          <div id="hospital-map-section" className="rounded-2xl overflow-hidden shadow-xs border border-slate-200">
            <HospitalMap
              hospitals={singleHospitalList}
              selectedHospitalId={hospital.id}
              userCoords={userCoords}
              routeDestinationHospital={showRoute ? hospital : null}
              onClearRoute={() => setShowRoute(false)}
              onRequestUserLocation={onUseMyLocation}
              height="460px"
            />
          </div>
        </div>
      )}
    </div>
  );
};
