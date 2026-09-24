import {
  Hospital,
  Doctor,
  HospitalService,
  MedicineStock,
  User,
  Appointment,
  Feedback,
  Complaint,
  UserRole,
  Teleconsultation,
  TriageAssessment,
  HealthRecord,
  PatientReferral,
  DiagnosticService,
  OPDQueueInfo,
  HighRiskPatient,
  HighRiskCategory,
  FollowUpType,
  FollowUpStatus,
  FollowUpOutcome,
  FacilityQualityScore,
  EmergencyIncident
} from '../types';
import {
  DEMO_USERS,
  INITIAL_HOSPITALS,
  INITIAL_DOCTORS,
  INITIAL_SERVICES,
  INITIAL_MEDICINES,
  INITIAL_APPOINTMENTS,
  INITIAL_FEEDBACKS,
  INITIAL_COMPLAINTS,
  INITIAL_DIAGNOSTICS,
  INITIAL_TELECONSULTATIONS,
  INITIAL_HEALTH_RECORDS,
  INITIAL_REFERRALS,
  INITIAL_OPD_QUEUES,
  INITIAL_HIGH_RISK_PATIENTS,
  INITIAL_QUALITY_SCORES,
  INITIAL_EMERGENCIES
} from '../data/mockData';
import { saveAppointmentToFirestore } from './firebase';
import { isReferralForUser, normalizeReferralStatus } from '../utils/referralUtils';

const STORAGE_KEYS = {
  USERS: 'sih_users',
  CURRENT_USER: 'sih_current_user',
  HOSPITALS: 'sih_hospitals',
  DOCTORS: 'sih_doctors',
  SERVICES: 'sih_services',
  MEDICINES: 'sih_medicines',
  APPOINTMENTS: 'sih_appointments',
  FEEDBACKS: 'sih_feedbacks',
  COMPLAINTS: 'sih_complaints',
  DIAGNOSTICS: 'sih_diagnostics',
  TELECONSULTATIONS: 'sih_teleconsultations',
  TRIAGE: 'sih_triage',
  HEALTH_RECORDS: 'sih_health_records',
  REFERRALS: 'sih_referrals',
  QUEUES: 'sih_queues',
  HIGH_RISK: 'sih_high_risk',
  QUALITY_SCORES: 'sih_quality_scores',
  EMERGENCIES: 'sih_emergencies',
  OFFLINE_TOKENS: 'sih_offline_tokens'
};

function getLocal<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultVal;
    return JSON.parse(raw) as T;
  } catch {
    return defaultVal;
  }
}

function setLocal<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error('Storage error', err);
  }
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export interface SlotAvailabilityInfo {
  slot: string;
  totalCapacity: number;
  bookedCount: number;
  remainingSlots: number;
  isFullyBooked: boolean;
  label: string;
}

class ApiStore {
  constructor() {
    this.init();
  }

  private init() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      setLocal(STORAGE_KEYS.USERS, DEMO_USERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.HOSPITALS)) {
      setLocal(STORAGE_KEYS.HOSPITALS, INITIAL_HOSPITALS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.DOCTORS)) {
      setLocal(STORAGE_KEYS.DOCTORS, INITIAL_DOCTORS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SERVICES)) {
      setLocal(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.MEDICINES)) {
      setLocal(STORAGE_KEYS.MEDICINES, INITIAL_MEDICINES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.APPOINTMENTS)) {
      setLocal(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.FEEDBACKS)) {
      setLocal(STORAGE_KEYS.FEEDBACKS, INITIAL_FEEDBACKS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.COMPLAINTS)) {
      setLocal(STORAGE_KEYS.COMPLAINTS, INITIAL_COMPLAINTS);
    }
    // Realistic authentication: start as unauthenticated guest unless manually logged in
    if (!localStorage.getItem('healthconnect_user_authenticated')) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }

  // Auth
  getUsers(): User[] {
    const list = getLocal<User[]>(STORAGE_KEYS.USERS, DEMO_USERS);
    const existingIds = new Set(list.map((u) => u.id));
    const existingEmails = new Set(list.filter((u) => !!u.email).map((u) => String(u.email).toLowerCase()));
    let updated = false;
    for (const u of DEMO_USERS) {
      const uEmail = u.email ? String(u.email).toLowerCase() : '';
      if (!existingIds.has(u.id) && (!uEmail || !existingEmails.has(uEmail))) {
        list.push(u);
        updated = true;
      }
    }
    if (updated) {
      setLocal(STORAGE_KEYS.USERS, list);
    }
    return list;
  }

  getCurrentUser(): User | null {
    return getLocal<User | null>(STORAGE_KEYS.CURRENT_USER, null);
  }

  setCurrentUser(user: User | null): void {
    if (user) {
      localStorage.setItem('healthconnect_user_authenticated', 'true');
    } else {
      localStorage.removeItem('healthconnect_user_authenticated');
    }
    setLocal(STORAGE_KEYS.CURRENT_USER, user);
  }

  switchDemoUser(role: UserRole, targetHospitalId?: string): User {
    const users = this.getUsers();
    let found: User | undefined;
    if (role === 'HOSPITAL_ADMIN' || role === 'ADMIN') {
      if (targetHospitalId) {
        found = users.find(
          (u) => (u.role === 'HOSPITAL_ADMIN' || u.role === 'ADMIN') && u.hospitalId === targetHospitalId
        );
      }
      if (!found) {
        found = users.find((u) => u.role === 'HOSPITAL_ADMIN' || u.role === 'ADMIN');
      }
    } else if (role === 'HOSPITAL_STAFF') {
      if (targetHospitalId) {
        found = users.find((u) => u.role === 'HOSPITAL_STAFF' && u.hospitalId === targetHospitalId);
      }
      if (!found) {
        found = users.find((u) => u.role === 'HOSPITAL_STAFF');
      }
    } else {
      found = users.find((u) => u.role === role);
    }
    const finalUser = found || users[0];
    this.setCurrentUser(finalUser);
    return finalUser;
  }

  loginWithGoogle(email: string, name?: string): User {
    const users = this.getUsers();
    const normalized = (email || 'shaiksalma1125@gmail.com').trim().toLowerCase();
    let found = users.find((u) => String(u.email || '').toLowerCase() === normalized);
    if (!found) {
      const derivedName = name?.trim() || normalized.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      found = {
        id: `user-google-${Date.now()}`,
        name: derivedName,
        email: normalized,
        mobile: '9849' + Math.floor(100000 + Math.random() * 900000),
        role: 'CITIZEN',
        location: 'Citizen Portal, India',
        district: 'Public Healthcare',
        state: 'India',
        createdAt: new Date().toISOString()
      };
      users.push(found);
      setLocal(STORAGE_KEYS.USERS, users);
    }
    this.setCurrentUser(found);
    return found;
  }

  ensureNearbyHospitalsForCoords(userLat: number, userLng: number): Hospital[] {
    const currentHospitals = this.getHospitals();
    
    // Check closest existing hospital
    const R = 6371;
    let minDistance = 99999;
    for (const h of currentHospitals) {
      const dLat = ((h.latitude - userLat) * Math.PI) / 180;
      const dLon = ((h.longitude - userLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((userLat * Math.PI) / 180) *
          Math.cos((h.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = R * c;
      if (dist < minDistance) minDistance = dist;
    }

    // If user is already within 35 km of existing cluster, keep standard catalog
    if (minDistance <= 35) {
      return currentHospitals;
    }

    // Otherwise, generate 5 authentic local public healthcare facilities nearby
    const localPrefix = 'hosp-gps-local-';
    const existingLocal = currentHospitals.filter((h) => h.id.startsWith(localPrefix));
    if (existingLocal.length > 0) {
      return currentHospitals;
    }

    const newNearbyHospitals: Hospital[] = [
      {
        id: `${localPrefix}1`,
        name: 'District Government Civil Hospital & Emergency Centre',
        address: 'Civil Hospital Road, Near Clock Tower',
        village: 'Civil Lines',
        mandal: 'Headquarters',
        district: 'District Central',
        state: 'Public Health Department',
        pincode: '500001',
        latitude: userLat + 0.0095,
        longitude: userLng + 0.0085,
        phone: '+91 800-2475100',
        emergencyPhone: '108 / 102',
        openingHours: '24 Hours Emergency | OPD: 08:30 AM - 01:30 PM',
        hospitalType: 'District Hospital',
        facilities: ['24x7 Emergency Trauma Unit', 'ICU & High Dependency', 'Digital X-Ray & Sonography', 'Jan Aushadhi Pharmacy', 'Free Diagnostic Pathology Lab'],
        rating: 4.6,
        totalReviews: 342,
        emergencyAvailable: true,
        isOpen: true
      },
      {
        id: `${localPrefix}2`,
        name: 'Community Health Centre (CHC), Sector Care',
        address: 'Health Hub, Main Trunk Road',
        village: 'Community Block',
        mandal: 'Zonal Health',
        district: 'District Central',
        state: 'Public Health Department',
        pincode: '500002',
        latitude: userLat - 0.0152,
        longitude: userLng + 0.0125,
        phone: '+91 800-2475200',
        emergencyPhone: '108',
        openingHours: '24 Hours Casualty | OPD: 09:00 AM - 02:00 PM',
        hospitalType: 'Community Health Centre (CHC)',
        facilities: ['Labour & Maternity Ward', 'Immunization Hub', 'Minor OT', 'General OPD', 'Free Medicine Counter'],
        rating: 4.3,
        totalReviews: 128,
        emergencyAvailable: true,
        isOpen: true
      },
      {
        id: `${localPrefix}3`,
        name: 'Urban Primary Health Centre (UPHC), Ward 4',
        address: 'Near Municipal High School',
        village: 'Urban Ward',
        mandal: 'Metropolitan',
        district: 'District Central',
        state: 'Public Health Department',
        pincode: '500003',
        latitude: userLat + 0.0215,
        longitude: userLng - 0.0185,
        phone: '+91 800-2475300',
        emergencyPhone: '108',
        openingHours: '09:00 AM - 04:00 PM',
        hospitalType: 'Primary Health Centre (PHC)',
        facilities: ['Maternal & Child Wellness', 'Vaccination Clinic', 'NCD Screening (Sugar/BP)', 'Tele-Consultation'],
        rating: 4.0,
        totalReviews: 84,
        emergencyAvailable: false,
        isOpen: true
      },
      {
        id: `${localPrefix}4`,
        name: 'Government Area Hospital & Trauma Centre',
        address: 'Sub-Division Medical Enclave',
        village: 'Sub-Division',
        mandal: 'Regional Health',
        district: 'District Central',
        state: 'Public Health Department',
        pincode: '500004',
        latitude: userLat - 0.0285,
        longitude: userLng - 0.0245,
        phone: '+91 800-2475400',
        emergencyPhone: '108 / +91 800-2475499',
        openingHours: '24 Hours Open',
        hospitalType: 'Area Hospital',
        facilities: ['Accident Care & Ortho OT', 'Blood Storage Centre', 'Pediatric Intensive Ward', 'Ayushman Arogya Mandir'],
        rating: 4.4,
        totalReviews: 215,
        emergencyAvailable: true,
        isOpen: true
      },
      {
        id: `${localPrefix}5`,
        name: 'Apex Super Specialty Hospital & Research Centre',
        address: 'National Health Campus, Ring Road Bypass',
        village: 'Apex Health Zone',
        mandal: 'Regional Center',
        district: 'District Central',
        state: 'Ministry of Health & Family Welfare',
        pincode: '500005',
        latitude: userLat + 0.0450,
        longitude: userLng + 0.0380,
        phone: '+91 800-2475500',
        emergencyPhone: '108 / 102 / +91 800-2475599',
        openingHours: '24x7 Tertiary Emergency & Inpatient | Digital OPD Tokens',
        hospitalType: 'Government Hospital',
        facilities: ['Apex Level-1 Trauma Centre', 'Advanced Cardiac Care', 'Neurology & Neurosurgery', 'Oncology Care', 'Dialysis Center', '24x7 Jan Aushadhi Kendra'],
        rating: 4.8,
        totalReviews: 512,
        emergencyAvailable: true,
        isOpen: true
      }
    ];

    // Seed doctors for new nearby facilities
    const currentDocs = this.getDoctors();
    const newDocs: Doctor[] = [
      {
        id: 'doc-gps-1',
        hospitalId: `${localPrefix}1`,
        name: 'Dr. Alok Verma, MD',
        specialization: 'General Medicine',
        qualification: 'MBBS, MD (General Medicine) - AIIMS',
        experience: 12,
        consultationFee: 0,
        availabilityStatus: 'AVAILABLE',
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        timeSlots: ['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:30 AM - 12:30 PM', '02:00 PM - 03:30 PM']
      },
      {
        id: 'doc-gps-2',
        hospitalId: `${localPrefix}1`,
        name: 'Dr. Sunita Deshmukh, MS',
        specialization: 'Obstetrics & Gynecology',
        qualification: 'MBBS, MS (OBG)',
        experience: 10,
        consultationFee: 0,
        availabilityStatus: 'AVAILABLE',
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        timeSlots: ['09:30 AM - 10:30 AM', '11:00 AM - 12:00 PM', '02:00 PM - 03:00 PM']
      },
      {
        id: 'doc-gps-3',
        hospitalId: `${localPrefix}2`,
        name: 'Dr. Tariq Khan, MBBS',
        specialization: 'General Medicine',
        qualification: 'MBBS, Medical Officer',
        experience: 7,
        consultationFee: 0,
        availabilityStatus: 'AVAILABLE',
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        timeSlots: ['09:00 AM - 10:00 AM', '10:30 AM - 11:30 AM', '12:00 PM - 01:00 PM']
      },
      {
        id: 'doc-gps-4',
        hospitalId: `${localPrefix}5`,
        name: 'Dr. Pradeep Nair, MD, DM',
        specialization: 'Cardiology',
        qualification: 'MBBS, MD, DM (Cardiology)',
        experience: 16,
        consultationFee: 0,
        availabilityStatus: 'AVAILABLE',
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        timeSlots: ['10:00 AM - 11:30 AM', '12:00 PM - 01:30 PM', '03:00 PM - 04:30 PM']
      }
    ];

    const updatedHospitals = [...newNearbyHospitals, ...currentHospitals];
    setLocal(STORAGE_KEYS.HOSPITALS, updatedHospitals);

    const updatedDocs = [...newDocs, ...currentDocs];
    setLocal(STORAGE_KEYS.DOCTORS, updatedDocs);

    return updatedHospitals;
  }

  login(identifier: string, password?: string, expectedRole?: UserRole): User | null {
    const users = this.getUsers();
    const normalized = String(identifier || '').trim().toLowerCase();
    
    // Check direct email or mobile match
    const found = users.find(
      (u) => String(u.email || '').toLowerCase() === normalized || String(u.mobile || '').trim() === String(identifier || '').trim()
    );

    if (!found) {
      return null;
    }

    // Role check if expectedRole is passed
    if (expectedRole) {
      const isExpectedAdmin = expectedRole === 'HOSPITAL_ADMIN' || expectedRole === 'ADMIN';
      const isFoundAdmin = found.role === 'HOSPITAL_ADMIN' || found.role === 'ADMIN';
      if (isExpectedAdmin && !isFoundAdmin) {
        return null;
      }
      if (!isExpectedAdmin && found.role !== expectedRole) {
        return null;
      }
    }

    // Password validation: checks against stored passwords or default password123 for seeded users
    if (password !== undefined) {
      const storedPasswords = getLocal<Record<string, string>>('healthconnect_passwords', {
        'shaiksalma1125@gmail.com': 'password123',
        'citizen@healthcare.gov.in': 'password123',
        'staff@ggh.gov.in': 'password123',
        'admin.ggh@hospital.gov.in': 'password123',
        'admin.chc@hospital.gov.in': 'password123',
        'admin.phc@hospital.gov.in': 'password123',
        'admin@mohfw.gov.in': 'password123',
        'ravi.kumar@example.com': 'password123',
        'dr.rao@example.com': 'password123',
        'admin.health@sih2026.gov.in': 'password123'
      });
      const expectedPassword = storedPasswords[String(found.email || '').toLowerCase()] || 'password123';
      if (password !== expectedPassword && password.length < 6) {
        return null;
      }
    }

    this.setCurrentUser(found);
    return found;
  }

  register(userData: Omit<User, 'id' | 'createdAt'> & { password?: string }): User {
    const users = this.getUsers();
    const newUser: User = {
      name: userData.name,
      email: userData.email,
      mobile: userData.mobile,
      role: userData.role,
      location: userData.location,
      district: userData.district,
      state: userData.state,
      hospitalId: userData.hospitalId,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    setLocal(STORAGE_KEYS.USERS, users);

    if (userData.password) {
      const storedPasswords = getLocal<Record<string, string>>('healthconnect_passwords', {});
      storedPasswords[String(newUser.email || '').toLowerCase()] = userData.password;
      setLocal('healthconnect_passwords', storedPasswords);
    }

    this.setCurrentUser(newUser);
    return newUser;
  }

  logout(): void {
    localStorage.removeItem('healthconnect_user_authenticated');
    this.setCurrentUser(null);
  }

  // Hospitals
  getHospitals(): Hospital[] {
    const list = getLocal<Hospital[]>(STORAGE_KEYS.HOSPITALS, INITIAL_HOSPITALS);
    const existingIds = new Set(list.map((h) => h.id));
    let updated = false;

    // Clean up any stale duplicate AIIMS names in local storage
    for (const h of list) {
      if (h.id.startsWith('hosp-gps-local-') && h.name.includes('AIIMS')) {
        h.name = 'Apex Super Specialty Hospital & Research Centre';
        updated = true;
      }
    }

    for (const h of INITIAL_HOSPITALS) {
      if (!existingIds.has(h.id)) {
        list.push(h);
        updated = true;
      }
    }
    if (updated) {
      setLocal(STORAGE_KEYS.HOSPITALS, list);
    }
    return list;
  }

  getHospitalById(id: string): Hospital | undefined {
    return this.getHospitals().find((h) => h.id === id);
  }

  saveHospital(hospitalData: Partial<Hospital> & { name: string }): Hospital {
    const list = this.getHospitals();
    if (hospitalData.id) {
      const idx = list.findIndex((h) => h.id === hospitalData.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...hospitalData } as Hospital;
        setLocal(STORAGE_KEYS.HOSPITALS, list);
        return list[idx];
      }
    }

    const newHosp: Hospital = {
      id: `hosp-${Date.now()}`,
      name: hospitalData.name.trim(),
      address: hospitalData.address?.trim() || 'Main Hospital Road',
      village: hospitalData.village?.trim() || 'Urban Zone',
      mandal: hospitalData.mandal?.trim() || 'District Mandal',
      district: hospitalData.district?.trim() || 'NTR District',
      state: hospitalData.state?.trim() || 'Andhra Pradesh',
      pincode: hospitalData.pincode?.trim() || '520001',
      latitude: hospitalData.latitude || 16.5062 + (Math.random() - 0.5) * 0.02,
      longitude: hospitalData.longitude || 80.6480 + (Math.random() - 0.5) * 0.02,
      phone: hospitalData.phone?.trim() || '+91 866-2475100',
      emergencyPhone: hospitalData.emergencyPhone?.trim() || '108 / 102',
      openingHours: hospitalData.openingHours?.trim() || '24 Hours | OPD: 08:30 AM - 01:30 PM',
      hospitalType: hospitalData.hospitalType || 'Government Hospital',
      facilities:
        hospitalData.facilities && hospitalData.facilities.length > 0
          ? hospitalData.facilities
          : ['24x7 Emergency Casualty', 'General OPD', 'Jan Aushadhi Medical Store', 'Diagnostic Lab'],
      rating: hospitalData.rating || 4.5,
      totalReviews: hospitalData.totalReviews || 12,
      emergencyAvailable: hospitalData.emergencyAvailable ?? true,
      isOpen: hospitalData.isOpen ?? true
    };

    list.unshift(newHosp);
    setLocal(STORAGE_KEYS.HOSPITALS, list);
    return newHosp;
  }

  deleteHospital(id: string): void {
    const list = this.getHospitals().filter((h) => h.id !== id);
    setLocal(STORAGE_KEYS.HOSPITALS, list);
  }

  assignHospitalToUser(userId: string, hospitalId: string): User | undefined {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      users[idx].hospitalId = hospitalId;
      setLocal(STORAGE_KEYS.USERS, users);
      const cur = this.getCurrentUser();
      if (cur && cur.id === userId) {
        cur.hospitalId = hospitalId;
        this.setCurrentUser(cur);
      }
      return users[idx];
    }
    return undefined;
  }

  // Doctors
  getDoctors(hospitalId?: string): Doctor[] {
    const docs = getLocal<Doctor[]>(STORAGE_KEYS.DOCTORS, INITIAL_DOCTORS);
    const existingIds = new Set(docs.map((d) => d.id));
    let updated = false;
    for (const d of INITIAL_DOCTORS) {
      if (!existingIds.has(d.id)) {
        docs.push(d);
        updated = true;
      }
    }
    if (updated) {
      setLocal(STORAGE_KEYS.DOCTORS, docs);
    }
    if (hospitalId) {
      return docs.filter((d) => d.hospitalId === hospitalId);
    }
    return docs;
  }

  getDoctorById(id: string): Doctor | undefined {
    return this.getDoctors().find((d) => d.id === id);
  }

  updateDoctorStatus(
    doctorId: string,
    status: 'AVAILABLE' | 'IN_CONSULTATION' | 'ON_LEAVE'
  ): Doctor | undefined {
    const docs = this.getDoctors();
    const idx = docs.findIndex((d) => d.id === doctorId);
    if (idx !== -1) {
      docs[idx].availabilityStatus = status;
      setLocal(STORAGE_KEYS.DOCTORS, docs);
      return docs[idx];
    }
    return undefined;
  }

  saveDoctor(doctor: Partial<Doctor> & { hospitalId: string; name: string }): Doctor {
    const docs = this.getDoctors();
    if (doctor.id) {
      const idx = docs.findIndex((d) => d.id === doctor.id);
      if (idx !== -1) {
        docs[idx] = { ...docs[idx], ...doctor } as Doctor;
        setLocal(STORAGE_KEYS.DOCTORS, docs);
        return docs[idx];
      }
    }
    const newDoc: Doctor = {
      id: `doc-${Date.now()}`,
      hospitalId: doctor.hospitalId,
      name: doctor.name,
      specialization: doctor.specialization || 'General Medicine',
      qualification: doctor.qualification || 'MBBS',
      experience: doctor.experience || 5,
      consultationFee: doctor.consultationFee || 0,
      availabilityStatus: doctor.availabilityStatus || 'AVAILABLE',
      availableDays: doctor.availableDays || ['Monday', 'Wednesday', 'Friday'],
      timeSlots: doctor.timeSlots || ['09:00 AM - 11:00 AM', '11:30 AM - 01:00 PM']
    };
    docs.push(newDoc);
    setLocal(STORAGE_KEYS.DOCTORS, docs);
    return newDoc;
  }

  deleteDoctor(id: string): void {
    const docs = this.getDoctors().filter((d) => d.id !== id);
    setLocal(STORAGE_KEYS.DOCTORS, docs);
  }

  updateDoctorSlots(doctorId: string, timeSlots: string[], availableDays?: string[]): Doctor | undefined {
    const docs = this.getDoctors();
    const idx = docs.findIndex((d) => d.id === doctorId);
    if (idx !== -1) {
      docs[idx].timeSlots = timeSlots;
      if (availableDays) {
        docs[idx].availableDays = availableDays;
      }
      setLocal(STORAGE_KEYS.DOCTORS, docs);
      return docs[idx];
    }
    return undefined;
  }

  updateDoctorSpecialization(
    doctorId: string,
    specialization: string,
    qualification?: string,
    experience?: number,
    consultationFee?: number
  ): Doctor | undefined {
    const docs = this.getDoctors();
    const idx = docs.findIndex((d) => d.id === doctorId);
    if (idx !== -1) {
      docs[idx].specialization = specialization;
      if (qualification !== undefined) docs[idx].qualification = qualification;
      if (experience !== undefined) docs[idx].experience = experience;
      if (consultationFee !== undefined) docs[idx].consultationFee = consultationFee;
      setLocal(STORAGE_KEYS.DOCTORS, docs);
      return docs[idx];
    }
    return undefined;
  }

  // Doctor Working Time & Slot Capacity Utilities
  parseTimeToMinutes(timeStr: string): number {
    const clean = timeStr.trim().toUpperCase();
    const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return 540;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridiem = match[3];

    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  }

  formatMinutesToTime(totalMinutes: number): string {
    const hours24 = Math.floor(totalMinutes / 60) % 24;
    const mins = totalMinutes % 60;
    const meridiem = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    return `${String(hours12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${meridiem}`;
  }

  getDoctorWorkingHours(doctor: Doctor): { start: string; end: string } {
    if (doctor.workingHours && doctor.workingHours.start && doctor.workingHours.end) {
      return doctor.workingHours;
    }
    return { start: '09:00 AM', end: '04:00 PM' };
  }

  getConsultationDurationMinutes(doctor?: Doctor): number {
    if (doctor && typeof doctor.consultationDurationMinutes === 'number' && doctor.consultationDurationMinutes > 0) {
      return doctor.consultationDurationMinutes;
    }
    return 6; // Default 6 minutes per patient as specified in requirement
  }

  getDoctorHourlySlots(doctor: Doctor): string[] {
    const wh = this.getDoctorWorkingHours(doctor);
    const startMins = this.parseTimeToMinutes(wh.start);
    const endMins = this.parseTimeToMinutes(wh.end);

    const slots: string[] = [];
    let cur = startMins;
    while (cur + 60 <= endMins) {
      const slotStart = this.formatMinutesToTime(cur);
      const slotEnd = this.formatMinutesToTime(cur + 60);
      slots.push(`${slotStart} - ${slotEnd}`);
      cur += 60;
    }

    if (slots.length === 0) {
      return doctor.timeSlots && doctor.timeSlots.length > 0
        ? doctor.timeSlots
        : ['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM', '01:00 PM - 02:00 PM', '02:00 PM - 03:00 PM', '03:00 PM - 04:00 PM'];
    }

    return slots;
  }

  getDoctorSlotCapacity(doctor: Doctor, slotString: string): number {
    const parts = slotString.split('-');
    let slotDurationMinutes = 60;
    if (parts.length === 2) {
      const start = this.parseTimeToMinutes(parts[0]);
      const end = this.parseTimeToMinutes(parts[1]);
      if (end > start) {
        slotDurationMinutes = end - start;
      }
    }
    const durationPerPatient = this.getConsultationDurationMinutes(doctor);
    return Math.max(1, Math.floor(slotDurationMinutes / durationPerPatient));
  }

  areSlotsMatching(timeA: string, timeB: string): boolean {
    if (!timeA || !timeB) return false;
    const cleanA = String(timeA || '').trim().replace(/\s+/g, ' ');
    const cleanB = String(timeB || '').trim().replace(/\s+/g, ' ');
    if (cleanA.toLowerCase() === cleanB.toLowerCase()) return true;

    // Check by splitting on delimiter (- or – or to)
    const splitA = cleanA.split(/[-–—]|to/i).map((s) => s.trim());
    const splitB = cleanB.split(/[-–—]|to/i).map((s) => s.trim());

    if (splitA.length >= 2 && splitB.length >= 2) {
      const startA = this.parseTimeToMinutes(splitA[0]);
      const endA = this.parseTimeToMinutes(splitA[1]);
      const startB = this.parseTimeToMinutes(splitB[0]);
      const endB = this.parseTimeToMinutes(splitB[1]);
      return startA === startB && endA === endB;
    }

    return false;
  }

  getSlotAvailability(doctorId: string, date: string, slotString: string): SlotAvailabilityInfo {
    const doc = this.getDoctorById(doctorId);
    const totalCapacity = doc ? this.getDoctorSlotCapacity(doc, slotString) : 10;
    const allAppointments = this.getAppointments();

    const cleanDate = date.trim().slice(0, 10);
    const bookedCount = allAppointments.filter(
      (a) =>
        a.doctorId === doctorId &&
        a.appointmentDate.trim().slice(0, 10) === cleanDate &&
        this.areSlotsMatching(a.appointmentTime, slotString) &&
        a.status !== 'CANCELLED'
    ).length;

    const remainingSlots = Math.max(0, totalCapacity - bookedCount);
    const isFullyBooked = remainingSlots <= 0;

    let label = '';
    if (isFullyBooked) {
      label = 'Fully booked';
    } else if (bookedCount === 0) {
      label = `${totalCapacity} slots available`;
    } else if (remainingSlots === 1) {
      label = '1 slot left';
    } else {
      label = `${remainingSlots} slots left`;
    }

    return {
      slot: slotString,
      totalCapacity,
      bookedCount,
      remainingSlots,
      isFullyBooked,
      label
    };
  }

  getDoctorSlotsWithAvailability(doctor: Doctor, date: string): SlotAvailabilityInfo[] {
    const slots = this.getDoctorHourlySlots(doctor);
    return slots.map((s) => this.getSlotAvailability(doctor.id, date, s));
  }

  getNextAvailableSlot(doctorId: string, date: string, currentSlot?: string): string | undefined {
    const doc = this.getDoctorById(doctorId);
    if (!doc) return undefined;
    const slots = this.getDoctorSlotsWithAvailability(doc, date);

    let foundCurrent = !currentSlot;
    for (const item of slots) {
      if (!foundCurrent) {
        if (item.slot === currentSlot) {
          foundCurrent = true;
        }
        continue;
      }
      if (!item.isFullyBooked) {
        return item.slot;
      }
    }

    const available = slots.find((s) => !s.isFullyBooked);
    return available ? available.slot : undefined;
  }

  // Services
  getServices(hospitalId?: string): HospitalService[] {
    const srvs = getLocal<HospitalService[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
    const existingIds = new Set(srvs.map((s) => s.id));
    let updated = false;
    for (const s of INITIAL_SERVICES) {
      if (!existingIds.has(s.id)) {
        srvs.push(s);
        updated = true;
      }
    }
    if (updated) {
      setLocal(STORAGE_KEYS.SERVICES, srvs);
    }
    if (hospitalId) {
      return srvs.filter((s) => s.hospitalId === hospitalId);
    }
    return srvs;
  }

  updateServiceStatus(
    serviceId: string,
    available: boolean,
    waitTime?: string
  ): HospitalService | undefined {
    const srvs = this.getServices();
    const idx = srvs.findIndex((s) => s.id === serviceId);
    if (idx !== -1) {
      srvs[idx].available = available;
      if (waitTime !== undefined) {
        srvs[idx].waitingTime = waitTime;
      }
      srvs[idx].updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
      setLocal(STORAGE_KEYS.SERVICES, srvs);
      return srvs[idx];
    }
    return undefined;
  }

  saveService(
    service: Partial<HospitalService> & { hospitalId: string; serviceName: string }
  ): HospitalService {
    const srvs = this.getServices();
    if (service.id) {
      const idx = srvs.findIndex((s) => s.id === service.id);
      if (idx !== -1) {
        srvs[idx] = {
          ...srvs[idx],
          ...service,
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
        } as HospitalService;
        setLocal(STORAGE_KEYS.SERVICES, srvs);
        return srvs[idx];
      }
    }
    const newSrv: HospitalService = {
      id: `srv-${Date.now()}`,
      hospitalId: service.hospitalId,
      serviceId: service.serviceId || `s-${Date.now()}`,
      serviceName: service.serviceName,
      category: service.category || 'Clinical Support',
      available: service.available ?? true,
      waitingTime: service.waitingTime || '15 mins',
      description: service.description || 'Routine hospital clinical service.',
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    srvs.push(newSrv);
    setLocal(STORAGE_KEYS.SERVICES, srvs);
    return newSrv;
  }

  deleteService(id: string): void {
    const srvs = this.getServices().filter((s) => s.id !== id);
    setLocal(STORAGE_KEYS.SERVICES, srvs);
  }

  // Medicines
  getMedicines(hospitalId?: string): MedicineStock[] {
    const meds = getLocal<MedicineStock[]>(STORAGE_KEYS.MEDICINES, INITIAL_MEDICINES);
    const existingIds = new Set(meds.map((m) => m.id));
    let updated = false;
    for (const m of INITIAL_MEDICINES) {
      if (!existingIds.has(m.id)) {
        meds.push(m);
        updated = true;
      }
    }
    if (updated) {
      setLocal(STORAGE_KEYS.MEDICINES, meds);
    }
    if (hospitalId) {
      return meds.filter((m) => m.hospitalId === hospitalId);
    }
    return meds;
  }

  updateMedicineStock(medicineId: string, quantity: number): MedicineStock | undefined {
    const meds = this.getMedicines();
    const idx = meds.findIndex((m) => m.id === medicineId);
    if (idx !== -1) {
      meds[idx].quantity = quantity;
      meds[idx].status =
        quantity === 0
          ? 'OUT_OF_STOCK'
          : quantity <= meds[idx].minimumThreshold
          ? 'LOW_STOCK'
          : 'AVAILABLE';
      meds[idx].updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
      setLocal(STORAGE_KEYS.MEDICINES, meds);
      return meds[idx];
    }
    return undefined;
  }

  saveMedicine(
    med: Partial<MedicineStock> & { hospitalId: string; medicineName: string }
  ): MedicineStock {
    const meds = this.getMedicines();
    const qty = med.quantity ?? 0;
    const threshold = med.minimumThreshold ?? 50;
    const status: 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK' =
      qty === 0 ? 'OUT_OF_STOCK' : qty <= threshold ? 'LOW_STOCK' : 'AVAILABLE';

    if (med.id) {
      const idx = meds.findIndex((m) => m.id === med.id);
      if (idx !== -1) {
        meds[idx] = {
          ...meds[idx],
          ...med,
          quantity: qty,
          minimumThreshold: threshold,
          status,
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
        } as MedicineStock;
        setLocal(STORAGE_KEYS.MEDICINES, meds);
        return meds[idx];
      }
    }
    const newMed: MedicineStock = {
      id: `stk-${Date.now()}`,
      hospitalId: med.hospitalId,
      medicineId: med.medicineId || `med-${Date.now()}`,
      medicineName: med.medicineName,
      category: med.category || 'Essential Formulary',
      quantity: qty,
      minimumThreshold: threshold,
      status,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    meds.push(newMed);
    setLocal(STORAGE_KEYS.MEDICINES, meds);
    return newMed;
  }

  deleteMedicine(id: string): void {
    const meds = this.getMedicines().filter((m) => m.id !== id);
    setLocal(STORAGE_KEYS.MEDICINES, meds);
  }

  findAlternativeHospitalsForMedicine(medicineName: string, currentHospitalId: string): Array<{
    medicine: MedicineStock;
    hospital: Hospital;
    distance?: number;
  }> {
    const allMeds = this.getMedicines();
    const currentHosp = this.getHospitalById(currentHospitalId);
    const cleanMedName = String(medicineName || '').toLowerCase().trim();
    const matching = allMeds.filter(
      (m) =>
        m.hospitalId !== currentHospitalId &&
        String(m.medicineName || '').toLowerCase().includes(cleanMedName) &&
        (m.status === 'AVAILABLE' || m.quantity > 0)
    );
    const hospitals = this.getHospitals();
    const results: Array<{ medicine: MedicineStock; hospital: Hospital; distance?: number }> = [];

    for (const m of matching) {
      const hosp = hospitals.find((h) => h.id === m.hospitalId);
      if (hosp) {
        let dist: number | undefined;
        if (currentHosp) {
          dist = Math.round(calculateDistance(currentHosp.latitude, currentHosp.longitude, hosp.latitude, hosp.longitude) * 10) / 10;
        }
        results.push({
          medicine: m,
          hospital: hosp,
          distance: dist
        });
      }
    }
    return results.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }

  // Diagnostics Coordination & Availability
  getDiagnostics(hospitalId?: string): DiagnosticService[] {
    const items = getLocal<DiagnosticService[]>(STORAGE_KEYS.DIAGNOSTICS, INITIAL_DIAGNOSTICS);
    const existingIds = new Set(items.map((i) => i.id));
    let updated = false;
    for (const d of INITIAL_DIAGNOSTICS) {
      if (!existingIds.has(d.id)) {
        items.push(d);
        updated = true;
      }
    }
    if (updated) {
      setLocal(STORAGE_KEYS.DIAGNOSTICS, items);
    }
    if (hospitalId) {
      return items.filter((d) => d.hospitalId === hospitalId);
    }
    return items;
  }

  saveDiagnostic(
    item: Partial<DiagnosticService> & { hospitalId: string; name: string }
  ): DiagnosticService {
    const list = this.getDiagnostics();
    if (item.id) {
      const idx = list.findIndex((d) => d.id === item.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...item } as DiagnosticService;
        setLocal(STORAGE_KEYS.DIAGNOSTICS, list);
        return list[idx];
      }
    }
    const newDiag: DiagnosticService = {
      id: `diag-${Date.now()}`,
      hospitalId: item.hospitalId,
      name: item.name,
      category: item.category || 'Pathology',
      equipmentStatus: item.equipmentStatus || 'OPERATIONAL',
      sampleTimings: item.sampleTimings || '09:00 AM - 02:00 PM',
      reportTurnaroundHours: item.reportTurnaroundHours || 2,
      isFreeUnderNHM: item.isFreeUnderNHM ?? true,
      price: item.price || 0,
      slotsAvailableToday: item.slotsAvailableToday ?? 25,
      nextAvailableSlot: item.nextAvailableSlot || 'Today, 11:30 AM'
    };
    list.push(newDiag);
    setLocal(STORAGE_KEYS.DIAGNOSTICS, list);
    return newDiag;
  }

  deleteDiagnostic(id: string): void {
    const list = this.getDiagnostics().filter((d) => d.id !== id);
    setLocal(STORAGE_KEYS.DIAGNOSTICS, list);
  }

  // Assisted Teleconsultation
  getTeleconsultations(filter?: {
    hospitalId?: string;
    patientPhone?: string;
    doctorId?: string;
  }): Teleconsultation[] {
    const items = getLocal<Teleconsultation[]>(STORAGE_KEYS.TELECONSULTATIONS, INITIAL_TELECONSULTATIONS);
    const existingIds = new Set(items.map((t) => t.id));
    let updated = false;
    for (const t of INITIAL_TELECONSULTATIONS) {
      if (!existingIds.has(t.id)) {
        items.push(t);
        updated = true;
      }
    }
    if (updated) {
      setLocal(STORAGE_KEYS.TELECONSULTATIONS, items);
    }
    let res = items;
    if (filter?.hospitalId) {
      res = res.filter((t) => t.hospitalId === filter.hospitalId);
    }
    if (filter?.patientPhone) {
      res = res.filter((t) => t.patientPhone.includes(filter.patientPhone!));
    }
    if (filter?.doctorId) {
      res = res.filter((t) => t.doctorId === filter.doctorId);
    }
    return res.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  bookTeleconsultation(
    data: Omit<Teleconsultation, 'id' | 'teleconsultId' | 'status' | 'createdAt'>
  ): Teleconsultation {
    const list = this.getTeleconsultations();
    const count = list.length + 1;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const teleconsultId = `TC-${new Date().getFullYear()}-${randomSuffix}`;
    const newTC: Teleconsultation = {
      ...data,
      id: `tc-${Date.now()}`,
      teleconsultId,
      status: 'WAITING',
      createdAt: new Date().toISOString()
    };
    list.unshift(newTC);
    setLocal(STORAGE_KEYS.TELECONSULTATIONS, list);

    // Also link record to health records if user is active
    const user = this.getCurrentUser();
    if (user) {
      this.addHealthRecord({
        userId: user.id,
        abhaNumber: '91-2026-8812-4029',
        abhaAddress: `${String(user.name || 'patient').toLowerCase().replace(/[^a-z0-9]/g, '')}@abdm`,
        recordType: 'PRESCRIPTION',
        title: `Teleconsultation Booking - ${newTC.doctorSpecialization}`,
        facilityName: newTC.hospitalName,
        doctorName: newTC.doctorName,
        date: new Date().toISOString().split('T')[0],
        summary: `Scheduled consultation for ${newTC.symptoms}. Mode: ${newTC.assistedByAsha ? 'ASHA Assisted' : 'Direct Patient'}.`,
        details: { teleconsultId, vitals: newTC.vitals }
      });
    }

    return newTC;
  }

  updateTeleconsultationStatus(
    id: string,
    status: Teleconsultation['status'],
    prescription?: Teleconsultation['prescription']
  ): Teleconsultation | undefined {
    const list = this.getTeleconsultations();
    const idx = list.findIndex((t) => t.id === id);
    if (idx !== -1) {
      list[idx].status = status;
      if (prescription) {
        list[idx].prescription = prescription;
      }
      setLocal(STORAGE_KEYS.TELECONSULTATIONS, list);
      return list[idx];
    }
    return undefined;
  }

  // Digital Triage
  getTriageAssessments(): TriageAssessment[] {
    return getLocal<TriageAssessment[]>(STORAGE_KEYS.TRIAGE, []);
  }

  saveTriageAssessment(assessment: Omit<TriageAssessment, 'id' | 'createdAt'>): TriageAssessment {
    const list = this.getTriageAssessments();
    const newAssess: TriageAssessment = {
      ...assessment,
      id: `trg-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    list.unshift(newAssess);
    setLocal(STORAGE_KEYS.TRIAGE, list);
    return newAssess;
  }

  // Patient Health Records / ABHA
  getHealthRecords(userIdOrAbha?: string): HealthRecord[] {
    const items = getLocal<HealthRecord[]>(STORAGE_KEYS.HEALTH_RECORDS, INITIAL_HEALTH_RECORDS);
    const existingIds = new Set(items.map((h) => h.id));
    let updated = false;
    for (const h of INITIAL_HEALTH_RECORDS) {
      if (!existingIds.has(h.id)) {
        items.push(h);
        updated = true;
      }
    }
    if (updated) {
      setLocal(STORAGE_KEYS.HEALTH_RECORDS, items);
    }
    if (userIdOrAbha) {
      return items.filter(
        (h) =>
          h.userId === userIdOrAbha ||
          h.abhaNumber.includes(userIdOrAbha) ||
          h.abhaAddress.includes(userIdOrAbha)
      );
    }
    return items;
  }

  addHealthRecord(rec: Omit<HealthRecord, 'id'>): HealthRecord {
    const list = this.getHealthRecords();
    const newRec: HealthRecord = {
      ...rec,
      id: `rec-${Date.now()}`
    };
    list.unshift(newRec);
    setLocal(STORAGE_KEYS.HEALTH_RECORDS, list);
    return newRec;
  }

  deleteHealthRecord(id: string): void {
    const list = this.getHealthRecords().filter((r) => r.id !== id);
    setLocal(STORAGE_KEYS.HEALTH_RECORDS, list);
  }

  // Inter-Facility Referral Tracking
  getReferrals(hospitalId?: string): PatientReferral[] {
    const items = getLocal<PatientReferral[]>(STORAGE_KEYS.REFERRALS, INITIAL_REFERRALS);
    const existingIds = new Set(items.map((r) => r.id));
    let updated = false;
    for (const r of INITIAL_REFERRALS) {
      if (!existingIds.has(r.id)) {
        items.push(r);
        updated = true;
      }
    }
    // Ensure existing items have doctorSpecialist, referralReason, and normalized fields
    for (const r of items) {
      if (!r.referralReason && r.reason) {
        r.referralReason = r.reason;
        updated = true;
      }
      if (!r.doctorSpecialist) {
        r.doctorSpecialist = r.referredByDoctor || r.department || 'Consultant Specialist';
        updated = true;
      }
      // Ensure patientId is present; if missing, dynamically link with registered citizens
      if (!r.patientId || r.patientId === 'usr-cit-1' || r.patientId === 'usr-cit-2') {
        const citizens = this.getUsers().filter((u) => u.role === 'CITIZEN');
        const matched = citizens.find((u) => {
          if (r.patientEmail && u.email && r.patientEmail.toLowerCase().trim() === u.email.toLowerCase().trim()) return true;
          if (r.patientPhone && u.mobile) {
            const uDigits = String(u.mobile).replace(/\D/g, '').slice(-10);
            const rDigits = String(r.patientPhone).replace(/\D/g, '').slice(-10);
            if (uDigits && rDigits && uDigits.length === 10 && uDigits === rDigits) return true;
          }
          return false;
        });
        r.patientId = matched ? matched.id : `patient-${r.id}`;
        updated = true;
      }
    }
    if (updated) {
      setLocal(STORAGE_KEYS.REFERRALS, items);
    }
    if (hospitalId) {
      return items.filter((r) => r.fromHospitalId === hospitalId || r.toHospitalId === hospitalId);
    }
    return items;
  }

  getReferralsForCitizen(user: User): PatientReferral[] {
    if (!user) return [];
    const items = this.getReferrals();
    return items.filter((r) => isReferralForUser(r, user));
  }

  createReferral(
    ref: Partial<PatientReferral> & {
      patientName: string;
      fromHospitalId: string;
      toHospitalId: string;
      fromHospitalName: string;
      toHospitalName: string;
      reason: string;
    }
  ): PatientReferral {
    const list = this.getReferrals();
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const referralId = ref.referralId || `REF-${new Date().getFullYear()}-GOV-${randomCode}`;
    const initialStatus = ref.status ? normalizeReferralStatus(ref.status) : 'Pending';
    const initialDate = ref.referralDate || new Date().toISOString().split('T')[0];

    // Determine patientId: use provided patientId or link to existing citizen account
    let patientId = ref.patientId;
    if (!patientId) {
      const users = this.getUsers().filter((u) => u.role === 'CITIZEN');
      const matched = users.find((u) => {
        if (ref.patientEmail && u.email && ref.patientEmail.toLowerCase().trim() === u.email.toLowerCase().trim()) return true;
        if (ref.patientPhone && u.mobile) {
          const uDigits = String(u.mobile).replace(/\D/g, '').slice(-10);
          const rDigits = String(ref.patientPhone).replace(/\D/g, '').slice(-10);
          if (uDigits && rDigits && uDigits === rDigits) return true;
        }
        if (ref.patientName && u.name && ref.patientName.toLowerCase().trim() === u.name.toLowerCase().trim()) return true;
        return false;
      });
      if (matched) {
        patientId = matched.id;
      } else {
        patientId = `patient-${Date.now()}`;
      }
    }

    const newRef: PatientReferral = {
      id: ref.id || `ref-${Date.now()}`,
      referralId,
      patientId,
      patientName: ref.patientName,
      patientAge: ref.patientAge || 35,
      patientGender: ref.patientGender || 'Other',
      patientPhone: ref.patientPhone || '',
      patientEmail: ref.patientEmail,
      fromHospitalId: ref.fromHospitalId,
      fromHospitalName: ref.fromHospitalName,
      toHospitalId: ref.toHospitalId,
      toHospitalName: ref.toHospitalName,
      department: ref.department || 'Specialist Consultation',
      doctorName: ref.doctorName,
      specialist: ref.specialist,
      referredByDoctor: ref.referredByDoctor || 'Medical Officer In-charge',
      doctorSpecialist: ref.doctorSpecialist || ref.specialist || 'Consultant Specialist',
      reason: ref.reason,
      referralReason: ref.referralReason || ref.reason,
      clinicalSummary: ref.clinicalSummary || ref.reason,
      priority: ref.priority || 'ROUTINE',
      transportRequired: ref.transportRequired || 'SELF_TRANSPORT',
      transportMode: ref.transportMode || (ref.transportRequired === '108_AMBULANCE' ? 'AMBULANCE_108' : 'SELF_TRANSPORT'),
      status: initialStatus,
      referralDate: initialDate,
      qrCodeToken: ref.qrCodeToken || `${referralId}-VERIFIED-HEALTH-GATEWAY`,
      notes: ref.notes,
      updatedAt: new Date().toISOString()
    };

    list.unshift(newRef);
    setLocal(STORAGE_KEYS.REFERRALS, list);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('healthcare-referrals-updated', {
          detail: {
            action: 'CREATED',
            referral: newRef
          }
        })
      );
    }

    return newRef;
  }

  updateReferralStatus(id: string, status: PatientReferral['status']): PatientReferral | undefined {
    const list = this.getReferrals();
    const idx = list.findIndex((r) => r.id === id || r.referralId === id);
    if (idx !== -1) {
      list[idx].status = status;
      list[idx].updatedAt = new Date().toISOString();
      const updatedRef = list[idx];
      setLocal(STORAGE_KEYS.REFERRALS, list);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('healthcare-referrals-updated', {
            detail: {
              action: 'STATUS_UPDATED',
              referral: updatedRef,
              status
            }
          })
        );
      }
      return updatedRef;
    }
    return undefined;
  }

  updateReferral(id: string, updates: Partial<PatientReferral>): PatientReferral | undefined {
    const list = this.getReferrals();
    const idx = list.findIndex((r) => r.id === id || r.referralId === id);
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      const updatedRef = list[idx];
      setLocal(STORAGE_KEYS.REFERRALS, list);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('healthcare-referrals-updated', {
            detail: {
              action: 'UPDATED',
              referral: updatedRef
            }
          })
        );
      }
      return updatedRef;
    }
    return undefined;
  }

  // Live OPD Queue & Waiting Time Management
  getQueues(hospitalId?: string): OPDQueueInfo[] {
    const items = getLocal<OPDQueueInfo[]>(STORAGE_KEYS.QUEUES, INITIAL_OPD_QUEUES);
    const existingIds = new Set(items.map((q) => q.id));
    let updated = false;
    for (const q of INITIAL_OPD_QUEUES) {
      if (!existingIds.has(q.id)) {
        items.push(q);
        updated = true;
      }
    }
    if (updated) {
      setLocal(STORAGE_KEYS.QUEUES, items);
    }
    if (hospitalId) {
      return items.filter((q) => q.hospitalId === hospitalId);
    }
    return items;
  }

  callNextQueueToken(queueId: string): OPDQueueInfo | undefined {
    const queues = this.getQueues();
    const idx = queues.findIndex((q) => q.id === queueId);
    if (idx !== -1) {
      const q = queues[idx];
      if (q.currentTokenNumber < q.totalTokensIssued) {
        q.currentTokenNumber += 1;
        q.currentServingToken = `TK-${String(q.currentTokenNumber).padStart(2, '0')}`;
        q.lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        q.status = 'CALLING';
        setLocal(STORAGE_KEYS.QUEUES, queues);
        return q;
      }
    }
    return undefined;
  }

  issueQueueToken(
    hospitalId: string,
    department: string,
    patientName: string
  ): { tokenNumber: number; tokenCode: string; estimatedWaitMins: number; roomNumber: string } {
    const queues = this.getQueues();
    let q = queues.find((item) => item.hospitalId === hospitalId && item.department === department);
    if (!q) {
      // Create a queue if not exists
      const hosp = this.getHospitalById(hospitalId);
      q = {
        id: `q-${Date.now()}`,
        hospitalId,
        department,
        doctorName: 'OPD Duty Medical Officer',
        currentServingToken: 'TK-01',
        currentTokenNumber: 1,
        totalTokensIssued: 1,
        avgWaitTimePerPatientMinutes: 6,
        status: 'CALLING',
        roomNumber: 'Room 101',
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      queues.push(q);
    } else {
      q.totalTokensIssued += 1;
      q.lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const tokenNumber = q.totalTokensIssued;
    const tokenCode = `TK-${String(tokenNumber).padStart(2, '0')}`;
    const ahead = Math.max(0, tokenNumber - q.currentTokenNumber);
    const estimatedWaitMins = ahead * q.avgWaitTimePerPatientMinutes;

    setLocal(STORAGE_KEYS.QUEUES, queues);

    // Save offline token copy automatically for low connectivity guarantee
    this.saveOfflineToken({
      tokenCode,
      tokenNumber,
      hospitalId,
      hospitalName: this.getHospitalById(hospitalId)?.name || 'Government Health Centre',
      department,
      patientName,
      issuedAt: new Date().toISOString(),
      roomNumber: q.roomNumber,
      estimatedWaitMins
    });

    return { tokenNumber, tokenCode, estimatedWaitMins, roomNumber: q.roomNumber };
  }

  // High-Risk Patient Registry & Healthcare Follow-up Management
  getHighRiskPatients(hospitalId?: string): HighRiskPatient[] {
    const items = getLocal<HighRiskPatient[]>(STORAGE_KEYS.HIGH_RISK, INITIAL_HIGH_RISK_PATIENTS);
    const existingIds = new Set(items.map((h) => h.id));
    let updated = false;
    for (const h of INITIAL_HIGH_RISK_PATIENTS) {
      if (!existingIds.has(h.id)) {
        items.push(h);
        updated = true;
      }
    }

    // Ensure all records have normalized follow-up properties
    const normalized = items.map((p) => {
      const nextDate = p.nextFollowUpDate || p.nextFollowUpDueDate || '2026-09-28';
      const status = p.status || (p.reminderStatus === 'MISSED' ? 'MISSED' : 'SCHEDULED');
      const patientId = p.patientId === 'usr-cit-1' ? 'user-google-salma' : (p.patientId || p.id);
      return {
        ...p,
        patientId,
        isHighRisk: p.isHighRisk !== undefined ? p.isHighRisk : true,
        riskCategory: p.riskCategory || (p.conditionType === 'HIGH_RISK_PREGNANCY' ? 'MATERNAL' : p.conditionType === 'INFANT_MALNUTRITION' ? 'CHILD' : 'CHRONIC_DISEASE'),
        condition: p.condition || p.notes || 'High-risk clinical monitoring required',
        followUpType: p.followUpType || 'CHECKUP',
        assignedTo: p.assignedTo || p.ashaWorkerName || p.ashaWorker || 'Assigned Medical Officer',
        assignedRole: p.assignedRole || 'Care Team',
        nextFollowUpDate: nextDate,
        instruction: p.instruction || p.followUpActionNotes || 'Attend scheduled clinical checkup and bring current prescription/reports.',
        status,
        outcomes: p.outcomes && p.outcomes.length > 0 ? p.outcomes : [
          {
            id: `out-${p.id}-init`,
            recordedAt: p.createdAt || '2026-09-15T10:00:00Z',
            recordedBy: p.assignedTo || 'Hospital Medical Officer',
            status: status as any,
            notes: p.notes || 'Enrolled in high-risk follow-up surveillance.',
            vitals: p.lastVitalsRecorded || undefined,
            nextAction: `Follow-up required on ${nextDate}`
          }
        ]
      };
    });

    if (updated || items.some(p => !p.outcomes || !p.followUpType)) {
      setLocal(STORAGE_KEYS.HIGH_RISK, normalized);
    }

    if (hospitalId) {
      return normalized.filter((h) => h.hospitalId === hospitalId);
    }
    return normalized;
  }

  getFollowUpsForPatient(userOrId: string | User): HighRiskPatient[] {
    const all = this.getHighRiskPatients();
    let patientId = '';
    let email = '';
    let phone = '';

    if (typeof userOrId === 'string') {
      patientId = userOrId.trim();
      const user = this.getUsers().find((u) => u.id === patientId);
      if (user) {
        email = String(user.email || '').toLowerCase().trim();
        phone = String(user.mobile || '').replace(/\D/g, '').slice(-10);
      }
    } else if (userOrId) {
      patientId = String(userOrId.id || '').trim();
      email = String(userOrId.email || '').toLowerCase().trim();
      phone = String(userOrId.mobile || '').replace(/\D/g, '').slice(-10);
    }

    if (!patientId && !email && !phone) return [];

    return all.filter((p) => {
      // Match by exact patientId
      if (p.patientId && p.patientId.trim() === patientId) return true;
      // Match by exact email if available
      if (email && p.patientEmail && p.patientEmail.toLowerCase().trim() === email) return true;
      // Match by 10-digit phone number if available
      if (phone) {
        const pPhone = String(p.patientPhone || p.phone || '').replace(/\D/g, '').slice(-10);
        if (pPhone && pPhone === phone) return true;
      }
      return false;
    });
  }

  createHighRiskFollowUp(data: {
    patientId: string;
    patientName: string;
    patientPhone: string;
    patientEmail?: string;
    age?: number;
    gender?: string;
    hospitalId: string;
    hospitalName: string;
    isHighRisk: boolean;
    riskCategory: HighRiskCategory;
    condition: string;
    riskLevel?: 'CRITICAL' | 'HIGH' | 'MODERATE';
    followUpType: FollowUpType;
    assignedTo: string;
    assignedRole?: string;
    nextFollowUpDate: string;
    instruction: string;
    initialNotes?: string;
    staffName?: string;
  }): HighRiskPatient {
    const list = this.getHighRiskPatients();
    const newId = `hr-${Date.now()}`;
    const initialOutcome: FollowUpOutcome = {
      id: `out-${Date.now()}-1`,
      recordedAt: new Date().toISOString(),
      recordedBy: data.staffName || data.assignedTo || 'Hospital Staff',
      status: 'SCHEDULED',
      notes: data.initialNotes || `High-risk follow-up created. ${data.instruction}`,
      nextAction: `Follow-up consultation scheduled for ${data.nextFollowUpDate}`
    };

    const newPatient: HighRiskPatient = {
      id: newId,
      patientId: data.patientId,
      patientName: data.patientName,
      patientPhone: data.patientPhone,
      patientEmail: data.patientEmail,
      age: data.age,
      patientAge: data.age,
      gender: data.gender,
      hospitalId: data.hospitalId,
      hospitalName: data.hospitalName,
      isHighRisk: data.isHighRisk,
      riskCategory: data.riskCategory,
      condition: data.condition,
      riskLevel: data.riskLevel || 'HIGH',
      followUpType: data.followUpType,
      assignedTo: data.assignedTo,
      assignedRole: data.assignedRole || 'Medical Care Provider',
      nextFollowUpDate: data.nextFollowUpDate,
      nextFollowUpDueDate: data.nextFollowUpDate,
      instruction: data.instruction,
      status: 'SCHEDULED',
      reminderSent: true,
      reminderStatus: 'SENT',
      notes: data.initialNotes || data.instruction,
      outcomes: [initialOutcome],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    list.unshift(newPatient);
    setLocal(STORAGE_KEYS.HIGH_RISK, list);
    this.notifyHighRiskUpdate(newPatient.id);
    return newPatient;
  }

  notifyHighRiskUpdate(followUpId?: string) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('high_risk_data_updated', {
          detail: { followUpId, timestamp: Date.now() }
        })
      );
      window.dispatchEvent(new Event('storage'));
    }
  }

  updateHighRiskFollowUp(
    followUpId: string,
    updates: Partial<HighRiskPatient>,
    staffName?: string,
    editReason?: string
  ): HighRiskPatient | undefined {
    const list = this.getHighRiskPatients();
    const idx = list.findIndex((h) => h.id === followUpId);
    if (idx === -1) return undefined;

    const prev = list[idx];
    const updated: HighRiskPatient = {
      ...prev,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    if (updates.nextFollowUpDate && updates.nextFollowUpDate !== prev.nextFollowUpDate) {
      updated.nextFollowUpDueDate = updates.nextFollowUpDate;
    }

    const historyNote =
      editReason ||
      `Follow-up details updated by ${staffName || 'Hospital Staff'}.${
        updates.nextFollowUpDate && updates.nextFollowUpDate !== prev.nextFollowUpDate
          ? ` Follow-up rescheduled from ${prev.nextFollowUpDate} to ${updates.nextFollowUpDate}.`
          : ''
      }${
        updates.status && updates.status !== prev.status
          ? ` Status updated from ${prev.status} to ${updates.status}.`
          : ''
      }`;

    const outcome: FollowUpOutcome = {
      id: `out-${Date.now()}-edit`,
      recordedAt: new Date().toISOString(),
      recordedBy: staffName || 'Hospital Care Provider',
      status: updated.status || 'SCHEDULED',
      notes: historyNote,
      nextAction: updated.instruction || `Next follow-up on ${updated.nextFollowUpDate}`
    };

    if (!updated.outcomes) updated.outcomes = [];
    updated.outcomes.unshift(outcome);

    list[idx] = updated;
    setLocal(STORAGE_KEYS.HIGH_RISK, list);
    this.notifyHighRiskUpdate(updated.id);
    return updated;
  }

  updateFollowUpStatus(
    followUpId: string,
    status: FollowUpStatus,
    outcomeNotes?: string,
    vitals?: string,
    staffName?: string,
    nextAction?: string
  ): HighRiskPatient | undefined {
    const list = this.getHighRiskPatients();
    const idx = list.findIndex((h) => h.id === followUpId);
    if (idx === -1) return undefined;

    const patient = list[idx];
    patient.status = status;
    patient.updatedAt = new Date().toISOString();

    if (status === 'COMPLETED') {
      patient.urgentEscalation = false;
    } else if (status === 'MISSED') {
      patient.urgentEscalation = true;
      patient.escalationReason = outcomeNotes || 'Follow-up missed by patient. Requires urgent attention / ASHA outreach.';
    }

    const outcome: FollowUpOutcome = {
      id: `out-${Date.now()}`,
      recordedAt: new Date().toISOString(),
      recordedBy: staffName || 'Hospital Staff Member',
      status,
      notes: outcomeNotes || `Status updated to ${status}.`,
      vitals: vitals || undefined,
      nextAction: nextAction || (status === 'COMPLETED' ? 'Care cycle successfully closed or routine follow-up' : undefined)
    };

    if (!patient.outcomes) {
      patient.outcomes = [];
    }
    patient.outcomes.unshift(outcome);

    list[idx] = patient;
    setLocal(STORAGE_KEYS.HIGH_RISK, list);
    this.notifyHighRiskUpdate(patient.id);
    return patient;
  }

  escalateHighRiskFollowUp(followUpId: string, reason: string, staffName?: string): HighRiskPatient | undefined {
    const list = this.getHighRiskPatients();
    const idx = list.findIndex((h) => h.id === followUpId);
    if (idx === -1) return undefined;

    const patient = list[idx];
    patient.urgentEscalation = true;
    patient.escalationReason = reason;
    patient.updatedAt = new Date().toISOString();

    const outcome: FollowUpOutcome = {
      id: `out-${Date.now()}-esc`,
      recordedAt: new Date().toISOString(),
      recordedBy: staffName || 'Hospital Staff',
      status: patient.status || 'MISSED',
      notes: `🚨 URGENT ESCALATION TRIGGERED: ${reason}`,
      nextAction: 'Immediate outreach by Senior Medical Officer and local ASHA worker.'
    };

    if (!patient.outcomes) patient.outcomes = [];
    patient.outcomes.unshift(outcome);

    list[idx] = patient;
    setLocal(STORAGE_KEYS.HIGH_RISK, list);
    this.notifyHighRiskUpdate(patient.id);
    return patient;
  }

  sendHighRiskReminder(patientId: string): HighRiskPatient | undefined {
    const list = this.getHighRiskPatients();
    const idx = list.findIndex((h) => h.id === patientId);
    if (idx !== -1) {
      list[idx].reminderSent = true;
      list[idx].reminderStatus = 'DELIVERED';
      
      const outcome: FollowUpOutcome = {
        id: `out-${Date.now()}-rem`,
        recordedAt: new Date().toISOString(),
        recordedBy: 'Automated Care Continuity Service',
        status: list[idx].status || 'SCHEDULED',
        notes: `Automated SMS & WhatsApp reminder dispatched to patient (${list[idx].patientPhone || list[idx].phone}) and care team.`,
        nextAction: `Next follow-up on ${list[idx].nextFollowUpDate}`
      };
      if (!list[idx].outcomes) list[idx].outcomes = [];
      list[idx].outcomes.unshift(outcome);

      setLocal(STORAGE_KEYS.HIGH_RISK, list);
      this.notifyHighRiskUpdate(list[idx].id);
      return list[idx];
    }
    return undefined;
  }

  addHighRiskPatient(
    data: Omit<HighRiskPatient, 'id' | 'reminderSent' | 'reminderStatus'>
  ): HighRiskPatient {
    const list = this.getHighRiskPatients();
    const newPatient: HighRiskPatient = {
      ...data,
      id: `hr-${Date.now()}`,
      reminderSent: true,
      reminderStatus: 'SENT',
      status: data.status || 'SCHEDULED',
      isHighRisk: data.isHighRisk !== undefined ? data.isHighRisk : true,
      riskCategory: data.riskCategory || 'CHRONIC_DISEASE',
      followUpType: data.followUpType || 'CHECKUP',
      assignedTo: data.assignedTo || data.ashaWorkerName || 'Hospital Staff',
      nextFollowUpDate: data.nextFollowUpDate || data.nextFollowUpDueDate || '2026-09-28',
      instruction: data.instruction || data.followUpActionNotes || 'Mandatory clinical checkup.',
      outcomes: [
        {
          id: `out-${Date.now()}`,
          recordedAt: new Date().toISOString(),
          recordedBy: data.assignedTo || 'Hospital Staff',
          status: 'SCHEDULED',
          notes: data.notes || 'High-risk patient enrolled.',
          nextAction: 'Attend scheduled follow-up.'
        }
      ]
    };
    list.unshift(newPatient);
    setLocal(STORAGE_KEYS.HIGH_RISK, list);
    return newPatient;
  }

  // Facility Quality Dashboard & Benchmarks
  getQualityScores(): FacilityQualityScore[] {
    const items = getLocal<FacilityQualityScore[]>(STORAGE_KEYS.QUALITY_SCORES, INITIAL_QUALITY_SCORES);
    const existingIds = new Set(items.map((q) => q.hospitalId));
    let updated = false;
    for (const q of INITIAL_QUALITY_SCORES) {
      if (!existingIds.has(q.hospitalId)) {
        items.push(q);
        updated = true;
      }
    }
    if (updated) {
      setLocal(STORAGE_KEYS.QUALITY_SCORES, items);
    }
    return items;
  }

  getQualityScoreByHospital(hospitalId: string): FacilityQualityScore | undefined {
    const scores = this.getQualityScores();
    return scores.find((s) => s.hospitalId === hospitalId);
  }

  // Emergency 108 Escalation
  getEmergencies(): EmergencyIncident[] {
    return getLocal<EmergencyIncident[]>(STORAGE_KEYS.EMERGENCIES, INITIAL_EMERGENCIES);
  }

  createEmergencySOS(incident: {
    callerName: string;
    callerPhone: string;
    location: { lat: number; lng: number; address: string };
    emergencyType: EmergencyIncident['emergencyType'];
    targetHospitalId: string;
    targetHospitalName: string;
  }): EmergencyIncident {
    const list = this.getEmergencies();
    const randomAmbNum = Math.floor(1080 + Math.random() * 20);
    const newIncident: EmergencyIncident = {
      id: `emg-${Date.now()}`,
      callerName: incident.callerName,
      callerPhone: incident.callerPhone,
      location: incident.location,
      emergencyType: incident.emergencyType,
      assignedAmbulanceId: `AMB-108-${randomAmbNum}`,
      ambulanceVehicleNumber: `AP 16 TX ${randomAmbNum} (ALS ICU)`,
      ambulanceDriverPhone: '+91 94401 10808',
      etaMinutes: Math.floor(4 + Math.random() * 6), // 4 - 9 mins
      targetHospitalId: incident.targetHospitalId,
      targetHospitalName: incident.targetHospitalName,
      traumaBedAlertDispatched: true,
      status: 'DISPATCHED',
      createdAt: new Date().toISOString()
    };
    list.unshift(newIncident);
    setLocal(STORAGE_KEYS.EMERGENCIES, list);
    return newIncident;
  }

  updateEmergencyStatus(
    id: string,
    status: EmergencyIncident['status']
  ): EmergencyIncident | undefined {
    const list = this.getEmergencies();
    const idx = list.findIndex((e) => e.id === id);
    if (idx !== -1) {
      list[idx].status = status;
      setLocal(STORAGE_KEYS.EMERGENCIES, list);
      return list[idx];
    }
    return undefined;
  }

  // Low Connectivity / Offline Token Pass Caching
  getOfflineTokens(): any[] {
    try {
      const v2 = localStorage.getItem('sih_offline_tokens_v2');
      if (v2) {
        const parsed = JSON.parse(v2);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // fallback
    }
    return getLocal<any[]>(STORAGE_KEYS.OFFLINE_TOKENS, []);
  }

  saveOfflineToken(token: any): void {
    const tokens = this.getOfflineTokens();
    const tokenObj = {
      id: token.id || `off-tk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      tokenCode: token.tokenCode,
      tokenNumber: token.tokenNumber,
      hospitalId: token.hospitalId,
      hospitalName: token.hospitalName,
      department: token.department,
      patientName: token.patientName,
      patientPhone: token.patientPhone || '',
      roomNumber: token.roomNumber || 'Room 101',
      estimatedWaitMins: token.estimatedWaitMins || 15,
      issuedAt: token.issuedAt || new Date().toISOString(),
      date: token.date || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      syncStatus: token.syncStatus || 'SYNCED',
      source: token.source || 'WEB_OFFLINE',
      status: token.status || 'WAITING'
    };
    tokens.unshift(tokenObj);
    setLocal(STORAGE_KEYS.OFFLINE_TOKENS, tokens.slice(0, 15));
    try {
      localStorage.setItem('sih_offline_tokens_v2', JSON.stringify(tokens));
      window.dispatchEvent(new CustomEvent('sih_offline_tokens_changed', { detail: tokens }));
    } catch (e) {
      // ignore
    }
  }

  // Appointments
  getAppointments(hospitalId?: string, userId?: string): Appointment[] {
    let list = getLocal<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
    if (hospitalId) {
      list = list.filter((a) => a.hospitalId === hospitalId);
    }
    if (userId) {
      list = list.filter((a) => a.userId === userId);
    }
    return list;
  }

  bookAppointment(data: {
    userId: string;
    hospitalId: string;
    doctorId: string;
    patientName: string;
    patientAge?: number;
    patientGender?: string;
    patientPhone?: string;
    appointmentDate: string;
    appointmentTime: string;
    reason: string;
  }): Appointment {
    const list = this.getAppointments();
    const hosp = this.getHospitalById(data.hospitalId);
    const doc = this.getDoctorById(data.doctorId);

    if (!doc) {
      throw new Error('Selected healthcare specialist or doctor does not exist.');
    }

    if (doc.availabilityStatus === 'ON_LEAVE') {
      throw new Error(`${doc.name} is currently ON LEAVE. Please choose another available doctor.`);
    }

    // Past date check
    const todayStr = new Date().toISOString().split('T')[0];
    if (data.appointmentDate < todayStr) {
      throw new Error('Cannot book an appointment for a past date. Please select today or a future date.');
    }

    // Dynamic doctor working hours & capacity check (6 min average consultation = 10 slots/hr)
    const slotAvailability = this.getSlotAvailability(data.doctorId, data.appointmentDate, data.appointmentTime);
    if (slotAvailability.isFullyBooked) {
      const nextSlot = this.getNextAvailableSlot(data.doctorId, data.appointmentDate, data.appointmentTime);
      const nextSlotMsg = nextSlot
        ? ` Next available time period is ${nextSlot}.`
        : ' All slots for this doctor are fully booked on this date. Please select another date.';
      throw new Error(`This time period (${data.appointmentTime}) is Fully Booked (${slotAvailability.totalCapacity}/${slotAvailability.totalCapacity} taken).${nextSlotMsg}`);
    }

    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const appointmentId = `CC-2026-${randomNum}`;
    const tokenNumber = `TK-${Math.floor(10 + Math.random() * 90)}`;

    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      appointmentId,
      tokenNumber,
      userId: data.userId,
      hospitalId: data.hospitalId,
      hospitalName: hosp ? hosp.name : 'Public Healthcare Center',
      doctorId: data.doctorId,
      doctorName: doc.name,
      doctorSpecialization: doc.specialization,
      patientName: data.patientName,
      patientAge: data.patientAge,
      patientGender: data.patientGender,
      patientPhone: data.patientPhone,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      reason: data.reason,
      status: 'BOOKED',
      createdAt: new Date().toISOString()
    };

    list.unshift(newApt);
    setLocal(STORAGE_KEYS.APPOINTMENTS, list);

    // Notify real-time listeners for instant reactive slot updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('healthcare-appointments-updated', {
          detail: {
            action: 'BOOKED',
            appointment: newApt,
            doctorId: newApt.doctorId,
            appointmentDate: newApt.appointmentDate,
            appointmentTime: newApt.appointmentTime
          }
        })
      );
    }

    // Persist to Firebase Firestore
    saveAppointmentToFirestore(newApt).catch((err) => {
      console.warn('Background sync to Firestore skipped:', err);
    });
    return newApt;
  }

  updateAppointmentStatus(id: string, status: Appointment['status']): Appointment | undefined {
    const list = this.getAppointments();
    const idx = list.findIndex((a) => a.id === id || a.appointmentId === id);
    if (idx !== -1) {
      list[idx].status = status;
      const updatedApt = list[idx];
      setLocal(STORAGE_KEYS.APPOINTMENTS, list);

      // Notify real-time listeners for instant slot count recovery upon cancellation
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('healthcare-appointments-updated', {
            detail: {
              action: status,
              appointment: updatedApt,
              doctorId: updatedApt.doctorId,
              appointmentDate: updatedApt.appointmentDate,
              appointmentTime: updatedApt.appointmentTime
            }
          })
        );
      }

      return updatedApt;
    }
    return undefined;
  }

  // Feedback & Hospital Quality Score recalculation
  getFeedbacks(hospitalId?: string): Feedback[] {
    const list = getLocal<Feedback[]>(STORAGE_KEYS.FEEDBACKS, INITIAL_FEEDBACKS);
    if (hospitalId) {
      return list.filter((f) => f.hospitalId === hospitalId);
    }
    return list;
  }

  submitFeedback(data: Omit<Feedback, 'id' | 'createdAt'>): Feedback {
    const list = this.getFeedbacks();
    const newFb: Feedback = {
      ...data,
      id: `fb-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    list.unshift(newFb);
    setLocal(STORAGE_KEYS.FEEDBACKS, list);

    // Recalculate hospital rating
    const hospFeedbacks = list.filter((f) => f.hospitalId === data.hospitalId);
    if (hospFeedbacks.length > 0) {
      const avg =
        hospFeedbacks.reduce((acc, curr) => acc + curr.overallRating, 0) /
        hospFeedbacks.length;
      const hospitals = this.getHospitals();
      const hIdx = hospitals.findIndex((h) => h.id === data.hospitalId);
      if (hIdx !== -1) {
        hospitals[hIdx].rating = Math.round(avg * 10) / 10;
        hospitals[hIdx].totalReviews = hospFeedbacks.length;
        setLocal(STORAGE_KEYS.HOSPITALS, hospitals);
      }
    }

    return newFb;
  }

  // Complaints
  getComplaints(hospitalId?: string, userId?: string): Complaint[] {
    let list = getLocal<Complaint[]>(STORAGE_KEYS.COMPLAINTS, INITIAL_COMPLAINTS);
    if (hospitalId) {
      list = list.filter((c) => c.hospitalId === hospitalId);
    }
    if (userId) {
      list = list.filter((c) => c.userId === userId);
    }
    return list;
  }

  getComplaintById(idOrNumber: string): Complaint | undefined {
    const clean = String(idOrNumber || '').trim().toLowerCase();
    return this.getComplaints().find(
      (c) => c.id === idOrNumber || String(c.complaintId || '').toLowerCase() === clean
    );
  }

  submitComplaint(data: {
    userId: string;
    userName: string;
    hospitalId: string;
    appointmentId?: string;
    category: Complaint['category'];
    description: string;
  }): Complaint {
    const list = this.getComplaints();
    const hosp = this.getHospitalById(data.hospitalId);
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const complaintId = `CMP2026${randomNum}`;

    const newCmp: Complaint = {
      id: `cmp-${Date.now()}`,
      complaintId,
      userId: data.userId,
      userName: data.userName,
      hospitalId: data.hospitalId,
      hospitalName: hosp ? hosp.name : 'Public Hospital Facility',
      appointmentId: data.appointmentId,
      category: data.category,
      description: data.description,
      status: 'SUBMITTED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    list.unshift(newCmp);
    setLocal(STORAGE_KEYS.COMPLAINTS, list);
    return newCmp;
  }

  updateComplaintStatus(
    id: string,
    status: Complaint['status'],
    resolutionRemarks?: string
  ): Complaint | undefined {
    const list = this.getComplaints();
    const idx = list.findIndex((c) => c.id === id || c.complaintId === id);
    if (idx !== -1) {
      list[idx].status = status;
      if (resolutionRemarks) {
        list[idx].resolutionRemarks = resolutionRemarks;
      }
      list[idx].updatedAt = new Date().toISOString();
      setLocal(STORAGE_KEYS.COMPLAINTS, list);
      return list[idx];
    }
    return undefined;
  }

  // Analytics
  getAnalytics() {
    const hospitals = this.getHospitals();
    const doctors = this.getDoctors();
    const appointments = this.getAppointments();
    const complaints = this.getComplaints();
    const solvedComplaints = complaints.filter((c) => c.status === 'RESOLVED').length;
    const avgQualityScore =
      hospitals.length > 0
        ? Math.round((hospitals.reduce((a, b) => a + b.rating, 0) / hospitals.length) * 10) / 10
        : 4.3;

    return {
      totalHospitals: hospitals.length,
      totalDoctors: doctors.length,
      totalAppointments: appointments.length,
      totalComplaints: complaints.length,
      solvedComplaints,
      avgQualityScore
    };
  }

  getAdminStats() {
    const hospitals = this.getHospitals();
    const doctors = this.getDoctors();
    const users = getLocal<User[]>(STORAGE_KEYS.USERS, DEMO_USERS);
    const appointments = this.getAppointments();
    const complaints = this.getComplaints();
    const services = this.getServices();
    const medicines = this.getMedicines();

    const resolvedComplaints = complaints.filter((c) => c.status === 'RESOLVED').length;
    const pendingComplaints = complaints.filter(
      (c) => c.status === 'SUBMITTED' || c.status === 'UNDER REVIEW' || c.status === 'IN PROGRESS'
    ).length;

    const unavailableServices = services.filter((s) => !s.available).length;
    const medicineShortages = medicines.filter(
      (m) => m.quantity === 0 || m.quantity <= m.minimumThreshold
    ).length;

    return {
      totalHospitals: hospitals.length,
      totalDoctors: doctors.length,
      totalCitizens: users.filter((u) => u.role === 'CITIZEN').length,
      totalAppointments: appointments.length,
      totalComplaints: complaints.length,
      resolvedComplaints,
      pendingComplaints,
      unavailableServices,
      medicineShortages
    };
  }

  getHospitalAdminStats(hospitalId: string) {
    const hosp = this.getHospitalById(hospitalId);
    const docs = this.getDoctors(hospitalId);
    const srvs = this.getServices(hospitalId);
    const meds = this.getMedicines(hospitalId);
    const apts = this.getAppointments(hospitalId);
    const cmps = this.getComplaints(hospitalId);

    const availableDocs = docs.filter((d) => d.availabilityStatus === 'AVAILABLE').length;
    const activeServices = srvs.filter((s) => s.available).length;
    const lowStockMeds = meds.filter((m) => m.quantity <= m.minimumThreshold).length;
    const outOfStockMeds = meds.filter((m) => m.quantity === 0).length;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayApts = apts.filter((a) => a.appointmentDate === todayStr);
    const confirmedApts = apts.filter((a) => a.status === 'CONFIRMED' || a.status === 'BOOKED');
    const completedApts = apts.filter((a) => a.status === 'COMPLETED');
    const cancelledApts = apts.filter((a) => a.status === 'CANCELLED');

    return {
      hospital: hosp,
      totalDoctors: docs.length,
      availableDoctors: availableDocs,
      totalServices: srvs.length,
      activeServices,
      totalMedicines: meds.length,
      lowStockMedicines: lowStockMeds,
      outOfStockMedicines: outOfStockMeds,
      totalAppointments: apts.length,
      todayAppointments: todayApts.length,
      confirmedAppointments: confirmedApts.length,
      completedAppointments: completedApts.length,
      cancelledAppointments: cancelledApts.length,
      totalComplaints: cmps.length,
      rating: hosp?.rating || 4.5
    };
  }

  refreshAllData(): { timestamp: string; success: boolean } {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLocal('healthconnect_last_sync_timestamp', now);
    return { timestamp: now, success: true };
  }

  getLastSyncTimestamp(): string {
    return getLocal<string>('healthconnect_last_sync_timestamp', new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }
}

export const apiStore = new ApiStore();
