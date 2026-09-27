// Current year in footer
document.getElementById("year").textContent = new Date().getFullYear();

// ===== Filters (place + cars) + Masonry + Lightbox =====
// One shared "figures" array, in source order, drives everything: which
// pills exist, which photos are visible, how they're laid out, and the
// lightbox's next/prev sequence. That keeps "reading order" consistent
// everywhere: left to right, then top to bottom, always matching each
// filter's own rank order — never "whichever column it happened to land
// in," which is what plain CSS column-count masonry would do.
(function () {
  const bar = document.getElementById("filterBar");
  const carBar = document.getElementById("filterBarCars");
  const masonry = document.getElementById("masonry");
  const figures = Array.from(masonry.querySelectorAll(".print"));

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

  function columnCountFor(width) {
    if (width <= 560) return 1;
    if (width <= 900) return 2;
    return 3;
  }

  // Round-robin only the currently-visible figures across N columns, in
  // their relative source order, so every filter view reads left to right
  // in rank order with no gaps left by hidden photos.
  function layoutMasonry() {
    const visible = figures.filter((f) => !f.hidden);
    const n = columnCountFor(window.innerWidth);
    const cols = Array.from({ length: n }, () => document.createElement("div"));
    cols.forEach((col) => (col.className = "masonry-col"));
    visible.forEach((fig, i) => cols[i % n].appendChild(fig));
    masonry.replaceChildren(...cols);
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
    layoutMasonry();
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
    resizeTimer = setTimeout(layoutMasonry, 150);
  });

  // ----- Lightbox -----
  const lb = document.getElementById("lightbox");
  const lbImg = lb.querySelector(".lb-img");
  const btnClose = lb.querySelector(".lb-close");
  const btnPrev = lb.querySelector(".lb-prev");
  const btnNext = lb.querySelector(".lb-next");

  let visible = [];
  let index = -1;

  // Recomputed on every open, from the master list (not a DOM query), so
  // it always reflects the current filter's own rank order.
  function visibleImgs() {
    return figures.filter((f) => !f.hidden).map((f) => f.querySelector("img.shot"));
  }

  function show(i) {
    index = (i + visible.length) % visible.length;
    const el = visible[index];
    lbImg.src = el.dataset.full;
    lbImg.alt = el.alt;
  }

  function open(el) {
    visible = visibleImgs();
    show(visible.indexOf(el));
    lb.classList.add("open");
    lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function close() {
    lb.classList.remove("open");
    lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    lbImg.src = "";
  }

  figures.forEach((f) => {
    const el = f.querySelector("img.shot");
    el.addEventListener("click", () => open(el));
  });

  btnClose.addEventListener("click", close);
  btnNext.addEventListener("click", (e) => { e.stopPropagation(); show(index + 1); });
  btnPrev.addEventListener("click", (e) => { e.stopPropagation(); show(index - 1); });

  lb.addEventListener("click", (e) => { if (e.target === lb) close(); });

  document.addEventListener("keydown", (e) => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") show(index + 1);
    else if (e.key === "ArrowLeft") show(index - 1);
  });
})();
