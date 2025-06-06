
import { ProjectDataState } from '@/types/projectData';
import { useBasicProjectState } from './project-state/useBasicProjectState';
import { useImageState } from './project-state/useImageState';
import { useUrlState } from './project-state/useUrlState';
import { useTagState } from './project-state/useTagState';

export const useProjectDataState = (): ProjectDataState => {
  const basicState = useBasicProjectState();
  const imageState = useImageState();
  const urlState = useUrlState();
  const tagState = useTagState();

  return {
    ...basicState,
    ...imageState,
    ...urlState,
    ...tagState
  };
};
