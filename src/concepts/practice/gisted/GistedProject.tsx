import ProjectGallery from '../ProjectGallery';
import type { PortfolioProject } from '../projects';
import GistedReel from './reel/GistedReel';

export default function GistedProject({ project }: { project: PortfolioProject }) {
  return <div className="gisted-project">
    <GistedReel/>
    {project.project_images.length > 0 && <ProjectGallery project={project}/>}
  </div>;
}
