import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HTML_PATH = path.resolve(__dirname, '../../index.html');

/**
 * Lightweight mock element supporting DOM interactions, classList, events, and hierarchy.
 */
export class MockElement {
  constructor(tagName = 'div', attributes = {}) {
    this.tagName = tagName.toUpperCase();
    this.id = attributes.id || '';
    this.className = attributes.class || '';
    this._value = attributes.value || '';
    this.type = attributes.type || '';
    this._textContent = '';
    this._innerHTML = '';
    this.style = {};
    this.dataset = {};
    this.attributes = { ...attributes };
    this.listeners = new Map();
    this.children = [];
    this.parentElement = null;

    // Extract dataset attributes (data-*)
    for (const [k, v] of Object.entries(attributes)) {
      if (k.startsWith('data-')) {
        const prop = k.slice(5).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
        this.dataset[prop] = v;
      }
    }

    const self = this;
    this.classList = {
      _classes: new Set(self.className ? self.className.split(/\s+/).filter(Boolean) : []),
      add(...cls) {
        cls.forEach(c => this._classes.add(c));
        self.className = Array.from(this._classes).join(' ');
      },
      remove(...cls) {
        cls.forEach(c => this._classes.delete(c));
        self.className = Array.from(this._classes).join(' ');
      },
      contains(c) {
        return this._classes.has(c);
      },
      toggle(c, force) {
        if (force === true) {
          this.add(c);
          return true;
        } else if (force === false) {
          this.remove(c);
          return false;
        }
        if (this.contains(c)) {
          this.remove(c);
          return false;
        } else {
          this.add(c);
          return true;
        }
      }
    };
  }

  get value() {
    return this._value;
  }

  set value(val) {
    this._value = String(val);
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(val) {
    this._textContent = val == null ? '' : String(val);
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(html) {
    this._innerHTML = html;
    this.children = [];
    if (!html) return;

    // Parse all open/self-closing tags inside html string
    const tagRegex = /<([a-zA-Z0-9]+)([^>]*)>/g;
    let match;
    while ((match = tagRegex.exec(html)) !== null) {
      const tagName = match[1];
      if (tagName.startsWith('/')) continue;
      const attrStr = match[2] || '';
      const attrs = parseAttributes(attrStr);
      const child = new MockElement(tagName, attrs);
      child.parentElement = this;
      this.children.push(child);
    }
  }

  addEventListener(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
  }

  removeEventListener(event, handler) {
    if (!this.listeners.has(event)) return;
    this.listeners.set(event, this.listeners.get(event).filter(h => h !== handler));
  }

  dispatchEvent(eventObj) {
    const event = typeof eventObj === 'string' ? { type: eventObj } : eventObj;
    if (!event.target) event.target = this;
    let curr = this;
    while (curr) {
      event.currentTarget = curr;
      const handlers = curr.listeners.get(event.type) || [];
      for (const h of handlers) {
        h(event);
      }
      curr = curr.parentElement;
    }
  }

  click() {
    this.dispatchEvent({ type: 'click', target: this });
  }

  focus() {}
  select() {}

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentElement = null;
    }
    return child;
  }

  closest(selector) {
    let curr = this;
    while (curr) {
      if (matchesSelector(curr, selector)) return curr;
      curr = curr.parentElement;
    }
    return null;
  }

  querySelector(selector) {
    return querySelectorInternal(this, selector);
  }

  querySelectorAll(selector) {
    const results = [];
    querySelectorAllInternal(this, selector, results);
    return results;
  }

  getContext(type) {
    if (type === '2d') {
      return {
        clearRect: () => {},
        fillRect: () => {},
        beginPath: () => {},
        arc: () => {},
        fill: () => {},
        stroke: () => {},
        strokeRect: () => {},
        fillText: () => {},
        createRadialGradient: () => ({ addColorStop: () => {} }),
        createLinearGradient: () => ({ addColorStop: () => {} }),
        drawImage: () => {},
        save: () => {},
        restore: () => {},
        setLineDash: () => {},
        createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })
      };
    }
    return null;
  }
}

function parseAttributes(attrString) {
  const attrs = {};
  const regex = /([a-zA-Z0-9-]+)(?:=(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
  let match;
  while ((match = regex.exec(attrString)) !== null) {
    const key = match[1];
    const val = match[2] ?? match[3] ?? match[4] ?? '';
    attrs[key] = val;
  }
  return attrs;
}

function matchesSelector(el, selector) {
  if (!el || !selector) return false;
  if (selector.startsWith('.')) {
    return el.classList.contains(selector.slice(1));
  }
  if (selector.startsWith('#')) {
    return el.id === selector.slice(1);
  }
  if (selector.startsWith('[') && selector.endsWith(']')) {
    const attrMatch = selector.slice(1, -1).match(/^([a-zA-Z0-9-]+)(?:="([^"]*)")?$/);
    if (attrMatch) {
      const [, attr, val] = attrMatch;
      if (val === undefined) return attr in el.attributes || attr in el.dataset;
      return el.attributes[attr] === val;
    }
  }
  return el.tagName === selector.toUpperCase();
}

function querySelectorInternal(root, selector) {
  for (const child of root.children) {
    if (matchesSelector(child, selector)) return child;
    const found = querySelectorInternal(child, selector);
    if (found) return found;
  }
  return null;
}

function querySelectorAllInternal(root, selector, acc) {
  for (const child of root.children) {
    if (matchesSelector(child, selector)) acc.push(child);
    querySelectorAllInternal(child, selector, acc);
  }
}

/**
 * Loads index.html and returns an indexed map of elements and a MockDocument.
 */
export function loadIndexHtml() {
  const rawHtml = fs.readFileSync(HTML_PATH, 'utf-8');
  const elementsById = new Map();
  const allElements = [];

  // Match tags with attributes
  const tagRegex = /<([a-zA-Z0-9]+)([^>]*)>/g;
  let match;
  while ((match = tagRegex.exec(rawHtml)) !== null) {
    const tagName = match[1];
    if (['meta', 'link', 'br', 'hr', 'head', 'html', '!doctype'].includes(tagName.toLowerCase())) continue;
    const attrStr = match[2];
    const attrs = parseAttributes(attrStr);
    const elem = new MockElement(tagName, attrs);
    allElements.push(elem);
    if (attrs.id) {
      elementsById.set(attrs.id, elem);
    }
  }

  const mockDocument = {
    getElementById(id) {
      return elementsById.get(id) || null;
    },
    querySelector(selector) {
      for (const el of allElements) {
        if (matchesSelector(el, selector)) return el;
      }
      return null;
    },
    querySelectorAll(selector) {
      return allElements.filter(el => matchesSelector(el, selector));
    },
    createElement(tag) {
      return new MockElement(tag);
    }
  };

  return { rawHtml, elementsById, allElements, mockDocument };
}

/**
 * Setup global DOM environment using index.html
 */
export function setupGlobalDom() {
  const dom = loadIndexHtml();
  const originalDoc = globalThis.document;
  const originalWin = globalThis.window;

  globalThis.document = dom.mockDocument;
  globalThis.window = {
    innerWidth: 1920,
    innerHeight: 1080,
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  return {
    ...dom,
    restore() {
      globalThis.document = originalDoc;
      globalThis.window = originalWin;
    }
  };
}
