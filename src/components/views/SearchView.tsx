import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  MapPin,
  Filter,
  Stethoscope,
  Activity,
  Pill,
  Star,
  CheckCircle2,
  XCircle,
  AlertCircle,
  SlidersHorizontal,
  Navigation,
  Clock,
  Mic,
  Sparkles,
  Building2,
  Calendar,
  Video,
  ShieldCheck,
  ChevronRight,
  TestTube
} from 'lucide-react';
import {
  Hospital,
  Doctor,
  HospitalService,
  MedicineStock,
  DiagnosticService,
  LanguageCode
} from '../../types';
import { translations } from '../../utils/translations';
import { apiStore, calculateDistance } from '../../services/apiStore';
import { useSpeechRecognition } from '../../utils/useSpeechRecognition';
import { findMatchingLocation, KNOWN_LOCATIONS, GeographicLocation } from '../../data/locations';

// Specialty mapping to catch specialist terms (e.g., "Cardiologist" -> "Cardiology")
const SPECIALTY_DICTIONARY: Record<string, { roots: string[]; label: string }> = {
  cardiology: {
    roots: ['cardio', 'heart', 'cardiac', 'cath lab', 'angio'],
    label: 'Cardiology (Heart Specialist)'
  },
  pediatrics: {
    roots: ['pediatr', 'paediatr', 'child', 'infant', 'neonat', 'dch'],
    label: 'Pediatrics (Child Specialist)'
  },
  gynecology: {
    roots: ['gynec', 'gynaec', 'obstetric', 'maternal', 'delivery', 'labour', 'dgo', 'obgyn', 'pregnancy', 'women'],
    label: 'Gynecology & Obstetrics'
  },
  orthopedics: {
    roots: ['ortho', 'bone', 'joint', 'fracture', 'spine', 'trauma'],
    label: 'Orthopedics (Bone & Joint)'
  },
  neurology: {
    roots: ['neuro', 'brain', 'spine', 'stroke'],
    label: 'Neurology & Neurosurgery'
  },
  dermatology: {
    roots: ['derma', 'skin', 'leprosy'],
    label: 'Dermatology (Skin Specialist)'
  },
  radiology: {
    roots: ['radiolog', 'sonolog', 'sonograph', 'radio diagnosis'],
    label: 'Radiology & Imaging Specialist'
  },
  dentistry: {
    roots: ['dent', 'teeth', 'tooth', 'oral', 'bds', 'mds'],
    label: 'Dental Care'
  },
  ophthalmology: {
    roots: ['ophthalm', 'eye specialist', 'eye doctor', 'vision', 'cataract', 'eye'],
    label: 'Ophthalmology (Eye Specialist)'
  },
  nephrology: {
    roots: ['nephro', 'kidney', 'renal care'],
    label: 'Nephrology (Kidney Care)'
  },
  pulmonology: {
    roots: ['pulmo', 'chest', 'respiratory', 'lungs', 'tb', 'asthma'],
    label: 'Pulmonology (Chest & Lungs)'
  },
  ent: {
    roots: ['ent', 'ear', 'nose', 'throat', 'otolaryng'],
    label: 'ENT (Ear, Nose & Throat)'
  },
  general: {
    roots: ['general physician', 'general medicine', 'physician', 'medical officer', 'family medicine', 'general opd'],
    label: 'General Medicine / Physician'
  },
  surgery: {
    roots: ['surgeon', 'surgery', 'surgical'],
    label: 'General Surgery'
  },
  pathology: {
    roots: ['pathol', 'pathologist'],
    label: 'Pathology & Diagnostic Medicine'
  },
  transfusion: {
    roots: ['transfusion', 'blood bank officer'],
    label: 'Transfusion Medicine'
  }
};

// Service mapping to catch diagnostic/clinical services (e.g. "X-Ray", "MRI", "Dialysis")
const SERVICE_DICTIONARY: Record<string, { roots: string[]; label: string }> = {
  xray: {
    roots: ['xray', 'x ray', 'x-ray', 'radiography', 'digital x-ray', 'digital xray'],
    label: 'Digital X-Ray'
  },
  mri: {
    roots: ['mri', 'magnetic resonance', '3t mri'],
    label: 'MRI Scan'
  },
  ct: {
    roots: ['ct scan', 'ct', 'computed tomography'],
    label: 'CT Scan'
  },
  ultrasound: {
    roots: ['ultrasound', 'sonography', 'usg', 'doppler'],
    label: 'Ultrasound & Sonography'
  },
  dialysis: {
    roots: ['dialysis', 'hemodialysis', 'renal care'],
    label: 'Dialysis Unit'
  },
  emergency: {
    roots: ['emergency', 'trauma', 'casualty', 'resuscitation', '24x7 emergency', 'accident care'],
    label: '24x7 Emergency & Trauma Care'
  },
  icu: {
    roots: ['icu', 'nicu', 'ccu', 'intensive care', 'critical care'],
    label: 'ICU / Critical Care'
  },
  bloodbank: {
    roots: ['blood bank', 'blood storage', 'transfusion service', 'blood component', 'blood donation'],
    label: 'Blood Bank & Transfusion'
  },
  lab: {
    roots: ['pathology lab', 'biochemistry', 'blood test', 'diagnostic test', 'pathology and lab', 'pathology & lab', 'laboratory'],
    label: 'Pathology & Diagnostic Lab'
  },
  pharmacy: {
    roots: ['pharmacy', 'jan aushadhi', 'dispensary', 'medicine counter', 'essential drug', 'drug dispensing'],
    label: 'Pharmacy & Drug Dispensing'
  },
  ambulance: {
    roots: ['ambulance', '108 ambulance', 'als ambulance', 'emergency ambulance'],
    label: 'Ambulance Service (108)'
  },
  maternity: {
    roots: ['labour ward', 'maternity ward', 'delivery ward', 'antenatal clinic', 'maternal care'],
    label: 'Labour Ward & Maternity'
  },
  ot: {
    roots: ['operation theatre', 'minor ot', 'surgical suites'],
    label: 'Operation Theatre'
  }
};

// Complete mapping of all hospital identifiers, acronyms, and aliases for exact matching
const HOSPITAL_ALIASES: Record<string, string[]> = {
  'hosp-aiims': [
    'aiims',
    'aiims mangalagiri',
    'all india institute of medical sciences',
    'aiims hospital',
    'aiims super specialty',
    'all india institute of medical sciences aiims mangalagiri'
  ],
  'hosp-1': [
    'ggh',
    'ggh vijayawada',
    'government general hospital',
    'government general hospital vijayawada',
    'government general hospital ggh vijayawada',
    'old jail road hospital'
  ],
  'hosp-2': [
    'chc gannavaram',
    'gannavaram chc',
    'gannavaram hospital',
    'community health centre gannavaram',
    'community health centre chc gannavaram'
  ],
  'hosp-3': [
    'phc vuyyuru',
    'vuyyuru phc',
    'vuyyuru rural phc',
    'vuyyuru hospital',
    'primary health centre vuyyuru',
    'primary health centre phc vuyyuru rural'
  ],
  'hosp-4': [
    'area hospital mangalagiri',
    'mangalagiri area hospital',
    'government area hospital mangalagiri',
    'government area hospital'
  ],
  'hosp-5': [
    'district headquarters hospital',
    'district headquarters hospital guntur',
    'guntur hospital',
    'guntur district hospital',
    'district hospital guntur',
    'guntur urban hospital'
  ],
  'hosp-6': [
    'phc ibrahimpatnam',
    'ibrahimpatnam phc',
    'ibrahimpatnam hospital',
    'primary health centre ibrahimpatnam',
    'primary health centre phc ibrahimpatnam'
  ],
  'hosp-7': [
    'sub district hospital nuzvid',
    'nuzvid hospital',
    'nuzvid sub district hospital',
    'sub district hospital'
  ],
  'hosp-8': [
    'chc tenali',
    'tenali chc',
    'tenali rural chc',
    'tenali hospital',
    'community health centre tenali',
    'community health centre chc tenali rural'
  ],
  'hosp-9': [
    'area hospital gudivada',
    'gudivada hospital',
    'gudivada area hospital',
    'government area hospital gudivada'
  ],
  'hosp-10': [
    'rampachodavaram',
    'remote tribal health centre',
    'tribal health centre',
    'rampachodavaram hospital',
    'tribal health centre rampachodavaram'
  ],
  'hosp-velavadam': [
    'phc velavadam',
    'velavadam phc',
    'velavadam hospital',
    'primary health centre velavadam',
    'primary health centre phc velavadam'
  ],
  'hosp-kondapalli': [
    'chc kondapalli',
    'kondapalli chc',
    'kondapalli hospital',
    'community health centre kondapalli',
    'community health centre chc kondapalli'
  ],
  'hosp-diag-1': [
    'public diagnostic centre',
    'pathology lab vijayawada',
    'diagnostic centre vijayawada',
    'public diagnostic centre pathology lab vijayawada',
    'diagnostic centre',
    'public diagnostic'
  ]
};

function normalizeText(text: any): string {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface ScoredHospitalItem {
  hosp: Hospital & { distance?: number };
  score: number;
  matched: boolean;
  matchType?: 'exact_name' | 'doctor' | 'specialist' | 'service' | 'location' | 'medicine' | 'general';
  matchDetail?: string;
  relativeDistanceLabel?: string;
  distanceFromLocation?: number;
}

interface SearchViewProps {
  initialQuery?: string;
  initialType?: string;
  hospitals: (Hospital & { distance?: number })[];
  userCoords: { lat: number; lng: number } | null;
  onNavigate: (view: string, payload?: any) => void;
  language: LanguageCode;
}

export const SearchView: React.FC<SearchViewProps> = ({
  initialQuery = '',
  initialType = 'all',
  hospitals,
  userCoords,
  onNavigate,
  language
}) => {
  // Two state layers:
  // searchInput: what user currently sees/types in the search input
  // activeQuery: the active query used for result computation
  const [searchInput, setSearchInput] = useState(initialQuery || '');
  const [activeQuery, setActiveQuery] = useState(initialQuery || '');

  // Search category tab: 'hospitals' | 'doctors' | 'medicines' | 'services'
  const [activeTab, setActiveTab] = useState<'hospitals' | 'doctors' | 'medicines' | 'services'>(() => {
    const raw = String(initialType || '').toLowerCase();
    if (raw.includes('doc')) return 'doctors';
    if (raw.includes('med')) return 'medicines';
    if (raw.includes('serv')) return 'services';
    return 'hospitals';
  });

  // Hospital filters
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>('All');
  const [maxDistance, setMaxDistance] = useState<number>(50);
  const [onlyEmergency, setOnlyEmergency] = useState<boolean>(false);
  const [minRating, setMinRating] = useState<number>(0);

  // Doctor filters
  const [doctorSpecializationFilter, setDoctorSpecializationFilter] = useState<string>('All');
  const [doctorHospitalFilter, setDoctorHospitalFilter] = useState<string>('All');
  const [doctorAvailabilityFilter, setDoctorAvailabilityFilter] = useState<string>('All');
  const [doctorDistrictFilter, setDoctorDistrictFilter] = useState<string>('All');

  // Medicine filters
  const [medicineHospitalFilter, setMedicineHospitalFilter] = useState<string>('All');
  const [medicineStatusFilter, setMedicineStatusFilter] = useState<string>('All');
  const [medicineCategoryFilter, setMedicineCategoryFilter] = useState<string>('All');

  // Service filters
  const [serviceHospitalFilter, setServiceHospitalFilter] = useState<string>('All');
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<string>('All');

  const t = translations[language];

  // Sync state if initialQuery or initialType prop changes
  useEffect(() => {
    if (initialQuery !== undefined) {
      setSearchInput(initialQuery);
      setActiveQuery(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    if (initialType) {
      const raw = String(initialType || '').toLowerCase();
      if (raw.includes('doc')) {
        setActiveTab('doctors');
      } else if (raw.includes('med')) {
        setActiveTab('medicines');
      } else if (raw.includes('serv')) {
        setActiveTab('services');
      } else if (raw === 'hospitals' || raw === 'all') {
        setActiveTab('hospitals');
      } else {
        setSelectedType(initialType);
      }
    }
  }, [initialType]);

  // Handle typing: updates input and live query instantly
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);
    setActiveQuery(val);
  };

  // Explicit Search submit (form submit or Search button click)
  // Guarantees no page refresh via e.preventDefault() and replaces previous results immediately
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActiveQuery(searchInput.trim());
  };

  // Clear query helper
  const handleClearSearch = () => {
    setSearchInput('');
    setActiveQuery('');
  };

  // Real-time synchronization state across staff portal changes
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    const handleDataUpdate = () => {
      setDataVersion((v) => v + 1);
    };
    window.addEventListener('healthcare-data-updated', handleDataUpdate);
    window.addEventListener('healthcare-doctors-updated', handleDataUpdate);
    window.addEventListener('healthcare-medicines-updated', handleDataUpdate);
    window.addEventListener('healthcare-services-updated', handleDataUpdate);
    window.addEventListener('healthcare-appointments-updated', handleDataUpdate);
    window.addEventListener('storage', handleDataUpdate);
    return () => {
      window.removeEventListener('healthcare-data-updated', handleDataUpdate);
      window.removeEventListener('healthcare-doctors-updated', handleDataUpdate);
      window.removeEventListener('healthcare-medicines-updated', handleDataUpdate);
      window.removeEventListener('healthcare-services-updated', handleDataUpdate);
      window.removeEventListener('healthcare-appointments-updated', handleDataUpdate);
      window.removeEventListener('storage', handleDataUpdate);
    };
  }, []);

  // Complete hospital dataset directly from apiStore (ensuring complete data, not just hardcoded/sample)
  const completeHospitals = useMemo(() => {
    const storeHospitals = apiStore.getHospitals();
    return storeHospitals.map((h) => {
      let dist: number | undefined;
      const propHosp = hospitals.find((p) => p.id === h.id);
      if (propHosp && propHosp.distance !== undefined) {
        dist = propHosp.distance;
      } else if (userCoords) {
        dist = calculateDistance(userCoords.lat, userCoords.lng, h.latitude, h.longitude);
      }
      return { ...h, distance: dist };
    });
  }, [hospitals, userCoords, dataVersion]);

  const allDoctors = useMemo(() => apiStore.getDoctors(), [dataVersion]);
  const allServices = useMemo(() => apiStore.getServices(), [dataVersion]);
  const allMedicines = useMemo(() => apiStore.getMedicines(), [dataVersion]);
  const allDiagnostics = useMemo(() => apiStore.getDiagnostics(), [dataVersion]);

  const specializations = useMemo(() => {
    const set = new Set<string>();
    allDoctors.forEach((d) => set.add(d.specialization));
    return ['All', ...Array.from(set)];
  }, [allDoctors]);

  const medicineCategories = useMemo(() => {
    const set = new Set<string>();
    allMedicines.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return ['All', ...Array.from(set)];
  }, [allMedicines]);

  const allDistricts = useMemo(() => {
    const set = new Set<string>();
    completeHospitals.forEach((h) => {
      if (h.district) set.add(h.district);
    });
    return ['All', ...Array.from(set)];
  }, [completeHospitals]);

  const hospitalTypes = useMemo(() => {
    const set = new Set<string>();
    completeHospitals.forEach((h) => {
      if (h.hospitalType) set.add(h.hospitalType);
    });
    return ['All', ...Array.from(set)];
  }, [completeHospitals]);

  const { isListening, startListening } = useSpeechRecognition((transcript) => {
    setSearchInput(transcript);
    setActiveQuery(transcript);
  });

  // Detect location only when query is specifically targeting a location
  // (prevents location banner appearing for hospital names, doctors, or services)
  const detectedLocation = useMemo<GeographicLocation | null>(() => {
    const q = activeQuery.trim();
    if (!q) return null;
    const qNorm = normalizeText(q);

    // If query matches any exact hospital alias or acronym, suppress location banner
    const isHospitalAlias = Object.values(HOSPITAL_ALIASES).some((aliases) =>
      aliases.some((al) => qNorm === al || (qNorm.length >= 4 && al.startsWith(qNorm)))
    );
    if (isHospitalAlias) {
      return null;
    }

    // If query targets a hospital name keyword, doctor, specialist, or service, suppress location banner
    const facilityKeywords = [
      'hospital', 'phc', 'chc', 'uphc', 'centre', 'center', 'clinic', 'kendra',
      'bank', 'institute', 'aiims', 'ggh', 'primary health', 'community health',
      'area hospital', 'sub district', 'district hospital', 'super specialty', 'diagnostic'
    ];
    if (facilityKeywords.some((fk) => qNorm.includes(fk))) {
      return null;
    }

    const cleanDocQuery = String(qNorm || '').replace(/\b(dr|doctor)\b/g, '').trim();
    if (cleanDocQuery.length >= 3 && allDoctors.some((d) => normalizeText(d.name).includes(cleanDocQuery))) {
      return null;
    }

    if (Object.values(SPECIALTY_DICTIONARY).some((s) => s.roots.some((r) => qNorm.includes(r)))) {
      return null;
    }

    if (Object.values(SERVICE_DICTIONARY).some((s) => s.roots.some((r) => qNorm.includes(r)))) {
      return null;
    }

    const directMatch = findMatchingLocation(q);
    if (directMatch) return directMatch;

    const known = KNOWN_LOCATIONS.find((l) => {
      const lNorm = normalizeText(l.name);
      return lNorm === qNorm || lNorm.includes(qNorm) || (qNorm.length >= 4 && qNorm.includes(lNorm));
    });
    if (known) return known;

    for (const h of completeHospitals) {
      const vNorm = normalizeText(h.village);
      const mNorm = normalizeText(h.mandal);
      if (vNorm === qNorm || (qNorm.length >= 4 && (vNorm.includes(qNorm) || mNorm.includes(qNorm)))) {
        return {
          name: h.village,
          type: 'Village',
          district: h.district,
          state: h.state,
          pincode: h.pincode,
          latitude: h.latitude,
          longitude: h.longitude,
          description: `${h.village}, ${h.mandal}, ${h.district}`
        };
      }
    }
    return null;
  }, [activeQuery, completeHospitals, allDoctors]);

  // Comprehensive, precise search logic adhering strictly to search intent
  const filteredHospitals = useMemo<ScoredHospitalItem[]>(() => {
    const q = activeQuery.trim();
    const qNorm = normalizeText(q);
    const queryWords = qNorm.split(' ').filter(Boolean);

    // Filter helper: enforces dropdown filters (Facility Type, Specialization, Emergency, Rating)
    const passesFilters = (hosp: Hospital & { distance?: number }) => {
      if (selectedType !== 'All' && hosp.hospitalType !== selectedType) {
        return false;
      }
      if (onlyEmergency && !hosp.emergencyAvailable) {
        return false;
      }
      if (minRating > 0 && hosp.rating < minRating) {
        return false;
      }
      if (selectedSpecialization !== 'All') {
        const hospDocs = allDoctors.filter((d) => d.hospitalId === hosp.id);
        if (!hospDocs.some((d) => d.specialization === selectedSpecialization)) {
          return false;
        }
      }
      return true;
    };

    // Case 0: Empty query -> show all hospitals that pass active filters
    if (!qNorm) {
      return completeHospitals
        .filter(passesFilters)
        .filter((hosp) => {
          if (userCoords && hosp.distance !== undefined && maxDistance < 150) {
            return hosp.distance <= maxDistance;
          }
          return true;
        })
        .map((hosp) => ({
          hosp,
          score: 100 + (hosp.distance !== undefined ? 1000 / (1 + hosp.distance) : 0) + hosp.rating * 10,
          matched: true
        }))
        .sort((a, b) => {
          if (a.hosp.distance !== undefined && b.hosp.distance !== undefined) {
            return a.hosp.distance - b.hosp.distance;
          }
          return b.hosp.rating - a.hosp.rating;
        });
    }

    // =========================================================================
    // CASE 1: EXACT HOSPITAL NAME SEARCH
    // Requirement: If user enters a hospital name, show ONLY the exact matching hospital.
    // Searches complete hospital dataset including acronyms, aliases and full names.
    // Examples: "AIIMS", "AIIMS Mangalagiri", "GGH", "Government General Hospital",
    // "CHC Kondapalli", "PHC Velavadam", "Area Hospital Mangalagiri", "District Headquarters Hospital", etc.
    // =========================================================================
    const exactNameMatches: { hosp: Hospital & { distance?: number }; matchDetail: string }[] = [];

    for (const hosp of completeHospitals) {
      const hNameNorm = normalizeText(hosp.name);
      let isExact = false;

      // 1. Check known aliases and acronyms
      const aliases = HOSPITAL_ALIASES[hosp.id] || [];
      if (
        aliases.some(
          (al) => qNorm === al || (qNorm.length >= 3 && al.startsWith(qNorm)) || (al.length >= 4 && qNorm.startsWith(al))
        )
      ) {
        isExact = true;
      } else if (hNameNorm === qNorm) {
        isExact = true;
      } else if (qNorm.length >= 4 && hNameNorm.startsWith(qNorm)) {
        isExact = true;
      } else if (qNorm.length >= 8 && hNameNorm.includes(qNorm)) {
        isExact = true;
      } else {
        // Check if query specifies the facility type AND place of the hospital (e.g. "velavadam phc", "mangalagiri area hospital", "kondapalli chc")
        const facilityKeywords = ['hospital', 'phc', 'chc', 'uphc', 'area hospital', 'district hospital', 'institute', 'centre', 'center', 'clinic'];
        const hasFac = facilityKeywords.some((fk) => qNorm.includes(fk));
        if (hasFac) {
          const hospVillageNorm = normalizeText(hosp.village);
          const hospMandalNorm = normalizeText(hosp.mandal);
          const placeWords = queryWords.filter((w) => !facilityKeywords.some((fk) => fk.includes(w)));
          const facilityWords = queryWords.filter((w) => facilityKeywords.some((fk) => fk.includes(w)));

          const placeMatches =
            placeWords.length > 0 &&
            placeWords.every((pw) => hNameNorm.includes(pw) || hospVillageNorm.includes(pw) || hospMandalNorm.includes(pw));
          const facMatches = facilityWords.length > 0 && facilityWords.every((fw) => hNameNorm.includes(fw));

          if (placeMatches && facMatches) {
            isExact = true;
          }
        }
      }

      if (isExact && passesFilters(hosp)) {
        exactNameMatches.push({
          hosp,
          matchDetail: `Exact Hospital Match: ${hosp.name}`
        });
      }
    }

    if (exactNameMatches.length > 0) {
      return exactNameMatches.map(({ hosp, matchDetail }) => ({
        hosp,
        score: 1000000,
        matched: true,
        matchType: 'exact_name',
        matchDetail
      }));
    }

    // =========================================================================
    // CASE 1: DOCTOR NAME SEARCH
    // Requirement: If user searches a doctor's name, show the hospital where that
    // doctor works and the doctor details.
    // =========================================================================
    const cleanDocQuery = String(qNorm || '').replace(/\b(dr|doctor)\b/g, '').trim();
    const cleanDocQueryWords = cleanDocQuery.split(' ').filter((w) => w.length >= 3);

    const isSpecialistQuery = Object.values(SPECIALTY_DICTIONARY).some((info) =>
      info.roots.some((r) => qNorm === r || (qNorm.length >= 4 && (qNorm.startsWith(r) || r.startsWith(qNorm))))
    );
    const isServiceQuery = Object.values(SERVICE_DICTIONARY).some((info) =>
      info.roots.some((r) => qNorm.includes(r))
    );

    let matchingDoctors: Doctor[] = [];
    if (!isSpecialistQuery && !isServiceQuery && cleanDocQuery.length >= 3) {
      matchingDoctors = allDoctors.filter((d) => {
        const cleanDocName = normalizeText(d.name)
          .replace(/\b(dr|doctor|md|mbbs|ms|dm|dch|dnb|bds|mds|dgo|mch)\b/g, '')
          .trim();
        const cleanDocWords = cleanDocName.split(' ').filter((w) => w.length >= 2);

        if (cleanDocName === cleanDocQuery) return true;
        if (cleanDocName.includes(cleanDocQuery) || cleanDocQuery.includes(cleanDocName)) return true;

        if (
          cleanDocQueryWords.length >= 1 &&
          cleanDocQueryWords.every((w) => cleanDocWords.some((dw) => dw.includes(w) || w.includes(dw)))
        ) {
          return true;
        }
        return false;
      });
    }

    if (matchingDoctors.length > 0) {
      const docHospitalIds = new Set(matchingDoctors.map((d) => d.hospitalId));
      const results: ScoredHospitalItem[] = [];

      for (const hosp of completeHospitals) {
        if (!docHospitalIds.has(hosp.id)) continue;
        if (!passesFilters(hosp)) continue;

        const hospDocs = matchingDoctors.filter((d) => d.hospitalId === hosp.id);
        const docDetails = hospDocs
          .map((d) => `${d.name} — ${d.specialization} (${d.qualification})`)
          .join('; ');

        results.push({
          hosp,
          score: 500000,
          matched: true,
          matchType: 'doctor',
          matchDetail: `Doctor at this hospital: ${docDetails}`
        });
      }

      if (results.length > 0) {
        return results;
      }
    }

    // =========================================================================
    // CASE 2: SPECIALIST SEARCH
    // Requirement: If user searches "Cardiologist", "Pediatrician", etc., show
    // all hospitals that have that specialist.
    // =========================================================================
    let matchedSpecialtyKey: string | null = null;
    for (const [key, info] of Object.entries(SPECIALTY_DICTIONARY)) {
      if (
        info.roots.some(
          (r) => qNorm.includes(r) || queryWords.some((w) => w === r || w.startsWith(r) || (r.length >= 4 && r.startsWith(w)))
        )
      ) {
        matchedSpecialtyKey = key;
        break;
      }
    }

    if (matchedSpecialtyKey) {
      const specInfo = SPECIALTY_DICTIONARY[matchedSpecialtyKey];
      const results: ScoredHospitalItem[] = [];

      for (const hosp of completeHospitals) {
        if (!passesFilters(hosp)) continue;

        const hospDocs = allDoctors.filter((d) => d.hospitalId === hosp.id);
        const matchingDoc = hospDocs.find((d) => {
          const dSpecNorm = normalizeText(d.specialization);
          const dQualNorm = normalizeText(d.qualification);
          return specInfo.roots.some((r) => dSpecNorm.includes(r) || dQualNorm.includes(r));
        });

        const hospSrvs = allServices.filter((s) => s.hospitalId === hosp.id);
        const matchingSrv = hospSrvs.find((s) => {
          const sNameNorm = normalizeText(s.serviceName);
          const sDescNorm = normalizeText(s.description);
          return s.available && specInfo.roots.some((r) => sNameNorm.includes(r) || sDescNorm.includes(r));
        });

        if (matchingDoc || matchingSrv) {
          results.push({
            hosp,
            score: 400000 + (hosp.distance !== undefined ? 1000 / (1 + hosp.distance) : 0),
            matched: true,
            matchType: 'specialist',
            matchDetail: matchingDoc
              ? `Specialist Available: ${matchingDoc.name} — ${matchingDoc.specialization}`
              : `Specialized Care: ${matchingSrv?.serviceName} (${matchingSrv?.waitingTime})`
          });
        }
      }

      if (results.length > 0) {
        return results.sort((a, b) => {
          if (a.hosp.distance !== undefined && b.hosp.distance !== undefined) {
            return a.hosp.distance - b.hosp.distance;
          }
          return b.hosp.rating - a.hosp.rating;
        });
      }
    }

    // =========================================================================
    // CASE 3: SERVICE SEARCH
    // Requirement: If user searches "X-Ray", "MRI", etc., show all hospitals
    // providing that service.
    // =========================================================================
    let matchedServiceKey: string | null = null;
    for (const [key, info] of Object.entries(SERVICE_DICTIONARY)) {
      if (
        info.roots.some(
          (r) => qNorm.includes(r) || queryWords.some((w) => w === r || (w.length >= 3 && r.includes(w)))
        )
      ) {
        matchedServiceKey = key;
        break;
      }
    }

    if (matchedServiceKey) {
      const srvInfo = SERVICE_DICTIONARY[matchedServiceKey];
      const results: ScoredHospitalItem[] = [];

      for (const hosp of completeHospitals) {
        if (!passesFilters(hosp)) continue;

        const hospSrvs = allServices.filter((s) => s.hospitalId === hosp.id);
        const matchingSrv = hospSrvs.find((s) => {
          const sNameNorm = normalizeText(s.serviceName);
          const sDescNorm = normalizeText(s.description);
          return s.available && srvInfo.roots.some((r) => sNameNorm.includes(r) || sDescNorm.includes(r));
        });

        const matchingFac = hosp.facilities.find((f) => {
          const fNorm = normalizeText(f);
          return srvInfo.roots.some((r) => fNorm.includes(r));
        });

        if (matchingSrv || matchingFac) {
          results.push({
            hosp,
            score: 300000 + (hosp.distance !== undefined ? 1000 / (1 + hosp.distance) : 0),
            matched: true,
            matchType: 'service',
            matchDetail: matchingSrv
              ? `Service Available: ${matchingSrv.serviceName} (${matchingSrv.waitingTime})`
              : `Facility Available: ${matchingFac}`
          });
        }
      }

      if (results.length > 0) {
        return results.sort((a, b) => {
          if (a.hosp.distance !== undefined && b.hosp.distance !== undefined) {
            return a.hosp.distance - b.hosp.distance;
          }
          return b.hosp.rating - a.hosp.rating;
        });
      }
    }

    // =========================================================================
    // CASE 4: LOCATION SEARCH
    // Requirement: If user searches a location (e.g. "Velavadam", "Mangalagiri",
    // "Kondapalli", "Vijayawada"), show all relevant hospitals near that location.
    // =========================================================================
    let searchLocation: GeographicLocation | null = null;
    const directLoc = findMatchingLocation(q);
    if (directLoc) {
      searchLocation = directLoc;
    } else {
      const knownLoc = KNOWN_LOCATIONS.find((l) => {
        const lNorm = normalizeText(l.name);
        return lNorm === qNorm || lNorm.includes(qNorm) || (qNorm.length >= 4 && qNorm.includes(lNorm));
      });
      if (knownLoc) {
        searchLocation = knownLoc;
      } else {
        for (const h of completeHospitals) {
          const vNorm = normalizeText(h.village);
          const mNorm = normalizeText(h.mandal);
          const dNorm = normalizeText(h.district);
          if (
            vNorm === qNorm ||
            mNorm === qNorm ||
            dNorm === qNorm ||
            (qNorm.length >= 4 && (vNorm.includes(qNorm) || mNorm.includes(qNorm)))
          ) {
            searchLocation = {
              name: h.village,
              type: 'Village',
              district: h.district,
              state: h.state,
              pincode: h.pincode,
              latitude: h.latitude,
              longitude: h.longitude,
              description: `${h.village}, ${h.mandal}, ${h.district}`
            };
            break;
          }
        }
      }
    }

    if (searchLocation) {
      const results: ScoredHospitalItem[] = [];

      for (const hosp of completeHospitals) {
        if (!passesFilters(hosp)) continue;

        const distFromLoc = calculateDistance(
          searchLocation.latitude,
          searchLocation.longitude,
          hosp.latitude,
          hosp.longitude
        );

        const hospVillageNorm = normalizeText(hosp.village);
        const hospMandalNorm = normalizeText(hosp.mandal);
        const searchLocNorm = normalizeText(searchLocation.name);
        const isDirect = hospVillageNorm === searchLocNorm || hospMandalNorm === searchLocNorm || distFromLoc === 0;

        // Show direct matches plus nearby facilities within realistic distance (up to 40 km)
        if (isDirect || distFromLoc <= 40) {
          results.push({
            hosp,
            score: isDirect ? 250000 : Math.max(1000, 200000 - distFromLoc * 2000),
            matched: true,
            matchType: 'location',
            matchDetail: isDirect
              ? `Located in ${hosp.village} (${hosp.mandal})`
              : `Nearby Facility (~${distFromLoc} km from ${searchLocation.name})`,
            relativeDistanceLabel: isDirect
              ? `Located in ${hosp.village}`
              : `~${distFromLoc} km from ${searchLocation.name}`,
            distanceFromLocation: distFromLoc
          });
        }
      }

      if (results.length > 0) {
        return results.sort((a, b) => (a.distanceFromLocation || 0) - (b.distanceFromLocation || 0));
      }
    }

    // =========================================================================
    // CASE 5: MEDICINE SEARCH
    // Requirement: e.g. "Paracetamol", "Amoxicillin"
    // =========================================================================
    const matchingMeds = allMedicines.filter((m) => {
      const mNorm = normalizeText(m.medicineName);
      return mNorm.includes(qNorm) || queryWords.some((w) => w.length >= 3 && mNorm.includes(w));
    });

    if (matchingMeds.length > 0) {
      const medHospIds = new Set(matchingMeds.map((m) => m.hospitalId));
      const results: ScoredHospitalItem[] = [];

      for (const hosp of completeHospitals) {
        if (!medHospIds.has(hosp.id)) continue;
        if (!passesFilters(hosp)) continue;

        const hospMed = matchingMeds.find((m) => m.hospitalId === hosp.id);
        results.push({
          hosp,
          score: 100000,
          matched: true,
          matchType: 'medicine',
          matchDetail: hospMed
            ? `Medicine Stocked: ${hospMed.medicineName} (${hospMed.quantity} ${hospMed.unit} in stock)`
            : undefined
        });
      }

      if (results.length > 0) return results;
    }

    // =========================================================================
    // CASE 6: GENERAL SUBSTRING FALLBACK
    // =========================================================================
    const results: ScoredHospitalItem[] = [];
    for (const hosp of completeHospitals) {
      if (!passesFilters(hosp)) continue;

      const hNameNorm = normalizeText(hosp.name);
      const hAddrNorm = normalizeText(hosp.address);
      const hFacs = hosp.facilities.map(normalizeText).join(' ');

      if (
        hNameNorm.includes(qNorm) ||
        hAddrNorm.includes(qNorm) ||
        hFacs.includes(qNorm) ||
        queryWords.some((w) => w.length >= 3 && (hNameNorm.includes(w) || hFacs.includes(w)))
      ) {
        results.push({
          hosp,
          score: 50000,
          matched: true,
          matchType: 'general',
          matchDetail: `Matching: ${hosp.name}`
        });
      }
    }

    return results.sort((a, b) => {
      if (a.hosp.distance !== undefined && b.hosp.distance !== undefined) {
        return a.hosp.distance - b.hosp.distance;
      }
      return b.hosp.rating - a.hosp.rating;
    });
  }, [
    completeHospitals,
    activeQuery,
    selectedType,
    selectedSpecialization,
    maxDistance,
    onlyEmergency,
    minRating,
    allDoctors,
    allServices,
    allMedicines,
    userCoords
  ]);

  // =========================================================================
  // DOCTOR SEARCH CALCULATION
  // Searches existing doctor data by name, specialization, hospital, location, qualification, availability
  // Real-time synchronization with Hospital Staff updates
  // Exact match priority
  // =========================================================================
  interface ScoredDoctorItem {
    doctor: Doctor;
    hospital?: Hospital & { distance?: number };
    score: number;
    matchReason?: string;
  }

  const filteredDoctors = useMemo<ScoredDoctorItem[]>(() => {
    const q = activeQuery.trim();
    const qNorm = normalizeText(q);
    const queryWords = qNorm.split(' ').filter(Boolean);

    const passesDoctorFilters = (doc: Doctor, hosp?: Hospital) => {
      if (doctorSpecializationFilter !== 'All' && doc.specialization !== doctorSpecializationFilter) {
        return false;
      }
      if (doctorHospitalFilter !== 'All' && doc.hospitalId !== doctorHospitalFilter) {
        return false;
      }
      if (doctorAvailabilityFilter !== 'All' && doc.availabilityStatus !== doctorAvailabilityFilter) {
        return false;
      }
      if (doctorDistrictFilter !== 'All' && hosp && hosp.district !== doctorDistrictFilter) {
        return false;
      }
      return true;
    };

    const results: ScoredDoctorItem[] = [];

    for (const doc of allDoctors) {
      const hosp = completeHospitals.find((h) => h.id === doc.hospitalId);
      if (!passesDoctorFilters(doc, hosp)) continue;

      if (!qNorm) {
        const availBonus = doc.availabilityStatus === 'AVAILABLE' ? 50 : doc.availabilityStatus === 'IN_CONSULTATION' ? 25 : 0;
        results.push({
          doctor: doc,
          hospital: hosp,
          score: 100 + availBonus + (doc.experience || 0)
        });
        continue;
      }

      const docNameNorm = normalizeText(doc.name);
      const cleanDocName = docNameNorm.replace(/\b(dr|doctor|md|dm|ms|mbbs|dch|dgo)\b/g, '').trim();
      const specNorm = normalizeText(doc.specialization);
      const qualNorm = normalizeText(doc.qualification);
      const hospNameNorm = hosp ? normalizeText(hosp.name) : '';
      const hospDistrictNorm = hosp ? normalizeText(hosp.district) : '';
      const hospVillageNorm = hosp ? normalizeText(hosp.village) : '';
      const statusNorm = normalizeText(doc.availabilityStatus).replace(/_/g, ' ');

      let score = 0;
      let matchReason = '';

      // 1. Exact or partial Doctor Name match
      if (docNameNorm === qNorm || cleanDocName === qNorm) {
        score += 300;
        matchReason = 'Exact Doctor Name Match';
      } else if (cleanDocName.startsWith(qNorm) || docNameNorm.startsWith(qNorm)) {
        score += 240;
        matchReason = 'Doctor Name Match';
      } else if (cleanDocName.includes(qNorm) || queryWords.every((w) => docNameNorm.includes(w))) {
        score += 200;
        matchReason = 'Doctor Name Match';
      } else if (queryWords.some((w) => cleanDocName.split(' ').includes(w) && w.length >= 3)) {
        score += 170;
        matchReason = 'Doctor Name Match';
      }

      // 2. Specialization match
      if (specNorm === qNorm) {
        score += 220;
        matchReason = matchReason || 'Specialization Match';
      } else if (specNorm.includes(qNorm) || queryWords.some((w) => specNorm.includes(w))) {
        score += 160;
        matchReason = matchReason || 'Specialization Match';
      } else {
        // Match specialty dictionary roots (e.g. "cardio" -> "Cardiology")
        for (const specKey in SPECIALTY_DICTIONARY) {
          const dict = SPECIALTY_DICTIONARY[specKey];
          if (dict.roots.some((r) => qNorm.includes(r))) {
            if (dict.roots.some((r) => specNorm.includes(r))) {
              score += 150;
              matchReason = matchReason || dict.label;
              break;
            }
          }
        }
      }

      // 3. Hospital Name or Alias match
      if (hospNameNorm) {
        if (hospNameNorm === qNorm) {
          score += 180;
          matchReason = matchReason || `At ${hosp?.name}`;
        } else if (hospNameNorm.includes(qNorm) || queryWords.every((w) => hospNameNorm.includes(w))) {
          score += 140;
          matchReason = matchReason || `At ${hosp?.name}`;
        } else {
          const aliases = HOSPITAL_ALIASES[doc.hospitalId] || [];
          if (aliases.some((al) => qNorm === al || qNorm.includes(al) || al.includes(qNorm))) {
            score += 160;
            matchReason = matchReason || `At ${hosp?.name}`;
          }
        }
      }

      // 4. Location match (District, Village, Mandal)
      if (hospDistrictNorm && (hospDistrictNorm.includes(qNorm) || qNorm.includes(hospDistrictNorm))) {
        score += 110;
        matchReason = matchReason || `Located in ${hosp?.district}`;
      }
      if (hospVillageNorm && (hospVillageNorm.includes(qNorm) || qNorm.includes(hospVillageNorm))) {
        score += 110;
        matchReason = matchReason || `Located in ${hosp?.village}`;
      }

      // 5. Qualification match (e.g. MBBS, MD, DM, MS)
      if (qualNorm.includes(qNorm)) {
        score += 120;
        matchReason = matchReason || `Qualification: ${doc.qualification}`;
      } else if (queryWords.some((w) => w.length >= 3 && qualNorm.includes(w))) {
        score += 90;
        matchReason = matchReason || `Qualification: ${doc.qualification}`;
      }

      // 6. Availability status match (e.g. "available", "on leave")
      if (statusNorm.includes(qNorm) || qNorm.includes(statusNorm)) {
        score += 90;
        matchReason = matchReason || `Status: ${doc.availabilityStatus}`;
      } else if (qNorm === 'available' && doc.availabilityStatus === 'AVAILABLE') {
        score += 110;
        matchReason = matchReason || 'Currently Available';
      }

      if (score > 0) {
        const statusBonus = doc.availabilityStatus === 'AVAILABLE' ? 15 : doc.availabilityStatus === 'IN_CONSULTATION' ? 5 : -10;
        results.push({
          doctor: doc,
          hospital: hosp,
          score: score + statusBonus,
          matchReason
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }, [
    allDoctors,
    completeHospitals,
    activeQuery,
    doctorSpecializationFilter,
    doctorHospitalFilter,
    doctorAvailabilityFilter,
    doctorDistrictFilter
  ]);

  // =========================================================================
  // MEDICINE STOCK SEARCH CALCULATION
  // Searches existing medicine stock by medicine name, partial name, hospital, category
  // Real-time synchronization with Hospital Staff updates
  // Exact match priority
  // =========================================================================
  interface ScoredMedicineItem {
    medicine: MedicineStock;
    hospital?: Hospital & { distance?: number };
    score: number;
    matchReason?: string;
  }

  const filteredMedicines = useMemo<ScoredMedicineItem[]>(() => {
    const q = activeQuery.trim();
    const qNorm = normalizeText(q);
    const queryWords = qNorm.split(' ').filter(Boolean);

    const passesMedicineFilters = (med: MedicineStock) => {
      if (medicineHospitalFilter !== 'All' && med.hospitalId !== medicineHospitalFilter) {
        return false;
      }
      if (medicineStatusFilter !== 'All') {
        if (medicineStatusFilter === 'AVAILABLE' && med.status !== 'AVAILABLE') return false;
        if (medicineStatusFilter === 'LOW_STOCK' && med.status !== 'LOW_STOCK') return false;
        if (medicineStatusFilter === 'OUT_OF_STOCK' && (med.status !== 'OUT_OF_STOCK' && med.quantity > 0)) return false;
      }
      if (medicineCategoryFilter !== 'All' && med.category !== medicineCategoryFilter) {
        return false;
      }
      return true;
    };

    const results: ScoredMedicineItem[] = [];

    for (const med of allMedicines) {
      const hosp = completeHospitals.find((h) => h.id === med.hospitalId);
      if (!passesMedicineFilters(med)) continue;

      if (!qNorm) {
        const inStockBonus = med.status === 'AVAILABLE' ? 30 : med.status === 'LOW_STOCK' ? 10 : 0;
        results.push({
          medicine: med,
          hospital: hosp,
          score: 100 + inStockBonus + (med.quantity > 0 ? 10 : 0)
        });
        continue;
      }

      const medNameNorm = normalizeText(med.medicineName);
      const catNorm = normalizeText(med.category);
      const hospNameNorm = hosp ? normalizeText(hosp.name) : '';
      const hospDistrictNorm = hosp ? normalizeText(hosp.district) : '';

      let score = 0;
      let matchReason = '';

      // 1. Exact or partial medicine name match
      if (medNameNorm === qNorm) {
        score += 300;
        matchReason = 'Exact Medicine Name Match';
      } else if (medNameNorm.startsWith(qNorm)) {
        score += 240;
        matchReason = 'Medicine Name Match';
      } else if (medNameNorm.includes(qNorm)) {
        score += 200;
        matchReason = 'Medicine Name Match';
      } else if (queryWords.every((w) => medNameNorm.includes(w))) {
        score += 180;
        matchReason = 'Medicine Name Match';
      } else if (queryWords.some((w) => w.length >= 3 && medNameNorm.includes(w))) {
        score += 130;
        matchReason = 'Medicine Name Match';
      }

      // 2. Hospital / Facility match
      if (hospNameNorm) {
        if (hospNameNorm === qNorm) {
          score += 180;
          matchReason = matchReason || `At ${hosp?.name}`;
        } else if (hospNameNorm.includes(qNorm) || queryWords.every((w) => hospNameNorm.includes(w))) {
          score += 140;
          matchReason = matchReason || `At ${hosp?.name}`;
        } else {
          const aliases = HOSPITAL_ALIASES[med.hospitalId] || [];
          if (aliases.some((al) => qNorm === al || qNorm.includes(al) || al.includes(qNorm))) {
            score += 160;
            matchReason = matchReason || `At ${hosp?.name}`;
          }
        }
      }

      // 3. Category match (e.g. Analgesic, Antibiotic, Anti-Diabetic)
      if (catNorm.includes(qNorm) || queryWords.some((w) => catNorm.includes(w))) {
        score += 120;
        matchReason = matchReason || `Category: ${med.category}`;
      }

      // 4. District / Location match
      if (hospDistrictNorm && hospDistrictNorm.includes(qNorm)) {
        score += 100;
        matchReason = matchReason || `Located in ${hosp?.district}`;
      }

      // 5. Stock status match
      if (qNorm === 'in stock' || qNorm === 'available') {
        if (med.status === 'AVAILABLE') {
          score += 90;
          matchReason = matchReason || 'In Stock';
        }
      } else if (qNorm === 'low stock' && med.status === 'LOW_STOCK') {
        score += 90;
        matchReason = matchReason || 'Low Stock';
      } else if (qNorm === 'out of stock' && (med.status === 'OUT_OF_STOCK' || med.quantity === 0)) {
        score += 90;
        matchReason = matchReason || 'Out of Stock';
      }

      if (score > 0) {
        const inStockBonus = med.status === 'AVAILABLE' ? 20 : med.status === 'LOW_STOCK' ? 5 : -10;
        results.push({
          medicine: med,
          hospital: hosp,
          score: score + inStockBonus,
          matchReason
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }, [
    allMedicines,
    completeHospitals,
    activeQuery,
    medicineHospitalFilter,
    medicineStatusFilter,
    medicineCategoryFilter
  ]);

  // =========================================================================
  // DIAGNOSTIC SERVICES SEARCH CALCULATION
  // =========================================================================
  interface ScoredServiceItem {
    service: HospitalService;
    diagnostic?: DiagnosticService;
    hospital?: Hospital & { distance?: number };
    score: number;
    matchReason?: string;
  }

  const filteredServices = useMemo<ScoredServiceItem[]>(() => {
    const q = activeQuery.trim();
    const qNorm = normalizeText(q);
    const queryWords = qNorm.split(' ').filter(Boolean);

    const passesServiceFilters = (srv: HospitalService) => {
      if (serviceHospitalFilter !== 'All' && srv.hospitalId !== serviceHospitalFilter) {
        return false;
      }
      if (serviceCategoryFilter !== 'All' && srv.category !== serviceCategoryFilter) {
        return false;
      }
      return true;
    };

    const results: ScoredServiceItem[] = [];

    for (const srv of allServices) {
      if (!passesServiceFilters(srv)) continue;
      const hosp = completeHospitals.find((h) => h.id === srv.hospitalId);
      const diag = allDiagnostics.find((d) => d.hospitalId === srv.hospitalId && (d.name.toLowerCase().includes(srv.serviceName.toLowerCase()) || srv.serviceName.toLowerCase().includes(d.name.toLowerCase())));

      if (!qNorm) {
        results.push({
          service: srv,
          diagnostic: diag,
          hospital: hosp,
          score: 100 + (srv.available ? 20 : 0)
        });
        continue;
      }

      const sNameNorm = normalizeText(srv.serviceName);
      const catNorm = normalizeText(srv.category);
      const descNorm = normalizeText(srv.description);
      const hospNameNorm = hosp ? normalizeText(hosp.name) : '';

      let score = 0;
      let matchReason = '';

      if (sNameNorm === qNorm) {
        score += 300;
        matchReason = 'Exact Service Match';
      } else if (sNameNorm.startsWith(qNorm)) {
        score += 240;
        matchReason = 'Service Match';
      } else if (sNameNorm.includes(qNorm) || queryWords.every((w) => sNameNorm.includes(w))) {
        score += 200;
        matchReason = 'Service Match';
      } else {
        for (const sKey in SERVICE_DICTIONARY) {
          const dict = SERVICE_DICTIONARY[sKey];
          if (dict.roots.some((r) => qNorm.includes(r))) {
            if (dict.roots.some((r) => sNameNorm.includes(r) || catNorm.includes(r))) {
              score += 160;
              matchReason = dict.label;
              break;
            }
          }
        }
      }

      if (hospNameNorm && (hospNameNorm === qNorm || hospNameNorm.includes(qNorm))) {
        score += 150;
        matchReason = matchReason || `At ${hosp?.name}`;
      }

      if (catNorm.includes(qNorm)) {
        score += 120;
        matchReason = matchReason || `Category: ${srv.category}`;
      }

      if (descNorm.includes(qNorm)) {
        score += 80;
        matchReason = matchReason || 'Clinical Description Match';
      }

      if (score > 0) {
        results.push({
          service: srv,
          diagnostic: diag,
          hospital: hosp,
          score: score + (srv.available ? 15 : 0),
          matchReason
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }, [allServices, allDiagnostics, completeHospitals, activeQuery, serviceHospitalFilter, serviceCategoryFilter]);

  const serviceCategories = useMemo(() => {
    const set = new Set<string>();
    allServices.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return ['All', ...Array.from(set)];
  }, [allServices]);

  return (
    <div className="space-y-6 pb-12">
      {/* Category Mode Switcher Tabs */}
      <div className="border border-slate-200 bg-white rounded-2xl p-1.5 shadow-xs flex flex-wrap gap-1">
        <button
          type="button"
          id="tab-search-hospitals"
          onClick={() => setActiveTab('hospitals')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'hospitals'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Hospitals ({filteredHospitals.length})</span>
        </button>

        <button
          type="button"
          id="tab-search-doctors"
          onClick={() => setActiveTab('doctors')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'doctors'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>Doctors on Duty ({filteredDoctors.length})</span>
        </button>

        <button
          type="button"
          id="tab-search-medicines"
          onClick={() => setActiveTab('medicines')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'medicines'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>Medicines Stock ({filteredMedicines.length})</span>
        </button>

        <button
          type="button"
          id="tab-search-services"
          onClick={() => setActiveTab('services')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'services'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Diagnostic Services ({filteredServices.length})</span>
        </button>
      </div>

      {/* Search Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {activeTab === 'doctors'
                ? 'Find Doctors & Specialists'
                : activeTab === 'medicines'
                ? 'Search Essential Medicines & Jan Aushadhi Stock'
                : activeTab === 'services'
                ? 'Search Diagnostic Labs & Clinical Services'
                : t.searchHealthcare}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              {activeTab === 'doctors'
                ? 'Real-time on-duty government doctors, OPD schedules, live availability status & appointment tokens'
                : activeTab === 'medicines'
                ? 'Live hospital dispensary stock, essential generic formulary & generic alternatives'
                : activeTab === 'services'
                ? 'Free diagnostic labs, digital X-Ray, ultrasound, pathology turnaround times & equipment status'
                : 'Locate public hospitals, check doctor schedules, live diagnostic wait-times, and drug inventory'}
            </p>
          </div>
          <div className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 self-start md:self-auto">
            {activeTab === 'doctors'
              ? `${filteredDoctors.length} Doctors on Duty Found`
              : activeTab === 'medicines'
              ? `${filteredMedicines.length} Medicines in Stock Found`
              : activeTab === 'services'
              ? `${filteredServices.length} Diagnostic Services Found`
              : `${filteredHospitals.length} Government Facilities Found`}
          </div>
        </div>

        {/* Search Input Bar with Google-style always-visible clickable Search Button */}
        <form
          id="search-form"
          onSubmit={handleSearchSubmit}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              id="search-input"
              type="text"
              value={searchInput}
              onChange={handleInputChange}
              placeholder={
                activeTab === 'doctors'
                  ? 'Search doctor (e.g. Dr. Suresh Varma), specialization (e.g. Cardiology), hospital (e.g. AIIMS), or qualification...'
                  : activeTab === 'medicines'
                  ? 'Search medicine name (e.g. Paracetamol, Amoxicillin), hospital (e.g. AIIMS), or category...'
                  : activeTab === 'services'
                  ? 'Search diagnostic test (e.g. Digital X-Ray, Ultrasound), lab, or hospital...'
                  : 'Search by Hospital (e.g. AIIMS Mangalagiri), Doctor, Specialist, Service, or Location...'
              }
              className="w-full pl-11 pr-24 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-sm font-medium text-slate-800 placeholder-slate-400 shadow-xs bg-white"
            />
            <div className="absolute right-2.5 top-2 flex items-center gap-1.5">
              {searchInput && (
                <button
                  type="button"
                  id="search-clear-btn"
                  onClick={handleClearSearch}
                  className="text-xs text-slate-400 hover:text-slate-700 font-semibold px-1.5 py-1 cursor-pointer transition-colors"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                id="search-mic-btn"
                onClick={startListening}
                title="Voice Search"
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="search-submit-btn"
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-xs shrink-0 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>
        </form>

        {/* Filters Row: Specific to Active Tab */}
        {activeTab === 'hospitals' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100 text-xs">
            {/* Facility Type */}
            <div>
              <label className="block text-slate-500 font-medium mb-1">Facility Type</label>
              <select
                id="filter-type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {hospitalTypes.map((t) => (
                  <option key={t} value={t}>
                    {t === 'All' ? 'All Types' : t}
                  </option>
                ))}
              </select>
            </div>

            {/* Specialization */}
            <div>
              <label className="block text-slate-500 font-medium mb-1">Doctor Specialization</label>
              <select
                id="filter-specialization"
                value={selectedSpecialization}
                onChange={(e) => setSelectedSpecialization(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {specializations.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Distance Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-slate-500 font-medium">Max Distance</label>
                <span className="font-bold text-blue-700">{maxDistance} km</span>
              </div>
              <input
                id="filter-distance-range"
                type="range"
                min="5"
                max="150"
                step="5"
                value={maxDistance}
                onChange={(e) => setMaxDistance(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Minimum Rating */}
            <div>
              <label className="block text-slate-500 font-medium mb-1">Quality Rating</label>
              <select
                id="filter-rating"
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="0">Any Rating</option>
                <option value="3.5">⭐ 3.5+ Stars</option>
                <option value="4.0">⭐ 4.0+ Stars</option>
                <option value="4.5">⭐ 4.5+ Stars</option>
              </select>
            </div>

            {/* Emergency Only Toggle */}
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-slate-200 hover:bg-slate-50 h-[38px] transition-colors">
                <input
                  id="filter-emergency-toggle"
                  type="checkbox"
                  checked={onlyEmergency}
                  onChange={(e) => setOnlyEmergency(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <span className="font-bold text-slate-800">24x7 Emergency Only</span>
              </label>
            </div>
          </div>
        )}

        {/* Doctor Filters */}
        {activeTab === 'doctors' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
            {/* Specialization */}
            <div>
              <label className="block text-slate-500 font-medium mb-1">Specialization</label>
              <select
                id="filter-doctor-spec"
                value={doctorSpecializationFilter}
                onChange={(e) => setDoctorSpecializationFilter(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {specializations.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Hospital */}
            <div>
              <label className="block text-slate-500 font-medium mb-1">Assigned Hospital</label>
              <select
                id="filter-doctor-hosp"
                value={doctorHospitalFilter}
                onChange={(e) => setDoctorHospitalFilter(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 truncate"
              >
                <option value="All">All Government Hospitals</option>
                {completeHospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Availability */}
            <div>
              <label className="block text-slate-500 font-medium mb-1">Duty Availability</label>
              <select
                id="filter-doctor-avail"
                value={doctorAvailabilityFilter}
                onChange={(e) => setDoctorAvailabilityFilter(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Duty Statuses</option>
                <option value="AVAILABLE">🟢 Available (On Duty)</option>
                <option value="IN_CONSULTATION">🟡 In Consultation</option>
                <option value="ON_LEAVE">🔴 On Leave</option>
                <option value="OFF_DUTY">⚪ Off Duty</option>
              </select>
            </div>

            {/* District */}
            <div>
              <label className="block text-slate-500 font-medium mb-1">District / Region</label>
              <select
                id="filter-doctor-district"
                value={doctorDistrictFilter}
                onChange={(e) => setDoctorDistrictFilter(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {allDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Medicine Filters */}
        {activeTab === 'medicines' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
            {/* Hospital / Facility */}
            <div>
              <label className="block text-slate-500 font-medium mb-1">Hospital / Dispensary</label>
              <select
                id="filter-med-hosp"
                value={medicineHospitalFilter}
                onChange={(e) => setMedicineHospitalFilter(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 truncate"
              >
                <option value="All">All Government Dispensaries</option>
                {completeHospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Stock Status */}
            <div>
              <label className="block text-slate-500 font-medium mb-1">Stock Status</label>
              <select
                id="filter-med-status"
                value={medicineStatusFilter}
                onChange={(e) => setMedicineStatusFilter(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Stock Levels</option>
                <option value="AVAILABLE">🟢 In Stock</option>
                <option value="LOW_STOCK">⚠️ Low Stock (Buffer Alert)</option>
                <option value="OUT_OF_STOCK">🔴 Out of Stock</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-slate-500 font-medium mb-1">Therapeutic Category</label>
              <select
                id="filter-med-category"
                value={medicineCategoryFilter}
                onChange={(e) => setMedicineCategoryFilter(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {medicineCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Service Filters */}
        {activeTab === 'services' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
            {/* Hospital */}
            <div>
              <label className="block text-slate-500 font-medium mb-1">Hospital Lab / Unit</label>
              <select
                id="filter-service-hosp"
                value={serviceHospitalFilter}
                onChange={(e) => setServiceHospitalFilter(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 truncate"
              >
                <option value="All">All Hospital Labs</option>
                {completeHospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-slate-500 font-medium mb-1">Service Category</label>
              <select
                id="filter-service-cat"
                value={serviceCategoryFilter}
                onChange={(e) => setServiceCategoryFilter(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {serviceCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Location Detected Proximity Banner */}
      {detectedLocation && activeTab === 'hospitals' && (
        <div className="bg-blue-50/90 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-blue-950">
                Healthcare facilities in and around <span className="underline decoration-blue-400 font-extrabold">{detectedLocation.name}</span>
              </p>
              <p className="text-[11px] text-blue-700">
                {detectedLocation.description} • Ranked by proximity to {detectedLocation.name}
              </p>
            </div>
          </div>
          <button
            onClick={handleClearSearch}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 self-start sm:self-auto transition-colors cursor-pointer"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* =========================================================================
          TAB 1: DOCTORS SEARCH RESULTS
          ========================================================================= */}
      {activeTab === 'doctors' && (
        <div>
          {filteredDoctors.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="font-bold text-slate-800 text-lg">No doctors found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Try searching by doctor name, specialization, or hospital.
              </p>
              <button
                type="button"
                onClick={() => {
                  handleClearSearch();
                  setDoctorSpecializationFilter('All');
                  setDoctorHospitalFilter('All');
                  setDoctorAvailabilityFilter('All');
                  setDoctorDistrictFilter('All');
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDoctors.map(({ doctor: doc, hospital: hosp, matchReason }) => {
                const isAvail = doc.availabilityStatus === 'AVAILABLE';
                const isOnLeave = doc.availabilityStatus === 'ON_LEAVE' || doc.status === 'ON_LEAVE';
                const isInConsult = doc.availabilityStatus === 'IN_CONSULTATION';
                const isOffDuty = doc.availabilityStatus === 'OFF_DUTY';
                const isEmergencyDuty = doc.availabilityStatus === 'EMERGENCY_DUTY';

                return (
                  <div
                    key={doc.id}
                    id={`doctor-search-result-${doc.id}`}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-blue-300 transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-2xl shrink-0 shadow-2xs">
                          👨‍⚕️
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              {doc.specialization}
                            </span>
                            {matchReason && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                <span>{matchReason}</span>
                              </span>
                            )}
                          </div>

                          <h3 className="font-bold text-lg text-slate-900 leading-tight">
                            {doc.name}
                          </h3>

                          <p className="text-xs font-semibold text-slate-600">
                            {doc.qualification}
                          </p>

                          {hosp && (
                            <div
                              onClick={() => onNavigate('hospital-details', { hospitalId: hosp.id })}
                              className="text-xs text-blue-700 font-semibold hover:underline cursor-pointer flex items-center gap-1 pt-0.5"
                            >
                              <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{hosp.name} • {hosp.district}, {hosp.state}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Live Status Badge */}
                      <div className="self-start sm:self-auto">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-2xs ${
                            isOnLeave
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : isAvail
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : isInConsult
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : isOffDuty
                              ? 'bg-slate-100 text-slate-700 border-slate-300'
                              : 'bg-purple-50 text-purple-800 border-purple-300'
                          }`}
                        >
                          <span>
                            {isOnLeave
                              ? '🔴 ON LEAVE'
                              : isAvail
                              ? '🟢 AVAILABLE'
                              : isInConsult
                              ? '🟡 IN CONSULTATION'
                              : isOffDuty
                              ? '⚪ OFF DUTY'
                              : '🚨 EMERGENCY DUTY'}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Schedule & Clinical Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      <div>
                        <span className="text-slate-400 font-medium block text-[11px]">OPD Schedule:</span>
                        <span className="font-bold text-slate-800">
                          {doc.availableDays.join(', ')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block text-[11px]">Consultation Timings:</span>
                        <span className="font-bold text-slate-800 font-mono">
                          {doc.timeSlots && doc.timeSlots[0] ? doc.timeSlots[0] : '09:00 AM - 04:00 PM'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block text-[11px]">Experience & Fee:</span>
                        <span className="font-bold text-slate-800">
                          {doc.experience} Years • <span className="text-emerald-700">₹0 (Free Govt Service)</span>
                        </span>
                      </div>
                    </div>

                    {/* On Leave Notice Banner */}
                    {isOnLeave && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
                        <span className="text-base shrink-0">🔴</span>
                        <span className="font-medium">
                          Dr. {doc.name} is currently ON LEAVE. Consultations and advance OPD booking are suspended until next active duty.
                        </span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>6 min/patient • Advance OPD Tokens</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onNavigate('doctor-details', { doctorId: doc.id })}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          View Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigate('queue', { hospitalId: doc.hospitalId, doctorId: doc.id })}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Queue
                        </button>
                        <button
                          type="button"
                          disabled={isOnLeave || isOffDuty}
                          onClick={() => onNavigate('appointment', { hospitalId: doc.hospitalId, doctorId: doc.id })}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer ${
                            isOnLeave || isOffDuty
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {isOnLeave ? 'On Leave (Unavailable)' : isOffDuty ? 'Off Duty' : 'Book OPD Appointment'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: MEDICINES STOCK SEARCH RESULTS
          ========================================================================= */}
      {activeTab === 'medicines' && (
        <div>
          {filteredMedicines.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="font-bold text-slate-800 text-lg">No medicines found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Try searching by medicine name (e.g. Paracetamol, Amoxicillin, Insulin) or facility name.
              </p>
              <button
                type="button"
                onClick={() => {
                  handleClearSearch();
                  setMedicineHospitalFilter('All');
                  setMedicineStatusFilter('All');
                  setMedicineCategoryFilter('All');
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMedicines.map(({ medicine: med, hospital: hosp, matchReason }) => {
                const isOut = med.quantity === 0 || med.status === 'OUT_OF_STOCK';
                const isLow = !isOut && (med.quantity <= med.minimumThreshold || med.status === 'LOW_STOCK');

                const alternatives = (isOut || isLow)
                  ? apiStore.findAlternativeHospitalsForMedicine(med.medicineName, med.hospitalId).slice(0, 2)
                  : [];

                const stockPercent = Math.min(100, Math.round((med.quantity / Math.max(med.minimumThreshold * 2, 100)) * 100));

                return (
                  <div
                    key={med.id}
                    id={`medicine-search-result-${med.id}`}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-blue-300 transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-2xs border ${
                            isOut
                              ? 'bg-rose-50 border-rose-200 text-rose-600'
                              : isLow
                              ? 'bg-amber-50 border-amber-200 text-amber-600'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                          }`}
                        >
                          💊
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {med.category}
                            </span>
                            {matchReason && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                <span>{matchReason}</span>
                              </span>
                            )}
                            <span className="text-[10px] font-semibold text-slate-500">
                              Free Jan Aushadhi / Govt Formulary
                            </span>
                          </div>

                          <h3 className="font-bold text-lg text-slate-900 leading-tight">
                            {med.medicineName}
                          </h3>

                          {hosp && (
                            <div
                              onClick={() => onNavigate('hospital-details', { hospitalId: hosp.id })}
                              className="text-xs text-blue-700 font-semibold hover:underline cursor-pointer flex items-center gap-1 pt-0.5"
                            >
                              <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{hosp.name} • {hosp.village}, {hosp.district}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stock Status Badge */}
                      <div className="self-start sm:self-auto">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-2xs ${
                            isOut
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : isLow
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          <span>
                            {isOut ? '🔴 OUT OF STOCK' : isLow ? '⚠️ LOW STOCK' : '🟢 IN STOCK'}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Stock Details & Quantity */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      <div>
                        <span className="text-slate-400 font-medium block text-[11px]">Available Quantity:</span>
                        <span className="font-bold text-base text-slate-900 font-mono">
                          {med.quantity.toLocaleString()} units
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block text-[11px]">Minimum Threshold Limit:</span>
                        <span className="font-bold text-slate-800 font-mono">
                          {med.minimumThreshold.toLocaleString()} units
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block text-[11px]">Last Stock Audit:</span>
                        <span className="font-semibold text-slate-600">
                          {med.updatedAt || 'Recent (Live)'}
                        </span>
                      </div>
                    </div>

                    {/* Stock Level Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-500 font-medium">Dispensary Stock Level</span>
                        <span className="font-bold text-slate-700 font-mono">{med.quantity} / {Math.max(med.minimumThreshold * 2, 100)} buffer</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isOut ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.max(stockPercent, isOut ? 0 : 5)}%` }}
                        />
                      </div>
                    </div>

                    {/* Alternative Facility Availability Recommendation */}
                    {alternatives.length > 0 && (
                      <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-xs space-y-1.5">
                        <span className="font-bold text-blue-900 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-blue-700" />
                          <span>Available at Nearby Government Facilities:</span>
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {alternatives.map((alt) => (
                            <button
                              type="button"
                              key={alt.hospital.id}
                              onClick={() => onNavigate('hospital-details', { hospitalId: alt.hospital.id })}
                              className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-700 font-semibold text-[11px] hover:bg-blue-100 flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <span>{alt.hospital.name}</span>
                              <span className="font-bold text-emerald-700 font-mono">({alt.medicine.quantity} units)</span>
                              {alt.distance !== undefined && <span className="text-slate-400"> • {alt.distance} km</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-slate-500">
                        Free government supply under National Health Mission (NHM) formulary.
                      </div>

                      <div className="flex items-center gap-2">
                        {(isOut || isLow) && (
                          <button
                            type="button"
                            onClick={() => onNavigate('complaints', { hospitalId: med.hospitalId, category: 'MEDICINE_SHORTAGE' })}
                            className="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Report Shortage
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onNavigate('hospital-details', { hospitalId: med.hospitalId })}
                          className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          View Facility Details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: DIAGNOSTIC SERVICES SEARCH RESULTS
          ========================================================================= */}
      {activeTab === 'services' && (
        <div>
          {filteredServices.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="font-bold text-slate-800 text-lg">No diagnostic services found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Try searching by service name (e.g. Digital X-Ray, Ultrasound, MRI, Blood Test) or facility name.
              </p>
              <button
                type="button"
                onClick={() => {
                  handleClearSearch();
                  setServiceHospitalFilter('All');
                  setServiceCategoryFilter('All');
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredServices.map(({ service: srv, diagnostic: diag, hospital: hosp, matchReason }) => {
                return (
                  <div
                    key={srv.id}
                    id={`service-search-result-${srv.id}`}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-blue-300 transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 text-2xl shrink-0 shadow-2xs">
                          <Activity className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                              {srv.category}
                            </span>
                            {diag?.isFreeUnderNHM && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                100% Cashless (NHM)
                              </span>
                            )}
                            {matchReason && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                <span>{matchReason}</span>
                              </span>
                            )}
                          </div>

                          <h3 className="font-bold text-lg text-slate-900 leading-tight">
                            {srv.serviceName}
                          </h3>

                          {hosp && (
                            <div
                              onClick={() => onNavigate('hospital-details', { hospitalId: hosp.id })}
                              className="text-xs text-blue-700 font-semibold hover:underline cursor-pointer flex items-center gap-1 pt-0.5"
                            >
                              <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{hosp.name} • {hosp.village}, {hosp.district}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="self-start sm:self-auto">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-2xs ${
                            srv.available
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}
                        >
                          <span>{srv.available ? '🟢 OPERATIONAL' : '🔴 CLOSED / DOWN'}</span>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      <div>
                        <span className="text-slate-400 font-medium block text-[11px]">Estimated Wait:</span>
                        <span className="font-bold text-slate-800">{srv.waitingTime}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block text-[11px]">Turnaround Time:</span>
                        <span className="font-bold text-slate-800">{diag?.reportTurnaroundHours ? `${diag.reportTurnaroundHours} Hours` : 'Same Day'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium block text-[11px]">Cost:</span>
                        <span className="font-bold text-emerald-700">₹0 (Free Govt Service)</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 italic">
                      {srv.description}
                    </p>

                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-slate-500">
                        Sample Timings: {diag?.sampleTimings || '09:00 AM - 02:00 PM'}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onNavigate('diagnostics', { hospitalId: srv.hospitalId })}
                          className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          Book Lab Slot
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 4: HOSPITALS & HEALTHCARE FACILITIES SEARCH RESULTS
          ========================================================================= */}
      {activeTab === 'hospitals' && (
        <div>
          {filteredHospitals.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="font-bold text-slate-800 text-lg">No Healthcare Facilities Found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Try expanding your distance filter slider, clearing specialization or searching with a broader keyword like "Hospital" or "District".
              </p>
              <button
                type="button"
                onClick={() => {
                  handleClearSearch();
                  setSelectedType('All');
                  setSelectedSpecialization('All');
                  setMaxDistance(150);
                  setOnlyEmergency(false);
                  setMinRating(0);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHospitals.map(({ hosp, matchDetail, relativeDistanceLabel }) => {
                const hospDocs = allDoctors.filter((d) => d.hospitalId === hosp.id);
                const hospSrvs = allServices.filter((s) => s.hospitalId === hosp.id);
                const hospMeds = allMedicines.filter((m) => m.hospitalId === hosp.id);

                const availableDocsCount = hospDocs.filter((d) => d.availabilityStatus === 'AVAILABLE').length;
                const availableSrvsCount = hospSrvs.filter((s) => s.available).length;
                const lowMedsCount = hospMeds.filter((m) => m.quantity <= m.minimumThreshold).length;

                return (
                  <div
                    key={hosp.id}
                    id={`search-result-${hosp.id}`}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-blue-300 transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            {hosp.hospitalType}
                          </span>
                          {hosp.emergencyAvailable && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
                              24x7 Emergency
                            </span>
                          )}
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            {hosp.isOpen ? 'Open Now' : 'Closed'}
                          </span>
                        </div>

                        <h3
                          onClick={() => onNavigate('hospital-details', { hospitalId: hosp.id })}
                          className="font-bold text-lg text-slate-900 hover:text-blue-600 cursor-pointer pt-0.5 transition-colors"
                        >
                          {hosp.name}
                        </h3>

                        {matchDetail && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold mt-1">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{matchDetail}</span>
                          </div>
                        )}

                        <p className="text-xs text-slate-500 flex items-center gap-1 pt-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{hosp.address}, {hosp.village}, {hosp.mandal}, {hosp.district}, {hosp.state} - {hosp.pincode}</span>
                        </p>
                      </div>

                      {/* Rating & Distance Badge */}
                      <div className="flex sm:flex-col items-end justify-between gap-1 self-start">
                        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                          <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                          <span className="font-bold text-sm text-slate-900">{hosp.rating}</span>
                          <span className="text-[11px] text-slate-400">({hosp.totalReviews} reviews)</span>
                        </div>
                        {(relativeDistanceLabel || hosp.distance !== undefined) && (
                          <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                            <span>{relativeDistanceLabel || `${hosp.distance} km away`}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Real-Time Operational Indicators: Doctors, Services, Medicines */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                      {/* Doctors Status */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                          <Stethoscope className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[11px]">Doctors on Duty</span>
                          <span className="font-bold text-slate-900">
                            {availableDocsCount} Available ({hospDocs.length} Total)
                          </span>
                        </div>
                      </div>

                      {/* Services Status */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                          <Activity className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[11px]">Services & Diagnostics</span>
                          <span className="font-bold text-slate-900">
                            {availableSrvsCount} Operational ({hospSrvs.length} Total)
                          </span>
                        </div>
                      </div>

                      {/* Medicine Status */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                          <Pill className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[11px]">Medicine Formulary</span>
                          {lowMedsCount > 0 ? (
                            <span className="font-bold text-amber-700">
                              {hospMeds.length - lowMedsCount} In-Stock (⚠️ {lowMedsCount} Low)
                            </span>
                          ) : (
                            <span className="font-bold text-emerald-600">Full Stock Verified</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Doctor specializations tags */}
                    {hospDocs.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                        <span className="text-slate-400 font-medium">Specialties:</span>
                        {hospDocs.slice(0, 4).map((d) => (
                          <span
                            key={d.id}
                            className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium"
                          >
                            {d.specialization}
                          </span>
                        ))}
                        {hospDocs.length > 4 && (
                          <span className="text-slate-500 font-semibold">+{hospDocs.length - 4} more</span>
                        )}
                      </div>
                    )}

                    {/* Bottom Action Buttons: View Details, Directions, Book */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{hosp.openingHours}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          id={`get-directions-${hosp.id}`}
                          onClick={() => onNavigate('hospital-details', { hospitalId: hosp.id, showRoute: true })}
                          className="px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="View actual driving route to hospital"
                        >
                          <Navigation className="w-3.5 h-3.5 text-blue-600" />
                          <span>{t.getDirections}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onNavigate('hospital-details', { hospitalId: hosp.id })}
                          className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                        >
                          {t.viewDetails}
                        </button>

                        <button
                          type="button"
                          onClick={() => onNavigate('appointment', { hospitalId: hosp.id })}
                          className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
                        >
                          {t.bookAppointment}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
