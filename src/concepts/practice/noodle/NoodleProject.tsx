import { useState } from 'react';
import ProjectGallery from '../ProjectGallery';
import type { PortfolioProject } from '../projects';
import NoodleHomepage from './NoodleHomepage';

export default function NoodleProject({ project }: { project: PortfolioProject }) {
  const [showMedia, setShowMedia] = useState(false);
  return <div className="noodle-project">
    <div className="noodle-project-caption"><span>Original homepage · 2023–25</span><a href="https://www.noodleai.app/" target="_blank" rel="noreferrer">Original site ↗</a></div>
    <NoodleHomepage/>
    <p className="noodle-archive-note">An archive of Noodle’s homepage. The company has since dissolved.</p>
    {project.project_images.length > 0 && <details className="noodle-project-media" onToggle={event => setShowMedia(event.currentTarget.open)}><summary>Project images & videos <span>{project.project_images.length} items</span></summary>
      {showMedia && <ProjectGallery project={project}/>}
    </details>}
  </div>;
}
