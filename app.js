// Current year in footer
document.getElementById("year").textContent = new Date().getFullYear();

// ===== Views (Grid / Map) + Filters (place + cars) + Gallery rows + Lightbox =====
// One shared "figures" array, shuffled on load, drives the grid, the city
// pills, the map's city panels and the lightbox's next/prev sequence.
// The map itself lives in map.js; the row layout in gallery.js and the viewer
// in lightbox.js (both shared with the main portfolio).
(function () {
  const bar = document.getElementById("filterBar");
  const carBar = document.getElementById("filterBarCars");
  const masonry = document.getElementById("masonry");
  const work = document.getElementById("work");
  const mapView = document.getElementById("mapView");
  const viewBtns = Array.from(document.querySelectorAll(".view-btn"));
  const figures = Array.from(masonry.querySelectorAll(".print"));

  // Shuffle once per page load (Fisher–Yates).
  for (let i = figures.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [figures[i], figures[j]] = [figures[j], figures[i]];
  }

  const allTags = Array.from(new Set(figures.map((f) => f.dataset.city))).sort();
  const cities = allTags.filter((tag) => tag !== "cars");
  const hasCars = allTags.includes("cars");
  const labelOf = (city) => city.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  cities.forEach((city) => {
    const btn = document.createElement("button");
    btn.className = "filter-pill";
    btn.dataset.filter = city;
    btn.textContent = labelOf(city);
    bar.appendChild(btn);
  });

  carBar.hidden = !hasCars;
  if (hasCars) {
    const btn = document.createElement("button");
    btn.className = "filter-pill cars-pill";
    btn.dataset.filter = "cars";
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 16V12l2-5h10l2 5v4M5 16h14M5 16v2.5M19 16v2.5M4 12h16"/><circle cx="8" cy="14" r=".8" fill="currentColor"/><circle cx="16" cy="14" r=".8" fill="currentColor"/></svg>Cars';
    carBar.appendChild(btn);
  }

  let currentFilter = "all";
  let currentView = "map"; // the map is the landing view (index.html starts in that state)

  function layout() {
    if (currentView === "grid") Gallery.layout(masonry, figures);
  }

  function applyFilter(filter) {
    currentFilter = filter;
    figures.forEach((f) => {
      // "All" means all places, not cars: cars only ever show under the Cars pill.
      f.hidden = filter === "all" ? f.dataset.city === "cars" : f.dataset.city !== filter;
    });
    [bar, carBar].forEach((container) => {
      container.querySelectorAll(".filter-pill").forEach((p) => {
        p.classList.toggle("active", p.dataset.filter === filter);
      });
    });
    layout();
  }

  function setView(view) {
    if (view === currentView) return;
    const leaving = currentView;
    currentView = view;
    viewBtns.forEach((b) => {
      const on = b.dataset.view === view;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", String(on));
    });
    document.body.classList.toggle("is-map", view === "map");
    work.hidden = view === "map";
    bar.hidden = view === "map";
    mapView.hidden = view !== "map";
    if (view === "grid") {
      if (window.TravelsMap && leaving === "map") TravelsMap.leave();
      applyFilter(currentFilter); // also pulls figures back out of any deck
    } else {
      carBar.querySelectorAll(".filter-pill").forEach((p) => p.classList.remove("active"));
      if (window.TravelsMap) TravelsMap.enter();
    }
  }

  viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));

  bar.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-pill");
    if (btn) applyFilter(btn.dataset.filter);
  });
  carBar.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-pill");
    if (!btn) return;
    setView("grid");
    applyFilter(currentFilter === "cars" ? "all" : "cars");
  });

  applyFilter("all");
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 150);
  });

  // Shared with map.js.
  window.Travels = { figures, setView, labelOf, view: () => currentView, deckItems: null };

  Lightbox.init({
    all: figures,
    // In a city panel on the map, next/prev stays inside that city.
    getItems: () => Travels.deckItems || figures.filter((f) => !f.hidden),
    // A shared photo link opens the grid behind it (cars switch to the Cars filter).
    reveal: (f) => {
      setView("grid");
      if (f.hidden) applyFilter(f.dataset.city);
    },
  });
})();
