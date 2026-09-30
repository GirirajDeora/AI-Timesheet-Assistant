/**
 * =========================================================================
 * AI Timesheet Assistant - Validation, Time/Date Parsing & Project Lookup
 * =========================================================================
 */

const Validation = {
  /**
   * Word to number mappings for natural time expressions
   */
  WORD_NUMBERS: {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "fifteen": 15, "twenty": 20,
    "thirty": 30, "forty": 40, "forty-five": 45, "forty five": 45,
    "fifty": 50, "a": 1, "an": 1, "half": 0.5, "quarter": 0.25
  },

  /**
   * Converts natural language time strings to decimal hours
   * Examples:
   *  "2 hours" -> 2
   *  "two and a half hours" -> 2.5
   *  "30 minutes" -> 0.5
   *  "15 minutes" -> 0.25
   *  "45 minutes" -> 0.75
   *  "1 hour 15 minutes" -> 1.25
   *  "half an hour" -> 0.5
   */
  parseNaturalTime(input) {
    if (typeof input === "number") {
      return isNaN(input) ? 0 : Math.round(input * 100) / 100;
    }
    if (!input || typeof input !== "string") return 0;

    let str = input.toLowerCase().trim();

    // Direct numeric check
    if (!isNaN(parseFloat(str)) && isFinite(str)) {
      return Math.round(parseFloat(str) * 100) / 100;
    }

    // Specific idioms before word replacement
    // Check if there is an integer before "and a half hour/hours", e.g. "two and a half hours" or "2 and a half hours"
    const andHalfPrefix = str.match(/(?:(\w+|\d+)\s+and\s+(?:a\s+)?half\s*(?:hours|hrs|hr|h)?)/i);
    if (andHalfPrefix && andHalfPrefix[1]) {
      let baseNum = parseFloat(andHalfPrefix[1]);
      if (isNaN(baseNum) && this.WORD_NUMBERS[andHalfPrefix[1].toLowerCase()] !== undefined) {
        baseNum = this.WORD_NUMBERS[andHalfPrefix[1].toLowerCase()];
      }
      if (!isNaN(baseNum)) {
        return Math.round((baseNum + 0.5) * 100) / 100;
      }
    }

    if (/\b(?:half\s+(?:an?\s+)?hours?|half\s+hours?)\b/i.test(str)) {
      return 0.5;
    }

    if (/\b(?:quarter\s+(?:of\s+an?\s+)?hours?|quarter\s+hours?)\b/i.test(str)) {
      return 0.25;
    }

    // Replace written numbers
    for (const [word, num] of Object.entries(this.WORD_NUMBERS)) {
      const reg = new RegExp(`\\b${word}\\b`, "gi");
      str = str.replace(reg, num);
    }

    let totalHours = 0;

    // Pattern: "X and 0.5 hours" or "X.5 hours"
    const andHalfMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:and\s+(?:a\s+)?0\.5)\s*(?:hours|hrs|hr|h)?/i);
    if (andHalfMatch) {
      return parseFloat(andHalfMatch[1]) + 0.5;
    }

    // Pattern: Combined hours and minutes, e.g. "1 hour 15 minutes" or "2h 30m"
    const combinedMatch = str.match(/(?:around|about|approx|approximately)?\s*(\d+(?:\.\d+)?)\s*(?:hours|hour|hrs|hr|h)\s*(?:and)?\s*(\d+(?:\.\d+)?)\s*(?:minutes|minute|mins|min|m)/i);
    if (combinedMatch) {
      const hrs = parseFloat(combinedMatch[1]);
      const mins = parseFloat(combinedMatch[2]);
      return Math.round((hrs + mins / 60) * 100) / 100;
    }

    // Pattern: Hours only, e.g. "3 hours", "about 2.5 hrs", "around 2 hours"
    const hoursMatch = str.match(/(?:around|about|approx|approximately)?\s*(\d+(?:\.\d+)?)\s*(?:hours|hour|hrs|hr|h)\b/i);
    if (hoursMatch) {
      totalHours += parseFloat(hoursMatch[1]);
      str = str.replace(hoursMatch[0], "");
    }

    // Pattern: Minutes only, e.g. "15 minutes", "30 mins", "45 min"
    const minutesMatch = str.match(/(?:around|about|approx|approximately)?\s*(\d+(?:\.\d+)?)\s*(?:minutes|minute|mins|min|m)\b/i);
    if (minutesMatch) {
      totalHours += parseFloat(minutesMatch[1]) / 60;
    }

    // Final fallback: solitary number
    if (totalHours === 0) {
      const solitaryMatch = str.match(/\b(\d+(?:\.\d+)?)\b/);
      if (solitaryMatch) {
        totalHours = parseFloat(solitaryMatch[1]);
      }
    }

    return Math.round(totalHours * 100) / 100;
  },

  /**
   * Resolves natural date references into DD/MM/YYYY format
   */
  parseNaturalDate(dateInput, targetFormat = "DD/MM/YYYY") {
    const today = new Date();
    let target = new Date(today);

    if (!dateInput || typeof dateInput !== "string" || dateInput.toLowerCase().trim() === "today") {
      return this.formatDate(today, targetFormat);
    }

    const lower = dateInput.toLowerCase().trim();

    if (lower === "yesterday") {
      target.setDate(today.getDate() - 1);
      return this.formatDate(target, targetFormat);
    }

    if (lower === "day before yesterday") {
      target.setDate(today.getDate() - 2);
      return this.formatDate(target, targetFormat);
    }

    // Check for explicit "on Monday", "on Friday", etc.
    const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    for (let i = 0; i < daysOfWeek.length; i++) {
      if (lower.includes(daysOfWeek[i])) {
        const currentDayIndex = today.getDay();
        let diff = currentDayIndex - i;
        if (diff <= 0) diff += 7; // Previous instance of that day
        target.setDate(today.getDate() - diff);
        return this.formatDate(target, targetFormat);
      }
    }

    // Check if input is already formatted as DD/MM/YYYY or YYYY-MM-DD
    const ddmmyyyy = lower.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10) - 1;
      const year = parseInt(ddmmyyyy[3], 10);
      const parsedDate = new Date(year, month, day);
      if (!isNaN(parsedDate.getTime())) {
        return this.formatDate(parsedDate, targetFormat);
      }
    }

    const yyyymmdd = lower.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (yyyymmdd) {
      const year = parseInt(yyyymmdd[1], 10);
      const month = parseInt(yyyymmdd[2], 10) - 1;
      const day = parseInt(yyyymmdd[3], 10);
      const parsedDate = new Date(year, month, day);
      if (!isNaN(parsedDate.getTime())) {
        return this.formatDate(parsedDate, targetFormat);
      }
    }

    return this.formatDate(today, targetFormat);
  },

  /**
   * Helper to format a Date object
   */
  formatDate(date, format = "DD/MM/YYYY") {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    if (format === "YYYY-MM-DD") {
      return `${year}-${month}-${day}`;
    } else if (format === "MM/DD/YYYY") {
      return `${month}/${day}/${year}`;
    }
    // Default DD/MM/YYYY
    return `${day}/${month}/${year}`;
  },

  /**
   * Matches project or requirement against Requirement Master
   */
  resolveRequirement(text, requirementMaster = []) {
    if (!text || !Array.isArray(requirementMaster) || requirementMaster.length === 0) {
      return null;
    }

    const cleanText = text.toLowerCase().trim();

    // 1. Exact match on Zoho ID (e.g. "MV-703", "MV 703", "MV703")
    for (const item of requirementMaster) {
      if (item.zohoId) {
        const rawZoho = item.zohoId.toLowerCase().trim();
        const normZoho = rawZoho.replace(/[\s\-_]/g, "");
        const reg1 = new RegExp(`\\b${rawZoho}\\b`, "i");
        const reg2 = new RegExp(`\\b${normZoho}\\b`, "i");

        if (reg1.test(cleanText) || reg2.test(cleanText.replace(/[\s\-_]/g, ""))) {
          return { match: item, exact: true };
        }
      }
    }

    // 2. Exact match on Requirement ID (e.g. "R26-04-018", "R2604018")
    for (const item of requirementMaster) {
      if (item.requirementId) {
        const rawReq = item.requirementId.toLowerCase().trim();
        const normReq = rawReq.replace(/[\s\-_]/g, "");
        if (cleanText.includes(rawReq) || cleanText.replace(/[\s\-_]/g, "").includes(normReq)) {
          return { match: item, exact: true };
        }
      }
    }

    // 3. Exact full title match (e.g. "auction report dashboard")
    for (const item of requirementMaster) {
      if (item.requirementTitle) {
        const titleLower = item.requirementTitle.toLowerCase().trim();
        if (titleLower && cleanText.includes(titleLower)) {
          // If title has "phase 2" and text doesn't mention phase, or vice versa, check phases
          return { match: item, exact: true };
        }
      }
    }

    // 4. Keyword / title fuzzy search
    const candidates = [];
    for (const item of requirementMaster) {
      if (!item.requirementTitle) continue;
      const titleLower = item.requirementTitle.toLowerCase();
      
      // Check partial title substring
      if (titleLower.length > 5 && (cleanText.includes(titleLower) || titleLower.includes(cleanText))) {
        candidates.push(item);
        continue;
      }

      // Check significant words (3+ chars)
      const words = titleLower
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(w => w.length >= 3 && !["and", "the", "for", "with"].includes(w));
      
      const matchedWords = words.filter(word => cleanText.includes(word));
      if (matchedWords.length >= 2 || (words.length === 1 && matchedWords.length === 1)) {
        candidates.push(item);
      }
    }

    // If multiple candidates, check if one matches phase (e.g. phase 2 vs phase 1) or is higher priority
    if (candidates.length > 1) {
      const phase2Candidates = candidates.filter(c => c.requirementTitle.toLowerCase().includes("phase 2") || c.requirementTitle.toLowerCase().includes("phase - 02"));
      if (phase2Candidates.length === 1 && cleanText.includes("phase 2")) {
        return { match: phase2Candidates[0], exact: false };
      }
      // If user said "pp bags" without phase, prefer active Phase 2 (MV-703) if configured
      const ppBags = candidates.find(c => c.zohoId === "MV-703");
      if (ppBags && cleanText.includes("pp bags")) {
        return { match: ppBags, exact: false };
      }
    }

    if (candidates.length === 1) {
      return { match: candidates[0], exact: false };
    } else if (candidates.length > 1) {
      return { ambiguous: true, candidates: candidates };
    }

    return null;
  },

  /**
   * Matches a task description to the most appropriate Task Type Master entry
   */
  detectTaskType(taskText, taskTypeMaster = []) {
    if (!taskText) return "Project Analysis";
    const text = taskText.toLowerCase();

    // Specific keywords mappings
    if (text.includes("scrum") || text.includes("standup") || text.includes("daily call")) {
      return taskTypeMaster.find(t => t.toLowerCase() === "scrum") || "Scrum";
    }

    if (text.includes("qa") || text.includes("testing") || text.includes("bug") || text.includes("defect") || text.includes("test case")) {
      if (text.includes("queries") || text.includes("query") || text.includes("qa queries")) {
        return taskTypeMaster.find(t => t.toLowerCase().includes("qa queries")) || "QA Queries";
      }
      return taskTypeMaster.find(t => t.toLowerCase() === "testing") || "QA Queries";
    }

    if (text.includes("brs") || text.includes("srs") || text.includes("frd") || text.includes("document") || text.includes("spec") || text.includes("user story")) {
      return taskTypeMaster.find(t => t.toLowerCase().includes("documentation")) || "Documentation Creation";
    }

    if (text.includes("client meeting") || text.includes("client call") || text.includes("stakeholder")) {
      return taskTypeMaster.find(t => t.toLowerCase().includes("client meeting")) || "Client Meeting";
    }

    if (text.includes("war room") || text.includes("warroom")) {
      return taskTypeMaster.find(t => t.toLowerCase().includes("war room")) || "War Room Meeting";
    }

    if (text.includes("iso") || text.includes("audit")) {
      return taskTypeMaster.find(t => t.toLowerCase().includes("iso audit")) || "ISO Audit";
    }

    if (text.includes("timesheet") || text.includes("time sheet")) {
      return taskTypeMaster.find(t => t.toLowerCase().includes("timesheet")) || "Timesheet";
    }

    if (text.includes("analysis") || text.includes("analyzing") || text.includes("vpd") || text.includes("requirement")) {
      return taskTypeMaster.find(t => t.toLowerCase().includes("project analysis")) || "Project Analysis";
    }

    if (text.includes("develop") || text.includes("coding") || text.includes("implementation") || text.includes("code review")) {
      return taskTypeMaster.find(t => t.toLowerCase() === "development") || "Development";
    }

    // Default to Project Analysis or first item in master
    return taskTypeMaster.find(t => t.toLowerCase() === "project analysis") || taskTypeMaster[0] || "Project Analysis";
  },

  /**
   * Detects whether Generative AI tools were mentioned
   */
  detectGenAiUsage(text, defaultValue = "No") {
    if (!text || typeof text !== "string") return defaultValue;
    const lower = text.toLowerCase();

    // Explicit negative mentions
    if (lower.includes("no ai") || lower.includes("without ai") || lower.includes("manually analyzed") || lower.includes("manual work")) {
      return "No";
    }

    // Positive indicators
    const aiKeywords = [
      "chatgpt", "gpt-4", "gpt", "gemini", "claude", "copilot",
      "gen ai", "generative ai", "used ai", "with ai", "ai tool",
      "perplexity", "deepseek", "anthropic", "openai"
    ];

    for (const kw of aiKeywords) {
      if (new RegExp(`\\b${kw}\\b`, "i").test(lower)) {
        return "Yes";
      }
    }

    return defaultValue;
  },

  /**
   * Duplicate entry check
   * Compares candidate entry against existing entries on the same date.
   */
  checkDuplicate(candidate, existingEntries = []) {
    if (!candidate || !Array.isArray(existingEntries) || existingEntries.length === 0) {
      return { isDuplicate: false };
    }

    const candDate = String(candidate.date || "").trim();
    const candZoho = String(candidate.zohoId || "").trim().toLowerCase();
    const candTask = String(candidate.task || "").trim().toLowerCase();
    const candType = String(candidate.taskType || "").trim().toLowerCase();

    for (const item of existingEntries) {
      const itemDate = String(item.date || "").trim();
      if (candDate && itemDate && candDate !== itemDate) continue;

      const itemZoho = String(item.zohoId || "").trim().toLowerCase();
      const itemTask = String(item.task || "").trim().toLowerCase();
      const itemType = String(item.taskType || "").trim().toLowerCase();

      // Condition 1: Same Zoho ID and same task type
      if (candZoho && itemZoho && candZoho === itemZoho && candType === itemType) {
        return { isDuplicate: true, matchedEntry: item, reason: `Matching Zoho ID (${candidate.zohoId}) and Task Type (${candidate.taskType})` };
      }

      // Condition 2: Identical task description and date
      if (candTask && itemTask && candTask === itemTask && candType === itemType) {
        return { isDuplicate: true, matchedEntry: item, reason: `Matching Task description ("${candidate.task}")` };
      }
    }

    return { isDuplicate: false };
  },

  /**
   * Validates a single timesheet row before submission
   */
  validateRow(row) {
    const errors = [];

    if (!row.date || String(row.date).trim() === "") {
      errors.push("Date is required.");
    }

    if (!row.taskType || String(row.taskType).trim() === "") {
      errors.push("Task Type is required.");
    }

    const time = parseFloat(row.timeHours !== undefined ? row.timeHours : row.time);
    if (isNaN(time) || time <= 0) {
      errors.push("Time (hrs) must be a positive decimal number greater than 0.");
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
};

if (typeof window !== "undefined") {
  window.Validation = Validation;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { Validation };
}
