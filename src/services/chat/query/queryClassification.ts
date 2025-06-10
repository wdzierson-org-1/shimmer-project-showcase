/**
 * Query classification utilities for determining user intent
 */

/**
 * Checks if the user is asking to see projects/portfolio/work
 */
export const isShowProjectsQuery = (message: string): boolean => {
  const lowerMessage = message.toLowerCase().trim();
  
  // Direct affirmative responses (common when responding to suggestions)
  const affirmativeResponses = [
    'yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'alright', 'sounds good',
    'that sounds good', 'that would be great', 'i would like that'
  ];
  
  if (affirmativeResponses.includes(lowerMessage)) {
    return true;
  }
  
  // Existing portfolio queries
  const portfolioKeywords = [
    'show me your portfolio',
    'show me your work', 
    'show me your projects',
    'see your portfolio',
    'see your work',
    'see your projects',
    'view your portfolio',
    'view your work',
    'view your projects',
    'portfolio',
    'projects',
    'recent work',
    'your work',
    'what have you worked on',
    'what have you built',
    'what have you created',
    'show me what you\'ve done',
    'display your work',
    'list your projects'
  ];
  
  return portfolioKeywords.some(keyword => lowerMessage.includes(keyword));
};

/**
 * Checks if the user is asking about work in general (but not specifically requesting to see projects)
 */
export const isWorkRelatedQuery = (message: string): boolean => {
  const lowerMessage = message.toLowerCase();
  
  // Skip if it's already a direct portfolio request
  if (isShowProjectsQuery(message)) {
    return false;
  }
  
  const workKeywords = [
    'work', 'job', 'career', 'experience', 'professional', 'employment',
    'skills', 'expertise', 'background', 'what do you do', 'occupation'
  ];
  
  return workKeywords.some(keyword => lowerMessage.includes(keyword));
};

/**
 * Checks if the user is asking about AI-related topics
 */
export const isAIQuery = (message: string): boolean => {
  const lowerMessage = message.toLowerCase();
  
  const aiKeywords = [
    'ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning',
    'neural network', 'llm', 'large language model', 'gpt', 'chatbot', 'nlp',
    'natural language processing', 'computer vision', 'automation'
  ];
  
  return aiKeywords.some(keyword => lowerMessage.includes(keyword));
};

/**
 * Checks if the user is specifically asking about AI experience (not just mentioning AI)
 */
export const isAIExperienceQuery = (message: string): boolean => {
  const lowerMessage = message.toLowerCase();
  
  // Check for experience-related AI queries
  const experiencePatterns = [
    /have you (done|worked on|built|created).*(ai|artificial intelligence|machine learning)/,
    /do you have.*(ai|artificial intelligence|machine learning).*(experience|work|projects)/,
    /(ai|artificial intelligence|machine learning).*(experience|background|work|projects)/,
    /what.*(ai|artificial intelligence|machine learning).*(have you|experience|work)/,
    /any.*(ai|artificial intelligence|machine learning).*(experience|work|projects)/
  ];
  
  return experiencePatterns.some(pattern => pattern.test(lowerMessage));
};

/**
 * Checks if the user is asking about a specific project by name
 */
export const isSpecificProjectQuery = (message: string): boolean => {
  const lowerMessage = message.toLowerCase();
  
  // Common project name patterns
  const projectPatterns = [
    /project\s+\w+/,
    /\w+\s+project/,
    /tell me about.*(project|work|case study)/,
    /what is.*(project|work)/,
    /details about.*(project|work)/,
    /more about.*(project|work)/
  ];
  
  // Specific project names that might be mentioned
  const projectNames = [
    'ariadne', 'project ariadne',
    'portfolio', 'website', 'site'
  ];
  
  return projectPatterns.some(pattern => pattern.test(lowerMessage)) ||
         projectNames.some(name => lowerMessage.includes(name));
};
