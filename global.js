import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function loadData() {
  const data = await d3.json('temp_data.json');
  console.log(data);
  return data;
}

let data = await loadData();

