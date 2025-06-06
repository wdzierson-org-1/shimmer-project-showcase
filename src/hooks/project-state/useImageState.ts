
import { useState } from 'react';

export const useImageState = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);

  return {
    imageUrl,
    setImageUrl,
    additionalImages,
    setAdditionalImages
  };
};
