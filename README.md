# HealthAccess Bharat (SIH 2026 – SIH26133)
## Web-Based Public Healthcare Accessibility & Quality Platform

**Problem Statement ID:** SIH26133  
**Title:** Accessibility & Quality of Public Healthcare Services  
**Target Beneficiaries:** Citizens in rural villages, remote mandals, underserved communities, and areas with limited public healthcare access.

---

## 1. System Architecture Overview

The system features a decoupled, production-grade architecture:
- **Frontend (Live Interactive Applet):** React 18+, TypeScript, Tailwind CSS, Leaflet Maps with OpenStreetMap, Chart.js for data intelligence, Web Speech API for voice search.
- **Backend Architecture:** Spring Boot 3.x, Spring Data JPA, Spring Security with JWT, MySQL Database.
- **Client Mock API Store (`localStorage` backed):** Enables instant, zero-configuration evaluation in the browser with realistic initial data across 10 government hospitals, 20 doctors, OPD appointments, formulary stocks, quality scorecards, and grievances.

---

## 2. Key Modules & Features Implemented

### Phase 1: Authentication & Citizen Home
- **Registration & Role-Based Login:** Support for Citizen, Hospital Staff, and Government Admin with verification codes and hospital assignments.
- **Citizen Home Screen:** Quick-access cards (Hospitals, Doctors, Medicines, Services, Appointments, Complaints, Feedback).
- **Interactive Leaflet Map:** Displays verified public hospitals, GPS user centroid, and calculated distances (in kilometers).
- **Voice Search (Web Speech API):** Microphone input allowing rural citizens to speak queries like *"Find government hospital near Vijayawada"*.
- **Emergency Helplines Banner:** One-touch calls to 108 (Ambulance), 102 (Maternal/Infant), 104 (Telemedicine), 181 (Women).

### Phase 2: Healthcare Discovery & Filtering
- **Multi-parameter Search:** Filter by facility name, doctor specialization, service, medicine, or location (Village, Mandal, District).
- **Live Status Indicators:** Real-time visibility into whether doctors are available, in consultation, or on leave; whether labs/ultrasound are operational; and real-time medicine stock levels.
- **Routing & Directions:** OpenStreetMap integration providing direct GPS navigation to hospital gates.

### Phase 3: Hospital Profiles & Digital OPD Appointments
- **Comprehensive Profiles:** Operating hours, emergency status, diagnostic queue waiting times, medicine formulary, and quality breakdown.
- **Digital Token Booking:** Free OPD appointment booking generating unique token IDs (e.g., `APT2026-0819`) with printable confirmation slips.
- **My Appointments Management:** View active, completed, or cancelled appointments with cancellation privileges.

### Phase 4: Citizen Feedback & Hospital Quality Score (HQS)
- **6-Dimension Evaluation:** Rate doctor availability, waiting time, staff courtesy, cleanliness/hygiene, medicine availability, and diagnostic service quality (1–5 stars).
- **Dynamic Quality Score:** Real-time recalculation of the hospital's overall rating upon feedback submission.

### Phase 5: Grievance & Complaint Redressal
- **Formal Grievance Filing:** Lodge issues against absent doctors, medicine shortages, or broken ultrasound equipment.
- **Unique Complaint ID Generation:** Track status via tracking codes (e.g., `CMP202600123`).
- **5-Stage Pipeline:** `SUBMITTED` -> `UNDER REVIEW` -> `IN PROGRESS` -> `RESOLVED` -> `REJECTED` with official hospital resolution remarks.

### Phase 6: Hospital Staff Daily Operational Portal
- Update doctor consultation statuses in real time.
- Update diagnostic service queue waiting times and equipment statuses.
- Update dispensary medicine quantities with low-stock alerts.
- Triage OPD patient appointments (Confirm, Complete, Cancel).
- Respond to citizen complaints with official action remarks.

### Phase 7: Government Health Authority / Admin Intelligence Dashboard
- **Executive KPIs:** Total facilities, active doctors, digital appointments, complaints filed, redressal rate, and state quality score.
- **Chart.js Visualizations:** Hospital ratings bar comparison, complaints by root cause doughnut chart, weekly appointment volume line chart, and medicine shortage alerts.
- **Surveillance & Underserved Detection:** Filter by district to detect rural healthcare shortages.

### Phase 8: Accessibility & Usability (WCAG 2.1 AA)
- **Multilingual Support:** English, Telugu (తెలుగు), and Hindi (हिंदी).
- **Accessibility Controls:** High Contrast mode toggle and dynamic text scaling (90% to 125%).

---

## 3. Demo Credentials for Hackathon Evaluators

| Role | Email | Password | Pre-assigned Facility |
|---|---|---|---|
| **Citizen** | `ravi.kumar@example.com` | `password123` | N/A (Vijayawada Rural) |
| **Hospital Staff** | `dr.rao@example.com` | `password123` | Govt General Hospital, Vijayawada |
| **Admin** | `admin.health@sih2026.gov.in` | `password123` | State Health Directorate (Admin Key: `SIH2026`) |

*Tip: You can also use the **Quick Demo Switcher** in the top navigation bar to switch personas with one click.*

---

## 4. How to Run the Application

### Running the Frontend (React + Vite)
```bash
# 1. Install dependencies
npm install

# 2. Run development server (running on port 3000)
npm run dev

# 3. Build for production
npm run build
```

### Running the Spring Boot + MySQL Backend
```bash
# 1. Ensure MySQL is running and execute backend/src/main/resources/schema.sql
mysql -u root -p < backend/src/main/resources/schema.sql

# 2. Navigate to backend directory and start Spring Boot
cd backend
mvn clean spring-boot:run
```
