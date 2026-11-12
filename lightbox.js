// ===== Lightbox =====
// Shared by the main portfolio and Travels (keep both copies identical).
//
// - Opens by growing the photo out of its grid position, and closes back into it.
// - Swipe left/right (or arrows / ←→ keys) slides between photos, swipe down closes.
// - Click (desktop) or double-tap (touch) zooms to full size; drag to pan, pinch to zoom.
// - Neighbouring photos are preloaded, so stepping through has no wait.
// - Each open photo gets its own link (#slug), and the back button closes the viewer.
//
// Usage: Lightbox.init({ all, getItems, reveal })
//   all      - every .print figure on the page
//   getItems - the figures currently in view, in reading order
//   reveal   - optional; called with a figure from a shared link before it opens,
//              so the page can make it visible (e.g. switch a filter)
window.Lightbox = (function () {
  const EASE = "cubic-bezier(.22,.8,.24,1)";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dur = (ms) => (reduceMotion ? 0 : ms);

  // Resolve when the animations finish, or after a timeout if the browser stalls
  // them (background tabs, throttled frames) so the viewer never gets stuck.
  function settle(anims, ms) {
    return Promise.race([
      Promise.all(anims.map((a) => a.finished.catch(() => {}))),
      new Promise((r) => setTimeout(r, ms + 150)),
    ]);
  }

  function init({ all, getItems, reveal }) {
    const lb = document.getElementById("lightbox");
    const stage = lb.querySelector(".lb-stage");
    const backdrop = lb.querySelector(".lb-backdrop");
    const countEl = lb.querySelector(".lb-count");
    const captionEl = lb.querySelector(".lb-caption");
    const btnClose = lb.querySelector(".lb-close");
    const btnPrev = lb.querySelector(".lb-prev");
    const btnNext = lb.querySelector(".lb-next");
    let img = lb.querySelector(".lb-img");

    let items = [];
    let index = -1;
    let isOpen = false;
    let busy = false;
    let base = null; // fitted on-screen rect of the current photo at zoom 1
    let maxScale = 1;
    let scale = 1, tx = 0, ty = 0;
    const loaded = new Set();

    const thumbOf = (f) => f.querySelector("img.shot");
    const fullOf = (f) => thumbOf(f).dataset.full;

    // "images/large/07-abbey-doorway.jpg"        -> "abbey-doorway"
    // "images/ghent/large/05-graffiti-alley.jpg" -> "ghent/graffiti-alley"
    function slugOf(f) {
      const parts = fullOf(f).split("/");
      const stem = parts[parts.length - 1].replace(/\.\w+$/, "").replace(/^\d+-/, "");
      return parts.length > 3 ? parts[1] + "/" + stem : stem;
    }

    // ----- Geometry -----
    function padding() {
      return window.innerWidth <= 560 ? { x: 0, y: 60 } : { x: 84, y: 64 };
    }

    function fitRect(f) {
      const t = thumbOf(f);
      const nw = +t.getAttribute("width") || t.naturalWidth;
      const nh = +t.getAttribute("height") || t.naturalHeight;
      const p = padding();
      const aw = window.innerWidth - 2 * p.x;
      const ah = window.innerHeight - 2 * p.y;
      const s = Math.min(aw / nw, ah / nh, 1);
      const w = nw * s, h = nh * s;
      return { left: (window.innerWidth - w) / 2, top: (window.innerHeight - h) / 2, width: w, height: h, nw };
    }

    function place(el, f) {
      const r = fitRect(f);
      el.style.left = r.left + "px";
      el.style.top = r.top + "px";
      el.style.width = r.width + "px";
      el.style.height = r.height + "px";
      if (el === img) {
        base = r;
        maxScale = Math.max(1.6, r.nw / r.width);
      }
    }

    // ----- Zoom & pan -----
    function applyTransform(animate) {
      img.style.transition = animate ? `transform ${dur(300)}ms ${EASE}` : "none";
      img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
      lb.classList.toggle("zoomed", scale > 1.01);
    }

    function clampPan() {
      const w = base.width * scale, h = base.height * scale;
      const vw = window.innerWidth, vh = window.innerHeight;
      tx = w <= vw ? (vw - w) / 2 - base.left : Math.min(-base.left, Math.max(vw - w - base.left, tx));
      ty = h <= vh ? (vh - h) / 2 - base.top : Math.min(-base.top, Math.max(vh - h - base.top, ty));
    }

    // Zoom so the point under (px, py) on screen stays put.
    function zoomTo(s, px, py) {
      const u = (px - base.left - tx) / scale;
      const v = (py - base.top - ty) / scale;
      scale = Math.min(maxScale, Math.max(1, s));
      tx = px - base.left - u * scale;
      ty = py - base.top - v * scale;
      clampPan();
    }

    function resetZoom(animate) {
      scale = 1; tx = 0; ty = 0;
      applyTransform(animate);
    }

    function toggleZoom(px, py) {
      if (scale > 1.01) resetZoom(true);
      else { zoomTo(maxScale, px, py); applyTransform(true); }
    }

    // ----- Loading -----
    function loadFull(f, el) {
      const src = fullOf(f);
      if (el.getAttribute("src") === src) return;
      const pre = new Image();
      pre.src = src;
      const swap = () => {
        loaded.add(src);
        if (el.isConnected && items[index] === f) el.src = src;
      };
      (pre.decode ? pre.decode() : Promise.resolve()).then(swap, swap);
    }

    function preloadNeighbours() {
      [1, -1, 2].forEach((d) => {
        if (items.length < 2) return;
        const src = fullOf(items[(index + d + items.length) % items.length]);
        if (loaded.has(src)) return;
        const pre = new Image();
        pre.onload = () => loaded.add(src);
        pre.src = src;
      });
    }

    // Best image to show immediately: the full one if cached, else the grid thumbnail.
    function quickSrc(f) {
      const t = thumbOf(f);
      if (loaded.has(fullOf(f))) return fullOf(f);
      return t.complete && t.naturalWidth ? t.currentSrc || t.src : fullOf(f);
    }

    // ----- Caption, hash, thumbs -----
    function setCaption() {
      const f = items[index];
      countEl.textContent = items.length > 1 ? `${index + 1} / ${items.length}` : "";
      const city = f.querySelector(".citytag");
      const exif = f.querySelector(".exif");
      const bits = [];
      if (city) bits.push(city.textContent.trim());
      if (exif) bits.push(exif.textContent.replace(/\s+/g, " ").trim());
      captionEl.textContent = bits.join("  ·  ");
      img.alt = thumbOf(f).alt;
      lb.classList.toggle("single", items.length < 2);
    }

    function setHash(push) {
      const url = location.pathname + location.search + "#" + slugOf(items[index]);
      if (push) history.pushState({ lb: 1 }, "", url);
      else history.replaceState(history.state, "", url);
    }

    function hideThumb(f) { thumbOf(f).style.visibility = "hidden"; }
    function showThumb(f) { thumbOf(f).style.visibility = ""; }

    // ----- Scroll lock (keep the page from shifting when the scrollbar goes) -----
    function lockScroll() {
      const sbw = window.innerWidth - document.documentElement.clientWidth;
      document.documentElement.style.overflow = "hidden";
      if (sbw > 0) document.body.style.paddingRight = sbw + "px";
    }
    function unlockScroll() {
      document.documentElement.style.overflow = "";
      document.body.style.paddingRight = "";
    }

    // ----- Open / close -----
    function open(f, { animate = true } = {}) {
      if (isOpen) return;
      items = getItems();
      index = items.indexOf(f);
      if (index < 0) { items = [f]; index = 0; }

      const t = thumbOf(f);
      const from = t.getBoundingClientRect();
      isOpen = true;
      lockScroll();
      lb.classList.add("open");
      lb.setAttribute("aria-hidden", "false");

      scale = 1; tx = 0; ty = 0;
      place(img, f);
      img.src = quickSrc(f);
      applyTransform(false);
      img.style.opacity = "";
      backdrop.style.opacity = "";
      setCaption();
      hideThumb(f);

      const visible = from.width > 0 && from.bottom > 0 && from.top < window.innerHeight;
      if (animate && visible) {
        img.animate(
          [
            { transform: `translate(${from.left - base.left}px, ${from.top - base.top}px) scale(${from.width / base.width})` },
            { transform: "translate(0px, 0px) scale(1)" },
          ],
          { duration: dur(460), easing: EASE }
        );
      } else {
        img.animate([{ opacity: 0, transform: "scale(.97)" }, { opacity: 1, transform: "scale(1)" }], { duration: dur(300), easing: EASE });
      }
      backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur(320), easing: "ease-out" });

      loadFull(f, img);
      preloadNeighbours();
      setHash(true);
      btnClose.focus({ preventScroll: true });
    }

    async function close({ fromHistory = false } = {}) {
      if (!isOpen) return;
      isOpen = false;
      const f = items[index];
      const t = thumbOf(f);

      unlockScroll();
      // If the reader browsed away from where they started, bring the grid to the
      // current photo so it can fly back into place.
      let to = t.getBoundingClientRect();
      if (to.bottom < 0 || to.top > window.innerHeight) {
        t.scrollIntoView({ block: "center", behavior: "instant" });
        to = t.getBoundingClientRect();
      }

      const current = getComputedStyle(img).transform;
      const startOpacity = getComputedStyle(backdrop).opacity;
      img.style.transition = "none";
      lb.classList.add("closing");
      const anims = [];
      if (to.width > 0) {
        anims.push(
          img.animate(
            [
              { transform: current === "none" ? "translate(0px, 0px) scale(1)" : current },
              { transform: `translate(${to.left - base.left}px, ${to.top - base.top}px) scale(${to.width / base.width})` },
            ],
            { duration: dur(380), easing: EASE, fill: "forwards" }
          )
        );
      } else {
        anims.push(img.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur(220), fill: "forwards" }));
      }
      anims.push(backdrop.animate([{ opacity: startOpacity }, { opacity: 0 }], { duration: dur(340), easing: "ease-out", fill: "forwards" }));
      await settle(anims, dur(380));

      showThumb(f);
      lb.classList.remove("open", "closing", "zoomed", "ui-hidden");
      lb.setAttribute("aria-hidden", "true");
      anims.forEach((a) => a.cancel());
      img.removeAttribute("src");
      img.style.transform = "";
      backdrop.style.opacity = "";

      if (!fromHistory) {
        if (history.state && history.state.lb) history.back();
        else history.replaceState(null, "", location.pathname + location.search);
      }
    }

    // ----- Step between photos -----
    async function go(dir, fromDx = 0) {
      if (!isOpen || items.length < 2) return;
      if (busy) return;
      busy = true;

      const prev = items[index];
      index = (index + dir + items.length) % items.length;
      const f = items[index];

      const out = img;
      out.style.transition = "none";
      const inc = document.createElement("img");
      inc.className = "lb-img";
      inc.draggable = false;
      img = inc;
      scale = 1; tx = 0; ty = 0;
      place(inc, f);
      inc.src = quickSrc(f);
      stage.appendChild(inc);
      lb.classList.remove("zoomed");

      showThumb(prev);
      hideThumb(f);
      setCaption();
      setHash(false);
      loadFull(f, inc);
      preloadNeighbours();

      const shift = Math.min(window.innerWidth * 0.45, 520);
      const a1 = out.animate(
        [
          { transform: `translateX(${fromDx}px)`, opacity: 1 },
          { transform: `translateX(${-dir * Math.max(shift, Math.abs(fromDx) + 120)}px)`, opacity: 0 },
        ],
        { duration: dur(340), easing: EASE, fill: "forwards" }
      );
      const a2 = inc.animate(
        [
          { transform: `translateX(${dir * shift * 0.6}px)`, opacity: 0 },
          { transform: "translateX(0px)", opacity: 1 },
        ],
        { duration: dur(340), easing: EASE }
      );
      await settle([a1, a2], dur(340));
      a1.cancel();
      out.remove();
      busy = false;
    }

    // ----- Pointer gestures: swipe, swipe-down to close, pan, pinch, tap -----
    const pointers = new Map();
    let g = null; // current gesture
    let lastTap = 0;
    let tapTimer = null;

    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

    stage.addEventListener("pointerdown", (e) => {
      if (!isOpen || e.button > 0) return;
      stage.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      img.style.transition = "none";
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        g = { type: "pinch", d0: dist(a, b), s0: scale, moved: true };
        return;
      }
      g = {
        type: null, moved: false, x0: e.clientX, y0: e.clientY, t0: performance.now(),
        tx0: tx, ty0: ty, onImg: e.target === img, touch: e.pointerType !== "mouse",
      };
    });

    stage.addEventListener("pointermove", (e) => {
      if (!pointers.has(e.pointerId) || !g) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (g.type === "pinch") {
        if (pointers.size < 2) return;
        const [a, b] = [...pointers.values()];
        zoomTo(g.s0 * (dist(a, b) / g.d0), (a.x + b.x) / 2, (a.y + b.y) / 2);
        applyTransform(false);
        return;
      }

      const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
      if (!g.moved && Math.hypot(dx, dy) < 6) return;
      g.moved = true;

      if (scale > 1.01) {
        g.type = "pan";
        tx = g.tx0 + dx; ty = g.ty0 + dy;
        clampPan();
        applyTransform(false);
        return;
      }
      if (!g.type) g.type = Math.abs(dx) > Math.abs(dy) ? "swipe" : "dismiss";

      if (g.type === "swipe") {
        const resist = items.length < 2 ? 0.25 : 1;
        img.style.transform = `translateX(${dx * resist}px)`;
      } else {
        const p = Math.min(1, Math.abs(dy) / (window.innerHeight * 0.5));
        const s = 1 - p * 0.18;
        const ox = (base.width * (1 - s)) / 2, oy = (base.height * (1 - s)) / 2;
        img.style.transform = `translate(${dx * 0.4 + ox}px, ${dy + oy}px) scale(${s})`;
        backdrop.style.opacity = String(1 - p * 0.85);
        lb.classList.add("ui-hidden");
      }
    });

    function endPointer(e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (!g) return;

      if (g.type === "pinch") {
        if (pointers.size === 0) {
          g = null;
          if (scale < 1.05) resetZoom(true);
        }
        return;
      }

      const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
      const dt = Math.max(1, performance.now() - g.t0);
      const gesture = g;
      g = null;

      if (!gesture.moved) return handleTap(e, gesture);

      if (gesture.type === "swipe") {
        const fast = Math.abs(dx / dt) > 0.45;
        if (items.length > 1 && (Math.abs(dx) > Math.min(90, window.innerWidth * 0.18) || fast)) {
          go(dx < 0 ? 1 : -1, dx);
        } else {
          snapBack();
        }
      } else if (gesture.type === "dismiss") {
        if (Math.abs(dy) > 110 || Math.abs(dy / dt) > 0.5) close();
        else snapBack();
      }
    }

    function snapBack() {
      img.style.transition = `transform ${dur(280)}ms ${EASE}`;
      img.style.transform = "translate(0px, 0px) scale(1)";
      backdrop.style.transition = `opacity ${dur(280)}ms ease`;
      backdrop.style.opacity = "";
      lb.classList.remove("ui-hidden");
      setTimeout(() => { backdrop.style.transition = ""; }, 300);
    }

    function handleTap(e, gesture) {
      if (!gesture.touch) {
        // Mouse: click the photo to zoom, click outside it to close.
        if (gesture.onImg) toggleZoom(e.clientX, e.clientY);
        else if (scale > 1.01) resetZoom(true);
        else close();
        return;
      }
      // Touch: double-tap zooms; a single tap on the photo hides/shows the controls,
      // a single tap outside it closes.
      const now = performance.now();
      if (now - lastTap < 300) {
        clearTimeout(tapTimer);
        lastTap = 0;
        toggleZoom(e.clientX, e.clientY);
        return;
      }
      lastTap = now;
      const onImg = gesture.onImg;
      tapTimer = setTimeout(() => {
        if (!isOpen) return;
        if (onImg || scale > 1.01) lb.classList.toggle("ui-hidden");
        else close();
      }, 300);
    }

    stage.addEventListener("pointerup", endPointer);
    stage.addEventListener("pointercancel", endPointer);

    // Trackpad: pinch (ctrl+wheel) zooms, two-finger scroll pans while zoomed.
    stage.addEventListener(
      "wheel",
      (e) => {
        if (!isOpen) return;
        e.preventDefault();
        if (e.ctrlKey) {
          zoomTo(scale * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY);
          applyTransform(false);
        } else if (scale > 1.01) {
          tx -= e.deltaX; ty -= e.deltaY;
          clampPan();
          applyTransform(false);
        }
      },
      { passive: false }
    );

    // ----- Buttons, keys, history, resize -----
    btnClose.addEventListener("click", () => close());
    btnNext.addEventListener("click", () => go(1));
    btnPrev.addEventListener("click", () => go(-1));

    document.addEventListener("keydown", (e) => {
      if (!isOpen) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    });

    window.addEventListener("popstate", () => {
      if (isOpen && !(history.state && history.state.lb)) close({ fromHistory: true });
    });

    let resizeTimer;
    window.addEventListener("resize", () => {
      if (!isOpen) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        place(img, items[index]);
        resetZoom(false);
      }, 120);
    });

    all.forEach((f) => thumbOf(f).addEventListener("click", () => open(f)));

    // Shared link straight to a photo: open it once the page is ready, with the
    // gallery behind it as the "back" step.
    if (location.hash.length > 1) {
      const slug = decodeURIComponent(location.hash.slice(1));
      const f = all.find((x) => slugOf(x) === slug);
      if (f) {
        if (reveal) reveal(f);
        history.replaceState(null, "", location.pathname + location.search);
        open(f, { animate: false });
      }
    }
  }

  return { init };
})();
