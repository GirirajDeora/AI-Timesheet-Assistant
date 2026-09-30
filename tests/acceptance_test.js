/**
 * =========================================================================
 * AI Timesheet Assistant - Automated Acceptance & Unit Test Suite
 * =========================================================================
 * Run with Node.js: node tests/acceptance_test.js
 */

const { DEFAULT_CONFIG } = require("../js/config.js");
const { Validation } = require("../js/validation.js");
const { BuiltinSmartParser } = require("../services/ai/aiProvider.js");
const { AiService } = require("../js/ai.js");

// Mock window globals for node environment
global.window = {
  Validation: Validation,
  BuiltinSmartParser: BuiltinSmartParser,
  AiService: AiService,
  createAiProvider: (config) => new BuiltinSmartParser(config)
};

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✕ FAIL: ${message}`);
    failed++;
  }
}

console.log("\n=======================================================");
console.log("RUNNING AI TIMESHEET ASSISTANT TEST SUITE");
console.log("=======================================================\n");

// -----------------------------------------------------------------
// Test 1: Time Conversion Unit Tests (Section 6)
// -----------------------------------------------------------------
console.log("Test Suite 1: Natural Time Expressions");
assert(Validation.parseNaturalTime("2 hours") === 2, "'2 hours' -> 2");
assert(Validation.parseNaturalTime("two and a half hours") === 2.5, "'two and a half hours' -> 2.5");
assert(Validation.parseNaturalTime("30 minutes") === 0.5, "'30 minutes' -> 0.5");
assert(Validation.parseNaturalTime("15 minutes") === 0.25, "'15 minutes' -> 0.25");
assert(Validation.parseNaturalTime("45 minutes") === 0.75, "'45 minutes' -> 0.75");
assert(Validation.parseNaturalTime("about 3 hours") === 3, "'about 3 hours' -> 3");
assert(Validation.parseNaturalTime("half an hour") === 0.5, "'half an hour' -> 0.5");
assert(Validation.parseNaturalTime("1 hour 15 minutes") === 1.25, "'1 hour 15 minutes' -> 1.25");

// -----------------------------------------------------------------
// Test 2: Requirement Master Resolution (Section 4)
// -----------------------------------------------------------------
console.log("\nTest Suite 2: Requirement Master Resolution");
const reqMaster = DEFAULT_CONFIG.requirementMaster;

const match1 = Validation.resolveRequirement("I worked on MV-703", reqMaster);
assert(match1 && match1.match && match1.match.zohoId === "MV-703", "Resolves Zoho ID MV-703");
assert(match1.match.requirementId === "R26-04-018", "MV-703 maps to Requirement ID R26-04-018");
assert(match1.match.requirementTitle.includes("PP bags"), "MV-703 maps to 'OTG PP bags enhancement (Phase 2)'");

const match2 = Validation.resolveRequirement("worked on PP bags enhancement", reqMaster);
assert(match2 && match2.match && match2.match.zohoId === "MV-703", "Fuzzy search resolves 'PP bags enhancement' to MV-703");

const match3 = Validation.resolveRequirement("MV-356", reqMaster);
assert(match3 && match3.match && match3.match.requirementTitle === "Q Plus Tech Upgrade", "Resolves MV-356 to 'Q Plus Tech Upgrade'");

// -----------------------------------------------------------------
// Test 3: Task Type Recognition (Section 5)
// -----------------------------------------------------------------
console.log("\nTest Suite 3: Task Type Recognition");
const taskMaster = DEFAULT_CONFIG.taskTypeMaster;

assert(Validation.detectTaskType("Daily Scrum", taskMaster) === "Scrum", "'Daily Scrum' -> Scrum");
assert(Validation.detectTaskType("I worked on QA queries", taskMaster) === "QA Queries", "'QA queries' -> QA Queries");
assert(Validation.detectTaskType("analyzing the VPD requirements", taskMaster) === "Project Analysis", "'analyzing the VPD requirements' -> Project Analysis");
assert(Validation.detectTaskType("I prepared the BRS", taskMaster).includes("Documentation Creation"), "'prepared the BRS' -> Documentation Creation");
assert(Validation.detectTaskType("attended client meeting", taskMaster) === "Client Meeting", "'client meeting' -> Client Meeting");

// -----------------------------------------------------------------
// Test 4: Gen AI Usage Detection (Section 8)
// -----------------------------------------------------------------
console.log("\nTest Suite 4: Gen AI Usage Detection");
assert(Validation.detectGenAiUsage("I used ChatGPT to prepare the BRS") === "Yes", "Detects ChatGPT as Gen AI: Yes");
assert(Validation.detectGenAiUsage("I manually analyzed the requirement") === "No", "Detects manual work as Gen AI: No");
assert(Validation.detectGenAiUsage("I worked on the requirement") === "No", "Does not invent AI usage if not mentioned");

// -----------------------------------------------------------------
// Test 5: Duplicate Protection (Section 20)
// -----------------------------------------------------------------
console.log("\nTest Suite 5: Duplicate Protection");
const existingEntries = [
  {
    date: "30/09/2026",
    taskType: "Project Analysis",
    task: "VPD analysis",
    zohoId: "MV-703"
  }
];

const dupCandidate = {
  date: "30/09/2026",
  taskType: "Project Analysis",
  task: "VPD analysis",
  zohoId: "MV-703"
};

const nonDupCandidate = {
  date: "30/09/2026",
  taskType: "QA Queries",
  task: "Q Plus QA queries",
  zohoId: "MV-356"
};

assert(Validation.checkDuplicate(dupCandidate, existingEntries).isDuplicate === true, "Flags identical entry as duplicate");
assert(Validation.checkDuplicate(nonDupCandidate, existingEntries).isDuplicate === false, "Allows different entry as non-duplicate");

// -----------------------------------------------------------------
// Test 6: FINAL ACCEPTANCE TEST (Section 31)
// -----------------------------------------------------------------
console.log("\nTest Suite 6: FINAL ACCEPTANCE TEST (Section 31)");
console.log("Input prompt: 'Today I worked on MV-703 for about two hours doing VPD analysis. Then I spent one hour on MV-356 handling Q Plus QA queries. I also attended Scrum for 15 minutes. I used ChatGPT while preparing the analysis.'");

async function runAcceptanceTest() {
  const input = "Today I worked on MV-703 for about two hours doing VPD analysis. Then I spent one hour on MV-356 handling Q Plus QA queries. I also attended Scrum for 15 minutes. I used ChatGPT while preparing the analysis.";

  const result = await AiService.analyzeWork(input, DEFAULT_CONFIG);

  assert(result.needsClarification === false, "AI parsed successfully without needing clarification");
  assert(result.entries.length === 3, `Extracted exactly 3 entries (got ${result.entries.length})`);
  assert(result.totalHours === 3.25, `Total hours equal 3.25 (got ${result.totalHours})`);

  // Verify Entry 1
  const entry1 = result.entries[0];
  console.log("\n  Checking Entry 1 (MV-703):");
  assert(entry1.taskType === "Project Analysis", `Entry 1 Task Type: 'Project Analysis' (got '${entry1.taskType}')`);
  assert(entry1.task.toLowerCase().includes("vpd"), `Entry 1 Task: contains 'VPD' (got '${entry1.task}')`);
  assert(entry1.timeHours === 2, `Entry 1 Time: 2 hrs (got ${entry1.timeHours})`);
  assert(entry1.zohoId === "MV-703", `Entry 1 Zoho ID: 'MV-703' (got '${entry1.zohoId}')`);
  assert(entry1.requirementId === "R26-04-018", `Entry 1 Requirement ID: 'R26-04-018' (got '${entry1.requirementId}')`);
  assert(entry1.requirementTitle.includes("OTG PP bags enhancement"), `Entry 1 Title matches Requirement Master (got '${entry1.requirementTitle}')`);
  assert(entry1.genAIUsage === "Yes", `Entry 1 Gen AI Usage: 'Yes' (got '${entry1.genAIUsage}')`);

  // Verify Entry 2
  const entry2 = result.entries[1];
  console.log("\n  Checking Entry 2 (MV-356):");
  assert(entry2.taskType === "QA Queries", `Entry 2 Task Type: 'QA Queries' (got '${entry2.taskType}')`);
  assert(entry2.timeHours === 1, `Entry 2 Time: 1 hr (got ${entry2.timeHours})`);
  assert(entry2.zohoId === "MV-356", `Entry 2 Zoho ID: 'MV-356' (got '${entry2.zohoId}')`);
  assert(entry2.requirementId === "R26-04-019", `Entry 2 Requirement ID: 'R26-04-019' (got '${entry2.requirementId}')`);
  assert(entry2.requirementTitle.includes("Q Plus Tech Upgrade"), `Entry 2 Title matches Requirement Master (got '${entry2.requirementTitle}')`);

  // Verify Entry 3
  const entry3 = result.entries[2];
  console.log("\n  Checking Entry 3 (Scrum):");
  assert(entry3.taskType === "Scrum", `Entry 3 Task Type: 'Scrum' (got '${entry3.taskType}')`);
  assert(entry3.timeHours === 0.25, `Entry 3 Time: 0.25 hrs (15 mins) (got ${entry3.timeHours})`);

  // -----------------------------------------------------------------
  // Test 7: SECTION 1 USER STORY TEST (5.25 hours)
  // -----------------------------------------------------------------
  console.log("\nTest Suite 7: SECTION 1 USER STORY TEST (5.25 hours)");
  const inputSection1 = "Today I worked on MV-703 for around three hours. I was analyzing the VPD requirements. Then I spent about two hours working on the auction report dashboard. I also had Scrum for 15 minutes.";
  const result1 = await AiService.analyzeWork(inputSection1, DEFAULT_CONFIG);
  assert(result1.entries.length === 3, `Section 1 story extracted 3 entries (got ${result1.entries.length})`);
  assert(result1.totalHours === 5.25, `Section 1 story total hours equal 5.25 (got ${result1.totalHours})`);
  assert(result1.entries[0].timeHours === 3, "Entry 1 is 3 hrs");
  assert(result1.entries[1].zohoId === "MV-1100" || result1.entries[1].task.includes("auction report"), "Entry 2 maps to auction report");
  assert(result1.entries[1].timeHours === 2, "Entry 2 is 2 hrs");
  assert(result1.entries[2].timeHours === 0.25, "Entry 3 (Scrum) is 0.25 hrs");

  console.log("\n=======================================================");
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runAcceptanceTest();
