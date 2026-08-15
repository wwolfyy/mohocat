#!/usr/bin/env node
'use strict';

const fs = require('fs');

function fail(msg) {
  process.stderr.write(String(msg) + '\n');
  process.exit(1);
}

const inPath = process.argv[2];
const outPath = process.argv[3];
if (!inPath || !outPath) fail('usage: analyze.js <input.json> <output.json>');

let input;
try {
  input = JSON.parse(fs.readFileSync(inPath, 'utf8'));
} catch (e) {
  fail('failed to read/parse input: ' + e.message);
}

const fileNodes = input.fileNodes || [];
const importEdges = input.importEdges || [];
const allEdges = input.allEdges || [];
if (!fileNodes.length) fail('no fileNodes in input');

const byId = new Map(fileNodes.map((n) => [n.id, n]));
const pathOf = (id) => (byId.get(id) ? byId.get(id).filePath || '' : '');

// ---------- A. Directory grouping ----------
const paths = fileNodes.map((n) => n.filePath || '');

function commonPrefixDirs(list) {
  const split = list.filter(Boolean).map((p) => p.split('/').slice(0, -1));
  if (!split.length) return [];
  let pre = split[0].slice();
  for (const s of split) {
    let i = 0;
    while (i < pre.length && i < s.length && pre[i] === s[i]) i++;
    pre = pre.slice(0, i);
    if (!pre.length) break;
  }
  return pre;
}

const prefix = commonPrefixDirs(paths); // array of segments
const prefixStr = prefix.length ? prefix.join('/') + '/' : '';

const hasSubdirs = paths.some((p) => p.slice(prefixStr.length).includes('/'));

function groupFor(p) {
  if (!p) return 'root';
  const rest = p.startsWith(prefixStr) ? p.slice(prefixStr.length) : p;
  const segs = rest.split('/');
  if (segs.length === 1) {
    if (!hasSubdirs) {
      if (/\.(test|spec)\./.test(segs[0])) return 'test';
      if (/\.config\./.test(segs[0])) return 'config';
      const ext = (segs[0].split('.').pop() || '').toLowerCase();
      return 'ext:' + ext;
    }
    return prefix.length ? prefix[prefix.length - 1] + ':root' : 'root';
  }
  return segs[0];
}

// Adaptive grouping: start at depth 1 after the common prefix, then expand any
// group that swallows too large a share of the corpus (>20%) into its next
// directory level, repeating until groups are meaningfully sized.
const MAX_SHARE = 0.2;
const MAX_DEPTH = 3;

function segsAfterPrefix(p) {
  const rest = p.startsWith(prefixStr) ? p.slice(prefixStr.length) : p;
  return rest.split('/');
}

function labelAtDepth(p, depth) {
  const segs = segsAfterPrefix(p);
  const dirs = segs.slice(0, -1); // drop filename
  if (!dirs.length) return prefix.length ? prefix[prefix.length - 1] + ':root' : 'root';
  const take = dirs.slice(0, depth);
  if (take.length < depth) return take.join('/') + ':root';
  return take.join('/');
}

const depthOfFile = new Map(fileNodes.map((n) => [n.id, 1]));
for (let pass = 0; pass < MAX_DEPTH; pass++) {
  const counts = {};
  for (const n of fileNodes) {
    const l = labelAtDepth(n.filePath || '', depthOfFile.get(n.id));
    (counts[l] = counts[l] || []).push(n);
  }
  let changed = false;
  for (const [label, members] of Object.entries(counts)) {
    if (label.endsWith(':root') || label === 'root') continue;
    if (members.length / fileNodes.length <= MAX_SHARE) continue;
    // only expand if members actually have a deeper directory level
    const expandable = members.some(
      (n) => segsAfterPrefix(n.filePath || '').slice(0, -1).length > depthOfFile.get(n.id)
    );
    if (!expandable) continue;
    for (const n of members) depthOfFile.set(n.id, depthOfFile.get(n.id) + 1);
    changed = true;
  }
  if (!changed) break;
}

const directoryGroups = {};
const groupOfFile = new Map();
for (const n of fileNodes) {
  const gname = hasSubdirs
    ? labelAtDepth(n.filePath || '', depthOfFile.get(n.id))
    : groupFor(n.filePath || '');
  (directoryGroups[gname] = directoryGroups[gname] || []).push(n.id);
  groupOfFile.set(n.id, gname);
}

// Sub-grouping for large groups: second-level segment (informational)
const subGroups = {};
for (const n of fileNodes) {
  const p = n.filePath || '';
  const rest = p.startsWith(prefixStr) ? p.slice(prefixStr.length) : p;
  const segs = rest.split('/');
  if (segs.length > 2) {
    const key = segs[0] + '/' + segs[1];
    (subGroups[key] = subGroups[key] || []).push(n.id);
  }
}

// ---------- B. Node type grouping ----------
const nodeTypeGroups = {};
for (const n of fileNodes) {
  (nodeTypeGroups[n.type] = nodeTypeGroups[n.type] || []).push(n.id);
}

// ---------- C. Adjacency, fan-in / fan-out ----------
const fileFanOut = {};
const fileFanIn = {};
const adjacency = {};
for (const e of importEdges) {
  if (!byId.has(e.source) || !byId.has(e.target)) continue;
  (adjacency[e.source] = adjacency[e.source] || []).push(e.target);
  fileFanOut[e.source] = (fileFanOut[e.source] || 0) + 1;
  fileFanIn[e.target] = (fileFanIn[e.target] || 0) + 1;
}

// ---------- D. Cross-category dependency analysis ----------
const crossMap = new Map();
const nonCodeLinks = [];
for (const e of allEdges) {
  const s = byId.get(e.source);
  const t = byId.get(e.target);
  if (!s || !t) continue;
  const key = s.type + '|' + t.type + '|' + e.type;
  crossMap.set(key, (crossMap.get(key) || 0) + 1);
  if (s.type !== 'file' || t.type !== 'file') {
    nonCodeLinks.push({ from: e.source, to: e.target, edgeType: e.type });
  }
}
const crossCategoryEdges = [...crossMap.entries()]
  .map(([k, count]) => {
    const [fromType, toType, edgeType] = k.split('|');
    return { fromType, toType, edgeType, count };
  })
  .sort((a, b) => b.count - a.count);

// ---------- E. Inter-group import frequency ----------
const interMap = new Map();
for (const e of importEdges) {
  const gs = groupOfFile.get(e.source);
  const gt = groupOfFile.get(e.target);
  if (!gs || !gt || gs === gt) continue;
  const k = gs + '|' + gt;
  interMap.set(k, (interMap.get(k) || 0) + 1);
}
const interGroupImports = [...interMap.entries()]
  .map(([k, count]) => {
    const [from, to] = k.split('|');
    return { from, to, count };
  })
  .sort((a, b) => b.count - a.count);

// Sub-group inter imports (second level) for finer insight
const subOf = new Map();
for (const n of fileNodes) {
  const p = n.filePath || '';
  const rest = p.startsWith(prefixStr) ? p.slice(prefixStr.length) : p;
  const segs = rest.split('/');
  subOf.set(n.id, segs.length > 2 ? segs[0] + '/' + segs[1] : groupOfFile.get(n.id));
}
const subInterMap = new Map();
for (const e of importEdges) {
  const a = subOf.get(e.source),
    b = subOf.get(e.target);
  if (!a || !b || a === b) continue;
  const k = a + '|' + b;
  subInterMap.set(k, (subInterMap.get(k) || 0) + 1);
}
const subGroupImports = [...subInterMap.entries()]
  .map(([k, count]) => {
    const [from, to] = k.split('|');
    return { from, to, count };
  })
  .sort((a, b) => b.count - a.count)
  .slice(0, 60);

// ---------- F. Intra-group import density ----------
const intraGroupDensity = {};
for (const gname of Object.keys(directoryGroups)) {
  intraGroupDensity[gname] = { internalEdges: 0, totalEdges: 0, density: 0 };
}
for (const e of importEdges) {
  const gs = groupOfFile.get(e.source);
  const gt = groupOfFile.get(e.target);
  if (!gs || !gt) continue;
  if (gs === gt) {
    intraGroupDensity[gs].internalEdges += 1;
    intraGroupDensity[gs].totalEdges += 1;
  } else {
    intraGroupDensity[gs].totalEdges += 1;
    intraGroupDensity[gt].totalEdges += 1;
  }
}
for (const g of Object.keys(intraGroupDensity)) {
  const d = intraGroupDensity[g];
  d.density = d.totalEdges ? +(d.internalEdges / d.totalEdges).toFixed(3) : 0;
}

// ---------- G. Directory pattern matching ----------
const DIR_PATTERNS = [
  [
    [
      'routes',
      'api',
      'controllers',
      'endpoints',
      'handlers',
      'serializers',
      'routers',
      'blueprints',
      'controller',
    ],
    'api',
  ],
  [
    [
      'services',
      'core',
      'lib',
      'domain',
      'logic',
      'signals',
      'composables',
      'mailers',
      'jobs',
      'channels',
      'internal',
    ],
    'service',
  ],
  [
    ['models', 'db', 'data', 'persistence', 'repository', 'entities', 'migrations', 'entity'],
    'data',
  ],
  [['components', 'views', 'pages', 'ui', 'layouts', 'screens', 'app'], 'ui'],
  [['middleware', 'plugins', 'interceptors', 'guards'], 'middleware'],
  [['utils', 'helpers', 'common', 'shared', 'tools', 'templatetags', 'pkg'], 'utility'],
  [['config', 'constants', 'env', 'settings', 'management', 'commands'], 'config'],
  [['__tests__', 'test', 'tests', 'spec', 'specs', 'e2e'], 'test'],
  [['types', 'interfaces', 'schemas', 'contracts', 'dtos', 'dto', 'request', 'response'], 'types'],
  [['hooks'], 'hooks'],
  [['store', 'state', 'reducers', 'actions', 'slices', 'contexts', 'context'], 'state'],
  [['assets', 'static', 'public'], 'assets'],
  [['cmd', 'bin'], 'entry'],
  [['docs', 'documentation', 'wiki'], 'documentation'],
  [
    [
      'deploy',
      'deployment',
      'infra',
      'infrastructure',
      'k8s',
      'kubernetes',
      'helm',
      'charts',
      'terraform',
      'tf',
      'docker',
    ],
    'infrastructure',
  ],
  [['.github', '.gitlab', '.circleci'], 'ci-cd'],
  [['sql', 'database', 'schema'], 'data'],
];

function matchDirExact(base) {
  for (const [names, label] of DIR_PATTERNS) {
    if (names.includes(base)) return label;
  }
  return null;
}

function matchDir(name) {
  let base = name.replace(/:root$/, '').replace(/^ext:/, '');
  const parts = base.split('/');
  base = parts[parts.length - 1] || base;
  // strip Next.js dynamic-segment brackets, e.g. "[mountain]" -> "mountain"
  base = base.replace(/^\[(\.{3})?(.+?)\]$/, '$2');
  if (parts.length > 1 && matchDirExact(base) === null) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const m = matchDirExact(parts[i].replace(/^\[(\.{3})?(.+?)\]$/, '$2'));
      if (m) return m;
    }
  }
  for (const [names, label] of DIR_PATTERNS) {
    if (names.includes(base)) return label;
  }
  return null;
}

const patternMatches = {};
for (const gname of Object.keys(directoryGroups)) {
  patternMatches[gname] = matchDir(gname) || 'unknown';
}
const subPatternMatches = {};
for (const key of Object.keys(subGroups)) {
  const last = key.split('/')[1];
  subPatternMatches[key] = matchDir(last) || 'unknown';
}

// File-level pattern matching
const filePatterns = {};
function matchFile(p, name) {
  const b = name || p.split('/').pop() || '';
  if (
    /(\.test\.|\.spec\.|^test_.*\.py$|_test\.go$|Test\.java$|_spec\.rb$|Test\.php$|Tests\.cs$)/.test(
      b
    )
  )
    return 'test';
  if (/\.d\.ts$/.test(b)) return 'types';
  if (/^(Dockerfile|docker-compose)/.test(b)) return 'infrastructure';
  if (/\.(tf|tfvars)$/.test(b)) return 'infrastructure';
  if (/^Makefile$/.test(b)) return 'infrastructure';
  if (/^(Jenkinsfile|\.gitlab-ci\.yml)$/.test(b) || /^\.github\/workflows\//.test(p))
    return 'ci-cd';
  if (/\.sql$/.test(b)) return 'data';
  if (/\.(graphql|gql|proto|prisma)$/.test(b)) return 'types';
  if (/\.(md|rst)$/.test(b)) return 'documentation';
  if (
    /^(Cargo\.toml|go\.mod|Gemfile|pom\.xml|build\.gradle|composer\.json|package\.json|tsconfig.*\.json)$/.test(
      b
    )
  )
    return 'config';
  if (/^(wsgi|asgi)\.py$/.test(b)) return 'config';
  if (/^(manage\.py|config\.ru|main\.rs|lib\.rs|Application\.java|Program\.cs)$/.test(b))
    return 'entry';
  if (/^(index\.(ts|js|tsx|jsx)|__init__\.py)$/.test(b)) return 'entry';
  if (/^middleware\.(ts|js)$/.test(b)) return 'middleware';
  if (/^(page|layout|loading|error|not-found|template)\.(tsx|jsx|ts|js)$/.test(b))
    return 'ui-route';
  if (/^route\.(ts|js)$/.test(b)) return 'api';
  if (/\.css$/.test(b) || /\.s[ca]ss$/.test(b)) return 'assets';
  if (/\.ya?ml$/.test(b)) return 'config';
  if (/\.json$/.test(b)) return 'config';
  return null;
}
for (const n of fileNodes) {
  const m = matchFile(n.filePath || '', n.name);
  if (m) filePatterns[n.id] = m;
}
const filePatternCounts = {};
for (const v of Object.values(filePatterns)) filePatternCounts[v] = (filePatternCounts[v] || 0) + 1;

// ---------- H. Deployment topology ----------
const infraFiles = fileNodes
  .filter((n) => {
    const p = n.filePath || '';
    return /Dockerfile|docker-compose|\.tf$|k8s\/|kubernetes\/|helm\/|Jenkinsfile|\.gitlab-ci|\.github\/workflows|deployment\/|Makefile/.test(
      p
    );
  })
  .map((n) => n.filePath);
const deploymentTopology = {
  hasDockerfile: infraFiles.some((p) => /Dockerfile/.test(p)),
  hasCompose: infraFiles.some((p) => /docker-compose/.test(p)),
  hasK8s: infraFiles.some(
    (p) => /k8s\/|kubernetes\/|helm\//.test(p) || /cloud-run|service\.yaml/.test(p)
  ),
  hasTerraform: infraFiles.some((p) => /\.tf$/.test(p)),
  hasCI: infraFiles.some((p) => /\.github\/workflows|\.gitlab-ci|Jenkinsfile/.test(p)),
  infraFiles,
};

// ---------- I. Data pipeline ----------
const dataPipeline = {
  schemaFiles: fileNodes
    .filter((n) => /\.(sql|graphql|gql|proto|prisma)$/.test(n.filePath || ''))
    .map((n) => n.filePath),
  migrationFiles: fileNodes
    .filter((n) => /migrations?\//.test(n.filePath || ''))
    .map((n) => n.filePath),
  dataModelFiles: fileNodes
    .filter((n) => {
      const p = n.filePath || '';
      const tags = n.tags || [];
      return (
        /\/(models|entities|schemas)\//.test(p) ||
        tags.includes('data-model') ||
        tags.includes('model') ||
        /(service|repository)\.(ts|js|py)$/.test(p) ||
        /\/services\//.test(p)
      );
    })
    .map((n) => n.filePath),
  apiHandlerFiles: fileNodes
    .filter((n) => {
      const p = n.filePath || '';
      const tags = n.tags || [];
      return /\/api\//.test(p) || tags.includes('api-handler') || tags.includes('api-route');
    })
    .map((n) => n.filePath),
};

// ---------- J. Documentation coverage ----------
const docNodes = fileNodes.filter(
  (n) => n.type === 'document' || /\.(md|rst)$/.test(n.filePath || '')
);
const groupsWithDocs = new Set(docNodes.map((n) => groupOfFile.get(n.id)));
const totalGroups = Object.keys(directoryGroups).length;
const docCoverage = {
  groupsWithDocs: groupsWithDocs.size,
  totalGroups,
  coverageRatio: totalGroups ? +(groupsWithDocs.size / totalGroups).toFixed(2) : 0,
  undocumentedGroups: Object.keys(directoryGroups).filter((g) => !groupsWithDocs.has(g)),
};

// ---------- K. Dependency direction ----------
const pairSeen = new Set();
const dependencyDirection = [];
for (const { from, to, count } of interGroupImports) {
  const key = [from, to].sort().join('||');
  if (pairSeen.has(key)) continue;
  const reverse = interMap.get(to + '|' + from) || 0;
  if (count > reverse) {
    dependencyDirection.push({ dependent: from, dependsOn: to, forward: count, reverse });
    pairSeen.add(key);
  } else if (reverse > count) {
    dependencyDirection.push({ dependent: to, dependsOn: from, forward: reverse, reverse: count });
    pairSeen.add(key);
  } else {
    dependencyDirection.push({
      dependent: from,
      dependsOn: to,
      forward: count,
      reverse,
      bidirectional: true,
    });
    pairSeen.add(key);
  }
}

// ---------- Tag histogram (semantic aid) ----------
const tagCounts = {};
for (const n of fileNodes) for (const t of n.tags || []) tagCounts[t] = (tagCounts[t] || 0) + 1;

// Tags per group
const tagsByGroup = {};
for (const n of fileNodes) {
  const g = groupOfFile.get(n.id);
  tagsByGroup[g] = tagsByGroup[g] || {};
  for (const t of n.tags || []) tagsByGroup[g][t] = (tagsByGroup[g][t] || 0) + 1;
}

// ---------- File stats ----------
const filesPerGroup = {};
for (const [g, ids] of Object.entries(directoryGroups)) filesPerGroup[g] = ids.length;
const nodeTypeCounts = {};
for (const [t, ids] of Object.entries(nodeTypeGroups)) nodeTypeCounts[t] = ids.length;

const topFanIn = Object.entries(fileFanIn)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 25);
const topFanOut = Object.entries(fileFanOut)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 25);

const results = {
  scriptCompleted: true,
  commonPrefix: prefixStr,
  directoryGroups,
  subGroups,
  nodeTypeGroups,
  crossCategoryEdges,
  nonCodeLinks,
  interGroupImports,
  subGroupImports,
  intraGroupDensity,
  patternMatches,
  subPatternMatches,
  filePatterns,
  filePatternCounts,
  deploymentTopology,
  dataPipeline,
  docCoverage,
  dependencyDirection,
  fileStats: { totalFileNodes: fileNodes.length, filesPerGroup, nodeTypeCounts },
  fileFanIn: Object.fromEntries(topFanIn),
  fileFanOut: Object.fromEntries(topFanOut),
  tagCounts,
  tagsByGroup,
};

try {
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
} catch (e) {
  fail('failed to write output: ' + e.message);
}
process.stdout.write(
  'OK ' + fileNodes.length + ' file nodes, ' + Object.keys(directoryGroups).length + ' groups\n'
);
process.exit(0);
