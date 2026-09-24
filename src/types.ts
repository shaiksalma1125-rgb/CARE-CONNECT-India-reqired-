export type UserRole = 'CITIZEN' | 'HOSPITAL_STAFF' | 'HOSPITAL_ADMIN' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  location: string;
  district: string;
  state: string;
  hospitalId?: string; // Connected hospital for HOSPITAL_ADMIN and HOSPITAL_STAFF
  createdAt: string;
}

export type HospitalType =
  | 'Government Hospital'
  | 'District Hospital'
  | 'Community Health Centre (CHC)'
  | 'Primary Health Centre (PHC)'
  | 'Area Hospital'
  | 'Sub-District Hospital'
  | 'Clinic'
  | 'Diagnostic Centre'
  | 'Pharmacy'
  | 'Blood Bank';

export interface Hospital {
  id: string;
  name: string;
  address: string;
  village: string;
  mandal: string;
  district: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  phone: string;
  emergencyPhone: string;
  openingHours: string;
  hospitalType: HospitalType;
  facilities: string[];
  rating: number; // average quality score (e.g. 4.3)
  totalReviews: number;
  emergencyAvailable: boolean;
  isOpen: boolean;
}

export interface Doctor {
  id: string;
  hospitalId: string;
  name: string;
  specialization: string;
  qualification: string;
  experience: number; // years
  consultationFee: number; // 0 for government
  availabilityStatus: 'AVAILABLE' | 'IN_CONSULTATION' | 'ON_LEAVE';
  photoUrl?: string;
  availableDays: string[];
  timeSlots: string[];
  workingHours?: { start: string; end: string };
  consultationDurationMinutes?: number;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface HospitalService {
  id: string;
  hospitalId: string;
  serviceId: string;
  serviceName: string;
  category: string;
  available: boolean;
  waitingTime: string;
  description: string;
  updatedAt: string;
}

export interface Medicine {
  id: string;
  name: string;
  category: string;
  description: string;
}

export interface MedicineStock {
  id: string;
  hospitalId: string;
  medicineId: string;
  medicineName: string;
  category: string;
  quantity: number;
  minimumThreshold: number;
  status: 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  updatedAt: string;
}

export type AppointmentStatus = 'BOOKED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface Appointment {
  id: string;
  appointmentId: string; // e.g. CC-2026-894210
  tokenNumber?: string;  // e.g. TK-42
  userId: string;
  hospitalId: string;
  hospitalName: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  patientPhone?: string;
  appointmentDate: string;
  appointmentTime: string;
  reason: string;
  status: AppointmentStatus;
  createdAt: string;
}

export interface Feedback {
  id: string;
  userId: string;
  userName: string;
  hospitalId: string;
  hospitalName: string;
  appointmentId?: string;
  doctorRating: number;
  waitingRating: number;
  staffRating: number;
  cleanlinessRating: number;
  medicineRating: number;
  serviceRating: number;
  overallRating: number;
  comment: string;
  createdAt: string;
}

export type ComplaintCategory =
  | 'Doctor unavailable'
  | 'Medicine unavailable'
  | 'Healthcare service unavailable'
  | 'Long waiting time'
  | 'Staff behavior'
  | 'Cleanliness'
  | 'Infrastructure'
  | 'Emergency service issue'
  | 'Other';

export type ComplaintStatus =
  | 'SUBMITTED'
  | 'UNDER REVIEW'
  | 'IN PROGRESS'
  | 'RESOLVED'
  | 'REJECTED';

export interface Complaint {
  id: string;
  complaintId: string; // e.g. CMP202600123
  userId: string;
  userName: string;
  hospitalId: string;
  hospitalName: string;
  appointmentId?: string;
  category: ComplaintCategory;
  description: string;
  status: ComplaintStatus;
  resolutionRemarks?: string;
  createdAt: string;
  updatedAt: string;
}

export type LanguageCode = 'en' | 'te' | 'hi';

export interface Teleconsultation {
  id: string;
  teleconsultId: string; // e.g. TC-2026-8921
  patientName: string;
  patientPhone: string;
  patientAge: number;
  patientGender: string;
  assistedByAsha: boolean;
  ashaWorkerName?: string;
  ashaWorkerPhone?: string;
  hospitalId: string;
  hospitalName: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  symptoms: string;
  vitals: {
    bp?: string;
    bloodPressure?: string;
    pulse?: number;
    pulseRate?: number | string;
    temp?: number;
    spO2?: number;
    bloodSugar?: number;
  };
  status: 'WAITING' | 'IN_CALL' | 'COMPLETED' | 'CANCELLED';
  prescription?: {
    diagnosis: string;
    medicines: Array<{ name: string; dosage: string; duration: string; janAushadhiAvailable?: boolean }>;
    advice: string;
    instructions?: string;
    issuedBy?: string;
  };
  scheduledTime: string;
  createdAt: string;
}

export type TriageUrgency = 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN';

export interface TriageAssessment {
  id: string;
  patientName: string;
  patientAge?: number;
  urgencyLevel: TriageUrgency;
  primarySymptom: string;
  symptoms?: string[];
  symptomsList: string[];
  vitals: {
    bp?: string;
    pulse?: number | string;
    pulseRate?: number | string;
    temp?: number | string;
    temperature?: number | string;
    spO2?: number | string;
    spo2?: number | string;
  };
  recommendedFacilityType: string;
  actionAdvice: string;
  recommendedAction?: string;
  emergencyEscalated: boolean;
  createdAt: string;
}

export interface HealthRecord {
  id: string;
  userId: string;
  abhaNumber: string; // e.g. 91-2026-8812-4029
  abhaAddress: string; // e.g. salma@abdm
  recordType: 'PRESCRIPTION' | 'DIAGNOSTIC_REPORT' | 'VITAL_LOG' | 'IMMUNIZATION' | 'DISCHARGE_SUMMARY';
  title: string;
  facilityName: string;
  doctorName?: string;
  date: string;
  summary: string;
  details?: Record<string, any>;
  fileUrl?: string;
}

export type ReferralStatus =
  | 'Pending'
  | 'Accepted'
  | 'In Progress'
  | 'Completed'
  | 'Rejected'
  | 'INITIATED'
  | 'ACCEPTED'
  | 'EN_ROUTE'
  | 'ADMITTED'
  | 'COMPLETED'
  | 'REJECTED';

export interface PatientReferral {
  id: string;
  referralId: string; // e.g. REF-2026-NTR-0842
  patientId?: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  patientPhone: string;
  patientEmail?: string;
  fromHospitalId: string;
  fromHospitalName: string;
  toHospitalId: string;
  toHospitalName: string;
  department: string;
  doctorName?: string;
  specialist?: string;
  referredByDoctor?: string;
  doctorSpecialist?: string;
  reason: string;
  referralReason?: string;
  clinicalSummary?: string;
  priority: 'EMERGENCY' | 'URGENT' | 'ROUTINE';
  transportRequired: '108_AMBULANCE' | 'GOVT_PATIENT_VAN' | 'SELF_TRANSPORT' | string;
  transportMode?: string;
  status: ReferralStatus;
  referralDate: string;
  qrCodeToken: string;
  notes?: string;
  updatedAt?: string;
}

export interface DiagnosticService {
  id: string;
  hospitalId: string;
  name: string;
  category: 'Biochemistry' | 'Radiology' | 'Pathology' | 'Microbiology' | 'Cardiology';
  equipmentStatus: 'OPERATIONAL' | 'CALIBRATION' | 'MAINTENANCE';
  sampleTimings: string;
  reportTurnaroundHours: number;
  isFreeUnderNHM: boolean;
  price: number;
  slotsAvailableToday: number;
  nextAvailableSlot: string;
}

export interface OPDQueueInfo {
  id: string;
  hospitalId: string;
  department: string;
  doctorName: string;
  currentServingToken: string;
  currentTokenNumber: number;
  totalTokensIssued: number;
  avgWaitTimePerPatientMinutes: number;
  status: 'CALLING' | 'CONSULTING' | 'LUNCH_BREAK' | 'CLOSED';
  roomNumber: string;
  lastUpdated: string;
}

export type HighRiskCategory =
  | 'CHRONIC_DISEASE'
  | 'MATERNAL'
  | 'CHILD'
  | 'OTHER_HIGH_RISK';

export type FollowUpType =
  | 'CHECKUP'
  | 'TEST_DIAGNOSTIC_REVIEW'
  | 'MEDICATION_REVIEW'
  | 'SPECIALIST_REVIEW';

export type FollowUpStatus =
  | 'SCHEDULED'
  | 'CONTACTED'
  | 'COMPLETED'
  | 'MISSED';

export interface FollowUpOutcome {
  id: string;
  recordedAt: string;
  recordedBy: string;
  status: FollowUpStatus;
  notes: string;
  vitals?: string;
  nextAction?: string;
}

export interface HighRiskPatient {
  id: string;
  patientId?: string; // Unique patient ID (matching User.id)
  patientName: string;
  age?: number;
  patientAge?: number;
  gender?: string;
  phone?: string;
  patientPhone?: string;
  patientEmail?: string;
  hospitalId: string;
  hospitalName: string;
  village?: string;

  // High-Risk Clinical Specifications
  isHighRisk?: boolean;
  riskCategory?: HighRiskCategory;
  conditionType?: 'HIGH_RISK_PREGNANCY' | 'SEVERE_HYPERTENSION' | 'UNCONTROLLED_DIABETES' | 'INFANT_MALNUTRITION' | string;
  riskType?: string;
  condition?: string;
  riskLevel?: 'CRITICAL' | 'HIGH' | 'MODERATE';

  // Follow-up Management Properties
  followUpType?: FollowUpType;
  assignedTo?: string; // Responsible doctor or health worker
  assignedRole?: string; // e.g. Doctor, ASHA Worker, Staff Nurse
  nextFollowUpDate?: string; // YYYY-MM-DD
  nextFollowUpDueDate?: string;
  instruction?: string; // Short follow-up instruction
  status?: FollowUpStatus;
  outcomes?: FollowUpOutcome[];
  urgentEscalation?: boolean;
  escalationReason?: string;

  lastCheckupDate?: string;
  ashaWorker?: string;
  ashaWorkerName?: string;
  ashaPhone?: string;
  ashaWorkerPhone?: string;
  reminderSent?: boolean;
  reminderStatus?: 'SENT' | 'DELIVERED' | 'ACKNOWLEDGED' | 'MISSED';
  lastVitalsRecorded?: string;
  followUpActionNotes?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmergencyIncident {
  id: string;
  callerName: string;
  callerPhone: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  emergencyType: 'CARDIAC_ARREST' | 'TRAUMA_ROAD_ACCIDENT' | 'STROKE' | 'SEVERE_RESPIRATORY' | 'MATERNAL_EMERGENCY';
  assignedAmbulanceId: string;
  ambulanceVehicleNumber: string;
  ambulanceDriverPhone: string;
  etaMinutes: number;
  targetHospitalId: string;
  targetHospitalName: string;
  traumaBedAlertDispatched: boolean;
  status: 'DISPATCHED' | 'EN_ROUTE' | 'ON_SCENE' | 'TRANSPORTING' | 'REACHED_HOSPITAL';
  createdAt: string;
}

export interface FacilityQualityScore {
  hospitalId: string;
  hospitalName: string;
  kayakalpScore: number; // e.g. 92/100
  nqasCertified: boolean;
  opdAvgWaitMins: number;
  medicineAvailabilityPercent: number;
  diagnosticUptimePercent: number;
  cleanlinessIndex: number; // 1-5
  doctorPresenceIndex: number; // 1-5
  citizenResolutionPercent: number;
  lastAuditDate: string;
}

export type OfflineTokenSyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED';
export type OfflineTokenSource = 'WEB_OFFLINE' | 'SMS' | 'USSD';
export type OfflineTokenCallStatus = 'WAITING' | 'CALLING' | 'SERVED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';

export interface OfflineOPDToken {
  id: string;
  tokenCode: string; // e.g. TK-15
  tokenNumber: number;
  hospitalId: string;
  hospitalName: string;
  department: string;
  patientName: string;
  patientPhone?: string;
  roomNumber: string;
  estimatedWaitMins: number;
  issuedAt: string;
  date: string;
  syncStatus: OfflineTokenSyncStatus;
  source: OfflineTokenSource;
  status: OfflineTokenCallStatus;
  syncedAt?: string;
}
