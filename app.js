// Current year in footer
document.getElementById("year").textContent = new Date().getFullYear();

// ===== City filter =====
// Pills are generated from whatever data-city values are actually on the page,
// so adding a new city via the intake tool needs no HTML changes here.
(function () {
  const bar = document.getElementById("filterBar");
  const figures = Array.from(document.querySelectorAll(".print"));

  const cities = Array.from(new Set(figures.map((f) => f.dataset.city))).sort();
  cities.forEach((city) => {
    const label = city.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const btn = document.createElement("button");
    btn.className = "filter-pill";
    btn.dataset.filter = city;
    btn.textContent = label;
    bar.appendChild(btn);
  });

  function applyFilter(filter) {
    figures.forEach((f) => {
      f.hidden = filter !== "all" && f.dataset.city !== filter;
    });
    bar.querySelectorAll(".filter-pill").forEach((p) => {
      p.classList.toggle("active", p.dataset.filter === filter);
    });
  }

  bar.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-pill");
    if (!btn) return;
    applyFilter(btn.dataset.filter);
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
