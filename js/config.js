/**
 * =========================================================================
 * AI Timesheet Assistant - Central Configuration & State Storage
 * =========================================================================
 */

const DEFAULT_CONFIG = {
  // Google Sheets & Apps Script Integration
  appsScriptUrl: "",
  spreadsheetId: "1Z1UCvEUKEiVwqbnhsVFuSBakf0QlpNocZnvcH70wC_c",
  spreadsheetTitle: "Connected Timesheet",
  timesheetSheetName: "Timesheet",
  requirementMasterSheetName: "Requirement Master",
  taskTypeMasterSheetName: "Task Type Master",

  // AI Configuration - Fixed to Google Gemini at code level
  aiProvider: "gemini",
  aiModel: "gemini-1.5-flash",
  // Enter your Gemini API key below to configure it directly at the code level:
  aiApiKey: "",

  // Standard Defaults (Fixed at code level)
  dateFormat: "DD/MM/YYYY",
  defaultGenAiValue: "No",
  confirmBeforeSubmit: true,
  voiceEnabled: true,
  theme: "light",
  duplicateProtection: true,

  // Requirement Master project mappings
  requirementMaster: [
    {
      "zohoId": "MV-703",
      "requirementId": "R26-04-018",
      "requirementTitle": "OTG PP bags enhancement (Phase 2)"
    },
    {
      "zohoId": "MV-722",
      "requirementId": "R26-04-043",
      "requirementTitle": "RFQ Before PR with Contract (Material)"
    },
    {
      "zohoId": "MV-356",
      "requirementId": "R26-04-019",
      "requirementTitle": "Q Plus Tech Upgrade"
    },
    {
      "zohoId": "MV-727",
      "requirementId": "R26-04-002",
      "requirementTitle": "Auto Deletion of Invoice on ASN Deletion"
    },
    {
      "zohoId": "MV-417",
      "requirementId": "R26-04-015",
      "requirementTitle": "Auction Setup Redesign"
    },
    {
      "zohoId": "MV-739",
      "requirementId": "R26-04-041",
      "requirementTitle": "Initial Setup of \"What’s New\" Feature in VENDX"
    },
    {
      "zohoId": "MV-706",
      "requirementId": "R26-04-020",
      "requirementTitle": "Q Plus Phase - 02 (customize preference)"
    },
    {
      "zohoId": "MV-712",
      "requirementId": "R26-04-012",
      "requirementTitle": "RFQ Visibility Control Similarity In Auction & R2A"
    },
    {
      "zohoId": "MV-748",
      "requirementId": "R26-05-001",
      "requirementTitle": "RFQ Before PR with Contract (Service)"
    },
    {
      "zohoId": "MV-723",
      "requirementId": "R26-04-007",
      "requirementTitle": "PR Creation and Approval Workflow in VENDX"
    },
    {
      "zohoId": "MV-474",
      "requirementId": "R26-04-008",
      "requirementTitle": "VENDX Connect"
    },
    {
      "zohoId": "MV-697",
      "requirementId": "R26-04-011",
      "requirementTitle": "UAM (User Access Management)"
    },
    {
      "zohoId": "FR1-T179",
      "requirementId": "R26-05-003",
      "requirementTitle": "Change Terminology from “Landed Cost” to “Bidding Amount” in Auction Alerts"
    },
    {
      "zohoId": "CRA6-T61",
      "requirementId": "R26-05-004",
      "requirementTitle": "Issue in Auto-Extension During Start Price Auction"
    },
    {
      "zohoId": "MV-738",
      "requirementId": "R26-04-035",
      "requirementTitle": "Quick DA: Easy Approve"
    },
    {
      "zohoId": "MV-754",
      "requirementId": "R26-06-007",
      "requirementTitle": "Dashboard Revamp in Contract Register"
    },
    {
      "zohoId": "MV-688",
      "requirementId": "R26-04-047",
      "requirementTitle": "VOB Certificate Expiry"
    },
    {
      "zohoId": "MV-749",
      "requirementId": "R26-05-006",
      "requirementTitle": "Security Enhancements – Session Timeout, Global Logout & Column-Level Encryption"
    },
    {
      "zohoId": "MV-443",
      "requirementId": "R26-06-006",
      "requirementTitle": "International Vendor Contract"
    },
    {
      "zohoId": "MV-755",
      "requirementId": "R26-06-005",
      "requirementTitle": "Auction Module Enhancements – Tolerance Controls, L1 Summary Report, and Vendor IP Tracking"
    },
    {
      "zohoId": "MV-714",
      "requirementId": "R26-04-021",
      "requirementTitle": "Item code and Name in ASN"
    },
    {
      "zohoId": "MV-637",
      "requirementId": "R26-04-004",
      "requirementTitle": "UI Update - Account Dashboard and Appbar"
    },
    {
      "zohoId": "MV-696",
      "requirementId": "R26-06-004",
      "requirementTitle": "Multi-Factor Authentication (MFA) in VENDX"
    },
    {
      "zohoId": "MV-757",
      "requirementId": "R26-06-008",
      "requirementTitle": "Duplicate Vendor–Plant Alert in Quantity Distribution Screen"
    },
    {
      "zohoId": "MV-777",
      "requirementId": "R26-05-002",
      "requirementTitle": "Implementation of One-Time Cylinder Cost for Supplier & Material Combination"
    },
    {
      "zohoId": "MV-763",
      "requirementId": "R26-06-014",
      "requirementTitle": "Improving PO Visibility, ASN Controls, and Reporting in OTG"
    },
    {
      "zohoId": "MV-759",
      "requirementId": "R26-06-011",
      "requirementTitle": "NFA- Requirement"
    },
    {
      "zohoId": "MV-762",
      "requirementId": "R26-06-015",
      "requirementTitle": "NFA Requirement – (SBPL)"
    },
    {
      "zohoId": "FR1-T182",
      "requirementId": "R26-05-005",
      "requirementTitle": "Contract Excel Download Option & Pending Approval Dashboard Visibility"
    },
    {
      "zohoId": "MV-656",
      "requirementId": "R26-04-010",
      "requirementTitle": "OTG PP Bags Enhancement (Phase 1)"
    },
    {
      "zohoId": "MV-773",
      "requirementId": "R26-07-003",
      "requirementTitle": "Capture Auction Conducted Status with Mandatory Auction Result PDF Upload in NFA"
    },
    {
      "zohoId": "MV-770",
      "requirementId": "R26-07-006",
      "requirementTitle": "Enable Line Item-Level Bid Cancellation for Buyers in Auction"
    },
    {
      "zohoId": "MV-785",
      "requirementId": "R26-07-023",
      "requirementTitle": "Grouping of Multiple Contract RFQs/QCSs into a Single GQCS"
    },
    {
      "zohoId": "MV-808",
      "requirementId": "R26-08-012",
      "requirementTitle": "Material & Service in the Same Account"
    },
    {
      "zohoId": "MV-1100",
      "requirementId": "",
      "requirementTitle": "Auction Report Dashboard"
    }
  ],

  // Task Type Master
  taskTypeMaster: [
    "Project Analysis",
    "QA Queries",
    "Scrum",
    "Documentation Creation v1",
    "Documentation Creation v1++",
    "Kick-Off Meeting",
    "War Room Meeting",
    "ISO Audit",
    "Timesheet",
    "Development Queries",
    "UI Discussion",
    "UAT Testing",
    "Demo Meeting",
    "Retro Meeting",
    "Client Meeting",
    "Client Request",
    "Client Issue",
    "Module learning/Training",
    "Product Meeting",
    "Product Meeting Preparation",
    "New Project Priority & Discussion",
    "Support/Implementation Meeting",
    "Sales Meeting",
    "Fun Friday",
    "PMS",
    "Genie Issue",
    "VENDX Tasks",
    "Effort Estimation"
  ],

  // Exact 10 columns matching the Google Sheet specification
  columns: [
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

const STORAGE_KEY = "ai_timesheet_config_v1";

const ConfigManager = {
  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          spreadsheetId: parsed.spreadsheetId || DEFAULT_CONFIG.spreadsheetId,
          requirementMaster: Array.isArray(parsed.requirementMaster) && parsed.requirementMaster.length > 0 
            ? parsed.requirementMaster 
            : DEFAULT_CONFIG.requirementMaster,
          taskTypeMaster: Array.isArray(parsed.taskTypeMaster) && parsed.taskTypeMaster.length > 0 
            ? parsed.taskTypeMaster 
            : DEFAULT_CONFIG.taskTypeMaster
        };
      }
    } catch (e) {
      console.warn("Could not load stored config, using defaults:", e);
    }
    return { ...DEFAULT_CONFIG };
  },

  save(config) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      return true;
    } catch (e) {
      console.error("Failed to save config to localStorage:", e);
      return false;
    }
  },

  reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return { ...DEFAULT_CONFIG };
    } catch (e) {
      console.error("Failed to reset config:", e);
      return { ...DEFAULT_CONFIG };
    }
  },

  maskApiKey(key) {
    if (!key || key.length < 8) return key ? "••••••••" : "";
    return key.substring(0, 4) + "••••••••" + key.substring(key.length - 4);
  }
};

if (typeof window !== "undefined") {
  window.DEFAULT_CONFIG = DEFAULT_CONFIG;
  window.ConfigManager = ConfigManager;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { DEFAULT_CONFIG, ConfigManager };
}
