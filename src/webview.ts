import { ParsedLdf } from './parser';

export function getLdfWebviewContent(parsed: ParsedLdf, fileName: string): string {
  const payload = JSON.stringify({ fileName, ...parsed }).replace(/<\//g, '<\\/');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>
  :root { color-scheme: dark light; }
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body {
    font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
    font-size: 12px;
    background: var(--vscode-editor-background, #1e1e1e);
    color: var(--vscode-editor-foreground, #d4d4d4);
    display: flex; flex-direction: column; overflow: hidden;
  }
  .mono { font-family: var(--vscode-editor-font-family, 'Cascadia Code', Consolas, monospace); }
  #toolbar {
    display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
    padding: 8px 12px;
    background: var(--vscode-editorWidget-background, #252526);
    border-bottom: 1px solid var(--vscode-panel-border, #3c3c3c);
    flex: 0 0 auto;
  }
  #title { font-weight: 600; font-size: 13px; margin-right: 4px; }
  input[type="text"], input[type="number"], select, button {
    background: var(--vscode-input-background, #3c3c3c);
    color: var(--vscode-input-foreground, #d4d4d4);
    border: 1px solid var(--vscode-input-border, #555);
    padding: 3px 6px; border-radius: 3px; font: inherit;
  }
  input[type="text"]:focus, input[type="number"]:focus, select:focus {
    outline: 1px solid var(--vscode-focusBorder, #007fd4);
    outline-offset: -1px;
  }
  #search { width: 220px; }
  button { cursor: pointer; }
  button:hover { filter: brightness(1.15); }
  button.primary {
    background: var(--vscode-button-background, #0e639c);
    color: var(--vscode-button-foreground, #fff);
    border-color: var(--vscode-button-background, #0e639c);
  }
  button.danger { color: #f48771; border-color: rgba(244, 135, 113, 0.4); }
  .right { margin-left: auto; display: inline-flex; gap: 8px; align-items: center; }
  #tabs {
    display: flex; gap: 2px; padding: 6px 12px 0;
    background: var(--vscode-editorWidget-background, #252526);
    border-bottom: 1px solid var(--vscode-panel-border, #3c3c3c);
    flex: 0 0 auto;
  }
  .tab {
    padding: 6px 12px; border: 1px solid transparent; border-bottom: none;
    border-radius: 4px 4px 0 0; background: transparent;
    color: var(--vscode-descriptionForeground, #999); cursor: pointer;
  }
  .tab:hover { color: var(--vscode-editor-foreground, #d4d4d4); }
  .tab.active {
    background: var(--vscode-editor-background, #1e1e1e);
    color: var(--vscode-editor-foreground, #fff);
    border-color: var(--vscode-panel-border, #3c3c3c);
    font-weight: 600;
  }
  .badge {
    display: inline-block; margin-left: 5px; padding: 0 5px;
    border-radius: 8px; font-size: 10px;
    background: rgba(128,128,128,0.22);
  }
  #content { flex: 1 1 auto; overflow: auto; padding: 12px; }
  .cards {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 10px; margin-bottom: 14px;
  }
  .card {
    background: var(--vscode-editorWidget-background, #252526);
    border: 1px solid var(--vscode-panel-border, #3c3c3c);
    border-radius: 5px; padding: 10px 12px;
  }
  .card-title { font-weight: 600; font-size: 11px; color: var(--vscode-descriptionForeground, #999); margin-bottom: 6px; text-transform: uppercase; }
  .kv { display: grid; grid-template-columns: 110px 1fr; gap: 6px; align-items: center; margin-bottom: 4px; }
  .kv input { width: 100%; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  th, td {
    text-align: left; padding: 5px 6px;
    border-bottom: 1px solid var(--vscode-panel-border, #2d2d2d);
    vertical-align: middle;
  }
  th {
    position: sticky; top: 0; z-index: 1;
    background: var(--vscode-editorWidget-background, #252526);
    color: var(--vscode-descriptionForeground, #aaa);
    font-weight: 600; font-size: 11px;
  }
  td input, td select { width: 100%; min-width: 60px; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .sec-name { color: var(--vscode-symbolIcon-structForeground, #c586c0); font-weight: 600; }
  .pill {
    display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 10px;
    background: rgba(86, 156, 214, 0.16); color: var(--vscode-textLink-foreground, #9cdcfe);
  }
  .bit-grid {
    display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px;
    margin-top: 6px; max-width: 680px;
  }
  .bit-cell {
    padding: 3px 4px; border-radius: 3px; font-size: 10px; text-align: center;
    background: rgba(86, 156, 214, 0.15); border: 1px solid rgba(86, 156, 214, 0.35);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .bit-empty {
    background: rgba(128,128,128,0.08); border: 1px dashed rgba(128,128,128,0.25); color: #777;
  }
  .muted { color: var(--vscode-descriptionForeground, #888); }
  .section-bar { display: flex; justify-content: space-between; align-items: center; margin: 10px 0 8px; }
  h3 { margin: 0; font-size: 13px; }
</style>
</head>
<body>
<div id="toolbar">
  <span id="title" class="mono"></span>
  <input id="search" type="text" placeholder="Filter frames, signals, nodes, schedules...">
  <span class="right">
    <span class="muted" id="syncStatus"></span>
    <button id="openRawBtn" type="button">Edit Raw Text</button>
  </span>
</div>
<div id="tabs"></div>
<div id="content"></div>

<script>
const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;
let DATA = ${payload};
let activeTab = 'overview';

const titleEl = document.getElementById('title');
const searchEl = document.getElementById('search');
const tabsEl = document.getElementById('tabs');
const contentEl = document.getElementById('content');
const syncStatusEl = document.getElementById('syncStatus');

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function syncToDoc() {
  if (!vscode) return;
  syncStatusEl.textContent = 'Modified (Ctrl+S to save)';
  vscode.postMessage({ type: 'applyData', data: DATA });
}

function renderTabs() {
  const tabs = [
    { id: 'overview', label: 'Network & Nodes', count: DATA.nodeAttrs.length || DATA.slaves.length },
    { id: 'frames', label: 'Frames', count: DATA.frames.length },
    { id: 'signals', label: 'Signals', count: DATA.signals.length },
    { id: 'schedules', label: 'Schedule Tables', count: DATA.schedules.length },
    { id: 'encodings', label: 'Encodings', count: DATA.encodings.length },
  ];
  tabsEl.innerHTML = tabs.map(t =>
    '<button class="tab' + (activeTab === t.id ? ' active' : '') + '" data-tab="' + t.id + '">' +
      esc(t.label) + '<span class="badge">' + t.count + '</span>' +
    '</button>'
  ).join('');
}

function renderOverview(q) {
  const m = DATA.master || { name: 'Master', timeBaseMs: 5, jitterMs: 0.1 };
  let html = '<div class="cards">' +
    '<div class="card"><div class="card-title">LIN Bus Settings</div>' +
      '<div class="kv"><span class="muted">Protocol</span><input class="mono" data-net="protocolVersion" type="text" value="' + esc(DATA.protocolVersion || '2.1') + '"></div>' +
      '<div class="kv"><span class="muted">Language</span><input class="mono" data-net="languageVersion" type="text" value="' + esc(DATA.languageVersion || '2.1') + '"></div>' +
      '<div class="kv"><span class="muted">Speed (kbps)</span><input class="mono" data-net="speedKbps" type="number" step="0.1" value="' + (DATA.speedKbps ?? 19.2) + '"></div>' +
      '<div class="kv"><span class="muted">Channel</span><input class="mono" data-net="channelName" type="text" value="' + esc(DATA.channelName || '') + '"></div>' +
    '</div>' +
    '<div class="card"><div class="card-title">Master &amp; Slaves</div>' +
      '<div class="kv"><span class="muted">Master Name</span><input class="mono" data-master="name" type="text" value="' + esc(m.name) + '"></div>' +
      '<div class="kv"><span class="muted">Timebase (ms)</span><input class="mono" data-master="timeBaseMs" type="number" step="0.1" value="' + (m.timeBaseMs ?? 5) + '"></div>' +
      '<div class="kv"><span class="muted">Jitter (ms)</span><input class="mono" data-master="jitterMs" type="number" step="0.05" value="' + (m.jitterMs ?? 0.1) + '"></div>' +
      '<div class="kv"><span class="muted">Slaves</span><input class="mono" id="slavesInput" type="text" value="' + esc(DATA.slaves.join(', ')) + '"></div>' +
    '</div>' +
  '</div>';

  const attrs = DATA.nodeAttrs
    .map((a, idx) => ({ a, idx }))
    .filter(({ a }) => !q || a.name.toLowerCase().includes(q));

  html += '<div class="section-bar"><h3>Slave Node Attributes</h3></div>';
  if (attrs.length) {
    html += '<table><thead><tr><th>Node</th><th>Protocol</th><th>Configured NAD</th><th>Initial NAD</th><th>Product ID</th><th>Response Error</th><th>P2 min (ms)</th><th>ST min (ms)</th></tr></thead><tbody>';
    for (const { a, idx } of attrs) {
      html += '<tr>' +
        '<td class="mono sec-name">' + esc(a.name) + '</td>' +
        '<td><input class="mono" data-na="' + idx + '" data-k="protocol" type="text" value="' + esc(a.protocol || '2.1') + '"></td>' +
        '<td><input class="mono" data-na="' + idx + '" data-k="configuredNad" type="text" value="' + esc(a.configuredNad || '') + '"></td>' +
        '<td><input class="mono" data-na="' + idx + '" data-k="initialNad" type="text" value="' + esc(a.initialNad || '') + '"></td>' +
        '<td><input class="mono" data-na="' + idx + '" data-k="productId" type="text" value="' + esc(a.productId || '') + '"></td>' +
        '<td><input class="mono" data-na="' + idx + '" data-k="responseError" type="text" value="' + esc(a.responseError || '') + '"></td>' +
        '<td><input class="mono" data-na="' + idx + '" data-k="p2MinMs" type="number" value="' + (a.p2MinMs ?? 50) + '"></td>' +
        '<td><input class="mono" data-na="' + idx + '" data-k="stMinMs" type="number" value="' + (a.stMinMs ?? 0) + '"></td>' +
      '</tr>';
    }
    html += '</tbody></table>';
  }
  return html;
}

function renderSignals(q) {
  const encOpts = [''].concat(DATA.encodings.map(e => e.name));
  const rows = DATA.signals
    .map((s, idx) => ({ s, idx }))
    .filter(({ s }) =>
      !q || s.name.toLowerCase().includes(q) || s.publisher.toLowerCase().includes(q) ||
      s.subscribers.some(x => x.toLowerCase().includes(q)) || (s.encoding || '').toLowerCase().includes(q)
    );

  let html = '<div class="section-bar"><h3>Signals (' + rows.length + ')</h3>' +
    '<button class="primary" id="addSigBtn" type="button">+ Add Signal</button></div>';
  html += '<table><thead><tr><th>Name</th><th style="width:72px;">Bits</th><th style="width:80px;">Init</th><th>Publisher</th><th>Subscribers (comma-sep)</th><th>Encoding</th><th style="width:40px;"></th></tr></thead><tbody>';
  for (const { s, idx } of rows) {
    const optsHtml = encOpts.map(e => '<option value="' + esc(e) + '"' + (s.encoding === e ? ' selected' : '') + '>' + esc(e || '(none)') + '</option>').join('');
    html += '<tr>' +
      '<td><input class="mono" data-sig="' + idx + '" data-k="name" type="text" value="' + esc(s.name) + '"></td>' +
      '<td><input class="mono" data-sig="' + idx + '" data-k="sizeBits" type="number" min="1" max="64" value="' + s.sizeBits + '"></td>' +
      '<td><input class="mono" data-sig="' + idx + '" data-k="initValue" type="text" value="' + esc(s.initValue) + '"></td>' +
      '<td><input class="mono" data-sig="' + idx + '" data-k="publisher" type="text" value="' + esc(s.publisher) + '"></td>' +
      '<td><input class="mono" data-sig="' + idx + '" data-k="subscribers" type="text" value="' + esc(s.subscribers.join(', ')) + '"></td>' +
      '<td><select class="mono" data-sig="' + idx + '" data-k="encoding">' + optsHtml + '</select></td>' +
      '<td><button class="danger" data-delsig="' + idx + '" type="button" title="Delete signal">&times;</button></td>' +
    '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

function renderFrames(q) {
  const rows = DATA.frames
    .map((f, idx) => ({ f, idx }))
    .filter(({ f }) =>
      !q || f.name.toLowerCase().includes(q) || f.publisher.toLowerCase().includes(q) ||
      f.signals.some(s => s.name.toLowerCase().includes(q))
    );

  let html = '<div class="section-bar"><h3>Frames (' + rows.length + ')</h3>' +
    '<button class="primary" id="addFrameBtn" type="button">+ Add Frame</button></div>';

  for (const { f, idx } of rows) {
    const idHex = '0x' + (f.id >>> 0).toString(16).toUpperCase().padStart(2, '0');
    const sigMap = new Map(DATA.signals.map(s => [s.name, s]));
    const byteSlots = Array.from({ length: Math.min(8, f.sizeBytes) }, () => []);
    for (const s of f.signals) {
      const sz = sigMap.get(s.name)?.sizeBits ?? s.sizeBits ?? 8;
      const startB = Math.floor(s.offsetBits / 8);
      const endB = Math.min(7, Math.floor((s.offsetBits + sz - 1) / 8));
      for (let b = startB; b <= endB && b < byteSlots.length; b++) {
        byteSlots[b].push(s.name);
      }
    }
    html += '<div class="card" style="margin-bottom:10px;">' +
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px;">' +
        '<input class="mono sec-name" style="width:160px;" data-frm="' + idx + '" data-k="name" type="text" value="' + esc(f.name) + '">' +
        '<label class="muted">ID <input class="mono" style="width:68px;" data-frm="' + idx + '" data-k="id" type="text" value="' + idHex + '"></label>' +
        '<label class="muted">Pub <input class="mono" style="width:120px;" data-frm="' + idx + '" data-k="publisher" type="text" value="' + esc(f.publisher) + '"></label>' +
        '<label class="muted">DLC <input class="mono" style="width:54px;" data-frm="' + idx + '" data-k="sizeBytes" type="number" min="1" max="8" value="' + f.sizeBytes + '"></label>' +
        '<span class="right">' +
          '<button data-addfsig="' + idx + '" type="button">+ Map Signal</button>' +
          '<button class="danger" data-delfrm="' + idx + '" type="button">&times;</button>' +
        '</span>' +
      '</div>' +
      '<div class="bit-grid">' +
        byteSlots.map((names, bIdx) =>
          '<div class="bit-cell mono' + (names.length ? '' : ' bit-empty') + '" title="' + esc(names.join(', ') || 'unused') + '">' +
            'B' + bIdx + (names.length ? ': ' + esc(names[0]) : '') +
          '</div>'
        ).join('') +
      '</div>' +
      '<table style="margin-top:8px;margin-bottom:0;"><thead><tr><th>Mapped Signal</th><th style="width:110px;">Offset (bits)</th><th style="width:90px;">Size (bits)</th><th style="width:40px;"></th></tr></thead><tbody>';
    f.signals.forEach((s, sIdx) => {
      const sz = sigMap.get(s.name)?.sizeBits ?? s.sizeBits ?? '-';
      html += '<tr>' +
        '<td><input class="mono" data-fsig="' + idx + ':' + sIdx + '" data-k="name" type="text" value="' + esc(s.name) + '"></td>' +
        '<td><input class="mono" data-fsig="' + idx + ':' + sIdx + '" data-k="offsetBits" type="number" min="0" max="63" value="' + s.offsetBits + '"></td>' +
        '<td class="mono muted">' + sz + '</td>' +
        '<td><button class="danger" data-delfsig="' + idx + ':' + sIdx + '" type="button">&times;</button></td>' +
      '</tr>';
    });
    html += '</tbody></table></div>';
  }
  return html;
}

function renderSchedules(q) {
  const rows = DATA.schedules
    .map((sc, idx) => ({ sc, idx }))
    .filter(({ sc }) => !q || sc.name.toLowerCase().includes(q) || sc.entries.some(e => e.command.toLowerCase().includes(q)));

  let html = '<div class="section-bar"><h3>Schedule Tables (' + rows.length + ')</h3>' +
    '<button class="primary" id="addSchBtn" type="button">+ Add Schedule Table</button></div>';

  for (const { sc, idx } of rows) {
    const total = sc.entries.reduce((a, e) => a + (Number(e.delayMs) || 0), 0);
    html += '<div class="card" style="margin-bottom:10px;">' +
      '<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">' +
        '<input class="mono sec-name" style="width:200px;" data-sch="' + idx + '" type="text" value="' + esc(sc.name) + '">' +
        '<span class="pill mono">Total cycle: ' + total + ' ms (' + sc.entries.length + ' slots)</span>' +
        '<span class="right">' +
          '<button data-addslot="' + idx + '" type="button">+ Add Slot</button>' +
          '<button class="danger" data-delsch="' + idx + '" type="button">&times;</button>' +
        '</span>' +
      '</div>' +
      '<table style="margin:0;"><thead><tr><th style="width:40px;">#</th><th>Frame / Command</th><th style="width:120px;">Delay (ms)</th><th style="width:40px;"></th></tr></thead><tbody>';
    sc.entries.forEach((e, eIdx) => {
      html += '<tr>' +
        '<td class="muted">' + eIdx + '</td>' +
        '<td><input class="mono" data-slot="' + idx + ':' + eIdx + '" data-k="command" type="text" value="' + esc(e.command) + '"></td>' +
        '<td><input class="mono" data-slot="' + idx + ':' + eIdx + '" data-k="delayMs" type="number" step="0.5" min="0" value="' + e.delayMs + '"></td>' +
        '<td><button class="danger" data-delslot="' + idx + ':' + eIdx + '" type="button">&times;</button></td>' +
      '</tr>';
    });
    html += '</tbody></table></div>';
  }
  return html;
}

function renderEncodings(q) {
  const rows = DATA.encodings.filter(e =>
    !q || e.name.toLowerCase().includes(q) || e.items.some(i => i.detail.toLowerCase().includes(q))
  );
  let html = '<table><thead><tr><th>Encoding</th><th>Type</th><th>Definition</th><th>Unit</th></tr></thead><tbody>';
  for (const e of rows) {
    for (const it of e.items) {
      html += '<tr>' +
        '<td class="mono sec-name">' + esc(e.name) + '</td>' +
        '<td class="mono muted">' + esc(it.kind) + '</td>' +
        '<td class="mono">' + esc(it.detail) + '</td>' +
        '<td class="mono">' + esc(it.unit || '-') + '</td>' +
      '</tr>';
    }
  }
  html += '</tbody></table>';
  return html;
}

function render() {
  titleEl.textContent = DATA.fileName;
  renderTabs();
  const q = searchEl.value.trim().toLowerCase();
  if (activeTab === 'overview') contentEl.innerHTML = renderOverview(q);
  else if (activeTab === 'frames') contentEl.innerHTML = renderFrames(q);
  else if (activeTab === 'signals') contentEl.innerHTML = renderSignals(q);
  else if (activeTab === 'schedules') contentEl.innerHTML = renderSchedules(q);
  else contentEl.innerHTML = renderEncodings(q);
}

tabsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-tab]');
  if (!btn) return;
  activeTab = btn.dataset.tab;
  render();
});

contentEl.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.net) {
    DATA[t.dataset.net] = t.type === 'number' ? parseFloat(t.value) : t.value;
    syncToDoc();
  } else if (t.dataset.master) {
    if (!DATA.master) DATA.master = { name: 'Master', timeBaseMs: 5, jitterMs: 0.1 };
    DATA.master[t.dataset.master] = t.type === 'number' ? parseFloat(t.value) : t.value;
    syncToDoc();
  } else if (t.id === 'slavesInput') {
    DATA.slaves = t.value.split(',').map(x => x.trim()).filter(Boolean);
    syncToDoc();
  } else if (t.dataset.na !== undefined) {
    const a = DATA.nodeAttrs[parseInt(t.dataset.na, 10)];
    if (a) { a[t.dataset.k] = t.type === 'number' ? parseFloat(t.value) : t.value; syncToDoc(); }
  } else if (t.dataset.sig !== undefined) {
    const s = DATA.signals[parseInt(t.dataset.sig, 10)];
    if (s) {
      const k = t.dataset.k;
      if (k === 'subscribers') s.subscribers = t.value.split(',').map(x => x.trim()).filter(Boolean);
      else if (k === 'sizeBits') s.sizeBits = parseInt(t.value, 10) || 1;
      else s[k] = t.value;
      syncToDoc();
    }
  } else if (t.dataset.frm !== undefined) {
    const f = DATA.frames[parseInt(t.dataset.frm, 10)];
    if (f) {
      const k = t.dataset.k;
      if (k === 'id') f.id = parseInt(t.value, t.value.trim().toLowerCase().startsWith('0x') ? 16 : 10) || 0;
      else if (k === 'sizeBytes') f.sizeBytes = parseInt(t.value, 10) || 1;
      else f[k] = t.value;
      syncToDoc();
      render();
    }
  } else if (t.dataset.fsig !== undefined) {
    const [fi, si] = t.dataset.fsig.split(':').map(Number);
    const fs = DATA.frames[fi]?.signals[si];
    if (fs) {
      if (t.dataset.k === 'offsetBits') fs.offsetBits = parseInt(t.value, 10) || 0;
      else fs.name = t.value;
      syncToDoc();
      render();
    }
  } else if (t.dataset.sch !== undefined) {
    const sc = DATA.schedules[parseInt(t.dataset.sch, 10)];
    if (sc) { sc.name = t.value; syncToDoc(); }
  } else if (t.dataset.slot !== undefined) {
    const [si, ei] = t.dataset.slot.split(':').map(Number);
    const sl = DATA.schedules[si]?.entries[ei];
    if (sl) {
      if (t.dataset.k === 'delayMs') sl.delayMs = parseFloat(t.value) || 0;
      else sl.command = t.value;
      syncToDoc();
      render();
    }
  }
});

contentEl.addEventListener('click', (e) => {
  const t = e.target;
  if (t.id === 'addSigBtn') {
    DATA.signals.push({ name: 'NewSignal_' + (DATA.signals.length + 1), sizeBits: 8, initValue: '0', publisher: DATA.master?.name || 'Master', subscribers: DATA.slaves.slice(0, 1) });
    syncToDoc(); render();
  } else if (t.dataset.delsig !== undefined) {
    DATA.signals.splice(parseInt(t.dataset.delsig, 10), 1);
    syncToDoc(); render();
  } else if (t.id === 'addFrameBtn') {
    DATA.frames.push({ kind: 'unconditional', name: 'NewFrame_' + (DATA.frames.length + 1), id: 0x20 + DATA.frames.length, publisher: DATA.master?.name || 'Master', sizeBytes: 4, signals: [] });
    syncToDoc(); render();
  } else if (t.dataset.delfrm !== undefined) {
    DATA.frames.splice(parseInt(t.dataset.delfrm, 10), 1);
    syncToDoc(); render();
  } else if (t.dataset.addfsig !== undefined) {
    const f = DATA.frames[parseInt(t.dataset.addfsig, 10)];
    if (f) {
      f.signals.push({ name: DATA.signals[0]?.name || 'Signal1', offsetBits: 0 });
      syncToDoc(); render();
    }
  } else if (t.dataset.delfsig !== undefined) {
    const [fi, si] = t.dataset.delfsig.split(':').map(Number);
    DATA.frames[fi]?.signals.splice(si, 1);
    syncToDoc(); render();
  } else if (t.id === 'addSchBtn') {
    DATA.schedules.push({ name: 'Schedule_' + (DATA.schedules.length + 1), totalMs: 10, entries: [{ command: DATA.frames[0]?.name || 'Frame1', delayMs: 10 }] });
    syncToDoc(); render();
  } else if (t.dataset.delsch !== undefined) {
    DATA.schedules.splice(parseInt(t.dataset.delsch, 10), 1);
    syncToDoc(); render();
  } else if (t.dataset.addslot !== undefined) {
    const sc = DATA.schedules[parseInt(t.dataset.addslot, 10)];
    if (sc) {
      sc.entries.push({ command: DATA.frames[0]?.name || 'Frame1', delayMs: 10 });
      syncToDoc(); render();
    }
  } else if (t.dataset.delslot !== undefined) {
    const [si, ei] = t.dataset.delslot.split(':').map(Number);
    DATA.schedules[si]?.entries.splice(ei, 1);
    syncToDoc(); render();
  }
});

searchEl.addEventListener('input', render);
document.getElementById('openRawBtn').addEventListener('click', () => {
  if (vscode) vscode.postMessage({ type: 'openRaw' });
});
window.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'update' && e.data.payload) {
    DATA = e.data.payload;
    syncStatusEl.textContent = '';
    render();
  }
});
render();
</script>
</body>
</html>`;
}
