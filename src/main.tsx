import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.tsx';

// The fonts are bundled with the page instead of being loaded from Google Fonts, so that
// no data about the visitors is sent to third parties
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
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
