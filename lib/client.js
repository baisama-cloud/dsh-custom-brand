window.__ModuleLoader__.load({
  id: 'dsh-custom-brand',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    var KEY_BADGE = 'dsh.customBrand';
    var KEY_LOGO = 'dsh.customLogo';
    var KEY_DS_IMG = 'dsh.customDeepSeekImg';
    var DEFAULT_BADGE = 'HARNESS';
    var ATTR = 'data-dsh-brand';
    var SVG_NS = 'http://www.w3.org/2000/svg';
    var MAX_EDGE = 256; // longest edge in px for stored logo images

    // The current client renders the sidebar brand through the slots
    // `sidebar.brand.mark` (FishLogo) and `sidebar.brand.name` (BrandWordmark).
    // Those land inside span.brandMark / span.brandName within the logoRow.
    // Older builds put one combined 182x24 svg inside a <button>; match both.
    var MARK_HOST_SEL = '[class*="brandMark"]';
    var NAME_HOST_SEL = '[class*="brandName"]';
    var LEGACY_SVG_SEL = 'button svg[viewBox="0 0 182 24"]';
    var WORDMARK_SEL = 'svg[viewBox="0 0 182 24"], svg[viewBox="26 0 156 24"]';
    var WHALE_CLIP_SEL = '[clip-path*="whale"]';
    var BADGE_CLIP_SEL = '[clip-path*="badge-clip"]';

    // badge pill geometry inside the wordmark viewBox (182x24)
    var BADGE_X = 129.348, BADGE_Y = 5.5, BADGE_W = 52, BADGE_H = 14;
    // wordmark lettering box in the 182x24 viewBox
    var DS_X = 27, DS_Y = 7.66, DS_W = 94, DS_H = 13.84;
    // whale mark box in the 182x24 viewBox
    var LOGO_X = 0.14, LOGO_Y = 3.52, LOGO_W = 23.16, LOGO_H = 17.04;

    // The official logotype is Montserrat, which the app already loads at
    // weights 300/400/500. The badge glyphs are Montserrat outlines, so using
    // the same family keeps an edited badge looking native.
    var BRAND_FONT = 'Montserrat, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
    var BRAND_WEIGHT = '500';
    // Montserrat metrics: unitsPerEm 1000, capHeight 700.
    var CAP_RATIO = 0.7;

    // fallback typography for the legacy combined-svg layout
    var BADGE_FONT = 10;
    var BADGE_BASE_GAP = 0.2;
    var BADGE_MAX_W = 50;
    var MIN_GAP = -1.2;

    function read(k) {
      try { return localStorage.getItem(k); } catch (e) { return null; }
    }
    function write(k, v) {
      try { localStorage.setItem(k, v); } catch (e) {}
    }
    function removeKey(k) {
      try { localStorage.removeItem(k); } catch (e) {}
    }
    function currentBadge() { var v = read(KEY_BADGE); return v && v.trim() ? v.trim() : DEFAULT_BADGE; }
    // A stored value that differs from the default means the badge was renamed,
    // so the official glyphs have to give way to our own text.
    function isCustomBadge() { return currentBadge() !== DEFAULT_BADGE; }
    function currentLogo() { return read(KEY_LOGO); }
    function currentDsImg() { return read(KEY_DS_IMG); }

    var CSS =
      '.dsh-brand-edit{display:flex;align-items:center;justify-content:center;width:100%;height:100%;box-sizing:border-box;' +
        'color:var(--dsw-alias-label-primary-inverted,#fff);font-family:' + BRAND_FONT + ';font-weight:' + BRAND_WEIGHT + ';' +
        'font-size:' + BADGE_FONT + 'px;line-height:1;white-space:nowrap;overflow:hidden;cursor:text}' +
      '.dsh-brand-edit:hover{outline:1px dashed var(--dsw-alias-border-l2,rgba(128,128,128,.5));outline-offset:-1px;border-radius:2px}' +
      '.dsh-brand-input{display:block;width:100%;height:100%;box-sizing:border-box;text-align:center;' +
        'font-family:' + BRAND_FONT + ';font-weight:' + BRAND_WEIGHT + ';font-size:' + BADGE_FONT + 'px;line-height:1;' +
        'color:var(--dsw-alias-label-primary-inverted,#fff);background:transparent;border:none;outline:none;padding:0;min-width:0}' +
      '.dsh-logo-wrap{position:relative;width:100%;height:100%}' +
      '.dsh-logo-img{width:100%;height:100%;object-fit:contain;display:block}' +
      '.dsh-logo-hit{position:absolute;inset:0;cursor:pointer;background:transparent}' +
      '.dsh-logo-hit:hover{outline:1px dashed var(--dsw-alias-border-l2,rgba(128,128,128,.5));outline-offset:-1px;border-radius:2px}';

    function applyTitle() {
      document.title = currentBadge();
    }
    function stop(e) { e.preventDefault(); e.stopPropagation(); }

    function measureText(text, fontSize, letterSpacing) {
      var probe = document.createElement('span');
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;' +
        'font-family:' + BRAND_FONT + ';font-weight:' + BRAND_WEIGHT + ';font-size:' + fontSize + 'px;' +
        'letter-spacing:' + letterSpacing + 'px;line-height:1';
      probe.textContent = text;
      document.body.appendChild(probe);
      var w = probe.getBoundingClientRect().width;
      probe.remove();
      return w;
    }

    // Legacy layout only: pick a tracking that keeps the text inside the pill.
    function fitGap(text, fontSize, baseGap, maxW) {
      if (text.length <= 1) return 0;
      var gap = baseGap;
      while (gap > MIN_GAP && measureText(text, fontSize, gap) > maxW) gap -= 0.1;
      return Math.max(MIN_GAP, gap);
    }

    function makeBadgeDiv(text) {
      var div = document.createElement('div');
      div.className = 'dsh-brand-edit';
      div.textContent = text;
      div.title = 'double-click to edit';
      div.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      div.addEventListener('click', stop);
      div.addEventListener('dblclick', function (e) { stop(e); startBadgeEdit(div); });
      return div;
    }

    function startBadgeEdit(div) {
      var input = document.createElement('input');
      input.className = 'dsh-brand-input';
      input.type = 'text';
      input.value = div.textContent;
      input.maxLength = 30;
      input.spellcheck = false;
      input.style.fontSize = div.style.fontSize || BADGE_FONT + 'px';
      input.style.letterSpacing = div.style.letterSpacing || '0px';
      // The official glyphs must stand down while the input shows, or the two
      // would render on top of each other.
      var glyphs = div.__badgeGlyphs;
      if (glyphs) glyphs.style.display = 'none';
      var stopEvent = function (e) { e.stopPropagation(); };
      input.addEventListener('pointerdown', stopEvent);
      input.addEventListener('click', stopEvent);
      div.replaceWith(input);
      input.focus();
      input.select();
      var done = false;
      function finish(commit) {
        if (done) return;
        done = true;
        var prev = currentBadge();
        var typed = input.value.trim();
        var next = commit && typed ? typed : prev;
        if (commit && typed && typed !== prev) {
          write(KEY_BADGE, typed);
          applyTitle();
        }
        var fresh = makeBadgeDiv(next);
        input.replaceWith(fresh);
        // let ensure() decide the final glyph visibility / metrics
        ensure();
      }
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); finish(true); }
        else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
      });
      input.addEventListener('blur', function () { finish(true); });
    }

    // Downscale the picked image to at most MAX_EDGE px on the longest side
    // (PNG keeps transparency) so any photo fits comfortably in localStorage.
    function compressImage(dataUrl, done) {
      var img = new Image();
      img.onload = function () {
        try {
          var scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
          var w = Math.max(1, Math.round(img.width * scale));
          var h = Math.max(1, Math.round(img.height * scale));
          var canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          var c = canvas.getContext('2d');
          c.drawImage(img, 0, 0, w, h);
          done(canvas.toDataURL('image/png'));
        } catch (e) {
          console.error('[brand] image compress failed:', e);
          done(dataUrl);
        }
      };
      img.onerror = function () {
        console.error('[brand] image load failed');
        done(dataUrl);
      };
      img.src = dataUrl;
    }

    function pickImage(key) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          var raw = String(reader.result);
          compressImage(raw, function (dataUrl) {
            write(key, dataUrl);
            ensure();
          });
        };
        reader.readAsDataURL(file);
      });
      input.click();
    }

    function setBadgeGlyphs(svg, hide) {
      var g = svg.querySelector(BADGE_CLIP_SEL);
      if (g) g.style.display = hide ? 'none' : '';
      return g;
    }
    function setWhale(svg, hide) {
      var g = svg.querySelector(WHALE_CLIP_SEL);
      if (g) g.style.display = hide ? 'none' : '';
    }
    function setDeepSeekPaths(svg, hide) {
      // The lettering is the group of top-level paths that are not the whale.
      for (var i = 0; i < svg.children.length; i++) {
        var el = svg.children[i];
        if (el.tagName !== 'path') continue;
        el.style.display = hide ? 'none' : '';
      }
    }

    function buildImageOverlay(x, y, w, h, imgKey, label) {
      var fo = document.createElementNS(SVG_NS, 'foreignObject');
      fo.setAttribute('x', String(x));
      fo.setAttribute('y', String(y));
      fo.setAttribute('width', String(w));
      fo.setAttribute('height', String(h));
      var wrap = document.createElement('div');
      wrap.className = 'dsh-logo-wrap';
      var hit = document.createElement('div');
      hit.className = 'dsh-logo-hit';
      hit.title = label;
      hit.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      hit.addEventListener('click', stop);
      hit.addEventListener('dblclick', function (e) { stop(e); pickImage(imgKey); });
      hit.addEventListener('contextmenu', function (e) {
        e.preventDefault(); e.stopPropagation();
        removeKey(imgKey);
        ensure();
      });
      wrap.appendChild(hit);
      fo.appendChild(wrap);
      return fo;
    }

    function syncImage(foEl, imgKey) {
      if (!foEl) return;
      var wrap = foEl.firstElementChild;
      if (!wrap) return;
      var src = read(imgKey);
      var img = foEl.querySelector('img');
      if (src) {
        if (!img) {
          img = document.createElement('img');
          img.className = 'dsh-logo-img';
          img.draggable = false;
          wrap.insertBefore(img, wrap.firstChild);
        }
        if (img.getAttribute('src') !== src) img.setAttribute('src', src);
      } else if (img) {
        img.remove();
      }
    }

    // ---- official badge geometry -------------------------------------------

    function parseViewBox(svg) {
      var raw = svg.getAttribute('viewBox');
      if (!raw) return null;
      var p = raw.trim().split(/[\s,]+/).map(Number);
      if (p.length !== 4 || p.some(isNaN) || !p[2] || !p[3]) return null;
      return { x: p[0], y: p[1], w: p[2], h: p[3] };
    }

    // The glyph group must be rendered for getBBox() to answer, so unhide it
    // for the measurement and put the previous state back straight away.
    function badgeBox(svg, g) {
      if (!g) return null;
      if (!svg.__brandBox) {
        var prev = g.style.display;
        g.style.display = '';
        var box = null;
        try {
          var b = g.getBBox();
          if (b && b.width > 0 && b.height > 0) {
            box = { x: b.x, y: b.y, width: b.width, height: b.height };
          }
        } catch (e) {}
        g.style.display = prev;
        if (!box) return null;
        svg.__brandBox = box;
      }
      return svg.__brandBox;
    }

    // Size an editable div to sit exactly on the official glyph run: same cap
    // height (so the same font size) and the same overall width (so the same
    // tracking).
    function layoutBadgeDiv(div, slot, nameHost, nameSvg, g, custom) {
      var vb = parseViewBox(nameSvg);
      var box = badgeBox(nameSvg, g);
      if (!vb || !box) return;
      var sr = nameSvg.getBoundingClientRect();
      var hr = nameHost.getBoundingClientRect();
      if (!sr.width || !sr.height) return;
      var kx = sr.width / vb.w, ky = sr.height / vb.h;
      var w = box.width * kx;
      var h = box.height * ky;
      slot.style.left = ((sr.left - hr.left) + (box.x - vb.x) * kx) + 'px';
      slot.style.top = ((sr.top - hr.top) + (box.y - vb.y) * ky) + 'px';
      slot.style.width = w + 'px';
      slot.style.height = h + 'px';

      var text = div.textContent;
      var fontPx = h / CAP_RATIO;
      // The official glyphs stay visible unless the badge was renamed, so the
      // default look is pixel-identical to stock.
      div.style.color = custom ? '' : 'transparent';
      div.style.fontSize = fontPx + 'px';
      var key = text + '|' + fontPx.toFixed(2) + '|' + w.toFixed(2);
      if (div.__brandKey !== key) {
        div.__brandKey = key;
        var natural = measureText(text, fontPx, 0);
        var n = text.length;
        var ls = n > 1 && natural > 0 ? (w - natural) / (n - 1) : 0;
        // Before Montserrat loads the probe falls back to another family and the
        // computed tracking can be nonsense; keep it within a sane band and
        // re-measure once the font arrives.
        var lim = fontPx * 0.25;
        if (ls > lim) ls = lim; else if (ls < -lim) ls = -lim;
        div.style.letterSpacing = ls + 'px';
        // CSS adds tracking after the last glyph too; cancel it so the run
        // stays centred on the official box.
        div.style.marginRight = (-ls) + 'px';
      }
    }

    function buildBadgeLayer(nameHost, nameSvg) {
      var layer = nameHost.querySelector('[data-brand-badge]');
      if (layer) return layer;
      layer = document.createElement('div');
      layer.setAttribute('data-brand-badge', '1');
      layer.style.position = 'absolute';
      layer.style.inset = '0';
      layer.style.pointerEvents = 'none';
      var slot = document.createElement('div');
      slot.style.position = 'absolute';
      slot.style.pointerEvents = 'auto';
      slot.appendChild(makeBadgeDiv(currentBadge()));
      layer.appendChild(slot);
      nameHost.style.position = 'relative';
      nameHost.appendChild(layer);
      return layer;
    }

    // Current layout: the mark and the name are two separate svgs rendered by
    // the sidebar slots into span.brandMark / span.brandName.
    function ensureSlotted() {
      var markHost = document.querySelector(MARK_HOST_SEL);
      var nameHost = document.querySelector(NAME_HOST_SEL);
      if (!markHost && !nameHost) return false;

      if (markHost) {
        var markSvg = markHost.querySelector('svg');
        if (markSvg) {
          markHost.setAttribute(ATTR, '1');
          markHost.style.position = 'relative';
          markSvg.style.visibility = currentLogo() ? 'hidden' : '';
          var hitLayer = markHost.querySelector('[data-brand-logo]');
          if (!hitLayer) {
            var wrap = document.createElement('div');
            wrap.className = 'dsh-logo-wrap';
            wrap.setAttribute('data-brand-logo', '1');
            wrap.style.position = 'absolute';
            wrap.style.inset = '0';
            var hit = document.createElement('div');
            hit.className = 'dsh-logo-hit';
            hit.title = 'double-click to change logo; right-click to reset';
            hit.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
            hit.addEventListener('click', stop);
            hit.addEventListener('dblclick', function (e) { stop(e); pickImage(KEY_LOGO); });
            hit.addEventListener('contextmenu', function (e) {
              e.preventDefault(); e.stopPropagation();
              removeKey(KEY_LOGO);
              ensure();
            });
            wrap.appendChild(hit);
            markHost.appendChild(wrap);
            hitLayer = wrap;
          }
          syncImage(hitLayer, KEY_LOGO);
        }
      }

      if (nameHost) {
        var nameSvg = nameHost.querySelector(WORDMARK_SEL) || nameHost.querySelector('svg');
        if (nameSvg) {
          nameHost.setAttribute(ATTR, '1');
          nameHost.style.position = 'relative';
          var custom = isCustomBadge();
          // hide the vector lettering only when a custom image replaces it
          nameSvg.style.visibility = currentDsImg() ? 'hidden' : '';
          var g = setBadgeGlyphs(nameSvg, custom);
          var layer = buildBadgeLayer(nameHost, nameSvg);
          var slot = layer.firstElementChild;
          var div = slot.firstElementChild;
          // while the input is open the div is detached; only touch our own div
          if (div && div.className.indexOf('dsh-brand-edit') !== -1) {
            div.__badgeGlyphs = g;
            var want = currentBadge();
            if (div.textContent !== want) {
              div.textContent = want;
              div.__brandKey = '';
            }
            layoutBadgeDiv(div, slot, nameHost, nameSvg, g, custom);
          }
        }
      }
      return true;
    }

    // Older layout: one combined svg inside a button.
    function ensureLegacy() {
      var svg = document.querySelector(LEGACY_SVG_SEL);
      if (!svg) return false;
      if (!svg.hasAttribute(ATTR)) svg.setAttribute(ATTR, '1');
      var custom = isCustomBadge();
      setBadgeGlyphs(svg, custom);
      if (!svg.querySelector('foreignObject[data-brand-badge]')) {
        var fo = document.createElementNS(SVG_NS, 'foreignObject');
        fo.setAttribute('data-brand-badge', '1');
        fo.setAttribute('x', String(BADGE_X));
        fo.setAttribute('y', String(BADGE_Y));
        fo.setAttribute('width', String(BADGE_W));
        fo.setAttribute('height', String(BADGE_H));
        var d = makeBadgeDiv(currentBadge());
        d.style.letterSpacing = fitGap(currentBadge(), BADGE_FONT, BADGE_BASE_GAP, BADGE_MAX_W) + 'px';
        fo.appendChild(d);
        svg.appendChild(fo);
      }
      var badgeDiv = svg.querySelector('foreignObject[data-brand-badge] .dsh-brand-edit');
      if (badgeDiv) badgeDiv.style.color = custom ? '' : 'transparent';
      var dsImg = currentDsImg();
      setDeepSeekPaths(svg, !!dsImg);
      if (!svg.querySelector('foreignObject[data-brand-ds]')) {
        var fo2 = buildImageOverlay(DS_X, DS_Y, DS_W, DS_H, KEY_DS_IMG, 'double-click to change image; right-click to restore text');
        fo2.setAttribute('data-brand-ds', '1');
        svg.appendChild(fo2);
      }
      syncImage(svg.querySelector('foreignObject[data-brand-ds]'), KEY_DS_IMG);
      var logo = currentLogo();
      setWhale(svg, !!logo);
      if (!svg.querySelector('foreignObject[data-brand-logo]')) {
        var fo3 = buildImageOverlay(LOGO_X, LOGO_Y, LOGO_W, LOGO_H, KEY_LOGO, 'double-click to change logo; right-click to reset');
        fo3.setAttribute('data-brand-logo', '1');
        svg.appendChild(fo3);
      }
      syncImage(svg.querySelector('foreignObject[data-brand-logo]'), KEY_LOGO);
      return true;
    }

    function ensure() {
      if (!ensureSlotted()) ensureLegacy();
    }

    function apply(ctx) {
      var style = document.createElement('style');
      style.setAttribute('data-plugin', 'dsh-custom-brand');
      style.textContent = CSS;
      document.head.appendChild(style);

      var timer = window.setInterval(ensure, 500);
      ensure();
      applyTitle();

      // Tracking is measured against the live font metrics, so redo it once
      // Montserrat has actually loaded.
      try {
        if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
          document.fonts.ready.then(function () {
            document.querySelectorAll('.dsh-brand-edit').forEach(function (d) { d.__brandKey = ''; });
            ensure();
          }).catch(function () {});
        }
      } catch (e) {}

      ctx.effect(function () {
        return function () {
          window.clearInterval(timer);
          document.querySelectorAll('[data-brand-logo],[data-brand-badge]').forEach(function (n) { n.remove(); });
          document.querySelectorAll('[' + ATTR + ']').forEach(function (n) {
            n.removeAttribute(ATTR);
            n.style.position = '';
            var s = n.querySelector('svg');
            if (s) s.style.visibility = '';
          });
          document.querySelectorAll('svg').forEach(function (s) {
            delete s.__brandBox;
            if (s.hasAttribute('data-brand-badge-svg')) s.removeAttribute('data-brand-badge-svg');
            var g = s.querySelector(BADGE_CLIP_SEL);
            if (g && g.style.display === 'none') g.style.display = '';
            var whale = s.querySelector(WHALE_CLIP_SEL);
            if (whale) whale.style.display = '';
            for (var i = 0; i < s.children.length; i++) {
              var el = s.children[i];
              if (el.tagName === 'path' && el.style.display === 'none') el.style.display = '';
            }
          });
          if (style.parentNode) style.parentNode.removeChild(style);
          document.title = 'DeepSeek Harness';
        };
      });
    }

    module.exports = { apply: apply, inject: [] };
    return module.exports;
  }
});
