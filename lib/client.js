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
    var SVG_SEL = 'button svg[viewBox="0 0 182 24"]';
    var BADGE_TEXT_SEL = 'g[clip-path*="badge"]';
    var WHALE_SEL = 'g[clip-path*="whale"]';
    var SVG_NS = 'http://www.w3.org/2000/svg';
    var MAX_EDGE = 256; // longest edge in px for stored logo images

    // user-tuned badge params (HARNESS stays editable text)
    var BADGE_FONT = 10;
    var BADGE_SCALE_X = 0.82;
    var BADGE_BASE_GAP = 1.5;
    var BADGE_MAX_W = 50;
    var MIN_GAP = 0.4;

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
    function currentLogo() { return read(KEY_LOGO); }
    function currentDsImg() { return read(KEY_DS_IMG); }

    var CSS =
      '.dsh-brand-edit{display:flex;align-items:center;justify-content:center;width:100%;height:100%;box-sizing:border-box;color:var(--dsw-alias-label-primary-inverted,#fff);font-family:inherit;font-size:' + BADGE_FONT + 'px;font-weight:400;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:text;filter:blur(.3px);transform:scaleX(' + BADGE_SCALE_X + ')}' +
      '.dsh-brand-edit:hover{outline:1px dashed var(--dsw-alias-border-l2,rgba(128,128,128,.5));outline-offset:-1px;border-radius:2px}' +
      '.dsh-brand-input{display:block;width:100%;height:100%;box-sizing:border-box;text-align:center;font-family:inherit;font-size:' + BADGE_FONT + 'px;font-weight:400;line-height:1;color:var(--dsw-alias-label-primary-inverted,#fff);background:transparent;border:none;outline:none;padding:0;min-width:0;transform:scaleX(' + BADGE_SCALE_X + ')}' +
      '.dsh-logo-wrap{position:relative;width:100%;height:100%}' +
      '.dsh-logo-img{width:100%;height:100%;object-fit:contain;display:block}' +
      '.dsh-logo-hit{position:absolute;inset:0;cursor:pointer;background:transparent}' +
      '.dsh-logo-hit:hover{outline:1px dashed var(--dsw-alias-border-l2,rgba(128,128,128,.5));outline-offset:-1px;border-radius:2px}';

    var foreignObjects = new Set();

    function applyTitle() {
      document.title = currentBadge();
    }
    function stop(e) { e.preventDefault(); e.stopPropagation(); }

    function measureWidth(text, gap, fontSize) {
      var probe = document.createElement('span');
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-family:inherit;font-size:' + fontSize + 'px;font-weight:400;letter-spacing:' + gap + 'px;line-height:1';
      probe.textContent = text;
      document.body.appendChild(probe);
      var w = probe.getBoundingClientRect().width;
      probe.remove();
      return w;
    }

    function fitGap(text, fontSize, scaleX, baseGap, maxW) {
      if (text.length <= 1) return 0;
      var gap = baseGap;
      while (gap > MIN_GAP && measureWidth(text, gap, fontSize) * scaleX > maxW) gap -= 0.2;
      return Math.max(MIN_GAP, gap);
    }

    function makeBadgeDiv(text) {
      var div = document.createElement('div');
      div.className = 'dsh-brand-edit';
      div.textContent = text;
      div.title = 'double-click to edit';
      div.style.letterSpacing = fitGap(text, BADGE_FONT, BADGE_SCALE_X, BADGE_BASE_GAP, BADGE_MAX_W) + 'px';
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
      input.style.letterSpacing = (div.style.letterSpacing || fitGap(div.textContent, BADGE_FONT, BADGE_SCALE_X, BADGE_BASE_GAP, BADGE_MAX_W)) + 'px';
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
          });
        };
        reader.readAsDataURL(file);
      });
      input.click();
    }

    function hideBadgeText(svg) {
      var textG = svg.querySelector(BADGE_TEXT_SEL);
      if (textG) textG.style.display = 'none';
    }
    function setDeepSeekPaths(svg, hide) {
      for (var i = 0; i < svg.children.length; i++) {
        var el = svg.children[i];
        if (el.tagName === 'path') el.style.display = hide ? 'none' : '';
      }
    }
    function setWhale(svg, hide) {
      var g = svg.querySelector(WHALE_SEL);
      if (g) g.style.display = hide ? 'none' : '';
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
      });
      wrap.appendChild(hit);
      fo.appendChild(wrap);
      return fo;
    }

    // Keep each image overlay in sync with storage: create the <img> when a
    // value exists, remove it when cleared (right-click reset), update src.
    function syncImage(foEl, imgKey) {
      var wrap = foEl.firstElementChild;
      if (!wrap) return;
      var src = read(imgKey);
      var img = foEl.querySelector('img');
      if (src) {
        if (!img) {
          var el = document.createElement('img');
          el.className = 'dsh-logo-img';
          el.draggable = false;
          wrap.insertBefore(el, wrap.firstChild);
        }
        var cur = foEl.querySelector('img');
        if (cur && cur.src !== src) cur.src = src;
      } else if (img) {
        img.remove();
      }
    }

    function ensure() {
      var svg = document.querySelector(SVG_SEL);
      if (!svg) return;
      if (!svg.hasAttribute(ATTR)) {
        svg.setAttribute(ATTR, '1');
        hideBadgeText(svg);
      }
      // badge overlay (editable text)
      if (!svg.querySelector('foreignObject[data-brand-badge]')) {
        var fo = document.createElementNS(SVG_NS, 'foreignObject');
        fo.setAttribute('data-brand-badge', '1');
        fo.setAttribute('x', '129.348');
        fo.setAttribute('y', '5.5');
        fo.setAttribute('width', '52');
        fo.setAttribute('height', '14');
        fo.appendChild(makeBadgeDiv(currentBadge()));
        svg.appendChild(fo);
        foreignObjects.add(fo);
      }
      // DeepSeek image overlay: hide letterform paths only when an image is set
      var dsImg = currentDsImg();
      setDeepSeekPaths(svg, !!dsImg);
      if (!svg.querySelector('foreignObject[data-brand-ds]')) {
        var fo2 = buildImageOverlay(27, 7.66, 94, 13.84, KEY_DS_IMG, 'double-click to change image; right-click to restore text');
        fo2.setAttribute('data-brand-ds', '1');
        svg.appendChild(fo2);
        foreignObjects.add(fo2);
      }
      syncImage(svg.querySelector('foreignObject[data-brand-ds]'), KEY_DS_IMG);
      // logo overlay: custom image, else transparent hit layer over the whale
      var logo = currentLogo();
      setWhale(svg, !!logo);
      if (!svg.querySelector('foreignObject[data-brand-logo]')) {
        var fo3 = buildImageOverlay(0.14, 3.52, 23.16, 17.04, KEY_LOGO, 'double-click to change logo; right-click to reset');
        fo3.setAttribute('data-brand-logo', '1');
        svg.appendChild(fo3);
        foreignObjects.add(fo3);
      }
      syncImage(svg.querySelector('foreignObject[data-brand-logo]'), KEY_LOGO);
    }

    function apply(ctx) {
      var style = document.createElement('style');
      style.setAttribute('data-plugin', 'dsh-custom-brand');
      style.textContent = CSS;
      document.head.appendChild(style);

      var timer = window.setInterval(ensure, 500);
      ensure();
      applyTitle();

      ctx.effect(function () {
        return function () {
          window.clearInterval(timer);
          for (var fo of foreignObjects) fo.remove();
          foreignObjects.clear();
          var svg = document.querySelector(SVG_SEL);
          if (svg) {
            svg.removeAttribute(ATTR);
            var textG = svg.querySelector(BADGE_TEXT_SEL);
            if (textG) textG.style.display = '';
            for (var i = 0; i < svg.children.length; i++) {
              var el = svg.children[i];
              if (el.tagName === 'path') el.style.display = '';
            }
            var whale = svg.querySelector(WHALE_SEL);
            if (whale) whale.style.display = '';
          }
          if (style.parentNode) style.parentNode.removeChild(style);
          document.title = 'DeepSeek Harness';
        };
      });
    }

    module.exports = { apply: apply, inject: [] };
    return module.exports;
  }
});
