const Colors = [
  '3366cc',
  '#dc3912',
  '#ff9900',
  '#109618',
  '#990099',
  '#0099c6',
  '#dd4477',
  '#66aa00',
  '#b82e2e',
  '#316395'
];

function drawOverviewMap(data, div, beginRange, endRange) {
  let d = [...data];
  // If we have a provided range, we need to overwrite the 'v' and 'f' values of the data
  // type to only reflect the selected values
  if (beginRange !== null || endRange !== null) {
    let countriesMax = 0;
    // i=1 since we have a header as the first entry
    for (let i = 1; i < d.length; i++) {
      let f = 0.0;

      for (const [date, num] of Object.entries(d[i][1]["d"])) {
        if (beginRange !== null && date < beginRange) {
          continue;
        }

        if (endRange !== null && date > endRange) {
          continue;
        }

        f += num;
      }

      d[i][1]["f"] = f;

      // Collect the biggest number of values
      if (f > countriesMax) {
        countriesMax = f;
      }
    }

    // Second pass to calculate the colormap value
    for (let i = 1; i < d.length; i++) {
      let normalizedValue = d[i][1]["f"] / countriesMax;
      let v = Math.pow(normalizedValue, 1 / 4);
      d[i][1]["v"] = v;
    }
  }

  let dataTable = google.visualization.arrayToDataTable(d);
  let options = {
    colorAxis: { colors: ['#ccedff', '#005985'] },
    legend: 'none',
    annotations: { style: 'line' }
  };
  let chart = new google.visualization.GeoChart(div);
  chart.draw(dataTable, options);
}

let map;

function initializeMap(divName) {
  map = L.map(divName).setView([0.0, 0.0], 2);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 12,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    noWrap: true
  }).addTo(map);
}

function drawMap(data, beginRange, endRange) {
  // Remove old markers if they exist
  map.eachLayer(function(layer) {
    if (layer instanceof L.Marker) {
      map.removeLayer(layer);
    }
  });


  for (let i = 0; i < data.length; i++) {
    let count = 0;
    // If no range was specified, we use the total range
    if (beginRange === null && endRange === null) {
      count = data[i]["total"];
    }
    else {
      for (const [date, num] of Object.entries(data[i]["bydate"])) {
        if (beginRange !== null && date < beginRange) {
          continue;
        }

        if (endRange !== null && date > endRange) {
          continue;
        }

        count += num;
      }
    }

    let icon = new L.Icon.Default();
    icon.options.shadowSize = [0,0];
    if (count > 0) {
      L.marker([data[i]["lat"], data[i]["lng"]], {
        keyboard: false,
        title: count,
        icon: icon
      }).addTo(map);
    }
  }
}

function drawDateChart(data, div) {
  let dataTable = new google.visualization.DataTable();
  dataTable.addColumn('date', 'Date');
  for (var i = 1; i < data[0].length - 1; i++) {
    dataTable.addColumn('number', data[0][i]);
  }
  dataTable.addColumn({ type: 'string', role: 'annotation' });

  dataTable.addRows(data.slice(1));

  {
    let options = {
      title: 'Usage',
      bar: { groupWidth: '100%' },
      isStacked: true,
      annotations: { style: 'line' }
    };
    let chart = new google.visualization.ColumnChart(div);
    chart.draw(dataTable, options);
  }
}

function drawVersionGraph(data, div, version, color) {
  let dataTable = new google.visualization.DataTable();
  dataTable.addColumn('date', 'Date');
  dataTable.addColumn('number', 'Percentage');
  dataTable.addColumn({ type: 'string', role: 'annotation' });

  let idx = -1;
  for (let i = 1; i < data[0].length; i++) {
    if (data[0][i] === version) {
      idx = i;
      break;
    }
  }

  for (let i = 1; i < data.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = 1; j < data[i].length - 1; j++) {
      sum += data[i][j];
      count += 1;
    }

    let value = data[i][idx];
    let f = value / sum;

    const annotation = data[i][data[i].length - 1];
    if (value > 0 || annotation !== null) {
      dataTable.addRow([data[i][0], f * 100, annotation]);
    } else {
      dataTable.addRow([data[i][0], 0, annotation]);
    }
  }

  {
    if (version.length == 0) version = 'No version information';

    let options = {
      title: version,
      bar: { groupWidth: '100%' },
      isStacked: true,
      annotations: {
        style: 'line'
      },
      explorer: {
        axis: 'horizontal',
        keepInBounds: true,
        maxZoomIn: 2,
        maxZoomOut: 2
      },
      series: {
        0: { color: color }
      }
    };
    let chart = new google.visualization.LineChart(div);

    chart.draw(dataTable, options);
  }
}

function drawProfileChart(data, div, version) {
  let arr = [ [ 'Profile', 'Count' ] ];
  for (const [profile, count] of Object.entries(data)) {
    arr.push([ profile, count ]);
  }

  let options = {
    title: version
  }

  let chart = new google.visualization.PieChart(div);
  chart.draw(google.visualization.arrayToDataTable(arr), options);
}
