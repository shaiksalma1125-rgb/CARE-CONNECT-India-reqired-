import React, { useState, useMemo } from 'react';
import {
  FileText,
  ShieldCheck,
  QrCode,
  Download,
  Plus,
  Calendar,
  Building2,
  Stethoscope,
  Activity,
  Heart,
  Pill,
  Search,
  Eye,
  Trash2,
  CheckCircle2,
  User,
  Filter,
  GitFork,
  ArrowRight
} from 'lucide-react';
import { apiStore } from '../../services/apiStore';
import { HealthRecord, User as UserType, LanguageCode } from '../../types';
import { translations } from '../../utils/translations';

interface PatientHealthRecordsViewProps {
  language: LanguageCode;
  currentUser: UserType | null;
  onNavigate?: (view: string, payload?: any) => void;
  onNavigateToHospital?: (hospitalId: string) => void;
  initialPatientId?: string;
}

export const PatientHealthRecordsView: React.FC<PatientHealthRecordsViewProps> = ({
  language,
  currentUser,
  onNavigate,
  onNavigateToHospital,
  initialPatientId
}) => {
  const t = translations[language];
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [recordsKey, setRecordsKey] = useState(0);

  const citizenReferrals = useMemo(() => {
    return apiStore.getReferralsForCitizen(currentUser);
  }, [currentUser, recordsKey]);

  // Add modal state
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<HealthRecord['recordType']>('PRESCRIPTION');
  const [newFacility, setNewFacility] = useState('GGH Vijayawada');
  const [newDoctor, setNewDoctor] = useState('Dr. K. Srinivas Rao');
  const [newSummary, setNewSummary] = useState('');

  const records = useMemo(() => {
    return apiStore.getHealthRecords();
  }, [recordsKey]);

  const filteredRecords = useMemo(() => {
    const q = String(searchQuery || '').toLowerCase().trim();
    return records.filter((r) => {
      const matchType = activeFilter === 'ALL' || r.recordType === activeFilter;
      if (!matchType) return false;
      if (!q) return true;

      const matchTitle = String(r.title || '').toLowerCase().includes(q);
      const matchFacility = String(r.facilityName || '').toLowerCase().includes(q);
      const matchDoctor = String(r.doctorName || '').toLowerCase().includes(q);
      return matchTitle || matchFacility || matchDoctor;
    });
  }, [records, activeFilter, searchQuery]);

  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    apiStore.addHealthRecord({
      userId: currentUser?.id || 'usr-cit-1',
      abhaNumber: '91-2026-8812-4029',
      abhaAddress: `${String(currentUser?.name || 'salma').toLowerCase().replace(/[^a-z0-9]/g, '')}@abdm`,
      recordType: newType,
      title: newTitle,
      facilityName: newFacility,
      doctorName: newDoctor,
      date: new Date().toISOString().split('T')[0],
      summary: newSummary
    });
    setRecordsKey((k) => k + 1);
    setShowAddModal(false);
    setNewTitle('');
    setNewSummary('');
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this health record entry?')) {
      apiStore.deleteHealthRecord(id);
      setRecordsKey((k) => k + 1);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ABHA Digital Health Card Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-emerald-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>Ayushman Bharat Digital Mission (ABDM Verified)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t.healthRecords}
            </h1>
            <p className="text-sm text-emerald-100 max-w-xl leading-relaxed">
              Lifelong unified digital health records. Access verified prescriptions, lab reports, discharge summaries & immunizations across all public health facilities.
            </p>
          </div>

          {/* Citizen ABHA Card Badge */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 sm:w-80 shrink-0 space-y-3">
            <div className="flex items-center justify-between border-b border-white/20 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-200">
                  ABHA Health Locker
                </span>
              </div>
              <QrCode className="w-5 h-5 text-white/80" />
            </div>

            <div>
              <span className="text-[10px] text-white/60 block">Full Name</span>
              <span className="text-sm font-bold text-white block">{currentUser?.name || 'Shaik Salma'}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-[10px] text-white/60 block">ABHA Number</span>
                <span className="font-mono font-bold text-emerald-300">91-2026-8812</span>
              </div>
              <div>
                <span className="text-[10px] text-white/60 block">ABHA Address</span>
                <span className="font-bold text-white">salma@abdm</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Inter-Facility Referral Banner */}
      {citizenReferrals.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                  Active Inter-Facility Referral Tracking
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                  {citizenReferrals.length} Clinical Transfer{citizenReferrals.length > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Hospital staff have issued an inter-facility referral slip. Track receiving hospital bed reservation, specialist doctor allocation, and live progress.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate && onNavigate('referrals')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <span>Track Referral Journey</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter and Actions Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search records by doctor, test, or facility..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
          {[
            { id: 'ALL', label: 'All Records' },
            { id: 'PRESCRIPTION', label: 'Prescriptions' },
            { id: 'LAB_REPORT', label: 'Diagnostic Labs' },
            { id: 'DISCHARGE_SUMMARY', label: 'Discharge Summaries' },
            { id: 'IMMUNIZATION', label: 'Immunizations' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer ${
                activeFilter === cat.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Add Health Record</span>
        </button>
      </div>

      {/* Records Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecords.map((record) => (
          <div
            key={record.id}
            className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    record.recordType === 'PRESCRIPTION'
                      ? 'bg-blue-100 text-blue-800'
                      : record.recordType === 'LAB_REPORT'
                      ? 'bg-purple-100 text-purple-800'
                      : record.recordType === 'DISCHARGE_SUMMARY'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {String(record.recordType || 'HEALTH_RECORD').replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {record.date}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 leading-snug">{record.title}</h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{record.facilityName}</span>
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                  <span>{record.doctorName}</span>
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                {record.summary}
              </div>

              {/* Lab Values Badges if present */}
              {record.details?.tests && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Observed Values:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {record.details.tests.map((t: any, idx: number) => (
                      <div key={idx} className="bg-slate-100 p-2 rounded-xl">
                        <span className="text-slate-500 block text-[10px]">{t.name}</span>
                        <span className="font-bold text-slate-800">
                          {t.value} {t.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                onClick={() => setSelectedRecord(record)}
                className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Full Record</span>
              </button>

              <button
                onClick={() => handleDelete(record.id)}
                className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                title="Delete record"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredRecords.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 text-xs space-y-3">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="font-semibold text-slate-700 text-sm">No health records found</p>
          <p>Try adjusting your search query or add a new record to your ABHA digital locker.</p>
        </div>
      )}

      {/* Record Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 text-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {selectedRecord.recordType}
                </span>
                <h3 className="font-bold text-base text-slate-900 mt-1">{selectedRecord.title}</h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer p-1"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-[10px]">Facility</span>
                  <span className="font-bold text-slate-800">{selectedRecord.facilityName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Medical Officer</span>
                  <span className="font-bold text-slate-800">{selectedRecord.doctorName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Record Date</span>
                  <span className="font-bold text-slate-800">{selectedRecord.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">ABHA Linked</span>
                  <span className="font-bold text-emerald-700">{selectedRecord.abhaAddress}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-900 block mb-1">Clinical Summary:</span>
                <p className="p-3 bg-slate-50 rounded-xl text-slate-700 leading-relaxed border border-slate-100">
                  {selectedRecord.summary}
                </p>
              </div>

              {selectedRecord.details && (
                <div className="space-y-1">
                  <span className="font-bold text-slate-900 block">Report Parameters:</span>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] overflow-x-auto font-mono">
                    {JSON.stringify(selectedRecord.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Print / Export PDF</span>
              </button>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 text-slate-800">
            <h3 className="font-bold text-base text-slate-900 border-b pb-3 border-slate-100">
              Add Medical Record to ABHA Locker
            </h3>

            <form onSubmit={handleAddRecord} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Record Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Typhoid Diagnostic Widal Test"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Record Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    <option value="PRESCRIPTION">Prescription</option>
                    <option value="LAB_REPORT">Lab Report</option>
                    <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
                    <option value="IMMUNIZATION">Immunization</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Facility Name</label>
                  <input
                    type="text"
                    required
                    value={newFacility}
                    onChange={(e) => setNewFacility(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Attending Doctor</label>
                <input
                  type="text"
                  required
                  value={newDoctor}
                  onChange={(e) => setNewDoctor(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Summary / Diagnosis</label>
                <textarea
                  rows={3}
                  required
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Clinical notes, findings, medications prescribed..."
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
