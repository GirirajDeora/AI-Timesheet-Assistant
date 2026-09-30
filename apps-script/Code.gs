/**
 * =========================================================================
 * AI Timesheet Assistant - Google Apps Script Backend
 * =========================================================================
 * 
 * This script serves as the secure backend API for the AI Timesheet Assistant.
 * It connects your static frontend (e.g., GitHub Pages) directly to your
 * Google Spreadsheet without exposing spreadsheet write permissions publicly.
 *
 * Supported Actions:
 *  - ping: Health check and connectivity verification
 *  - getMasters: Retrieves Requirement Master & Task Type Master tables
 *  - getRecentEntries: Retrieves recent entries for duplicate detection & summaries
 *  - addEntries: Appends validated timesheet rows preserving the 10-column layout
 *  - proxyAi: (Optional) Securely forwards AI prompts using server-side API keys
 */

// ==========================================
// CONFIGURATION
// ==========================================
var CONFIG = {
  // Configured with Giriraj Deora's Product Timesheet ID:
  SPREADSHEET_ID: "1Z1UCvEUKEiVwqbnhsVFuSBakf0QlpNocZnvcH70wC_c", 
  
  SHEET_NAMES: {
    TIMESHEET: "Timesheet",
    REQUIREMENT_MASTER: "Requirement Master",
    TASK_TYPE_MASTER: "Task Type Master"
  },
  
  // Exact 10-column structure as defined in specifications:
  COLUMNS: [
    "Date",
    "Task Type",
    "Task",
    "Sub-Task",
    "Gen AI Usage",
    "Time (hrs)",
    "Description",
    "Requirement ID",
    "Zoho ID",
    "Requirement Title"
  ]
};

/**
 * Helper to get the target Google Spreadsheet instance.
 */
function getSpreadsheet(customSpreadsheetId) {
  var id = customSpreadsheetId || CONFIG.SPREADSHEET_ID;
  if (id && id.trim() !== "") {
    return SpreadsheetApp.openById(id.trim());
  }
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    throw new Error("No active spreadsheet found. Please configure SPREADSHEET_ID in Code.gs or settings.");
  }
}

/**
 * Handle HTTP GET Requests (Health check, fetching masters, fetching recent entries)
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "ping";
  var customSpreadsheetId = e && e.parameter ? e.parameter.spreadsheetId : "";
  
  try {
    var responseData = {};
    
    if (action === "ping") {
      var ss = getSpreadsheet(customSpreadsheetId);
      responseData = {
        success: true,
        message: "Google Apps Script Web App is connected and running successfully!",
        spreadsheetTitle: ss.getName(),
        spreadsheetId: ss.getId(),
        timestamp: new Date().toISOString()
      };
    } else if (action === "getMasters") {
      responseData = fetchMastersData(customSpreadsheetId);
    } else if (action === "getRecentEntries") {
      var limit = parseInt(e.parameter.limit || "20", 10);
      var targetDate = e.parameter.date || "";
      responseData = fetchRecentEntries(customSpreadsheetId, limit, targetDate);
    } else {
      responseData = {
        success: false,
        error: "Unknown action: " + action
      };
    }
    
    return createJsonResponse(responseData);
  } catch (err) {
    return createJsonResponse({
      success: false,
      error: err.message || err.toString()
    });
  }
}

/**
 * Handle HTTP POST Requests (Adding entries, proxying AI, fetching data via POST)
 */
function doPost(e) {
  try {
    var rawData = e.postData ? e.postData.contents : "";
    var payload = {};
    if (rawData) {
      try {
        payload = JSON.parse(rawData);
      } catch (parseErr) {
        // Fallback for form urlencoded or raw string
        payload = e.parameter || {};
      }
    } else {
      payload = e.parameter || {};
    }

    var action = payload.action || (e.parameter ? e.parameter.action : "addEntries");
    var customSpreadsheetId = payload.spreadsheetId || (e.parameter ? e.parameter.spreadsheetId : "");
    var responseData = {};

    if (action === "addEntries") {
      responseData = appendTimesheetEntries(payload.entries, customSpreadsheetId);
    } else if (action === "getMasters") {
      responseData = fetchMastersData(customSpreadsheetId);
    } else if (action === "getRecentEntries") {
      var limit = parseInt(payload.limit || "20", 10);
      var targetDate = payload.date || "";
      responseData = fetchRecentEntries(customSpreadsheetId, limit, targetDate);
    } else if (action === "proxyAi") {
      responseData = handleAiProxy(payload);
    } else {
      responseData = {
        success: false,
        error: "Unknown action: " + action
      };
    }

    return createJsonResponse(responseData);
  } catch (err) {
    return createJsonResponse({
      success: false,
      error: err.message || err.toString()
    });
  }
}

/**
 * Helper to build JSON responses with CORS headers allowed by Apps Script
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Ensure sheet headers match the required 10 columns
 */
function ensureSheetHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(CONFIG.COLUMNS);
    var headerRange = sheet.getRange(1, 1, 1, CONFIG.COLUMNS.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#2c3e50");
    headerRange.setFontColor("#ffffff");
  }
}

/**
 * Appends timesheet entries to the 'Timesheet' sheet.
 * Preserves the exact 10 columns:
 * 1. Date
 * 2. Task Type
 * 3. Task
 * 4. Sub-Task
 * 5. Gen AI Usage
 * 6. Time (hrs)
 * 7. Description
 * 8. Requirement ID
 * 9. Zoho ID
 * 10. Requirement Title
 */
function appendTimesheetEntries(entries, customSpreadsheetId) {
  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return {
      success: false,
      error: "No entries provided in payload to add."
    };
  }

  var ss = getSpreadsheet(customSpreadsheetId);
  var sheetName = CONFIG.SHEET_NAMES.TIMESHEET;
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  
  ensureSheetHeaders(sheet);

  var rowsToAdd = [];
  var totalHoursAdded = 0;

  for (var i = 0; i < entries.length; i++) {
    var item = entries[i];
    var timeVal = parseFloat(item.timeHours !== undefined ? item.timeHours : item.time || 0);
    if (isNaN(timeVal)) timeVal = 0;
    totalHoursAdded += timeVal;

    // Normalizing Gen AI Usage
    var genAiVal = item.genAIUsage || item.genAiUsage || item.genAI || "";
    if (typeof genAiVal === "boolean") {
      genAiVal = genAiVal ? "Yes" : "No";
    }

    var row = [
      item.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy"),
      item.taskType || "",
      item.task || "",
      item.subTask || "",
      genAiVal,
      timeVal,
      item.description || "",
      item.requirementId || "",
      item.zohoId || "",
      item.requirementTitle || ""
    ];

    rowsToAdd.push(row);
  }

  if (rowsToAdd.length > 0) {
    var nextRow = sheet.getLastRow() + 1;
    sheet.getRange(nextRow, 1, rowsToAdd.length, CONFIG.COLUMNS.length).setValues(rowsToAdd);
  }

  return {
    success: true,
    message: "Successfully added " + rowsToAdd.length + " entries to Google Sheet.",
    count: rowsToAdd.length,
    totalHoursAdded: totalHoursAdded
  };
}

/**
 * Fetches Requirement Master and Task Type Master from their respective sheets
 */
function fetchMastersData(customSpreadsheetId) {
  var ss = getSpreadsheet(customSpreadsheetId);
  
  // 1. Requirement Master
  var reqSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.REQUIREMENT_MASTER);
  var requirementMaster = [];
  if (reqSheet && reqSheet.getLastRow() > 1) {
    var reqData = reqSheet.getDataRange().getValues();
    var reqHeaders = reqData[0].map(function(h) { return String(h).trim().toLowerCase(); });
    
    var zohoIdx = reqHeaders.indexOf("zoho id");
    if (zohoIdx === -1) zohoIdx = reqHeaders.indexOf("zohoid");
    if (zohoIdx === -1) zohoIdx = 0;

    var reqIdIdx = reqHeaders.indexOf("requirement id");
    if (reqIdIdx === -1) reqIdIdx = reqHeaders.indexOf("requirementid");
    if (reqIdIdx === -1) reqIdIdx = 1;

    var titleIdx = reqHeaders.indexOf("requirement title");
    if (titleIdx === -1) titleIdx = reqHeaders.indexOf("requirementtitle");
    if (titleIdx === -1) titleIdx = reqHeaders.indexOf("title");
    if (titleIdx === -1) titleIdx = 2;

    for (var r = 1; r < reqData.length; r++) {
      var row = reqData[r];
      var zohoId = String(row[zohoIdx] || "").trim();
      var reqId = String(row[reqIdIdx] || "").trim();
      var reqTitle = String(row[titleIdx] || "").trim();
      
      if (zohoId || reqId || reqTitle) {
        requirementMaster.push({
          zohoId: zohoId,
          requirementId: reqId,
          requirementTitle: reqTitle
        });
      }
    }
  }

  // 2. Task Type Master
  var taskTypeSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.TASK_TYPE_MASTER);
  var taskTypeMaster = [];
  if (taskTypeSheet && taskTypeSheet.getLastRow() > 1) {
    var taskData = taskTypeSheet.getDataRange().getValues();
    for (var t = 1; t < taskData.length; t++) {
      var val = String(taskData[t][0] || "").trim();
      if (val && taskTypeMaster.indexOf(val) === -1) {
        taskTypeMaster.push(val);
      }
    }
  }

  // Fallbacks if sheets are new/empty
  if (taskTypeMaster.length === 0) {
    taskTypeMaster = [
      "Project Analysis",
      "QA Queries",
      "Scrum",
      "Documentation Creation",
      "Client Meeting",
      "Timesheet",
      "ISO Audit",
      "War Room Meeting",
      "Development",
      "Testing",
      "Bug Fixing"
    ];
  }

  return {
    success: true,
    requirementMaster: requirementMaster,
    taskTypeMaster: taskTypeMaster
  };
}

/**
 * Fetches recent entries from the Timesheet sheet for duplicate checks & daily summaries
 */
function fetchRecentEntries(customSpreadsheetId, limit, targetDate) {
  var ss = getSpreadsheet(customSpreadsheetId);
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.TIMESHEET);
  
  if (!sheet || sheet.getLastRow() <= 1) {
    return {
      success: true,
      entries: [],
      todayTotalHours: 0
    };
  }

  var data = sheet.getDataRange().getValues();
  var entries = [];
  var todayTotalHours = 0;
  var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
  var filterDate = targetDate || nowStr;

  // Read starting from row 2 (skipping headers)
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var dateVal = row[0];
    var formattedDate = "";
    if (dateVal instanceof Date) {
      formattedDate = Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "dd/MM/yyyy");
    } else {
      formattedDate = String(dateVal || "").trim();
    }

    var timeHours = parseFloat(row[5] || 0);
    if (isNaN(timeHours)) timeHours = 0;

    var entry = {
      rowIndex: i + 1,
      date: formattedDate,
      taskType: String(row[1] || ""),
      task: String(row[2] || ""),
      subTask: String(row[3] || ""),
      genAIUsage: String(row[4] || ""),
      timeHours: timeHours,
      description: String(row[6] || ""),
      requirementId: String(row[7] || ""),
      zohoId: String(row[8] || ""),
      requirementTitle: String(row[9] || "")
    };

    if (formattedDate === filterDate) {
      todayTotalHours += timeHours;
    }

    entries.push(entry);
  }

  // Reverse so newest entries come first
  entries.reverse();
  if (limit > 0 && entries.length > limit) {
    entries = entries.slice(0, limit);
  }

  return {
    success: true,
    entries: entries,
    todayTotalHours: Math.round(todayTotalHours * 100) / 100
  };
}

/**
 * Optional: Proxy AI requests through Google Apps Script
 * so API keys are securely stored in Apps Script Script Properties
 * and never exposed to the browser client.
 */
function handleAiProxy(payload) {
  var scriptProperties = PropertiesService.getScriptProperties();
  var apiKey = scriptProperties.getProperty("AI_API_KEY") || payload.apiKey;
  var provider = (payload.provider || "gemini").toLowerCase();

  if (!apiKey) {
    return {
      success: false,
      error: "No AI API key found in Apps Script properties or request payload."
    };
  }

  if (provider === "gemini") {
    var model = payload.model || "gemini-1.5-flash";
    var url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
    var body = {
      contents: [{
        parts: [{ text: payload.prompt }]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    };
    
    var response = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(body),
      muteHttpExceptions: true
    });
    
    var resCode = response.getResponseCode();
    var resText = response.getContentText();
    if (resCode >= 200 && resCode < 300) {
      return {
        success: true,
        rawResponse: resText
      };
    } else {
      return {
        success: false,
        error: "Gemini API Error (" + resCode + "): " + resText
      };
    }
  } else if (provider === "openai") {
    var model = payload.model || "gpt-4o-mini";
    var url = "https://api.openai.com/v1/chat/completions";
    var body = {
      model: model,
      messages: [
        { role: "system", content: payload.systemPrompt || "You are a timesheet extraction assistant." },
        { role: "user", content: payload.prompt }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    };

    var response = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      headers: {
        "Authorization": "Bearer " + apiKey
      },
      payload: JSON.stringify(body),
      muteHttpExceptions: true
    });

    var resCode = response.getResponseCode();
    var resText = response.getContentText();
    if (resCode >= 200 && resCode < 300) {
      return {
        success: true,
        rawResponse: resText
      };
    } else {
      return {
        success: false,
        error: "OpenAI API Error (" + resCode + "): " + resText
      };
    }
  }

  return {
    success: false,
    error: "Unsupported AI provider for Apps Script proxy: " + provider
  };
}
