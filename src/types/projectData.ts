
export interface ProjectFormData {
  title: string;
  client: string;
  description: string;
  imageUrl: string;
  additionalImages: string[];
  liveUrl: string;
  involvement: string;
  year: number;
  featured: boolean;
  tags: string[];
  newTag: string;
}

export interface ProjectDataState {
  title: string;
  setTitle: (title: string) => void;
  client: string;
  setClient: (client: string) => void;
  description: string;
  setDescription: (description: string) => void;
  imageUrl: string;
  setImageUrl: (url: string) => void;
  additionalImages: string[];
  setAdditionalImages: (images: string[]) => void;
  liveUrl: string;
  setLiveUrl: (url: string) => void;
  involvement: string;
  setInvolvement: (involvement: string) => void;
  year: number;
  setYear: (year: number) => void;
  featured: boolean;
  setFeatured: (featured: boolean) => void;
  tags: string[];
  setTags: (tags: string[]) => void;
  newTag: string;
  setNewTag: (tag: string) => void;
}
