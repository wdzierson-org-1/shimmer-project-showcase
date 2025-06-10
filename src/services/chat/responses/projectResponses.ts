
import { Project } from '@/components/project/ProjectCard';
import { fetchProjects } from '../projectFetcher';

/**
 * Sorts projects by year in descending order
 */
export const sortProjectsByYear = (projects: Project[]): Project[] => {
  return [...projects].sort((a, b) => {
    // Sort by year if available, otherwise use creation date
    const yearA = a.year || 0;
    const yearB = b.year || 0;
    return yearB - yearA; // Descending order (newest first)
  });
};

/**
 * Handles responses for AI-related project queries
 */
export const handleAIProjectsQuery = async (userMessage: string): Promise<{
  content: string;
  projects?: Project[];
  showProjects: boolean;
  suggestions?: { text: string; delay: number }[];
}> => {
  console.log('AI experience query detected, fetching AI projects directly');
  const allProjects = await fetchProjects();
  
  // Filter for AI projects
  const aiProjects = allProjects.filter(project => 
    project.title.toLowerCase().includes('ai') || 
    project.description.toLowerCase().includes('ai') ||
    project.description.toLowerCase().includes('artificial intelligence') ||
    project.tags.some(tag => tag.toLowerCase().includes('ai')));
  
  if (aiProjects.length > 0) {
    const sortedProjects = sortProjectsByYear(aiProjects);
    
    // If the query is "have you done" or similar, provide a detailed response and suggestion
    if (userMessage.toLowerCase().includes('have you') || userMessage.toLowerCase().includes('do you have')) {
      return {
        content: "Yes, I have experience with AI! Here are some of my AI-related projects:",
        projects: sortedProjects,
        showProjects: true
      };
    } else if (/show\s+(?:me\s+)?(?:recent\s+)?(?:work|projects?|portfolio|all)/i.test(userMessage.toLowerCase())) {
      // If it's a direct "show me" query, focus on presenting the projects
      return {
        content: "Here are my AI-related projects. Click on any of them to learn more:",
        projects: sortedProjects,
        showProjects: true
      };
    }
  }
  
  // If no AI projects found but it was an AI query, suggest showing all projects
  return {
    content: "I have some experience with AI, though my portfolio might not show specific AI-focused projects at the moment.",
    suggestions: [{ text: "Show me your portfolio anyway", delay: 500 }],
    showProjects: false
  };
};

/**
 * Handles responses for generic portfolio/project queries - IMPROVED for affirmative responses
 */
export const handlePortfolioQuery = async (): Promise<{
  content: string;
  projects: Project[];
  showProjects: boolean;
}> => {
  console.log('User is asking to see projects (including affirmative responses), fetching all projects');
  const projects = await fetchProjects();
  const sortedProjects = sortProjectsByYear(projects);
  console.log(`Fetched ${sortedProjects.length} projects for display`);
  
  return {
    content: "Here are some of my recent projects. Click on any of them to learn more:",
    showProjects: true,
    projects: sortedProjects
  };
};

/**
 * Handles responses for work-related queries that didn't match specific projects
 */
export const handleWorkRelatedQuery = (): {
  content: string;
  showProjects: boolean;
  suggestions: { text: string; delay: number }[];
} => {
  console.log('Work-related query detected, but no specific matches found');
  return {
    content: "I'd be happy to tell you about my work. What specific aspects of my projects or areas of expertise are you interested in?",
    showProjects: false,
    suggestions: [{ text: "Show me your portfolio", delay: 500 }]
  };
};
