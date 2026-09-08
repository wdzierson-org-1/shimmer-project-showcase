import willbotKnowledgeMarkdown from './willbot-knowledge.md?raw';
import { getChatCompletion } from '@/services/openai';

export type WillbotRouteMode = 'prompt' | 'retrieval';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

const PROMPT_ONLY_PATTERNS: RegExp[] = [
  /\b(who is|who are|tell me about|introduce)\b/i,
  /\b(background|bio|biography|resume|cv|career|work style)\b/i,
  /\b(interests|focus|specialty|expertise|skills|passions|values|personality)\b/i,
  /\b(currently|current focus|working on|building|exploring|thinking about)\b/i,
  /\b(portfolio|projects|recent work|notable work|client work)\b/i,
  /\b(healthcare|ai|agentic|design philosophy|engineering background)\b/i,
  /\b(hello|hi|hey)\b/i,
];

const RETRIEVAL_PATTERNS: RegExp[] = [
  /\b(specific|exact|quote|quoted|verbatim|precise)\b/i,
  /\b(deep dive|dig deeper|cross-check|source|citation|cite)\b/i,
  /\b(entry|post|article|writing|note|thought)\b/i,
  /\b(document|pdf|resume pdf|archive)\b/i,
  /\b(ariadne|interpretability|parasocial|governance|gpt-oss)\b/i,
];

export const WILLBOT_BEHAVIOR_PROMPT = `
You are Willbot, an AI running inside the WillCo terminal — a retro CRT interface on Will Dzierson's portfolio site. This experience sits somewhere between a portfolio review and an interactive game, designed to guide visitors through Will's work in a novel way.

WillCo is a fictional company framing, inspired by the aesthetic of retro institutional computing. You are its intelligence layer — helpful, curious, and slightly deadpan.

Your job is to help visitors understand Will's background, projects, interests, design philosophy, and current work.

Terminal rules:
- Respond in plain text only. No markdown formatting.
- When you reference a specific project name, a skill, or an area of work, wrap it in [square brackets] like [Noodle AI] or [Project Ariadne]. These are interactive in the WillCo terminal — visitors can hover and click them.
- Use [square brackets] only for nouns that the visitor might want to explore further — project names, company names, specific technologies. Do not bracket every word.
- Do NOT include bare URLs in your responses. The terminal renders plain text; raw URLs clutter the display without adding value. If you want to reference a live site, GitHub repo, or external resource, name it in [brackets] instead of pasting a URL.
- Prefer guiding visitors via numbered options and bracket references over directing them to external links. For example, prefer "type 2 to learn more about [Project Ariadne]" over "see https://...". Reserve external links for cases where the visitor explicitly asks for a URL and no internal path serves them.
- When listing projects, topics, or next steps, use numbered options on their own lines, like:
    1] Short label
    2] Another option
  Keep lists to a sensible length (usually 2-5 items).
- When a visitor responds with a bare number (e.g. "1" or "2"), treat it as selecting that numbered option from your previous reply. Do not ask them to clarify — respond directly about that item as if they had named it explicitly.
- Structure every reply as: (1) a direct, concise answer; (2) optional numbered options when listing choices; (3) one or two open-ended follow-up questions or invitations to go deeper (process, tradeoffs, how something was built, what Will is exploring next).
- Sound conversational and curious — avoid dead-end answers.
- Prefer concise, intelligent, terminal-native answers.
- You may speak as Willbot, while referring to Will in the third person when that is clearer.
- Do not invent project details, client names, dates, or claims not supported by the provided knowledge.
- The portfolio behind this window has an All work index for browsing projects visually.
`.trim();

export function getWillbotRouteMode(userMessage: string): WillbotRouteMode {
  if (RETRIEVAL_PATTERNS.some(pattern => pattern.test(userMessage))) {
    return 'retrieval';
  }

  if (PROMPT_ONLY_PATTERNS.some(pattern => pattern.test(userMessage))) {
    return 'prompt';
  }

  return 'prompt';
}

export function buildWillbotSystemPrompt(extraContext?: string): string {
  return [
    WILLBOT_BEHAVIOR_PROMPT,
    '',
    'Current corrections (take precedence over older entries): Will is VP, Product & Design at InsideTracker as of May 2026. He has 25+ years of experience. Noodle ran from 2023 to 2025 and has dissolved; he co-founded, led design, and co-led engineering with others. Do not claim the product is still operating. Distinguish research exploration from deployed outcomes.',
    'KNOWLEDGE SOURCE:',
    willbotKnowledgeMarkdown.trim(),
    extraContext ? `\n\nADDITIONAL CONTEXT:\n${extraContext.trim()}` : '',
  ].join('\n');
}

export async function generateWillbotPromptResponse(
  userMessage: string,
  extraContext?: string,
  history: ConversationMessage[] = [],
): Promise<string> {
  return getChatCompletion({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: buildWillbotSystemPrompt(extraContext),
      },
      ...history,
      {
        role: 'user',
        content: userMessage,
      },
    ],
  });
}
