import { PatientReferral, User } from '../types';

export type CanonicalReferralStatus = 'Pending' | 'Accepted' | 'In Progress' | 'Completed' | 'Rejected';

export function normalizeReferralStatus(status?: string): CanonicalReferralStatus {
  if (!status) return 'Pending';
  const s = status.trim().toUpperCase();
  if (s === 'PENDING' || s === 'INITIATED') return 'Pending';
  if (s === 'ACCEPTED') return 'Accepted';
  if (s === 'IN_PROGRESS' || s === 'IN PROGRESS' || s === 'EN_ROUTE' || s === 'ADMITTED') return 'In Progress';
  if (s === 'COMPLETED') return 'Completed';
  if (s === 'REJECTED' || s === 'CANCELLED') return 'Rejected';
  if (status === 'Pending' || status === 'Accepted' || status === 'In Progress' || status === 'Completed' || status === 'Rejected') {
    return status;
  }
  return 'Pending';
}

export interface ReferralJourneyStep {
  key: CanonicalReferralStatus;
  title: string;
  subtitle: string;
  stepNumber: number;
  step?: number;
}

export const REFERRAL_JOURNEY_STEPS: ReferralJourneyStep[] = [
  {
    key: 'Pending',
    title: 'Pending',
    subtitle: 'Referral submitted; awaiting intake clearance & bed confirmation',
    stepNumber: 1,
    step: 1
  },
  {
    key: 'Accepted',
    title: 'Accepted',
    subtitle: 'Receiving hospital accepted referral & allocated specialist bed',
    stepNumber: 2,
    step: 2
  },
  {
    key: 'In Progress',
    title: 'In Progress',
    subtitle: 'Patient en-route / clinical transfer triage in progress',
    stepNumber: 3,
    step: 3
  },
  {
    key: 'Completed',
    title: 'Completed',
    subtitle: 'Tertiary consultation concluded & admission / discharge finalized',
    stepNumber: 4,
    step: 4
  }
];

export const REFERRAL_STAGES = REFERRAL_JOURNEY_STEPS;

export interface RegisteredPatientInfo {
  id: string;
  name: string;
  mobile: string;
  email: string;
  age: number;
  gender: 'Female' | 'Male' | 'Other';
}

export const REGISTERED_PATIENTS: RegisteredPatientInfo[] = [
  { id: 'user-google-salma', name: 'Shaik Salma', mobile: '9849112501', email: 'shaiksalma1125@gmail.com', age: 28, gender: 'Female' },
  { id: 'user-citizen-1', name: 'Rajesh Kumar Verma', mobile: '9848022334', email: 'citizen@healthcare.gov.in', age: 42, gender: 'Male' },
  { id: 'user-citizen-a', name: 'Citizen A (Ananya Sharma)', mobile: '9849221101', email: 'citizena@healthcare.gov.in', age: 29, gender: 'Female' },
  { id: 'user-citizen-b', name: 'Citizen B (Bhavani Prasad)', mobile: '9849332202', email: 'citizenb@healthcare.gov.in', age: 52, gender: 'Male' }
];

export function createCitizenUserFromPatient(patient: RegisteredPatientInfo): User {
  return {
    id: patient.id,
    name: patient.name,
    email: patient.email,
    mobile: patient.mobile,
    role: 'CITIZEN',
    location: 'Vijayawada Urban, NTR District',
    district: 'NTR',
    state: 'Andhra Pradesh',
    createdAt: '2026-01-15'
  };
}

export function getReferralStepIndex(status?: string): number {
  const norm = normalizeReferralStatus(status);
  switch (norm) {
    case 'Pending':
      return 0;
    case 'Accepted':
      return 1;
    case 'In Progress':
      return 2;
    case 'Completed':
      return 3;
    case 'Rejected':
      return -1;
    default:
      return 0;
  }
}

export function getNextReferralStatus(currentStatus: string): CanonicalReferralStatus {
  const norm = normalizeReferralStatus(currentStatus);
  switch (norm) {
    case 'Pending':
      return 'Accepted';
    case 'Accepted':
      return 'In Progress';
    case 'In Progress':
      return 'Completed';
    case 'Completed':
      return 'Completed';
    case 'Rejected':
      return 'Rejected';
    default:
      return 'Accepted';
  }
}

/**
 * Checks if a referral belongs strictly to the given citizen user for patient privacy.
 * Entirely dynamic: matches against the citizen's unique user/patient ID.
 * Works dynamically for any citizen account without hardcoding any patient names.
 *
 * Example:
 * If Hospital Staff creates a referral for Citizen A, only Citizen A sees it.
 * If Hospital Staff creates another referral for Citizen B, only Citizen B sees it.
 */
export function isReferralForUser(referral: PatientReferral, user: User | null | undefined): boolean {
  if (!user || !user.id) return false;

  // 1. Primary Authority: Match by unique patient / user ID
  if (referral.patientId && String(referral.patientId).trim() !== '') {
    return String(referral.patientId).trim() === String(user.id).trim();
  }

  // 2. Secondary fallback (only when referral has no patientId set):
  // Match strictly by email
  if (user.email && referral.patientEmail) {
    const uEmail = String(user.email).toLowerCase().trim();
    const rEmail = String(referral.patientEmail).toLowerCase().trim();
    if (uEmail && rEmail && uEmail === rEmail) {
      return true;
    }
  }

  // Match strictly by 10-digit mobile number
  if (user.mobile && referral.patientPhone) {
    const userDigits = String(user.mobile).replace(/\D/g, '').slice(-10);
    const refDigits = String(referral.patientPhone).replace(/\D/g, '').slice(-10);
    if (userDigits.length === 10 && refDigits.length === 10 && userDigits === refDigits) {
      return true;
    }
  }

  return false;
}
