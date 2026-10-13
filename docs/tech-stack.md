# Going Home Right — Technology Stack

**Stack Summary:** React 19, TypeScript, Tailwind CSS v4, Express, SQLite (sql.js / WebAssembly), Google Gemini 2.5 Flash Multimodal Vision API, Lucide React, Motion.

---

## Complete Tools, Libraries & APIs Specification

### 1. Frontend Client
- **React 19 (`react`, `react-dom`)**: Modern component architecture, functional hooks, and client-side routing.
- **TypeScript**: End-to-end typed interfaces matching the clinical rules engine, ABDM FHIR schemas, and localized translations.
- **Vite 8 (`vite`, `@vitejs/plugin-react`)**: Ultra-fast bundler, compilation, and static asset pipeline.
- **Tailwind CSS v4 (`@tailwindcss/vite`, `tailwindcss`)**: Performance-optimized utility CSS styling, responsive layout system, and custom clinical eye-comfort palette (`#FAF7F2`, `#1E6F5C`, `#242A35`).
- **Lucide React (`lucide-react`)**: Clean, accessible medical and interface iconography.
- **Motion (`motion`)**: Fluid UI micro-interactions, tab transitions, and status badge changes.

### 2. Backend Server & Architecture
- **Node.js (v22 LTS)**: Native ESM execution and TypeScript execution via Node 22 / tsx.
- **Express 4 (`express`)**: RESTful web services, CORS handling, upload rate limiting, and unified static SPA asset delivery.
- **Multer (`multer`)**: Secure in-memory multipart file ingestion with strict 10MB size capping and MIME type whitelisting (`image/jpeg`, `image/png`, `image/webp`, `image/heic`, `application/pdf`).
- **sql.js (`sql.js`)**: WebAssembly-compiled SQLite database with disk persistence, SQL-standard schema portable to PostgreSQL/Cloud SQL, and zero external database driver setup.
- **Node Crypto (`crypto`)**: Built-in cryptographic primitives for AES-256-CBC encryption of patient health identifiers (PHI) at rest.

### 3. Artificial Intelligence & Vision OCR
- **Google GenAI SDK (`@google/genai`)**: Server-side multimodal vision extraction powered by Gemini 2.5 Flash to digitize hospital discharge summaries and handwritten medical prescriptions.
- **Safety Fallback Engine**: Deterministic synthetic parser providing 100% offline uptime and zero-quota demo guarantees when the API key is unconfigured or rate-limited.

### 4. Internationalization & Messaging
- **Custom Indian Language Engine**: 28-language dictionary router supporting 22 Eighth Schedule languages (Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, etc.) and 5 Rajasthani varieties (Marwari, Dhundhari, Mewati, Shekhawati, Harauti).
- **WhatsApp Provider Abstraction**:
  - `SimulatedProvider`: In-browser / in-memory interactive zero-cost WhatsApp emulator with instant response verification ("Reply 1 to confirm dose").
  - `CloudApiProvider`: Meta WhatsApp Cloud API integration with Graph API webhook processing.
