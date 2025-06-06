
import { useState } from 'react';

export const useBasicProjectState = () => {
  const [title, setTitle] = useState('');
  const [client, setClient] = useState('');
  const [description, setDescription] = useState('');
  const [involvement, setInvolvement] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());

  return {
    title,
    setTitle,
    client,
    setClient,
    description,
    setDescription,
    involvement,
    setInvolvement,
    year,
    setYear
  };
};
