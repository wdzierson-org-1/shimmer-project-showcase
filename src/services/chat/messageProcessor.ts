
import { Project } from '@/components/project/ProjectCard';
import { extractKeywords } from './extractKeywords';
import { searchProjectsByKeywords } from './projectFetcher';
import { findRelevantProjects, findRelevantContentEntries } from './semanticSearch';
import { 
  isShowProjectsQuery, 
  isWorkRelatedQuery, 
  isAIQuery,
  isAIExperienceQuery 
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
import { supabase } from '@/integrations/supabase/client';
import { ContentEntry } from '../content/contentService';

/**
 * Processes user messages and returns appropriate responses with relevant projects
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
  console.log('Processing user message:', userMessage);
  
  // Check for the "What's been on your mind lately?" query
  if (userMessage.toLowerCase().includes("what's been on your mind lately") || 
      userMessage.toLowerCase().includes("what's on your mind") ||
      userMessage.toLowerCase().includes("on your mind lately")) {
    return await generateThoughtsResponse();
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
  
  // Try to use RAG to find relevant content entries first
  console.log('Searching for relevant content entries first...');
  const contentEntries = await findRelevantContentEntries(userMessage);
  
  if (contentEntries && contentEntries.length > 0) {
    // If we have content matches, use them to generate a response without showing projects
    // unless the content is specifically about projects
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
