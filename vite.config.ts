/// <reference types="vitest/config" />

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/**
 * Writes a gzip and a brotli compressed copy next to each text file of the build, so that
 * the web server can send them without compressing the files on every request (nginx:
 * `gzip_static on;` and `brotli_static on;`)
 */
function precompress(): Plugin {
  const extensions = new Set(['.html', '.js', '.css', '.json', '.svg']);
  return {
    name: 'precompress',
    apply: 'build',
    writeBundle(options, bundle) {
      const dir = options.dir ?? 'dist';
      for (const file of Object.keys(bundle)) {
        if (!extensions.has(path.extname(file))) continue;
        const p = path.join(dir, file);
        const content = fs.readFileSync(p);
        fs.writeFileSync(`${p}.gz`, zlib.gzipSync(content, { level: 9 }));
        fs.writeFileSync(
          `${p}.br`,
          zlib.brotliCompressSync(content, {
            params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 }
          })
        );
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), precompress()],
  build: {
    // ECharts is about 700 kB, but it is loaded on demand after the page has been shown
    chunkSizeWarningLimit: 750,
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
            {
              name: 'echarts',
              test: /node_modules[/\\](echarts|zrender)[/\\]/,
              priority: 15
            },
            { name: 'vendor', test: /node_modules/, priority: 10 }
          ]
        }
      }
    }
  },
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts']
  }
});
