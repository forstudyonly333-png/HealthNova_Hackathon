# Going Home Right — 3-Minute Video Demo Script

**Target Duration:** Exactly 3 Minutes (180 Seconds)  
**Presenter:** Team HealthNova  
**Format:** Screen Recording + Voiceover Walkthrough  

---

### [00:00 – 00:20] Segment 1: The Problem (20 Seconds)

**Visual:**
Open on the landing page of *Going Home Right* with the banner *"Demo with synthetic data. Do not enter real patient information."* Briefly flash a messy, handwritten hospital discharge summary.

**Voiceover:**
> *"Every year, millions of Indian patients leave the hospital with a paper discharge sheet covered in abbreviations like 'OD', 'BD', and scribbled instructions. Families get confused, medicines are taken at the wrong time, and preventable readmissions happen within 30 days. Patients shouldn't need a medical degree to recover safely at home. That's why Team HealthNova built **Going Home Right**."*

---

### [00:20 – 00:50] Segment 2: Uploading the Discharge Summary (30 Seconds)

**Visual:**
Click **Upload** in the navigation bar. Show the dropzone. Scroll down to the **Synthetic Hospital Discharge Sheets** section and click **Test Sample 1 Flow (AIIMS Cardiology)**. Show the brief scanning spinner transitioning instantly into the review screen.

**Voiceover:**
> *"Let's test this with a real-world cardiology discharge sheet for Sita Devi. Using Google Gemini 2.5 Flash multimodal vision, our backend ingests the document, extracts hospital details, medications, follow-up dates, and emergency warnings. Even if the network or API quota drops, our stored synthetic samples guarantee 100% offline uptime for live demonstrations. Watch how fast it processes."*

---

### [00:50 – 01:40] Segment 3: The Flagged Item & Nurse Approval Gate (50 Seconds)

**Visual:**
On the **Review Screen**:
- Point cursor to **Tab Metoprolol 25 BD** showing the green **CLEAR** badge (scheduled morning and night).
- Point cursor to **Tab Ecosprin 75 OD** showing the bright amber **NEEDS NURSE CHECK** badge with flag text: *"Time not stated on discharge sheet. Nurse to confirm whether Morning or Night."*
- Click **Nurse Sign-off** (or the quick role button *Try as Nurse*).
- Switch to Sister Priya Sharma's queue. Show the nurse selecting **Morning after food** and clicking **Approve Item**.
- Show the audit log updating in real time with timestamp and nurse credentials.

**Voiceover:**
> *"Now for our core safety principle: **AI reads, deterministic rules decide, and missing information is always flagged.** Notice Tab Metoprolol BD is clear and mapped to Subah and Raat. But look at Tab Ecosprin OD: once a day, but morning or bedtime? Most AI systems hallucinate a guess. Our clinical rules engine refuses to guess—it flags Ecosprin as 'Needs Nurse Check' and assigns zero slots until verified.  
> 
> A ward nurse logs into the clinical sign-off queue, confirms the doctor intended morning after breakfast, adds the instruction, and approves it. The immutable audit trail logs every step for patient safety."*

---

### [01:40 – 02:10] Segment 4: Patient Daily Care Plan & 28 Indian Languages (30 Seconds)

**Visual:**
Click **Patient Checklist** (or *Try as Family*). Show Sita Devi's daily schedule clearly organized into **Subah (सुबह)**, **Dopahar (दोपहर)**, and **Raat (रात)** with checkboxes.
Open the **Language Dropdown** in the header. Select **हिन्दी (Hindi)**, then switch to **मारवाड़ी (Marwari)**. Show time slots, dietary advice, and follow-up warnings updating instantly in regional script.

**Voiceover:**
> *"With nurse sign-off complete, the family opens their daily care plan. Instead of cryptic medical codes, they get a clear schedule structured around daily rhythms: Subah, Dopahar, and Raat, complete with dietary instructions.  
> 
> Crucially, India recovers in its mother tongue. With our 28-language localization engine—covering scheduled languages and regional dialects like Marwari—families understand exactly what to take, when to eat, and when their follow-up appointment is due on October 17th."*

---

### [02:10 – 02:40] Segment 5: Zero-App WhatsApp Reminder & Interactive Reply "1" (30 Seconds)

**Visual:**
Open the **Zero-App WhatsApp Reminders** view.
Click **Trigger Simulated Dose Reminder (Subah / Morning)**. Show the realistic incoming WhatsApp message popup on screen.
Type **`1`** into the simulator input and click **Send Reply**. Show the dose status instantly checking off as taken and the patient adherence counter advancing to 100%. Show the **Ask Hospital on WhatsApp** button.

**Voiceover:**
> *"Elderly patients rarely download new apps. Going Home Right delivers reminders directly to WhatsApp without requiring any app install.  
> 
> The family receives an automated WhatsApp reminder in their language. To confirm they took their blood pressure pill, they simply reply with '1'. The server processes the webhook, logs the dose event, and updates the hospital adherence dashboard in real time. Patients can also tap 'Ask Hospital on WhatsApp' to connect directly with the reception desk."*

---

### [02:40 – 03:00] Segment 6: Closing & Safety Principle (20 Seconds)

**Visual:**
Navigate back to **Home**. Highlight the three instant demo buttons (*Try as Family*, *Try as Nurse*, *Try as Hospital Admin*) and the ABDM FHIR export button. End on Team HealthNova logo and slogan.

**Voiceover:**
> *"Going Home Right is built for public health: private, secure, ABDM FHIR compliant, and designed around zero-guessing clinical safety. By putting trusted AI and nurse verification in service of families, we make sure every patient goes home right. Thank you!"*
