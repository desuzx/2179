const opts = { actions: false, tooltip: { theme: "custom" } };

const darkSwap = {
  '"#f4ebd0"': '"#221b14"',
  '"#ede1c2"': '"#2a221b"',
  '"#1a1410"': '"#f4ebd0"',
  '"#3a3026"': '"#c8baa0"',
  '"#5a4d3a"': '"#c8baa0"',
  '"#a89568"': '"#7a6748"',
  '"#c9b88a"': '"#3a3026"',
  '"#3a2a5c"': '"#a065c4"',
  '"#6e4ba0"': '"#c89cdb"',
  '"#e8a838"': '"#f5c45a"',
  '"#a04578"': '"#e84c8f"',
  '"#e0457b"': '"#ff6e9d"',
  '"#5fa752"': '"#8fce85"',
  '"#7065a1"': '"#c89cdb"',
};

async function embedDark(sel, url) {
  const r = await fetch(url);
  let txt = await r.text();
  for (const [k, v] of Object.entries(darkSwap)) {
    txt = txt.split(k).join(v);
  }
  return vegaEmbed(sel, JSON.parse(txt), opts);
}

// ═══ COUNTRY LINKED HIGHLIGHTING (hover-only) ═══
const linkedViews = [];

function broadcast(country) {
  linkedViews.forEach((v) => {
    try {
      v.signal("highlightCountry", country).run();
    } catch (e) {}
  });
}

function linkView(p, sel) {
  return p.then(({ view }) => {
    linkedViews.push(view);
    let last = "";
    view.addEventListener("mousemove", (ev, item) => {
      const c = item && item.datum && item.datum.Country;
      if (!c || c === last) return;
      last = c;
      broadcast(c);
    });
    const el = document.querySelector(sel);
    if (el)
      el.addEventListener("mouseleave", () => {
        if (!last) return;
        last = "";
        broadcast("");
      });
    return view;
  });
}

// Light sections
linkView(vegaEmbed("#map1", "charts/map_total_prize.json", opts), "#map1");
linkView(vegaEmbed("#map2", "charts/map_percapita.json", opts), "#map2");
vegaEmbed("#chart3", "charts/line_chart_earnings.json", opts);
vegaEmbed("#chart_stacked", "charts/stacked_area_normalized.json", opts);
vegaEmbed("#chart5", "charts/small_multiple.json", opts);
vegaEmbed("#chart_bubble", "charts/bubble_map_players.json", opts);
vegaEmbed("#chart_bump", "charts/bump_chart_games.json", opts);

// Dark sections
linkView(
  embedDark("#chart_dumbbell", "charts/dumbbell_rank.json"),
  "#chart_dumbbell",
);
embedDark("#chart6", "charts/timeline_tournaments.json");

// ═══ LOLLIPOP — filter ═══
let lollipopSpec = null;
let topAussies = null;
let lolFilter = "all";

function parseCSV(txt) {
  const lines = txt.trim().split(/\r?\n/);
  const header = lines.shift().split(",");
  return lines.map((line) => {
    const cols = line.split(",");
    const row = {};
    header.forEach((h, i) => (row[h.trim()] = cols[i]));
    row.Rank = +row.Rank;
    row.TotalEarnings = +row.TotalEarnings;
    row.IsAustralian = true;
    row.TopGame = row.TopGame || "—";
    return row;
  });
}

function buildLollipop() {
  if (!lollipopSpec) return null;
  const spec = JSON.parse(JSON.stringify(lollipopSpec));
  let values;
  if (lolFilter === "aussies" && topAussies) {
    values = topAussies.slice(0, 10);
    const textLayer = spec.layer.find((L) => L.mark && L.mark.type === "text");
    if (textLayer && textLayer.encoding && textLayer.encoding.text) {
      textLayer.encoding.text = {
        field: "TotalEarnings",
        type: "quantitative",
        format: "$,.2s",
      };
    }
  } else {
    values = spec.data.values.filter((d) => d.Rank <= 20);
  }
  spec.data = { values };
  return spec;
}

function renderLollipop() {
  const spec = buildLollipop();
  if (!spec) return;
  vegaEmbed("#chart7", spec, opts);
}

Promise.all([
  fetch("charts/lollipop_players.json").then((r) => r.json()),
  fetch("data/top_australians.csv").then((r) => r.text()),
]).then(([spec, csv]) => {
  lollipopSpec = spec;
  topAussies = parseCSV(csv);
  renderLollipop();
});

function bindSegmented(id, onChange) {
  const container = document.getElementById(id);
  container.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    container
      .querySelectorAll("button")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    onChange(btn.dataset.filter);
  });
}
bindSegmented("lol-filter", (v) => {
  lolFilter = v;
  renderLollipop();
});
