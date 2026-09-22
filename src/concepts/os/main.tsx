import React from 'react';
import { createRoot } from 'react-dom/client';
import Desktop from './Desktop';
import './desktop.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><Desktop /></React.StrictMode>);
