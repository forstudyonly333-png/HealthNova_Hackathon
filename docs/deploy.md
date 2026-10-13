# Going Home Right — Deployment & Production Guide

This guide contains complete, copy-pasteable instructions for deploying **Going Home Right (HealthNova)** as a single, unified web service (Frontend SPA + Express API bundled together) on Google Cloud Run, with alternative cloud targets (Render, Railway, and Google AI Studio).

---

## Architecture Summary

- **Single Service & Single URL**: Express serves the React SPA from the `./dist` directory and provides all `/api/*` endpoints and `/docs` (Swagger UI).
- **Port & Host Binding**: Listens on the environment variable `PORT` (defaults to `8080` in Cloud Run / Docker, `3000` locally) and binds to `0.0.0.0`.
- **Health Check**: Available at `/health` returning HTTP 200 with runtime diagnostics.
- **Ephemeral Storage Behavior (Important)**:
  > **Note on Cloud Run Container Storage**: Cloud Run container instances have temporary, ephemeral filesystems. The SQLite database is automatically created, the schema migrated, and all synthetic demo data (3 sample discharge sheets, credentials, diet plans, reception contacts) are automatically seeded on cold start. Any new uploads or state changes exist in that instance's memory/disk and will reset when the instance restarts or scales down. Uploaded files in demo mode are kept in memory and are temporary.

---

## 1. Prerequisites & Git Setup

Before deploying, ensure your code repository is clean and that sensitive secrets and database binaries are excluded from version control.

### Step 1.1: Verify Ignored Files
Verify that `.gitignore` ignores `.env` files and `*.db` files:
```bash
# Check that .env and *.db are ignored
git status --ignored
```
*(Our `.gitignore` already ignores `.env*`, `*.db`, `*.sqlite`, and `server/data/*.db`)*.

### Step 1.2: Initialize and Push to a Public GitHub Repository
```bash
# 1. Initialize git if not already initialized
git init

# 2. Stage all project files
git add .

# 3. Verify no secrets or database files are staged
git status

# 4. Commit files
git commit -m "feat: Prepare Going Home Right for Cloud Run deployment"

# 5. Create a PUBLIC GitHub repository using GitHub CLI (or manually on github.com)
gh repo create going-home-right --public --source=. --remote=origin --push

# Alternatively with git remote manually:
# git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/going-home-right.git
# git branch -M main
# git push -u origin main
```

---

## 2. Option A (Recommended): Deploy to Google Cloud Run from Source

Google Cloud Run automatically builds your container using Cloud Build and the multi-stage `Dockerfile`, then hosts the service with automatic SSL and global CDN.

### Step 2.1: Authenticate and Set GCP Project
```bash
# Log in to Google Cloud
gcloud auth login

# Set your active GCP project ID
gcloud config set project YOUR_PROJECT_ID
```

### Step 2.2: Enable Required GCP APIs
Enable Cloud Run, Cloud Build, Secret Manager, and Artifact Registry:
```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com
```

### Step 2.3: Store Secrets in Secret Manager
Never pass API keys or encryption keys in plaintext flags. Store them securely:

```bash
# 1. Store your Gemini API Key
echo -n "YOUR_ACTUAL_GEMINI_API_KEY" | gcloud secrets create gemini-key \
  --data-file=- \
  --replication-policy="automatic"

# 2. Store your PHI Encryption Key (minimum 32 characters)
echo -n "ghr_healthnova_super_secure_phi_encryption_key_32bytes" | gcloud secrets create enc-key \
  --data-file=- \
  --replication-policy="automatic"
```

*(If the secrets already exist, update them with `gcloud secrets versions add gemini-key --data-file=-`)*

Grant the default Compute Service Account access to Secret Manager:
```bash
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')

gcloud secrets add-iam-policy-binding gemini-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding enc-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Step 2.4: Deploy Service to Cloud Run

Run this command from the root directory of the project:

```bash
gcloud run deploy going-home-right \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --set-env-vars DEMO_MODE=true,WHATSAPP_PROVIDER=simulated \
  --set-secrets GEMINI_API_KEY=gemini-key:latest,ENCRYPTION_KEY=enc-key:latest
```

### Step 2.5: Zero Cold-Start Configuration for Judging / Evaluation
During hackathon judging or live demonstrations, you can prevent cold starts (instances going to sleep) by keeping at least 1 warm instance running:

```bash
# Keep 1 warm instance active during evaluation
gcloud run services update going-home-right \
  --region asia-south1 \
  --min-instances 1
```

> ⚠️ **Cost Warning**: Setting `--min-instances 1` keeps a container running continuously, which incurs billing charges over time. **Immediately after judging or demo testing is complete, reset min-instances to 0** so the service scales down to zero when idle:
> ```bash
> gcloud run services update going-home-right \
>   --region asia-south1 \
>   --min-instances 0
> ```

---

## 3. Option B: Deploying with Google AI Studio

If you built or imported this project within Google AI Studio:

1. Open your project in **Google AI Studio Build**.
2. Click the **Deploy** button located in the top-right header of the workspace.
3. Select **Cloud Run** as your deployment target.
4. AI Studio will automatically inject `GEMINI_API_KEY` from your workspace secrets and configure the deployment URL (`APP_URL`).
5. Confirm the deployment. You will receive a live `.run.app` HTTPS URL.

---

## 4. Option C: Deploying to Render or Railway (Container Alternative)

Because this repository includes a multi-stage `Dockerfile`, it deploys out of the box to any container host.

### Deploying to Render
1. Create a new account or log in at [render.com](https://render.com).
2. Click **New +** > **Web Service**.
3. Connect your public GitHub repository (`going-home-right`).
4. Select **Docker** as the Runtime environment.
5. In the **Environment Variables** section, configure:
   - `PORT`: `8080` (or Render's default `10000`)
   - `DEMO_MODE`: `true`
   - `WHATSAPP_PROVIDER`: `simulated`
   - `GEMINI_API_KEY`: `<Your Gemini API Key>`
   - `ENCRYPTION_KEY`: `ghr_healthnova_secret_encryption_key_32bytes_len!`
   - `DATABASE_PATH`: `./server/data/app.db`
6. Click **Create Web Service**.

### Deploying to Railway
1. Log in at [railway.app](https://railway.app).
2. Click **New Project** > **Deploy from GitHub repo**.
3. Select the `going-home-right` repository.
4. Railway will automatically detect the `Dockerfile`.
5. Under **Variables**, add:
   - `PORT`: `8080`
   - `DEMO_MODE`: `true`
   - `WHATSAPP_PROVIDER`: `simulated`
   - `GEMINI_API_KEY`: `<Your Gemini API Key>`
   - `ENCRYPTION_KEY`: `ghr_healthnova_secret_encryption_key_32bytes_len!`
6. Click **Deploy**. Under **Settings** > **Networking**, click **Generate Domain** to get your public URL.

---

## 5. Complete Environment Variables Reference

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `8080` (Cloud Run) / `3000` (Local) | HTTP port bound by Express (`0.0.0.0`). |
| `DEMO_MODE` | `true` | Enables 1-click role switches, demo accounts, and fast sample testing. |
| `DATABASE_PATH` | `./server/data/app.db` | Filesystem path for SQLite file (auto-seeded if missing). |
| `ENCRYPTION_KEY` | *(Default fallback)* | 32+ char key for AES-256-CBC encryption of patient data at rest. |
| `GEMINI_API_KEY` | `""` | Gemini multimodal API key for OCR extraction. If omitted, synthetic parser handles samples. |
| `WHATSAPP_PROVIDER` | `simulated` | `simulated` (default, interactive in-app logger) or `cloud` (Meta WhatsApp Cloud API). |
| `ALLOWED_ORIGINS` | `""` *(same-origin)* | Comma-delimited list of CORS allowed origins (e.g. `https://my-app.run.app`). |
| `APP_URL` | `http://localhost:8080` | Public domain URL of the deployed web service. |
| `WHATSAPP_API_TOKEN` | `""` | Optional Meta WhatsApp API Bearer token (only if `cloud`). |
| `WHATSAPP_PHONE_NUMBER_ID`| `""` | Optional Meta WhatsApp Business phone number ID (only if `cloud`). |

---

## 6. Post-Deployment Verification Checklist

Once your deployment finishes and you have your live URL (e.g. `https://going-home-right-xxxxxx.a.run.app`), execute this verification checklist:

- [ ] **1. Incognito & Mobile Browser Test**:
  - Open the live URL in a private/incognito window on desktop and on a mobile phone.
  - The application must load immediately without requiring a login screen first.
  - The top navigation bar, language switcher, and demo quick-role buttons must be clearly visible and responsive.

- [ ] **2. Health Endpoint Check**:
  - Visit `https://<YOUR-APP-URL>/health` in your browser or curl it:
    ```bash
    curl -s https://<YOUR-APP-URL>/health
    ```
  - Verify that it returns HTTP 200 with JSON:
    ```json
    {
      "status": "ok",
      "service": "going-home-right",
      "demo_mode": true,
      "whatsapp_provider": "simulated"
    }
    ```

- [ ] **3. Test All 3 Synthetic Discharge Sheets**:
  - Go to the **Upload & Ingest** section or **Hospital Portal**.
  - **Sample 1 (Cardiology - Ecosprin & Metoprolol)**: Verify OD medicine gets flagged by safety rules with yellow badge (`Time not stated on discharge sheet, needs nurse verification`).
  - **Sample 2 (Max Hospital - Clean Sheet)**: Verify all 3 medicines pass directly with green verified badges and exact meal timing.
  - **Sample 3 (Handwritten Messy Sheet)**: Verify low-confidence abbreviation and warning without emergency action get properly flagged for clinical review.

- [ ] **4. Nurse Approval Workflow**:
  - Switch to **Hospital Portal / Nurse Sign-off** using Sister Priya Sharma or Dr. Anya Sen demo buttons.
  - Verify you can review flagged items, add a clinical instruction note (e.g., "Take after breakfast"), and click **Approve & Issue Patient ID**.
  - Verify the status transitions to `Approved` with an audit log trail.

- [ ] **5. Multilingual Indian Language Picker**:
  - Open the language dropdown in the header.
  - Test switching between English, Hindi (हिन्दी), Tamil (தமிழ்), Bengali (বাংলা), etc.
  - Confirm medicine time slots ("सुबह / Subah", "दोपहर / Dopahar", "रात / Raat"), warning signs, and dietary instructions translate accurately.

- [ ] **6. WhatsApp Reminders & Interactive Simulation**:
  - Open **Zero-App WhatsApp Reminders** view.
  - Click **Trigger Simulated Dose Reminder (Morning / Subah)**.
  - Verify the simulated WhatsApp bubble appears with patient name, medicines, and the instructions.
  - Reply with **`1`** in the simulation box.
  - Confirm the system logs the dose as taken in real time and updates the checklist compliance score.

- [ ] **7. Gemini API Key & Fallback Resilience**:
  - If `GEMINI_API_KEY` was provided: Upload an image file of a prescription to verify server-side OCR processing.
  - If `GEMINI_API_KEY` is omitted or invalid: Verify that loading the 3 samples or uploading still works cleanly via the built-in deterministic clinical parser without crashing.

- [ ] **8. Public GitHub Repository & Clean History**:
  - Verify your GitHub repository is public and displays the `README.md`.
  - Confirm that `.env` and `app.db` were **not** committed to git:
    ```bash
    git log --stat | grep -E '\.env|\.db'
    ```
    *(Should output nothing)*.
