
import { ContentEntry } from '@/services/content/contentService';
import { getChatCompletion } from '@/services/openai';
import { Project } from '@/components/project/ProjectCard';
import { buildWillbotSystemPrompt, ConversationMessage } from '../willbotPrompt';

/**
 * Generates more focused responses based on content analysis
 */
export const generateFocusedResponse = async (
  userMessage: string,
  contentEntries: ContentEntry[],
  projects?: Project[],
  history: ConversationMessage[] = []
): Promise<{
  content: string;
  contentEntries?: ContentEntry[];
  showContentEntries?: boolean;
  projects?: Project[];
  showProjects?: boolean;
}> => {
  console.log('Generating focused response for:', userMessage);
  
  if (!contentEntries || contentEntries.length === 0) {
    return {
      content: "I don't have specific information about that. Would you like to explore my portfolio or ask about something else?",
      showContentEntries: false,
      showProjects: false
    };
  }
  
  // Analyze content to determine the best approach
  const primaryContent = contentEntries[0];
  const hasMultipleRelevantEntries = contentEntries.length > 1;
  
  // Create a focused context from the most relevant content
  const context = contentEntries
    .slice(0, 2) // Only use top 2 most relevant entries
    .map(entry => {
      // Include type and title for better context
      return `[${entry.type.toUpperCase()}] "${entry.title}": ${entry.content}`;
    })
    .join('\n\n');
  
  console.log('Generating AI response with focused context');
  
  // Create a more specific system prompt based on content type
  let systemPrompt = `Answer the user's question using the provided information. Be concise and directly address their question.`;
  
  if (primaryContent.type === 'thoughts') {
    systemPrompt += ` The user is asking about thoughts and insights. Provide a thoughtful, personal response.`;
  } else if (primaryContent.type === 'project') {
    systemPrompt += ` The user is asking about project work. Focus on the specific project details and outcomes.`;
  } else if (primaryContent.type === 'research') {
    systemPrompt += ` The user is asking about research. Provide an informative, evidence-based response.`;
  }
  
  systemPrompt += `\n\nRetrieved context:\n${context}`;
  
  const aiResponse = await getChatCompletion({
    messages: [
      {
        role: 'system',
        content: buildWillbotSystemPrompt(systemPrompt)
      },
      ...history,
      {
        role: 'user',
        content: userMessage
      }
    ],
    model: 'gpt-4o-mini'
  });
  
  // Determine what to show based on content relevance
  const shouldShowContent = contentEntries.length <= 2; // Only show if highly focused
  const shouldShowProjects = projects && projects.length > 0 && 
    contentEntries.some(entry => entry.type === 'project' || entry.content.toLowerCase().includes('project'));
  
  return {
    content: aiResponse,
    contentEntries: shouldShowContent ? contentEntries : undefined,
    showContentEntries: shouldShowContent,
    projects: shouldShowProjects ? projects : undefined,
    showProjects: shouldShowProjects || false
  };
};

/**
 * Determines if content entries are highly relevant to the query
 */
export const assessContentRelevance = (
  userMessage: string,
  contentEntries: ContentEntry[]
): {
  isHighlyRelevant: boolean;
  relevanceScore: number;
  primaryTopic: string | null;
} => {
  if (!contentEntries || contentEntries.length === 0) {
    return { isHighlyRelevant: false, relevanceScore: 0, primaryTopic: null };
  }
  
  const message = userMessage.toLowerCase();
  const primaryContent = contentEntries[0];
  
  // Check for direct keyword matches in the primary content
  const contentWords = primaryContent.content.toLowerCase().split(/\s+/);
  const titleWords = primaryContent.title.toLowerCase().split(/\s+/);
  const messageWords = message.split(/\s+/).filter(word => word.length > 3); // Filter short words
  
  // Calculate keyword overlap
  const titleMatches = titleWords.filter(word => messageWords.includes(word)).length;
  const contentMatches = contentWords.filter(word => messageWords.includes(word)).length;
  
  const totalContentWords = contentWords.length + titleWords.length;
  const totalMatches = titleMatches * 2 + contentMatches; // Weight title matches more
  const relevanceScore = totalMatches / Math.max(totalContentWords * 0.1, 1);
  
  // Consider it highly relevant if:
  // 1. There are significant keyword matches
  // 2. The content type matches the query intent
  // 3. There's only one primary result (indicating focused match)
  const isHighlyRelevant = (
    relevanceScore > 0.1 && 
    (titleMatches > 0 || contentMatches > 2) &&
    contentEntries.length <= 2
  );
  
  // Extract primary topic from the most relevant content
  const primaryTopic = primaryContent.title || 
    primaryContent.content.split('.')[0].substring(0, 100);
  
  console.log(`Content relevance assessment: score=${relevanceScore}, highly relevant=${isHighlyRelevant}`);
  
  return {
    isHighlyRelevant,
    relevanceScore,
    primaryTopic
  };
};
