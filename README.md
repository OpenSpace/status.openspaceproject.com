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
npm run lint    # Check formatting, linting, and geolocation.json
npm test        # Run the unit tests
```

### Data

The raw data is the `data.json` file that is created from the startup logs by
`scripts/process_startup_log.ts` and published at
<https://data.openspaceproject.com/log/data.json>. Log lines that cannot be parsed, for
example because two lines were written on top of each other, are skipped and reported.

Before `npm run dev` and `npm run build`, `npm run generate` (`scripts/generate-data.ts`)
creates two files in `src/generated` that the page loads:

- `usage.json`: The raw data aggregated into a compact form. As the raw file is large but
  changes only rarely, it is cached in the `.cache` folder and only downloaded again when
  the server reports that it has changed.
- `world.json`: The country outlines for the country map, created from the
  [Natural Earth](https://www.naturalearthdata.com) data of the `world-atlas` package.

Both are emitted with a content hash in their name, so browsers can keep them cached until
the data actually changes. `node scripts/json_to_csv.ts [file]` converts the raw data
into a CSV file.

### Geolocations

The positions of the places on the usage map are stored in `geolocation.json`, with one
place per line. Places that are not in the file yet are left out of the map, and
`npm run generate` prints how many there are. To add them:

```sh
npm run geocode             # Geocode new places through the ArcGIS geocoding service
npm run check-geolocation   # Validate the file (also part of `npm run lint`)
```

and commit the updated `geolocation.json`. If the file was edited by hand,
`npm run format-geolocation` brings it back into the expected format.

The release dates that are shown as annotations in the charts are listed in
`releases.json`.

### Deployment

The Jenkins pipeline (`Jenkinsfile`) checks and builds the page and copies the `dist`
folder to the web server. The build writes precompressed `.gz` and `.br` copies of all
text files. `deploy/nginx.conf` contains the matching nginx configuration, which serves
these copies and sets the caching headers.
