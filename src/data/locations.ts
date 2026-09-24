export interface GeographicLocation {
  name: string;
  type: 'Village' | 'Town' | 'City' | 'Mandal' | 'District' | 'Pincode';
  district: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  description: string;
}

export const KNOWN_LOCATIONS: GeographicLocation[] = [
  {
    name: 'Velavadam',
    type: 'Village',
    district: 'NTR District',
    state: 'Andhra Pradesh',
    pincode: '521230',
    latitude: 16.6520,
    longitude: 80.5930,
    description: 'Village in Mylavaram Mandal, NTR District (near Kondapalli & Vijayawada Rural)'
  },
  {
    name: 'Kondapalli',
    type: 'Town',
    district: 'NTR District',
    state: 'Andhra Pradesh',
    pincode: '521228',
    latitude: 16.6215,
    longitude: 80.5362,
    description: 'Industrial town & historic fort area in Ibrahimpatnam / Mylavaram cluster'
  },
  {
    name: 'Mangalagiri',
    type: 'Town',
    district: 'Guntur District',
    state: 'Andhra Pradesh',
    pincode: '522503',
    latitude: 16.4357,
    longitude: 80.5604,
    description: 'Healthcare hub housing AIIMS Mangalagiri & Government Area Hospital'
  },
  {
    name: 'AIIMS Mangalagiri Campus',
    type: 'Town',
    district: 'Guntur District',
    state: 'Andhra Pradesh',
    pincode: '522503',
    latitude: 16.4428,
    longitude: 80.5756,
    description: 'National Premier Medical Institute on NH-16 Mangalagiri Bypass'
  },
  {
    name: 'Vijayawada Urban',
    type: 'City',
    district: 'NTR District',
    state: 'Andhra Pradesh',
    pincode: '520002',
    latitude: 16.5062,
    longitude: 80.6480,
    description: 'Central urban district headquarters housing Government General Hospital (GGH)'
  },
  {
    name: 'Gannavaram',
    type: 'Town',
    district: 'Krishna District',
    state: 'Andhra Pradesh',
    pincode: '521101',
    latitude: 16.5398,
    longitude: 80.7989,
    description: 'Airport corridor & Community Health Centre (CHC) zone'
  },
  {
    name: 'Guntur Urban',
    type: 'City',
    district: 'Guntur District',
    state: 'Andhra Pradesh',
    pincode: '522001',
    latitude: 16.3067,
    longitude: 80.4365,
    description: 'District Headquarters Hospital & Government Blood Bank cluster'
  },
  {
    name: 'Vuyyuru',
    type: 'Mandal',
    district: 'Krishna District',
    state: 'Andhra Pradesh',
    pincode: '521165',
    latitude: 16.3683,
    longitude: 80.8436,
    description: 'Rural mandal headquarters with Primary Health Centre (PHC)'
  },
  {
    name: 'Ibrahimpatnam',
    type: 'Mandal',
    district: 'NTR District',
    state: 'Andhra Pradesh',
    pincode: '521456',
    latitude: 16.5882,
    longitude: 80.5218,
    description: 'Thermal power & Krishna river confluence PHC corridor'
  },
  {
    name: 'Tenali',
    type: 'Town',
    district: 'Guntur District',
    state: 'Andhra Pradesh',
    pincode: '522202',
    latitude: 16.2431,
    longitude: 80.6401,
    description: 'Major agricultural town with 100-bed Community Health Centre'
  },
  {
    name: 'Nuzvid',
    type: 'Town',
    district: 'Eluru / Krishna Border',
    state: 'Andhra Pradesh',
    pincode: '521201',
    latitude: 16.7874,
    longitude: 80.8465,
    description: 'Sub-District Hospital center serving horticultural belts'
  },
  {
    name: 'Gudivada',
    type: 'Town',
    district: 'Krishna District',
    state: 'Andhra Pradesh',
    pincode: '521301',
    latitude: 16.4385,
    longitude: 80.9965,
    description: 'Area Hospital and secondary healthcare referral station'
  },
  {
    name: 'Patamata',
    type: 'Village',
    district: 'NTR District',
    state: 'Andhra Pradesh',
    pincode: '520010',
    latitude: 16.4950,
    longitude: 80.6550,
    description: 'East Vijayawada residential zone with Urban Primary Health Clinic'
  },
  {
    name: 'Amaravati Capital',
    type: 'City',
    district: 'Guntur District',
    state: 'Andhra Pradesh',
    pincode: '522020',
    latitude: 16.5131,
    longitude: 80.5157,
    description: 'State Administrative Capital region'
  }
];

export function findMatchingLocation(term: string): GeographicLocation | null {
  const clean = String(term || '').trim().toLowerCase();
  if (!clean) return null;

  // 1. Exact match on name or pincode
  const exact = KNOWN_LOCATIONS.find(
    (l) => String(l.name || '').toLowerCase() === clean || l.pincode === clean
  );
  if (exact) return exact;

  // 2. Starts-with or contains match
  const partial = KNOWN_LOCATIONS.find(
    (l) =>
      String(l.name || '').toLowerCase().includes(clean) ||
      String(l.district || '').toLowerCase().includes(clean) ||
      clean.includes(String(l.name || '').toLowerCase()) ||
      l.pincode.includes(clean)
  );

  return partial || null;
}
