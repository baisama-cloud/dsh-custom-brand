/*
 * Regression test for the sidebar brand plugin.
 *
 * The plugin reaches into the host client's DOM, so the shipped layout is the
 * contract: this test rebuilds the real sidebar structure (hashed CSS-module
 * class names included) and asserts what the plugin does to it.
 *
 * Run with:  node test/client.dom-test.cjs
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'client.js'), 'utf8');

// ---- minimal selector engine, covering only what the plugin uses ----------
function matches(el, sel) {
  sel = sel.trim();
  if (sel.includes(',')) return sel.split(',').some((s) => matches(el, s.trim()));
  let m;
  if ((m = sel.match(/^\.([A-Za-z0-9_-]+)$/))) return String(el.className).split(/\s+/).includes(m[1]);
  if ((m = sel.match(/^([a-zA-Z]+)?\[([a-zA-Z-]+)\*="([^"]+)"\]$/))) {
    const [, tag, attr, frag] = m;
    if (tag && el.tagName !== tag.toUpperCase()) return false;
    if (attr === 'class') return String(el.className).includes(frag);
    return String(el._attrs[attr] || '').includes(frag);
  }
  if ((m = sel.match(/^([a-zA-Z]+)?\[([a-zA-Z-]+)(?:="([^"]*)")?\]$/))) {
    const [, tag, attr, val] = m;
    if (tag && el.tagName !== tag.toUpperCase()) return false;
    if (val === undefined) return attr in el._attrs;
    return el._attrs[attr] === val;
  }
  if (/^[a-zA-Z]+$/.test(sel)) return el.tagName === sel.toUpperCase();
  return false;
}
function query(root, sel) {
  const out = [];
  (function walk(n) {
    for (const c of n.children) {
      if (matches(c, sel)) out.push(c);
      walk(c);
    }
  })(root);
  return out;
}
function makeEl(tag, attrs = {}, cls = '') {
  return {
    tagName: tag.toUpperCase(), _attrs: { ...attrs }, className: cls, style: {}, children: [],
    parentNode: null, textContent: '', listeners: {},
    get firstElementChild() { return this.children[0] || null; },
    get firstChild() { return this.children[0] || null; },
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return k in this._attrs ? this._attrs[k] : null; },
    hasAttribute(k) { return k in this._attrs; },
    removeAttribute(k) { delete this._attrs[k]; },
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
    insertBefore(c) { c.parentNode = this; this.children.unshift(c); return c; },
    removeChild(c) { this.children = this.children.filter((x) => x !== c); return c; },
    remove() { if (this.parentNode) this.parentNode.removeChild(this); },
    addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); },
    replaceWith(n) {
      const p = this.parentNode; if (!p) return;
      const i = p.children.indexOf(this); p.children[i] = n; n.parentNode = p;
    },
    getBoundingClientRect() { return { width: 156, height: 24, top: 10, left: 5, right: 161, bottom: 34 }; },
    // The official badge glyph run, measured from the shipped outline paths.
    getBBox() {
      if (String(this._attrs['clip-path'] || '').includes('badge-clip')) {
        return { x: 132.848, y: 8.932, width: 45.601, height: 7.205 };
      }
      return { x: 0, y: 0, width: 0, height: 0 };
    },
    get ownerSVGElement() { let p = this.parentNode; while (p) { if (p.tagName === 'SVG') return p; p = p.parentNode; } return null; },
    querySelector(sel) { return query(this, sel)[0] || null; },
    querySelectorAll(sel) { return query(this, sel); },
  };
}

const document = makeEl('html');
document.head = makeEl('head');
document.body = makeEl('body');
document.documentElement = makeEl('html');
document.appendChild(document.head);
document.appendChild(document.body);
document.title = 'DeepSeek Harness';
document.createElement = (t) => makeEl(t);
document.createElementNS = (ns, t) => makeEl(t);
function docQuery(sel) {
  const out = [];
  for (const top of document.children) {
    if (matches(top, sel)) out.push(top);
    out.push(...query(top, sel));
  }
  return out;
}
document.querySelector = (s) => docQuery(s)[0] || null;
document.querySelectorAll = (s) => docQuery(s);

// ---- the real sidebar structure (hashed CSS-module class names) -----------
const sidebar = makeEl('div', {}, '_2H3hWW_root');
const logoRow = makeEl('div', {}, '_2H3hWW_logoRow');
const identity = makeEl('span', {}, '_2H3hWW_brandIdentity');

const brandMark = makeEl('span', {}, '_2H3hWW_brandMark');
const fishSvg = makeEl('svg', { viewBox: '0 0 23.16 17.04' });
brandMark.appendChild(fishSvg);

const brandName = makeEl('span', {}, '_2H3hWW_brandName');
const wordmarkSvg = makeEl('svg', { viewBox: '26 0 156 24' });
const letterPath = makeEl('path', { fill: 'currentColor' });
const whaleG = makeEl('g', { 'clip-path': 'url(#dsh-wordmark-whale-clip)' });
const badgeG = makeEl('g', { 'clip-path': 'url(#dsh-wordmark-badge-clip)' });
badgeG.appendChild(makeEl('path'));
wordmarkSvg.appendChild(letterPath);
wordmarkSvg.appendChild(whaleG);
wordmarkSvg.appendChild(badgeG);
brandName.appendChild(wordmarkSvg);

identity.appendChild(brandMark);
identity.appendChild(brandName);
logoRow.appendChild(identity);
sidebar.appendChild(logoRow);
document.body.appendChild(sidebar);

let store = {};
const localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
const sandbox = {
  window: { __ModuleLoader__: { load: (o) => { sandbox.__plugin = o; } }, setInterval: () => 1, clearInterval: () => {} },
  document, localStorage, console, Set, WeakMap, Image: function () {}, FileReader: function () {},
};
sandbox.window.document = document;
vm.createContext(sandbox);
vm.runInContext(src, sandbox);

const results = [];
const check = (name, cond, extra = '') => results.push([cond ? 'PASS' : 'FAIL', name, extra]);
const run = () => sandbox.__plugin.factory(() => ({})).apply({ effect: () => () => {} });
const badgeDiv = () => {
  const layer = document.querySelector('[data-brand-badge]');
  return layer && layer.firstElementChild ? layer.firstElementChild.firstElementChild : null;
};

run();

check('mark host found', !!document.querySelector('[class*="brandMark"]'));
check('name host found', !!document.querySelector('[class*="brandName"]'));
check('logo hit layer injected', !!document.querySelector('[data-brand-logo]'));
check('badge layer injected', !!document.querySelector('[data-brand-badge]'));
check('badge shows HARNESS', badgeDiv() && badgeDiv().textContent === 'HARNESS');

// default state: stay pixel-identical to stock
check('official glyphs VISIBLE by default', badgeG.style.display !== 'none', 'display=' + JSON.stringify(badgeG.style.display));
check('edit layer transparent by default', badgeDiv().style.color === 'transparent', 'color=' + badgeDiv().style.color);
check('React lettering visible (no custom img)', wordmarkSvg.style.visibility !== 'hidden');
check('React whale visible (no custom logo)', fishSvg.style.visibility !== 'hidden');
check('svg not mutated', wordmarkSvg.children.length === 3, 'children=' + wordmarkSvg.children.length);

// typography matched to the official glyph run
const expectedFont = 7.205 / 0.7; // cap height / Montserrat cap ratio
check('font-size matches official cap height',
  Math.abs(parseFloat(badgeDiv().style.fontSize) - expectedFont) < 0.02,
  'got=' + badgeDiv().style.fontSize);
check('letter-spacing computed', /px$/.test(badgeDiv().style.letterSpacing || ''), 'ls=' + badgeDiv().style.letterSpacing);
check('tracking compensation applied', /px$/.test(badgeDiv().style.marginRight || ''), 'mr=' + badgeDiv().style.marginRight);
check('no scaleX hack', !/scaleX/.test(badgeDiv().style.transform || ''));
check('css uses the brand font', /Montserrat/.test(src));

// renamed badge: the official glyphs step aside
store['dsh.customBrand'] = 'ACME';
run();
check('official glyphs HIDDEN when custom', badgeG.style.display === 'none');
check('edit layer visible when custom', badgeDiv().style.color !== 'transparent');
check('badge text synced from storage', badgeDiv().textContent === 'ACME', badgeDiv().textContent);

// reset returns the official artwork
delete store['dsh.customBrand'];
run();
check('official glyphs return after reset', badgeG.style.display !== 'none');

// image replacements still behave
store['dsh.customLogo'] = 'data:image/png;base64,AAAA';
store['dsh.customDeepSeekImg'] = 'data:image/png;base64,BBBB';
run();
check('whale hidden when custom logo set', fishSvg.style.visibility === 'hidden');
check('wordmark hidden when custom image set', wordmarkSvg.style.visibility === 'hidden');

const w = Math.max(...results.map((r) => r[1].length));
for (const [st, name, extra] of results) {
  console.log(st.padEnd(5) + ' ' + name.padEnd(w) + (extra ? '  [' + extra + ']' : ''));
}
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log('\n' + (results.length - failed) + '/' + results.length + ' passed');
process.exit(failed ? 1 : 0);
