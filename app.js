// Current year in footer
document.getElementById("year").textContent = new Date().getFullYear();

// ===== Filters: place (city) and category (cars) =====
// Pills are generated from whatever data-city values are actually on the page,
// so adding a new city or the "cars" category via the intake tool needs no HTML
// changes here. "cars" is kept in its own bar/button, separate from places: a car
// photo is reachable only via the Cars pill, never via a city pill, even if it
// was shot in a city that also has its own place pill.
(function () {
  const bar = document.getElementById("filterBar");
  const carBar = document.getElementById("filterBarCars");
  const figures = Array.from(document.querySelectorAll(".print"));

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
  }

  [bar, carBar].forEach((container) => {
    container.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-pill");
      if (!btn) return;
      applyFilter(btn.dataset.filter);
    });
  });
})();

// ===== Lightbox =====
(function () {
  const lb = document.getElementById("lightbox");
  const lbImg = lb.querySelector(".lb-img");
  const btnClose = lb.querySelector(".lb-close");
  const btnPrev = lb.querySelector(".lb-prev");
  const btnNext = lb.querySelector(".lb-next");

  let visible = [];
  let index = -1;

  // Recomputed on every open so the lightbox only ever cycles through
  // whatever the current city filter is showing.
  function visibleImgs() {
    return Array.from(document.querySelectorAll("img.shot")).filter(
      (el) => !el.closest(".print").hidden
    );
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

  document.querySelectorAll("img.shot").forEach((el) =>
    el.addEventListener("click", () => open(el))
  );

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
