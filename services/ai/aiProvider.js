/**
 * =========================================================================
 * AI Timesheet Assistant - AI Provider Abstraction
 * =========================================================================
 * 
 * Supports:
 *  - Google Gemini API (Direct client or via proxy)
 *  - OpenAI API (Direct client or via proxy)
 *  - Anthropic Claude API
 *  - Google Apps Script Secure Server Proxy
 *  - Built-in Smart Parser (Zero-key fallback rule engine)
 */

class BaseAiProvider {
  constructor(config = {}) {
    this.config = config;
  }

  async parse(prompt, context = {}) {
    throw new Error("parse() must be implemented by provider");
  }
}

/**
 * Google Gemini Provider
 */
class GeminiProvider extends BaseAiProvider {
  async parse(prompt, context = {}) {
    const apiKey = this.config.aiApiKey;
    if (!apiKey) {
      throw new Error("Gemini API key is required. Please add it in Settings.");
    }

    const model = this.config.aiModel || "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const systemInstruction = context.systemPrompt || "You are an AI timesheet assistant.";
    const fullPrompt = `${systemInstruction}\n\nUser Input:\n${prompt}`;

    const body = {
      contents: [
        {
          parts: [{ text: fullPrompt }]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
      throw new Error("No text returned by Gemini API.");
    }

    return JSON.parse(candidate);
  }
}

/**
 * OpenAI Provider
 */
class OpenAIProvider extends BaseAiProvider {
  async parse(prompt, context = {}) {
    const apiKey = this.config.aiApiKey;
    if (!apiKey) {
      throw new Error("OpenAI API key is required. Please add it in Settings.");
    }

    const model = this.config.aiModel || "gpt-4o-mini";
    const url = this.config.customEndpoint || "https://api.openai.com/v1/chat/completions";

    const systemInstruction = context.systemPrompt || "You are an AI timesheet assistant.";

    const body = {
      model: model,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No content returned by OpenAI API.");
    }

    return JSON.parse(content);
  }
}

/**
 * Anthropic Claude Provider
 */
class ClaudeProvider extends BaseAiProvider {
  async parse(prompt, context = {}) {
    const apiKey = this.config.aiApiKey;
    if (!apiKey) {
      throw new Error("Anthropic API key is required. Please add it in Settings.");
    }

    const model = this.config.aiModel || "claude-3-5-sonnet-20241022";
    const url = "https://api.anthropic.com/v1/messages";

    const systemInstruction = (context.systemPrompt || "") + 
      "\n\nIMPORTANT: Return ONLY valid JSON adhering to the specified schema, without any markdown formatting or introductory text.";

    const body = {
      model: model,
      max_tokens: 2048,
      temperature: 0.1,
      system: systemInstruction,
      messages: [
        { role: "user", content: prompt }
      ]
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "dangerously-allow-browser": "true"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text;
    if (!text) {
      throw new Error("No content returned by Claude API.");
    }

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleaned);
  }
}

/**
 * Google Apps Script Proxy Provider (Keeps API key secure on server)
 */
class AppsScriptProxyProvider extends BaseAiProvider {
  async parse(prompt, context = {}) {
    const url = this.config.appsScriptUrl;
    if (!url) {
      throw new Error("Google Apps Script Web App URL is required for proxy mode.");
    }

    const payload = {
      action: "proxyAi",
      provider: this.config.aiProvider || "gemini",
      model: this.config.aiModel || "gemini-1.5-flash",
      apiKey: this.config.aiApiKey || "",
      systemPrompt: context.systemPrompt || "",
      prompt: prompt
    };

    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Apps Script Proxy error (${response.status})`);
    }

    const res = await response.json();
    if (!res.success) {
      throw new Error(res.error || "Unknown Apps Script Proxy error");
    }

    if (res.rawResponse) {
      const parsed = typeof res.rawResponse === "string" ? JSON.parse(res.rawResponse) : res.rawResponse;
      // Handle Gemini structure if returned as raw
      if (parsed.candidates?.[0]?.content?.parts?.[0]?.text) {
        return JSON.parse(parsed.candidates[0].content.parts[0].text);
      }
      // Handle OpenAI structure if returned as raw
      if (parsed.choices?.[0]?.message?.content) {
        return JSON.parse(parsed.choices[0].message.content);
      }
      return parsed;
    }

    return res.data || res;
  }
}

/**
 * Built-in Smart Rule Engine (Zero-API-key local parser)
 * Ensures 100% functionality even when offline or before setting up API keys!
 */
class BuiltinSmartParser extends BaseAiProvider {
  async parse(userInput, context = {}) {
    const text = userInput.trim();
    const reqMaster = context.requirementMaster || [];
    const taskMaster = context.taskTypeMaster || [];
    const targetDate = context.currentDate || (window.Validation ? window.Validation.parseNaturalDate("today") : "30/09/2026");

    // Split compound sentences by markers ("then", "also", "and then", periods, semicolons)
    const sentences = text
      .split(/(?:\.|\;|\bthen\b|\band then\b|\balso\b)/i)
      .map(s => s.trim())
      .filter(s => s.length > 5);

    const entries = [];
    let detectedGenAiInGlobalText = window.Validation ? window.Validation.detectGenAiUsage(text) : "No";

    for (const segment of sentences) {
      // 1. Time parsing
      const timeHours = window.Validation ? window.Validation.parseNaturalTime(segment) : 0;
      if (timeHours <= 0 && !segment.toLowerCase().includes("scrum")) {
        // If segment has no time and is not scrum, check if it's descriptive of previous entry
        if (entries.length > 0 && (segment.toLowerCase().includes("chatgpt") || segment.toLowerCase().includes("ai"))) {
          entries[entries.length - 1].genAIUsage = "Yes";
        }
        continue;
      }

      // Special case for Scrum default time (15 mins = 0.25 if not specified)
      let resolvedTime = timeHours > 0 ? timeHours : (segment.toLowerCase().includes("scrum") ? 0.25 : 0);

      // 2. Requirement / Project lookup
      let zohoId = "";
      let requirementId = "";
      let requirementTitle = "";

      const reqResult = window.Validation ? window.Validation.resolveRequirement(segment, reqMaster) : null;
      if (reqResult && reqResult.match) {
        zohoId = reqResult.match.zohoId || "";
        requirementId = reqResult.match.requirementId || "";
        requirementTitle = reqResult.match.requirementTitle || "";
      }

      // 3. Task Type detection
      const taskType = window.Validation ? window.Validation.detectTaskType(segment, taskMaster) : "Project Analysis";

      // 4. Task description extraction
      let taskDesc = "";
      const segLower = segment.toLowerCase();
      if (segLower.includes("vpd") || segLower.includes("analysis")) {
        taskDesc = "VPD analysis";
      } else if (segLower.includes("auction report") || segLower.includes("dashboard")) {
        taskDesc = "Auction report dashboard";
      } else if (segLower.includes("qa") || segLower.includes("queries")) {
        taskDesc = "";
      } else if (taskType === "Scrum") {
        taskDesc = "";
      } else if (requirementTitle) {
        taskDesc = requirementTitle;
      }

      // 5. Gen AI detection
      let genAi = "No";
      if (window.Validation) {
        const segGenAi = window.Validation.detectGenAiUsage(segment);
        genAi = (segGenAi === "Yes" || (detectedGenAiInGlobalText === "Yes" && entries.length === 0)) ? "Yes" : "No";
      }

      entries.push({
        date: targetDate,
        taskType: taskType,
        task: taskDesc,
        subTask: "",
        genAIUsage: genAi,
        timeHours: resolvedTime,
        description: "",
        requirementId: requirementId,
        zohoId: zohoId,
        requirementTitle: requirementTitle
      });
    }

    // If no entries parsed, create single entry or ask clarification
    if (entries.length === 0) {
      return {
        needsClarification: true,
        clarificationQuestion: "I couldn't identify the specific task and time spent. Could you specify which project you worked on and for how long?",
        entries: [],
        totalHours: 0
      };
    }

    const totalHours = Math.round(entries.reduce((acc, e) => acc + (e.timeHours || 0), 0) * 100) / 100;

    return {
      needsClarification: false,
      clarificationQuestion: "",
      entries: entries,
      totalHours: totalHours
    };
  }
}

/**
 * Factory to instantiate the appropriate AI provider
 */
function createAiProvider(config) {
  const providerType = (config.aiProvider || "gemini").toLowerCase();

  // If user selected appsscript proxy
  if (providerType === "appsscript") {
    return new AppsScriptProxyProvider(config);
  }

  // If user has no API key and selected gemini/openai, fall back smoothly to smart parser or warn
  if (providerType === "builtin" || (!config.aiApiKey && providerType !== "appsscript")) {
    return new BuiltinSmartParser(config);
  }

  switch (providerType) {
    case "gemini":
      return new GeminiProvider(config);
    case "openai":
      return new OpenAIProvider(config);
    case "anthropic":
      return new ClaudeProvider(config);
    default:
      return new BuiltinSmartParser(config);
  }
}

if (typeof window !== "undefined") {
  window.BaseAiProvider = BaseAiProvider;
  window.GeminiProvider = GeminiProvider;
  window.OpenAIProvider = OpenAIProvider;
  window.ClaudeProvider = ClaudeProvider;
  window.AppsScriptProxyProvider = AppsScriptProxyProvider;
  window.BuiltinSmartParser = BuiltinSmartParser;
  window.createAiProvider = createAiProvider;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    BaseAiProvider,
    GeminiProvider,
    OpenAIProvider,
    ClaudeProvider,
    AppsScriptProxyProvider,
    BuiltinSmartParser,
    createAiProvider
  };
}
