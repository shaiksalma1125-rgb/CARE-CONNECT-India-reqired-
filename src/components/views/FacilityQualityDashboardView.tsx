import React, { useState, useMemo, useEffect } from 'react';
import {
  Award,
  Clock,
  Pill,
  TestTube,
  CheckCircle2,
  TrendingUp,
  Building2,
  Filter,
  Search,
  Star,
  ShieldCheck,
  Activity,
  AlertCircle,
  RotateCw
} from 'lucide-react';
import { apiStore } from '../../services/apiStore';
import { FacilityQualityScore, LanguageCode } from '../../types';
import { translations } from '../../utils/translations';

interface FacilityQualityDashboardViewProps {
  language: LanguageCode;
  onNavigateToHospital?: (hospitalId: string) => void;
  onNavigate?: (view: string, payload?: any) => void;
  userCoords?: { lat: number; lng: number } | null;
  refreshKey?: number;
  onRefresh?: () => void;
}

export const FacilityQualityDashboardView: React.FC<FacilityQualityDashboardViewProps> = ({
  language,
  onNavigateToHospital,
  onNavigate,
  userCoords,
  refreshKey,
  onRefresh
}) => {
  const t = translations[language];
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'wait' | 'medicine'>('score');
  const [localVersion, setLocalVersion] = useState(0);

  useEffect(() => {
    if (refreshKey !== undefined) {
      setLocalVersion((v) => v + 1);
    }
  }, [refreshKey]);

  const scores = useMemo(() => apiStore.getQualityScores(), [localVersion]);
  const hospitals = useMemo(() => apiStore.getHospitals(), [localVersion]);

  const enrichedScores = useMemo(() => {
    return scores.map((s) => {
      const hosp = hospitals.find((h) => h.id === s.hospitalId);
      return {
        ...s,
        hospitalName: hosp?.name || 'Government Facility',
        type: hosp?.type || 'PHC',
        district: hosp?.district || 'Krishna',
        rating: hosp?.rating || 4.5
      };
    });
  }, [scores, hospitals]);

  const filtered = useMemo(() => {
    const q = String(searchQuery || '').trim().toLowerCase();
    return enrichedScores
      .filter((s) => {
        const matchType = filterType === 'ALL' || s.type === filterType;
        if (!matchType) return false;
        if (!q) return true;

        const matchHosp = String(s.hospitalName || '').toLowerCase().includes(q);
        const matchDist = String(s.district || '').toLowerCase().includes(q);
        return matchHosp || matchDist;
      })
      .sort((a, b) => {
        if (sortBy === 'score') return b.overallScore - a.overallScore;
        if (sortBy === 'wait') return a.avgOpdWaitingTimeMinutes - b.avgOpdWaitingTimeMinutes;
        if (sortBy === 'medicine') return b.medicineAvailabilityPercent - a.medicineAvailabilityPercent;
        return 0;
      });
  }, [enrichedScores, filterType, searchQuery, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900 via-orange-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-xs font-semibold mb-2">
          <Award className="w-3.5 h-3.5 text-amber-300" />
          <span>National Quality Assurance Standards (NQAS) & Kayakalp Portal</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          {t.facilityQuality}
        </h1>
        <p className="text-sm text-amber-100 mt-1 max-w-2xl leading-relaxed">
          {t.facilityQualityDesc}. Transparent government facility benchmarks comparing OPD waiting times, verified medicine formulary stock, diagnostic test availability, and citizen grievance redressal rates.
        </p>
      </div>

      {/* Aggregate Overview KPI Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Avg District OPD Wait
          </span>
          <div className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span>22 Mins</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold block">Down 35% via Digital Tokens</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Essential Medicine Stock
          </span>
          <div className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Pill className="w-5 h-5 text-emerald-600" />
            <span>94.8%</span>
          </div>
          <span className="text-[10px] text-slate-500 block">Verified Formulary Availability</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Diagnostics Equipment Uptime
          </span>
          <div className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <TestTube className="w-5 h-5 text-purple-600" />
            <span>96.2%</span>
          </div>
          <span className="text-[10px] text-slate-500 block">Central Lab Analyzers Active</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Grievance Redressal Rate
          </span>
          <div className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-amber-600" />
            <span>98.1%</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold block">Resolved within 48 hours</span>
        </div>
      </div>

      {/* Filter and Sorting */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search facility name, mandal or district..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {['ALL', 'Tertiary/Teaching', 'Community Health Centre', 'Primary Health Centre'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  filterType === t
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 font-semibold"
          >
            <option value="score">Sort by Quality Score</option>
            <option value="wait">Lowest Waiting Time</option>
            <option value="medicine">Highest Medicine Stock</option>
          </select>

          {/* Refresh Option */}
          <button
            id="quality-dashboard-refresh-btn"
            type="button"
            onClick={() => {
              if (onRefresh) {
                onRefresh();
              } else {
                setLocalVersion((v) => v + 1);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:text-amber-800 text-slate-700 font-bold transition-all cursor-pointer whitespace-nowrap"
            title="Refresh NQAS facility scores and live benchmarks"
          >
            <RotateCw className="w-3.5 h-3.5 text-amber-600" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Facility Quality Scorecards */}
      <div className="space-y-4">
        {filtered.map((fac) => (
          <div
            key={fac.hospitalId}
            className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-shadow space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{fac.hospitalName}</h3>
                  <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-600">
                    {fac.type}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">District: {fac.district} &bull; Certified Government Facility</p>
              </div>

              {/* Overall Quality Score Badge */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Overall Quality Score</span>
                  <div className="text-2xl font-black text-amber-600">
                    {fac.overallScore}<span className="text-sm text-slate-400 font-normal">/100</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold">
                  <Award className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Metrics Bar Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-slate-400 block text-[10px]">Avg OPD Wait Time</span>
                <span className="font-bold text-slate-900 text-base">{fac.avgOpdWaitingTimeMinutes} Mins</span>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full"
                    style={{ width: `${Math.min(100, (fac.avgOpdWaitingTimeMinutes / 45) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-slate-400 block text-[10px]">Medicine Availability</span>
                <span className="font-bold text-emerald-700 text-base">{fac.medicineAvailabilityPercent}%</span>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${fac.medicineAvailabilityPercent}%` }}
                  ></div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-slate-400 block text-[10px]">Diagnostic Test Availability</span>
                <span className="font-bold text-purple-700 text-base">{fac.diagnosticAvailabilityPercent}%</span>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full"
                    style={{ width: `${fac.diagnosticAvailabilityPercent}%` }}
                  ></div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-slate-400 block text-[10px]">Doctor Attendance</span>
                <span className="font-bold text-amber-700 text-base">{fac.doctorAttendancePercent}%</span>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full"
                    style={{ width: `${fac.doctorAttendancePercent}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Certifications and Action */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                  Kayakalp: {fac.kayakalpAwardStatus}
                </span>
                <span className="text-[10px] bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-bold">
                  NQAS: {fac.nqasCertificationGrade}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onNavigateToHospital) {
                    onNavigateToHospital(fac.hospitalId);
                  } else if (onNavigate) {
                    onNavigate('hospital-details', { hospitalId: fac.hospitalId });
                  }
                }}
                className="text-blue-600 hover:underline font-bold text-xs cursor-pointer"
              >
                View Facility Services, Doctors & Medicines &rarr;
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
