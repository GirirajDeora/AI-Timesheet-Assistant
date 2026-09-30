/**
 * =========================================================================
 * AI Timesheet Assistant - System Prompt Builder & AI Service Orchestrator
 * =========================================================================
 */

const AiService = {
  /**
   * Generates the system prompt embedding active master data
   */
  buildSystemPrompt(config) {
    const todayFormatted = window.Validation 
      ? window.Validation.parseNaturalDate("today", config.dateFormat || "DD/MM/YYYY") 
      : "30/09/2026";
    
    const reqMasterStr = JSON.stringify(config.requirementMaster || [], null, 2);
    const taskMasterStr = JSON.stringify(config.taskTypeMaster || [], null, 2);

    return `You are an expert AI Timesheet Assistant.
Your job is to listen to the user describe their day's work in natural language and convert it into structured timesheet entries.

TODAY'S DATE: ${todayFormatted} (format: ${config.dateFormat || "DD/MM/YYYY"})

ACTIVE REQUIREMENT MASTER:
${reqMasterStr}

ACTIVE TASK TYPE MASTER:
${taskMasterStr}

CRITICAL RULES:
1. Parse multiple activities if the user mentions more than one task (e.g. "I worked on MV-703 for 2 hours, then MV-356 for 1 hour, and had Scrum for 15 mins").
2. Time (hrs) MUST be a decimal number (e.g. "15 minutes" -> 0.25, "30 minutes" -> 0.5, "45 minutes" -> 0.75, "2 hours" -> 2, "2 and a half hours" -> 2.5). Never output strings like "2h" or "15m".
3. Project Matching: Look up Zoho ID (e.g., MV-703) or Requirement Title keywords in the Requirement Master.
   - If found, retrieve the exact "requirementId", "zohoId", and "requirementTitle".
   - NEVER invent or fabricate Requirement IDs, Zoho IDs, or titles!
   - If not found or general work (like Scrum or internal meetings), leave requirementId, zohoId, and requirementTitle as empty strings ("").
4. Task Type: Map the activity to the best matching entry from the Task Type Master (e.g., "Scrum", "Project Analysis", "QA Queries", "Documentation Creation").
5. Gen AI Usage: Infer whether Generative AI tools (e.g. ChatGPT, Claude, Gemini, Copilot) were used for that task.
   - Output "Yes" if mentioned.
   - Output "No" if not used or manually done. Do NOT invent AI usage.
6. Date: Use today's date (${todayFormatted}) unless the user explicitly mentions another date (e.g. "yesterday", "on Monday"). Format as ${config.dateFormat || "DD/MM/YYYY"}.
7. Ambiguity / Clarification:
   - If the user provides no time or the project is completely unclear, set "needsClarification": true and provide a helpful, concise "clarificationQuestion".
   - If sufficient information is provided, set "needsClarification": false and output the entries array.
8. Output Format: Return STRICT JSON matching this schema ONLY:
{
  "needsClarification": false,
  "clarificationQuestion": "",
  "entries": [
    {
      "date": "${todayFormatted}",
      "taskType": "Project Analysis",
      "task": "VPD analysis",
      "subTask": "",
      "genAIUsage": "No",
      "timeHours": 2,
      "description": "",
      "requirementId": "R26-04-018",
      "zohoId": "MV-703",
      "requirementTitle": "OTG PP bags enhancement (Phase 2)"
    }
  ],
  "totalHours": 2
}`;
  },

  /**
   * Main entry point to analyze user speech/text
   */
  async analyzeWork(userInput, config) {
    if (!userInput || userInput.trim() === "") {
      throw new Error("Please speak or enter what you worked on today.");
    }

    const provider = window.createAiProvider ? window.createAiProvider(config) : new window.BuiltinSmartParser(config);
    const systemPrompt = this.buildSystemPrompt(config);

    const context = {
      systemPrompt: systemPrompt,
      requirementMaster: config.requirementMaster || [],
      taskTypeMaster: config.taskTypeMaster || [],
      currentDate: window.Validation ? window.Validation.parseNaturalDate("today", config.dateFormat) : "30/09/2026"
    };

    let rawResult;
    try {
      rawResult = await provider.parse(userInput, context);
    } catch (err) {
      console.warn("Primary AI provider failed, attempting fallback parser:", err);
      // Seamless fallback to BuiltinSmartParser so user experience never fails
      const fallbackParser = new window.BuiltinSmartParser(config);
      rawResult = await fallbackParser.parse(userInput, context);
    }

    return this.normalizeAiResponse(rawResult, config);
  },

  /**
   * Validates and cleans up the AI response structure
   */
  normalizeAiResponse(response, config) {
    if (!response || typeof response !== "object") {
      throw new Error("Invalid response format received from AI.");
    }

    if (response.needsClarification && response.clarificationQuestion) {
      return {
        needsClarification: true,
        clarificationQuestion: response.clarificationQuestion,
        entries: [],
        totalHours: 0
      };
    }

    const rawEntries = Array.isArray(response.entries) ? response.entries : [];
    const normalizedEntries = [];
    let calculatedTotal = 0;

    const defaultDate = window.Validation 
      ? window.Validation.parseNaturalDate("today", config.dateFormat || "DD/MM/YYYY") 
      : "30/09/2026";

    for (let i = 0; i < rawEntries.length; i++) {
      const item = rawEntries[i];
      
      // Time conversion
      let timeVal = 0;
      if (typeof item.timeHours === "number") {
        timeVal = item.timeHours;
      } else if (item.timeHours !== undefined || item.time !== undefined) {
        timeVal = window.Validation ? window.Validation.parseNaturalTime(item.timeHours || item.time) : parseFloat(item.timeHours || item.time || 0);
      }
      timeVal = Math.round(timeVal * 100) / 100;
      calculatedTotal += timeVal;

      // Project resolution check if IDs are missing
      let zohoId = item.zohoId || "";
      let requirementId = item.requirementId || "";
      let requirementTitle = item.requirementTitle || "";

      if ((!zohoId || !requirementId) && (item.task || item.description)) {
        const lookup = window.Validation ? window.Validation.resolveRequirement(`${item.task} ${item.description}`, config.requirementMaster) : null;
        if (lookup && lookup.match) {
          zohoId = zohoId || lookup.match.zohoId || "";
          requirementId = requirementId || lookup.match.requirementId || "";
          requirementTitle = requirementTitle || lookup.match.requirementTitle || "";
        }
      }

      // Gen AI usage normalization
      let genAi = item.genAIUsage || item.genAiUsage || item.genAI || config.defaultGenAiValue || "No";
      if (typeof genAi === "boolean") {
        genAi = genAi ? "Yes" : "No";
      }

      normalizedEntries.push({
        id: "entry_" + Date.now() + "_" + i,
        date: item.date || defaultDate,
        taskType: item.taskType || "Project Analysis",
        task: item.task || "",
        subTask: item.subTask || "",
        genAIUsage: genAi,
        timeHours: timeVal,
        description: item.description || "",
        requirementId: requirementId,
        zohoId: zohoId,
        requirementTitle: requirementTitle
      });
    }

    return {
      needsClarification: false,
      clarificationQuestion: "",
      entries: normalizedEntries,
      totalHours: Math.round(calculatedTotal * 100) / 100
    };
  }
};

if (typeof window !== "undefined") {
  window.AiService = AiService;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { AiService };
}
