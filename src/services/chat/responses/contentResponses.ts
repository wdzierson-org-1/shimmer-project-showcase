
import { ContentEntry } from '@/services/content/contentService';
import { getChatCompletion } from '@/services/openai';
import { supabase } from '@/integrations/supabase/client';
import { Project } from '@/components/project/ProjectCard';
import { fetchProjects } from '../projectFetcher';
import { sortProjectsByYear } from './projectResponses';
import { buildWillbotSystemPrompt } from '../willbotPrompt';

/**
 * Generates response based on content entries found
 */
export const generateContentBasedResponse = async (
  userMessage: string,
  contentEntries: ContentEntry[],
  isAIQuery: boolean = false
): Promise<{
  content: string;
  contentEntries?: ContentEntry[];
  showContentEntries?: boolean;
  projects?: Project[];
  showProjects?: boolean;
}> => {
  console.log('Generating content-based response for:', userMessage);
  console.log('Content entries found:', contentEntries.length);
  
  // If the user is asking about a specific project mentioned in content
  if (userMessage.toLowerCase().includes('project ariadne') || 
      userMessage.toLowerCase().includes('ariadne') ||
      userMessage.toLowerCase().includes('more about it') ||
      userMessage.toLowerCase().includes('tell me more') ||
      userMessage.toLowerCase().includes('learn more')) {
    
    console.log('User asking about Project Ariadne specifically');
    
    // Try to find Project Ariadne in the projects database
    const allProjects = await fetchProjects();
    const ariadneProject = allProjects.find(project => 
      project.title.toLowerCase().includes('ariadne')
    );
    
    console.log('Found Ariadne project:', ariadneProject);
    
    if (ariadneProject) {
      const aiResponse = await getChatCompletion({
        messages: [
          {
            role: 'system',
            content: buildWillbotSystemPrompt(`The user is asking about Project Ariadne. Here's the project information: 
            Title: ${ariadneProject.title}
            Client: ${ariadneProject.client}
            Description: ${ariadneProject.description}
            Year: ${ariadneProject.year}
            Involvement: ${ariadneProject.involvement || 'Not specified'}
            Tags: ${ariadneProject.tags.join(', ')}
            ${ariadneProject.liveUrl ? `Live URL: ${ariadneProject.liveUrl}` : ''}
            
            Provide detailed information about this project based on the data above. Be informative and engaging.`)
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        model: 'gpt-4o-mini'
      });
      
      return {
        content: aiResponse,
        projects: [ariadneProject],
        showProjects: true
      };
    }
  }
  
  // Use relevant content entries to generate a response
  const context = contentEntries
    .map(entry => `[${entry.type}] ${entry.title}: ${entry.content}`)
    .join('\n\n');
    
  console.log('Generating AI response with context from content entries');
  
  const aiResponse = await getChatCompletion({
    messages: [
      {
        role: 'system',
        content: buildWillbotSystemPrompt(`Use the following retrieved information to answer the user's question concisely and helpfully:\n\n${context}`)
      },
      {
        role: 'user',
        content: userMessage
      }
    ],
    model: 'gpt-4o-mini'
  });
  
  return {
    content: aiResponse,
    contentEntries,
    showContentEntries: true
  };
};

/**
 * Generates response based on projects found
 */
export const generateProjectBasedResponse = async (
  userMessage: string,
  projects: Project[]
): Promise<{
  content: string;
  projects: Project[];
  showProjects: boolean;
}> => {
  const context = projects
    .map(project => `Project: ${project.title} by ${project.client} - ${project.description}`)
    .join('\n\n');
    
  const aiResponse = await getChatCompletion({
    messages: [
      {
        role: 'system',
        content: buildWillbotSystemPrompt(`Use the following retrieved project information to answer the user's question:\n\n${context}`)
      },
      {
        role: 'user',
        content: userMessage
      }
    ],
    model: 'gpt-4o-mini'
  });
  
  return {
    content: aiResponse,
    projects: sortProjectsByYear(projects),
    showProjects: true
  };
};

/**
 * Generates fallback response when no matches found
 */
export const generateFallbackResponse = (): {
  content: string;
  showProjects: boolean;
  suggestions: { text: string; delay: number }[];
} => {
  return {
    content: "I don't have specific information about that. Would you like to see Will's portfolio or ask about his work instead?",
    showProjects: false,
    suggestions: [{ text: "Show me your portfolio", delay: 500 }]
  };
};

/**
 * Generates response for "What's been on your mind lately?" query
 */
export const generateThoughtsResponse = async (): Promise<{
  content: string;
  contentEntries?: ContentEntry[];
  showContentEntries?: boolean;
}> => {
  console.log('Generating thoughts response - fetching recent thoughts');
  
  try {
    // First, let's check what types of content entries exist
    const { data: allTypesData, error: typesError } = await supabase
      .from('content_entries')
      .select('type')
      .eq('visible', true);
      
    if (typesError) {
      console.error('Error fetching content types:', typesError);
    } else {
      console.log('Available content types:', [...new Set(allTypesData?.map(item => item.type) || [])]);
    }
    
    // Try to fetch recent "thoughts" type content entries first
    const { data: initialThoughtsData, error: thoughtsError } = await supabase
      .from('content_entries')
      .select('*')
      .eq('type', 'thoughts')
      .eq('visible', true)
      .order('created_at', { ascending: false })
      .limit(5);
    let thoughtsData = initialThoughtsData;
      
    console.log('Thoughts query result:', { data: thoughtsData, error: thoughtsError });
    
    // If no "thoughts" found, try alternative type names
    if (!thoughtsData || thoughtsData.length === 0) {
      console.log('No "thoughts" found, trying alternative type names...');
      
      // Try "thought" (singular)
      const { data: thoughtData, error: thoughtError } = await supabase
        .from('content_entries')
        .select('*')
        .eq('type', 'thought')
        .eq('visible', true)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (thoughtData && thoughtData.length > 0) {
        thoughtsData = thoughtData;
        console.log('Found content with type "thought":', thoughtData.length);
      } else {
        // Try "note" or "notes"
        const { data: noteData, error: noteError } = await supabase
          .from('content_entries')
          .select('*')
          .ilike('type', '%note%')
          .eq('visible', true)
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (noteData && noteData.length > 0) {
          thoughtsData = noteData;
          console.log('Found content with note-type:', noteData.length);
        } else {
          // If still no match, get the most recent content entries regardless of type
          const { data: recentData, error: recentError } = await supabase
            .from('content_entries')
            .select('*')
            .eq('visible', true)
            .order('created_at', { ascending: false })
            .limit(3);
            
          if (recentData && recentData.length > 0) {
            thoughtsData = recentData;
            console.log('Found recent content entries (any type):', recentData.length);
          }
        }
      }
    }
      
    if (thoughtsError) {
      console.error('Error fetching thoughts:', thoughtsError);
      return {
        content: "I'd love to share what's been on my mind, but I'm having trouble accessing that information right now.",
        showContentEntries: false
      };
    }
    
    if (thoughtsData && thoughtsData.length > 0) {
      console.log(`Found ${thoughtsData.length} content entries for thoughts response`);
      return {
        content: "Here are some things that have been on my mind lately:",
        contentEntries: thoughtsData,
        showContentEntries: true
      };
    } else {
      console.log('No content entries found in database');
      return {
        content: "I haven't posted any recent thoughts, but feel free to ask me about my work or projects!",
        showContentEntries: false
      };
    }
  } catch (error) {
    console.error('Error in generateThoughtsResponse:', error);
    return {
      content: "I'd love to share what's been on my mind, but I'm having trouble accessing that information right now.",
      showContentEntries: false
    };
  }
};
