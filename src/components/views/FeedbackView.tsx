import React, { useState } from 'react';
import { User, LanguageCode } from '../../types';
import { apiStore } from '../../services/apiStore';
import { translations } from '../../utils/translations';
import {
  Star,
  Building2,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ThumbsUp
} from 'lucide-react';

interface FeedbackViewProps {
  initialHospitalId?: string;
  initialAppointmentId?: string;
  currentUser: User | null;
  onNavigate: (view: string, payload?: any) => void;
  language: LanguageCode;
}

export const FeedbackView: React.FC<FeedbackViewProps> = ({
  initialHospitalId,
  initialAppointmentId,
  currentUser,
  onNavigate,
  language
}) => {
  const t = translations[language];
  const hospitals = apiStore.getHospitals();

  const [hospitalId, setHospitalId] = useState<string>(
    initialHospitalId || (hospitals[0] ? hospitals[0].id : '')
  );
  const [appointmentId, setAppointmentId] = useState<string>(initialAppointmentId || '');

  const [ratings, setRatings] = useState({
    doctor: 5,
    waiting: 4,
    staff: 4,
    cleanliness: 4,
    medicine: 5,
    service: 4,
    overall: 4
  });

  const [comment, setComment] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { key: 'doctor', label: 'Doctor Availability & Consultation Quality', desc: 'Did the physician give adequate time & listen to your medical history?' },
    { key: 'waiting', label: 'Waiting Time Efficiency', desc: 'How prompt was the OPD triage and queue flow?' },
    { key: 'staff', label: 'Hospital Staff Courtesy & Guidance', desc: 'Were nurses and counter staff helpful and polite?' },
    { key: 'cleanliness', label: 'Hospital Cleanliness & Sanitation', desc: 'Hygiene of waiting halls, drinking water, restrooms and examination beds' },
    { key: 'medicine', label: 'Medicine Dispensing in Pharmacy', desc: 'Were all prescribed government generic medicines available free of charge?' },
    { key: 'service', label: 'Diagnostic Services & Lab Availability', desc: 'Availability of digital X-ray, ultrasound, pathology lab tests' },
    { key: 'overall', label: 'Overall Healthcare Visit Experience', desc: 'Your comprehensive satisfaction with this public facility' }
  ] as const;

  const handleRatingChange = (key: keyof typeof ratings, val: number) => {
    setRatings((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hospitalId) {
      setError('Please select a hospital.');
      return;
    }

    const hosp = apiStore.getHospitalById(hospitalId);

    apiStore.submitFeedback({
      userId: currentUser ? currentUser.id : 'guest-citizen',
      userName: currentUser ? currentUser.name : 'Anonymous Citizen',
      hospitalId,
      hospitalName: hosp ? hosp.name : 'Public Hospital',
      appointmentId: appointmentId.trim() || undefined,
      doctorRating: ratings.doctor,
      waitingRating: ratings.waiting,
      staffRating: ratings.staff,
      cleanlinessRating: ratings.cleanliness,
      medicineRating: ratings.medicine,
      serviceRating: ratings.service,
      overallRating: ratings.overall,
      comment: comment.trim() || 'Constructive public review for healthcare improvement.'
    });

    setSubmitted(true);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {submitted ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-xs text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mx-auto shadow-xs">
            <ThumbsUp className="w-9 h-9" />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
              Civic Feedback Recorded
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Thank You for Evaluating Public Healthcare!
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              Your transparent feedback directly feeds into the Government Hospital Quality Score and drives local healthcare accountability.
            </p>
          </div>

          <div className="pt-3 flex justify-center gap-3">
            <button
              onClick={() => onNavigate('hospital-details', { hospitalId })}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors"
            >
              View Updated Hospital Scorecard
            </button>
            <button
              onClick={() => {
                setSubmitted(false);
                setComment('');
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 shadow-xs transition-colors"
            >
              Submit Another Review
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Citizen Healthcare Quality Evaluation
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Submit Public Hospital Visit Feedback
            </h1>
            <p className="text-xs text-slate-500">
              Rate your hospital visit experience across the 6 core healthcare quality dimensions.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Hospital & Optional Appointment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Visited Hospital *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <select
                    id="feedback-hospital-select"
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Optional Appointment ID
                </label>
                <input
                  type="text"
                  value={appointmentId}
                  onChange={(e) => setAppointmentId(e.target.value)}
                  placeholder="e.g. APT2026-0819"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
                />
              </div>
            </div>

            {/* Rating Dimensions */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Rate Healthcare Dimensions (1 to 5 Stars)
              </h3>

              <div className="space-y-3">
                {categories.map((cat) => {
                  const currentVal = ratings[cat.key];
                  return (
                    <div
                      key={cat.key}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">{cat.label}</span>
                        <span className="text-[11px] text-slate-500 block">{cat.desc}</span>
                      </div>

                      {/* Interactive Stars */}
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleRatingChange(cat.key, star)}
                            className="p-1 hover:scale-125 transition-transform"
                            aria-label={`Rate ${star} stars`}
                          >
                            <Star
                              className={`w-6 h-6 ${
                                star <= currentVal
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-300'
                              }`}
                            />
                          </button>
                        ))}
                        <span className="text-xs font-bold text-slate-700 ml-1.5 w-6 text-right">
                          {currentVal}.0
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Your Feedback Comment / Suggestions for Hospital Improvement
              </label>
              <textarea
                id="feedback-comment"
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience regarding doctor consultation, medicine availability at the counter, cleanliness, or queue waiting..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
              ></textarea>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Logged as: <strong>{currentUser ? currentUser.name : 'Citizen'}</strong>
              </span>

              <button
                type="submit"
                id="submit-feedback-btn"
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit Citizen Feedback</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
