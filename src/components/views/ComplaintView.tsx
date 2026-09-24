import React, { useState } from 'react';
import { Complaint, ComplaintCategory, User, LanguageCode } from '../../types';
import { apiStore } from '../../services/apiStore';
import { translations } from '../../utils/translations';
import {
  AlertTriangle,
  Building2,
  FileText,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  Plus
} from 'lucide-react';

interface ComplaintViewProps {
  currentUser: User | null;
  onNavigate: (view: string, payload?: any) => void;
  language: LanguageCode;
}

export const ComplaintView: React.FC<ComplaintViewProps> = ({
  currentUser,
  onNavigate,
  language
}) => {
  const t = translations[language];
  const hospitals = apiStore.getHospitals();

  const [activeSubTab, setActiveSubTab] = useState<'lodge' | 'track' | 'list'>('lodge');
  const [hospitalId, setHospitalId] = useState<string>(hospitals[0] ? hospitals[0].id : '');
  const [appointmentId, setAppointmentId] = useState<string>('');
  const [category, setCategory] = useState<ComplaintCategory>('Doctor unavailable');
  const [description, setDescription] = useState<string>('');

  const [submittedComplaint, setSubmittedComplaint] = useState<Complaint | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Tracking by ID state
  const [searchTrackId, setSearchTrackId] = useState<string>('');
  const [trackedComplaint, setTrackedComplaint] = useState<Complaint | null>(null);
  const [trackSearched, setTrackSearched] = useState<boolean>(false);

  const categories: ComplaintCategory[] = [
    'Doctor unavailable',
    'Medicine unavailable',
    'Healthcare service unavailable',
    'Long waiting time',
    'Staff behavior',
    'Cleanliness',
    'Infrastructure',
    'Emergency service issue',
    'Other'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!description.trim()) {
      setFormError('Please provide a specific description of your complaint or grievance.');
      return;
    }

    const cmp = apiStore.submitComplaint({
      userId: currentUser ? currentUser.id : 'guest-citizen',
      userName: currentUser ? currentUser.name : 'Anonymous Citizen',
      hospitalId,
      appointmentId: appointmentId.trim() || undefined,
      category,
      description: description.trim()
    });

    setSubmittedComplaint(cmp);
  };

  const handleTrackSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setTrackSearched(true);
    const found = apiStore.getComplaintById(searchTrackId);
    setTrackedComplaint(found || null);
  };

  const myComplaints = currentUser
    ? apiStore.getComplaints(undefined, currentUser.id)
    : apiStore.getComplaints();

  return (
    <div className="space-y-6 pb-12">
      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Citizen Grievance & Complaint Redressal
          </h1>
          <p className="text-xs text-slate-500">
            Official platform to escalate healthcare accessibility hurdles directly to State Health Command Directorate.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('lodge')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeSubTab === 'lodge'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-white'
            }`}
          >
            Lodge Complaint
          </button>
          <button
            onClick={() => setActiveSubTab('track')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeSubTab === 'track'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-white'
            }`}
          >
            Track by ID
          </button>
          <button
            onClick={() => setActiveSubTab('list')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeSubTab === 'list'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-white'
            }`}
          >
            My Complaints ({myComplaints.length})
          </button>
        </div>
      </div>

      {/* SUB-VIEW 1: LODGE COMPLAINT */}
      {activeSubTab === 'lodge' && (
        <div className="max-w-3xl mx-auto">
          {submittedComplaint ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-5 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  Grievance Formally Registered
                </span>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Complaint Successfully Submitted
                </h2>
                <p className="text-xs text-slate-500">
                  Your grievance has been assigned to the hospital staff officer and state health monitoring cell.
                </p>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2 max-w-md mx-auto text-xs shadow-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="font-semibold text-slate-500">Complaint ID:</span>
                  <span className="font-mono font-bold text-base text-blue-700">
                    {submittedComplaint.complaintId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    ● {submittedComplaint.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Category:</span>
                  <strong className="text-slate-900">{submittedComplaint.category}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hospital:</span>
                  <strong className="text-slate-900">{submittedComplaint.hospitalName}</strong>
                </div>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={() => {
                    setSearchTrackId(submittedComplaint.complaintId);
                    setTrackedComplaint(submittedComplaint);
                    setTrackSearched(true);
                    setActiveSubTab('track');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors"
                >
                  Track Live Resolution Status
                </button>
                <button
                  onClick={() => {
                    setSubmittedComplaint(null);
                    setDescription('');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 shadow-xs transition-colors"
                >
                  Submit Another Grievance
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Lodge a Grievance on Public Healthcare Deficiency
                </h2>
                <p className="text-xs text-slate-500">
                  Report issues such as absent physicians, out-of-stock medicines, non-functional ultrasound/X-ray, or unauthorized charges.
                </p>
              </div>

              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Hospital Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Public Hospital Facility *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <select
                      id="complaint-hospital-select"
                      value={hospitalId}
                      onChange={(e) => setHospitalId(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
                    >
                      {hospitals.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} ({h.district})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Complaint Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Complaint Category *
                  </label>
                  <div className="relative">
                    <AlertTriangle className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <select
                      id="complaint-category-select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Optional Appointment ID */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Appointment ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={appointmentId}
                    onChange={(e) => setAppointmentId(e.target.value)}
                    placeholder="e.g. APT2026-0819 if related to a specific visit"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Detailed Grievance Description *
                  </label>
                  <textarea
                    id="complaint-description"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Please specify dates, exact counter/room, staff name if known, and details of unavailable medicine or service..."
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
                  ></textarea>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Complainant: <strong>{currentUser ? currentUser.name : 'Citizen'}</strong>
                  </span>

                  <button
                    type="submit"
                    id="submit-complaint-btn"
                    className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Submit Grievance & Get Tracking ID</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 2: TRACK COMPLAINT */}
      {activeSubTab === 'track' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Track Public Health Grievance by Complaint ID
            </h2>
            <p className="text-xs text-slate-500">
              Enter your unique tracking code (e.g. <strong>CMP202600123</strong>) to see official hospital response.
            </p>

            <form onSubmit={handleTrackSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  id="track-complaint-input"
                  value={searchTrackId}
                  onChange={(e) => setSearchTrackId(e.target.value)}
                  placeholder="Enter Complaint ID (e.g. CMP202600123)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors"
              >
                Track Status
              </button>
            </form>
          </div>

          {trackSearched && (
            <div>
              {trackedComplaint ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Tracking Record</span>
                      <span className="text-lg font-mono font-bold text-blue-700 block">
                        {trackedComplaint.complaintId}
                      </span>
                    </div>

                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full border ${
                        trackedComplaint.status === 'RESOLVED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : trackedComplaint.status === 'IN PROGRESS'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : trackedComplaint.status === 'UNDER REVIEW'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                    >
                      ● {trackedComplaint.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Hospital Facility:</span>
                      <strong className="text-slate-900">{trackedComplaint.hospitalName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Category:</span>
                      <strong className="text-slate-900">{trackedComplaint.category}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Date Filed:</span>
                      <span className="text-slate-800">{trackedComplaint.createdAt.substring(0, 10)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Complainant:</span>
                      <span className="text-slate-800">{trackedComplaint.userName}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <span className="text-slate-500 font-bold block">Citizen Statement:</span>
                    <p className="text-slate-700">{trackedComplaint.description}</p>
                  </div>

                  {trackedComplaint.resolutionRemarks && (
                    <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1">
                      <span className="text-emerald-900 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Official Hospital Staff / Medical Officer Action:
                      </span>
                      <p className="text-emerald-950 font-medium">{trackedComplaint.resolutionRemarks}</p>
                      <span className="text-[10px] text-emerald-700 block">
                        Updated: {trackedComplaint.updatedAt.substring(0, 10)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">No complaint found for ID "{searchTrackId}"</p>
                  <p className="text-[11px]">Please check the format (e.g. CMP202600123) and try again.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 3: LIST OF MY COMPLAINTS */}
      {activeSubTab === 'list' && (
        <div className="space-y-4">
          {myComplaints.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center text-xs text-slate-500 space-y-3">
              <ShieldCheck className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="font-bold text-slate-700 text-base">No Grievances Filed</p>
              <p>You have not submitted any complaints yet.</p>
              <button
                onClick={() => setActiveSubTab('lodge')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs transition-colors"
              >
                Lodge a Complaint
              </button>
            </div>
          ) : (
            myComplaints.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-700 text-sm">{c.complaintId}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                      {c.category}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full border self-start ${
                      c.status === 'RESOLVED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : c.status === 'IN PROGRESS'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    ● {c.status}
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <span className="text-slate-400 font-medium">Facility: </span>
                  <strong className="text-slate-900">{c.hospitalName}</strong>
                </div>

                <p className="text-xs text-slate-700 italic bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                  "{c.description}"
                </p>

                {c.resolutionRemarks && (
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
                    <strong className="text-emerald-900 block text-[11px]">Hospital Resolution:</strong>
                    <span className="text-emerald-950 font-medium">{c.resolutionRemarks}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
