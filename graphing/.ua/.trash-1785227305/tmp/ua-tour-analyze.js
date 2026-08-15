#!/usr/bin/env node
'use strict';

/**
 * Tour topology analyzer.
 * Usage: node ua-tour-analyze.js <input.json> <output.json>
 */

const fs = require('fs');

const ENTRY_NAMES = new Set([
  'index.ts',
  'index.js',
  'main.ts',
  'main.js',
  'app.ts',
  'app.js',
  'server.ts',
  'server.js',
  'mod.rs',
  'main.go',
  'main.py',
  'main.rs',
  'manage.py',
  'app.py',
  'wsgi.py',
  'asgi.py',
  'run.py',
  '__main__.py',
  'Application.java',
  'Main.java',
  'Program.cs',
  'config.ru',
  'index.php',
  'App.swift',
  'Application.kt',
  'main.cpp',
  'main.c',
  // Next.js App Router entry equivalents
  'layout.tsx',
  'middleware.ts',
]);

function main() {
  const [, , inPath, outPath] = process.argv;
  if (!inPath || !outPath) {
    throw new Error('usage: ua-tour-analyze.js <input.json> <output.json>');
  }

  const data = JSON.parse(fs.readFileSync(inPath, 'utf8'));
  const nodes = data.nodes || [];
  const edges = data.edges || [];
  const layers = data.layers || [];

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const nameOf = (id) => (byId.get(id) ? byId.get(id).name : id);

  // --- fan-in / fan-out over all edge types --------------------------------
  const fanIn = new Map();
  const fanOut = new Map();
  // typed adjacency for traversal
  const adjTraverse = new Map(); // imports + calls, forward
  for (const n of nodes) {
    fanIn.set(n.id, 0);
    fanOut.set(n.id, 0);
    adjTraverse.set(n.id, new Set());
  }

  for (const e of edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) continue;
    fanOut.set(e.source, fanOut.get(e.source) + 1);
    fanIn.set(e.target, fanIn.get(e.target) + 1);
    if (e.type === 'imports' || e.type === 'calls') {
      adjTraverse.get(e.source).add(e.target);
    }
  }

  const rank = (map, key) =>
    nodes
      .map((n) => ({ id: n.id, [key]: map.get(n.id), name: n.name, type: n.type }))
      .sort((a, b) => b[key] - a[key])
      .slice(0, 20);

  const fanInRanking = rank(fanIn, 'fanIn');
  const fanOutRanking = rank(fanOut, 'fanOut');

  // --- entry point candidates ----------------------------------------------
  const fanOutValues = nodes.map((n) => fanOut.get(n.id)).sort((a, b) => b - a);
  const fanInValues = nodes.map((n) => fanIn.get(n.id)).sort((a, b) => a - b);
  const topDecileFanOut = fanOutValues[Math.floor(fanOutValues.length * 0.1)] || 0;
  const bottomQuartileFanIn = fanInValues[Math.floor(fanInValues.length * 0.25)] || 0;

  const scored = [];
  for (const n of nodes) {
    if (n.type === 'function' || n.type === 'class') continue;
    const fp = n.filePath || '';
    let score = 0;
    const reasons = [];

    if (n.type === 'document') {
      if (fp === 'README.md') {
        score += 5;
        reasons.push('root README');
      } else if (/^[^/]+\.md$/.test(fp)) {
        score += 2;
        reasons.push('root markdown');
      }
    } else {
      if (ENTRY_NAMES.has(n.name)) {
        score += 3;
        reasons.push('entry filename');
      }
      const depth = fp.split('/').length;
      // "root or one level deep" — allow src/ prefix to count as root-equivalent
      const normalized = fp.replace(/^src\//, '');
      if (normalized.split('/').length <= 2) {
        score += 1;
        reasons.push('shallow path');
      }
      if (fanOut.get(n.id) >= topDecileFanOut) {
        score += 1;
        reasons.push('high fan-out');
      }
      if (fanIn.get(n.id) <= bottomQuartileFanIn) {
        score += 1;
        reasons.push('low fan-in');
      }
      void depth;
    }

    if (score > 0) {
      scored.push({
        id: n.id,
        score,
        name: n.name,
        type: n.type,
        filePath: fp,
        reasons,
        fanIn: fanIn.get(n.id),
        fanOut: fanOut.get(n.id),
        summary: n.summary || '',
      });
    }
  }
  scored.sort((a, b) => b.score - a.score || b.fanOut - a.fanOut);
  const entryPointCandidates = scored.slice(0, 12);

  // --- BFS from top code entry point ---------------------------------------
  const codeEntry =
    entryPointCandidates.find((c) => c.type !== 'document') || entryPointCandidates[0];
  const startNode = codeEntry ? codeEntry.id : nodes[0] && nodes[0].id;

  const order = [];
  const depthMap = {};
  if (startNode) {
    const queue = [startNode];
    depthMap[startNode] = 0;
    const seen = new Set([startNode]);
    while (queue.length) {
      const cur = queue.shift();
      order.push(cur);
      for (const next of adjTraverse.get(cur) || []) {
        if (seen.has(next)) continue;
        seen.add(next);
        depthMap[next] = depthMap[cur] + 1;
        queue.push(next);
      }
    }
  }
  const byDepth = {};
  for (const [id, d] of Object.entries(depthMap)) {
    (byDepth[d] = byDepth[d] || []).push(id);
  }
  // file-level only view of each depth, most-depended-upon first
  const byDepthFiles = {};
  for (const [d, ids] of Object.entries(byDepth)) {
    byDepthFiles[d] = ids
      .filter((id) => {
        const n = byId.get(id);
        return n && (n.type === 'file' || n.type === 'config');
      })
      .sort((a, b) => fanIn.get(b) - fanIn.get(a))
      .map((id) => ({ id, name: nameOf(id), fanIn: fanIn.get(id) }));
  }

  // --- non-code file inventory ---------------------------------------------
  const bucket = (types) =>
    nodes
      .filter((n) => types.includes(n.type))
      .map((n) => ({
        id: n.id,
        name: n.name,
        type: n.type,
        filePath: n.filePath,
        summary: n.summary || '',
      }));

  const nonCodeFiles = {
    documentation: bucket(['document']),
    infrastructure: bucket(['service', 'pipeline', 'resource']),
    data: bucket(['table', 'schema', 'endpoint']),
    config: bucket(['config']),
  };

  // --- tightly coupled clusters --------------------------------------------
  const pairKey = (a, b) => (a < b ? a + '||' + b : b + '||' + a);
  const pairCount = new Map();
  const directed = new Set();
  for (const e of edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) continue;
    const s = byId.get(e.source);
    const t = byId.get(e.target);
    if (!s || !t) continue;
    if (!['file', 'config'].includes(s.type) || !['file', 'config'].includes(t.type)) continue;
    if (!['imports', 'calls', 'implements', 'configures', 'related'].includes(e.type)) continue;
    directed.add(e.source + '>>' + e.target);
    const k = pairKey(e.source, e.target);
    pairCount.set(k, (pairCount.get(k) || 0) + 1);
  }

  // seed clusters from bidirectional pairs
  const seeds = [];
  for (const k of pairCount.keys()) {
    const [a, b] = k.split('||');
    if (directed.has(a + '>>' + b) && directed.has(b + '>>' + a)) {
      seeds.push([a, b]);
    }
  }
  // fall back to strongest mutual-weight pairs when no true cycles exist
  if (seeds.length === 0) {
    const strong = [...pairCount.entries()].sort((x, y) => y[1] - x[1]).slice(0, 10);
    for (const [k] of strong) seeds.push(k.split('||'));
  }

  const neighborsOf = (id) => {
    const s = new Set();
    for (const k of pairCount.keys()) {
      const [a, b] = k.split('||');
      if (a === id) s.add(b);
      else if (b === id) s.add(a);
    }
    return s;
  };

  const clusters = [];
  const clustered = new Set();
  for (const seed of seeds) {
    if (seed.some((id) => clustered.has(id))) continue;
    const members = new Set(seed);
    const candidates = new Map();
    for (const m of members) {
      for (const nb of neighborsOf(m)) {
        if (members.has(nb)) continue;
        candidates.set(nb, (candidates.get(nb) || 0) + 1);
      }
    }
    for (const [cand, hits] of [...candidates.entries()].sort((a, b) => b[1] - a[1])) {
      if (members.size >= 5) break;
      if (hits >= 2 && !clustered.has(cand)) members.add(cand);
    }
    let edgeCount = 0;
    const arr = [...members];
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        edgeCount += pairCount.get(pairKey(arr[i], arr[j])) || 0;
      }
    }
    arr.forEach((id) => clustered.add(id));
    clusters.push({
      nodes: arr,
      names: arr.map(nameOf),
      edgeCount,
    });
  }
  clusters.sort((a, b) => b.edgeCount - a.edgeCount);

  // --- node summary index --------------------------------------------------
  const nodeSummaryIndex = {};
  for (const n of nodes) {
    nodeSummaryIndex[n.id] = {
      name: n.name,
      type: n.type,
      filePath: n.filePath,
      summary: n.summary || '',
      languageNotes: n.languageNotes || '',
      fanIn: fanIn.get(n.id),
      fanOut: fanOut.get(n.id),
    };
  }

  const result = {
    scriptCompleted: true,
    entryPointCandidates,
    fanInRanking,
    fanOutRanking,
    bfsTraversal: {
      startNode,
      order,
      depthMap,
      byDepth,
      byDepthFiles,
      reachedCount: order.length,
    },
    nonCodeFiles,
    clusters: clusters.slice(0, 10),
    layers: { count: layers.length, list: layers },
    nodeSummaryIndex,
    totalNodes: nodes.length,
    totalEdges: edges.length,
  };

  fs.writeFileSync(outPath, JSON.stringify(result, null, 1));
  process.stdout.write(
    `ok: ${nodes.length} nodes, ${edges.length} edges, BFS start=${startNode}, reached=${order.length}, clusters=${clusters.length}\n`
  );
}

try {
  main();
} catch (err) {
  process.stderr.write(String((err && err.stack) || err) + '\n');
  process.exit(1);
}
