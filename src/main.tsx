import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.tsx';

import 'leaflet/dist/leaflet.css';
import './globals.css';

const root = document.getElementById('root');
if (root === null) {
  throw new Error("Could not find the 'root' element");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
