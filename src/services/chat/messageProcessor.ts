
import { Project } from '@/components/project/ProjectCard';
import { extractKeywords } from './extractKeywords';
import { searchProjectsByKeywords } from './projectFetcher';
import { findRelevantProjects } from './semanticSearch';
import { 
  isShowProjectsQuery, 
  isWorkRelatedQuery, 
  isAIQuery,
  isAIExperienceQuery,
  isSpecificProjectQuery
} from './query/queryClassification';
import { 
  handleAIProjectsQuery, 
  handlePortfolioQuery, 
  handleWorkRelatedQuery,
  sortProjectsByYear
} from './responses/projectResponses';
import { 
  generateContentBasedResponse, 
  generateProjectBasedResponse, 
  generateFallbackResponse,
  generateThoughtsResponse
} from './responses/contentResponses';
import { ContentEntry } from '../content/contentService';

// Import enhanced services
import { findRelevantContentEntriesEnhanced, analyzeQuery } from './search/enhancedContentSearch';
import { generateFocusedResponse, assessContentRelevance } from './responses/enhancedResponseGenerator';

// Persona short-circuit: answer identity/background questions from bundled
// knowledge, skipping vector search and embedding calls entirely.
import { matchesPersonaTopic, generatePersonaResponse } from './personaContext';
import { getWillbotRouteMode, type WillbotRouteMode } from './willbotPrompt';

export const classifyWillbotRequestMode = (userMessage: string): WillbotRouteMode =>
  getWillbotRouteMode(userMessage);

/**
 * Processes user messages with enhanced RAG pipeline and improved affirmative response handling.
 * Persona-matched queries are answered from the bundled knowledge base without RAG.
 */
export const processUserMessage = async (
  userMessage: string
): Promise<{
  content: string;
  projects?: Project[];
  showProjects?: boolean;
  contentEntries?: ContentEntry[];
  showContentEntries?: boolean;
  suggestions?: { text: string; delay: number }[];
}> => {
  // ── Persona short-circuit ──────────────────────────────────────────────────
  // Answers questions about Will's identity, background, and interests using
  // the bundled WILLBOT_PERSONA constant — no embeddings or vector search needed.
  if (matchesPersonaTopic(userMessage)) {
    const content = await generatePersonaResponse(userMessage);
    return { content };
  }

  // Check for the "What's been on your mind lately?" query
  if (userMessage.toLowerCase().includes("what's been on your mind lately") || 
      userMessage.toLowerCase().includes("what's on your mind") ||
      userMessage.toLowerCase().includes("on your mind lately")) {
    return await generateThoughtsResponse();
  }
  
  // PRIORITY: Check for explicit requests to see projects/portfolio/work (including "yes" responses)
  if (isShowProjectsQuery(userMessage)) {
    // Check if the query is specifically about AI
    if (isAIQuery(userMessage)) {
      return handleAIProjectsQuery(userMessage);
    }
    
    // General portfolio query - this should handle "yes" responses to portfolio suggestions
    return handlePortfolioQuery();
  }
  
  if (classifyWillbotRequestMode(userMessage) === 'prompt') {
    const content = await generatePersonaResponse(userMessage);
    return { content };
  }

  // Analyze the query to determine search strategy
  const queryAnalysis = analyzeQuery(userMessage);

  // Check if user is asking about a specific project (like Project Ariadne)
  if (isSpecificProjectQuery(userMessage)) {
    // Use enhanced search for project-related queries
    const contentEntries = await findRelevantContentEntriesEnhanced(userMessage, {
      threshold: 0.35,
      limit: 2,
      prioritizeTypes: ['project', 'thoughts', 'research'],
      requireMinScore: true
    });
    
    if (contentEntries && contentEntries.length > 0) {
      // Assess relevance and generate focused response
      const relevanceAssessment = assessContentRelevance(userMessage, contentEntries);
      
      if (relevanceAssessment.isHighlyRelevant) {
        return await generateFocusedResponse(userMessage, contentEntries);
      }
      
      // Fallback to traditional content-based response for lower relevance
      return generateContentBasedResponse(userMessage, contentEntries);
    }
    
    // If no content found, search projects directly
    const semanticResults = await findRelevantProjects(userMessage);
    if (semanticResults.projects && semanticResults.projects.length > 0) {
      return generateProjectBasedResponse(userMessage, semanticResults.projects);
    }
  }
  
  // Check if this is a direct query about AI experience
  if (isAIExperienceQuery(userMessage)) {
    return handleAIProjectsQuery(userMessage);
  }
  
  // Use enhanced content search for all other queries
  const searchOptions = {
    threshold: queryAnalysis.searchStrategy === 'focused' ? 0.4 : 0.25, // Lowered threshold
    limit: queryAnalysis.searchStrategy === 'focused' ? 2 : 3,
    prioritizeTypes: queryAnalysis.suggestedTypes,
    requireMinScore: queryAnalysis.isSpecific
  };
  
  const contentEntries = await findRelevantContentEntriesEnhanced(userMessage, searchOptions);
  
  if (contentEntries && contentEntries.length > 0) {
    // Assess content relevance
    const relevanceAssessment = assessContentRelevance(userMessage, contentEntries);
    
    if (relevanceAssessment.isHighlyRelevant || queryAnalysis.isSpecific) {
      return await generateFocusedResponse(userMessage, contentEntries);
    }
    
    // Use traditional response for broader queries
    return generateContentBasedResponse(
      userMessage, 
      contentEntries, 
      isAIQuery(userMessage)
    );
  }
  
  // If no content entries found, try to find relevant projects
  const semanticResults = await findRelevantProjects(userMessage);
  
  // Check if the semantic search returned actual relevant projects (not fallback)
  if (semanticResults.projects && 
      semanticResults.projects.length > 0 && 
      semanticResults.relevanceScore > 0.25) { // Lowered threshold
    semanticResults.projects = sortProjectsByYear(semanticResults.projects);
    return {
      content: semanticResults.content,
      projects: semanticResults.projects,
      showProjects: true
    };
  }
  
  // Extract potential keywords from the message for additional search
  const potentialKeywords = extractKeywords(userMessage);
  if (potentialKeywords.length > 0) {
    // Try direct keyword search for projects
    const keywordMatchedProjects = await searchProjectsByKeywords(potentialKeywords);
    if (keywordMatchedProjects.length > 0) {
      const sortedProjects = sortProjectsByYear(keywordMatchedProjects);
      return {
        content: `I found some projects related to "${potentialKeywords.join(', ')}" that might interest you:`,
        projects: sortedProjects,
        showProjects: true
      };
    }
  }
  
  // Special handling for AI-related queries that didn't match content
  // but are clearly asking about AI experience
  if (isAIExperienceQuery(userMessage)) {
    return handleAIProjectsQuery(userMessage);
  }
  
  // If this is a work-related query and we've found no matches, 
  // provide a response with suggestion to show projects
  if (isWorkRelatedQuery(userMessage)) {
    return handleWorkRelatedQuery();
  }
  
  // For general questions that don't match any content or keywords,
  // and aren't explicitly work-related, don't show projects but offer a suggestion
  return generateFallbackResponse();
};
