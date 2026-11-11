# status.openspaceproject.com

## Usage page

The usage page is a React application that is built with [Vite](https://vite.dev). It
shows where, how often, and with which versions and profiles OpenSpace has been started.

### Development

```sh
npm install
npm run dev     # Start a development server with hot reloading
npm run build   # Build the page into the `dist` folder
npm run preview # Serve the built page from the `dist` folder
npm run lint    # Check formatting and linting
```

### Data

The raw data is the `data.json` file that is created from the startup logs by
`scripts/process_startup_log.ts` and published at
https://data.openspaceproject.com/log/data.json.

Before `npm run dev` and `npm run build`, `npm run generate` (`scripts/generate-data.ts`)
aggregates the raw data into the much smaller `src/generated/usage.json`, which the page
loads. As the raw file is large but changes only rarely, it is cached in the `.cache`
folder and only downloaded again when the server reports that it has changed. The
generated file is emitted with a content hash in its name, so browsers can keep it cached
until the data actually changes.

Places that have not been encountered before are geocoded through the ArcGIS geocoding
service and added to `geolocation.json`, which should then be committed. The release
dates that are shown as annotations in the charts are listed in `releases.json`.
