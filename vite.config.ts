import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[/\\](react|react-dom|scheduler)[/\\]/,
              priority: 20
            },
            {
              name: 'leaflet',
              test: /node_modules[/\\](leaflet|react-leaflet|@react-leaflet)[/\\]/,
              priority: 15
            },
            { name: 'vendor', test: /node_modules/, priority: 10 }
          ]
        }
      }
    }
  }
});
