import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

const width = 1000;
const height = 600;
const margin = { top: 30, right: 24, bottom: 48, left: 62 };
const plotWidth = width - margin.left - margin.right;
const plotHeight = height - margin.top - margin.bottom;

const svg = d3.select('#chart svg');
const chart = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

const tooltip = document.getElementById('commit-tooltip');
const statsContainer = document.getElementById('stats');
const selectionCount = document.getElementById('selection-count');
const languageBreakdown = document.getElementById('language-breakdown');
const commitProgressInput = document.getElementById('commit-progress');
const commitTimeEl = document.getElementById('commit-time');

let xScale;
let yScale;
let rScale;
let timeScale;
let commits = [];
let filteredCommits = [];
let selectedCommits = [];
let commitProgress = 100;
let commitMaxTime;

const colors = d3.scaleOrdinal(d3.schemeTableau10);

function rowConverter(d) {
  const datetime = new Date(d.datetime);
  return {
    ...d,
    line: Number(d.line),
    depth: Number(d.depth),
    length: Number(d.length),
    datetime,
    hourFrac: datetime.getHours() + datetime.getMinutes() / 60 + datetime.getSeconds() / 3600,
  };
}

function groupCommits(lines) {
  return Array.from(
    d3.rollup(
      lines,
      (vals) => {
        const first = vals[0];
        const dt = first.datetime;
        return {
          id: first.commit,
          author: first.author,
          url: `https://github.com/MatthewLee117/Portfolio/commit/${first.commit}`,
          datetime: dt,
          date: dt.toLocaleDateString(),
          time: dt.toLocaleTimeString(),
          hourFrac: dt.getHours() + dt.getMinutes() / 60 + dt.getSeconds() / 3600,
          totalLines: vals.length,
          totalLength: d3.sum(vals, (d) => d.length),
          files: new Set(vals.map((d) => d.file)).size,
          lines: vals,
        };
      },
      (d) => d.commit,
    ).values(),
  ).sort((a, b) => d3.ascending(a.datetime, b.datetime));
}

function renderStats(lines) {
  const fileCount = new Set(lines.map((d) => d.file)).size;
  const commitCount = new Set(lines.map((d) => d.commit)).size;
  const authorCount = new Set(lines.map((d) => d.author)).size;
  const maxDepth = d3.max(lines, (d) => d.depth) ?? 0;
  const avgLineLength = d3.mean(lines, (d) => d.length) ?? 0;
  const byType = d3
    .rollups(lines, (vals) => vals.length, (d) => d.type)
    .sort((a, b) => d3.descending(a[1], b[1]));

  statsContainer.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'kv-list';

  const addStat = (label, value) => {
    const row = document.createElement('p');
    row.className = 'kv-line';
    row.innerHTML = `<strong>${label}:</strong> <span>${value}</span>`;
    grid.append(row);
  };

  addStat('Lines', d3.format(',')(lines.length));
  addStat('Commits', d3.format(',')(commitCount));
  addStat('Files', d3.format(',')(fileCount));
  addStat('Authors', d3.format(',')(authorCount));
  addStat('Longest Line', d3.format(',')(d3.max(lines, (d) => d.length) ?? 0));
  addStat('Average Line Length', d3.format('.1f')(avgLineLength));
  addStat('Max Nesting Depth', d3.format(',')(maxDepth));
  addStat('Most Active File Type', byType[0]?.[0] ?? 'n/a');

  statsContainer.append(grid);
}

function updateTooltipContent(commit) {
  document.getElementById('commit-link').textContent = commit.id;
  document.getElementById('commit-link').href = commit.url;
  document.getElementById('commit-date').textContent = commit.date;
  document.getElementById('commit-tooltip-time').textContent = commit.time;
  document.getElementById('commit-author').textContent = commit.author;
  document.getElementById('commit-lines').textContent = d3.format(',')(commit.totalLines);
}

function showTooltip(event, commit) {
  updateTooltipContent(commit);
  tooltip.hidden = false;
  tooltip.style.left = `${event.clientX + 16}px`;
  tooltip.style.top = `${event.clientY + 16}px`;
}

function hideTooltip() {
  tooltip.hidden = true;
}

function isCommitSelected(commit) {
  return selectedCommits.includes(commit);
}

function toggleCommitSelection(event, commit) {
  const multiSelect = event.shiftKey || event.metaKey || event.ctrlKey;

  if (!multiSelect) {
    selectedCommits = [commit];
    updateSelectionUI();
    return;
  }

  if (isCommitSelected(commit)) {
    selectedCommits = selectedCommits.filter((d) => d !== commit);
  } else {
    selectedCommits = [...selectedCommits, commit];
  }

  updateSelectionUI();
}

function updateSelectionUI() {
  d3.selectAll('.commit-dot')
    .classed('selected', (d) => isCommitSelected(d))
    .attr('fill-opacity', (d) => (selectedCommits.length === 0 || isCommitSelected(d) ? 0.85 : 0.25));

  if (selectedCommits.length === 0) {
    selectionCount.textContent = 'No commits selected';
    languageBreakdown.innerHTML = '';
    return;
  }

  selectionCount.textContent = `${selectedCommits.length} commit${selectedCommits.length === 1 ? '' : 's'} selected`;

  const selectedLines = selectedCommits.flatMap((d) => d.lines);
  const byLang = d3
    .rollups(selectedLines, (vals) => vals.length, (d) => d.type)
    .sort((a, b) => d3.descending(a[1], b[1]));

  languageBreakdown.innerHTML = '';
  for (const [lang, count] of byLang) {
    const row = document.createElement('p');
    row.className = 'kv-line';
    row.innerHTML = `<strong>${lang}:</strong> <span>${d3.format(',')(count)} lines</span>`;
    languageBreakdown.append(row);
  }
}

function brushed(event) {
  const sel = event.selection;

  if (!sel) {
    selectedCommits = [];
    updateSelectionUI();
    return;
  }

  const [[x0, y0], [x1, y1]] = sel;
  selectedCommits = filteredCommits.filter((d) => {
    const cx = xScale(d.datetime);
    const cy = yScale(d.hourFrac);
    return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
  });

  updateSelectionUI();
}

function initializeScatterPlot() {
  yScale = d3.scaleLinear().domain([0, 24]).range([plotHeight, 0]);

  chart
    .append('g')
    .attr('class', 'grid y-grid')
    .call(d3.axisLeft(yScale).tickSize(-plotWidth).tickFormat(() => ''));

  chart.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${plotHeight})`);

  chart
    .append('g')
    .attr('class', 'y-axis')
    .call(d3.axisLeft(yScale).tickFormat((d) => `${String(Math.floor(d)).padStart(2, '0')}:00`));

  chart.append('g').attr('class', 'dots');

  const brush = d3.brush().extent([[0, 0], [plotWidth, plotHeight]]).on('start brush end', brushed);
  chart.append('g').attr('class', 'brush').call(brush);
}

function updateScatterPlot(currentCommits) {
  if (currentCommits.length === 0) {
    chart.select('.dots').selectAll('circle').remove();
    selectedCommits = [];
    updateSelectionUI();
    return;
  }

  xScale = d3.scaleTime().domain(d3.extent(currentCommits, (d) => d.datetime)).range([0, plotWidth]).nice();

  const [minLines, maxLines] = d3.extent(currentCommits, (d) => d.totalLines);
  rScale = d3
    .scaleSqrt()
    .domain([Math.max(1, minLines ?? 1), Math.max(1, maxLines ?? 1)])
    .range([3, 26]);

  chart.select('.x-axis').call(d3.axisBottom(xScale));

  const sortedCommits = d3.sort(currentCommits, (d) => -d.totalLines);

  const dots = chart
    .select('.dots')
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join(
      (enter) =>
        enter
          .append('circle')
          .attr('class', 'commit-dot')
          .attr('cx', (d) => xScale(d.datetime))
          .attr('cy', (d) => yScale(d.hourFrac))
          .attr('r', 0)
          .attr('fill', 'steelblue')
          .attr('fill-opacity', 0)
          .call((sel) =>
            sel
              .transition()
              .duration(300)
              .attr('r', (d) => rScale(d.totalLines))
              .attr('fill-opacity', 0.85),
          ),
      (update) =>
        update.call((sel) =>
          sel
            .transition()
            .duration(220)
            .attr('cx', (d) => xScale(d.datetime))
            .attr('cy', (d) => yScale(d.hourFrac))
            .attr('r', (d) => rScale(d.totalLines)),
        ),
      (exit) =>
        exit.call((sel) => sel.transition().duration(200).attr('r', 0).attr('fill-opacity', 0).remove()),
    );

  dots
    .on('mouseenter', (event, d) => showTooltip(event, d))
    .on('mousemove', (event, d) => showTooltip(event, d))
    .on('mouseleave', hideTooltip)
    .on('click', (event, d) => toggleCommitSelection(event, d));

  selectedCommits = selectedCommits.filter((d) => currentCommits.includes(d));
  updateSelectionUI();
}

function updateFileDisplay(currentCommits) {
  const lines = currentCommits.flatMap((d) => d.lines);
  const files = d3
    .groups(lines, (d) => d.file)
    .map(([name, fileLines]) => ({ name, lines: fileLines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const filesContainer = d3
    .select('#files')
    .selectAll('div')
    .data(files, (d) => d.name)
    .join((enter) =>
      enter.append('div').call((div) => {
        const dt = div.append('dt');
        dt.append('code');
        dt.append('small');
        div.append('dd');
      }),
    );

  filesContainer
    .select('dt > code')
    .html((d) => d.name);

  filesContainer
    .select('dt > small')
    .html((d) => `${d.lines.length} lines`);

  filesContainer
    .select('dd')
    .selectAll('div')
    .data((d) => d.lines)
    .join('div')
    .attr('class', 'loc')
    .style('--color', (d) => colors(d.type));
}

function onTimeSliderChange() {
  commitProgress = Number(commitProgressInput.value);
  commitMaxTime = timeScale.invert(commitProgress);
  commitTimeEl.textContent = commitMaxTime.toLocaleString('en', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
  updateScatterPlot(filteredCommits);
  updateFileDisplay(filteredCommits);
}

async function init() {
  const lines = await d3.csv('loc.csv', rowConverter);
  lines.sort((a, b) => d3.ascending(a.datetime, b.datetime));

  commits = groupCommits(lines);
  filteredCommits = commits;
  renderStats(lines);

  timeScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([0, 100]);

  initializeScatterPlot();

  commitProgressInput.addEventListener('input', onTimeSliderChange);
  onTimeSliderChange();
}

init().catch((error) => {
  statsContainer.innerHTML = `<p>Failed to load meta analysis data: ${error.message}</p>`;
});
