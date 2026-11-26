export interface LdfMaster {
  name: string;
  timeBaseMs?: number;
  jitterMs?: number;
}

export interface LdfNodeAttr {
  name: string;
  protocol?: string;
  configuredNad?: string;
  initialNad?: string;
  productId?: string;
  responseError?: string;
  p2MinMs?: number;
  stMinMs?: number;
  configurableFrames: string[];
}

export interface LdfSignal {
  name: string;
  sizeBits: number;
  initValue: string;
  publisher: string;
  subscribers: string[];
  encoding?: string;
}

export interface LdfFrameSignal {
  name: string;
  offsetBits: number;
  sizeBits?: number;
}

export interface LdfFrame {
  kind: 'unconditional' | 'sporadic' | 'event_triggered' | 'diagnostic';
  name: string;
  id: number;
  publisher: string;
  sizeBytes: number;
  signals: LdfFrameSignal[];
}

export interface LdfScheduleEntry {
  command: string;
  delayMs: number;
}

export interface LdfScheduleTable {
  name: string;
  totalMs: number;
  entries: LdfScheduleEntry[];
}

export interface LdfEncodingItem {
  kind: 'physical' | 'logical' | 'ascii' | 'bcd';
  detail: string;
  unit?: string;
}

export interface LdfEncoding {
  name: string;
  items: LdfEncodingItem[];
}

export interface ParsedLdf {
  protocolVersion?: string;
  languageVersion?: string;
  speedKbps?: number;
  channelName?: string;
  master?: LdfMaster;
  slaves: string[];
  nodeAttrs: LdfNodeAttr[];
  signals: LdfSignal[];
  frames: LdfFrame[];
  schedules: LdfScheduleTable[];
  encodings: LdfEncoding[];
}

function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/.*$/gm, '');
}

function parseIntAuto(s: string): number {
  const t = s.trim();
  return t.toLowerCase().startsWith('0x') ? parseInt(t, 16) : parseInt(t, 10);
}

function extractBlock(text: string, keyword: string): string | null {
  const re = new RegExp(`\\b${keyword}\\s*\\{`, 'm');
  const m = re.exec(text);
  if (!m) return null;
  let idx = m.index + m[0].length;
  let depth = 1;
  const start = idx;
  while (idx < text.length && depth > 0) {
    if (text[idx] === '{') depth++;
    else if (text[idx] === '}') depth--;
    idx++;
  }
  return text.slice(start, idx - 1);
}

function splitNamedSubblocks(block: string): { name: string; body: string }[] {
  const res: { name: string; body: string }[] = [];
  let i = 0;
  while (i < block.length) {
    while (i < block.length && /\s/.test(block[i])) i++;
    if (i >= block.length) break;
    const brace = block.indexOf('{', i);
    if (brace === -1) break;
    const header = block.slice(i, brace).trim();
    let depth = 1;
    let j = brace + 1;
    while (j < block.length && depth > 0) {
      if (block[j] === '{') depth++;
      else if (block[j] === '}') depth--;
      j++;
    }
    const body = block.slice(brace + 1, j - 1);
    if (header) res.push({ name: header, body });
    i = j;
  }
  return res;
}

export function parseLdf(text: string): ParsedLdf {
  const clean = stripComments(text);

  const protM = /\bLIN_protocol_version\s*=\s*"([^"]+)"/.exec(clean);
  const langM = /\bLIN_language_version\s*=\s*"([^"]+)"/.exec(clean);
  const spdM = /\bLIN_speed\s*=\s*([0-9]+(?:\.[0-9]+)?)\s*kbps/i.exec(clean);
  const chM = /\bChannel_name\s*=\s*"([^"]+)"/.exec(clean);

  // Nodes
  let master: LdfMaster | undefined;
  const slaves: string[] = [];
  const nodesBlk = extractBlock(clean, 'Nodes');
  if (nodesBlk) {
    const mM = /\bMaster\s*:\s*([A-Za-z_][A-Za-z0-9_]*)\s*,\s*([0-9.]+)\s*ms\s*,\s*([0-9.]+)\s*ms/i.exec(nodesBlk);
    if (mM) {
      master = { name: mM[1], timeBaseMs: parseFloat(mM[2]), jitterMs: parseFloat(mM[3]) };
    }
    const sM = /\bSlaves\s*:\s*([^;]+);/.exec(nodesBlk);
    if (sM) {
      for (const s of sM[1].split(',')) {
        const t = s.trim();
        if (t) slaves.push(t);
      }
    }
  }

  // Signals
  const signals: LdfSignal[] = [];
  const sigMap = new Map<string, LdfSignal>();
  const sigBlk = extractBlock(clean, 'Signals');
  if (sigBlk) {
    for (const stmt of sigBlk.split(';')) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([0-9]+)\s*,\s*([^,]+)\s*,\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:,\s*(.+))?$/.exec(stmt.trim());
      if (m) {
        const subs = m[5] ? m[5].split(',').map((x) => x.trim()).filter(Boolean) : [];
        const sig: LdfSignal = {
          name: m[1],
          sizeBits: parseInt(m[2], 10),
          initValue: m[3].trim(),
          publisher: m[4],
          subscribers: subs,
        };
        signals.push(sig);
        sigMap.set(sig.name, sig);
      }
    }
  }

  // Frames
  const frames: LdfFrame[] = [];
  const parseFrameBlock = (blkName: string, kind: LdfFrame['kind']) => {
    const blk = extractBlock(clean, blkName);
    if (!blk) return;
    for (const sub of splitNamedSubblocks(blk)) {
      const hdr = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(0x[0-9a-fA-F]+|[0-9]+)\s*,\s*([A-Za-z_][A-Za-z0-9_]*)\s*,\s*([0-9]+)$/.exec(sub.name);
      if (!hdr) continue;
      const sigs: LdfFrameSignal[] = [];
      for (const stmt of sub.body.split(';')) {
        const sm = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*,\s*([0-9]+)\s*$/.exec(stmt.trim());
        if (sm) {
          const def = sigMap.get(sm[1]);
          sigs.push({ name: sm[1], offsetBits: parseInt(sm[2], 10), sizeBits: def?.sizeBits });
        }
      }
      frames.push({
        kind,
        name: hdr[1],
        id: parseIntAuto(hdr[2]),
        publisher: hdr[3],
        sizeBytes: parseInt(hdr[4], 10),
        signals: sigs,
      });
    }
  };
  parseFrameBlock('Frames', 'unconditional');
  parseFrameBlock('Diagnostic_frames', 'diagnostic');

  // Node_attributes
  const nodeAttrs: LdfNodeAttr[] = [];
  const naBlk = extractBlock(clean, 'Node_attributes');
  if (naBlk) {
    for (const sub of splitNamedSubblocks(naBlk)) {
      const attr: LdfNodeAttr = { name: sub.name, configurableFrames: [] };
      const lp = /\bLIN_protocol\s*=\s*"([^"]+)"/.exec(sub.body);
      if (lp) attr.protocol = lp[1];
      const cNad = /\bconfigured_NAD\s*=\s*([^;]+)/.exec(sub.body);
      if (cNad) attr.configuredNad = cNad[1].trim();
      const iNad = /\binitial_NAD\s*=\s*([^;]+)/.exec(sub.body);
      if (iNad) attr.initialNad = iNad[1].trim();
      const pid = /\bproduct_id\s*=\s*([^;]+)/.exec(sub.body);
      if (pid) attr.productId = pid[1].trim();
      const re = /\bresponse_error\s*=\s*([^;]+)/.exec(sub.body);
      if (re) attr.responseError = re[1].trim();
      const p2 = /\bP2_min\s*=\s*([0-9.]+)\s*ms/i.exec(sub.body);
      if (p2) attr.p2MinMs = parseFloat(p2[1]);
      const st = /\bST_min\s*=\s*([0-9.]+)\s*ms/i.exec(sub.body);
      if (st) attr.stMinMs = parseFloat(st[1]);
      const cf = extractBlock(sub.body, 'configurable_frames');
      if (cf) {
        for (const line of cf.split(';')) {
          const t = line.trim();
          if (t) attr.configurableFrames.push(t);
        }
      }
      nodeAttrs.push(attr);
    }
  }

  // Schedule_tables
  const schedules: LdfScheduleTable[] = [];
  const schBlk = extractBlock(clean, 'Schedule_tables');
  if (schBlk) {
    for (const sub of splitNamedSubblocks(schBlk)) {
      const entries: LdfScheduleEntry[] = [];
      let totalMs = 0;
      for (const stmt of sub.body.split(';')) {
        const m = /^\s*(.+?)\s+delay\s+([0-9.]+)\s*ms\s*$/i.exec(stmt.trim());
        if (m) {
          const delayMs = parseFloat(m[2]);
          totalMs += delayMs;
          entries.push({ command: m[1].trim(), delayMs });
        }
      }
      schedules.push({ name: sub.name, totalMs, entries });
    }
  }

  // Signal_encoding_types
  const encodings: LdfEncoding[] = [];
  const encBlk = extractBlock(clean, 'Signal_encoding_types');
  if (encBlk) {
    for (const sub of splitNamedSubblocks(encBlk)) {
      const items: LdfEncodingItem[] = [];
      for (const stmt of sub.body.split(';')) {
        const t = stmt.trim();
        if (!t) continue;
        const phys = /^physical_value\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)(?:\s*,\s*"([^"]*)")?/.exec(t);
        if (phys) {
          items.push({
            kind: 'physical',
            detail: `[${phys[1].trim()} .. ${phys[2].trim()}] scale=${phys[3].trim()} offset=${phys[4].trim()}`,
            unit: phys[5] || undefined,
          });
          continue;
        }
        const log = /^logical_value\s*,\s*([^,]+)(?:\s*,\s*"([^"]*)")?/.exec(t);
        if (log) {
          items.push({
            kind: 'logical',
            detail: `${log[1].trim()} = ${log[2] ?? ''}`,
          });
        }
      }
      encodings.push({ name: sub.name, items });
    }
  }

  // Signal_representation
  const repBlk = extractBlock(clean, 'Signal_representation');
  if (repBlk) {
    for (const stmt of repBlk.split(';')) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/.exec(stmt.trim());
      if (!m) continue;
      const encName = m[1];
      for (const s of m[2].split(',')) {
        const sig = sigMap.get(s.trim());
        if (sig) sig.encoding = encName;
      }
    }
  }

  return {
    protocolVersion: protM?.[1],
    languageVersion: langM?.[1],
    speedKbps: spdM ? parseFloat(spdM[1]) : undefined,
    channelName: chM?.[1],
    master,
    slaves,
    nodeAttrs,
    signals,
    frames,
    schedules,
    encodings,
  };
}

export function serializeLdf(d: ParsedLdf): string {
  const lines: string[] = [];
  lines.push('LIN_description_file;');
  lines.push(`LIN_protocol_version = "${d.protocolVersion || '2.1'}";`);
  lines.push(`LIN_language_version = "${d.languageVersion || d.protocolVersion || '2.1'}";`);
  lines.push(`LIN_speed = ${d.speedKbps ?? 19.2} kbps;`);
  if (d.channelName) {
    lines.push(`Channel_name = "${d.channelName}";`);
  }
  lines.push('');

  // Nodes
  lines.push('Nodes {');
  if (d.master) {
    lines.push(`  Master: ${d.master.name}, ${d.master.timeBaseMs ?? 5} ms, ${d.master.jitterMs ?? 0.1} ms;`);
  }
  if (d.slaves.length) {
    lines.push(`  Slaves: ${d.slaves.join(', ')};`);
  }
  lines.push('}');
  lines.push('');

  // Signals
  lines.push('Signals {');
  for (const s of d.signals) {
    const subs = s.subscribers.length ? `, ${s.subscribers.join(', ')}` : '';
    lines.push(`  ${s.name}: ${s.sizeBits}, ${s.initValue}, ${s.publisher}${subs};`);
  }
  lines.push('}');
  lines.push('');

  // Frames
  const uncond = d.frames.filter((f) => f.kind === 'unconditional');
  lines.push('Frames {');
  for (const f of uncond) {
    const idHex = `0x${(f.id >>> 0).toString(16).toUpperCase().padStart(2, '0')}`;
    lines.push(`  ${f.name}: ${idHex}, ${f.publisher}, ${f.sizeBytes} {`);
    for (const sig of f.signals) {
      lines.push(`    ${sig.name}, ${sig.offsetBits};`);
    }
    lines.push('  }');
  }
  lines.push('}');
  lines.push('');

  // Node_attributes
  if (d.nodeAttrs.length) {
    lines.push('Node_attributes {');
    for (const a of d.nodeAttrs) {
      lines.push(`  ${a.name} {`);
      if (a.protocol) lines.push(`    LIN_protocol = "${a.protocol}";`);
      if (a.configuredNad) lines.push(`    configured_NAD = ${a.configuredNad};`);
      if (a.initialNad) lines.push(`    initial_NAD = ${a.initialNad};`);
      if (a.productId) lines.push(`    product_id = ${a.productId};`);
      if (a.responseError) lines.push(`    response_error = ${a.responseError};`);
      if (a.p2MinMs !== undefined) lines.push(`    P2_min = ${a.p2MinMs} ms;`);
      if (a.stMinMs !== undefined) lines.push(`    ST_min = ${a.stMinMs} ms;`);
      if (a.configurableFrames.length) {
        lines.push('    configurable_frames {');
        for (const cf of a.configurableFrames) lines.push(`      ${cf};`);
        lines.push('    }');
      }
      lines.push('  }');
    }
    lines.push('}');
    lines.push('');
  }

  // Schedule_tables
  if (d.schedules.length) {
    lines.push('Schedule_tables {');
    for (const sc of d.schedules) {
      lines.push(`  ${sc.name} {`);
      for (const e of sc.entries) {
        lines.push(`    ${e.command} delay ${e.delayMs} ms;`);
      }
      lines.push('  }');
    }
    lines.push('}');
    lines.push('');
  }

  // Signal_encoding_types
  if (d.encodings.length) {
    lines.push('Signal_encoding_types {');
    for (const enc of d.encodings) {
      lines.push(`  ${enc.name} {`);
      for (const it of enc.items) {
        if (it.kind === 'physical') {
          const m = /^\[([^\.]+)\.\.\s*([^\]]+)\]\s*scale=([^\s]+)\s*offset=(.+)$/.exec(it.detail);
          if (m) {
            const unitPart = it.unit ? `, "${it.unit}"` : '';
            lines.push(`    physical_value, ${m[1].trim()}, ${m[2].trim()}, ${m[3].trim()}, ${m[4].trim()}${unitPart};`);
          }
        } else if (it.kind === 'logical') {
          const eq = it.detail.indexOf('=');
          if (eq >= 0) {
            const val = it.detail.slice(0, eq).trim();
            const desc = it.detail.slice(eq + 1).trim();
            lines.push(`    logical_value, ${val}, "${desc}";`);
          }
        }
      }
      lines.push('  }');
    }
    lines.push('}');
    lines.push('');
  }

  // Signal_representation
  const repMap = new Map<string, string[]>();
  for (const s of d.signals) {
    if (s.encoding) {
      const arr = repMap.get(s.encoding) ?? [];
      arr.push(s.name);
      repMap.set(s.encoding, arr);
    }
  }
  if (repMap.size) {
    lines.push('Signal_representation {');
    for (const [enc, sigs] of repMap) {
      lines.push(`  ${enc}: ${sigs.join(', ')};`);
    }
    lines.push('}');
    lines.push('');
  }

  return lines.join('\n');
}
