import ProjectGallery from '../ProjectGallery';
import type { PortfolioProject } from '../projects';
import SIguideHero from './SIguideHero';

export default function SIguideProject({ project }: { project: PortfolioProject }) {
  const media = project.project_images.filter(item => !/(?:^|\/)4jn2ard683w\.png(?:[?#]|$)/.test(item.image_url));
  return <div className="si-project"><SIguideHero/>{media.length > 0 && <ProjectGallery project={{ ...project, project_images: media }}/>}</div>;
}
