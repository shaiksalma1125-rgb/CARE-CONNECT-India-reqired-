import React, { useState, useMemo, useEffect } from 'react';
import {
  Hospital,
  Doctor,
  HospitalService,
  MedicineStock,
  Appointment,
  Complaint,
  User,
  LanguageCode
} from '../../types';
import { apiStore } from '../../services/apiStore';
import { translations } from '../../utils/translations';
import {
  Building2,
  Stethoscope,
  Activity,
  Pill,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Save,
  Clock,
  Mail,
  Lock,
  LogIn,
  Edit3,
  Trash2,
  Search,
  ShieldCheck,
  Check,
  X,
  MapPin,
  Phone,
  Filter,
  User as UserIcon,
  Tag,
  ShieldAlert,
  ArrowRight,
  RotateCw
} from 'lucide-react';

interface AdminDashboardViewProps {
  currentUser: User | null;
  onNavigate: (view: string, payload?: any) => void;
  language: LanguageCode;
  onUserAuth?: (user: User) => void;
  refreshKey?: number;
  onRefresh?: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUser,
  onNavigate,
  language,
  onUserAuth,
  refreshKey,
  onRefresh
}) => {
  const t = translations[language];
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    if (refreshKey !== undefined) {
      setDataVersion((v) => v + 1);
    }
  }, [refreshKey]);

  const allHospitals = useMemo(() => {
    return apiStore.getHospitals();
  }, [dataVersion]);

  // Authentication state for Hospital Admin login
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Active hospital for this Hospital Admin
  // If the logged in user is HOSPITAL_ADMIN / ADMIN, their assigned hospitalId is strictly enforced.
  const isHospitalAdmin =
    currentUser && (currentUser.role === 'HOSPITAL_ADMIN' || currentUser.role === 'ADMIN');

  const defaultHospitalId =
    currentUser?.hospitalId || (allHospitals[0] ? allHospitals[0].id : 'hosp-1');

  const [activeHospitalId, setActiveHospitalId] = useState<string>(defaultHospitalId);

  // Synchronize when currentUser's hospitalId changes
  useEffect(() => {
    if (currentUser?.hospitalId) {
      setActiveHospitalId((prev) => (prev !== currentUser.hospitalId ? currentUser.hospitalId! : prev));
    }
  }, [currentUser?.hospitalId]);

  // Tab state
  const [activeTab, setActiveTab] = useState<
    'overview' | 'hospital-info' | 'doctors' | 'services' | 'medicines' | 'appointments' | 'add-hospital'
  >('overview');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const refreshData = () => {
    setDataVersion((v) => v + 1);
  };

  // Hospital Details under management
  const currentHospital = useMemo(() => {
    return apiStore.getHospitalById(activeHospitalId) || allHospitals[0];
  }, [activeHospitalId, allHospitals]);

  // Strict hospital data isolation
  const doctors = useMemo(() => {
    return apiStore.getDoctors(activeHospitalId);
  }, [activeHospitalId, dataVersion]);

  const services = useMemo(() => {
    return apiStore.getServices(activeHospitalId);
  }, [activeHospitalId, dataVersion]);

  const medicines = useMemo(() => {
    return apiStore.getMedicines(activeHospitalId);
  }, [activeHospitalId, dataVersion]);

  const appointments = useMemo(() => {
    return apiStore.getAppointments(activeHospitalId);
  }, [activeHospitalId, dataVersion]);

  const complaints = useMemo(() => {
    return apiStore.getComplaints(activeHospitalId);
  }, [activeHospitalId, dataVersion]);

  const stats = useMemo(() => {
    return apiStore.getHospitalAdminStats(activeHospitalId);
  }, [activeHospitalId, dataVersion]);

  // -------------------------------------------------------------
  // LOGIN HANDLER (Hospital Admin authentication)
  // -------------------------------------------------------------
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const user = apiStore.login(authEmail.trim(), authPassword, 'HOSPITAL_ADMIN');
      if (!user) {
        setAuthError(
          'Access Denied: Invalid Hospital Admin credentials or password. Please verify your official hospital email.'
        );
        return;
      }
      if (onUserAuth) {
        onUserAuth(user);
      }
      if (user.hospitalId) {
        setActiveHospitalId(user.hospitalId);
      }
      showNotification(`Welcome, ${user.name}! Hospital Admin session authenticated.`);
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Quick switch between Hospital Admin demo accounts to test cross-hospital data isolation
  const handleSwitchAdminAccount = (hospId: string) => {
    const user = apiStore.switchDemoUser('HOSPITAL_ADMIN', hospId);
    if (onUserAuth) {
      onUserAuth(user);
    }
    setActiveHospitalId(hospId);
    showNotification(`Switched to Hospital Admin account for: ${user.name}`);
    refreshData();
  };

  // -------------------------------------------------------------
  // 1. MANAGE HOSPITAL DETAILS & INFORMATION
  // -------------------------------------------------------------
  const [hospForm, setHospForm] = useState<Partial<Hospital>>({});
  const [newFacilityTag, setNewFacilityTag] = useState('');

  useEffect(() => {
    const hosp = apiStore.getHospitalById(activeHospitalId);
    if (hosp) {
      setHospForm({
        name: hosp.name,
        hospitalType: hosp.hospitalType,
        address: hosp.address,
        village: hosp.village,
        mandal: hosp.mandal,
        district: hosp.district,
        state: hosp.state,
        pincode: hosp.pincode,
        phone: hosp.phone,
        emergencyPhone: hosp.emergencyPhone,
        openingHours: hosp.openingHours,
        facilities: [...(hosp.facilities || [])],
        emergencyAvailable: hosp.emergencyAvailable,
        isOpen: hosp.isOpen
      });
    }
  }, [activeHospitalId, dataVersion]);

  const handleSaveHospitalDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospForm.name?.trim()) {
      showNotification('Hospital name is required.', 'error');
      return;
    }

    apiStore.saveHospital({
      ...hospForm,
      id: activeHospitalId,
      name: hospForm.name.trim()
    });

    refreshData();
    showNotification('Hospital information and operating details updated successfully.');
  };

  const handleAddFacilityTag = () => {
    if (!newFacilityTag.trim()) return;
    const currentFacilities = hospForm.facilities || [];
    if (!currentFacilities.includes(newFacilityTag.trim())) {
      setHospForm({
        ...hospForm,
        facilities: [...currentFacilities, newFacilityTag.trim()]
      });
    }
    setNewFacilityTag('');
  };

  const handleRemoveFacilityTag = (tag: string) => {
    setHospForm({
      ...hospForm,
      facilities: (hospForm.facilities || []).filter((f) => f !== tag)
    });
  };

  // -------------------------------------------------------------
  // 2. DOCTORS MANAGEMENT (Add, Edit, Delete, Specializations, Availability, Slots)
  // -------------------------------------------------------------
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [docFilterSpec, setDocFilterSpec] = useState<string>('All');
  const [docFilterStatus, setDocFilterStatus] = useState<string>('All');

  const [docName, setDocName] = useState('');
  const [docSpecialization, setDocSpecialization] = useState('General Medicine');
  const [docQualification, setDocQualification] = useState('MBBS, MD');
  const [docExperience, setDocExperience] = useState<number>(8);
  const [docConsultationFee, setDocConsultationFee] = useState<number>(0);
  const [docStatus, setDocStatus] = useState<'AVAILABLE' | 'IN_CONSULTATION' | 'ON_LEAVE'>('AVAILABLE');
  const [docAvailableDays, setDocAvailableDays] = useState<string[]>([
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
  ]);
  const [docTimeSlots, setDocTimeSlots] = useState<string[]>([
    '09:00 AM - 10:30 AM',
    '11:00 AM - 12:30 PM',
    '02:00 PM - 03:30 PM'
  ]);
  const [newSlotInput, setNewSlotInput] = useState('');

  const openAddDoctorModal = () => {
    setEditingDoctor(null);
    setDocName('');
    setDocSpecialization('General Medicine');
    setDocQualification('MBBS, MD');
    setDocExperience(6);
    setDocConsultationFee(0);
    setDocStatus('AVAILABLE');
    setDocAvailableDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
    setDocTimeSlots(['09:00 AM - 10:30 AM', '11:00 AM - 12:30 PM', '02:00 PM - 03:30 PM']);
    setDoctorModalOpen(true);
  };

  const openEditDoctorModal = (doc: Doctor) => {
    setEditingDoctor(doc);
    setDocName(doc.name);
    setDocSpecialization(doc.specialization);
    setDocQualification(doc.qualification);
    setDocExperience(doc.experience);
    setDocConsultationFee(doc.consultationFee);
    setDocStatus(doc.availabilityStatus);
    setDocAvailableDays([...doc.availableDays]);
    setDocTimeSlots([...doc.timeSlots]);
    setDoctorModalOpen(true);
  };

  const handleSaveDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) {
      showNotification('Doctor name is required.', 'error');
      return;
    }
    if (docTimeSlots.length === 0) {
      showNotification('Please add at least one appointment time slot.', 'error');
      return;
    }

    apiStore.saveDoctor({
      id: editingDoctor ? editingDoctor.id : undefined,
      hospitalId: activeHospitalId,
      name: docName.trim(),
      specialization: docSpecialization.trim(),
      qualification: docQualification.trim(),
      experience: Number(docExperience) || 0,
      consultationFee: Number(docConsultationFee) || 0,
      availabilityStatus: docStatus,
      availableDays: docAvailableDays,
      timeSlots: docTimeSlots
    });

    setDoctorModalOpen(false);
    refreshData();
    showNotification(
      editingDoctor
        ? `Doctor profile and availability for ${docName} updated.`
        : `New doctor ${docName} added to hospital panel.`
    );
  };

  const handleDeleteDoctor = (doc: Doctor) => {
    if (window.confirm(`Are you sure you want to remove ${doc.name} from ${currentHospital?.name}?`)) {
      apiStore.deleteDoctor(doc.id);
      refreshData();
      showNotification(`${doc.name} has been removed from the hospital panel.`);
    }
  };

  const handleToggleDocStatus = (doc: Doctor, newStatus: 'AVAILABLE' | 'IN_CONSULTATION' | 'ON_LEAVE') => {
    apiStore.updateDoctorStatus(doc.id, newStatus);
    refreshData();
    showNotification(`${doc.name} status updated to ${String(newStatus || 'AVAILABLE').replace(/_/g, ' ')}.`);
  };

  const handleAddSlot = () => {
    if (!newSlotInput.trim()) return;
    if (!docTimeSlots.includes(newSlotInput.trim())) {
      setDocTimeSlots([...docTimeSlots, newSlotInput.trim()]);
    }
    setNewSlotInput('');
  };

  const handleRemoveSlot = (slot: string) => {
    setDocTimeSlots(docTimeSlots.filter((s) => s !== slot));
  };

  const toggleDayOfWeek = (day: string) => {
    if (docAvailableDays.includes(day)) {
      if (docAvailableDays.length > 1) {
        setDocAvailableDays(docAvailableDays.filter((d) => d !== day));
      }
    } else {
      setDocAvailableDays([...docAvailableDays, day]);
    }
  };

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const matchSpec = docFilterSpec === 'All' || doc.specialization === docFilterSpec;
      const matchStatus = docFilterStatus === 'All' || doc.availabilityStatus === docFilterStatus;
      return matchSpec && matchStatus;
    });
  }, [doctors, docFilterSpec, docFilterStatus]);

  const uniqueSpecializations = useMemo(() => {
    return Array.from(new Set(doctors.map((d) => d.specialization)));
  }, [doctors]);

  // -------------------------------------------------------------
  // 3. HEALTHCARE SERVICES MANAGEMENT (Add, Edit, Delete, Availability)
  // -------------------------------------------------------------
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<HospitalService | null>(null);
  const [srvName, setSrvName] = useState('');
  const [srvCategory, setSrvCategory] = useState('Laboratory & Diagnostics');
  const [srvWaitingTime, setSrvWaitingTime] = useState('15 mins');
  const [srvDescription, setSrvDescription] = useState('');
  const [srvAvailable, setSrvAvailable] = useState(true);

  const openAddServiceModal = () => {
    setEditingService(null);
    setSrvName('');
    setSrvCategory('Laboratory & Diagnostics');
    setSrvWaitingTime('15 mins');
    setSrvDescription('');
    setSrvAvailable(true);
    setServiceModalOpen(true);
  };

  const openEditServiceModal = (srv: HospitalService) => {
    setEditingService(srv);
    setSrvName(srv.serviceName);
    setSrvCategory(srv.category);
    setSrvWaitingTime(srv.waitingTime);
    setSrvDescription(srv.description || '');
    setSrvAvailable(srv.available);
    setServiceModalOpen(true);
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!srvName.trim()) {
      showNotification('Service name is required.', 'error');
      return;
    }

    apiStore.saveService({
      id: editingService ? editingService.id : undefined,
      hospitalId: activeHospitalId,
      serviceName: srvName.trim(),
      category: srvCategory.trim(),
      waitingTime: srvWaitingTime.trim(),
      description: srvDescription.trim() || 'Available clinical facility.',
      available: srvAvailable
    });

    setServiceModalOpen(false);
    refreshData();
    showNotification(
      editingService
        ? `Healthcare service ${srvName} updated.`
        : `New service ${srvName} activated for patients.`
    );
  };

  const handleDeleteService = (srv: HospitalService) => {
    if (window.confirm(`Delete service "${srv.serviceName}" from this hospital?`)) {
      apiStore.deleteService(srv.id);
      refreshData();
      showNotification(`Service "${srv.serviceName}" removed.`);
    }
  };

  const handleToggleServiceStatus = (srv: HospitalService) => {
    apiStore.updateServiceStatus(srv.id, !srv.available);
    refreshData();
    showNotification(
      `Service "${srv.serviceName}" status changed to ${!srv.available ? 'Active' : 'Suspended'}.`
    );
  };

  // -------------------------------------------------------------
  // 4. MEDICINES & STOCK MANAGEMENT (Add, Edit, Delete, Stock Levels)
  // -------------------------------------------------------------
  const [medicineModalOpen, setMedicineModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<MedicineStock | null>(null);
  const [medFilterStatus, setMedFilterStatus] = useState<string>('All');
  const [medSearchQuery, setMedSearchQuery] = useState('');

  const [medName, setMedName] = useState('');
  const [medCategory, setMedCategory] = useState('Essential Formulary');
  const [medQuantity, setMedQuantity] = useState<number>(200);
  const [medThreshold, setMedThreshold] = useState<number>(50);

  const openAddMedicineModal = () => {
    setEditingMedicine(null);
    setMedName('');
    setMedCategory('Essential Formulary');
    setMedQuantity(150);
    setMedThreshold(40);
    setMedicineModalOpen(true);
  };

  const openEditMedicineModal = (med: MedicineStock) => {
    setEditingMedicine(med);
    setMedName(med.medicineName);
    setMedCategory(med.category);
    setMedQuantity(med.quantity);
    setMedThreshold(med.minimumThreshold);
    setMedicineModalOpen(true);
  };

  const handleSaveMedicine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName.trim()) {
      showNotification('Medicine name is required.', 'error');
      return;
    }

    apiStore.saveMedicine({
      id: editingMedicine ? editingMedicine.id : undefined,
      hospitalId: activeHospitalId,
      medicineName: medName.trim(),
      category: medCategory.trim(),
      quantity: Number(medQuantity) || 0,
      minimumThreshold: Number(medThreshold) || 30
    });

    setMedicineModalOpen(false);
    refreshData();
    showNotification(
      editingMedicine
        ? `Medicine stock for ${medName} updated.`
        : `New medicine ${medName} added to pharmacy inventory.`
    );
  };

  const handleDeleteMedicine = (med: MedicineStock) => {
    if (window.confirm(`Delete ${med.medicineName} from pharmacy inventory?`)) {
      apiStore.deleteMedicine(med.id);
      refreshData();
      showNotification(`${med.medicineName} removed from inventory.`);
    }
  };

  const handleAdjustStock = (med: MedicineStock, delta: number) => {
    const newQty = Math.max(0, med.quantity + delta);
    apiStore.updateMedicineStock(med.id, newQty);
    refreshData();
  };

  const filteredMedicines = useMemo(() => {
    const q = String(medSearchQuery || '').trim().toLowerCase();
    return medicines.filter((m) => {
      const matchSearch =
        !q ||
        String(m.medicineName || '').toLowerCase().includes(q) ||
        String(m.category || '').toLowerCase().includes(q);

      const matchStatus =
        medFilterStatus === 'All' ||
        (medFilterStatus === 'AVAILABLE' && m.status === 'AVAILABLE') ||
        (medFilterStatus === 'LOW_STOCK' && m.status === 'LOW_STOCK') ||
        (medFilterStatus === 'OUT_OF_STOCK' && m.status === 'OUT_OF_STOCK');

      return matchSearch && matchStatus;
    });
  }, [medicines, medSearchQuery, medFilterStatus]);

  // -------------------------------------------------------------
  // 5. APPOINTMENTS MANAGEMENT (Slots, Statuses, Patient Queue)
  // -------------------------------------------------------------
  const [aptStatusFilter, setAptStatusFilter] = useState<string>('All');
  const [aptSearch, setAptSearch] = useState('');
  const [aptDateFilter, setAptDateFilter] = useState<'ALL' | 'TODAY' | 'UPCOMING'>('ALL');

  const todayStr = new Date().toISOString().split('T')[0];

  const handleUpdateAppointmentStatus = (aptId: string, newStatus: Appointment['status']) => {
    apiStore.updateAppointmentStatus(aptId, newStatus);
    refreshData();
    showNotification(`Appointment status updated to ${newStatus}.`);
  };

  const filteredAppointments = useMemo(() => {
    const q = String(aptSearch || '').trim().toLowerCase();
    return appointments.filter((apt) => {
      const matchStatus = aptStatusFilter === 'All' || apt.status === aptStatusFilter;
      const matchSearch =
        !q ||
        String(apt.patientName || '').toLowerCase().includes(q) ||
        String(apt.tokenNumber || '').toLowerCase().includes(q) ||
        String(apt.doctorName || '').toLowerCase().includes(q) ||
        String(apt.appointmentId || '').toLowerCase().includes(q);

      let matchDate = true;
      if (aptDateFilter === 'TODAY') {
        matchDate = apt.appointmentDate === todayStr;
      } else if (aptDateFilter === 'UPCOMING') {
        matchDate = apt.appointmentDate >= todayStr;
      }

      return matchStatus && matchSearch && matchDate;
    });
  }, [appointments, aptStatusFilter, aptSearch, aptDateFilter, todayStr]);

  // -------------------------------------------------------------
  // 6. ONBOARD / REGISTER NEW HOSPITAL
  // -------------------------------------------------------------
  const [newHospName, setNewHospName] = useState('');
  const [newHospType, setNewHospType] = useState<Hospital['hospitalType']>('Government Hospital');
  const [newHospAddress, setNewHospAddress] = useState('');
  const [newHospDistrict, setNewHospDistrict] = useState('NTR District');
  const [newHospState, setNewHospState] = useState('Andhra Pradesh');
  const [newHospPincode, setNewHospPincode] = useState('520001');
  const [newHospPhone, setNewHospPhone] = useState('+91 866-2475100');
  const [newHospEmergencyPhone, setNewHospEmergencyPhone] = useState('108 / 102');
  const [newHospOpeningHours, setNewHospOpeningHours] = useState('24 Hours | OPD: 08:30 AM - 01:30 PM');

  const handleCreateNewHospital = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHospName.trim()) {
      showNotification('Hospital facility name is required.', 'error');
      return;
    }

    const createdHosp = apiStore.saveHospital({
      name: newHospName.trim(),
      hospitalType: newHospType,
      address: newHospAddress.trim() || 'Main Hospital Road',
      district: newHospDistrict.trim(),
      state: newHospState.trim(),
      pincode: newHospPincode.trim(),
      phone: newHospPhone.trim(),
      emergencyPhone: newHospEmergencyPhone.trim(),
      openingHours: newHospOpeningHours.trim(),
      facilities: ['24x7 Emergency Casualty', 'General OPD', 'Jan Aushadhi Medical Store', 'Diagnostic Lab'],
      emergencyAvailable: true,
      isOpen: true
    });

    // If logged in, connect current admin to this hospital
    if (currentUser) {
      apiStore.assignHospitalToUser(currentUser.id, createdHosp.id);
    }

    setActiveHospitalId(createdHosp.id);
    setActiveTab('overview');
    refreshData();
    showNotification(`New hospital "${createdHosp.name}" successfully registered and set as active.`);

    // Reset onboarding form
    setNewHospName('');
    setNewHospAddress('');
  };

  // -------------------------------------------------------------
  // AUTHENTICATION SCREEN (If user is not logged in as Hospital Admin)
  // -------------------------------------------------------------
  if (!isHospitalAdmin) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 animate-fade-in">
        {/* Title Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-inner">
                <Building2 className="w-6 h-6 text-blue-200" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-300">
                  Government of India • Ministry of Health
                </span>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Hospital Admin Portal</h1>
                <p className="text-xs text-blue-200">
                  Administrative control panel for managing hospital facilities, doctors, slots, and inventory.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Login & Demo Accounts Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sign In Form */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-1">Hospital Admin Sign In</h2>
            <p className="text-xs text-slate-500 mb-5">
              Enter your designated Hospital Admin credentials to manage your assigned healthcare facility.
            </p>

            {authError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hospital Admin Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="e.g. admin.ggh@hospital.gov.in"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{authLoading ? 'Verifying...' : 'Access Hospital Admin Dashboard'}</span>
              </button>
            </form>
          </div>

          {/* Quick Demo Hospital Admin Accounts */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  One-Click Demo Hospital Admins
                </h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Click any hospital below to log in as its dedicated Hospital Admin and test hospital-specific data isolation:
              </p>

              <div className="space-y-2.5">
                {allHospitals.slice(0, 3).map((hosp) => (
                  <button
                    key={hosp.id}
                    type="button"
                    onClick={() => handleSwitchAdminAccount(hosp.id)}
                    className="w-full p-3 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-sm transition-all text-left flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-800 group-hover:text-blue-600">
                        {hosp.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Admin: {hosp.id === 'hosp-1' ? 'admin.ggh@hospital.gov.in' : hosp.id === 'hosp-2' ? 'admin.chc@hospital.gov.in' : 'admin.phc@hospital.gov.in'}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      Manage →
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200 text-[11px] text-slate-500">
                <p>
                  <strong>Data Isolation Guarantee:</strong> Each Hospital Admin only sees and edits doctors, services, medicines, and appointments for their own facility.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // AUTHENTICATED HOSPITAL ADMIN DASHBOARD
  // -------------------------------------------------------------
  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-medium flex items-center justify-between border shadow-md animate-fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Admin Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] font-bold text-blue-200 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Hospital Administrator Workspace</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>{currentHospital?.name}</span>
            </h1>

            <p className="text-xs sm:text-sm text-blue-200 max-w-2xl flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-300 shrink-0" />
              <span>
                {currentHospital?.address}, {currentHospital?.district}, {currentHospital?.state} • Pin: {currentHospital?.pincode}
              </span>
            </p>
          </div>

          {/* Hospital Context & Admin Identity Card */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-xs text-white space-y-2 shrink-0 min-w-[280px]">
            <div className="flex items-center justify-between">
              <span className="text-blue-300 font-medium">Logged In Administrator:</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                Active
              </span>
            </div>
            <div className="font-bold text-sm text-white truncate">{currentUser?.name}</div>
            <div className="text-blue-200 text-[11px] truncate">{currentUser?.email}</div>

            {/* Hospital Selector for Multi-Hospital Admin Simulation */}
            <div className="pt-2 border-t border-white/15">
              <label className="block text-[10px] uppercase font-bold text-blue-300 mb-1">
                Connected Hospital:
              </label>
              <select
                value={activeHospitalId}
                onChange={(e) => handleSwitchAdminAccount(e.target.value)}
                className="w-full bg-slate-900/90 text-white rounded-xl px-2.5 py-1.5 text-xs font-semibold border border-white/20 focus:outline-hidden focus:ring-2 focus:ring-blue-400 cursor-pointer"
              >
                {allHospitals.map((h) => (
                  <option key={h.id} value={h.id} className="bg-slate-900 text-white">
                    {h.name} ({h.hospitalType})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Dashboard Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('hospital-info')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'hospital-info'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Hospital Details</span>
          </button>

          <button
            onClick={() => setActiveTab('doctors')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'doctors'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Doctors & Slots ({doctors.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'services'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Healthcare Services ({services.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('medicines')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'medicines'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Pill className="w-4 h-4" />
            <span>Medicine Stock ({medicines.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('appointments')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'appointments'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Appointments Queue ({appointments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('add-hospital')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'add-hospital'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Hospital to Portal</span>
          </button>

          {/* Dedicated Refresh Option */}
          <button
            id="admin-refresh-dashboard-btn"
            type="button"
            onClick={() => {
              if (onRefresh) {
                onRefresh();
              } else {
                refreshData();
                showNotification('Admin dashboard data refreshed.');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 transition-all cursor-pointer shrink-0 ml-auto"
            title="Refresh hospital telemetry, OPD queues, doctors roster, and pharmacy stock"
          >
            <RotateCw className="w-3.5 h-3.5 text-blue-600" />
            <span>Refresh Dashboard</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: DASHBOARD OVERVIEW */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Key Metric Cards for THIS hospital */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Doctors On Duty
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Stethoscope className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {stats.availableDoctors} / {stats.totalDoctors}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {stats.availableDoctors} available for patient OPD
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Clinical Services
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {stats.activeServices} / {stats.totalServices}
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                All critical diagnostics operational
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Pharmacy Formulary
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Pill className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{stats.totalMedicines}</div>
              <div className="text-[11px] text-amber-600 font-semibold mt-1">
                {stats.lowStockMedicines} low stock • {stats.outOfStockMedicines} out of stock
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Appointments Today
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{stats.todayAppointments}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                {stats.totalAppointments} total patient bookings
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h3 className="font-bold text-sm text-slate-900">Hospital Administration Actions</h3>
              <p className="text-xs text-slate-500">
                Directly configure your hospital's public profile, medical staff, services, and inventory.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={openAddDoctorModal}
                className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Doctor</span>
              </button>
              <button
                onClick={openAddServiceModal}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Service</span>
              </button>
              <button
                onClick={openAddMedicineModal}
                className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Medicine</span>
              </button>
              <button
                onClick={() => setActiveTab('hospital-info')}
                className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit Hospital Info</span>
              </button>
            </div>
          </div>

          {/* Hospital Overview Split Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Recent Appointments for this hospital */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Recent Patient Appointments</h3>
                  <p className="text-xs text-slate-500">Live queue bookings for {currentHospital?.name}</p>
                </div>
                <button
                  onClick={() => setActiveTab('appointments')}
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View All ({appointments.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {appointments.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No appointments booked for this hospital yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {appointments.slice(0, 5).map((apt) => (
                    <div
                      key={apt.id}
                      className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{apt.patientName}</span>
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono text-[10px] font-bold">
                            {apt.tokenNumber}
                          </span>
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          Doctor: <span className="font-semibold text-slate-700">{apt.doctorName}</span> • Slot: {apt.appointmentTime}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            apt.status === 'CONFIRMED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : apt.status === 'COMPLETED'
                              ? 'bg-blue-100 text-blue-800'
                              : apt.status === 'CANCELLED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {apt.status}
                        </span>

                        {apt.status === 'BOOKED' && (
                          <button
                            onClick={() => handleUpdateAppointmentStatus(apt.id, 'CONFIRMED')}
                            className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] hover:bg-emerald-700 cursor-pointer"
                          >
                            Confirm
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Hospital Profile Highlights */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900">Hospital Profile Summary</h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Hospital Category:</span>
                  <span className="font-semibold text-slate-800">{currentHospital?.hospitalType}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Contact Phone:</span>
                  <span className="font-semibold text-slate-800">{currentHospital?.phone}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">24x7 Emergency Line:</span>
                  <span className="font-semibold text-rose-600">{currentHospital?.emergencyPhone}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">OPD & Casualty Hours:</span>
                  <span className="font-semibold text-slate-800">{currentHospital?.openingHours}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Emergency Casualty:</span>
                  <span
                    className={`font-bold ${
                      currentHospital?.emergencyAvailable ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  >
                    {currentHospital?.emergencyAvailable ? 'Available 24x7' : 'Not Available'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Public Grievances / Complaints:</span>
                  <span className="font-semibold text-slate-800">{complaints.length} registered</span>
                </div>
              </div>

              {/* Key Facility Tags */}
              <div className="pt-2">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Configured Hospital Facilities:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {currentHospital?.facilities?.map((f, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-[11px] font-medium"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: MANAGE HOSPITAL DETAILS & INFORMATION */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'hospital-info' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs animate-fade-in">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Manage Hospital Details & Information</h2>
              <p className="text-xs text-slate-500">
                Update official contact numbers, operating timings, location details, and available infrastructure.
              </p>
            </div>
            <button
              onClick={handleSaveHospitalDetails}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Hospital Changes</span>
            </button>
          </div>

          <form onSubmit={handleSaveHospitalDetails} className="space-y-6 text-xs">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hospital Facility Name *</label>
                <input
                  type="text"
                  required
                  value={hospForm.name || ''}
                  onChange={(e) => setHospForm({ ...hospForm, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hospital Type *</label>
                <select
                  value={hospForm.hospitalType || 'Government Hospital'}
                  onChange={(e) =>
                    setHospForm({ ...hospForm, hospitalType: e.target.value as Hospital['hospitalType'] })
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="Government Hospital">Government General Hospital (GGH)</option>
                  <option value="District Hospital">District Hospital</option>
                  <option value="Community Health Centre (CHC)">Community Health Centre (CHC)</option>
                  <option value="Primary Health Centre (PHC)">Primary Health Centre (PHC)</option>
                  <option value="Area Hospital">Area Hospital</option>
                  <option value="Sub-District Hospital">Sub-District Hospital</option>
                  <option value="Clinic">Ayushman Arogya Mandir / Clinic</option>
                  <option value="Diagnostic Centre">Diagnostic Centre</option>
                  <option value="Blood Bank">Blood Bank</option>
                </select>
              </div>
            </div>

            {/* Address & Location */}
            <div className="space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Location & Address Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    value={hospForm.address || ''}
                    onChange={(e) => setHospForm({ ...hospForm, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    value={hospForm.pincode || ''}
                    onChange={(e) => setHospForm({ ...hospForm, pincode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Village / Locality</label>
                  <input
                    type="text"
                    value={hospForm.village || ''}
                    onChange={(e) => setHospForm({ ...hospForm, village: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mandal / Taluka</label>
                  <input
                    type="text"
                    value={hospForm.mandal || ''}
                    onChange={(e) => setHospForm({ ...hospForm, mandal: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">District</label>
                  <input
                    type="text"
                    value={hospForm.district || ''}
                    onChange={(e) => setHospForm({ ...hospForm, district: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={hospForm.state || ''}
                    onChange={(e) => setHospForm({ ...hospForm, state: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Contact & Hours */}
            <div className="space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Contact & Timings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Hospital Phone</label>
                  <input
                    type="text"
                    value={hospForm.phone || ''}
                    onChange={(e) => setHospForm({ ...hospForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Emergency / Ambulance Hotline</label>
                  <input
                    type="text"
                    value={hospForm.emergencyPhone || ''}
                    onChange={(e) => setHospForm({ ...hospForm, emergencyPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Opening Hours & OPD Timings</label>
                  <input
                    type="text"
                    value={hospForm.openingHours || ''}
                    onChange={(e) => setHospForm({ ...hospForm, openingHours: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Facility Features & Tags */}
            <div className="space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Hospital Facilities & Clinical Units
              </h3>
              <div className="flex flex-wrap gap-2 items-center">
                {(hospForm.facilities || []).map((f, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-medium"
                  >
                    <span>{f}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFacilityTag(f)}
                      className="text-blue-500 hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2 max-w-md mt-2">
                <input
                  type="text"
                  value={newFacilityTag}
                  onChange={(e) => setNewFacilityTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddFacilityTag();
                    }
                  }}
                  placeholder="e.g. ICU / Trauma Ward, Blood Storage"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleAddFacilityTag}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-white font-semibold text-xs hover:bg-slate-900 cursor-pointer"
                >
                  Add Tag
                </button>
              </div>
            </div>

            {/* Status Toggles */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hospForm.emergencyAvailable ?? true}
                  onChange={(e) => setHospForm({ ...hospForm, emergencyAvailable: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded-sm"
                />
                <div>
                  <span className="font-bold text-slate-800 block">24x7 Emergency Casualty Available</span>
                  <span className="text-[11px] text-slate-500">
                    Indicates immediate accident/trauma intake is ready.
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hospForm.isOpen ?? true}
                  onChange={(e) => setHospForm({ ...hospForm, isOpen: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded-sm"
                />
                <div>
                  <span className="font-bold text-slate-800 block">Facility Currently Open</span>
                  <span className="text-[11px] text-slate-500">
                    Toggle active operational status for citizen search.
                  </span>
                </div>
              </label>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save All Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: DOCTORS & SPECIALIZATIONS & SLOTS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'doctors' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Manage Doctors, Specializations & Slots</h2>
              <p className="text-xs text-slate-500">
                Staff directory for {currentHospital?.name}. Add or edit doctor profiles, on-duty days, and OPD slots.
              </p>
            </div>
            <button
              onClick={openAddDoctorModal}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-2 self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Doctor</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-semibold text-slate-600">Specialization:</span>
                <select
                  value={docFilterSpec}
                  onChange={(e) => setDocFilterSpec(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-medium cursor-pointer"
                >
                  <option value="All">All Specializations</option>
                  {uniqueSpecializations.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">Status:</span>
                <select
                  value={docFilterStatus}
                  onChange={(e) => setDocFilterStatus(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-medium cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="IN_CONSULTATION">In Consultation</option>
                  <option value="ON_LEAVE">On Leave</option>
                </select>
              </div>
            </div>

            <div className="text-slate-500 text-[11px]">
              Showing {filteredDoctors.length} of {doctors.length} doctors
            </div>
          </div>

          {/* Doctors Table / Cards */}
          {filteredDoctors.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Stethoscope className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-sm font-semibold">No doctors found matching criteria.</p>
              <button
                onClick={openAddDoctorModal}
                className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
              >
                + Add doctor to {currentHospital?.name}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDoctors.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-2xl border border-slate-200 p-4 bg-white hover:border-blue-300 hover:shadow-xs transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 leading-tight">{doc.name}</h4>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold text-[10px]">
                          {doc.specialization}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          doc.availabilityStatus === 'AVAILABLE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : doc.availabilityStatus === 'IN_CONSULTATION'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {String(doc.availabilityStatus || 'AVAILABLE').replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 space-y-0.5">
                      <div>
                        <strong>Qualification:</strong> {doc.qualification}
                      </div>
                      <div>
                        <strong>Experience:</strong> {doc.experience} years
                      </div>
                      <div>
                        <strong>Consultation Fee:</strong>{' '}
                        {doc.consultationFee === 0 ? 'Free (Public Health)' : `₹${doc.consultationFee}`}
                      </div>
                    </div>

                    {/* Appointment Slots preview */}
                    <div className="pt-2 border-t border-slate-100">
                      <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                        Active Time Slots ({doc.timeSlots.length}):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {doc.timeSlots.map((slot, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-mono"
                          >
                            {slot}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Available Days */}
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                        Duty Days:
                      </span>
                      <div className="text-[11px] text-slate-600">
                        {doc.availableDays.join(', ')}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <select
                        value={doc.availabilityStatus}
                        onChange={(e) =>
                          handleToggleDocStatus(
                            doc,
                            e.target.value as 'AVAILABLE' | 'IN_CONSULTATION' | 'ON_LEAVE'
                          )
                        }
                        className="text-[10px] font-semibold rounded-lg border border-slate-200 px-2 py-1 bg-slate-50 text-slate-700 cursor-pointer"
                      >
                        <option value="AVAILABLE">Available</option>
                        <option value="IN_CONSULTATION">In Consultation</option>
                        <option value="ON_LEAVE">On Leave</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditDoctorModal(doc)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Edit Doctor & Slots"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDoctor(doc)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Doctor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: HEALTHCARE SERVICES */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'services' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Manage Healthcare Services</h2>
              <p className="text-xs text-slate-500">
                Clinical, diagnostic, and emergency procedures available at {currentHospital?.name}.
              </p>
            </div>
            <button
              onClick={openAddServiceModal}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-2 self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Healthcare Service</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((srv) => (
              <div
                key={srv.id}
                className="rounded-2xl border border-slate-200 p-4 bg-white hover:border-emerald-300 hover:shadow-xs transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-sm text-slate-900">{srv.serviceName}</h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        srv.available ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {srv.available ? 'Operational' : 'Suspended'}
                    </span>
                  </div>

                  <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                    {srv.category}
                  </span>

                  <p className="text-xs text-slate-500 line-clamp-2">{srv.description}</p>

                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Average Wait: <strong>{srv.waitingTime}</strong></span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleServiceStatus(srv)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                      srv.available
                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {srv.available ? 'Suspend Service' : 'Activate Service'}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditServiceModal(srv)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                      title="Edit Service"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteService(srv)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Service"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: MEDICINE STOCK & INVENTORY */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'medicines' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Manage Medicine Availability & Stock</h2>
              <p className="text-xs text-slate-500">
                Hospital dispensary inventory for {currentHospital?.name}. Monitor real-time shortages and reorder thresholds.
              </p>
            </div>
            <button
              onClick={openAddMedicineModal}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-2 self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Medicine Formulation</span>
            </button>
          </div>

          {/* Search & Status Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={medSearchQuery}
                onChange={(e) => setMedSearchQuery(e.target.value)}
                placeholder="Search medicines by name or category..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600">Stock Status:</span>
              <select
                value={medFilterStatus}
                onChange={(e) => setMedFilterStatus(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-medium cursor-pointer"
              >
                <option value="All">All Stock Levels</option>
                <option value="AVAILABLE">Available</option>
                <option value="LOW_STOCK">Low Stock (Alert)</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-3 px-4">Medicine Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Available Units</th>
                  <th className="py-3 px-4 text-center">Min Threshold</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Quick Adjust</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMedicines.map((med) => (
                  <tr key={med.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{med.medicineName}</td>
                    <td className="py-3 px-4 text-slate-600">{med.category}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                      {med.quantity}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-500">
                      {med.minimumThreshold}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          med.status === 'AVAILABLE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : med.status === 'LOW_STOCK'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {String(med.status || 'AVAILABLE').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleAdjustStock(med, -10)}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] cursor-pointer"
                        >
                          -10
                        </button>
                        <button
                          onClick={() => handleAdjustStock(med, 25)}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] cursor-pointer"
                        >
                          +25
                        </button>
                        <button
                          onClick={() => handleAdjustStock(med, 100)}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] cursor-pointer"
                        >
                          +100
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditMedicineModal(med)}
                          className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                          title="Edit Stock"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMedicine(med)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Delete Medicine"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 6: APPOINTMENTS & QUEUE MANAGEMENT */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">View & Manage Appointments</h2>
              <p className="text-xs text-slate-500">
                Patient OPD queue and digital bookings for {currentHospital?.name}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">
                Total Bookings: {appointments.length}
              </span>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={aptSearch}
                onChange={(e) => setAptSearch(e.target.value)}
                placeholder="Search patient, token, doctor, or ID..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">Date:</span>
                <select
                  value={aptDateFilter}
                  onChange={(e) => setAptDateFilter(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-medium cursor-pointer"
                >
                  <option value="ALL">All Dates</option>
                  <option value="TODAY">Today Only</option>
                  <option value="UPCOMING">Upcoming</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">Status:</span>
                <select
                  value={aptStatusFilter}
                  onChange={(e) => setAptStatusFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-medium cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="BOOKED">Booked</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Appointments List */}
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No appointments matching the selected filters for this hospital.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-200 hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-200">
                        {apt.tokenNumber}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900">{apt.patientName}</h4>
                      {apt.patientAge && (
                        <span className="text-slate-500">
                          ({apt.patientAge} yrs • {apt.patientGender || 'Citizen'})
                        </span>
                      )}
                    </div>

                    <div className="text-slate-600 flex flex-wrap items-center gap-4 text-[11px]">
                      <span>
                        Doctor: <strong>{apt.doctorName}</strong> ({apt.doctorSpecialization})
                      </span>
                      <span>•</span>
                      <span>
                        Date: <strong>{apt.appointmentDate}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Slot: <strong>{apt.appointmentTime}</strong>
                      </span>
                      {apt.patientPhone && (
                        <>
                          <span>•</span>
                          <span>Phone: {apt.patientPhone}</span>
                        </>
                      )}
                    </div>

                    {apt.reason && (
                      <div className="text-slate-500 text-[11px]">
                        <strong>Clinical Reason:</strong> {apt.reason}
                      </div>
                    )}
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        apt.status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : apt.status === 'COMPLETED'
                          ? 'bg-blue-100 text-blue-800'
                          : apt.status === 'CANCELLED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {apt.status}
                    </span>

                    {apt.status === 'BOOKED' && (
                      <button
                        onClick={() => handleUpdateAppointmentStatus(apt.id, 'CONFIRMED')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Confirm Slot
                      </button>
                    )}

                    {apt.status === 'CONFIRMED' && (
                      <button
                        onClick={() => handleUpdateAppointmentStatus(apt.id, 'COMPLETED')}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Mark Completed
                      </button>
                    )}

                    {apt.status !== 'CANCELLED' && apt.status !== 'COMPLETED' && (
                      <button
                        onClick={() => {
                          const reason = window.prompt('Enter cancellation reason (optional):');
                          handleUpdateAppointmentStatus(apt.id, 'CANCELLED');
                        }}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 7: ONBOARD / ADD NEW HOSPITAL TO PORTAL */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'add-hospital' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6 animate-fade-in">
          <div className="pb-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">
              Register New Hospital into Care Connect India
            </h2>
            <p className="text-xs text-slate-500">
              Onboard a new public health facility into the national directory. You can manage doctors, appointment slots, and pharmacy stock immediately.
            </p>
          </div>

          <form onSubmit={handleCreateNewHospital} className="space-y-6 text-xs max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Hospital Name *</label>
                <input
                  type="text"
                  required
                  value={newHospName}
                  onChange={(e) => setNewHospName(e.target.value)}
                  placeholder="e.g. Government Area Hospital, Nuzvid"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hospital Category *</label>
                <select
                  value={newHospType}
                  onChange={(e) => setNewHospType(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="Government Hospital">Government General Hospital</option>
                  <option value="District Hospital">District Hospital</option>
                  <option value="Community Health Centre (CHC)">Community Health Centre (CHC)</option>
                  <option value="Primary Health Centre (PHC)">Primary Health Centre (PHC)</option>
                  <option value="Area Hospital">Area Hospital</option>
                  <option value="Sub-District Hospital">Sub-District Hospital</option>
                  <option value="Clinic">Clinic</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Address / Landmark</label>
                <input
                  type="text"
                  value={newHospAddress}
                  onChange={(e) => setNewHospAddress(e.target.value)}
                  placeholder="e.g. Station Road, Near Bus Stand"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">District</label>
                <input
                  type="text"
                  value={newHospDistrict}
                  onChange={(e) => setNewHospDistrict(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newHospPhone}
                  onChange={(e) => setNewHospPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Emergency Line</label>
                <input
                  type="text"
                  value={newHospEmergencyPhone}
                  onChange={(e) => setNewHospEmergencyPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pincode</label>
                <input
                  type="text"
                  value={newHospPincode}
                  onChange={(e) => setNewHospPincode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Complete Hospital Registration & Manage</span>
            </button>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODALS: DOCTOR ADD/EDIT */}
      {/* ------------------------------------------------------------- */}
      {doctorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingDoctor ? `Edit Doctor: ${editingDoctor.name}` : 'Add New Doctor to Hospital'}
              </h3>
              <button
                onClick={() => setDoctorModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDoctor} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Doctor Name *</label>
                <input
                  type="text"
                  required
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g. Dr. S. Radhika, MD"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Specialization *</label>
                  <input
                    type="text"
                    required
                    value={docSpecialization}
                    onChange={(e) => setDocSpecialization(e.target.value)}
                    placeholder="e.g. Pediatrics, Cardiology"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Qualifications</label>
                  <input
                    type="text"
                    value={docQualification}
                    onChange={(e) => setDocQualification(e.target.value)}
                    placeholder="e.g. MBBS, MD, DNB"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Experience (yrs)</label>
                  <input
                    type="number"
                    min="0"
                    value={docExperience}
                    onChange={(e) => setDocExperience(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={docConsultationFee}
                    onChange={(e) => setDocConsultationFee(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={docStatus}
                    onChange={(e) => setDocStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="IN_CONSULTATION">In Consultation</option>
                    <option value="ON_LEAVE">On Leave</option>
                  </select>
                </div>
              </div>

              {/* On-duty Days */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Available Days of Week:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
                    (day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDayOfWeek(day)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          docAvailableDays.includes(day)
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {day.substring(0, 3)}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Appointment Slots */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  OPD Appointment Time Slots:
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {docTimeSlots.map((slot, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[11px]"
                    >
                      <span>{slot}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(slot)}
                        className="text-blue-500 hover:text-rose-600 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSlotInput}
                    onChange={(e) => setNewSlotInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSlot();
                      }
                    }}
                    placeholder="e.g. 03:00 PM - 04:30 PM"
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddSlot}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-white font-semibold text-xs hover:bg-slate-900 cursor-pointer"
                  >
                    + Add Slot
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDoctorModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer"
                >
                  Save Doctor Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODALS: SERVICE ADD/EDIT */}
      {/* ------------------------------------------------------------- */}
      {serviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingService ? `Edit Service: ${editingService.serviceName}` : 'Add Healthcare Service'}
              </h3>
              <button
                onClick={() => setServiceModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  value={srvName}
                  onChange={(e) => setSrvName(e.target.value)}
                  placeholder="e.g. Digital X-Ray & Ultrasound"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={srvCategory}
                    onChange={(e) => setSrvCategory(e.target.value)}
                    placeholder="e.g. Diagnostics, Radiology"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Average Wait Time</label>
                  <input
                    type="text"
                    value={srvWaitingTime}
                    onChange={(e) => setSrvWaitingTime(e.target.value)}
                    placeholder="e.g. 15 mins, 30 mins"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={srvDescription}
                  onChange={(e) => setSrvDescription(e.target.value)}
                  placeholder="Provide brief details for patients..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={srvAvailable}
                  onChange={(e) => setSrvAvailable(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-sm"
                />
                <span className="font-semibold text-slate-700">Currently active and operational</span>
              </label>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setServiceModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODALS: MEDICINE ADD/EDIT */}
      {/* ------------------------------------------------------------- */}
      {medicineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingMedicine
                  ? `Edit Medicine: ${editingMedicine.medicineName}`
                  : 'Add Medicine Formulation'}
              </h3>
              <button
                onClick={() => setMedicineModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMedicine} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Medicine Name & Strength *</label>
                <input
                  type="text"
                  required
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  placeholder="e.g. Paracetamol 500mg Tablets"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category</label>
                <input
                  type="text"
                  value={medCategory}
                  onChange={(e) => setMedCategory(e.target.value)}
                  placeholder="e.g. Essential Formulary, Antibiotics"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Stock Units</label>
                  <input
                    type="number"
                    min="0"
                    value={medQuantity}
                    onChange={(e) => setMedQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Threshold Alert</label>
                  <input
                    type="number"
                    min="0"
                    value={medThreshold}
                    onChange={(e) => setMedThreshold(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMedicineModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer"
                >
                  Save Stock Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
