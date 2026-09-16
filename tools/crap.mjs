#!/usr/bin/env node
/**
 * CRAP — one tool, both stacks.
 *
 *   CRAP(m) = CC² × (1 − cov)³ + CC        Savoia & Evans, 2007. Threshold 30.
 *
 * ONE STACK HERE. The original served .NET and Angular from one tool, because two
 * separate scripts had disagreed: the .NET one took complexity from OpenCover, which
 * counts IL branch points AFTER the compiler lowers a construct, so a plain 11-arm
 * switch scored 50 there and 13 in source. This workspace is Angular only, so the
 * .NET adapter is gone and the surviving inputs are:
 *
 *   complexity ← ESLint `complexity` rule, threshold forced to 0 so EVERY function
 *                reports (the default of 10 hides most of them)
 *   coverage   ← coverage/coverage-final.json (istanbul shape), written by
 *                `npm run test:coverage`
 *
 * CRAP's threshold of 30 was calibrated by Crap4j against SOURCE cyclomatic
 * complexity, which is what ESLint reports, so the threshold still means what it meant.
 *
 * Usage (from the repo root):
 *   node tools/crap.mjs backend            # measure .NET
 *   node tools/crap.mjs frontend           # measure Angular
 *   node tools/crap.mjs both
 *   node tools/crap.mjs backend --baseline # re-record after real gains
 *   node tools/crap.mjs backend --top 40
 *
 *
 * Coverage must already exist. Produce it with:
 *   frontend  cd frontend && npm run test:coverage
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdtempSync, rmSync, cpSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const THRESHOLD = 30;

const argv = process.argv.slice(2);
const stack = argv.find((a) => !a.startsWith('--')) ?? 'frontend';
const recording = argv.includes('--baseline');
// indexOf(-1)+1 === 0 would silently hand back argv[0] — read flag values explicitly.
const flagValue = (flag) => {
  const i = argv.indexOf(flag);
  return i === -1 ? undefined : argv[i + 1];
};
const topN = Number(flagValue('--top')) || 20;
const covArg = flagValue('--coverage');
// Solution or filter to analyse. Relative to the repo root; defaults to the whole solution.

if (stack !== 'frontend') {
  console.error(`usage: node tools/crap.mjs frontend [--baseline] [--top N] [--coverage DIR]`);
  process.exit(1);
}

const crapOf = (cc, cov) => cc * cc * (1 - cov) ** 3 + cc;

// ---------------------------------------------------------------- shared join
/**
 * Statement coverage of the lines a function spans. Line-span matching is what
 * lets two very different complexity sources share one join: both report where a
 * function starts and ends, and both coverage formats map statements to lines.
 */
function makeCoverageLookup(byFile) {
  return (file, start, end) => {
    const d = byFile.get(file);
    if (!d) return null;
    let total = 0;
    let hit = 0;
    for (const [id, loc] of Object.entries(d.statements)) {
      const line = loc;
      if (line < start || line > end) continue;
      total++;
      if (d.hits[id] > 0) hit++;
    }
    return total === 0 ? null : hit / total;
  };
}

// ----------------------------------------------------------- frontend adapter
function frontendComplexity(quiet) {
  const bin = join(ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js');
  if (!existsSync(bin)) {
    console.error(`crap: eslint not found at ${bin}`);
    process.exit(1);
  }
  if (!quiet) console.error('measuring frontend complexity (eslint)…');
  let out;
  try {
    out = execFileSync(
      process.execPath,
      [bin, 'src', '--format', 'json', '--rule', '{"complexity":["warn",0]}'],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }
    );
  } catch (e) {
    out = e.stdout;
    if (!out) {
      console.error('crap: eslint failed\n' + (e.stderr || e.message));
      process.exit(1);
    }
  }

  const fns = [];
  for (const file of JSON.parse(out)) {
    // Spec files are not production shape. CRAP asks "is this code too complex for how
    // well it is tested"; asking it of the tests themselves is meaningless, and they are
    // excluded from coverage anyway so they could only ever poison the join.
    if (/\.spec\.ts$/.test(file.filePath)) continue;
    for (const m of file.messages) {
      if (m.ruleId !== 'complexity') continue;
      const cc = Number(/complexity of (\d+)/.exec(m.message)?.[1]);
      if (!Number.isFinite(cc)) continue;
      const quoted = /'([^']+)'/.exec(m.message)?.[1];
      const kind = /^([A-Za-z ]+?) (?:'|has a complexity)/.exec(m.message)?.[1] ?? 'function';
      fns.push({
        file: file.filePath.split('\\').join('/').replace(ROOT.split('\\').join('/') + '/', ''),
        name: quoted ?? `${kind.toLowerCase()} @${m.line}`,
        start: m.line,
        end: m.endLine ?? m.line,
        cc,
      });
    }
  }
  return fns;
}

function frontendCoverage() {
  const dir = join(ROOT, 'coverage');
  const files = [];
  (function walk(d) {
    if (!existsSync(d)) return;
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'coverage-final.json') files.push(p);
    }
  })(dir);

  const byFile = new Map();
  for (const f of files) {
    for (const [path, data] of Object.entries(JSON.parse(readFileSync(f, 'utf8')))) {
      const key = path.split('\\').join('/').replace(ROOT.split('\\').join('/') + '/', '');
      const d = byFile.get(key) ?? { statements: {}, hits: {} };
      for (const [id, loc] of Object.entries(data.statementMap ?? {})) {
        const gid = `${key}:${id}`;
        d.statements[gid] = loc.start?.line;
        d.hits[gid] = Math.max(d.hits[gid] ?? 0, data.s?.[id] ?? 0);
      }
      byFile.set(key, d);
    }
  }
  return byFile;
}

// ------------------------------------------------------------------- measure
function measure(quiet) {
  const byFile = frontendCoverage();
  if (byFile.size === 0) {
    console.error('crap: no coverage. Run: npm run test:coverage');
    process.exit(1);
  }
  const lookup = makeCoverageLookup(byFile);
  const rows = [];
  for (const f of frontendComplexity(quiet)) {
    const cov = lookup(f.file, f.start, f.end);
    if (cov === null) continue;
    rows.push({ stack: 'frontend', file: f.file, name: f.name, line: f.start, cc: f.cc, cov: cov * 100, crap: crapOf(f.cc, cov) });
  }
  return rows;
}

// -------------------------------------------------------------------- report
const rows = measure(false);

if (rows.length === 0) {
  // Two very different situations, and conflating them turns /clean red for no reason.
  // Coverage exists (frontendCoverage already exited if it did not), so either there is
  // genuinely no function to score yet, or complexity and coverage disagree on paths.
  const cxFiles = new Set(frontendComplexity(true).map((f) => f.file));
  const covFiles = new Set(frontendCoverage().keys());
  const shared = [...cxFiles].filter((f) => covFiles.has(f));

  if (shared.length === 0) {
    // Every function that exists lives in a file coverage deliberately excludes
    // (main.ts, composition roots, routes). Nothing to weigh. Not a failure.
    console.log('crap: no scoreable functions. Every function found lives in a file that');
    console.log('      coverage excludes by design, so there is nothing to weigh.');
    console.log(`      complexity in: ${[...cxFiles].join(', ') || '(none)'}`);
    console.log(`      coverage in:   ${[...covFiles].join(', ') || '(none)'}`);
    process.exit(0);
  }

  console.error('crap: nothing scored — complexity and coverage cover the same files but');
  console.error('      no function span lined up. That is a path or span bug, not an empty repo.');
  console.error(`      shared files: ${shared.join(', ')}`);
  process.exit(1);
}

rows.sort((a, b) => b.crap - a.crap);
const worst = Math.ceil(rows[0].crap);

console.log(`\n  CRAP    CC   cov%   function                       (source complexity, threshold ${THRESHOLD})`);
console.log('  ' + '-'.repeat(94));
for (const r of rows.slice(0, topN)) {
  console.log(`${String(Math.round(r.crap)).padStart(6)}  ${String(r.cc).padStart(4)}  ${r.cov.toFixed(1).padStart(5)}   ${r.name}`);
  console.log(' '.repeat(21) + `${r.file}:${r.line}`);
}

const groups = new Map();
for (const r of rows) {
  const key = r.stack === 'backend' ? r.file.split('/')[0] : r.file.split('/').slice(0, 3).join('/');
  const g = groups.get(key) ?? { key, stack: r.stack, n: 0, over: 0, ccOver: 0, zero: 0, worst: 0, debt: 0, cov: 0 };
  g.n++; g.debt += r.crap; g.cov += r.cov;
  if (r.crap > THRESHOLD) g.over++;
  if (r.cc > THRESHOLD) g.ccOver++;
  if (r.cov === 0) g.zero++;
  if (r.crap > g.worst) g.worst = r.crap;
  groups.set(key, g);
}

console.log('\n  worst   >30  CC>30  0-cov  fns   avg-cov  module');
console.log('  ' + '-'.repeat(94));
for (const g of [...groups.values()].sort((a, b) => b.debt - a.debt)) {
  console.log(
    String(Math.round(g.worst)).padStart(7) + String(g.over).padStart(6) + String(g.ccOver).padStart(7) +
    String(g.zero).padStart(7) + String(g.n).padStart(6) + (g.cov / g.n).toFixed(1).padStart(9) + '%  ' + g.key
  );
}

const mustSplit = rows.filter((r) => r.cc > THRESHOLD).sort((a, b) => b.cc - a.cc);
if (mustSplit.length) {
  console.log(`\n  CC > ${THRESHOLD} — cannot reach CRAP ${THRESHOLD} at any coverage; splitting is the only lever:`);
  for (const r of mustSplit) console.log(`    CC ${String(r.cc).padStart(3)}  cov ${r.cov.toFixed(0).padStart(3)}%  ${r.name}  (${r.file}:${r.line})`);
}

const over = rows.filter((r) => r.crap > THRESHOLD);
console.log(`\nscored:              ${rows.length}`);
console.log(`CRAP > ${THRESHOLD}:           ${over.length}  (${((100 * over.length) / rows.length).toFixed(1)}%)`);
console.log(`CC > ${THRESHOLD} (must split): ${rows.filter((r) => r.cc > THRESHOLD).length}`);
console.log(`worst CRAP:          ${worst}`);

const BASELINE = join(ROOT, 'crap-baseline.json');
const load = () => (existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : { stacks: {} });

if (recording) {
  const b = load();
  b.note = 'CRAP ratchet, source complexity both stacks. maxCrap only ever goes DOWN. Never re-record to turn a red gate green.';
  b.threshold = THRESHOLD;
  b.stacks[stack === 'both' ? 'all' : stack] = {
    recorded: new Date().toISOString().slice(0, 10),
    maxCrap: worst,
    scored: rows.length,
    over30: over.length,
    worstOffenders: rows.slice(0, 10).map((r) => ({
      crap: Math.round(r.crap), cc: r.cc, cov: Number(r.cov.toFixed(1)), fn: r.name, at: `${r.file}:${r.line}`,
    })),
  };
  writeFileSync(BASELINE, JSON.stringify(b, null, 2) + '\n');
  console.log(`\nbaseline recorded -> ${BASELINE}  (${stack}: maxCrap ${worst})`);
  process.exit(0);
}

const base = load().stacks?.[stack === 'both' ? 'all' : stack];
if (!base) {
  console.error(`\ncrap: no baseline for "${stack}" yet. Run once with --baseline.`);
  process.exit(1);
}

const bad = rows.filter((r) => r.crap > base.maxCrap);
if (bad.length) {
  console.error(`\nFAIL: ${bad.length} function(s) above the ${stack} baseline of ${base.maxCrap}:`);
  for (const r of bad) console.error(`  ${Math.round(r.crap)}  ${r.name}  (${r.file}:${r.line})`);
  console.error('\nSplit it or cover it. Do not re-record to get green.');
  process.exit(2);
}
console.log(`\nPASS: worst CRAP ${worst} is within the ${stack} baseline of ${base.maxCrap}.`);
if (worst < base.maxCrap) console.log(`${base.maxCrap - worst} below it — re-record with --baseline to lock the gain in.`);
