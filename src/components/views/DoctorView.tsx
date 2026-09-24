import React, { useState, useMemo, useEffect } from 'react';
import { Doctor, Hospital, LanguageCode, User } from '../../types';
import { translations } from '../../utils/translations';
import { apiStore } from '../../services/apiStore';
import {
  Stethoscope,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronRight,
  UserCheck,
  ShieldAlert,
  Award
} from 'lucide-react';

interface DoctorViewProps {
  doctorId: string;
  currentUser: User | null;
  onNavigate: (view: string, payload?: any) => void;
  language: LanguageCode;
}

export const DoctorView: React.FC<DoctorViewProps> = ({
  doctorId,
  currentUser,
  onNavigate,
  language
}) => {
  const t = translations[language];
  const doctor = useMemo(() => apiStore.getDoctorById(doctorId), [doctorId]);
  const hospital = useMemo(
    () => (doctor ? apiStore.getHospitalById(doctor.hospitalId) : undefined),
    [doctor]
  );

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    return today.toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = useState<string>('');

  const [appointmentVersion, setAppointmentVersion] = useState(0);

  useEffect(() => {
    const handleAppointmentsChange = () => {
      setAppointmentVersion((v) => v + 1);
    };
    window.addEventListener('healthcare-appointments-updated', handleAppointmentsChange);
    window.addEventListener('storage', handleAppointmentsChange);
    return () => {
      window.removeEventListener('healthcare-appointments-updated', handleAppointmentsChange);
      window.removeEventListener('storage', handleAppointmentsChange);
    };
  }, []);

  const slotsWithAvailability = useMemo(() => {
    if (!doctor) return [];
    return apiStore.getDoctorSlotsWithAvailability(doctor, selectedDate);
  }, [doctor, selectedDate, appointmentVersion]);

  useEffect(() => {
    if (slotsWithAvailability.length === 0) return;
    const current = slotsWithAvailability.find((s) => s.slot === selectedSlot);
    if (!current || current.isFullyBooked) {
      const nextAvail = slotsWithAvailability.find((s) => !s.isFullyBooked);
      if (nextAvail) {
        setSelectedSlot(nextAvail.slot);
      } else if (slotsWithAvailability[0]) {
        setSelectedSlot(slotsWithAvailability[0].slot);
      }
    }
  }, [slotsWithAvailability, selectedSlot]);

  if (!doctor || !hospital) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
        <h3 className="font-bold text-slate-800 text-lg">Doctor Profile Not Found</h3>
        <button
          onClick={() => onNavigate('search')}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
        >
          Back to Search
        </button>
      </div>
    );
  }

  const isAvail = doctor.availabilityStatus === 'AVAILABLE';

  const handleProceedBooking = () => {
    onNavigate('appointment', {
      hospitalId: hospital.id,
      doctorId: doctor.id,
      prefillDate: selectedDate,
      prefillSlot: selectedSlot || doctor.timeSlots[0]
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <button onClick={() => onNavigate('home')} className="hover:text-blue-600 transition-colors">Home</button>
        <ChevronRight className="w-3.5 h-3.5" />
        <button onClick={() => onNavigate('hospital-details', { hospitalId: hospital.id })} className="hover:text-blue-600 transition-colors truncate max-w-[150px]">
          {hospital.name}
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-800 font-bold">{doctor.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doctor Bio Card */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-4">
            <div className="w-28 h-28 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-4xl shadow-xs">
              👨‍⚕️
            </div>
            <div>
              <span
                className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border mb-1.5 ${
                  isAvail
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}
              >
                {isAvail ? '● Currently Available for Consult' : '● Scheduled OPD Only'}
              </span>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">{doctor.name}</h1>
              <p className="text-xs font-bold text-blue-700">{doctor.specialization}</p>
              <p className="text-xs text-slate-500">{doctor.qualification}</p>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 font-medium">Clinical Experience</span>
              <span className="font-bold text-slate-900">{doctor.experience} Years</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 font-medium">Consultation Fee</span>
              <span className="font-bold text-emerald-600">₹0 (Free Govt Service)</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-slate-500 font-medium block">Assigned Public Hospital</span>
              <p className="font-bold text-slate-800">{hospital.name}</p>
              <p className="text-[11px] text-slate-500">{hospital.district}, {hospital.state}</p>
            </div>
          </div>
        </div>

        {/* Schedule & Slot Booking Card */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Select Appointment Date & OPD Consultation Slot
            </h2>
            <p className="text-xs text-slate-500">
              Reserve your digital OPD token ahead of time to avoid queues at registration counters.
            </p>
          </div>

          {/* OPD Days Available */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <span className="font-bold text-slate-800 block mb-1.5">Weekly OPD Schedule:</span>
            <div className="flex flex-wrap gap-1.5">
              {doctor.availableDays.map((day) => (
                <span
                  key={day}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-semibold text-slate-700 shadow-2xs"
                >
                  ✓ {day}
                </span>
              ))}
            </div>
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">Preferred Visit Date</label>
            <input
              type="date"
              value={selectedDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="p-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
          </div>

          {/* Time Slots */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">Available Time Slots</label>
              <span className="text-[11px] text-slate-500 font-medium">9:00 AM - 4:00 PM (6 min consultation)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {slotsWithAvailability.map(({ slot, label, isFullyBooked, remainingSlots }) => {
                const isSelected = selectedSlot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={isFullyBooked}
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                      isFullyBooked
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                        : isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs cursor-pointer'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer'
                    }`}
                  >
                    <div>
                      <span className="block font-bold">{slot}</span>
                      <span
                        className={`text-[10px] inline-block font-semibold px-1.5 py-0.5 rounded-md mt-1 ${
                          isSelected
                            ? 'bg-blue-700 text-white'
                            : isFullyBooked
                            ? 'bg-rose-100 text-rose-700'
                            : remainingSlots <= 3
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-white shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              No booking fees. Free government healthcare access.
            </div>

            <button
              id="doctor-book-proceed-btn"
              onClick={handleProceedBooking}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Proceed to Patient Details & Confirm</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
