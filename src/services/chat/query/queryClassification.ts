
/**
 * Query classification utilities for determining user intent
 */

/**
 * Checks if the user is asking to see projects/portfolio/work
 */
export const isShowProjectsQuery = (message: string): boolean => {
  const lowerMessage = message.toLowerCase();
  
  // Direct requests to see work/projects
  const showPatterns = [
    /show\s+(?:me\s+)?(?:your\s+)?(?:recent\s+)?(?:work|projects?|portfolio|stuff)/,
    /(?:can\s+)?(?:i\s+)?see\s+(?:your\s+)?(?:recent\s+)?(?:work|projects?|portfolio)/,
    /(?:what\s+)?(?:work|projects?)\s+(?:have\s+)?(?:you\s+)?(?:done|worked\s+on|built)/,
    /view\s+(?:your\s+)?(?:work|projects?|portfolio)/,
    /browse\s+(?:your\s+)?(?:work|projects?|portfolio)/,
    /(?:recent\s+)?(?:work|projects?|portfolio)(?:\s+please)?$/
  ];
  
  return showPatterns.some(pattern => pattern.test(lowerMessage));
};

/**
 * Checks if the query is work-related but not a direct request to see projects
 */
export const isWorkRelatedQuery = (message: string): boolean => {
  const lowerMessage = message.toLowerCase();
  
  const workPatterns = [
    /(?:what\s+)?(?:kind\s+of\s+)?work\s+(?:do\s+you\s+do|have\s+you\s+done)/,
    /tell\s+me\s+about\s+(?:your\s+)?work/,
    /(?:what\s+)?(?:types?\s+of\s+)?projects?\s+(?:do\s+you\s+work\s+on|have\s+you\s+done)/,
    /(?:what\s+)?experience\s+(?:do\s+you\s+have|have\s+you\s+had)/,
    /(?:what\s+)?skills?\s+(?:do\s+you\s+have|have\s+you\s+developed)/,
    /(?:professional\s+)?background/,
    /career/,
    /expertise/
  ];
  
  return workPatterns.some(pattern => pattern.test(lowerMessage));
};

/**
 * Checks if the query is AI-related
 */
export const isAIQuery = (message: string): boolean => {
  const lowerMessage = message.toLowerCase();
  
  const aiPatterns = [
    /\bai\b/,
    /artificial\s+intelligence/,
    /machine\s+learning/,
    /\bml\b/,
    /deep\s+learning/,
    /neural\s+network/,
    /chatbot/,
    /nlp/,
    /natural\s+language/,
    /computer\s+vision/,
    /automation/
  ];
  
  return aiPatterns.some(pattern => pattern.test(lowerMessage));
};

/**
 * Checks if the user is specifically asking about AI experience
 */
export const isAIExperienceQuery = (message: string): boolean => {
  const lowerMessage = message.toLowerCase();
  
  const experiencePatterns = [
    /(?:have\s+you\s+|do\s+you\s+have\s+).*(?:worked\s+with|experience\s+with|done.*work.*with|built.*with)\s+.*ai/,
    /(?:have\s+you\s+|do\s+you\s+have\s+).*ai.*(?:experience|work|projects?)/,
    /(?:what\s+)?ai.*(?:experience|work|projects?|background)/,
    /ai.*(?:projects?|work|experience)/,
    /machine\s+learning.*(?:projects?|work|experience)/,
    /artificial\s+intelligence.*(?:projects?|work|experience)/
  ];
  
  return experiencePatterns.some(pattern => pattern.test(lowerMessage));
};

/**
 * Checks if the user is asking about a specific project
 */
export const isSpecificProjectQuery = (message: string): boolean => {
  const lowerMessage = message.toLowerCase();
  
  const projectPatterns = [
    /project\s+ariadne/,
    /ariadne/,
    /tell\s+me\s+more\s+about\s+(?:it|that|this)/,
    /learn\s+more\s+about\s+(?:it|that|this)/,
    /more\s+(?:info|information|details)\s+about/,
    /(?:what\s+)?(?:can\s+you\s+tell\s+me|tell\s+me)\s+(?:more\s+)?about/
  ];
  
  return projectPatterns.some(pattern => pattern.test(lowerMessage));
};
