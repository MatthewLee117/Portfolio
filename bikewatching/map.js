import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@3/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

function getMapboxToken() {
  const fromMeta = document.querySelector('meta[name="mapbox-token"]')?.content?.trim();
  const fromWindow = globalThis.MAPBOX_ACCESS_TOKEN?.trim?.();
  const fromStorage = localStorage.getItem('mapboxToken')?.trim();
  const token = fromMeta || fromWindow || fromStorage || '';

  if (token && token !== fromStorage) {
    localStorage.setItem('mapboxToken', token);
  }

  return token;
}

mapboxgl.accessToken = getMapboxToken();

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-71.0937, 42.3601],
  zoom: 12,
  minZoom: 10,
  maxZoom: 17,
});

const slider = document.getElementById('time-slider');
const timeDisplay = document.getElementById('time-display');
const tooltip = document.getElementById('station-tooltip');

let departuresByMinute = Array.from({ length: 1440 }, () => []);
let arrivalsByMinute = Array.from({ length: 1440 }, () => []);

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function formatMinutes(minute) {
  if (minute < 0) return 'Any time';
  const h24 = Math.floor(minute / 60);
  const mins = minute % 60;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(mins).padStart(2, '0')} ${suffix}`;
}

function filterByMinute(tripsByMinute, minute) {
  if (minute < 0) return tripsByMinute.flat();

  const result = [];
  for (let offset = -60; offset <= 60; offset += 1) {
    const idx = (minute + offset + 1440) % 1440;
    result.push(...tripsByMinute[idx]);
  }
  return result;
}

function computeStationTraffic(stations, timeFilter = -1) {
  const departures = d3.rollup(
    filterByMinute(departuresByMinute, timeFilter),
    (v) => v.length,
    (d) => d.start_station_id,
  );

  const arrivals = d3.rollup(
    filterByMinute(arrivalsByMinute, timeFilter),
    (v) => v.length,
    (d) => d.end_station_id,
  );

  return stations.map((station) => {
    const id = station.short_name;
    const dep = departures.get(id) ?? 0;
    const arr = arrivals.get(id) ?? 0;

    return {
      ...station,
      departures: dep,
      arrivals: arr,
      totalTraffic: dep + arr,
    };
  });
}

map.on('load', async () => {
  const lanePaint = {
    'line-color': '#26a269',
    'line-width': 3,
    'line-opacity': 0.45,
  };

  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
  });

  map.addLayer({
    id: 'bike-lanes-boston',
    type: 'line',
    source: 'boston_route',
    paint: lanePaint,
  });

  map.addSource('cambridge_route', {
    type: 'geojson',
    data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson',
  });

  map.addLayer({
    id: 'bike-lanes-cambridge',
    type: 'line',
    source: 'cambridge_route',
    paint: lanePaint,
  });

  const stationJson = await d3.json('https://dsc106.com/labs/lab07/data/bluebikes-stations.json');

  const trips = await d3.csv(
    'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv',
    (trip) => {
      trip.started_at = new Date(trip.started_at);
      trip.ended_at = new Date(trip.ended_at);

      const startMinute = minutesSinceMidnight(trip.started_at);
      const endMinute = minutesSinceMidnight(trip.ended_at);

      departuresByMinute[startMinute].push(trip);
      arrivalsByMinute[endMinute].push(trip);

      return trip;
    },
  );

  let stations = stationJson.data.stations;
  let stationTraffic = computeStationTraffic(stations, -1);

  const svg = d3
    .select('#map')
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%');

  const g = svg.append('g');

  const radiusScale = d3
    .scaleSqrt()
    .domain([0, d3.max(stationTraffic, (d) => d.totalTraffic) || 1])
    .range([0, 25]);

  const stationFlow = d3.scaleQuantize().domain([0, 1]).range([0, 0.5, 1]);

  const projectPoint = (d) => {
    const point = map.project([+d.lon, +d.lat]);
    return [point.x, point.y];
  };

  const circles = g
    .selectAll('circle')
    .data(stationTraffic)
    .join('circle')
    .attr('r', (d) => radiusScale(d.totalTraffic))
    .style('--departure-ratio', (d) => {
      if (!d.totalTraffic) return 0.5;
      return stationFlow(d.departures / d.totalTraffic);
    })
    .on('mouseenter', (_event, d) => {
      tooltip.hidden = false;
      tooltip.querySelector('.station-name').textContent = d.name;
      tooltip.querySelector('.station-total').textContent = d.totalTraffic;
      tooltip.querySelector('.station-departures').textContent = d.departures;
      tooltip.querySelector('.station-arrivals').textContent = d.arrivals;
    })
    .on('mousemove', (event) => {
      tooltip.style.left = `${event.clientX + 14}px`;
      tooltip.style.top = `${event.clientY + 14}px`;
    })
    .on('mouseleave', () => {
      tooltip.hidden = true;
    });

  function updatePositions() {
    circles
      .attr('cx', (d) => projectPoint(d)[0])
      .attr('cy', (d) => projectPoint(d)[1]);
  }

  function updateScatterPlot(timeFilter) {
    stationTraffic = computeStationTraffic(stations, timeFilter);

    circles
      .data(stationTraffic)
      .join('circle')
      .attr('r', (d) => radiusScale(d.totalTraffic))
      .style('--departure-ratio', (d) => {
        if (!d.totalTraffic) return 0.5;
        return stationFlow(d.departures / d.totalTraffic);
      });
  }

  function updateTimeDisplay() {
    const timeFilter = Number(slider.value);
    timeDisplay.textContent = formatMinutes(timeFilter);
    updateScatterPlot(timeFilter);
  }

  map.on('move', updatePositions);
  map.on('zoom', updatePositions);
  map.on('resize', updatePositions);

  slider.addEventListener('input', updateTimeDisplay);

  updateTimeDisplay();
  updatePositions();

  console.log('Loaded trips:', trips.length);
});

map.on('error', (event) => {
  if (!event?.error) return;
  console.error('Mapbox error:', event.error);
});
