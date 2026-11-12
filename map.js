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
  // The photo shown when hovering a city pin: an iconic scene, chosen by Mert
  // (Nov 2026). File name without extension, inside images/<city>/. Ask him
  // before changing one, and add one for every new city.
  const COVER = {
    ghent: "02-belfry-rooftop-panorama",
    brugge: "01-rozenhoedkaai-canal-flowers",
    antwerp: "02-antwerpen-centraal-facade",
    leuven: "04-university-library-tower",
    brussels: "03-manneken-pis",
    istanbul: "11-galata-bridge-new-mosque",
    ankara: "05-highway-sunset-overpass",
    cappadocia: "08-valley-sunset",
    antalya: "01-stormy-beach-mountains",
    izmir: "01-boat-silhouette-bw",
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
  let features, landShape, projection, path, svg, gLand, gCountries, zoom;
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

  // The frame must never scroll: if anything (e.g. the lightbox bringing a panel
  // photo into view) nudges it, snap it back so the map, buttons and breadcrumb
  // stay where they belong. (Backup for browsers without overflow: clip.)
  frame.addEventListener("scroll", () => {
    if (frame.scrollTop || frame.scrollLeft) { frame.scrollTop = 0; frame.scrollLeft = 0; }
  });

  // Scrolling over the map zooms the map and never scrolls the page, including at
  // the zoom limits (where d3 stops calling preventDefault) and over the pins and
  // labels that sit on top of the map. The city panel keeps its own scrolling.
  frame.addEventListener("wheel", (e) => {
    if (!e.target.closest(".deck")) e.preventDefault();
  }, { passive: false });

  // ----- Build -----
  async function build() {
    try {
      for (const src of LIBS) await loadScript(src);
      const world = await fetch(WORLD).then((r) => r.json());
      features = topojson.feature(world, world.objects.countries).features;
      landShape = topojson.feature(world, world.objects.land);
    } catch (e) {
      loadingEl.textContent = "The map couldn't load. Try the Grid view.";
      throw e;
    }

    svg = d3.select(svgEl);
    svg.append("defs");
    gLand = svg.append("g").attr("class", "land-layer");
    // Bottom to top: lat/long grid, "water lines" echoing the coast, countries, coastline.
    gLand.append("path").attr("class", "graticule").datum(d3.geoGraticule().step([5, 5])());
    const gWater = gLand.append("g").attr("class", "waterlines");
    [0, 1, 2].forEach((i) => gWater.append("path").attr("class", "wl wl" + i).datum(landShape));
    gCountries = gLand.append("g").attr("class", "countries");
    // Drag to pan, scroll / pinch to zoom. Double-click is left to the countries.
    zoom = d3.zoom()
      .scaleExtent([0.8, 80])
      .filter((e) => (!e.ctrlKey || e.type === "wheel") && !e.button && e.type !== "dblclick")
      .on("start", (e) => { if (e.sourceEvent) frame.classList.add("dragging"); })
      .on("end", () => frame.classList.remove("dragging"))
      .on("zoom", (e) => {
        transform = e.transform;
        gLand.attr("transform", transform);
        // Zoomed in by hand: show every city pin, hide the country badges.
        frame.classList.toggle("near", transform.k >= 3);
        placeOverlays();
      });
    svg.call(zoom).on("dblclick.zoom", null);

    // Zoom buttons and "back to start"
    frame.querySelector(".map-zoom-in").addEventListener("click", () => svg.transition().duration(350).call(zoom.scaleBy, 1.7));
    frame.querySelector(".map-zoom-out").addEventListener("click", () => svg.transition().duration(350).call(zoom.scaleBy, 1 / 1.7));
    frame.querySelector(".map-home").addEventListener("click", () => showEurope());

    gCountries.selectAll("path")
      .data(features)
      .join("path")
      .attr("class", (d) => (countryOfId(d.id) ? "land visited" : "land"))
      .on("click", (e, d) => { const k = countryOfId(d.id); if (k && k !== focus) focusCountry(k); })
      .on("mouseenter", (e, d) => { const k = countryOfId(d.id); if (k) labelsEl.querySelector(`[data-k="${k}"]`)?.classList.add("hover"); })
      .on("mouseleave", () => labelsEl.querySelectorAll(".hover").forEach((x) => x.classList.remove("hover")));
    gLand.append("path").attr("class", "coast").datum(landShape);

    // Old hand-coloured maps: a darker band of colour just inside each visited
    // country's border (the band is clipped to the country's own shape).
    const defs = svg.select("defs");
    const visited = features.filter((d) => countryOfId(d.id));
    visited.forEach((d) => {
      defs.append("clipPath").attr("id", "clip-" + d.id).append("path").attr("class", "clipshape").datum(d);
    });
    gLand.insert("g", ".coast").attr("class", "tints")
      .selectAll("path").data(visited).join("path")
      .attr("class", "tint").attr("clip-path", (d) => `url(#clip-${d.id})`);

    buildAtlasDetails();

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
    // Starting frame: from Belgium to eastern Türkiye, with a little room around.
    const box = { type: "MultiPoint", coordinates: [[-1, 35.5], [45.5, 36], [-1, 54.5], [44, 52.5], [22, 56]] };
    projection = d3.geoAzimuthalEqualArea().rotate([-22, -46]).clipAngle(90)
      .fitExtent([[24, 24], [W - 24, H - 24]], box);
    path = d3.geoPath(projection);
    // Keep at least part of the map in view while panning.
    zoom.translateExtent([[-W * 0.6, -H * 0.6], [W * 1.6, H * 1.6]]);
    gLand.selectAll("path").attr("d", path);
    svg.selectAll(".clipshape").attr("d", path);
    if (!focus) svg.call(zoom.transform, d3.zoomIdentity);
    placeOverlays();
  }

  // ----- Atlas details: sea names, neighbouring country names, compass, scale -----
  const SEAS = [
    ["North Sea", [3.2, 55.4]], ["Mediterranean Sea", [24.5, 34.3]],
    ["Ionian Sea", [18.6, 37.6]], ["Ligurian Sea", [8.6, 43.4]],
    ["Black Sea", [34.6, 43.5]], ["Aegean Sea", [25, 38.9]], ["Baltic Sea", [19.6, 56.4]],
    ["Adriatic Sea", [15.4, 43.1]], ["Tyrrhenian Sea", [11.8, 39.8]],
  ];
  const NAMES = [
    ["France", [2.6, 46.8]], ["Germany", [10.3, 51.2]], ["Netherlands", [5.7, 52.35]],
    ["United Kingdom", [-1.9, 52.6]], ["Italy", [12.4, 43.2]], ["Spain", [-3.6, 40.2]],
    ["Switzerland", [8.2, 46.8]], ["Austria", [14.4, 47.6]], ["Czechia", [15.4, 49.8]],
    ["Poland", [19.3, 52.1]], ["Hungary", [19.4, 47.2]], ["Romania", [25, 45.9]],
    ["Serbia", [20.8, 44]], ["Bulgaria", [25.3, 42.7]], ["Greece", [22.2, 39.5]],
    ["Ukraine", [31.2, 49]], ["Georgia", [43.6, 42.2]], ["Armenia", [44.9, 40.25]],
    ["Syria", [38.5, 35]], ["Iraq", [43.3, 33.6]], ["Cyprus", [33.1, 35.05]],
    ["Luxembourg", [6.1, 49.75]],
  ];
  let atlasEl, scaleEl;
  function buildAtlasDetails() {
    atlasEl = document.getElementById("mapAtlas");
    if (!atlasEl) return;
    SEAS.forEach(([n, at]) => {
      const el = document.createElement("span");
      el.className = "sea-name"; el.textContent = n; el._at = at;
      atlasEl.appendChild(el);
    });
    NAMES.forEach(([n, at]) => {
      const el = document.createElement("span");
      el.className = "land-name"; el.textContent = n; el._at = at;
      atlasEl.appendChild(el);
    });
    const compass = document.createElement("div");
    compass.className = "compass";
    compass.innerHTML = `<svg viewBox="-50 -50 100 100" aria-hidden="true">
      <circle r="30" class="c-ring"/><circle r="26" class="c-ring thin"/>
      <path d="M0-44 L6-6 L0 0 L-6-6Z" class="c-dark"/><path d="M0-44 L-6-6 L0 0Z" class="c-light"/>
      <path d="M0 44 L6 6 L0 0 L-6 6Z" class="c-light"/><path d="M44 0 L6 6 L0 0 L6-6Z" class="c-light"/>
      <path d="M-44 0 L-6-6 L0 0 L-6 6Z" class="c-light"/>
      <text y="-46" class="c-n">N</text></svg>`;
    atlasEl.appendChild(compass);
    scaleEl = document.createElement("div");
    scaleEl.className = "scale-bar";
    scaleEl.innerHTML = `<div class="sb-bar"><i></i><i></i></div><span class="sb-label"></span>`;
    atlasEl.appendChild(scaleEl);
  }

  function placeAtlas(t) {
    if (!atlasEl) return;
    atlasEl.querySelectorAll(".sea-name, .land-name").forEach((el) => {
      const p = projection(el._at);
      el.style.transform = `translate(${t.applyX(p[0])}px, ${t.applyY(p[1])}px)`;
    });
    atlasEl.classList.toggle("show-names", t.k >= 1.8);
    // Scale bar: a round distance that's 60-140px long at the current zoom.
    const W = frame.clientWidth, H = frame.clientHeight;
    const c = projection.invert([(W / 2 - t.x) / t.k, (H / 2 - t.y) / t.k]);
    if (!c) return;
    const a = projection(c), b = projection([c[0] + 1, c[1]]);
    const pxPerDeg = Math.hypot(b[0] - a[0], b[1] - a[1]) * t.k;
    const kmPerPx = (111.32 * Math.cos((c[1] * Math.PI) / 180)) / pxPerDeg;
    const nice = [10, 20, 50, 100, 200, 300, 500, 1000];
    const km = nice.find((n) => n / kmPerPx >= 60) || 1000;
    scaleEl.querySelector(".sb-bar").style.width = Math.round(km / kmPerPx) + "px";
    scaleEl.querySelector(".sb-label").textContent = km + " km";
  }

  function placeOverlays() {
    if (!projection) return;
    const t = transform || d3.zoomIdentity;
    placeAtlas(t);
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

  // Must match .deck's width in map.css: clamp(460px, 48%, 960px).
  function panelWidth() {
    const W = frame.clientWidth;
    return Math.min(W, Math.max(460, Math.min(W * 0.48, 960)));
  }

  // Room the open panel takes from the map, so the country can sit beside it.
  function deckShift() {
    if (!openCity) return { x: 0, y: 0 };
    const W = frame.clientWidth, H = frame.clientHeight;
    if (isSheet()) return { x: 0, y: -(H * 0.62) / 2 };
    return { x: -panelWidth() / 2, y: 0 };
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
    gCountries.selectAll("path").classed("in-focus", (d) => d.id === COUNTRIES[k].id);
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
    gCountries.selectAll("path").classed("in-focus", false);
    pinsEl.querySelectorAll(".pin").forEach((p) => { p.classList.remove("show"); p.style.transitionDelay = "0s"; });
    svg.transition().duration(900).ease(d3.easeCubicInOut).call(zoom.transform, d3.zoomIdentity);
    crumbs();
    setHash();
  }

  // ----- Hover preview (mouse only) -----
  let previewEl = null;
  function showPreview(pin, c) {
    hidePreview();
    const figs = cityFigs(c);
    const cover = figs.find((f) => f.querySelector("img.shot").getAttribute("src").includes("/" + COVER[c] + "."));
    const t = (cover || figs[0]).querySelector("img.shot");
    previewEl = document.createElement("div");
    previewEl.className = "pin-preview";
    previewEl.innerHTML = `<img src="${t.getAttribute("src")}" alt="">`;
    pin.appendChild(previewEl);
  }
  function hidePreview() { if (previewEl) { previewEl.remove(); previewEl = null; } }

  // ----- City panel -----
  function openDeck(c) {
    if (openCity === c && deckEl) return;
    // A pin reached by panning/zooming by hand may belong to another country.
    const k = Object.keys(COUNTRIES).find((x) => COUNTRIES[x].cities.includes(c));
    if (k && k !== focus) focusCountry(k);
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
    Gallery.layout(grid, figs, isSheet() ? { target: 130, pad: 14 } : { target: panelWidth() > 700 ? 230 : 170 });
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
