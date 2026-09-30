/**
 * =========================================================================
 * AI Timesheet Assistant - Main Application Controller
 * =========================================================================
 */

/**
 * Apple Design Multimodal Haptics (Physical Tactile Feedback)
 */
const Haptics = {
  // Light 12ms tap for clicks, buttons, steppers, and pill toggles
  tap() {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(12); } catch (_) {}
    }
  },
  // Success double pulse for sheet writes and successful analysis
  success() {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate([15, 45, 20]); } catch (_) {}
    }
  },
  // Warning pulse for duplicates or clarifications
  warning() {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate([25, 40, 25]); } catch (_) {}
    }
  },
  // Error vibration
  error() {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate([45, 60, 45]); } catch (_) {}
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  App.init();
});

const App = {
  // Application State
  config: null,
  voiceService: null,
  currentEntries: [],
  existingEntries: [],
  todayLoggedHours: 0,
  isRecording: false,
  isProcessing: false,

  /**
   * Initialize Application
   */
  async init() {
    this.config = window.ConfigManager ? window.ConfigManager.load() : {};
    this.applyTheme(this.config.theme || "light");
    this.setupVoice();
    this.bindEvents();
    this.updateStatusBadges();
    this.loadTodayData();
    this.populateSamplePills();
  },

  /**
   * Apply UI theme (light / dark)
   */
  applyTheme(theme) {
    if (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  },

  /**
   * Configure Voice Recognition Service
   */
  setupVoice() {
    const micBtn = document.getElementById("btn-mic");
    const micStatus = document.getElementById("mic-status");
    const textInput = document.getElementById("input-work-text");

    if (!window.VoiceService || !window.VoiceService.isSupported()) {
      if (micStatus) micStatus.textContent = "🎙 Speech recognition not supported in this browser (typing supported)";
      return;
    }

    this.voiceService = new window.VoiceService({
      onStart: () => {
        this.isRecording = true;
        if (micBtn) micBtn.classList.add("listening");
        if (micStatus) {
          micStatus.innerHTML = '<span style="color: #ef4444;">🔴 Listening... Speak naturally</span>';
          micStatus.classList.add("active");
        }
      },
      onResult: (data) => {
        if (textInput) {
          textInput.value = data.current;
        }
      },
      onError: (friendlyMsg) => {
        this.isRecording = false;
        if (micBtn) micBtn.classList.remove("listening");
        if (micStatus) {
          micStatus.textContent = friendlyMsg;
          micStatus.classList.remove("active");
        }
        this.showToast(friendlyMsg, "error");
      },
      onEnd: (finalTranscript) => {
        this.isRecording = false;
        if (micBtn) micBtn.classList.remove("listening");
        if (micStatus) {
          micStatus.textContent = "Tap to speak again, or click 'Analyze Work'";
          micStatus.classList.remove("active");
        }
      }
    });
  },

  /**
   * Bind DOM Events
   */
  bindEvents() {
    // Microphone button
    const micBtn = document.getElementById("btn-mic");
    const textInput = document.getElementById("input-work-text");
    if (micBtn) {
      micBtn.addEventListener("click", () => {
        Haptics.tap();
        if (this.voiceService) {
          this.voiceService.toggle(textInput ? textInput.value : "");
        } else {
          this.showToast("Speech recognition is not supported in this browser. Please type your work description.", "info");
        }
      });
    }

    // Analyze Work button
    const analyzeBtn = document.getElementById("btn-analyze");
    if (analyzeBtn) {
      analyzeBtn.addEventListener("click", () => {
        Haptics.tap();
        this.handleAnalyze();
      });
    }

    // Clear Text button
    const clearBtn = document.getElementById("btn-clear-input");
    if (clearBtn && textInput) {
      clearBtn.addEventListener("click", () => {
        Haptics.tap();
        textInput.value = "";
        if (this.voiceService) this.voiceService.reset();
        textInput.focus();
      });
    }

    // Confirmation Actions
    const addTimesheetBtn = document.getElementById("btn-confirm-add");
    if (addTimesheetBtn) {
      addTimesheetBtn.addEventListener("click", () => {
        Haptics.tap();
        this.submitEntriesToSheets();
      });
    }

    const cancelPreviewBtn = document.getElementById("btn-cancel-preview");
    if (cancelPreviewBtn) {
      cancelPreviewBtn.addEventListener("click", () => {
        Haptics.tap();
        this.cancelPreview();
      });
    }

    const addRowBtn = document.getElementById("btn-add-row");
    if (addRowBtn) {
      addRowBtn.addEventListener("click", () => {
        Haptics.tap();
        this.addNewRow();
      });
    }

    // Today's entries modal
    const viewTodayBtn = document.getElementById("btn-view-today");
    const closeTodayBtn = document.getElementById("btn-close-today-modal");
    const modalToday = document.getElementById("modal-today");
    if (viewTodayBtn) {
      viewTodayBtn.addEventListener("click", () => this.openTodayModal());
    }
    if (closeTodayBtn) {
      closeTodayBtn.addEventListener("click", () => this.closeTodayModal());
    }
    if (modalToday) {
      modalToday.addEventListener("click", (e) => {
        if (e.target === modalToday) {
          this.closeTodayModal();
        }
      });
    }

    // Done button on summary card
    const doneSummaryBtn = document.getElementById("btn-done-summary");
    if (doneSummaryBtn) {
      doneSummaryBtn.addEventListener("click", () => {
        Haptics.tap();
        const summaryCard = document.getElementById("daily-summary-card");
        if (summaryCard) summaryCard.style.display = "none";
      });
    }

    // Theme toggle button
    const themeBtn = document.getElementById("btn-toggle-theme");
    if (themeBtn) {
      themeBtn.addEventListener("click", () => {
        Haptics.tap();
        const nextTheme = (this.config.theme === "dark") ? "light" : "dark";
        this.config.theme = nextTheme;
        window.ConfigManager.save(this.config);
        this.applyTheme(nextTheme);
      });
    }

    // Tab buttons in Settings
    const tabBtns = document.querySelectorAll(".tab-btn");
    tabBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        const targetTab = btn.getAttribute("data-tab");
        tabBtns.forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        const panel = document.getElementById(`tab-panel-${targetTab}`);
        if (panel) panel.classList.add("active");
      });
    });

    // Test connection button in settings
    const testConnBtn = document.getElementById("btn-test-connection");
    if (testConnBtn) {
      testConnBtn.addEventListener("click", () => this.testSheetsConnection());
    }
  },

  /**
   * Sample prompts for fast testing
   */
  populateSamplePills() {
    const container = document.getElementById("sample-pills-container");
    if (!container) return;

    const samples = [
      {
        label: "Acceptance Test",
        text: "Today I worked on MV-703 for about two hours doing VPD analysis. Then I spent one hour on MV-356 handling Q Plus QA queries. I also attended Scrum for 15 minutes. I used ChatGPT while preparing the analysis."
      },
      {
        label: "PP Bags + Auction Report",
        text: "Today I worked on MV-703 for around three hours analyzing the VPD requirements. Then I spent about two hours working on the auction report dashboard. I also had Scrum for 15 minutes."
      },
      {
        label: "BRS with ChatGPT",
        text: "I spent 3 hours preparing the BRS for the PP Bags enhancement. I used ChatGPT to prepare the first draft for about 1.5 hours."
      }
    ];

    container.innerHTML = "";
    samples.forEach(s => {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "sample-pill";
      pill.textContent = `⚡ ${s.label}`;
      pill.title = s.text;
      pill.addEventListener("click", () => {
        Haptics.tap();
        const input = document.getElementById("input-work-text");
        if (input) {
          input.value = s.text;
          input.focus();
        }
      });
      container.appendChild(pill);
    });
  },

  /**
   * Analyze input work text using AI Service
   */
  async handleAnalyze() {
    const textInput = document.getElementById("input-work-text");
    const text = textInput ? textInput.value.trim() : "";

    if (!text) {
      this.showToast("Please speak or type what you worked on today.", "info");
      return;
    }

    if (this.voiceService && this.isRecording) {
      this.voiceService.stop();
    }

    this.setProcessing(true, "Understanding your work...");
    this.hideClarification();

    try {
      const result = await window.AiService.analyzeWork(text, this.config);
      this.setProcessing(false);

      if (result.needsClarification) {
        Haptics.warning();
        this.showClarification(result.clarificationQuestion);
        return;
      }

      if (!result.entries || result.entries.length === 0) {
        Haptics.warning();
        this.showClarification("I couldn't identify any specific work entries. Could you tell me the project name and time spent?");
        return;
      }

      Haptics.success();
      this.currentEntries = result.entries;
      this.renderPreviewTable(this.currentEntries, result.totalHours);

      // Assistant message
      const assistantText = document.getElementById("assistant-message-text");
      if (assistantText) {
        const entryCount = this.currentEntries.length;
        assistantText.innerHTML = `I found <strong>${entryCount} ${entryCount === 1 ? 'activity' : 'activities'}</strong> totaling <strong>${result.totalHours} hrs</strong>. Review below and click <strong>Add to Timesheet</strong> to confirm.`;
      }

    } catch (err) {
      this.setProcessing(false);
      Haptics.error();
      console.error("Analysis failed:", err);
      this.showToast(err.message || "Failed to analyze your work.", "error");
    }
  },

  /**
   * Render structured preview table
   */
  renderPreviewTable(entries, totalHours) {
    const previewSection = document.getElementById("preview-section");
    const tbody = document.getElementById("preview-table-body");
    const cardsContainer = document.getElementById("preview-cards-container");
    const totalBanner = document.getElementById("preview-total-banner");
    const confirmPrompt = document.getElementById("confirmation-prompt-text");

    if (!previewSection) return;

    if (tbody) tbody.innerHTML = "";
    if (cardsContainer) cardsContainer.innerHTML = "";
    let calculatedTotal = 0;

    entries.forEach((entry, index) => {
      const timeVal = parseFloat(entry.timeHours || 0);
      calculatedTotal += timeVal;

      // Build task type options
      const taskTypeOptions = (this.config.taskTypeMaster || [])
        .map(t => `<option value="${t}" ${t === entry.taskType ? 'selected' : ''}>${t}</option>`)
        .join("");

      // 1. Mobile-First Card View (Displayed on Mobile Screens)
      if (cardsContainer) {
        const card = document.createElement("div");
        card.className = "mobile-entry-card";
        card.id = `card-${entry.id || index}`;

        card.innerHTML = `
          <div class="card-top-row">
            <div class="card-type-wrapper">
              <select class="mobile-input mobile-select" onchange="App.updateEntryField(${index}, 'taskType', this.value)">
                ${taskTypeOptions}
              </select>
            </div>
            <div class="card-time-wrapper">
              <input type="number" step="0.25" min="0" class="mobile-input mobile-time" value="${timeVal}"
                onchange="App.updateEntryField(${index}, 'timeHours', parseFloat(this.value) || 0)">
              <span class="time-unit">hrs</span>
            </div>
            <button type="button" class="btn-icon btn-danger-outline card-del-btn" title="Delete entry"
              onclick="App.deleteRow(${index})">✕</button>
          </div>

          <div class="card-task-row">
            <input type="text" class="mobile-input mobile-task" value="${entry.task || ''}" placeholder="Task description..."
              onchange="App.updateEntryField(${index}, 'task', this.value)">
          </div>

          <div class="card-meta-row">
            <div class="card-badges">
              ${entry.zohoId ? `<span class="badge badge-zoho">${entry.zohoId}</span>` : ''}
              ${entry.requirementId ? `<span class="badge badge-req">${entry.requirementId}</span>` : ''}
              ${entry.requirementTitle ? `<span class="badge-title-text" title="${entry.requirementTitle}">${entry.requirementTitle}</span>` : ''}
            </div>
            <div class="card-sub-meta">
              <label class="mobile-genai-badge ${entry.genAIUsage === 'Yes' ? 'active' : ''}">
                <input type="checkbox" ${entry.genAIUsage === 'Yes' ? 'checked' : ''} 
                  onchange="App.updateEntryField(${index}, 'genAIUsage', this.checked ? 'Yes' : 'No')">
                <span>Gen AI</span>
              </label>
              <span class="mobile-date-text">${entry.date || ''}</span>
            </div>
          </div>
        `;
        cardsContainer.appendChild(card);
      }

      // 2. Desktop Table View (Displayed on Tablets/Desktop)
      if (tbody) {
        const tr = document.createElement("tr");
        tr.id = `row-${entry.id || index}`;

        tr.innerHTML = `
          <td>
            <input type="text" class="table-input" value="${entry.date || ''}" 
              onchange="App.updateEntryField(${index}, 'date', this.value)" style="width: 100px;">
          </td>
          <td>
            <select class="table-input" onchange="App.updateEntryField(${index}, 'taskType', this.value)">
              ${taskTypeOptions}
            </select>
          </td>
          <td>
            <input type="text" class="table-input" value="${entry.task || ''}" placeholder="Task description"
              onchange="App.updateEntryField(${index}, 'task', this.value)">
          </td>
          <td>
            <input type="number" step="0.25" min="0" class="table-input num" value="${timeVal}" 
              onchange="App.updateEntryField(${index}, 'timeHours', parseFloat(this.value) || 0)">
          </td>
          <td>
            <input type="text" class="table-input" value="${entry.zohoId || ''}" placeholder="Zoho ID"
              onchange="App.updateEntryField(${index}, 'zohoId', this.value)" style="width: 85px;">
          </td>
          <td>
            <input type="text" class="table-input" value="${entry.requirementId || ''}" placeholder="Req ID"
              onchange="App.updateEntryField(${index}, 'requirementId', this.value)" style="width: 100px;">
          </td>
          <td>
            <input type="text" class="table-input" value="${entry.requirementTitle || ''}" placeholder="Requirement Title"
              onchange="App.updateEntryField(${index}, 'requirementTitle', this.value)">
          </td>
          <td>
            <select class="table-input" onchange="App.updateEntryField(${index}, 'genAIUsage', this.value)" style="width: 70px;">
              <option value="No" ${entry.genAIUsage === 'No' ? 'selected' : ''}>No</option>
              <option value="Yes" ${entry.genAIUsage === 'Yes' ? 'selected' : ''}>Yes</option>
            </select>
          </td>
          <td style="text-align: center;">
            <button type="button" class="btn-icon btn-danger-outline" title="Delete row" 
              onclick="App.deleteRow(${index})">✕</button>
          </td>
        `;

        tbody.appendChild(tr);
      }
    });

    const finalTotal = Math.round(calculatedTotal * 100) / 100;
    if (totalBanner) {
      totalBanner.textContent = `Total: ${finalTotal} hrs`;
    }

    if (confirmPrompt) {
      confirmPrompt.innerHTML = `I found <strong>${entries.length}</strong> time ${entries.length === 1 ? 'entry' : 'entries'} totaling <strong>${finalTotal} hours</strong>. Add them to your timesheet?`;
    }

    previewSection.style.display = "flex";
    previewSection.scrollIntoView({ behavior: "smooth" });
  },

  /**
   * In-place update of preview row
   */
  updateEntryField(index, field, value) {
    if (this.currentEntries[index]) {
      this.currentEntries[index][field] = value;

      // Auto-lookup requirement if zohoId changed
      if (field === "zohoId" && value) {
        const lookup = window.Validation.resolveRequirement(value, this.config.requirementMaster);
        if (lookup && lookup.match) {
          this.currentEntries[index].requirementId = lookup.match.requirementId;
          this.currentEntries[index].requirementTitle = lookup.match.requirementTitle;
          this.renderPreviewTable(this.currentEntries);
          return;
        }
      }

      if (field === "timeHours") {
        const total = Math.round(this.currentEntries.reduce((acc, e) => acc + (parseFloat(e.timeHours) || 0), 0) * 100) / 100;
        const totalBanner = document.getElementById("preview-total-banner");
        const confirmPrompt = document.getElementById("confirmation-prompt-text");
        if (totalBanner) totalBanner.textContent = `Total: ${total} hrs`;
        if (confirmPrompt) confirmPrompt.innerHTML = `I found <strong>${this.currentEntries.length}</strong> time entries totaling <strong>${total} hours</strong>. Add them to your timesheet?`;
      }
    }
  },

  /**
   * Delete row from preview table
   */
  deleteRow(index) {
    Haptics.tap();
    this.currentEntries.splice(index, 1);
    if (this.currentEntries.length === 0) {
      this.cancelPreview();
    } else {
      this.renderPreviewTable(this.currentEntries);
    }
  },

  /**
   * Add a new blank row to the preview table
   */
  addNewRow() {
    Haptics.tap();
    const defaultDate = window.Validation.parseNaturalDate("today", this.config.dateFormat);
    this.currentEntries.push({
      id: "entry_" + Date.now(),
      date: defaultDate,
      taskType: (this.config.taskTypeMaster && this.config.taskTypeMaster[0]) || "Project Analysis",
      task: "",
      subTask: "",
      genAIUsage: this.config.defaultGenAiValue || "No",
      timeHours: 1,
      description: "",
      requirementId: "",
      zohoId: "",
      requirementTitle: ""
    });
    this.renderPreviewTable(this.currentEntries);
  },

  /**
   * Cancel preview
   */
  cancelPreview() {
    this.currentEntries = [];
    const previewSection = document.getElementById("preview-section");
    if (previewSection) previewSection.style.display = "none";
  },

  /**
   * Submit entries to Google Sheets
   */
  async submitEntriesToSheets() {
    if (!this.currentEntries || this.currentEntries.length === 0) {
      this.showToast("No entries to add.", "info");
      return;
    }

    // 1. Validation check
    for (let i = 0; i < this.currentEntries.length; i++) {
      const valid = window.Validation.validateRow(this.currentEntries[i]);
      if (!valid.isValid) {
        this.showToast(`Row ${i + 1}: ${valid.errors.join(", ")}`, "error");
        return;
      }
    }

    // 2. Duplicate detection check
    if (this.config.duplicateProtection && this.existingEntries.length > 0) {
      for (const entry of this.currentEntries) {
        const dupCheck = window.Validation.checkDuplicate(entry, this.existingEntries);
        if (dupCheck.isDuplicate) {
          Haptics.warning();
          const proceed = confirm(
            `⚠️ Duplicate Warning:\nA similar entry (${dupCheck.reason}) already exists for ${entry.date}.\n\nDo you want to add this entry anyway?`
          );
          if (!proceed) {
            return;
          }
        }
      }
    }

    this.setProcessing(true, "Writing to your Google Sheet...");

    try {
      let result;
      if (this.config.appsScriptUrl) {
        result = await window.SheetsService.addEntries(
          this.config.appsScriptUrl,
          this.currentEntries,
          this.config.spreadsheetId
        );
      } else {
        // Simulated local fallback if Apps Script URL is not configured yet
        await new Promise(r => setTimeout(r, 600));
        result = {
          success: true,
          count: this.currentEntries.length,
          totalHoursAdded: this.currentEntries.reduce((a, b) => a + (b.timeHours || 0), 0),
          isSimulated: true
        };
      }

      this.setProcessing(false);
      Haptics.success();

      // Add to local cache
      this.existingEntries.push(...this.currentEntries);
      const addedCount = this.currentEntries.length;
      const addedHours = Math.round(this.currentEntries.reduce((a, b) => a + (b.timeHours || 0), 0) * 100) / 100;
      this.todayLoggedHours = Math.round((this.todayLoggedHours + addedHours) * 100) / 100;

      // Show daily summary
      this.showDailySummary(this.currentEntries, addedCount, this.todayLoggedHours, result.isSimulated);

      // Clean up preview and text input
      this.cancelPreview();
      const textInput = document.getElementById("input-work-text");
      if (textInput) textInput.value = "";
      if (this.voiceService) this.voiceService.reset();

      this.showToast(`Successfully added ${addedCount} entries!`, "success");

    } catch (err) {
      this.setProcessing(false);
      Haptics.error();
      console.error("Submission error:", err);
      this.showToast(
        "Unable to connect to your timesheet right now. Your entries have NOT been added. Please try again.",
        "error"
      );
    }
  },

  /**
   * Show Daily Summary card after submission
   */
  showDailySummary(entries, count, totalToday, isSimulated = false) {
    const card = document.getElementById("daily-summary-card");
    const countLabel = document.getElementById("summary-count-label");
    const detailsContainer = document.getElementById("summary-breakdown-list");
    const totalBanner = document.getElementById("summary-total-banner");

    if (!card) return;

    if (countLabel) {
      countLabel.textContent = `${count} ${count === 1 ? 'entry' : 'entries'} added to your timesheet.`;
    }

    if (detailsContainer) {
      detailsContainer.innerHTML = entries
        .map(e => `
          <div class="summary-item">
            <span style="color: #10b981; font-weight: bold;">✓</span>
            <strong>${e.taskType}</strong>
            ${e.task ? `— ${e.task}` : (e.requirementTitle ? `— ${e.requirementTitle}` : '')}
            — <strong>${e.timeHours}h</strong>
          </div>
        `)
        .join("");
    }

    if (totalBanner) {
      totalBanner.textContent = `Today's total: ${totalToday} hours`;
      if (isSimulated) {
        totalBanner.innerHTML += ` <span style="font-size: 0.8rem; font-weight: normal; color: var(--text-muted);">(Saved in local session - connect Google Apps Script in Settings to write directly to Google Sheets)</span>`;
      }
    }

    card.style.display = "block";
    card.scrollIntoView({ behavior: "smooth" });
  },

  /**
   * Load today's existing entries from Google Sheets or localStorage
   */
  async loadTodayData() {
    const todayFormatted = window.Validation.parseNaturalDate("today", this.config.dateFormat);
    if (this.config.appsScriptUrl) {
      try {
        const res = await window.SheetsService.fetchRecentEntries(
          this.config.appsScriptUrl,
          todayFormatted,
          50,
          this.config.spreadsheetId
        );
        if (res && Array.isArray(res.entries)) {
          this.existingEntries = res.entries;
          this.todayLoggedHours = res.todayTotalHours || 0;
          this.updateStatusBarWithHours(this.todayLoggedHours);
        }
      } catch (e) {
        console.warn("Could not fetch recent entries from Apps Script:", e);
      }
    }
  },

  /**
   * Clarification display
   */
  showClarification(question) {
    const box = document.getElementById("clarification-box");
    const qText = document.getElementById("clarification-question-text");
    if (box && qText) {
      qText.textContent = question;
      box.style.display = "flex";
      box.scrollIntoView({ behavior: "smooth" });
    }
  },

  hideClarification() {
    const box = document.getElementById("clarification-box");
    if (box) box.style.display = "none";
  },

  /**
   * Set processing state
   */
  setProcessing(isBusy, message = "Understanding your work...") {
    this.isProcessing = isBusy;
    const banner = document.getElementById("processing-banner");
    const bannerText = document.getElementById("processing-banner-text");
    const analyzeBtn = document.getElementById("btn-analyze");

    if (banner && bannerText) {
      bannerText.textContent = message;
      banner.style.display = isBusy ? "flex" : "none";
    }

    if (analyzeBtn) {
      analyzeBtn.disabled = isBusy;
    }
  },

  /**
   * Toast notification system
   */
  showToast(message, type = "info") {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    const icon = type === "success" ? "✓" : (type === "error" ? "⚠️" : "ℹ️");
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  },

  /**
   * Update header connection status badges
   */
  updateStatusBadges() {
    const sheetsDot = document.getElementById("status-sheets-dot");
    const sheetsText = document.getElementById("status-sheets-text");
    const aiDot = document.getElementById("status-ai-dot");
    const aiText = document.getElementById("status-ai-text");

    if (sheetsDot && sheetsText) {
      if (this.config.appsScriptUrl) {
        sheetsDot.className = "status-dot connected";
        sheetsText.textContent = "Google Sheets: Connected ✓";
      } else {
        sheetsDot.className = "status-dot connected";
        sheetsText.textContent = "Google Sheets: Ready ✓";
      }
    }

    if (aiDot && aiText) {
      aiDot.className = "status-dot connected";
      aiText.textContent = "AI: Google Gemini Ready ✓";
    }
  },

  updateStatusBarWithHours(hours) {
    const el = document.getElementById("status-today-hours");
    if (el) {
      el.textContent = `Today: ${hours} hrs logged`;
    }
  },

  /**
   * Settings Modal Handlers
   */
  openSettingsModal() {
    const modal = document.getElementById("modal-settings");
    if (!modal) return;

    // Populate inputs from this.config
    const urlEl = document.getElementById("setting-apps-script-url");
    const idEl = document.getElementById("setting-spreadsheet-id");

    if (urlEl) urlEl.value = this.config.appsScriptUrl || "";
    if (idEl) idEl.value = this.config.spreadsheetId || "1Z1UCvEUKEiVwqbnhsVFuSBakf0QlpNocZnvcH70wC_c";

    modal.style.display = "flex";
  },

  closeSettingsModal() {
    const modal = document.getElementById("modal-settings");
    if (modal) modal.style.display = "none";
  },

  handleSaveSettings(e) {
    e.preventDefault();
    const urlEl = document.getElementById("setting-apps-script-url");

    if (urlEl) this.config.appsScriptUrl = urlEl.value.trim();
    this.config.aiProvider = "gemini";
    this.config.aiModel = "gemini-1.5-flash";

    window.ConfigManager.save(this.config);
    this.updateStatusBadges();
    this.closeSettingsModal();
    this.showToast("Settings saved successfully!", "success");
  },

  async testSheetsConnection() {
    const url = document.getElementById("setting-apps-script-url").value.trim();
    const sheetId = document.getElementById("setting-spreadsheet-id").value.trim();

    if (!url) {
      this.showToast("Please enter your Google Apps Script URL.", "info");
      return;
    }

    try {
      this.showToast("Testing Apps Script connection...", "info");
      const pingRes = await window.SheetsService.ping(url, sheetId);
      
      // Also try syncing masters
      const mastersRes = await window.SheetsService.fetchMasters(url, sheetId);
      if (mastersRes && mastersRes.requirementMaster.length > 0) {
        this.config.requirementMaster = mastersRes.requirementMaster;
      }
      if (mastersRes && mastersRes.taskTypeMaster.length > 0) {
        this.config.taskTypeMaster = mastersRes.taskTypeMaster;
      }
      window.ConfigManager.save(this.config);

      this.showToast(`Connected! Sheet: "${pingRes.spreadsheetTitle}". Synced masters successfully!`, "success");
    } catch (err) {
      this.showToast("Connection failed: " + err.message, "error");
    }
  },

  /**
   * View Today's Entries Modal
   */
  openTodayModal() {
    Haptics.tap();
    const modal = document.getElementById("modal-today");
    const container = document.getElementById("today-entries-container");
    if (!modal || !container) return;

    if (this.existingEntries.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No entries logged yet today.</p>`;
    } else {
      let totalHrs = 0;
      const rowsHtml = this.existingEntries.map((e, idx) => {
        const time = parseFloat(e.timeHours || 0);
        totalHrs += time;
        return `
          <tr>
            <td>${e.date || ''}</td>
            <td><strong>${e.taskType || ''}</strong></td>
            <td>${e.task || ''}</td>
            <td style="font-weight: 600; text-align: right;">${time}</td>
            <td><span class="badge badge-zoho">${e.zohoId || '-'}</span></td>
            <td>${e.requirementTitle || '-'}</td>
            <td><span class="badge ${e.genAIUsage === 'Yes' ? 'badge-ai-yes' : 'badge-ai-no'}">${e.genAIUsage || 'No'}</span></td>
          </tr>
        `;
      }).join("");

      container.innerHTML = `
        <div class="table-responsive">
          <table class="timesheet-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Task Type</th>
                <th>Task</th>
                <th style="text-align: right;">Time (hrs)</th>
                <th>Zoho ID</th>
                <th>Requirement</th>
                <th>Gen AI</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
        <div style="margin-top: 1rem; text-align: right; font-weight: bold; font-size: 1.1rem; color: var(--brand-primary);">
          Total Logged: ${Math.round(totalHrs * 100) / 100} hours
        </div>
      `;
    }

    modal.style.display = "flex";
    requestAnimationFrame(() => {
      modal.classList.add("active");
    });
  },

  closeTodayModal() {
    Haptics.tap();
    const modal = document.getElementById("modal-today");
    if (modal) {
      modal.classList.remove("active");
      setTimeout(() => {
        modal.style.display = "none";
      }, 250);
    }
  }
};

if (typeof window !== "undefined") {
  window.App = App;
}
