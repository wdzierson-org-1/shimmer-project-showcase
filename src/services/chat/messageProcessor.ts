
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

/**
 * Processes user messages with enhanced RAG pipeline
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
  console.log('Processing user message with enhanced pipeline:', userMessage);
  
  // Check for the "What's been on your mind lately?" query
  if (userMessage.toLowerCase().includes("what's been on your mind lately") || 
      userMessage.toLowerCase().includes("what's on your mind") ||
      userMessage.toLowerCase().includes("on your mind lately")) {
    return await generateThoughtsResponse();
  }
  
  // Analyze the query to determine search strategy
  const queryAnalysis = analyzeQuery(userMessage);
  console.log('Query analysis:', queryAnalysis);
  
  // Check if user is asking about a specific project (like Project Ariadne)
  if (isSpecificProjectQuery(userMessage)) {
    console.log('Detected specific project query');
    
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
        console.log('High relevance detected, generating focused response');
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
  
  // Check for explicit requests to see projects/portfolio/work
  if (isShowProjectsQuery(userMessage)) {
    // Check if the query is specifically about AI
    if (isAIQuery(userMessage)) {
      return handleAIProjectsQuery(userMessage);
    }
    
    // General portfolio query
    return handlePortfolioQuery();
  }
  
  // Check if this is a direct query about AI experience
  if (isAIExperienceQuery(userMessage)) {
    return handleAIProjectsQuery(userMessage);
  }
  
  // Use enhanced content search for all other queries
  console.log('Using enhanced content search for general query...');
  
  const searchOptions = {
    threshold: queryAnalysis.searchStrategy === 'focused' ? 0.4 : 0.3,
    limit: queryAnalysis.searchStrategy === 'focused' ? 2 : 3,
    prioritizeTypes: queryAnalysis.suggestedTypes,
    requireMinScore: queryAnalysis.isSpecific
  };
  
  const contentEntries = await findRelevantContentEntriesEnhanced(userMessage, searchOptions);
  
  if (contentEntries && contentEntries.length > 0) {
    console.log(`Found ${contentEntries.length} relevant content entries`);
    
    // Assess content relevance
    const relevanceAssessment = assessContentRelevance(userMessage, contentEntries);
    
    if (relevanceAssessment.isHighlyRelevant || queryAnalysis.isSpecific) {
      console.log('Generating focused response due to high relevance or specific query');
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
  console.log('No relevant content entries found, searching for projects...');
  const semanticResults = await findRelevantProjects(userMessage);
  
  // Check if the semantic search returned actual relevant projects (not fallback)
  if (semanticResults.projects && 
      semanticResults.projects.length > 0 && 
      semanticResults.relevanceScore > 0.3) {
    console.log('Found relevant projects via semantic search with good relevance score');
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
      console.log(`Found ${keywordMatchedProjects.length} projects matching keywords`);
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
