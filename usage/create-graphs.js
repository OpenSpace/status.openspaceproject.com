'use strict';

import fs from 'fs';
import request from 'request-promise-native';

const Geolocation = JSON.parse(fs.readFileSync('geolocation.json'));
const Releases = JSON.parse(fs.readFileSync('releases.json'));

function increaseCount(obj, key) {
  if (key in obj) obj[key] = obj[key] + 1;
  else obj[key] = 1;
}

function simplifyVersion(version) {
  if (version.includes('&amp;operating_system=')) {
    version = version.substring(0, version.indexOf('&amp;operating_system='));
  }

  let commit = '';
  if (version.includes('&amp;commit_hash=')) {
    commit = version.substring(version.indexOf('&amp;commit_hash='));
    for (const [version, hash] of Object.entries(Releases.hashes)) {
      if (hash.startsWith(commit)) {
        version = version.substring(0, version.indexOf('&amp;commit_hash='));
        commit = '';
        break;
      }
    }

    if (commit !== '') {
      version = '(GitHub)';
    }
  }

  return version;
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
  let places = {};
  let dates = {};

  for (var i = 0; i < data.entries.length; i += 1) {
    const date = data.entries[i].d;

    let version = data.versions[data.entries[i].v];
    version = simplifyVersion(version);

    const location = data.locations[data.entries[i].l];

    const city = location.p;
    const region = location.r;
    const country = location.c;

    if (city.length == 0 || country.length == 0) continue;

    const place = city.trim() + ', ' + region + ', ' + country;

    let lat = 0.0;
    let lng = 0.0;
    if (place in Geolocation) {
      lat = Geolocation[place].lat;
      lng = Geolocation[place].lng;
    } else {
      await request(
        `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${place}&category=&outFields=*&forStorage=false&f=json`,
        {},
        (error, res, body) => {
          if (error) return console.log(error);

          if (res.statusCode == 200) {
            const j = JSON.parse(body);
            let candidate;
            if (j.candidates.length != 1) {
              j.candidates = j.candidates.sort((a, b) => b.score - a.score);

              j.candidates.forEach((e) => console.log(e.location, e.score));
              if (j.candidates[0].score < 75) {
                throw `Expected 1 result for geolocation in row ${i}: (${place}), got ${j.candidates.length}`;
              } else {
                candidate = j.candidates[0];
              }
            } else {
              candidate = j.candidates[0];
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

    increaseCount(countries, country);
    increaseCount(places, place);

    const day = date.substring(0, 8);
    if (day in dates) {
      if (version in dates[day]) dates[day][version] = dates[day][version] + 1;
      else dates[day][version] = 1;
    } else {
      dates[day] = {};
      dates[day][version] = 1;
    }
  }

  //
  // Serialize the countries data
  let countriesMax = 0;
  for (const [key, value] of Object.entries(countries)) {
    if (value > countriesMax) {
      countriesMax = value;
    }
  }

  let countriesSerialized = `[ ["Country", "Usage"],`;
  for (const [key, value] of Object.entries(countries)) {
    var normalizedValue = value / countriesMax;
    var v = Math.pow(normalizedValue, 1 / 4);
    countriesSerialized += `["${key}", { "v": ${v}, "f": ${value} } ],`;
  }
  countriesSerialized = countriesSerialized.substring(0, countriesSerialized.length - 1);
  countriesSerialized += `]`;

  //
  // Serialize the places data
  let placesSerialized = `[ `;
  for (const [key, value] of Object.entries(places)) {
    const geo = Geolocation[key];
    placesSerialized += `[ ${geo.lat}, ${geo.lng}, "${value}"],`;
  }
  placesSerialized = placesSerialized.substring(0, placesSerialized.length - 1);
  placesSerialized += ']';

  //
  // Serialize the day data
  // Get the list of all versions
  let versionList = [];
  for (const [key, value] of Object.entries(dates)) {
    for (let [k, v] of Object.entries(value)) {
      k = simplifyVersion(k);

      if (!versionList.includes(k)) {
        versionList.push(k);
      }
    }
  }
  versionList.sort();

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

  const websiteData = `{
    data = {
      "versions": ${versionsSerialized},
      "countries": ${countriesSerialized},
      "places": ${placesSerialized},
      "dates": ${datesSerialized}
    }
  }`;

  let versionDivs;
  for (var i = 0; i < versionList.length; i++) {
    versionDivs += `<div id="usage_chart_version_${i}" style="width: 2048px; height: 1024px;"></div>\n`;
  }

  const html = `
  <html>
  <body style="background: #111111">
    <div id="usage_map_individual" style="width: 2048px; height: 1024px;"></div>
    <div id="usage_map_country" style="width: 2048px; height: 1024px;"></div>
    <div id="usage_chart_date_box" style="width: 2048px; height: 1024px;"></div>
    <div id="usage_chart_date_box_grouped" style="width: 2048px; height: 1024px;"></div>
    ${versionDivs}
  </body>

  <style>
    #usage_map_individual { height: 500px; }
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

    function drawMaps() {
      drawMap(data.places, document.getElementById("usage_map_individual"), false);
      drawOverviewMap(data.countries, document.getElementById('usage_map_country'), convertCountryCode);
      drawDateChart(data.dates, document.getElementById('usage_chart_date_box'));

      let groupedDates = [ data.dates[0] ];
      let dateIterator = "";
      for (var i = 1; i < data.dates.length; i++) {
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

      for (var i = 0; i < data.versions.length; i++) {
        drawVersionGraph(data.dates, document.getElementById(\`usage_chart_version_\${i}\`), data.versions[i], Colors[i]);
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
