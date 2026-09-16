#!/usr/bin/env node
/**
 * CRAP — one tool, both stacks.
 *
 *   CRAP(m) = CC² × (1 − cov)³ + CC        Savoia & Evans, 2007. Threshold 30.
 *
 * WHY ONE TOOL: this replaced two, and the two disagreed. The backend script took
 * complexity from OpenCover, which counts IL branch points AFTER the compiler lowers
 * a construct — a plain 11-arm string switch scored 50 there and 13 in source. The
 * frontend script took complexity from ESLint, which reads the syntax tree. Same
 * metric name, same threshold of 30, two different inputs, non-comparable numbers.
 *
 * CRAP's threshold of 30 was calibrated by Crap4j against SOURCE cyclomatic
 * complexity, so source is what both adapters report now:
 *
 *   backend   complexity ← SonarAnalyzer S1541, threshold forced to 0 so EVERY
 *                          method reports (default 10 hides most of them)
 *             coverage   ← OpenCover XML (Cobertura carries no per-method data)
 *
 *   frontend  complexity ← ESLint `complexity` rule, threshold forced to 0
 *             coverage   ← coverage-final.json (istanbul shape)
 *
 * Both adapters emit the same record — {file, name, start, end, cc} — and the same
 * join runs over both: count the covered statements inside a function's line span.
 * One formula, one threshold, one baseline format, comparable numbers.
 *
 * Usage (from the repo root):
 *   node tools/crap.mjs backend            # measure .NET
 *   node tools/crap.mjs frontend           # measure Angular
 *   node tools/crap.mjs both
 *   node tools/crap.mjs backend --baseline # re-record after real gains
 *   node tools/crap.mjs backend --top 40
 *   node tools/crap.mjs backend --sln backend/affected-<slug>.slnf   # scope the analyzer build
 *
 * ALWAYS pass --sln inside a gauntlet stage. Without it the complexity half does a
 * full --no-incremental analyzer build of GymBug.sln (40 projects) into %TEMP%, which
 * takes minutes, ~3 GB of disk per run, and filled the box when three /clean
 * sessions ran it at once (2026-09-14). The ratchet is still valid on a scoped
 * build: methods outside the scope are unchanged, so the worst CRAP in scope
 * against the recorded baseline is the same question.
 *
 * Coverage must already exist. Produce it with:
 *   backend   dotnet test <proj> --collect:"XPlat Code Coverage;Format=opencover" \
 *               --results-directory <dir>            (default: /tmp/covall)
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
const stack = argv.find((a) => !a.startsWith('--')) ?? 'both';
const recording = argv.includes('--baseline');
// indexOf(-1)+1 === 0 would silently hand back argv[0] — read flag values explicitly.
const flagValue = (flag) => {
  const i = argv.indexOf(flag);
  return i === -1 ? undefined : argv[i + 1];
};
const topN = Number(flagValue('--top')) || 20;
const covArg = flagValue('--coverage');
// Solution or filter to analyse. Relative to the repo root; defaults to the whole solution.
const slnArg = flagValue('--sln');
const slnPath = slnArg ? resolve(ROOT, slnArg) : 'GymBug.sln';

if (!['backend', 'frontend', 'both'].includes(stack)) {
  console.error(`usage: node tools/crap.mjs <backend|frontend|both> [--baseline] [--top N] [--coverage DIR] [--sln FILE]`);
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

// ------------------------------------------------------------ backend adapter
function backendComplexity(quiet) {
  // A temporary SonarLint.xml drops S1541's threshold to 0 so every method reports
  // its number; an isolated artifacts path keeps this measurement build from
  // fighting a normal build (or another agent's) over obj/.
  const tmp = mkdtempSync(join(tmpdir(), 'crap-sonar-'));
  const sonarLint = join(tmp, 'SonarLint.xml');
  writeFileSync(
    sonarLint,
    `<?xml version="1.0" encoding="UTF-8"?>
<AnalysisInput><Rules><Rule>
  <Key>S1541</Key>
  <Parameters><Parameter>
    <Key>maximumFunctionComplexityThreshold</Key><Value>0</Value>
  </Parameter></Parameters>
</Rule></Rules></AnalysisInput>`
  );

  // S1541 ships DISABLED — SonarLint.xml only tunes its parameter. A ruleset is
  // what actually switches it on for the build.
  const ruleset = join(tmp, 'crap.ruleset');
  writeFileSync(
    ruleset,
    `<?xml version="1.0" encoding="utf-8"?>
<RuleSet Name="crap" ToolsVersion="16.0">
  <Rules AnalyzerId="SonarAnalyzer.CSharp" RuleNamespace="SonarAnalyzer.CSharp">
    <Rule Id="S1541" Action="Warning" />
  </Rules>
</RuleSet>`
  );

  const props = join(tmp, 'crap.props');
  writeFileSync(
    props,
    `<Project>
  <ItemGroup>
    <AdditionalFiles Include="${sonarLint.split('\\').join('/')}" />
  </ItemGroup>
  <PropertyGroup>
    <NoWarn>$(NoWarn)</NoWarn>
  </PropertyGroup>
</Project>`
  );

  if (!quiet) console.error(`measuring backend complexity (analyzer build of ${slnArg ?? 'GymBug.sln — pass --sln to scope it'})…`);
  let out = '';
  try {
    out = execFileSync(
      'dotnet',
      [
        'build', slnPath,
        '--no-incremental',
        '--artifacts-path', join(tmp, 'art'),
        '-v', 'n', '--nologo',
        `-p:CustomAfterMicrosoftCommonProps=${props}`,
        `-p:CodeAnalysisRuleSet=${ruleset}`,
        '-warnaserror:none',
        '-p:TreatWarningsAsErrors=false',
        '-p:RunAnalyzers=true',
      ],
      { cwd: join(ROOT, 'backend'), encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 }
    );
  } catch (e) {
    out = (e.stdout ?? '') + (e.stderr ?? '');
  }

  const fns = [];
  const seen = new Set();
  for (const line of out.split(/\r?\n/)) {
    const m = line.match(/backend[\\/](.+?)\((\d+),\d+\): warning S1541: .*?is (\d+) which/);
    if (!m) continue;
    const file = m[1].split('\\').join('/');
    if (/\/obj\/|\.g\.cs$|\.Designer\.cs$|\/Migrations\//i.test(file)) continue;
    const key = `${file}:${m[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // S1541 points at the method signature; the coverage join needs a span, and
    // OpenCover's own line data is what bounds it — take a generous window and let
    // the statement filter decide. 400 lines is longer than anything sane here.
    fns.push({ file, name: null, start: +m[2], end: +m[2] + 400, cc: +m[3] });
  }
  rmSync(tmp, { recursive: true, force: true });
  return fns;
}

function backendCoverage(dir) {
  const files = [];
  (function walk(d) {
    if (!existsSync(d)) return;
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.xml')) files.push(p);
    }
  })(dir);

  const byFile = new Map();
  const methodSpans = new Map(); // file -> [{start, end, name}]
  for (const f of files) {
    const xml = readFileSync(f, 'utf8');
    if (!xml.includes('<CoverageSession')) continue;
    for (const mod of xml.split('<Module ').slice(1)) {
      const name = mod.match(/<ModuleName>([^<]+)<\/ModuleName>/)?.[1] ?? '';
      if (!name.startsWith('GymBug') || name.endsWith('.Tests')) continue;
      const paths = {};
      for (const p of mod.matchAll(/<File uid="(\d+)" fullPath="([^"]+)"/g)) {
        paths[p[1]] = p[2].split('\\').join('/').replace(/^.*\/backend\//, '');
      }
      for (const meth of mod.split('<Method ').slice(1)) {
        const uid = meth.match(/<FileRef uid="(\d+)"/)?.[1];
        const src = paths[uid];
        if (!src) continue;
        const mName = meth.match(/<Name>([^<]+)<\/Name>/)?.[1] ?? '';
        // OpenCover emits SequencePoint attributes as vc=… before sl=…, so read
        // each attribute independently rather than assuming an order.
        const lines = [];
        for (const sp of meth.matchAll(/<SequencePoint\b([^>]*)\/>/g)) {
          const attrs = sp[1];
          const sl = Number(/\bsl="(\d+)"/.exec(attrs)?.[1]);
          const vc = Number(/\bvc="(\d+)"/.exec(attrs)?.[1]);
          if (Number.isFinite(sl) && Number.isFinite(vc)) lines.push({ sl, vc });
        }
        if (lines.length === 0) continue;

        const d = byFile.get(src) ?? { statements: {}, hits: {} };
        for (const { sl, vc } of lines) {
          const id = `${src}:${sl}`;
          d.statements[id] = sl;
          d.hits[id] = Math.max(d.hits[id] ?? 0, vc); // union across suites
        }
        byFile.set(src, d);

        // XML-decode, drop return type + params, and unwrap compiler async state
        // machines: Ns.Class/<Handle>d__2::MoveNext → Class::Handle.
        let clean = mName
          .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
          .replace(/^[^ ]+ /, '')
          .replace(/\(.*/, '');
        const sm = clean.match(/^(.*)\/<(\w+)>d__\d+::MoveNext$/);
        if (sm) clean = `${sm[1]}::${sm[2]}`;
        const sep = clean.indexOf('::');
        const type = clean.slice(0, sep).split('.').pop().replace('/', '.');

        const spans = methodSpans.get(src) ?? [];
        spans.push({
          start: Math.min(...lines.map((l) => l.sl)),
          end: Math.max(...lines.map((l) => l.sl)),
          name: `${type}::${clean.slice(sep + 2)}`,
        });
        methodSpans.set(src, spans);
      }
    }
  }
  return { byFile, methodSpans };
}

// ----------------------------------------------------------- frontend adapter
function frontendComplexity(quiet) {
  const bin = join(ROOT, 'frontend', 'node_modules', 'eslint', 'bin', 'eslint.js');
  if (!existsSync(bin)) {
    console.error(`crap: eslint not found at ${bin}`);
    process.exit(1);
  }
  if (!quiet) console.error('measuring frontend complexity (eslint)…');
  let out;
  try {
    out = execFileSync(
      process.execPath,
      [bin, 'projects', '--format', 'json', '--rule', '{"complexity":["warn",0]}'],
      { cwd: join(ROOT, 'frontend'), encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }
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
    for (const m of file.messages) {
      if (m.ruleId !== 'complexity') continue;
      const cc = Number(/complexity of (\d+)/.exec(m.message)?.[1]);
      if (!Number.isFinite(cc)) continue;
      const quoted = /'([^']+)'/.exec(m.message)?.[1];
      const kind = /^([A-Za-z ]+?) (?:'|has a complexity)/.exec(m.message)?.[1] ?? 'function';
      fns.push({
        file: file.filePath.split('\\').join('/').replace(/^.*\/frontend\//, ''),
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
  const dir = join(ROOT, 'frontend', 'coverage');
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
      const key = path.split('\\').join('/').replace(/^.*\/frontend\//, '');
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
function measure(which, quiet) {
  if (which === 'backend') {
    // Default matches Git Bash's /tmp/covall — node must spell it via tmpdir(),
    // a literal '/tmp' resolves to <cwd-drive>:\tmp on Windows.
    const covDir = covArg ?? join(tmpdir(), 'covall');
    const { byFile, methodSpans } = backendCoverage(covDir);
    if (byFile.size === 0) {
      console.error(`crap: no OpenCover data under ${covDir}. Run dotnet test with Format=opencover.`);
      process.exit(1);
    }
    const lookup = makeCoverageLookup(byFile);
    const rows = [];
    for (const f of backendComplexity(quiet)) {
      // S1541 gives the signature line; OpenCover gives real method spans. Match
      // the nearest span starting at or after the signature to get a name + bound.
      const span = (methodSpans.get(f.file) ?? [])
        .filter((s) => s.start >= f.start - 2 && s.start <= f.start + 20)
        .sort((a, b) => a.start - b.start)[0];
      if (!span) continue;
      const cov = lookup(f.file, span.start, span.end);
      if (cov === null) continue;
      rows.push({ stack: 'backend', file: f.file, name: span.name, line: f.start, cc: f.cc, cov: cov * 100, crap: crapOf(f.cc, cov) });
    }
    return rows;
  }

  const byFile = frontendCoverage();
  if (byFile.size === 0) {
    console.error('crap: no frontend coverage. Run: cd frontend && npm run test:coverage');
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
const rows = [];
if (stack === 'backend' || stack === 'both') rows.push(...measure('backend', false));
if (stack === 'frontend' || stack === 'both') rows.push(...measure('frontend', false));

if (rows.length === 0) {
  console.error('crap: nothing scored — complexity and coverage did not overlap.');
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
