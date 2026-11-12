// Current year in footer
document.getElementById("year").textContent = new Date().getFullYear();

// ===== Filters (place + cars) + Gallery rows + Lightbox =====
// One shared "figures" array, shuffled on load, drives everything: which
// pills exist, which photos are visible, how they're laid out, and the
// lightbox's next/prev sequence, so the reading order (left to right, then
// the next row) is the same everywhere. Row layout lives in gallery.js and
// the viewer in lightbox.js, both shared with the main portfolio.
(function () {
  const bar = document.getElementById("filterBar");
  const carBar = document.getElementById("filterBarCars");
  const masonry = document.getElementById("masonry");
  const figures = Array.from(masonry.querySelectorAll(".print"));

  // Shuffle once per page load (Fisher–Yates), so every visit shows a fresh
  // order. Layout, filters and the lightbox all read this same array, so they
  // stay consistent with each other within a visit.
  for (let i = figures.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [figures[i], figures[j]] = [figures[j], figures[i]];
  }

  const allTags = Array.from(new Set(figures.map((f) => f.dataset.city))).sort();
  const cities = allTags.filter((tag) => tag !== "cars");
  const hasCars = allTags.includes("cars");

  cities.forEach((city) => {
    const label = city.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const btn = document.createElement("button");
    btn.className = "filter-pill";
    btn.dataset.filter = city;
    btn.textContent = label;
    bar.appendChild(btn);
  });

  carBar.hidden = !hasCars;
  if (hasCars) {
    const btn = document.createElement("button");
    btn.className = "filter-pill";
    btn.dataset.filter = "cars";
    btn.textContent = "Cars";
    carBar.appendChild(btn);
  }

  function layout() {
    Gallery.layout(masonry, figures);
  }

  function applyFilter(filter) {
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

  [bar, carBar].forEach((container) => {
    container.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-pill");
      if (!btn) return;
      applyFilter(btn.dataset.filter);
    });
  });

  applyFilter("all");
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 150);
  });

  // Shared links can point at a car, which "All" hides: switch to its filter first.
  Lightbox.init({
    all: figures,
    getItems: () => figures.filter((f) => !f.hidden),
    reveal: (f) => { if (f.hidden) applyFilter(f.dataset.city); },
  });
})();
