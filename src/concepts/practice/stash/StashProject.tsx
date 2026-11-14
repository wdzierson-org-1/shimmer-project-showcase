import ProjectGallery from '../ProjectGallery';
import type { PortfolioProject } from '../projects';
import StashReel from './reel/StashReel';

export default function StashProject({ project }: { project: PortfolioProject }) {
  return <div className="stash-project">
    <StashReel/>
    {project.project_images.length > 0 && <ProjectGallery project={project}/>}
  </div>;
}
