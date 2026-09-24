import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  PhoneCall,
  Clock,
  ArrowRight,
  RefreshCw,
  ShieldAlert,
  Stethoscope,
  Heart,
  Thermometer,
  Calendar,
  Building2,
  Video,
  Ticket,
  QrCode,
  Printer,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { apiStore } from '../../services/apiStore';
import { TriageAssessment, LanguageCode, User } from '../../types';
import { translations } from '../../utils/translations';

interface DigitalTriageViewProps {
  language: LanguageCode;
  currentUser: User | null;
  onNavigate?: (view: any, payload?: any) => void;
  onOpenEmergencySOS?: (reason?: string) => void;
  onNavigateToHospital?: (hospitalId: string) => void;
  onOpenEmergencyModal?: (symptom?: string) => void;
  onNavigateToTeleconsult?: (payload?: any) => void;
  onNavigateToQueue?: (payload?: any) => void;
}

export const DigitalTriageView: React.FC<DigitalTriageViewProps> = ({
  language,
  currentUser,
  onNavigate,
  onOpenEmergencySOS,
  onNavigateToHospital,
  onOpenEmergencyModal,
  onNavigateToTeleconsult,
  onNavigateToQueue
}) => {
  const t = translations[language];
  const hospitals = useMemo(() => apiStore.getHospitals(), []);

  // Questionnaire state
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [patientName, setPatientName] = useState(currentUser?.name || 'Shaik Salma');
  const [patientAge, setPatientAge] = useState(38);
  const [category, setCategory] = useState<string>('chest');
  const [duration, setDuration] = useState<string>('few_hours');
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(hospitals[0]?.id || 'hosp-1');

  // Red flags checkboxes
  const [hasSeverePain, setHasSeverePain] = useState(false);
  const [hasDifficultyBreathing, setHasDifficultyBreathing] = useState(false);
  const [hasAlteredConsciousness, setHasAlteredConsciousness] = useState(false);
  const [hasUncontrolledBleeding, setHasUncontrolledBleeding] = useState(false);
  const [hasHighFeverWithStiffness, setHasHighFeverWithStiffness] = useState(false);

  // Vitals
  const [spo2, setSpo2] = useState<number>(98);
  const [pulse, setPulse] = useState<number>(78);
  const [temp, setTemp] = useState<number>(98.6);

  // Result & Generated Token state
  const [assessment, setAssessment] = useState<TriageAssessment | null>(null);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [issuedToken, setIssuedToken] = useState<{
    tokenNumber: number;
    tokenCode: string;
    estimatedWaitMins: number;
    roomNumber: string;
    hospitalName: string;
    department: string;
  } | null>(null);

  const getRecommendedDept = (cat: string) => {
    switch (cat) {
      case 'chest':
        return 'Cardiology OPD';
      case 'breathing':
        return 'Pulmonology & Chest OPD';
      case 'fever':
        return 'General Medicine OPD';
      case 'neuro':
        return 'Neurology OPD';
      case 'abdomen':
        return 'General Surgery & Gastroenterology';
      case 'maternal':
        return 'Obstetrics & Gynaecology OPD';
      default:
        return 'General Medicine OPD';
    }
  };

  const evaluateTriage = () => {
    let urgency: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' = 'GREEN';
    const reasons: string[] = [];

    // Red flag logic
    if (hasAlteredConsciousness || hasUncontrolledBleeding) {
      urgency = 'RED';
      reasons.push('Loss of consciousness or severe uncontrolled bleeding detected');
    }

    if (category === 'chest' && (hasSeverePain || hasDifficultyBreathing)) {
      urgency = 'RED';
      reasons.push('Cardiac alert: Acute severe chest distress with breathing difficulty');
    }

    if (spo2 < 92) {
      urgency = 'RED';
      reasons.push(`Critically low blood oxygen level (${spo2}%)`);
    } else if (spo2 <= 94) {
      if (urgency !== 'RED') urgency = 'ORANGE';
      reasons.push(`Borderline hypoxia (${spo2}%)`);
    }

    if (hasDifficultyBreathing && urgency !== 'RED') {
      urgency = 'ORANGE';
      reasons.push('Significant respiratory distress');
    }

    if (hasHighFeverWithStiffness) {
      urgency = 'ORANGE';
      reasons.push('High fever accompanied by neck stiffness / neurological symptoms');
    }

    if (pulse > 120 || pulse < 50) {
      if (urgency === 'GREEN') urgency = 'YELLOW';
      reasons.push(`Abnormal resting pulse rate (${pulse} bpm)`);
    }

    if (temp >= 102) {
      if (urgency === 'GREEN') urgency = 'YELLOW';
      reasons.push(`High body temperature (${temp} °F)`);
    }

    if (urgency === 'GREEN' && (duration === 'more_than_week' || hasSeverePain)) {
      urgency = 'YELLOW';
      reasons.push('Persistent symptoms requiring medical evaluation');
    }

    let recommendedFacilityType: TriageAssessment['recommendedFacilityType'] = 'PHC';
    let recommendedAction = '';

    if (urgency === 'RED') {
      recommendedFacilityType = 'DISTRICT_HOSPITAL';
      recommendedAction = 'IMMEDIATE EMERGENCY: Dial 108 or proceed straight to the nearest District Hospital / GGH Trauma Casualty.';
    } else if (urgency === 'ORANGE') {
      recommendedFacilityType = 'CHC';
      recommendedAction = 'URGENT ATTENTION: Visit Community Health Centre (CHC) or Area Hospital casualty within 1-2 hours.';
    } else if (urgency === 'YELLOW') {
      recommendedFacilityType = 'PHC';
      recommendedAction = 'SAME-DAY OPD: Visit your local Primary Health Centre (PHC) OPD or generate an instant digital queue token.';
    } else {
      recommendedFacilityType = 'TELECONSULTATION';
      recommendedAction = 'ROUTINE / TELECONSULT: Safe for remote teleconsultation or Jan Aushadhi generic pharmacist guidance.';
    }

    const symptomsList = [
      category,
      duration,
      hasSeverePain ? 'Severe Pain' : '',
      hasDifficultyBreathing ? 'Breathlessness' : '',
      hasAlteredConsciousness ? 'Altered Consciousness' : ''
    ].filter(Boolean);

    const saved = apiStore.saveTriageAssessment({
      patientName,
      patientAge,
      primarySymptom: category,
      symptomsList,
      symptoms: symptomsList,
      vitals: {
        spO2: spo2,
        spo2: `${spo2}%`,
        pulse: pulse,
        pulseRate: `${pulse} bpm`,
        temp: temp,
        temperature: `${temp} °F`
      },
      urgencyLevel: urgency,
      actionAdvice: recommendedAction,
      recommendedAction,
      recommendedFacilityType,
      emergencyEscalated: urgency === 'RED'
    });

    setAssessment(saved);
    setStep(4);
  };

  const handleGenerateToken = () => {
    setIsGeneratingToken(true);
    try {
      const dept = getRecommendedDept(category);
      const targetHosp = hospitals.find((h) => h.id === selectedHospitalId) || hospitals[0] || {
        id: 'hosp-1',
        name: 'Government General Hospital, Guntur'
      };
      const res = apiStore.issueQueueToken(targetHosp.id, dept, patientName);
      setIssuedToken({
        ...res,
        hospitalName: targetHosp.name,
        department: dept
      });
    } catch (err) {
      console.error('Error generating OPD token:', err);
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const handleNavigateToQueueBoard = () => {
    const dept = getRecommendedDept(category);
    const targetHospId = selectedHospitalId || 'hosp-1';
    const payload = {
      hospitalId: targetHospId,
      department: dept,
      patientName
    };
    if (onNavigate) {
      onNavigate('queue', payload);
    } else if (onNavigateToQueue) {
      onNavigateToQueue(payload);
    }
  };

  const handleStartTeleconsultation = () => {
    const symptomSummary = `${category.toUpperCase()} concern (${duration}). Vitals: SpO2 ${spo2}%, Pulse ${pulse} bpm, Temp ${temp} °F. Triage classification: ${assessment?.urgencyLevel || 'GREEN'}`;
    const payload = {
      hospitalId: selectedHospitalId || 'hosp-1',
      symptoms: symptomSummary,
      patientName,
      patientAge,
      vitals: {
        pulse,
        temp,
        spo2
      },
      startImmediateCall: true
    };
    if (onNavigate) {
      onNavigate('teleconsultation', payload);
    } else if (onNavigateToTeleconsult) {
      onNavigateToTeleconsult(payload);
    }
  };

  const handleEmergencyAmbulance = () => {
    const reason = `Triage Escalation (${assessment?.urgencyLevel || 'RED'}): ${category.toUpperCase()} - ${duration}`;
    if (onOpenEmergencySOS) {
      onOpenEmergencySOS(reason);
    } else if (onOpenEmergencyModal) {
      onOpenEmergencyModal(reason);
    }
  };

  const handleViewCasualty = () => {
    const hospId = selectedHospitalId || 'hosp-1';
    if (onNavigate) {
      onNavigate('details', { hospitalId: hospId });
    } else if (onNavigateToHospital) {
      onNavigateToHospital(hospId);
    }
  };

  const resetForm = () => {
    setStep(1);
    setAssessment(null);
    setIssuedToken(null);
    setHasSeverePain(false);
    setHasDifficultyBreathing(false);
    setHasAlteredConsciousness(false);
    setHasUncontrolledBleeding(false);
    setHasHighFeverWithStiffness(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-xs font-semibold mb-2">
          <Activity className="w-3.5 h-3.5 text-indigo-300" />
          <span>Clinical Manchester Protocol / Emergency Severity Index</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          {t.digitalTriage}
        </h1>
        <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
          {t.digitalTriageDesc}. Quick 60-second questionnaire assesses symptom severity and directs you to the right level of care (108 Ambulance, CHC Casualty, OPD Token or Teleconsultation).
        </p>
      </div>

      {/* Main Questionnaire Box */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        {step < 4 && (
          <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Triage Step {step} of 3
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`w-8 h-1.5 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-slate-200'}`}></span>
              <span className={`w-8 h-1.5 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`}></span>
              <span className={`w-8 h-1.5 rounded-full ${step >= 3 ? 'bg-blue-600' : 'bg-slate-200'}`}></span>
            </div>
          </div>
        )}

        {/* STEP 1: Category & Duration */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-slate-900">What is the primary concern or symptom?</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                { id: 'chest', label: 'Chest Pain / Pressure / Palpitations', desc: 'Discomfort in chest, left arm, or neck' },
                { id: 'breathing', label: 'Shortness of Breath / Wheezing', desc: 'Difficulty inhaling, choking, or gasping' },
                { id: 'fever', label: 'High Fever / Chills / Dengue-like', desc: 'Elevated temperature, severe body ache' },
                { id: 'neuro', label: 'Headache / Dizziness / Weakness', desc: 'Sudden weakness in arm/leg, slurred speech' },
                { id: 'abdomen', label: 'Severe Abdominal Pain / Vomiting', desc: 'Acute belly cramps, dehydration' },
                { id: 'maternal', label: 'Maternal / Labour / Pregnancy Pain', desc: 'Bleeding, contractions, baby movements slowed' },
                { id: 'general', label: 'Cough / Cold / Minor Symptoms', desc: 'Runny nose, mild throat irritation, skin rash' }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(item.id)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    category === item.id
                      ? 'border-blue-600 bg-blue-50/70 text-blue-950 font-bold ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 text-slate-800'
                  }`}
                >
                  <span className="block font-bold text-sm">{item.label}</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">{item.desc}</span>
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 text-xs">
              <label className="block font-bold text-slate-700 mb-1.5">How long have you had this symptom?</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold"
              >
                <option value="few_minutes">Started in the last 15-30 minutes (Sudden acute onset)</option>
                <option value="few_hours">Last few hours (1 to 6 hours)</option>
                <option value="today">Since this morning (1 day)</option>
                <option value="few_days">Past 2 to 4 days</option>
                <option value="more_than_week">More than a week (Chronic / Subacute)</option>
              </select>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <span>Continue to Red-Flag Check</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Emergency Red Flags */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Critical Red-Flag Symptom Checklist</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Check any of the following that apply right now. These indicate immediate life-threat.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              {[
                {
                  state: hasSeverePain,
                  setter: setHasSeverePain,
                  title: 'Crushing or unbearable pain',
                  desc: 'Patient rates pain 8-10/10, radiating to arm, jaw, or shoulder'
                },
                {
                  state: hasDifficultyBreathing,
                  setter: setHasDifficultyBreathing,
                  title: 'Cannot speak a full sentence without gasping',
                  desc: 'Severe breathlessness, lips turning blue/pale, wheezing at rest'
                },
                {
                  state: hasAlteredConsciousness,
                  setter: setHasAlteredConsciousness,
                  title: 'Confusion, fainting, or slurred speech',
                  desc: 'Loss of consciousness, unresponsive, facial drooping (Stroke FAST rule)'
                },
                {
                  state: hasUncontrolledBleeding,
                  setter: setHasUncontrolledBleeding,
                  title: 'Continuous heavy bleeding or major trauma',
                  desc: 'Bleeding that will not stop after 5 minutes of direct firm pressure'
                },
                {
                  state: hasHighFeverWithStiffness,
                  setter: setHasHighFeverWithStiffness,
                  title: 'High fever with severe neck stiffness or rash',
                  desc: 'Cannot touch chin to chest, extreme sensitivity to light (meningitis flag)'
                }
              ].map((rf, idx) => (
                <label
                  key={idx}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-colors cursor-pointer ${
                    rf.state ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={rf.state}
                    onChange={(e) => rf.setter(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">{rf.title}</span>
                    <span className="text-[11px] text-slate-500">{rf.desc}</span>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <span>Continue to Vitals Input</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Vitals if known */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Patient Vitals (Optional / Estimated)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                If you or an ASHA worker have a pulse oximeter or thermometer, enter the readings below.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-700 block">Pulse Oximeter (SpO2)</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={60}
                    max={100}
                    value={spo2}
                    onChange={(e) => setSpo2(Number(e.target.value))}
                    className="w-20 px-3 py-2 text-base font-bold rounded-xl border border-slate-300 bg-white"
                  />
                  <span className="text-slate-500 font-semibold">%</span>
                </div>
                <span className="text-[10px] text-slate-400 block">Normal is 95% - 100%</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-700 block">Pulse Rate</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={40}
                    max={200}
                    value={pulse}
                    onChange={(e) => setPulse(Number(e.target.value))}
                    className="w-20 px-3 py-2 text-base font-bold rounded-xl border border-slate-300 bg-white"
                  />
                  <span className="text-slate-500 font-semibold">bpm</span>
                </div>
                <span className="text-[10px] text-slate-400 block">Normal is 60 - 100 bpm</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-700 block">Body Temperature</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min={94}
                    max={106}
                    value={temp}
                    onChange={(e) => setTemp(Number(e.target.value))}
                    className="w-20 px-3 py-2 text-base font-bold rounded-xl border border-slate-300 bg-white"
                  />
                  <span className="text-slate-500 font-semibold">°F</span>
                </div>
                <span className="text-[10px] text-slate-400 block">Normal is 98.6 °F</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Back
              </button>
              <button
                type="button"
                onClick={evaluateTriage}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Activity className="w-4 h-4" />
                <span>Calculate Triage Result</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Triage Classification Result */}
        {step === 4 && assessment && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Color-coded result card */}
            <div
              className={`rounded-3xl p-6 border ${
                assessment.urgencyLevel === 'RED'
                  ? 'bg-rose-50 border-rose-300 text-rose-950'
                  : assessment.urgencyLevel === 'ORANGE'
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : assessment.urgencyLevel === 'YELLOW'
                  ? 'bg-blue-50 border-blue-300 text-blue-950'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-950'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4 border-slate-200/60">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-lg ${
                      assessment.urgencyLevel === 'RED'
                        ? 'bg-rose-600 animate-pulse'
                        : assessment.urgencyLevel === 'ORANGE'
                        ? 'bg-amber-600'
                        : assessment.urgencyLevel === 'YELLOW'
                        ? 'bg-blue-600'
                        : 'bg-emerald-600'
                    }`}
                  >
                    {assessment.urgencyLevel === 'RED'
                      ? 'L1'
                      : assessment.urgencyLevel === 'ORANGE'
                      ? 'L2'
                      : assessment.urgencyLevel === 'YELLOW'
                      ? 'L3'
                      : 'L4'}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 block">
                      Triage Category
                    </span>
                    <h3 className="text-xl font-extrabold">
                      {assessment.urgencyLevel === 'RED' && 'RED: Immediate Resuscitation / Trauma Alert'}
                      {assessment.urgencyLevel === 'ORANGE' && 'ORANGE: Emergency / Urgent Care Needed'}
                      {assessment.urgencyLevel === 'YELLOW' && 'YELLOW: Standard OPD Consultation Needed'}
                      {assessment.urgencyLevel === 'GREEN' && 'GREEN: Mild / Routine Teleconsultation'}
                    </h3>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold px-3 py-1 bg-white/80 rounded-full border border-current">
                  Assessment #{assessment.id}
                </span>
              </div>

              <div className="py-4 space-y-3 text-xs">
                <p className="font-bold text-sm leading-relaxed">{assessment.recommendedAction}</p>
                <div className="flex flex-wrap gap-4 text-xs">
                  <span className="opacity-90">
                    Recommended Facility:{' '}
                    <strong>
                      {assessment.recommendedFacilityType === 'DISTRICT_HOSPITAL' && 'Tertiary / District Hospital (GGH)'}
                      {assessment.recommendedFacilityType === 'CHC' && 'Community Health Centre (CHC)'}
                      {assessment.recommendedFacilityType === 'PHC' && 'Primary Health Centre (PHC)'}
                      {assessment.recommendedFacilityType === 'TELECONSULTATION' && 'eSanjeevani Teleconsultation / Jan Aushadhi'}
                    </strong>
                  </span>
                  <span className="opacity-90">
                    Chamber Assignment: <strong>{getRecommendedDept(category)}</strong>
                  </span>
                </div>

                {/* Facility Selector for OPD Token / Teleconsult */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-2">
                  <label className="font-bold text-[11px] opacity-80 whitespace-nowrap">
                    Target Government Facility:
                  </label>
                  <select
                    value={selectedHospitalId}
                    onChange={(e) => setSelectedHospitalId(e.target.value)}
                    className="bg-white text-slate-900 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold max-w-sm"
                  >
                    {hospitals.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons based on urgency */}
              <div className="pt-4 border-t border-slate-200/60 flex flex-wrap items-center gap-3">
                {assessment.urgencyLevel === 'RED' && (
                  <button
                    type="button"
                    onClick={handleEmergencyAmbulance}
                    className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
                  >
                    <PhoneCall className="w-4 h-4 animate-bounce" />
                    <span>Trigger 108 Emergency Ambulance SOS</span>
                  </button>
                )}

                {assessment.urgencyLevel === 'ORANGE' && (
                  <>
                    <button
                      type="button"
                      onClick={handleEmergencyAmbulance}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>Call 108 Ambulance</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleViewCasualty}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95"
                    >
                      <Building2 className="w-4 h-4" />
                      <span>View Casualty Trauma Centre</span>
                    </button>
                  </>
                )}

                {/* Primary actions for YELLOW & GREEN, and secondary for ORANGE */}
                <button
                  type="button"
                  onClick={handleGenerateToken}
                  disabled={isGeneratingToken}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-xs transition-transform active:scale-95"
                >
                  <Ticket className="w-4 h-4" />
                  <span>{isGeneratingToken ? 'Generating Token...' : 'Generate OPD Queue Token'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartTeleconsultation}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-xs transition-transform active:scale-95"
                >
                  <Video className="w-4 h-4" />
                  <span>Start Teleconsultation</span>
                </button>

                <button
                  type="button"
                  onClick={handleNavigateToQueueBoard}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Clock className="w-4 h-4" />
                  <span>View Live Queue Board</span>
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 cursor-pointer ml-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Start New Assessment</span>
                </button>
              </div>
            </div>

            {/* Generated OPD Token Pass Display Card */}
            {issuedToken && (
              <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white p-6 sm:p-7 rounded-3xl shadow-xl border border-teal-500/30 animate-in slide-in-from-top-4 duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-teal-500/30">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
                      <Ticket className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-bold tracking-wide uppercase">
                        <CheckCircle2 className="w-3 h-3 text-teal-400" />
                        Digital Token Generated
                      </div>
                      <h4 className="text-lg font-black text-white mt-1">
                        OPD Consultation Pass
                      </h4>
                    </div>
                  </div>

                  <div className="text-left sm:text-right bg-black/30 px-4 py-2 rounded-2xl border border-white/10">
                    <span className="text-[10px] text-teal-200 uppercase tracking-wider block font-bold">
                      Your Token Number
                    </span>
                    <span className="text-3xl font-black text-amber-400 font-mono tracking-wider">
                      {issuedToken.tokenCode}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-5 border-b border-teal-500/20 text-xs">
                  <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Facility</span>
                    <span className="font-bold text-slate-100 mt-0.5 block text-sm">{issuedToken.hospitalName}</span>
                  </div>
                  <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Department & Counter</span>
                    <span className="font-bold text-teal-300 mt-0.5 block text-sm">{issuedToken.department}</span>
                    <span className="text-[11px] text-slate-300 block">{issuedToken.roomNumber}</span>
                  </div>
                  <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Estimated Waiting Time</span>
                    <span className="font-black text-amber-300 text-lg mt-0.5 block">
                      ~{issuedToken.estimatedWaitMins} Minutes
                    </span>
                    <span className="text-[10px] text-slate-400 block">Token #{issuedToken.tokenNumber} in queue today</span>
                  </div>
                </div>

                <div className="pt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-teal-200 text-xs">
                    <QrCode className="w-4 h-4 text-teal-400" />
                    <span>Saved to device offline storage. Accessible in low-connectivity mode.</span>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Slip</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNavigateToQueueBoard}
                      className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <span>Open Live Queue Board</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
