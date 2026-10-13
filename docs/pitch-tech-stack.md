# Pitching Script: Technologies Used in "Going Home Right" (Step-by-Step)

Use this sequential breakdown when presenting or recording your pitch. It maps every technology directly to the patient's journey from hospital bed to home recovery.

---

### Step 1: The Ingestion & Multimodal Vision Layer
- **Technologies Used:**
  - **Google Gemini 2.5 Flash Vision API (`@google/genai`)**
  - **Multer** (Streaming multipart memory storage with 10MB limit)
- **What It Does:**
  Ingests printed discharge sheets and handwritten prescriptions via photo or PDF upload. Gemini Vision performs high-speed OCR extraction of medications, dosages, frequency codes, hospital metadata, emergency warnings, and follow-up timelines with extraction confidence scores.
- **Pitch Line:**
  > *"Doctors don't have time to change their habits or type into complex EMR portals. They hand over their existing paper discharge summary, and Gemini Vision digitizes it in seconds."*

---

### Step 2: The Clinical Safety & Guardrail Layer
- **Technologies Used:**
  - **Custom Deterministic Rules Engine (TypeScript / `server/rulesEngine.ts`)**
  - **Automated Test Suite (10/10 test coverage)**
- **What It Does:**
  Enforces our core safety principle: **"AI reads, deterministic rules decide, missing means flagged."** It maps medical abbreviations (`BD` → Subah + Raat, `TDS` → Subah + Dopahar + Raat). Crucially, if timing is unspecified (such as `OD` without morning or night stated), it **refuses to hallucinate a guess**, assigns 0 time slots, and flags the drug with an amber `Needs nurse check` badge.
- **Pitch Line:**
  > *"LLMs love to guess missing information. In clinical pharmacology, guessing is dangerous. Our deterministic rules engine ensures that no medication is ever scheduled on a hallucination."*

---

### Step 3: The Human-in-the-Loop & Audit Layer
- **Technologies Used:**
  - **Role-Based Access Control (RBAC)** (Patient, Caregiver, Nurse, Admin)
  - **Immutable Clinical Audit Trail (`audit_log`)**
  - **AES-256-CBC Cryptographic Encryption (`crypto`)**
- **What It Does:**
  Routes flagged items directly to the ward nurse's sign-off queue. Sister Priya Sharma reviews the flagged Ecosprin, selects the intended morning slot, adds a food note ("Take after breakfast"), and issues an official Patient Access ID. Every action is cryptographically tracked in an immutable audit log.
- **Pitch Line:**
  > *"We keep the clinician in the loop. A 30-second nurse check transforms an ambiguous paper note into an approved, legally accountable digital care plan."*

---

### Step 4: The Cultural & Multilingual Localization Layer
- **Technologies Used:**
  - **Custom 28-Language Localization Engine (`src/i18n`)**
  - **Google Noto Fonts & UTF-8 Dynamic BCP-47 Font Loading**
- **What It Does:**
  Replaces Latin medical jargon with culturally intuitive Indian time blocks: **Subah (सुबह)**, **Dopahar (दोपहर)**, and **Raat (रात)**. Translates all instructions, dietary precautions, and red flags into 28 Indian languages—covering 22 Eighth Schedule languages (Hindi, Tamil, Bengali, Telugu, Marathi, Gujarati, etc.) plus 5 Rajasthani varieties like Marwari and Dhundhari.
- **Pitch Line:**
  > *"India recovers in its mother tongue. We deliver daily schedules in the patient's own regional dialect, tied to daily meal times and solar rhythms."*

---

### Step 5: The Zero-App WhatsApp Adherence Layer
- **Technologies Used:**
  - **WhatsApp Provider Abstraction (`SimulatedProvider` & Meta WhatsApp Cloud API)**
  - **Express Webhook Handlers (`/api/whatsapp/webhook`)**
- **What It Does:**
  Overcomes app-fatigue by delivering scheduled dose notifications directly to WhatsApp without requiring any app install. Families simply reply with **`1`** to confirm they took their dose. The webhook logs the dose event and updates the adherence score in real time.
- **Pitch Line:**
  > *"Elderly patients won't download a new app. They already use WhatsApp. Replying '1' logs medication adherence with zero learning curve."*

---

### Step 6: The National Interoperability Layer
- **Technologies Used:**
  - **HL7 FHIR R4 Specification Builder (`/api/discharges/:id/fhir`)**
  - **ABDM CareContext Bundler**
- **What It Does:**
  Serializes every verified discharge summary into standard Ayushman Bharat Digital Mission (ABDM) FHIR R4 bundles, ready for national health record exchange.
- **Pitch Line:**
  > *"We built this for national scale—generating ABDM-compliant FHIR bundles ready for India's digital health ecosystem."*

---

### Step 7: The Unified Full-Stack Cloud Deployment Layer
- **Technologies Used:**
  - **React 19 & Tailwind CSS v4** (Client SPA)
  - **Node.js 22 LTS & Express 4** (Single-service server)
  - **sql.js (WebAssembly SQLite)** (Embedded SQL with disk persistence & auto-seed)
  - **Multi-Stage Dockerfile (`node:22-alpine`)**
  - **Google Cloud Run**
- **What It Does:**
  Combines frontend and backend into a single, unified container running on port 8080 under a single URL with 1-click passwordless demo access for evaluators.
- **Pitch Line:**
  > *"A unified, production-ready web service on Google Cloud Run with instant zero-password demo access for judging."*
