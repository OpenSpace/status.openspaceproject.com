const Colors = [
  "3366cc",
  "#dc3912",
  "#ff9900",
  "#109618",
  "#990099",
  "#0099c6",
  "#dd4477",
  "#66aa00",
  "#b82e2e",
  "#316395"
];

function drawOverviewMap(data, div, convertCountryCodeFn) {
  for (let i = 1; i < data.length; i++) {
    data[i][0] = convertCountryCodeFn(data[i][0]);
  }


  let dataTable = google.visualization.arrayToDataTable(data);
  let options = {
    colorAxis: { colors: [ '#ccedff', '#005985' ] },
    legend: 'none',
    annotations: { style: 'line' }
  };
  let chart = new google.visualization.GeoChart(div);
  chart.draw(dataTable, options);
}

function drawMap(data, div) {
  let map = new google.maps.Map(
    div,
    { zoom: 2, center: { lat: 0.00, lng: 0.00 } }
  );

  for (let i = 0; i < data.length; i++) {
    let marker = new google.maps.Marker({
      position: { lat: data[i][0], lng: data[i][1] },
      map: map,
      optimized: true
    });

    function attachValue(marker, value) {
      let isClicked = false;
      marker.addListener("click", () => {
        if (isClicked)  marker.setLabel(null);
        else            marker.setLabel(value);
        isClicked = !isClicked;
      });
    }

    attachValue(marker, data[i][2]);
  }
}

function drawDateChart(data, div) {
  let dataTable = new google.visualization.DataTable();
  dataTable.addColumn('date', 'Date');
  for (var i = 1; i < data[0].length - 1; i++) {
    dataTable.addColumn('number', data[0][i]);
  }
  dataTable.addColumn({ type: 'string', role:'annotation' });

  dataTable.addRows(data.slice(1));

  {
    let options = {
      title: 'Usage',
      bar: { groupWidth: "100%" },
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
      dataTable.addRow([ data[i][0], f * 100, annotation]);
    }
    else {
      dataTable.addRow([ data[i][0], 0, annotation]);
    }
  }

  {
    if (version.length == 0)  version = "No version information";

    let options = {
      title: version,
      bar: { groupWidth: "100%" },
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
