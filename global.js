import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function loadData() {
  const data = await d3.json('cmip_california_precip.json');
  return data;
}

let allData = await loadData();

const months = [
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov',
    'dec'
];

    // Set your seasons per month
const SEASON = {
  jan: "wet", feb: "wet", mar: "wet", apr: "dry", may: "dry",
  jun: "dry", jul: "dry", aug: "dry", sep: "dry",
  oct: "dry", nov: "wet", dec: "wet"
};

const monthLabel = m => m.charAt(0).toUpperCase() + m.slice(1);

// flatten rows {model, year, month, value}
const rows = allData.flatMap(d =>
  months.map(m => ({
    model: d.model,
    year: +d.year,
    month: m,
    value: d.mean_pr[m],
  }))
);


// select models
const MODEL_A = 'ssp2-45';
const MODEL_B = 'ssp1-26';

// get parts of page
const left  = d3.select('#chartLeft');
const right = d3.select('#chartRight');
const slider = d3.select('#slider');
const sliderValue = d3.select('#sliderValue');
const statsLeft  = d3.select('#statsLeft');
const statsRight = d3.select('#statsRight');

// get years
const years = Array.from(new Set(rows.map(r => r.year))).sort((a, b) => a - b);

// get year headers
const headerLeft  = d3.select('#headerLeft');
const headerRight = d3.select('#headerRight');

// select colors
const colorA = 'oklch(0.5087 0.1119 259.41)'; // Darker blue
const colorB = 'oklch(0.5087 0.1119 259.41)';  // Lighter Blue 

// oklch(0.6029 0.1283 235.05) Blue 
// oklch(0.7559 0.1579 69.88) Orange


// years by model
const yearsByModel = d3.rollup(
  rows,
  v => Array.from(new Set(v.map(d => d.year))).sort((a,b) => a-b),
  d => d.model
);

// slider across year range
slider
  .attr('min', 0)
  .attr('max', years.length - 1)
  .attr('step', 5)
  .attr('value', 0); // this is the start year

function currentYear() {
  const idx = +slider.node().value;
  return years[Math.max(0, Math.min(idx, years.length - 1))];
}

// tooltip feature
const tooltip = d3.select('body')
  .append('div').attr('id', 'tooltip');

// stats
function mean(arr) {
  return arr.length ? d3.mean(arr) : NaN;
}

function computeYearStats(model, year) {
  // Current-year monthly data
  const curr = rows.filter(r => r.model === model && r.year === year);

  // If no data, return safe blanks
  if (curr.length === 0) {
    return {
      year,
      avg: NaN,
      min: { month: '—', value: NaN },
      max: { month: '—', value: NaN },
      prevYear: null,
      nextYear: null,
      prevAvg: NaN,
      nextAvg: NaN
    };
  }

  const values = curr.map(d => d.value);
  const avg = mean(values);

  // Find min/max months
  const minRow = curr.reduce((a,b) => (a.value <= b.value ? a : b));
  const maxRow = curr.reduce((a,b) => (a.value >= b.value ? a : b));

  // Find previous/next year that exists for THIS model
  const list = yearsByModel.get(model) || years;
  const idx = list.indexOf(year);

  const prevYear = idx > 0 ? list[idx - 1] : null;
  const nextYear = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;

  const prevValues = prevYear
    ? rows.filter(r => r.model === model && r.year === prevYear).map(d => d.value)
    : [];
  const nextValues = nextYear
    ? rows.filter(r => r.model === model && r.year === nextYear).map(d => d.value)
    : [];

  return {
    year,
    avg,
    min: { month: monthLabel(minRow.month), value: minRow.value },
    max: { month: monthLabel(maxRow.month), value: maxRow.value },
    prevYear,
    nextYear,
    prevAvg: mean(prevValues),
    nextAvg: mean(nextValues)
  };
}

function fmt(v) {
  return Number.isFinite(v) ? v.toFixed(2) : '—';
}

function renderStats(container, stats, modelLabel) {
  // Build a small card-like layout; uses your panel-body styles
  const {
    year, avg, min, max, prevYear, nextYear, prevAvg, nextAvg
  } = stats;

  container.html(`
    <div class="stats-wrap">
      <div class="stats-title"><strong>${modelLabel} — ${year}</strong></div>
      <div class="stats-grid">
        <div><span class="k">Year Avg</span><span class="v">${fmt(avg)} mm/day</span></div>
        <div><span class="k">Lowest</span><span class="v">${min.month}: ${fmt(min.value)}</span></div>
        <div><span class="k">Highest</span><span class="v">${max.month}: ${fmt(max.value)}</span></div>
        <div><span class="k">Prev Year</span><span class="v">${prevYear ?? '—'} ${prevYear ? `(${fmt(prevAvg)})` : ''}</span></div>
        <div><span class="k">Next Year</span><span class="v">${nextYear ?? '—'} ${nextYear ? `(${fmt(nextAvg)})` : ''}</span></div>
      </div>
    </div>
  `);
}

// draw chart at current year
function draw() {
  const year = currentYear();

  // slider label
  sliderValue.text(year);

  // set 12 months per year
  const dataA = rows.filter(r => r.model === MODEL_A && r.year === year);
  const dataB = rows.filter(r => r.model === MODEL_B && r.year === year);

  // update year headers
  if (!headerLeft.empty())  headerLeft.text(`Model SSP2.45 — ${year}`);
  if (!headerRight.empty()) headerRight.text(`Model SSP1.26 — ${year}`);

  renderStats(statsLeft,  computeYearStats(MODEL_A, year), 'SSP2.45');
  renderStats(statsRight, computeYearStats(MODEL_B, year), 'SSP1.26');

  drawBarChart(left,  dataA, colorA, year);
  drawBarChart(right, dataB, colorB, year);
}

// resizing
window.addEventListener('resize', draw, { passive: true });

// activate draw() with slider
slider.on('input', e => {
  sliderValue.text(years[+e.target.value]);
  draw();
});

// each chart template
function drawBarChart(container, data, color, year) {
  container.selectAll('*').remove();

  // Build new legend
  const legendContainer = d3.select(container.node().parentNode).select(".chart-legend");

  // Clear existing legend
  legendContainer.html("");

  legendContainer.append("div")
    .attr("class", "chart-legend-item")
    .html(`
      <div class="chart-legend-swatch" style="background: rgba(59, 130, 246, 0.20)"></div>
      Wet months
    `);

  legendContainer.append("div")
    .attr("class", "chart-legend-item")
    .html(`
      <div class="chart-legend-swatch" style="background: rgba(245, 158, 11, 0.25)"></div>
      Dry months
    `);

  const node = container.node();
  const width = node.clientWidth;
  const height = node.clientHeight;
  const margin = { top: 10, right: 18, bottom: 38, left: 42 };

  const svg = container.append('svg')
    .attr('width', width)
    .attr('height', height);

  const innerW = width  - margin.left - margin.right;
  const innerH = height - margin.top  - margin.bottom;

  const g = svg.append('g')
    .attr('transform', `translate(${Number(margin.left)},${Number(margin.top)})`);

  // x scale
  const x = d3.scaleBand()
    .domain(months)
    .range([0, innerW])
    .padding(0.18);

  // y scale
  const yMax = Math.max(11, d3.max(data, d => d.value) ?? 11);
  const y = d3.scaleLinear()
    .domain([0, yMax]).nice()
    .range([innerH, 0]);

  // gridlines
  const grid = g.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(0, 0)`)
    .call(d3.axisLeft(y).tickFormat('').tickSize(-innerW).ticks(5));
  
    grid.select('.domain').remove();

  // axes
  const axisColor = '#1d1f37';
  g.append('g')
    .attr('transform', `translate(0, ${Number(innerH)})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('fill', axisColor)
    .style('font-size', '12px');
 
  g.append('g')
    .call(d3.axisLeft(y).ticks(5))
    .selectAll('text')
    .attr('fill', axisColor)
    .style('font-size', '12px');
  
  g.selectAll('.domain, .tick line').attr('stroke', 'rgba(0, 0, 0, 0.7)');
  grid.selectAll('line').attr('stroke', 'rgba(0, 0, 0, 0.15)');

  // bars
  g.selectAll('rect.bar')
    .data(data, d => d.month)
    .enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', d => x(d.month))
    .attr('y', d => y(d.value))
    .attr('width', x.bandwidth())
    .attr('height', d => innerH - y(d.value))
    .attr('fill', color)
    // .append('title')
    // .text(d => `${d.month.toUpperCase()}: ${d.value.toFixed(2)}`);
    .on('mouseenter', function(event, d) {
      d3.select(this).attr('opacity', 0.85);
      tooltip
        .style('opacity', 1)
        .html(`
          <div class="tt-month">${d.month.toUpperCase()} — ${year}</div>
          <div class="tt-value">${d.value.toFixed(2)} mm/day</div>
        `);
    })
    .on('mousemove', function(event) {
      tooltip
        .style('left', event.clientX + 6 + 'px')
        .style('top', (event.clientY -90) + 'px');
    })
    .on('mouseleave', function() {
      d3.select(this).attr('opacity', 1);
      tooltip.style('opacity', 0);
    });

    // 🔹 Background month bands (wet/dry)
  const categories = x.domain(); // ['jan','feb',...,'dec']

  const bands = g.append("g")
    .attr("class", "month-bands");

  bands.selectAll("rect.band")
    .data(categories)
    .join("rect")
      .attr("class", "band")
      .attr("x", m => x(m))
      .attr("y", 0)
      .attr("width", x.bandwidth())
      .attr("height", innerH)
      .attr("fill", m =>
        SEASON[m] === "dry"
          ? "rgba(245, 158, 11, 0.12)"   // dry
          : "rgba(59, 130, 246, 0.10)"   // wet
      )
      .attr("pointer-events", "none");

  // send the band group behind everything else
  bands.lower();

  // x label
  svg.append('text')
    .attr('class', 'x label')
    .attr('text-anchor', 'middle')
    .attr('x', width / 2)
    .attr('y', height - margin.bottom / 30)
    .style('font-size', '12px')
    .style('fill', '#444')
    .text('Month');

  // y label
  svg.append('text')
    .attr('class', 'y label')
    .attr('text-anchor', 'middle')
    .attr('x', -(height / 2))
    .attr('y', margin.left / 3)
    .attr('transform', 'rotate(-90)')
    .style('font-size', '12px')
    .style('fill', '#444')
    .text('Avg Precipitation (mm/day)');

}

// render on page start
draw();