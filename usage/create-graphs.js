'use strict';

import fs from 'fs';
import request from 'request-promise-native';

const Geolocation = JSON.parse(fs.readFileSync('geolocation.json'));
const Releases = JSON.parse(fs.readFileSync('releases.json'));

function increaseCount(obj, key) {
  if (key in obj) obj[key] = obj[key] + 1;
  else obj[key] = 1;
}

async function loadData(url) {
  let result;
  await request(url, {}, (error, res, body) => {
    if (error) throw console.log(error);
    if (res.statusCode == 200) result = JSON.parse(body);
  });

  return result;
}

async function createGraphs(targetPath, dataUrl) {
  const data = await loadData(dataUrl);

  let countries = {};
  let countriesTotal = {};
  let places = {};
  let placesTotal = {};
  let dates = {};
  let profiles = {};

  for (let i = 0; i < data.entries.length; i += 1) {
    const date = data.entries[i].d;

    const version = data.versions[data.entries[i].v];
    console.assert(version !== null);

    const location = data.locations[data.entries[i].l];

    const city = location.p;
    const region = location.r;
    const country = location.c;
    const profile = data.profiles[data.entries[i].p];

    if (city.length === 0 || country.length === 0) continue;

    const place = city.trim() + ', ' + region + ', ' + country;

    if (!(place in Geolocation)) {
      await request(
        `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${place}&category=&outFields=*&forStorage=false&f=json`,
        {},
        (error, res, body) => {
          if (error) return console.log(error);

          if (res.statusCode === 200) {
            const j = JSON.parse(body);
            if (j.candidates.length !== 1) {
              // If we get more than one hit, we want to sort them and pick the best hit
              j.candidates = j.candidates.sort((a, b) => b.score - a.score);

              j.candidates.forEach((e) => console.log(e.location, e.score));
              if (j.candidates[0].score < 75) {
                throw `Expected 1 result for geolocation in row ${i}: (${place}), got ${j.candidates.length}`;
              }
            }

            Geolocation[place] = {
              lat: j.candidates[0].location.y,
              lng: j.candidates[0].location.x
            };
            fs.writeFileSync('geolocation.json', JSON.stringify(Geolocation));
            console.log(place, j.candidates[0].location);
          }
        }
      );
    }

    increaseCount(countriesTotal, country);
    increaseCount(placesTotal, place);

    if (profile !== '') {
      if (version in profiles) {
        increaseCount(profiles[version], profile);
      }
      else {
        profiles[version] = {}
        profiles[version][profile] = 1;
      }
    }

    const monthPart = date.substring(0, "YY-MM".length);
    if (place in places) {
      increaseCount(places[place], monthPart);
    }
    else {
      places[place] = {};
      places[place][monthPart] = 1;
    }
    if (country in countries) {
      increaseCount(countries[country], monthPart);
    }
    else {
      countries[country] = {};
      countries[country][monthPart] = 1;
    }

    const dayPart = date.substring(0, "YY-MM-DD".length);
    if (dayPart in dates) {
      if (version in dates[dayPart]) dates[dayPart][version] = dates[dayPart][version] + 1;
      else dates[dayPart][version] = 1;
    } else {
      dates[dayPart] = {};
      dates[dayPart][version] = 1;
    }
  }

  //
  // Serialize the countries data
  let countriesMax = 0;
  for (const [key, value] of Object.entries(countriesTotal)) {
    if (value > countriesMax) {
      countriesMax = value;
    }
  }

  let countriesSerialized = `[ ["Country", "Usage" ],`;
  for (const [key, value] of Object.entries(countries)) {
    let normalizedValue = countriesTotal[key] / countriesMax;
    let v = Math.pow(normalizedValue, 1 / 4);
    countriesSerialized += `["${key}", { "v": ${v}, "f": ${countriesTotal[key]}, "d": {`;
    for (const [time, num] of Object.entries(value)) {
      countriesSerialized += `"${time}":${num},`;
    }
    countriesSerialized = countriesSerialized.substring(0, countriesSerialized.length - 1);
    countriesSerialized += `}}],`;
  }
  countriesSerialized = countriesSerialized.substring(0, countriesSerialized.length - 1);
  countriesSerialized += `]`;

  //
  // Serialize the places data
  let placesSerialized = `[ `;
  for (const [key, value] of Object.entries(places)) {
    const geo = Geolocation[key];
    placesSerialized += `{"lat":${geo.lat},"lng":${geo.lng},"total":${placesTotal[key]},"bydate": {`;
    for (const [time, num] of Object.entries(value)) {
      placesSerialized += `"${time}":${num},`;
    }
    placesSerialized = placesSerialized.substring(0, placesSerialized.length - 1);
    placesSerialized += '}},';
  }
  placesSerialized = placesSerialized.substring(0, placesSerialized.length - 1);
  placesSerialized += ']';

  //
  // Serialize the day data
  // Get the list of all versions
  let versionList = [];
  for (const [key, value] of Object.entries(dates)) {
    for (let [k, v] of Object.entries(value)) {
      if (!versionList.includes(k)) {
        versionList.push(k);
      }
    }
  }
  versionList.sort((a, b) => {
    const [aMajor, aMinor, aPatch] = a.split('.').map(Number);
    const [bMajor, bMinor, bPatch] = b.split('.').map(Number);

    if (aMajor !== bMajor) {
      return aMajor - bMajor;
    } else if (aMinor !== bMinor) {
      return aMinor - bMinor;
    } else {
      return aPatch - bPatch;
    }
  });
  versionList.reverse();
  let element = versionList[versionList.length - 1];
  versionList.splice(versionList.length - 1, 1);
  versionList.splice(0, 0, element);

  let versionsSerialized = '[';
  for (const version in versionList) {
    versionsSerialized += `"${versionList[version]}",`;
  }
  versionsSerialized = versionsSerialized.substring(0, versionsSerialized.length - 1);
  versionsSerialized += ']';

  for (const [date, version] of Object.entries(Releases.dates)) {
    if (date in dates) {
      dates[date].release = version;
    }
  }

  let datesSerialized = `[[ "Day", `;
  for (const version of versionList) {
    datesSerialized += `"${version}",`;
  }
  datesSerialized += `"Annotation"],`;
  for (const [key, value] of Object.entries(dates)) {
    datesSerialized += `[ new Date("20${key}"), `;
    for (const version of versionList) {
      if (version in value) datesSerialized += `${value[version]},`;
      else datesSerialized += '0,';
    }
    if ('release' in value) datesSerialized += `"${value['release']}"`;
    else datesSerialized += 'null';
    datesSerialized += '],';
  }
  datesSerialized = datesSerialized.substring(0, datesSerialized.length - 1);
  datesSerialized += ']';


  let profilesSerialized = '{';
  for (const [version, pfs] of Object.entries(profiles)) {
    profilesSerialized += `"${version}": {`;
    for (const [profile, count] of Object.entries(pfs)) {
      profilesSerialized += `"${profile}": ${count},`
    }
    profilesSerialized = profilesSerialized.substring(0, profilesSerialized.length - 1);
    profilesSerialized += '},';
  }
  profilesSerialized = profilesSerialized.substring(0, profilesSerialized.length - 1);
  profilesSerialized += '}'

  const websiteData = `{
    data = {
      "versions": ${versionsSerialized},
      "countries": ${countriesSerialized},
      "places": ${placesSerialized},
      "dates": ${datesSerialized},
      "profiles": ${profilesSerialized}
    }
  }`;

  let versionDivs;
  for (let i = 0; i < versionList.length; i++) {
    versionDivs += `<div id="usage_chart_version_${i}" style="width: 90%; height: 250px; margin: auto;"></div>\n`;
  }

  let profileDivs;
  for (const [version, _] of Object.entries(profiles)) {
    profileDivs += `<div id="usage_chart_profile_${version}" style="width: 90%; height: 400px; margin: auto;"></div>\n`;
  }

  const html = `
  <html>
  <body style="background: #111111">
    <h1>Usage maps</h1>
    These maps show the places from where OpenSpace has been started. Note that the individual markers are only an approximation based on the <i>city</i> and does not represent the precise location.
    <div id="usage_map_individual" style="width: 90%; height: 90%; margin: auto;"></div>
    <div id="usage_map_country" style="width: 90%; margin: auto;"></div>

    Filter the maps based on the following dates. If a field is empty, no filtering is happening based on that part of the range. Both ends of the range are inclusive and have to be provided in the form "YY-MM". For example:  "Begin 25-02 End 25-02" would show the map how it was in February 2025.

    <br>

    <label for="datebegin">Begin Date:</label>
    <input type="text" id="datebegin" name="datebegin" onchange="updateMap()">
    <label for="dateend">End Date:</label>
    <input type="text" id="dateend" name="dateend"onchange="updateMap()">

    <br>

    <h1>Usage charts</h1>
    <div id="usage_chart_date_box" style="width: 90%; height: 500px; margin: auto;"></div>
    <div id="usage_chart_date_box_grouped" style="width: 90%; height: 500px; margin: auto;"></div>

    <h1>Versions</h1>
    These graphs show for each version how large the portion of total starts on the specific day were of the selected version. For example, if the 0.15.0 graph shows 35% for a specific day, 35% of the start-ups were with version 0.15.0 with 65% were of other versions.
    ${versionDivs}

    <h1>Profiles</h1>
    These graphs show how often each profile was started for each version. Only the fact whether a <i>user-profile</i> was started is collected, so it is not possible to show the names of the individual user-created profiles.
    ${profileDivs}
  </body>

  <style>
    #usage_map_individual { height: 500px; }
    * {
      color: #eeeeee;
    }
    input {
      color: #000000;
    }
  </style>

  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
    crossorigin=""/>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
    crossorigin=""></script>

  <script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
  <script type="text/javascript" src="data.js"></script>
  <script type="text/javascript" src="isocountries.js"></script>
  <script type="text/javascript" src="functions.js"></script>

  <script type="text/javascript">
    google.charts.load('current', {
      'packages': [ 'geochart', 'corechart' ],
      'mapsApiKey': 'AIzaSyBBn5PBZQvKaBwBE7tFATmq28dsu-tp43o'
    });
    google.charts.setOnLoadCallback(drawMaps);

    function updateMap() {
      let begin = document.getElementById('datebegin').value;
      let end = document.getElementById('dateend').value;
      drawMap(
        data.places,
        begin !== '' ? begin : null,
        end !== '' ? end : null
      );
      drawOverviewMap(data.countries, document.getElementById('usage_map_country'), begin !== '' ? begin : null, end !== '' ? end : null);
    }

    function drawMaps() {
      // i=1 since we have a header as the first entry
      for (let i = 1; i < data.countries.length; i++) {
        data.countries[i][0] = convertCountryCode(data.countries[i][0]);
      }

      initializeMap('usage_map_individual');
      updateMap();
      drawOverviewMap(data.countries, document.getElementById('usage_map_country'), null, null);
      drawDateChart(data.dates, document.getElementById('usage_chart_date_box'));

      let groupedDates = [ data.dates[0] ];
      let dateIterator = "";
      for (let i = 1; i < data.dates.length; i++) {
        let currentDate = data.dates[i][0].toISOString().substring(0, "YYYY-MM".length);
        if (currentDate === dateIterator) {
          // We have a day of a year-month that we are already processing
          for (let j = 1; j < groupedDates[groupedDates.length - 1].length - 1; j++) {
            groupedDates[groupedDates.length - 1][j] += data.dates[i][j];
          }
        }
        else {
          // We transitioned to a new year-month
          let d = [ ... data.dates[i] ];
          d[0] = new Date(currentDate);
          groupedDates.push(d);
        }

        dateIterator = currentDate;
      }

      drawDateChart(groupedDates, document.getElementById('usage_chart_date_box_grouped'));

      for (let i = 0; i < data.versions.length; i++) {
        drawVersionGraph(data.dates, document.getElementById(\`usage_chart_version_\${i}\`), data.versions[i], Colors[i]);
      }

      for (const [version, profiles] of Object.entries(data.profiles)) {
        let d = "usage_chart_profile_" + version;
        console.log(d);
        console.log(document.getElementById(d));
        drawProfileChart(profiles, document.getElementById(d), version)
      }
    }
  </script>
  </html>
  `;

  if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath);
  fs.writeFileSync(targetPath + '/index.html', html);
  fs.writeFileSync(targetPath + '/data.js', websiteData);
  fs.copyFileSync('functions.js', targetPath + '/functions.js');
  fs.copyFileSync('isocountries.js', targetPath + '/isocountries.js');
}

//
// main
if (process.argv.length !== 4) {
  throw `Expected two arguments: First: Target folder. Second: URL to data file`;
}
const target = process.argv[2];
const dataURL = process.argv[3];
createGraphs(target, dataURL);
