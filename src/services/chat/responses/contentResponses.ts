
import { getChatCompletion } from '@/services/openai';
import { Project } from '@/components/project/ProjectCard';
import { supabase } from '@/integrations/supabase/client';
import { ContentEntry } from '@/services/content/contentService';

/**
 * Generates a response showing recent thoughts
 */
export const generateThoughtsResponse = async (): Promise<{
  content: string;
  contentEntries: ContentEntry[];
  showContentEntries: boolean;
}> => {
  console.log('Fetching recent thoughts content...');
  
  // Get thoughts from the content_entries table
  const { data: thoughtEntries, error } = await supabase
    .from('content_entries')
    .select('*')
    .eq('type', 'thought')
    .eq('visible', true)
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (error) {
    console.error('Error fetching thoughts:', error);
    return {
      content: "I seem to be having trouble retrieving my recent thoughts. Let me share something else with you instead.",
      contentEntries: [],
      showContentEntries: false
    };
  }
  
  if (!thoughtEntries || thoughtEntries.length === 0) {
    return {
      content: "I haven't added any specific thoughts yet, but I'm constantly exploring new ideas. Is there something specific you'd like to know about my work or interests?",
      contentEntries: [],
      showContentEntries: false
    };
  }
  
  console.log(`Found ${thoughtEntries.length} thought entries`);
  
  // Generate a numbered list of the thoughts as a teaser
  const thoughtsList = thoughtEntries
    .map((entry, index) => `${index + 1}) ${entry.title}`)
    .join(', ');
  
  return {
    content: `Lately, I've been thinking about: ${thoughtsList}. Feel free to click on any of these to read more:`,
    contentEntries: thoughtEntries,
    showContentEntries: true
  };
};

/**
 * Generates a response using relevant content entries
 */
export const generateContentBasedResponse = async (
  userMessage: string, 
  contentEntries: any[],
  hasAIQuery: boolean = false
): Promise<{
  content: string;
  showProjects: boolean;
  suggestions?: { text: string; delay: number }[];
}> => {
  console.log(`Found ${contentEntries.length} relevant content entries, prioritizing these`);
  
  // Format the content entries into a context string
  const context = contentEntries
    .map(entry => `[${entry.type}] ${entry.title}: ${entry.content}`)
    .join('\n\n');
    
  // Use gpt-4o-mini for better performance with content entries
  const aiResponse = await getChatCompletion({
    messages: [
      {
        role: 'system',
        content: `You are a helpful portfolio assistant. Use the following information to answer the user's question concisely: ${context}`
      },
      {
        role: 'user',
        content: userMessage
      }
    ],
    model: 'gpt-4o-mini' // Using the optimized model
  });
  
  // Determine if we should suggest showing projects as a follow-up
  // This is especially useful for questions about experience in certain areas
  let suggestions = [];
  
  if (hasAIQuery) {
    suggestions.push({ 
      text: "Show me AI-related projects", 
      delay: 500 
    });
  } else if (userMessage.toLowerCase().includes('experience') && 
    (userMessage.toLowerCase().includes('project') || userMessage.toLowerCase().includes('work'))) {
    suggestions.push({ 
      text: "Show me related projects", 
      delay: 500 
    });
  }
  
  return {
    content: aiResponse,
    showProjects: false,
    suggestions: suggestions.length > 0 ? suggestions : undefined
  };
};

/**
 * Generates a response using semantically similar projects
 */
export const generateProjectBasedResponse = async (
  userMessage: string, 
  similarProjects: any[], 
  projectsToDisplay: Project[]
): Promise<{
  content: string;
  projects: Project[];
  showProjects: boolean;
}> => {
  console.log(`Found ${projectsToDisplay.length} similar projects without content entries`);
  
  // Use OpenAI to generate a response based on the relevant projects
  const context = similarProjects
    .filter(p => p.content) // Only include projects with content
    .map(p => p.content)
    .join('\n\n');
    
  console.log('Generating AI response with context from similar projects');
  
  let aiResponse;
  if (context) {
    aiResponse = await getChatCompletion({
      messages: [
        {
          role: 'system',
          content: `You are a helpful portfolio assistant. Use the following project information to answer the user's question concisely: ${context}`
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      model: 'gpt-4o-mini'
    });
  } else {
    aiResponse = "I found some projects that might be relevant to your question:";
  }
  
  return {
    content: aiResponse,
    projects: projectsToDisplay,
    showProjects: true
  };
};

/**
 * Generates a fallback response when no relevant content is found
 */
export const generateFallbackResponse = (): {
  content: string;
  showProjects: boolean;
  suggestions: { text: string; delay: number }[];
} => {
  console.log('Query appears to be general knowledge, not showing projects');
  return {
    content: "I don't have specific information about that. Is there something about my work or projects you'd like to know?",
    showProjects: false,
    suggestions: [{ text: "What kind of work do you do?", delay: 500 }]
  };
};
