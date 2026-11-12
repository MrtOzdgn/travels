// ===== Justified-row gallery =====
// Shared by the main portfolio and Travels (keep both copies identical).
//
// Lays the visible figures out in rows that read left to right, then the next
// row. Every photo in a row gets the same height, and each row is scaled so it
// fills the width exactly — no ragged column ends. The last row keeps the
// target height and sits left-aligned instead of being stretched.
window.Gallery = (function () {
  const CARD_PAD = 24; // .print has 12px padding on each side

  function targetHeight(vw) {
    if (vw <= 560) return 0; // phones: one photo per row, full width
    if (vw <= 900) return 300;
    if (vw <= 1300) return 360;
    return 420;
  }

  function ratio(f) {
    const img = f.querySelector("img.shot");
    const w = +img.getAttribute("width") || img.naturalWidth || 3;
    const h = +img.getAttribute("height") || img.naturalHeight || 2;
    return w / h;
  }

  function layout(container, figures) {
    const visible = figures.filter((f) => !f.hidden);
    const gap = parseFloat(getComputedStyle(container).rowGap) || 26;
    const W = container.clientWidth - 0.5; // sub-pixel safety so rows never overflow
    const target = targetHeight(window.innerWidth);

    // Height a row would need to fill the width exactly.
    const fitHeight = (n, sumAr) => (W - n * CARD_PAD - (n - 1) * gap) / sumAr;

    const rows = [];
    let row = [], sumAr = 0;
    visible.forEach((f) => {
      const ar = ratio(f);
      if (!target) { rows.push({ figs: [f], h: fitHeight(1, ar) }); return; }

      const prevH = row.length ? fitHeight(row.length, sumAr) : Infinity;
      const h = fitHeight(row.length + 1, sumAr + ar);
      if (h > target) { row.push(f); sumAr += ar; return; }

      // Adding this photo pushes the row below the target height. Close the row
      // with or without it, whichever lands closer to the target.
      if (row.length && Math.abs(Math.log(prevH / target)) < Math.abs(Math.log(h / target))) {
        rows.push({ figs: row, h: prevH });
        row = [f]; sumAr = ar;
      } else {
        row.push(f); sumAr += ar;
        rows.push({ figs: row, h });
        row = []; sumAr = 0;
      }
    });
    if (row.length) rows.push({ figs: row, h: Math.min(target, fitHeight(row.length, sumAr)) });

    const els = rows.map(({ figs, h }) => {
      const el = document.createElement("div");
      el.className = "gal-row";
      figs.forEach((f) => {
        f.style.width = h * ratio(f) + CARD_PAD + "px";
        el.appendChild(f);
      });
      return el;
    });
    container.replaceChildren(...els);
  }

  return { layout };
})();
