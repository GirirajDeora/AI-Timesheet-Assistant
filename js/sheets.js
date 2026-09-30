/**
 * =========================================================================
 * AI Timesheet Assistant - Google Sheets & Apps Script Client
 * =========================================================================
 */

const SheetsService = {
  /**
   * Health check to test Google Apps Script Web App connectivity
   */
  async ping(appsScriptUrl, spreadsheetId = "") {
    if (!appsScriptUrl || appsScriptUrl.trim() === "") {
      throw new Error("Apps Script Web App URL is not configured. Please set it in Settings.");
    }

    const cleanUrl = appsScriptUrl.trim();
    const separator = cleanUrl.includes("?") ? "&" : "?";
    const endpoint = `${cleanUrl}${separator}action=ping&spreadsheetId=${encodeURIComponent(spreadsheetId)}`;

    const response = await fetch(endpoint, {
      method: "GET",
      mode: "cors"
    });

    if (!response.ok) {
      throw new Error(`Apps Script responded with status HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Unknown Apps Script connection error");
    }

    return data;
  },

  /**
   * Fetches Requirement Master and Task Type Master from connected Google Sheet
   */
  async fetchMasters(appsScriptUrl, spreadsheetId = "") {
    if (!appsScriptUrl || appsScriptUrl.trim() === "") {
      return null;
    }

    const cleanUrl = appsScriptUrl.trim();
    const separator = cleanUrl.includes("?") ? "&" : "?";
    const endpoint = `${cleanUrl}${separator}action=getMasters&spreadsheetId=${encodeURIComponent(spreadsheetId)}`;

    const response = await fetch(endpoint, {
      method: "GET",
      mode: "cors"
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch master data: HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Could not retrieve master sheets");
    }

    return {
      requirementMaster: data.requirementMaster || [],
      taskTypeMaster: data.taskTypeMaster || []
    };
  },

  /**
   * Fetches recent entries for duplicate detection and daily summaries
   */
  async fetchRecentEntries(appsScriptUrl, targetDate = "", limit = 30, spreadsheetId = "") {
    if (!appsScriptUrl || appsScriptUrl.trim() === "") {
      return { entries: [], todayTotalHours: 0 };
    }

    const cleanUrl = appsScriptUrl.trim();
    const separator = cleanUrl.includes("?") ? "&" : "?";
    const endpoint = `${cleanUrl}${separator}action=getRecentEntries&limit=${limit}&date=${encodeURIComponent(targetDate)}&spreadsheetId=${encodeURIComponent(spreadsheetId)}`;

    const response = await fetch(endpoint, {
      method: "GET",
      mode: "cors"
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch recent entries: HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      entries: data.entries || [],
      todayTotalHours: data.todayTotalHours || 0
    };
  },

  /**
   * Sends structured timesheet entries to be appended to Google Sheet
   */
  async addEntries(appsScriptUrl, entries, spreadsheetId = "") {
    if (!appsScriptUrl || appsScriptUrl.trim() === "") {
      throw new Error("Apps Script Web App URL is not configured. Please set it in Settings.");
    }

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      throw new Error("No entries provided to add.");
    }

    const payload = {
      action: "addEntries",
      spreadsheetId: spreadsheetId,
      entries: entries
    };

    const response = await fetch(appsScriptUrl.trim(), {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Google Sheets submission failed with HTTP ${response.status}. Please check your connection.`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to append entries to your Timesheet sheet.");
    }

    return data;
  }
};

if (typeof window !== "undefined") {
  window.SheetsService = SheetsService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { SheetsService };
}
