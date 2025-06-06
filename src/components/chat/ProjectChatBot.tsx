
import React from 'react';
import ContextualChatBot from './ContextualChatBot';

interface ProjectChatBotProps {
  projectTitle: string;
  projectDescription?: string;
}

const ProjectChatBot: React.FC<ProjectChatBotProps> = ({ projectTitle, projectDescription }) => {
  return (
    <ContextualChatBot 
      contextType="project"
      contextTitle={projectTitle}
      contextDescription={projectDescription}
    />
  );
};

export default ProjectChatBot;
