import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function loadData() {
  const data = await d3.json('temp_data.json',);
  return data;
}

let allData = await loadData();

const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

// Flatten data to rows: {model, year, month, value}
const rows = allData.flatMap(d =>
  months.map(m => ({
    model: d.model,
    year: d.year,
    month: m,
    value: d.mean_pr[m]
  }))
);

//Split data for the models
const dataA = rows.filter(d => d.model == 'SSP2.45');
const dataB = rows.filter(d => d.model == 'SSP1.26');

const left = d3.select('#chartLeft');
const right = d3.select('#chartRight');

const colorA = "oklch(0.6029 0.1283 235.05)";
const colorB = "oklch(0.7559 0.1579 69.88)";

const draw = () => {
    drawBarChart(left, dataA, colorA);
    drawBarChart(right, dataB, colorB);
  };

window.addEventListener("resize", draw, { passive: true });


function drawBarChart(container, data, color) {
  container.selectAll("*").remove();

  // Chart set up and formatting 
  const node = container.node();
  const width = node.clientWidth;
  const height = node.clientHeight;
  const margin = {
    top: 10,
    right: 18,
    bottom: 38,
    left: 42
  };

  const svg = container.append("svg")
  .attr("width", width)
  .attr("height", height)

  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom

  const g = svg
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);


  // Scale and format the axes
  const xScale = d3.scaleBand()
  .domain(data.map(d => d.month))
  .range([0, innerW])
  .padding(0.18);

  const yScale = d3.scaleLinear()
  .domain([0, d3.max(data, d => d.value)])
  .nice()
  .range([innerH, 0]);

  // Draw the gridlines
  const gridLines = g.append('g')
  .attr('class', 'gridlines')
  .attr('transform', `translate(${margin.right}, 0)`)

  gridLines.call(
    d3.axisLeft(yScale)
    .tickFormat('')
    .tickSize(-innerW)
    .ticks(5)
  );

  gridLines.select(".domain").remove();

  // Draw the Axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale).ticks(5);

  const axisColor = '#1d1f37'
  
  g
  .append('g')
  .attr('transform', `translate(0, ${innerH})`)
  .call(xAxis)
  .selectAll("text")
  .attr("fill", axisColor)
  .style("font-size", "12px");;

  g
  .append("g")
  .call(yAxis)
  .selectAll("text")
  .attr("fill", axisColor)
  .style("font-size", "12px");

  // Color for axis lines
  g
  .selectAll(".domain, .tick line")
  .attr("stroke", "rgba(0, 0, 0, 0.7)");

  // Color for grid lines
  gridLines.selectAll('line')
  .attr('stroke', "rgba(0, 0, 0, 0.15)");

  // Draw the bars
  g.selectAll("rect.bar")
  .data(data)
  .enter().append("rect")
  .attr("class", "bar")
  .attr("x", d => xScale(d.month))
  .attr("y", d => yScale(d.value))
  .attr("width", xScale.bandwidth())
  .attr("height", d => innerH - yScale(d.value))
  // .attr("rx", 4)
  .attr("fill", color)
}

draw();