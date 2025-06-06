
import { useState } from 'react';
import { ProjectDataState } from '@/types/projectData';

export const useProjectDataState = (): ProjectDataState => {
  const [title, setTitle] = useState('');
  const [client, setClient] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [liveUrl, setLiveUrl] = useState('');
  const [involvement, setInvolvement] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  return {
    title,
    setTitle,
    client,
    setClient,
    description,
    setDescription,
    imageUrl,
    setImageUrl,
    additionalImages,
    setAdditionalImages,
    liveUrl,
    setLiveUrl,
    involvement,
    setInvolvement,
    year,
    setYear,
    tags,
    setTags,
    newTag,
    setNewTag
  };
};
