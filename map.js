// ===== Travels map =====
// The landing view of Travels. Europe -> click a highlighted country -> it zooms
// in and shows its city pins -> click a city -> a panel of that city's photos
// slides in (a bottom sheet on phones) -> click a photo -> the shared lightbox.
//
// Adding a city or country: add it to COUNTRIES and CITY_AT below. The city key
// must match the data-city value used in index.html.
window.TravelsMap = (function () {
  const COUNTRIES = {
    belgium: { id: "056", name: "Belgium", cities: ["ghent", "brugge", "antwerp", "leuven", "brussels"] },
    turkey: { id: "792", name: "Türkiye", cities: ["istanbul", "ankara", "cappadocia", "antalya", "izmir"] },
  };
  // [longitude, latitude]; Cappadocia is pinned at Göreme.
  const CITY_AT = {
    ghent: [3.7174, 51.0543], brugge: [3.2247, 51.2093], antwerp: [4.4025, 51.2194],
    leuven: [4.7005, 50.8798], brussels: [4.3517, 50.8503],
    istanbul: [28.9784, 41.0082], ankara: [32.8597, 39.9334], cappadocia: [34.829, 38.6431],
    antalya: [30.7133, 36.8969], izmir: [27.1428, 38.4237],
  };
  // Which side of the pin each label sits on, so close neighbours don't overlap
  // and edge cities don't get clipped on narrow screens. Default: right.
  const LABEL_SIDE = {
    brugge: "above", ghent: "below", brussels: "below",
    istanbul: "above", izmir: "below",
  };

  const LIBS = [
    "https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js",
    "https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js",
  ];
  const WORLD = "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json";
  const EASE = "cubic-bezier(.22,.8,.24,1)";
  const isSheet = () => window.innerWidth <= 700; // phones: bottom sheet instead of side panel

  const frame = document.getElementById("mapFrame");
  const svgEl = document.getElementById("mapSvg");
  const labelsEl = document.getElementById("mapLabels");
  const pinsEl = document.getElementById("mapPins");
  const crumbsEl = document.getElementById("mapCrumbs");
  const citiesEl = document.getElementById("mapCities");
  const loadingEl = document.getElementById("mapLoading");

  let ready = null; // promise once the map is built
  let features, projection, path, svg, gLand, zoom;
  let transform = null;
  let focus = null; // country key
  let openCity = null;
  let deckEl = null;

  const cityFigs = (city) => Travels.figures.filter((f) => f.dataset.city === city);
  const countOf = (key) => COUNTRIES[key].cities.reduce((n, c) => n + cityFigs(c).length, 0);
  const countryOfId = (id) => Object.keys(COUNTRIES).find((k) => COUNTRIES[k].id === id);

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  // ----- Build -----
  async function build() {
    try {
      for (const src of LIBS) await loadScript(src);
      const world = await fetch(WORLD).then((r) => r.json());
      features = topojson.feature(world, world.objects.countries).features;
    } catch (e) {
      loadingEl.textContent = "The map couldn't load. Try the Grid view.";
      throw e;
    }

    svg = d3.select(svgEl);
    gLand = svg.append("g").attr("class", "land-layer");
    zoom = d3.zoom().filter(() => false).on("zoom", (e) => {
      transform = e.transform;
      gLand.attr("transform", transform);
      placeOverlays();
    });
    svg.call(zoom);

    gLand.selectAll("path")
      .data(features)
      .join("path")
      .attr("class", (d) => (countryOfId(d.id) ? "land visited" : "land"))
      .on("click", (e, d) => { const k = countryOfId(d.id); if (k && k !== focus) focusCountry(k); })
      .on("mouseenter", (e, d) => { const k = countryOfId(d.id); if (k) labelsEl.querySelector(`[data-k="${k}"]`)?.classList.add("hover"); })
      .on("mouseleave", () => labelsEl.querySelectorAll(".hover").forEach((x) => x.classList.remove("hover")));

    // Country labels (Europe view)
    Object.keys(COUNTRIES).forEach((k) => {
      const b = document.createElement("button");
      b.className = "country-label";
      b.dataset.k = k;
      b.innerHTML = `<strong>${COUNTRIES[k].name}</strong><span>${countOf(k)} photos</span>`;
      b.addEventListener("click", () => focusCountry(k));
      labelsEl.appendChild(b);
    });

    // City pins
    Object.keys(COUNTRIES).forEach((k) => {
      COUNTRIES[k].cities.forEach((c) => {
        const n = cityFigs(c).length;
        if (!n) return;
        const pin = document.createElement("button");
        pin.className = "pin pin-" + (LABEL_SIDE[c] || "right");
        pin.dataset.city = c;
        pin.dataset.k = k;
        pin.setAttribute("aria-label", `${Travels.labelOf(c)}, ${n} photos`);
        pin.innerHTML = `<span class="pin-dot"></span><span class="pin-label">${Travels.labelOf(c)}<em>${n}</em></span>`;
        pin.addEventListener("click", (e) => { e.stopPropagation(); openDeck(c); });
        // Hover previews only for a real mouse; on touch the tap opens the city.
        pin.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") showPreview(pin, c); });
        pin.addEventListener("pointerleave", hidePreview);
        pinsEl.appendChild(pin);
      });
    });

    project();
    crumbs();
    loadingEl.hidden = true;

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!frame.offsetParent) return;
        project();
        if (focus) zoomToCountry(focus, true);
      }, 150);
    });
  }

  function project() {
    const W = frame.clientWidth, H = frame.clientHeight;
    svg.attr("viewBox", `0 0 ${W} ${H}`);
    const box = { type: "MultiPoint", coordinates: [[-10, 34.5], [45, 35], [-10, 60], [45, 58], [16, 63]] };
    projection = d3.geoAzimuthalEqualArea().rotate([-18, -48]).clipAngle(90)
      .fitExtent([[16, 16], [W - 16, H - 16]], box);
    path = d3.geoPath(projection);
    gLand.selectAll("path").attr("d", path);
    if (!focus) svg.call(zoom.transform, d3.zoomIdentity);
    placeOverlays();
  }

  function placeOverlays() {
    if (!projection) return;
    const t = transform || d3.zoomIdentity;
    labelsEl.querySelectorAll(".country-label").forEach((el) => {
      const f = features.find((x) => x.id === COUNTRIES[el.dataset.k].id);
      const [x, y] = path.centroid(f);
      el.style.transform = `translate(${t.applyX(x)}px, ${t.applyY(y)}px)`;
    });
    pinsEl.querySelectorAll(".pin").forEach((el) => {
      const [x, y] = projection(CITY_AT[el.dataset.city]);
      el.style.transform = `translate(${t.applyX(x)}px, ${t.applyY(y)}px)`;
    });
  }

  // ----- Navigation -----
  function setHash() {
    if (!frame.offsetParent) return;
    // The map is the landing view, so the plain URL means "Europe".
    const h = focus ? "#map/" + focus + (openCity ? "/" + openCity : "") : "";
    history.replaceState(history.state, "", location.pathname + location.search + h);
  }

  function crumbs() {
    const parts = [`<button data-go="europe">Map</button>`];
    if (focus) parts.push(`<button data-go="country">${COUNTRIES[focus].name}</button>`);
    if (openCity) parts.push(`<span>${Travels.labelOf(openCity)}</span>`);
    crumbsEl.innerHTML = parts.join("<i>›</i>");
    citiesEl.innerHTML = "";
    if (focus && !openCity) {
      COUNTRIES[focus].cities.forEach((c, i) => {
        const n = cityFigs(c).length;
        if (!n) return;
        const b = document.createElement("button");
        b.textContent = `${Travels.labelOf(c)} · ${n}`;
        b.style.animationDelay = 0.4 + i * 0.05 + "s";
        b.addEventListener("click", () => openDeck(c));
        citiesEl.appendChild(b);
      });
    }
  }
  crumbsEl.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.go === "europe") showEurope();
    else closeDeck();
  });

  // Room the open panel takes from the map, so the country can sit beside it.
  function deckShift() {
    if (!openCity) return { x: 0, y: 0 };
    const W = frame.clientWidth, H = frame.clientHeight;
    if (isSheet()) return { x: 0, y: -(H * 0.62) / 2 };
    return { x: -Math.min(460, W) / 2, y: 0 };
  }

  // instant: true = jump, "slide" = short move beside the panel, false = full zoom
  function zoomToCountry(k, instant) {
    const f = features.find((x) => x.id === COUNTRIES[k].id);
    const [[x0, y0], [x1, y1]] = path.bounds(f);
    const sh = deckShift();
    const W = frame.clientWidth - Math.abs(sh.x) * 2, H = frame.clientHeight - Math.abs(sh.y) * 2;
    const fill = window.innerWidth <= 560 ? 0.88 : 0.74; // phones: use more of the narrow screen
    const s = Math.min(60, fill / Math.max((x1 - x0) / W, (y1 - y0) / H));
    const cx = frame.clientWidth / 2 + sh.x, cy = frame.clientHeight / 2 + sh.y;
    const t = d3.zoomIdentity.translate(cx - (s * (x0 + x1)) / 2, cy - (s * (y0 + y1)) / 2).scale(s);
    if (instant === true) svg.call(zoom.transform, t);
    else svg.transition().duration(instant === "slide" ? 650 : 1000).ease(d3.easeCubicInOut).call(zoom.transform, t);
  }

  function focusCountry(k, { instant = false } = {}) {
    closeDeck(true);
    focus = k;
    frame.classList.add("focused");
    gLand.selectAll("path").classed("in-focus", (d) => d.id === COUNTRIES[k].id);
    pinsEl.querySelectorAll(".pin").forEach((p, i) => {
      const on = p.dataset.k === k;
      p.classList.toggle("show", on);
      p.style.transitionDelay = on && !instant ? 0.55 + i * 0.05 + "s" : "0s";
    });
    zoomToCountry(k, instant);
    crumbs();
    setHash();
  }

  function showEurope() {
    closeDeck(true);
    focus = null;
    frame.classList.remove("focused");
    gLand.selectAll("path").classed("in-focus", false);
    pinsEl.querySelectorAll(".pin").forEach((p) => { p.classList.remove("show"); p.style.transitionDelay = "0s"; });
    svg.transition().duration(900).ease(d3.easeCubicInOut).call(zoom.transform, d3.zoomIdentity);
    crumbs();
    setHash();
  }

  // ----- Hover preview (mouse only) -----
  let previewEl = null;
  function showPreview(pin, c) {
    hidePreview();
    const t = cityFigs(c)[0].querySelector("img.shot");
    previewEl = document.createElement("div");
    previewEl.className = "pin-preview";
    previewEl.innerHTML = `<img src="${t.getAttribute("src")}" alt="">`;
    pin.appendChild(previewEl);
  }
  function hidePreview() { if (previewEl) { previewEl.remove(); previewEl = null; } }

  // ----- City panel -----
  function openDeck(c) {
    if (openCity === c && deckEl) return;
    closeDeck(true);
    hidePreview();
    openCity = c;
    const figs = cityFigs(c);
    // A city is at most a couple of dozen thumbnails: load them now rather than
    // relying on lazy-loading inside the panel's own scroll area.
    figs.forEach((f) => { f.hidden = false; f.querySelector("img.shot").loading = "eager"; });
    Travels.deckItems = figs;
    pinsEl.querySelectorAll(".pin").forEach((p) => p.classList.toggle("active", p.dataset.city === c));
    frame.classList.add("deck-open");

    deckEl = document.createElement("div");
    deckEl.className = "deck";
    deckEl.setAttribute("role", "dialog");
    deckEl.setAttribute("aria-label", `${Travels.labelOf(c)} photos`);
    deckEl.innerHTML = `
      <div class="deck-grab" aria-hidden="true"></div>
      <div class="deck-head">
        <div><h2>${Travels.labelOf(c)}</h2><span>${figs.length} photos</span></div>
        <button class="deck-close" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
      <div class="deck-body"><div class="deck-grid"></div></div>`;
    deckEl.querySelector(".deck-close").addEventListener("click", () => closeDeck());
    frame.appendChild(deckEl);

    const grid = deckEl.querySelector(".deck-grid");
    Gallery.layout(grid, figs, { target: isSheet() ? 130 : 150, pad: isSheet() ? 14 : 24 });
    enableSwipeToClose();

    deckEl.animate(
      [{ transform: isSheet() ? "translateY(100%)" : "translateX(100%)" }, { transform: "none" }],
      { duration: 520, easing: EASE }
    );
    figs.forEach((f, i) => {
      f.animate([{ transform: "translateY(24px)", opacity: 0 }, { transform: "none", opacity: 1 }],
        { duration: 480, delay: 200 + Math.min(i, 14) * 40, easing: EASE, fill: "backwards" });
    });
    if (focus) zoomToCountry(focus, "slide");
    crumbs();
    setHash();
  }

  // Phones: drag the sheet's top edge down to close it.
  function enableSwipeToClose() {
    const handle = [deckEl.querySelector(".deck-grab"), deckEl.querySelector(".deck-head")];
    const el = deckEl;
    let y0 = null, dy = 0, t0 = 0;
    handle.forEach((h) => {
      h.addEventListener("pointerdown", (e) => {
        if (!isSheet() || e.target.closest(".deck-close")) return;
        y0 = e.clientY; dy = 0; t0 = performance.now();
        h.setPointerCapture(e.pointerId);
        el.style.transition = "none";
      });
      h.addEventListener("pointermove", (e) => {
        if (y0 === null) return;
        dy = Math.max(0, e.clientY - y0);
        el.style.transform = `translateY(${dy}px)`;
      });
      const end = () => {
        if (y0 === null) return;
        y0 = null;
        const fast = dy / Math.max(1, performance.now() - t0) > 0.5;
        if (dy > 90 || (fast && dy > 30)) { closeDeck(false, dy); return; }
        el.style.transition = `transform .28s ${EASE}`;
        el.style.transform = "";
      };
      h.addEventListener("pointerup", end);
      h.addEventListener("pointercancel", end);
    });
  }

  function closeDeck(instant = false, fromY = 0) {
    if (!deckEl) { openCity = null; Travels.deckItems = null; return; }
    const el = deckEl;
    deckEl = null;
    openCity = null;
    Travels.deckItems = null;
    pinsEl.querySelectorAll(".pin.active").forEach((p) => p.classList.remove("active"));
    frame.classList.remove("deck-open");
    if (focus) crumbs();
    setHash();
    if (instant) { el.remove(); return; }
    if (focus) zoomToCountry(focus, "slide");
    el.style.transition = "none";
    const out = isSheet()
      ? [{ transform: `translateY(${fromY}px)` }, { transform: "translateY(100%)" }]
      : [{ transform: "none" }, { transform: "translateX(100%)" }];
    const a = el.animate(out, { duration: 320, easing: EASE, fill: "forwards" });
    const done = () => el.remove();
    a.finished.then(done, done);
    setTimeout(done, 450);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !frame.offsetParent) return;
    if (document.getElementById("lightbox").classList.contains("open")) return;
    if (deckEl) closeDeck();
    else if (focus) showEurope();
  });

  // ----- Enter / leave (called by app.js when the view switches) -----
  async function enter() {
    if (!ready) ready = build();
    await ready;
    project();
    if (focus) zoomToCountry(focus, true);
    setHash();
  }
  function leave() {
    closeDeck(true);
    if (location.hash.startsWith("#map")) history.replaceState(history.state, "", location.pathname + location.search);
  }

  // ----- Start: the map is the landing view -----
  // #map, #map/belgium, #map/belgium/ghent open straight to that place.
  async function boot() {
    if (Travels.view() !== "map") return; // e.g. a shared photo link switched to the grid
    const [, k, c] = location.hash.startsWith("#map") ? location.hash.slice(1).split("/") : [];
    await enter();
    if (k && COUNTRIES[k]) {
      focusCountry(k, { instant: true });
      if (c && COUNTRIES[k].cities.includes(c)) setTimeout(() => openDeck(c), 250);
    }
  }

  return { enter, leave, boot };
})();

TravelsMap.boot();
