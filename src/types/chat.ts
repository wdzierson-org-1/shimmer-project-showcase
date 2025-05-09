
import { Project } from '@/components/project/ProjectCard';
import { ContentEntry } from '@/services/content/contentService';

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  projects?: Project[];
  showProjects?: boolean;
  contentEntries?: ContentEntry[];
  showContentEntries?: boolean;
  suggestions?: { text: string; delay: number }[];
}
