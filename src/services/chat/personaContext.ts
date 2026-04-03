import { generateWillbotPromptResponse } from './willbotPrompt';

// ── Topic matcher ─────────────────────────────────────────────────────────────
// These patterns cover questions that can be answered from WILLBOT_PERSONA alone,
// without querying vector search or project embeddings.
const PERSONA_PATTERNS: RegExp[] = [
  /who (is|are) (will|you|willbot)/i,
  /tell me about (will|yourself)/i,
  /what (do|does) will do/i,
  /where (has|have) (will|you) worked/i,
  /\b(background|bio|biography|career|resume|cv)\b/i,
  /\b(education|studied|degree|school|university)\b/i,
  /design.*(philosophy|approach|process|thinking|style)/i,
  /engineering.*(background|experience|skills)/i,
  /what (are|is|were) (your|will'?s?) (interests|focus|specialty|expertise|skills|passions)/i,
  /what.*(specializes?|expert|good at|known for)/i,
  /\b(personality|values|beliefs|approach to)\b/i,
  /current(ly)?.*(working|focused|building|interested)/i,
  /what.*(companies|clients|employers|worked with)/i,
  /describe (will|yourself)/i,
  /introduce (will|yourself)/i,
  /\bhello\b|\bhi\b|\bhey\b/i,
];

export const matchesPersonaTopic = (msg: string): boolean =>
  PERSONA_PATTERNS.some(r => r.test(msg));

// ── LLM response using persona context ───────────────────────────────────────
// Fast single-turn call: persona injected as system context, no vector search.
export const generatePersonaResponse = async (userMessage: string): Promise<string> => {
  return generateWillbotPromptResponse(userMessage);
};

// ── Shortcut response generators ─────────────────────────────────────────────
// Used by the 1/2/3 shortcuts in CRTHero. These call the LLM with a focused
// prompt so answers feel natural, not canned. No vector search involved.

export const generateShortcut1Response = async (): Promise<string> =>
  generateWillbotPromptResponse("Give me a concise summary of Will's most recent and notable work and projects.");

export const generateShortcut2Response = async (): Promise<string> =>
  generateWillbotPromptResponse("Describe Will's design and creative process — how he approaches problems, the role coding plays in his workflow, and what makes his process distinctive.");

export const generateShortcut3Response = async (): Promise<string> =>
  generateWillbotPromptResponse("What is Will currently working on or exploring? What are his in-flight projects and areas of focus?");
