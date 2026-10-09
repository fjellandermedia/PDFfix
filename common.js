// Shared helpers for the PDFfix pages: file reading, zip writing,
// thumbnails with remove buttons, and the download button/file list.
(function (global) {
  'use strict';

  const PDFfix = {};

  // ---------- pdf.js ----------
  PDFfix.setupPdfjs = function () {
    if (global.pdfjsLib) {
      // Works from file:// too: if the real worker cannot start, pdf.js
      // falls back to running the worker code on the main thread.
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
    }
    return !!global.pdfjsLib;
  };
  PDFfix.openPdfjs = function (bytes) {
    // pdf.js takes ownership of the buffer it is given, so hand it a copy.
    return pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
  };

  // ---------- Files ----------
  PDFfix.formatSize = function (bytes) {
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' kB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };
  PDFfix.stripPdf = function (name) {
    return (name || '').replace(/\.pdf$/i, '');
  };
  PDFfix.isPdfFile = function (file) {
    return !!file && (/\.pdf$/i.test(file.name) || file.type === 'application/pdf');
  };
  // Wires a drop zone (a label wrapping a file input) to a callback.
  PDFfix.bindDrop = function (dropEl, inputEl, onFile) {
    inputEl.addEventListener('change', () => onFile(inputEl.files[0]));
    ['dragenter', 'dragover'].forEach((ev) => dropEl.addEventListener(ev, (e) => {
      e.preventDefault(); dropEl.classList.add('over');
    }));
    ['dragleave', 'drop'].forEach((ev) => dropEl.addEventListener(ev, (e) => {
      e.preventDefault(); dropEl.classList.remove('over');
    }));
    dropEl.addEventListener('drop', (e) => {
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) onFile(file);
    });
  };
  PDFfix.showFileName = function (el, file) {
    el.innerHTML = 'Vald fil: <b></b> (' + PDFfix.formatSize(file.size) + ')';
    el.querySelector('b').textContent = file.name;
  };

  // ---------- Status ----------
  PDFfix.setStatus = function (el, text, kind) {
    el.textContent = text;
    el.className = 'status' + (kind ? ' ' + kind : '');
  };
  PDFfix.log = function (el, text) {
    el.textContent += (el.textContent ? '\n' : '') + text;
  };
  PDFfix.plural = function (n, one, many) {
    return n + ' ' + (n === 1 ? one : many);
  };

  // ---------- Blob URLs ----------
  PDFfix.UrlPool = class {
    constructor() { this.urls = []; }
    make(bytes, type) {
      const url = URL.createObjectURL(new Blob([bytes], { type }));
      this.urls.push(url);
      return url;
    }
    revokeAll() {
      this.urls.forEach((u) => URL.revokeObjectURL(u));
      this.urls = [];
    }
  };

  // Shows one file as a direct download, or several as a zip plus a list.
  // files: [{ name, bytes }]
  PDFfix.publishFiles = function (opts) {
    const { files, urls, downloadEl, listEl, listItemsEl, zipName } = opts;
    urls.revokeAll();
    listItemsEl.innerHTML = '';
    if (files.length === 1) {
      const f = files[0];
      downloadEl.href = urls.make(f.bytes, 'application/pdf');
      downloadEl.download = f.name;
      downloadEl.textContent = 'Ladda ner resultatet';
      listEl.hidden = true;
    } else {
      const zipBytes = PDFfix.makeZip(files.map((f) => ({ name: f.name, data: f.bytes })));
      downloadEl.href = urls.make(zipBytes, 'application/zip');
      downloadEl.download = zipName;
      downloadEl.textContent = 'Ladda ner alla som zip (' + files.length + ' filer)';
      files.forEach((f) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = urls.make(f.bytes, 'application/pdf');
        a.download = f.name;
        a.textContent = f.name;
        li.appendChild(a);
        listItemsEl.appendChild(li);
      });
      listEl.hidden = false;
    }
    downloadEl.hidden = false;
  };
  PDFfix.hideFiles = function (opts) {
    const { urls, downloadEl, listEl, listItemsEl } = opts;
    urls.revokeAll();
    downloadEl.hidden = true;
    downloadEl.removeAttribute('href');
    listEl.hidden = true;
    listEl.open = false;
    listItemsEl.innerHTML = '';
  };

  // ---------- Thumbnails ----------
  PDFfix.THUMB_WIDTH = 240;

  // Renders page `pageIndex` (0-based) of a pdf.js document at the given width.
  PDFfix.renderPage = async function (pdf, pageIndex, width) {
    const page = await pdf.getPage(pageIndex + 1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: width / base.width });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    page.cleanup();
    return canvas;
  };
  PDFfix.cropCanvas = function (src, x, w) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = src.height;
    c.getContext('2d').drawImage(src, x, 0, w, src.height, 0, 0, w, src.height);
    return c;
  };

  // Builds a thumbnail card with a remove/undo button.
  // Returns { el, setRemoved(bool) }.
  PDFfix.makeThumb = function (opts) {
    const { canvas, label, origin, removed, onToggle, className } = opts;
    const div = document.createElement('div');
    div.className = 'thumb' + (className ? ' ' + className : '');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'remove';
    const b = document.createElement('b');
    b.textContent = label;
    const span = document.createElement('span');
    span.textContent = origin;
    div.append(canvas, btn, b, span);

    function setRemoved(isRemoved) {
      div.classList.toggle('removed', isRemoved);
      btn.textContent = isRemoved ? '↶' : '✕';
      btn.title = isRemoved ? 'Ångra borttagning' : 'Ta bort sidan';
      btn.setAttribute('aria-label', btn.title);
      btn.setAttribute('aria-pressed', isRemoved ? 'true' : 'false');
    }
    setRemoved(!!removed);
    btn.addEventListener('click', onToggle);
    return { el: div, setRemoved };
  };
  PDFfix.heading = function (text) {
    const h = document.createElement('h3');
    h.textContent = text;
    return h;
  };

  // Runs `fn` after a short pause, collapsing bursts of calls, and never
  // overlapping two runs.
  PDFfix.debouncedRunner = function (fn, delay) {
    let timer = null, running = false, pending = false;
    async function run() {
      if (running) { pending = true; return; }
      running = true;
      try { await fn(); } finally {
        running = false;
        if (pending) { pending = false; run(); }
      }
    }
    return {
      schedule() { clearTimeout(timer); timer = setTimeout(run, delay || 400); },
      cancel() { clearTimeout(timer); },
    };
  };

  // ---------- Minimal ZIP writer (store only, no compression) ----------
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function dosDateTime(d) {
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    return { time, date };
  }
  // entries: [{ name, data: Uint8Array }]
  PDFfix.makeZip = function (entries) {
    const enc = new TextEncoder();
    const now = dosDateTime(new Date());
    const parts = [];
    const central = [];
    let offset = 0;
    for (const e of entries) {
      const name = enc.encode(e.name);
      const data = e.data instanceof Uint8Array ? e.data : new Uint8Array(e.data);
      const crc = crc32(data);
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);        // version needed
      local.setUint16(6, 0x0800, true);    // flags: UTF-8 names
      local.setUint16(8, 0, true);         // method: store
      local.setUint16(10, now.time, true);
      local.setUint16(12, now.date, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, data.length, true);
      local.setUint32(22, data.length, true);
      local.setUint16(26, name.length, true);
      local.setUint16(28, 0, true);
      parts.push(new Uint8Array(local.buffer), name, data);

      const cd = new DataView(new ArrayBuffer(46));
      cd.setUint32(0, 0x02014b50, true);
      cd.setUint16(4, 20, true);           // version made by
      cd.setUint16(6, 20, true);           // version needed
      cd.setUint16(8, 0x0800, true);
      cd.setUint16(10, 0, true);
      cd.setUint16(12, now.time, true);
      cd.setUint16(14, now.date, true);
      cd.setUint32(16, crc, true);
      cd.setUint32(20, data.length, true);
      cd.setUint32(24, data.length, true);
      cd.setUint16(28, name.length, true);
      cd.setUint16(30, 0, true);           // extra
      cd.setUint16(32, 0, true);           // comment
      cd.setUint16(34, 0, true);           // disk
      cd.setUint16(36, 0, true);           // internal attrs
      cd.setUint32(38, 0, true);           // external attrs
      cd.setUint32(42, offset, true);
      central.push(new Uint8Array(cd.buffer), name);
      offset += 30 + name.length + data.length;
    }
    const cdSize = central.reduce((s, p) => s + p.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(4, 0, true);
    end.setUint16(6, 0, true);
    end.setUint16(8, entries.length, true);
    end.setUint16(10, entries.length, true);
    end.setUint32(12, cdSize, true);
    end.setUint32(16, offset, true);
    end.setUint16(20, 0, true);
    const all = [...parts, ...central, new Uint8Array(end.buffer)];
    const total = all.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(total);
    let pos = 0;
    for (const p of all) { out.set(p, pos); pos += p.length; }
    return out;
  };

  global.PDFfix = PDFfix;
})(window);
