import ProjectGallery from '../ProjectGallery';
import type { PortfolioProject } from '../projects';
import NoodleHomepage from './NoodleHomepage';

export default function NoodleProject({ project }: { project: PortfolioProject }) {
  // The coded homepage replaces this specific screenshot, regardless of gallery order.
  const media = project.project_images.filter(item => !/(?:^|\/)tixziglvmcr\.png(?:[?#]|$)/.test(item.image_url));
  return <div className="noodle-project">
    <div className="noodle-project-caption"><span>Original homepage · 2023–25</span><a href="https://www.noodleai.app/" target="_blank" rel="noreferrer">Original site ↗</a></div>
    <NoodleHomepage/>
    <p className="noodle-archive-note">An archive of Noodle’s homepage. The company has since dissolved.</p>
    {media.length > 0 && <ProjectGallery project={{ ...project, project_images: media }}/>}
  </div>;
}
