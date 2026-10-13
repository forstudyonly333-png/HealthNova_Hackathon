# Going Home Right — Submission Screenshots Guide

This guide details the **6 essential screenshots** required for hackathon submission. Thanks to the built-in synthetic seed data, **every single one of these states is available immediately upon cold start without any manual data entry or configuration**.

---

### Screenshot 1: Home & Upload Ingestion Screen (with Sample Sheets)
- **URL / Navigation**: Navigate to `/` (Home) or click **Upload** in the top navigation bar.
- **State to Capture**:
  - The hero section or the upload dropzone displaying *"Drop discharge summary or take photo"*.
  - Below the dropzone, the **Synthetic Hospital Discharge Sheets** card displaying the three pre-processed samples:
    - **Sample 1 (Cardiology AIIMS)** with badge `"1 Item Flagged"`.
    - **Sample 2 (Clean Max Hospital)** with badge `"All Clear"`.
    - **Sample 3 (Messy Handwritten)** with badge `"Multiple Flags"`.
  - In Demo Mode, capture the top banner: `"Demo with synthetic data. Do not enter real patient information."` and the three quick-role buttons (*Try as Family*, *Try as Nurse*, *Try as Hospital Admin*).

---

### Screenshot 2: Clinical Review Screen (Green "Clear" & Amber "Needs nurse check")
- **URL / Navigation**: Click **Prescription Review** in the navigation, or click **Test Sample 1 Flow** from the Upload screen.
- **State to Capture**:
  - The discharge summary header for **Sita Devi** (`AIIMS New Delhi Cardio-Care`).
  - **Medication 1: Tab Metoprolol 25 BD**:
    - Showing the vibrant green badge: `CLEAR / VERIFIED`.
    - Assigned time slots: `Subah (Morning)` and `Raat (Night)`.
  - **Medication 2: Tab Ecosprin 75 OD**:
    - Showing the prominent amber badge: `NEEDS NURSE CHECK`.
    - Flag reason: `"Time not stated on discharge sheet. Nurse to confirm whether Morning or Night before scheduling."`
    - Empty time slots (`0 slots assigned`) enforcing the core clinical safety rule: *unspecified timing must never be guessed*.

---

### Screenshot 3: My Plan with Subah / Dopahar / Raat & Follow-up Card
- **URL / Navigation**: Click **Patient Checklist** (or click *Try as Family* from the home banner).
- **State to Capture**:
  - The patient daily care plan organized by Indian meal and solar time blocks:
    - **सुबह (Subah / Morning)**: scheduled doses with check-off buttons and food instructions ("Take after breakfast").
    - **दोपहर (Dopahar / Afternoon)**.
    - **रात (Raat / Night)**: scheduled bedtime doses.
  - The **Follow-up Card**:
    - `"Follow-up with Dr. Anya Sen (Cardiology OPD Room 104) on 17 Oct 2026 (7 days post-discharge)"`.
  - The **Emergency Warnings & SOS Card**:
    - SOS warning sign for chest tightness / breathlessness with direct hospital helpdesk phone number.

---

### Screenshot 4: Nurse Sign-off Queue & Audit Log Trail
- **URL / Navigation**: Click **Nurse Sign-off** (or click *Try as Nurse* from the home banner).
- **State to Capture**:
  - Sister Priya Sharma's clinical sign-off portal showing the **Flagged Items Review Queue**.
  - The verification card for **Tab Ecosprin 75 OD** with the nurse action selector (allowing the nurse to confirm `Morning after breakfast` and approve).
  - The **Immutable Audit Trail** list below:
    - Log entry: `EXTRACTED_BY_AI` by HealthNova Engine.
    - Log entry: `FLAGGED_BY_RULES` by Clinical Safety Rules Engine (`Reason: Time not stated on discharge sheet`).
    - Nurse approval timestamp and actor credentials.

---

### Screenshot 5: Patient WhatsApp Reception & Fallback Message Sheet
- **URL / Navigation**: From **Patient Checklist** (`MyPlanPage`), scroll to the Hospital Reception Support section, or open the **Zero-App WhatsApp Reminders** view.
- **State to Capture**:
  - The **"Ask Hospital on WhatsApp"** button.
  - The open dialog or preview sheet showing the pre-composed WhatsApp message in the patient's language:
    - Includes patient access ID (`PT-SITA-2026`), hospital ward, and pre-formatted question.
  - The verified reception badge or the safety fallback contact card providing direct PBX telephone numbers if WhatsApp is unverified.

---

### Screenshot 6: Analytics & Language Picker in Marwari (मारवाड़ी)
- **URL / Navigation**: Click **Analytics** in the navigation bar, then click the **Language Picker** dropdown in the top-right header and select **मारवाड़ी (Marwari)**.
- **State to Capture**:
  - The active language dropdown showing the 28 Indian languages with **मारवाड़ी (Marwari)** highlighted and active.
  - The Analytics Dashboard displaying:
    - Total discharges ingested (`3`).
    - Flagged item safety catch rate (`66%`).
    - Average nurse review turnaround time (`< 4 mins`).
    - All table headings, slot metrics, and safety descriptions rendered in Marwari / Devanagari script.
