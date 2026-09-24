import React, { useState, useMemo } from 'react';
import {
  TestTube,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Building2,
  Search,
  Filter,
  ShieldCheck,
  Zap,
  Tag
} from 'lucide-react';
import { apiStore } from '../../services/apiStore';
import { DiagnosticService, LanguageCode, User } from '../../types';
import { translations } from '../../utils/translations';

interface DiagnosticServicesViewProps {
  language: LanguageCode;
  currentUser: User | null;
  onNavigateToHospital: (hospitalId: string) => void;
}

export const DiagnosticServicesView: React.FC<DiagnosticServicesViewProps> = ({
  language,
  currentUser,
  onNavigateToHospital
}) => {
  const t = translations[language];
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookedSlotMsg, setBookedSlotMsg] = useState<string | null>(null);

  const hospitals = useMemo(() => apiStore.getHospitals(), []);
  const diagnostics = useMemo(() => apiStore.getDiagnostics(), []);

  const filteredDiagnostics = useMemo(() => {
    const q = String(searchQuery || '').trim().toLowerCase();
    return diagnostics.filter((d) => {
      const matchHosp = selectedHospitalId === 'ALL' || d.hospitalId === selectedHospitalId;
      const matchCat = selectedCategory === 'ALL' || d.category === selectedCategory;
      const matchSearch =
        !q ||
        String(d.name || '').toLowerCase().includes(q) ||
        String(d.category || '').toLowerCase().includes(q);
      return matchHosp && matchCat && matchSearch;
    });
  }, [diagnostics, selectedHospitalId, selectedCategory, searchQuery]);

  const handleBookSlot = (test: DiagnosticService) => {
    const hosp = hospitals.find((h) => h.id === test.hospitalId);
    setBookedSlotMsg(
      `Lab Slot Reserved: ${test.name} at ${hosp?.name || 'Hospital'}. Assigned Time: ${test.nextAvailableSlot}. Present at Central Lab Counter.`
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-900 via-purple-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-xs font-semibold mb-2">
          <TestTube className="w-3.5 h-3.5 text-purple-300" />
          <span>National Free Diagnostic Service Initiative (NHM)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          {t.diagnosticServices}
        </h1>
        <p className="text-sm text-purple-100 mt-1 max-w-2xl leading-relaxed">
          {t.diagnosticServicesDesc}. Real-time machine operational status, sample collection hours, digital report turnaround and 100% cashless testing under NHM.
        </p>
      </div>

      {bookedSlotMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-emerald-900 text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold">{bookedSlotMsg}</span>
          </div>
          <button
            onClick={() => setBookedSlotMsg(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search test (e.g. Chest X-Ray, Lipid Profile, CBC)..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Hospital Dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <select
            value={selectedHospitalId}
            onChange={(e) => setSelectedHospitalId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 font-semibold"
          >
            <option value="ALL">All Government Facilities</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 md:pb-0">
          {['ALL', 'Pathology', 'Biochemistry', 'Radiology', 'Microbiology', 'Cardiology'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Diagnostic Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDiagnostics.map((diag) => {
          const hosp = hospitals.find((h) => h.id === diag.hospitalId);

          return (
            <div
              key={diag.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                    {diag.category}
                  </span>

                  {/* Machine Status */}
                  <span
                    className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      diag.equipmentStatus === 'OPERATIONAL'
                        ? 'bg-emerald-100 text-emerald-800'
                        : diag.equipmentStatus === 'CALIBRATION'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        diag.equipmentStatus === 'OPERATIONAL'
                          ? 'bg-emerald-500'
                          : diag.equipmentStatus === 'CALIBRATION'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    ></span>
                    {diag.equipmentStatus}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">{diag.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{hosp?.name || 'Government General Hospital'}</span>
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Sample Timings:</span>
                    </span>
                    <span className="font-bold text-slate-800">{diag.sampleTimings}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Report TAT:</span>
                    </span>
                    <span className="font-bold text-slate-800">{diag.reportTurnaroundHours} Hours Digital</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 border-t border-slate-200/60 pt-1.5">
                    <span>Slots Available:</span>
                    <span className="font-bold text-emerald-700">
                      {diag.slotsAvailableToday} Slots &bull; {diag.nextAvailableSlot}
                    </span>
                  </div>
                </div>

                {/* Free under NHM Badge */}
                <div className="flex items-center gap-2 text-xs">
                  {diag.isFreeUnderNHM ? (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-bold flex items-center gap-1 text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      100% Free under NHM
                    </span>
                  ) : (
                    <span className="text-slate-600 font-bold text-[11px]">
                      Nominal User Fee: ₹{diag.price}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleBookSlot(diag)}
                  disabled={diag.equipmentStatus === 'MAINTENANCE'}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    diag.equipmentStatus === 'MAINTENANCE'
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-purple-700 hover:bg-purple-800 text-white shadow-xs'
                  }`}
                >
                  {diag.equipmentStatus === 'MAINTENANCE' ? 'Equipment Offline' : 'Reserve Lab Slot'}
                </button>

                {hosp && (
                  <button
                    onClick={() => onNavigateToHospital(hosp.id)}
                    className="text-blue-600 hover:underline font-bold text-xs"
                  >
                    Hospital Details
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
