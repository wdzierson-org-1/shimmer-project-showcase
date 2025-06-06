
import { useState } from 'react';

export const useTagState = () => {
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  return {
    tags,
    setTags,
    newTag,
    setNewTag
  };
};
