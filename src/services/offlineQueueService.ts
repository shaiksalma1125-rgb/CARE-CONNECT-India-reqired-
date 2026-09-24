import { OfflineOPDToken, OfflineTokenCallStatus, OfflineTokenSource, OfflineTokenSyncStatus, OPDQueueInfo } from '../types';
import { apiStore } from './apiStore';

export type NetworkMode = 'ONLINE' | 'OFFLINE' | 'LOW_CONNECTIVITY';

const OFFLINE_STORAGE_KEY = 'sih_offline_tokens_v2';
const LOW_BANDWIDTH_KEY = 'sih_low_bandwidth_mode';
const QUEUES_CACHE_KEY = 'sih_cached_opd_queues';

// Helper to determine network state accurately
export function getDetailedNetworkStatus(): {
  mode: NetworkMode;
  isOnline: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
} {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (!isOnline) {
    return { mode: 'OFFLINE', isOnline: false };
  }

  const conn = (navigator as any)?.connection || (navigator as any)?.mozConnection || (navigator as any)?.webkitConnection;
  if (conn) {
    const effectiveType = conn.effectiveType || '';
    const rtt = conn.rtt || 0;
    const saveData = Boolean(conn.saveData);
    const downlink = conn.downlink || 10;

    if (effectiveType === 'slow-2g' || effectiveType === '2g' || rtt > 1200 || saveData || (downlink > 0 && downlink < 0.25)) {
      return {
        mode: 'LOW_CONNECTIVITY',
        isOnline: true,
        effectiveType,
        downlink,
        rtt,
        saveData
      };
    }
  }

  // Check if manual 2G mode is enabled by user
  if (typeof localStorage !== 'undefined' && localStorage.getItem(LOW_BANDWIDTH_KEY) === 'true') {
    return { mode: 'LOW_CONNECTIVITY', isOnline: true };
  }

  return { mode: 'ONLINE', isOnline: true };
}

// Generate short code for SMS from hospital name
export function getHospitalShortCode(hospitalName?: string | null, hospitalId?: string): string {
  const safeName = String(hospitalName || '').trim();
  if (!safeName) return hospitalId ? String(hospitalId).toUpperCase().slice(-4) : 'HOSP';
  const upper = safeName.toUpperCase();
  if (upper.includes('VIJAYAWADA') || upper.includes('GGH')) return 'GGH-VJA';
  if (upper.includes('KING GEORGE') || upper.includes('KGH') || upper.includes('VISAKHAPATNAM')) return 'KGH-VSKP';
  if (upper.includes('KADAPA') || upper.includes('RIMS')) return 'RIMS-KDP';
  if (upper.includes('GUNTUR') || upper.includes('GGH GUNTUR')) return 'GGH-GNT';
  if (upper.includes('TENALI') || upper.includes('DISTRICT HOSPITAL')) return 'DH-TEN';
  if (upper.includes('TIRUPATI') || upper.includes('SVRR')) return 'SVRR-TPT';
  if (upper.includes('KURNOOL')) return 'GHK-KRN';
  if (upper.includes('ANANTAPUR')) return 'GHA-ATP';
  if (upper.includes('RAJAHMUNDRY')) return 'DHR-RJY';
  if (upper.includes('ELURU')) return 'DHE-ELR';
  if (upper.includes('ONGOLE')) return 'RIM-ONG';
  if (upper.includes('NELLORE')) return 'DCS-NLR';

  // Fallback: initials from words
  const words = safeName.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0].substring(0, 3) + '-' + words[1].substring(0, 3)).toUpperCase();
  }
  return (hospitalId || 'HOSP').toUpperCase().slice(0, 7);
}

// Generate short clinical department code
export function getDepartmentShortCode(department?: string | null): string {
  const safeDept = String(department || '').trim();
  if (!safeDept) return 'MED';
  const upper = safeDept.toUpperCase();
  if (upper.includes('GENERAL MED') || upper.includes('MEDICINE')) return 'MED';
  if (upper.includes('CARDIO')) return 'CARD';
  if (upper.includes('PEDIAT') || upper.includes('CHILD')) return 'PED';
  if (upper.includes('ORTHO') || upper.includes('BONE')) return 'ORTHO';
  if (upper.includes('GYNAE') || upper.includes('OBSTET') || upper.includes('MATERN')) return 'GYN';
  if (upper.includes('DERMA') || upper.includes('SKIN')) return 'DERM';
  if (upper.includes('ENT') || upper.includes('EAR')) return 'ENT';
  if (upper.includes('EYE') || upper.includes('OPHTHAL')) return 'EYE';
  if (upper.includes('SURG')) return 'SURG';
  if (upper.includes('DENT')) return 'DENT';
  if (upper.includes('NEURO')) return 'NEURO';
  return 'OPD';
}

export const offlineQueueService = {
  // Get all offline tokens stored locally
  getTokens(hospitalId?: string): OfflineOPDToken[] {
    try {
      const raw = localStorage.getItem(OFFLINE_STORAGE_KEY);
      let list: OfflineOPDToken[] = raw ? JSON.parse(raw) : [];

      // Fallback: migrate from old offline tokens if empty
      if (list.length === 0) {
        const legacy = localStorage.getItem('sih_offline_tokens');
        if (legacy) {
          try {
            const oldTokens = JSON.parse(legacy);
            if (Array.isArray(oldTokens)) {
              list = oldTokens.map((t, idx) => ({
                id: t.id || `migrated-off-${idx}-${Date.now()}`,
                tokenCode: t.tokenCode || `TK-${String(t.tokenNumber || idx + 1).padStart(2, '0')}`,
                tokenNumber: t.tokenNumber || idx + 1,
                hospitalId: t.hospitalId || 'hosp-1',
                hospitalName: t.hospitalName || 'Government General Hospital',
                department: t.department || 'General Medicine OPD',
                patientName: t.patientName || 'Citizen',
                patientPhone: t.patientPhone,
                roomNumber: t.roomNumber || 'Room 101',
                estimatedWaitMins: t.estimatedWaitMins || 15,
                issuedAt: t.issuedAt || new Date().toISOString(),
                date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                syncStatus: 'SYNCED' as OfflineTokenSyncStatus,
                source: 'WEB_OFFLINE' as OfflineTokenSource,
                status: 'WAITING' as OfflineTokenCallStatus
              }));
              localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(list));
            }
          } catch (e) {
            console.error('Migration error:', e);
          }
        }
      }

      if (hospitalId) {
        return list.filter((t) => t.hospitalId === hospitalId);
      }
      return list;
    } catch (e) {
      console.error('Error reading offline tokens:', e);
      return [];
    }
  },

  // Save list of tokens
  saveTokens(tokens: OfflineOPDToken[]): void {
    try {
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(tokens));
      // Keep legacy store in sync for backwards compatibility
      localStorage.setItem('sih_offline_tokens', JSON.stringify(tokens.slice(0, 10)));
      window.dispatchEvent(new CustomEvent('sih_offline_tokens_changed', { detail: tokens }));
    } catch (e) {
      console.error('Error saving offline tokens:', e);
    }
  },

  // Cache queue data locally for offline calculation
  cacheQueues(queues: OPDQueueInfo[]): void {
    try {
      localStorage.setItem(QUEUES_CACHE_KEY, JSON.stringify(queues));
    } catch (e) {
      console.error('Error caching queues:', e);
    }
  },

  // Retrieve cached queue data
  getCachedQueues(hospitalId?: string): OPDQueueInfo[] {
    try {
      const raw = localStorage.getItem(QUEUES_CACHE_KEY);
      if (raw) {
        const list: OPDQueueInfo[] = JSON.parse(raw);
        if (hospitalId) {
          return list.filter((q) => q.hospitalId === hospitalId);
        }
        return list;
      }
    } catch (e) {
      console.error('Error getting cached queues:', e);
    }
    return apiStore.getQueues(hospitalId);
  },

  // Issue an offline OPD token
  issueOfflineToken(params: {
    hospitalId: string;
    hospitalName: string;
    department: string;
    patientName: string;
    patientPhone?: string;
    source?: OfflineTokenSource;
  }): OfflineOPDToken {
    const { hospitalId, hospitalName, department, patientName, patientPhone, source = 'WEB_OFFLINE' } = params;
    const net = getDetailedNetworkStatus();
    const isOnline = net.isOnline && net.mode !== 'OFFLINE';

    // 1. Determine current queue state from cache or apiStore
    const cachedQueues = this.getCachedQueues(hospitalId);
    const safeDept = String(department || '').toLowerCase();
    let queue = cachedQueues.find((q) => {
      const qDept = String(q.department || '').toLowerCase();
      return (qDept && safeDept && (qDept.includes(safeDept) || safeDept.includes(qDept)));
    });

    const existingTokens = this.getTokens();
    // Count tokens already issued for this hospital and department
    const sameDeptTokens = existingTokens.filter(
      (t) => t.hospitalId === hospitalId && String(t.department || '').toLowerCase() === safeDept
    );

    const baseTokenNumber = queue ? queue.totalTokensIssued : 10;
    const nextNumber = Math.max(baseTokenNumber + 1, (queue?.currentTokenNumber || 1) + sameDeptTokens.length + 1);
    const tokenCode = `TK-${String(nextNumber).padStart(2, '0')}`;
    const roomNumber = queue?.roomNumber || 'Room 101';
    const currentServing = queue?.currentTokenNumber || 1;
    const waitingAhead = Math.max(0, nextNumber - currentServing);
    const estimatedWaitMins = waitingAhead * (queue?.avgWaitTimePerPatientMinutes || 6);

    const todayStr = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const newToken: OfflineOPDToken = {
      id: `off-tk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      tokenCode,
      tokenNumber: nextNumber,
      hospitalId,
      hospitalName,
      department,
      patientName: patientName.trim() || 'Citizen Patient',
      patientPhone: patientPhone?.trim() || '',
      roomNumber,
      estimatedWaitMins: Math.max(5, estimatedWaitMins),
      issuedAt: new Date().toISOString(),
      date: todayStr,
      syncStatus: isOnline ? 'SYNCED' : 'PENDING',
      source,
      status: 'WAITING',
      syncedAt: isOnline ? new Date().toISOString() : undefined
    };

    // Save locally
    const updatedList = [newToken, ...existingTokens];
    this.saveTokens(updatedList);

    // Update cached queue token count
    if (queue) {
      queue.totalTokensIssued = Math.max(queue.totalTokensIssued, nextNumber);
      queue.lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.cacheQueues(cachedQueues);
    }

    // If online, also immediately sync with central apiStore
    if (isOnline) {
      try {
        const centralQueues = apiStore.getQueues();
        const targetQ = centralQueues.find((q) => q.hospitalId === hospitalId && q.department === department);
        if (targetQ) {
          targetQ.totalTokensIssued = Math.max(targetQ.totalTokensIssued, nextNumber);
          targetQ.lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      } catch (err) {
        console.warn('Online sync deferred:', err);
      }
    }

    return newToken;
  },

  // Update token status (for Hospital Staff)
  updateTokenStatus(tokenId: string, status: OfflineTokenCallStatus): boolean {
    const tokens = this.getTokens();
    const idx = tokens.findIndex((t) => t.id === tokenId);
    if (idx !== -1) {
      tokens[idx].status = status;
      this.saveTokens(tokens);

      // If token is now CALLING, also update currentServingToken in queue
      if (status === 'CALLING') {
        const t = tokens[idx];
        const tDept = String(t.department || '').toLowerCase();
        const cached = this.getCachedQueues(t.hospitalId);
        const q = cached.find((item) => String(item.department || '').toLowerCase() === tDept);
        if (q) {
          q.currentServingToken = t.tokenCode;
          q.currentTokenNumber = t.tokenNumber;
          q.lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          this.cacheQueues(cached);
        }

        // If online, update central apiStore queue too
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          const liveQueues = apiStore.getQueues();
          const liveQ = liveQueues.find((item) => item.hospitalId === t.hospitalId && String(item.department || '').toLowerCase() === tDept);
          if (liveQ) {
            liveQ.currentServingToken = t.tokenCode;
            liveQ.currentTokenNumber = t.tokenNumber;
            liveQ.lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
        }
      }

      return true;
    }
    return false;
  },

  // Synchronize all pending offline tokens to the central server
  syncPendingTokens(): { syncedCount: number; errors: number } {
    const net = getDetailedNetworkStatus();
    if (!net.isOnline || net.mode === 'OFFLINE') {
      return { syncedCount: 0, errors: 1 };
    }

    const tokens = this.getTokens();
    const pending = tokens.filter((t) => t.syncStatus === 'PENDING');
    if (pending.length === 0) {
      return { syncedCount: 0, errors: 0 };
    }

    let syncedCount = 0;
    const nowIso = new Date().toISOString();

    const centralQueues = apiStore.getQueues();

    tokens.forEach((t) => {
      if (t.syncStatus === 'PENDING') {
        const tDept = String(t.department || '').toLowerCase();
        // Find matching queue and ensure totalTokensIssued matches
        const q = centralQueues.find(
          (item) => item.hospitalId === t.hospitalId && String(item.department || '').toLowerCase() === tDept
        );
        if (q) {
          q.totalTokensIssued = Math.max(q.totalTokensIssued, t.tokenNumber);
          q.lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        t.syncStatus = 'SYNCED';
        t.syncedAt = nowIso;
        syncedCount++;
      }
    });

    this.saveTokens(tokens);
    this.cacheQueues(centralQueues);

    window.dispatchEvent(new CustomEvent('sih_offline_sync_completed', { detail: { syncedCount } }));
    return { syncedCount, errors: 0 };
  }
};
