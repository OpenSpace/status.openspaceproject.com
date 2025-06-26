// Downloads the data.json and converts it into a flat CSV file

import fs from 'fs';
import request from 'request-promise-native';

async function loadData(url) {
  let result;
  await request(url, {}, (error, res, body) => {
    if (error) throw console.log(error);
    if (res.statusCode == 200) result = JSON.parse(body);
  });

  return result;
}

let data = await loadData("https://data.openspaceproject.com/log/data.json");

fs.writeFileSync("data.csv", 'Date, City, Region, Country, Version, Profile, System\n');

for (let i = 0; i < data.entries.length; i++) {
  const date = data.entries[i].d;
  const locationObj = data.locations[data.entries[i].l];
  const location = `${locationObj.p.replaceAll(',', ' ')}, ${locationObj.r.replaceAll(',', ' ')}, ${locationObj.c.replaceAll(',', ' ')}`;
  const version = data.versions[data.entries[i].v];
  const profile = data.profiles[data.entries[i].p];
  const system = data.systems[data.entries[i].s];

  fs.appendFileSync("data.csv", `${date}, ${location}, ${version}, ${profile}, ${system}\n`);
}
