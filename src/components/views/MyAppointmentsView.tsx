import React, { useState, useMemo, useEffect } from 'react';
import { Appointment, User, LanguageCode } from '../../types';
import { apiStore } from '../../services/apiStore';
import { translations } from '../../utils/translations';
import { subscribeToUserAppointments, updateAppointmentStatusInFirestore } from '../../services/firebase';
import {
  Calendar,
  Clock,
  Building2,
  Stethoscope,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Plus,
  Database,
  Mail,
  Lock,
  LogIn,
  RotateCw
} from 'lucide-react';

interface MyAppointmentsViewProps {
  currentUser: User | null;
  onNavigate: (view: string, payload?: any) => void;
  language: LanguageCode;
  onUserAuth?: (user: User) => void;
  refreshKey?: number;
  onRefresh?: () => void;
}

export const MyAppointmentsView: React.FC<MyAppointmentsViewProps> = ({
  currentUser,
  onNavigate,
  language,
  onUserAuth,
  refreshKey: propRefreshKey,
  onRefresh
}) => {
  const t = translations[language];
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [refreshKey, setRefreshKey] = useState(0);
  const [firestoreAppointments, setFirestoreAppointments] = useState<Appointment[]>([]);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [cancelNotice, setCancelNotice] = useState<string | null>(null);

  useEffect(() => {
    if (propRefreshKey !== undefined) {
      setRefreshKey((k) => k + 1);
    }
  }, [propRefreshKey]);

  // Manual citizen sign in state
  const [citizenEmail, setCitizenEmail] = useState('');
  const [citizenPassword, setCitizenPassword] = useState('');
  const [citizenError, setCitizenError] = useState<string | null>(null);
  const [citizenLoading, setCitizenLoading] = useState(false);

  const handleCitizenLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setCitizenError(null);
    setCitizenLoading(true);
    try {
      const user = apiStore.login(citizenEmail.trim(), citizenPassword, 'CITIZEN');
      if (!user) {
        setCitizenError('Invalid email/mobile or password. Please verify your credentials or register an account.');
        return;
      }
      if (onUserAuth) {
        onUserAuth(user);
      }
    } catch (err: any) {
      setCitizenError(err?.message || 'Login failed.');
    } finally {
      setCitizenLoading(false);
    }
  };

  // Realtime subscription to Firebase Firestore
  useEffect(() => {
    if (!currentUser?.id) {
      setFirestoreAppointments([]);
      return;
    }
    const unsubscribe = subscribeToUserAppointments(currentUser.id, (cloudApts) => {
      if (cloudApts && cloudApts.length > 0) {
        setFirestoreAppointments(cloudApts);
      }
    });
    return () => unsubscribe();
  }, [currentUser?.id]);

  // Realtime appointments event listener
  useEffect(() => {
    const handleAppointmentsChange = () => {
      setRefreshKey((k) => k + 1);
    };
    window.addEventListener('healthcare-appointments-updated', handleAppointmentsChange);
    window.addEventListener('storage', handleAppointmentsChange);
    return () => {
      window.removeEventListener('healthcare-appointments-updated', handleAppointmentsChange);
      window.removeEventListener('storage', handleAppointmentsChange);
    };
  }, []);

  const appointments = useMemo(() => {
    // If logged in citizen, return their appointments; otherwise return demo appointments
    const userId = currentUser ? currentUser.id : undefined;
    const local = apiStore.getAppointments(undefined, userId);
    
    // Merge firestore and local, deduping by id / appointmentId
    const map = new Map<string, Appointment>();
    local.forEach((a) => map.set(a.id || a.appointmentId, a));
    firestoreAppointments.forEach((cloudApt) => {
      const key = cloudApt.id || cloudApt.appointmentId;
      const existing = map.get(key);
      if (existing) {
        // If either copy was cancelled, preserve CANCELLED status
        if (existing.status === 'CANCELLED' || cloudApt.status === 'CANCELLED') {
          map.set(key, { ...cloudApt, ...existing, status: 'CANCELLED' });
        } else {
          map.set(key, cloudApt);
        }
      } else {
        map.set(key, cloudApt);
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }, [currentUser, refreshKey, firestoreAppointments]);

  const filteredAppointments = useMemo(() => {
    if (filter === 'ALL') return appointments;
    if (filter === 'ACTIVE') {
      return appointments.filter((a) => a.status === 'BOOKED' || a.status === 'CONFIRMED');
    }
    return appointments.filter((a) => a.status === filter);
  }, [appointments, filter]);

  const handleExecuteCancel = (aptId: string, appointmentId?: string) => {
    const targetApt = appointments.find((a) => a.id === aptId || a.appointmentId === appointmentId);

    // Update local storage and dispatch real-time slot update
    apiStore.updateAppointmentStatus(aptId, 'CANCELLED');
    if (appointmentId && appointmentId !== aptId) {
      apiStore.updateAppointmentStatus(appointmentId, 'CANCELLED');
    }

    // Also update in Firestore if connected
    updateAppointmentStatusInFirestore(aptId, 'CANCELLED').catch(() => {});
    if (appointmentId && appointmentId !== aptId) {
      updateAppointmentStatusInFirestore(appointmentId, 'CANCELLED').catch(() => {});
    }

    // Also update any firestore cached list
    setFirestoreAppointments((prev) =>
      prev.map((a) =>
        a.id === aptId || a.appointmentId === appointmentId || a.appointmentId === aptId
          ? { ...a, status: 'CANCELLED' }
          : a
      )
    );
    setConfirmCancelId(null);
    const slotText = targetApt?.appointmentTime ? ` for ${targetApt.appointmentTime}` : '';
    setCancelNotice(`Appointment${slotText} cancelled successfully. The doctor consultation slot has been restored (+1 slot).`);
    setTimeout(() => setCancelNotice(null), 5000);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {t.myAppointments} & Digital OPD Tokens
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              <Database className="w-3 h-3" /> Firebase Sync
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Track your scheduled consultations, doctor visits and digital tokens across public hospitals.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            id="refresh-my-appointments-btn"
            type="button"
            onClick={() => {
              if (onRefresh) onRefresh();
              setRefreshKey((k) => k + 1);
            }}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Refresh appointments and token passes"
          >
            <RotateCw className="w-3.5 h-3.5 text-blue-600" />
            <span>Refresh</span>
          </button>
          <button
            id="book-new-appointment-btn"
            onClick={() => onNavigate('appointment')}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Book New Appointment</span>
          </button>
        </div>
      </div>

      {cancelNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs font-semibold text-emerald-900 shadow-xs">
          <span>✓ {cancelNotice}</span>
          <button
            type="button"
            onClick={() => setCancelNotice(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 text-xs font-bold">
        {(['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-xl border transition-all ${
              filter === status
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {status} ({appointments.filter((a) => status === 'ALL' ? true : status === 'ACTIVE' ? (a.status === 'BOOKED' || a.status === 'CONFIRMED') : a.status === status).length})
          </button>
        ))}
      </div>

      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center space-y-3">
          <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">No Appointments Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You do not have any appointments under the "{filter}" category.
          </p>
          <button
            onClick={() => onNavigate('appointment')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
          >
            Book Your First Appointment
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((apt) => {
            const isBooked = apt.status === 'BOOKED';
            const isConfirmed = apt.status === 'CONFIRMED';
            const isCompleted = apt.status === 'COMPLETED';
            const isCancelled = apt.status === 'CANCELLED';

            return (
              <div
                key={apt.id}
                id={`appointment-item-${apt.id}`}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Appointment ID</span>
                    <span className="text-base font-mono font-bold text-blue-700">
                      {apt.appointmentId}
                    </span>
                  </div>

                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full border self-start ${
                      isConfirmed
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : isBooked
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : isCompleted
                        ? 'bg-slate-100 text-slate-700 border-slate-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    ● {apt.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-slate-400 block font-medium">Healthcare Facility</span>
                    <strong className="text-slate-900 block leading-tight">{apt.hospitalName}</strong>
                    <span className="text-[11px] text-emerald-600 font-semibold">Free Govt OPD</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 block font-medium">Doctor / Department</span>
                    <strong className="text-slate-900 block leading-tight">{apt.doctorName}</strong>
                    <span className="text-[11px] text-slate-500 block">{apt.doctorSpecialization}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 block font-medium">Scheduled Visit</span>
                    <strong className="text-slate-900 block">{apt.appointmentDate}</strong>
                    <span className="text-[11px] text-blue-700 font-semibold block">{apt.appointmentTime}</span>
                  </div>
                </div>

                {apt.reason && (
                  <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 font-semibold">Reason: </span>
                    <span className="text-slate-700">{apt.reason}</span>
                  </div>
                )}

                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-400 font-mono text-[11px]">
                    Patient: <strong>{apt.patientName}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    {isCompleted && (
                      <button
                        onClick={() =>
                          onNavigate('feedback', {
                            hospitalId: apt.hospitalId,
                            appointmentId: apt.appointmentId
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors"
                      >
                        ★ Rate This Visit
                      </button>
                    )}

                    {(isBooked || isConfirmed) && (
                      confirmCancelId === apt.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            id={`confirm-cancel-${apt.id}`}
                            type="button"
                            onClick={() => handleExecuteCancel(apt.id, apt.appointmentId)}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors"
                          >
                            Confirm Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmCancelId(null)}
                            className="px-2.5 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors"
                          >
                            Keep
                          </button>
                        </div>
                      ) : (
                        <button
                          id={`cancel-apt-${apt.id}`}
                          type="button"
                          onClick={() => setConfirmCancelId(apt.id)}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 font-semibold text-xs transition-colors cursor-pointer"
                        >
                          Cancel Appointment
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
