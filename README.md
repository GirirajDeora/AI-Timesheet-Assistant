# ⏱️ AI Timesheet Assistant

> **Open website → Tap microphone → Talk naturally → AI understands → Review entries → Confirm → Google Sheet updated**

An intelligent, production-ready personal productivity web application that allows you to log your daily work naturally via **voice or text**, automatically extracts structured timesheet rows, maps project IDs from your **Requirement Master**, and appends the records directly to your **Google Sheet**.

Designed for zero-cost static hosting (e.g., **GitHub Pages**) with a secure **Google Apps Script** backend bridge.

---

## 🌟 Key Features

* 🎙 **Browser-Native Voice Input**: Tap the microphone, speak freely about your day, and see your live transcript. No phone numbers, Twilio, or paid telephony required.
* ⌨️ **Natural Text Input**: Type in plain conversational English if you prefer not to speak or are in a quiet room.
* 🧠 **Google Gemini Flash Engine**: Pre-configured at the code level (`gemini-1.5-flash`) for fast, accurate understanding. Also includes a built-in smart parser that runs 100% in-browser.
* 📋 **Multi-Activity Extraction**: Understands multiple tasks from a single prompt (e.g. *"Worked 2 hours on MV-703, 1 hour on MV-356 QA queries, and 15 mins Scrum"*).
* 🔍 **Requirement Master Lookup**: Automatically matches Zoho IDs or project keywords to Requirement IDs and official requirement titles without hallucinations.
* ⏱️ **Decimal Time Conversion**: Seamlessly converts *"15 minutes"* to `0.25`, *"30 minutes"* to `0.5`, *"2 hours"* to `2`, *"two and a half hours"* to `2.5`.
* 🤖 **Gen AI Usage Detection**: Detects mentions of tools like ChatGPT, Claude, or Copilot and sets `Gen AI Usage` to `Yes`.
* 🛡️ **Duplicate Entry Protection**: Warns you if an identical or similar entry was already submitted today before writing to the sheet.
* ✏️ **Full Pre-Submission Control**: Edit any field in-place, delete rows, or add new rows before confirming.
* 📊 **Daily Summary & History**: Instantly view today's total hours and breakdown by task.
* 🌓 **Modern SaaS UI**: Clean responsive interface with dark/light mode toggle, mobile-ready layout, and smooth animations.

---

## 📂 Project Structure

```text
ai-timesheet-assistant/
├── index.html                   # Main web app interface
├── settings.html                # Standalone configuration & settings page
│
├── css/
│   └── styles.css               # Modern SaaS styles, dark mode & animations
│
├── js/
│   ├── app.js                   # Application controller & state management
│   ├── ai.js                    # AI orchestrator & prompt builder
│   ├── voice.js                 # Web Speech API voice recognition service
│   ├── sheets.js                # Google Apps Script HTTP client
│   ├── validation.js            # Time/Date parsing, duplicate check & lookup
│   └── config.js                # Configuration manager & default master data
│
├── services/
│   └── ai/
│       └── aiProvider.js        # AI provider abstractions (Gemini & Built-in Smart Parser)
│
├── apps-script/
│   ├── Code.gs                  # Google Apps Script backend Web App code
│   └── appsscript.json          # Apps Script manifest configuration
│
├── tests/
│   └── acceptance_test.js       # Automated acceptance and unit test suite
│
├── .env.example                 # Example environment variables reference
├── .gitignore                   # Git ignore file for secrets and temporary files
├── LICENSE                      # MIT Open Source License
└── README.md                    # Complete setup and user documentation
```

---

## 🚀 Quick Start

You can run the application immediately on your computer:

1. Clone this repository.
2. Open `index.html` in Google Chrome or Microsoft Edge.
3. Click the sample prompt: **`⚡ Acceptance Test`**.
4. Click **`✨ Analyze Work`**.
5. See the 3 structured rows totaling **3.25 hours**.
6. Click **`✓ Add to Timesheet`**!

---

## 📊 Google Sheets Connection Setup

The application connects to your Google Sheet to log entries directly.

### Deploy Google Apps Script (5-Minute Backend Setup)

1. Open your target Google Sheet.
2. Click **Extensions** in the top menu → **Apps Script**.
3. Delete any boilerplate code in `Code.gs`.
4. Copy the entire contents of [`apps-script/Code.gs`](apps-script/Code.gs) from this repository and paste it into the Apps Script editor.
5. Click the **Save** (💾) icon.
6. In the top-right corner, click **Deploy** → **New deployment**.
7. In the modal:
   * Click the gear icon (⚙️) next to *Select type* → choose **Web app**.
   * **Description**: `AI Timesheet Web App v1`
   * **Execute as**: **Me**
   * **Who has access**: **Anyone** *(Important: Allows your web app to send timesheet entries)*
8. Click **Deploy**, authorize permissions, and copy the **Web App URL** (ends in `/exec`).
9. Open your web app, click **Settings (⚙️)**, paste your Web App URL, and click **🔌 Test Connection & Sync Masters**.

---

## 🌐 Deploying to GitHub Pages (Free Static Hosting)

1. Push this repository to your GitHub account:
   ```bash
   git push -u origin main
   ```
2. In your GitHub repository:
   * Go to **Settings** → **Pages** (on the left menu).
   * Under **Build and deployment** > **Source**, choose **Deploy from a branch**.
   * Under **Branch**, select `main` and folder `/ (root)`, then click **Save**.
3. In 1–2 minutes, your website is live and ready for mobile and desktop use.

---

## 🧪 Acceptance Test Verification

To verify that the application operates according to specifications, you can test this exact prompt:

> *"Today I worked on MV-703 for about two hours doing VPD analysis. Then I spent one hour on MV-356 handling Q Plus QA queries. I also attended Scrum for 15 minutes. I used ChatGPT while preparing the analysis."*

### Result:

| # | Date | Task Type | Task | Time (hrs) | Zoho ID | Requirement ID | Requirement Title | Gen AI |
| :-: | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :---: |
| 1 | Today | Project Analysis | VPD analysis | 2 | MV-703 | R26-04-018 | OTG PP bags enhancement (Phase 2) | Yes |
| 2 | Today | QA Queries | Q Plus Tech Upgrade | 1 | MV-356 | R26-04-019 | Q Plus Tech Upgrade | No |
| 3 | Today | Scrum | | 0.25 | | | | No |

**Total Logged:** `3.25 hours`.

To run the automated acceptance test suite in terminal:
```bash
node tests/acceptance_test.js
```
Output: **`TEST SUMMARY: 46 Passed, 0 Failed`**.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).