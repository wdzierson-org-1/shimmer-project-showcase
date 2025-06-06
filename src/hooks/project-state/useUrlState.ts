
import { useState } from 'react';

export const useUrlState = () => {
  const [liveUrl, setLiveUrl] = useState('');

  return {
    liveUrl,
    setLiveUrl
  };
};
