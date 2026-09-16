#!/usr/bin/env node
/**
 * gauntlet — the pipeline's instrument panel. Built for the agent, not the human.
 *
 * A session opens with no memory of the last one. These commands are how it finds out
 * what is in flight, what it should do next, and what it must not forget — without a
 * human pasting a handoff block. The human reads the REPORT a session writes from this;
 * they should not have to run it themselves.
 *
 * Two problems, one graph.
 *
 * 1. NO BUILD SCOPE. The .NET original walked the ProjectReference graph and wrote
 *    a .slnf filter so a 4-core box did not rebuild 40 projects. This workspace is
 *    one Angular application: `ng build` builds it, and there is nothing to scope.
 *    The `affected` command and the .sln/.csproj graph behind it were removed rather
 *    than left half wired. If this repo ever becomes a multi-project workspace,
 *    scope with `ng build <project>`, not with this tool.
 *
 * 2. STAGE STATE. The ledger lives OUTSIDE the repo on purpose: state committed on a
 *    feature branch is invisible from every other branch, which defeats the one question
 *    parallel work asks.
 *
 * The ledger never copies the specification. Scenario counts and green counts are DERIVED
 * from the .feature file and the newest .trx at read time. A transcript of a frozen contract
 * drifts from it — that is how docs/requirements/GLOBAL-EXECUTION-TRACKER died, and it is
 * banned by docs/plans/gauntlet-handoff.md.
 *
 * Every command takes --json. Parse that, never the table: the table is for pasting into a
 * report, and its column widths are not a contract.
 *
 *   node tools/gauntlet.mjs status [--json]          everything: in flight, planned, blocked
 *   node tools/gauntlet.mjs next [slug] [--json]     the single next action, and why
 *   node tools/gauntlet.mjs plan <slug> --title "…" [--ado N]
 *   node tools/gauntlet.mjs start <slug> [--ado N]
 *   node tools/gauntlet.mjs sign-off <slug> <stage> --gate "…" [--carry "…"]
 *   node tools/gauntlet.mjs block <slug> --why "…"   |   unblock <slug>
 *   node tools/gauntlet.mjs affected [--slug S] [--files a,b] [--json]
 *   node tools/gauntlet.mjs done <slug>              archive a finished slug
 *
 * State dir: $GAUNTLET_STATE, else ~/gauntlet-state/<repo-name>/
 * Exit codes: 0 ok · 1 usage/not-found · 2 nothing affected (nothing to build)
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, statSync, renameSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, resolve, relative, basename } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FEATURES = join(ROOT, 'features');
const RESULTS = join(ROOT, 'test-results');
// Worktrees share ONE ledger: the state dir is named after the main checkout, never the
// worktree folder, or a slug worked in ../gsc-wt/<slug> would read an empty ledger.
function repoName() {
  try {
    const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: ROOT, encoding: 'utf8' }).trim();
    return basename(dirname(common));
  } catch { return basename(ROOT); }
}
const STATE = process.env.GAUNTLET_STATE || join(homedir(), 'gauntlet-state', repoName());
const ARCHIVE = join(STATE, 'done');
const STAGES = ['spec', 'code', 'clean', 'harden', 'qa'];
/** Stages that saturate a 4-core box. Two of these at once is slower than one at a time. */
const EXPENSIVE = new Set(['code', 'clean', 'harden']);

/**
 * Where a signed-off stage puts the card on the GymBugHub "Development" team board.
 *
 * Column names must match that team's board EXACTLY — they are per-team settings and the
 * ADO MCP cannot read them back, so this map is the only place they are written down. If a
 * column is renamed in ADO, change it here too or sync will write a column that does not exist.
 *
 * Several columns share a state deliberately: the business board shows plain "Active" across
 * Code/Clean/Harden, which is the right granularity for someone who is not running the pipeline.
 */
const BOARD = {
  spec: { column: 'Code', state: 'Active' },    // /spec done -> ready to code
  code: { column: 'Clean', state: 'Active' },
  clean: { column: 'Harden', state: 'Active' },
  harden: { column: 'QA', state: 'Resolved' },
  qa: { column: 'Done', state: 'Closed' },
};

/**
 * The writable Kanban column field, per work item type.
 *
 * `System.BoardColumn` is READ-ONLY — writing it fails with
 * `TF401326: Invalid field status 'ReadOnly'`. The real field is a per-board WEF field, and
 * its GUID is NOT the board id (the Stories board is d0eccefd… but its field is 79FE1C60…),
 * so these cannot be derived — they were read from
 * `GET .../Development/_apis/work/boards/{board}` -> fields.columnField.referenceName.
 *
 * Setting State alone is not enough: Code, Clean and Harden all map to Active, so a card with
 * only its State set lands in the leftmost column that matches. Always write both.
 */
const COLUMN_FIELD = {
  // Read from GET .../{team}/_apis/work/boards/{board} -> fields.columnField.
  // These are Fred Personal Work's, NOT GymBugHub's - the GUIDs differ per project.
  // Bug is absent deliberately: this team runs bugsBehavior=asTasks, so bugs are
  // not on the Stories board and have no Kanban column field to write.
  'User Story': 'WEF_E38AF6C093F34082A7A64C805E0B4089_Kanban.Column',
  Feature: 'WEF_1D473EAF74AC4889A7290D6A94F049D6_Kanban.Column',
  Epic: 'WEF_49C1B63C5FC64501B5B141CD9EC8AFF7_Kanban.Column',
};
/** Cards are only on the Development board while they sit in this area path. */
const AREA_PATH = 'Fred Personal Work\\Development';

const argv = process.argv.slice(2);
const cmd = argv[0];
const JSON_OUT = argv.includes('--json');
// indexOf(-1)+1 === 0 would silently hand back argv[0] — read flag values explicitly.
const flagValue = (flag) => {
  const i = argv.indexOf(flag);
  return i === -1 ? undefined : argv[i + 1];
};
const flagValueIndexes = new Set(argv.map((a, i) => (a.startsWith('--') ? i + 1 : -1)).filter((i) => i > 0));
const posArgs = argv.slice(1).filter((a, i) => !a.startsWith('--') && !flagValueIndexes.has(i + 1));

const posix = (p) => p.replace(/\\/g, '/');
const emit = (obj, text) => { if (JSON_OUT) console.log(JSON.stringify(obj, null, 2)); else text(); };
const ago = (iso) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return mins + 'm ago';
  if (mins < 1440) return Math.round(mins / 60) + 'h ago';
  return Math.round(mins / 1440) + 'd ago';
};

// --------------------------------------------------------------------- ledger
const ledgerPath = (slug) => join(STATE, slug + '.json');
const readLedger = (slug) => (existsSync(ledgerPath(slug)) ? JSON.parse(readFileSync(ledgerPath(slug), 'utf8')) : null);

function writeLedger(l) {
  mkdirSync(STATE, { recursive: true });
  writeFileSync(ledgerPath(l.slug), JSON.stringify(l, null, 2) + '\n');
}

const allLedgers = () => (existsSync(STATE)
  ? readdirSync(STATE).filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(readFileSync(join(STATE, f), 'utf8')))
      .sort((a, b) => a.slug.localeCompare(b.slug))
  : []);

/**
 * Resolve loose input to a slug. Bojan dictates, so "weekly allowance" has to find
 * "weekly-allowance-remaining" — speech-to-text never produces hyphens, and making a human
 * pronounce punctuation is a worse fix than making the tool tolerant.
 *
 * Exact match wins, then prefix, then all-words-present. Ambiguity is reported, never guessed:
 * picking the wrong slug silently would sign off the wrong feature.
 */
function resolveSlug(input) {
  if (!input) return null;
  const all = allLedgers().map((l) => l.slug);
  if (all.includes(input)) return input;

  const norm = input.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const words = norm.split(' ').filter(Boolean);
  const flat = (s) => s.replace(/-/g, ' ');

  const prefix = all.filter((s) => flat(s).startsWith(norm));
  const contains = all.filter((s) => words.every((w) => flat(s).includes(w)));
  const hits = prefix.length ? prefix : contains;

  if (hits.length === 1) return hits[0];
  if (hits.length > 1) {
    console.error('gauntlet: "' + input + '" matches ' + hits.length + ' slugs — say more of it:');
    for (const h of hits) console.error('  ' + h);
    process.exit(1);
  }
  return input; // no match; let the caller report it against what was actually asked for
}

function mustRead(slugInput) {
  const slug = resolveSlug(slugInput);
  const l = slug ? readLedger(slug) : null;
  if (!l) {
    console.error('gauntlet: no ledger for "' + (slugInput ?? '') + '".');
    const all = allLedgers().map((l2) => l2.slug);
    if (all.length) { console.error('Tracked right now:'); for (const s of all) console.error('  ' + s); }
    else console.error('Nothing is tracked yet — `gauntlet plan <slug> --title "…"`.');
    process.exit(1);
  }
  return l;
}

// ---------------------------------------------------- derived scenario progress
/** Scenario titles, read from the frozen contract. Never stored — always re-read. */
function scenariosOf(slug) {
  const file = join(FEATURES, slug + '.feature');
  if (!existsSync(file)) return null;
  const titles = [];
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*Scenario(?: Outline)?:\s*(.+?)\s*$/);
    if (m) titles.push(m[1]);
  }
  return { file: posix(relative(ROOT, file)), titles };
}

/**
 * Green count for this slug, from the cucumber-js JSON report.
 *
 * Replaces the .trx reader: there is no MSTest here. `npm run test:acceptance --
 * --tags @<slug> --format json:test-results/<slug>.json` writes one file per slug,
 * so there is no "newest file" ambiguity and no class-name bucketing.
 *
 * A scenario counts as green only when every step passed. cucumber-js reports an
 * unimplemented step as `undefined`, which is exactly what /spec's gate wants to
 * see: the contract parses, every scenario runs, nothing is green yet.
 *
 * Returns null for "no run on record", never {passed: 0}. Reporting the second
 * when the first is true is how a healthy feature gets declared broken.
 */
function greenFromCucumber(slug) {
  const file = join(RESULTS, slug + '.json');
  if (!existsSync(file)) return null;
  let report;
  try {
    report = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
  if (!Array.isArray(report)) return null;

  let passed = 0;
  let total = 0;
  for (const feature of report) {
    for (const el of feature.elements ?? []) {
      if (el.type && el.type !== 'scenario') continue;
      total++;
      const steps = el.steps ?? [];
      if (steps.length && steps.every((st) => st.result?.status === 'passed')) passed++;
    }
  }
  return total ? { passed, total, at: new Date(statSync(file).mtimeMs).toISOString() } : null;
}

// ------------------------------------------------------------ the state machine
/**
 * Everything a session needs to decide what to do with one slug. This is the
 * function the whole tool exists for — `next` and `status` are both views of it.
 */
function readState(l) {
  const done = l.stages.map((s) => s.stage);
  const last = l.stages[l.stages.length - 1] ?? null;
  const s = scenariosOf(l.slug);
  const g = greenFromCucumber(l.slug);

  let phase;
  let nextStage = null;
  if (l.blocked) phase = 'blocked';
  else if (l.planned && !done.length) { phase = 'planned'; nextStage = 'spec'; }
  else if (!done.length) { phase = 'active'; nextStage = 'spec'; }
  else if (done.includes('qa')) phase = 'done';
  else { phase = 'active'; nextStage = STAGES[STAGES.indexOf(last.stage) + 1]; }

  // Carried-forward notes the next stage has not consumed yet.
  const carry = l.stages.filter((x) => x.carry).map((x) => ({ from: x.stage, note: x.carry }));

  return {
    slug: l.slug,
    phase,
    title: l.title ?? null,
    ado: l.ado ?? null,
    branch: l.branch ?? null,
    blocked: l.blocked ?? null,
    scenarios: s ? s.titles.length : null,
    contract: s ? s.file : null,
    green: g ? g.passed : null,
    greenOf: g ? g.total : null,
    greenAt: g ? g.at : null,
    stagesDone: done,
    last: last ? { stage: last.stage, gate: last.gate, at: last.at } : null,
    next: nextStage,
    nextCommand: nextStage ? '/' + nextStage + ' ' + l.slug : null,
    expensive: nextStage ? EXPENSIVE.has(nextStage) : false,
    carry,
  };
}

// ------------------------------------------------------------------- commands
function cmdPlan() {
  const slug = posArgs[0];
  const title = flagValue('--title');
  if (!slug || !title) {
    console.error('usage: gauntlet plan <slug> --title "one line of what it should do" [--ado N]');
    process.exit(1);
  }
  if (readLedger(slug)) { console.error('gauntlet: ' + slug + ' already exists.'); process.exit(1); }
  writeLedger({
    slug, title,
    ado: flagValue('--ado') ?? null,
    adoType: flagValue('--type') ?? 'User Story', // decides which board's Kanban field sync writes
    branch: null, planned: true, created: new Date().toISOString(), stages: [],
  });
  console.log('planned ' + slug + ' — ' + title);
}

function cmdStart() {
  const slug = posArgs[0];
  if (!slug) { console.error('usage: gauntlet start <slug> [--ado N] [--title "…"]'); process.exit(1); }
  let branch = '(unknown)';
  try { branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { /* detached or no git */ }

  const existing = readLedger(slug);
  if (existing && !existing.planned) { console.error('gauntlet: ' + slug + ' already started. `gauntlet next ' + slug + '` for where it is.'); process.exit(1); }

  const l = existing ?? { slug, title: flagValue('--title') ?? null, created: new Date().toISOString(), stages: [] };
  l.planned = false;
  l.branch = branch;
  if (flagValue('--ado')) l.ado = flagValue('--ado');
  writeLedger(l);

  console.log('started ' + slug + '  (branch ' + branch + ')');
  const s = scenariosOf(slug);
  console.log(s ? 'contract ' + s.file + ' — ' + s.titles.length + ' scenarios' : 'contract not written yet — /spec owns that');
}

function cmdSignOff() {
  const slug = posArgs[0];
  const stage = posArgs[1];
  if (!slug || !STAGES.includes(stage)) {
    console.error('usage: gauntlet sign-off <slug> <' + STAGES.join('|') + '> --gate "…" [--carry "…"]');
    process.exit(1);
  }
  const l = mustRead(slug);
  const prior = STAGES.indexOf(stage) - 1;
  if (prior >= 0 && !l.stages.some((s) => s.stage === STAGES[prior])) {
    console.log('note: /' + STAGES[prior] + ' never signed off. Recording anyway — order is tracked, not enforced.');
  }
  const gate = flagValue('--gate') ?? null;
  l.planned = false;
  l.stages.push({ stage, at: new Date().toISOString(), gate, carry: flagValue('--carry') ?? null });
  writeLedger(l);

  const st = readState(l);
  console.log(slug + ': /' + stage + ' signed off' + (gate ? ' — ' + gate : ''));
  console.log(st.next ? 'next: ' + st.nextCommand : 'next: nothing — /qa was the last stage. `gauntlet done ' + slug + '` to archive it.');
}

/**
 * A block is a fact about the work, so it is recorded where the work is tracked — in the
 * ledger AND, when the blocker is itself a work item, as a real ADO Predecessor link.
 *
 * The prose reason alone is not enough: a dependency written in a description is invisible to
 * every query (see #1365, whose "must reuse #1332 / #1346" lives only in its text). A link is
 * queryable, shows on the board, and survives everyone forgetting about it.
 */
function cmdBlock() {
  const slug = posArgs[0];
  const why = flagValue('--why');
  const blockedBy = flagValue('--blocked-by');
  if (!slug || (cmd === 'block' && !why)) {
    console.error('usage: gauntlet block <slug> --why "…" [--blocked-by <ado id>]');
    console.error('       gauntlet unblock <slug>');
    console.error('');
    console.error('--blocked-by takes the ADO id of whatever is in the way. If the blocker is real');
    console.error('work but has no work item yet, file one first — a blocker nobody can open is a');
    console.error('blocker nobody will clear.');
    process.exit(1);
  }
  const l = mustRead(slug);
  l.blocked = cmd === 'block'
    ? { why, blockedBy: blockedBy ? Number(blockedBy) : null, at: new Date().toISOString(), linked: false }
    : null;
  writeLedger(l);

  if (cmd !== 'block') { console.log(slug + ': unblocked'); return; }
  console.log(slug + ': BLOCKED — ' + why);
  if (blockedBy) {
    console.log('  blocked by #' + blockedBy + ' — run `gauntlet sync ' + slug + '` to write the Predecessor link.');
  } else {
    console.log('  no --blocked-by given. If something concrete is in the way, give it an id so the');
    console.log('  dependency is queryable instead of buried in prose.');
  }
}

function cmdDone() {
  const slug = posArgs[0];
  const l = mustRead(slug);
  mkdirSync(ARCHIVE, { recursive: true });
  renameSync(ledgerPath(slug), join(ARCHIVE, slug + '.json'));
  console.log(slug + ': archived to ' + join(ARCHIVE, slug + '.json') + ' (' + l.stages.length + ' stages recorded)');
}

function cmdNext() {
  const slug = resolveSlug(posArgs[0]);
  if (slug) {
    const st = readState(mustRead(slug));
    emit(st, () => {
      console.log('');
      console.log(st.slug + (st.title ? ' — ' + st.title : ''));
      console.log('  phase     ' + st.phase + (st.blocked ? ' — ' + st.blocked.why : ''));
      console.log('  contract  ' + (st.contract ?? 'not written yet') + (st.scenarios ? ' (' + st.scenarios + ' scenarios)' : ''));
      if (st.green !== null) console.log('  green     ' + st.green + '/' + st.greenOf + '  (as of ' + ago(st.greenAt) + ')');
      if (st.last) console.log('  last      /' + st.last.stage + ' — ' + (st.last.gate ?? 'no gate recorded') + '  (' + ago(st.last.at) + ')');
      console.log('  NEXT      ' + (st.nextCommand ?? 'nothing — finished') + (st.expensive ? '   [CPU-heavy]' : ''));
      if (st.carry.length) {
        console.log('  carried forward:');
        for (const c of st.carry) console.log('    from /' + c.from + ': ' + c.note);
      }
      console.log('');
    });
    return;
  }

  // No slug: pick the work. Cheap stages first, so a session never starts a second heavy build.
  const states = allLedgers().map(readState).filter((s) => s.phase !== 'done');
  const actionable = states.filter((s) => s.phase !== 'blocked' && s.next);
  actionable.sort((a, b) => Number(a.expensive) - Number(b.expensive) || a.slug.localeCompare(b.slug));
  emit({ candidates: actionable, blocked: states.filter((s) => s.phase === 'blocked') }, () => {
    if (!actionable.length) { console.log('gauntlet: nothing actionable. `gauntlet status` for why.'); return; }
    console.log('');
    for (const s of actionable) {
      console.log('  ' + s.nextCommand.padEnd(34) + (s.expensive ? '[CPU-heavy]' : '[cheap]'));
    }
    console.log('');
    console.log('Cheap stages are listed first — /spec and /qa spec-writing build nothing.');
    console.log('Never start a second CPU-heavy stage while one is running: 4 cores, they stall each other.');
    console.log('');
  });
}

/**
 * What ADO should say, given what the ledger says. Reconciliation, not notification:
 * this compares desired-vs-pushed and emits only the delta, so it is safe to run at any
 * time, catches up however many stages were missed, and does nothing twice.
 *
 * It does NOT touch ADO — a Node script has no MCP. The agent applies the plan with
 * `wit_work_item_write` and then records success with `gauntlet synced <slug> <stage>`.
 * That split is deliberate: a failed or skipped push leaves the ledger authoritative and
 * self-healing, rather than half-written.
 */
function cmdSync() {
  const only = posArgs[0];
  const ledgers = (only ? [mustRead(only)] : allLedgers());
  const plan = [];

  // A block that names a work item owes ADO a Predecessor link, whatever stage it is at.
  for (const l of ledgers) {
    if (l.ado && l.blocked && l.blocked.blockedBy && !l.blocked.linked) {
      plan.push({
        slug: l.slug,
        ado: Number(l.ado),
        link: {
          rel: 'System.LinkTypes.Dependency-Reverse', // Predecessor: l.ado waits on blockedBy
          target: l.blocked.blockedBy,
          comment: l.blocked.why,
        },
        comment: '[gauntlet] ' + l.slug + ' · BLOCKED\nWhy: ' + l.blocked.why + '\nBlocked by #' + l.blocked.blockedBy + '.',
        markSynced: 'node tools/gauntlet.mjs linked ' + l.slug,
      });
    }
  }

  for (const l of ledgers) {
    if (!l.ado) continue;
    const signed = l.stages.map((s) => s.stage);
    const latest = signed[signed.length - 1];
    if (!latest) continue;
    if (l.synced === latest) continue; // already pushed

    // Everything signed off since the last push — their gates go in one comment, in order.
    const from = l.synced ? STAGES.indexOf(l.synced) + 1 : 0;
    const unpushed = l.stages.filter((s) => STAGES.indexOf(s.stage) >= from);
    const target = BOARD[latest];
    const type = l.adoType ?? 'User Story';
    const field = COLUMN_FIELD[type];
    if (!field) {
      console.error('gauntlet: no Kanban column field known for work item type "' + type + '" (' + l.slug + ').');
      console.error('Add it to COLUMN_FIELD, reading it from GET .../boards/{board} -> fields.columnField.');
      process.exit(1);
    }

    plan.push({
      slug: l.slug,
      ado: Number(l.ado),
      adoType: type,
      pushedThrough: l.synced ?? null,
      nowThrough: latest,
      set: {
        [field]: target.column,
        'System.State': target.state,
        'System.AreaPath': AREA_PATH,
      },
      comment: unpushed
        .map((s) => '/' + s.stage + ' done — ' + (s.gate ?? 'no gate recorded') + (s.carry ? '. Carried forward: ' + s.carry : ''))
        .join('\n'),
      markSynced: 'node tools/gauntlet.mjs synced ' + l.slug + ' ' + latest,
    });
  }

  emit({ plan, team: 'Development', project: 'Fred Personal Work' }, () => {
    if (!plan.length) { console.log('gauntlet: ADO is up to date with the ledger.'); return; }
    console.log('');
    console.log(plan.length + ' card(s) behind the ledger. Apply with wit_work_item_write, then run the markSynced command.');
    for (const p of plan) {
      console.log('');
      console.log('  #' + p.ado + '  ' + p.slug);
      if (p.link) {
        // A block entry carries a link instead of field writes — it can arrive at any stage.
        console.log('    link    Predecessor -> #' + p.link.target + '   (' + p.link.rel + ')');
      } else {
        console.log('    ' + (p.pushedThrough ? 'pushed through /' + p.pushedThrough : 'never pushed') + ' -> now /' + p.nowThrough);
        const col = Object.keys(p.set).find((k) => k.startsWith('WEF_'));
        console.log('    column  ' + p.set[col] + '   state  ' + p.set['System.State']);
      }
      for (const line of p.comment.split('\n')) console.log('    | ' + line);
    }
    console.log('');
    console.log('Column names come from BOARD in this file — they must match the Development team board exactly.');
    console.log('');
  });
}

function cmdLinked() {
  const slug = posArgs[0];
  const l = mustRead(slug);
  if (!l.blocked) { console.error('gauntlet: ' + slug + ' is not blocked.'); process.exit(1); }
  l.blocked.linked = true;
  writeLedger(l);
  console.log(slug + ': Predecessor link to #' + l.blocked.blockedBy + ' recorded as written.');
}

function cmdSynced() {
  const slug = posArgs[0];
  const stage = posArgs[1];
  if (!slug || !STAGES.includes(stage)) {
    console.error('usage: gauntlet synced <slug> <' + STAGES.join('|') + '>   (call only AFTER the ADO write succeeded)');
    process.exit(1);
  }
  const l = mustRead(slug);
  l.synced = stage;
  writeLedger(l);
  console.log(slug + ': ADO recorded as current through /' + stage);
}

function cmdStatus() {
  const ledgers = allLedgers();
  const states = ledgers.map(readState);
  const inFlight = states.filter((s) => s.phase === 'active');
  const planned = states.filter((s) => s.phase === 'planned');
  const blocked = states.filter((s) => s.phase === 'blocked');
  const finished = states.filter((s) => s.phase === 'done');

  emit({ state: STATE, inFlight, planned, blocked, done: finished }, () => {
    if (!ledgers.length) {
      console.log('gauntlet: nothing tracked yet.  state dir: ' + STATE);
      console.log('`gauntlet plan <slug> --title "…"` to queue something.');
      return;
    }
    console.log('');
    console.log('state: ' + STATE);

    const table = (rows) => {
      for (const s of rows) {
        console.log([
          '  ' + s.slug.padEnd(28),
          String(s.scenarios ?? '-').padStart(4),
          String(s.green ?? '-').padStart(6),
          ('/' + (s.last ? s.last.stage : 'none')).padEnd(7),
          '-> ' + (s.next ? '/' + s.next : 'done').padEnd(7),
          s.expensive ? '[CPU]' : '     ',
          s.last && s.last.gate ? s.last.gate : '',
        ].join('  '));
      }
    };

    if (inFlight.length) {
      console.log('\nIN FLIGHT (' + inFlight.length + ')');
      console.log('  slug                          scen   green  last     next');
      table(inFlight);
      for (const s of inFlight) {
        for (const c of s.carry) console.log('    ! ' + s.slug + ' carries from /' + c.from + ': ' + c.note);
      }
    }
    if (planned.length) {
      console.log('\nPLANNED (' + planned.length + ')');
      for (const s of planned) console.log('  ' + s.slug.padEnd(28) + '  ' + (s.title ?? '') + (s.ado ? '  [ADO ' + s.ado + ']' : ''));
    }
    if (blocked.length) {
      console.log('\nBLOCKED (' + blocked.length + ')');
      for (const s of blocked) console.log('  ' + s.slug.padEnd(28) + '  ' + s.blocked.why + '  (' + ago(s.blocked.at) + ')');
    }
    if (finished.length) {
      console.log('\nFINISHED, not archived (' + finished.length + ')');
      for (const s of finished) console.log('  ' + s.slug.padEnd(28) + '  `gauntlet done ' + s.slug + '`');
    }

    const heavy = inFlight.filter((s) => s.expensive).length;
    const cheap = [...inFlight.filter((s) => s.next && !s.expensive), ...planned];
    console.log('');
    if (heavy > 1) {
      const pair = cheap.length
        ? ' Pair it with /' + (cheap[0].next ?? 'spec') + ' ' + cheap[0].slug + ', which builds nothing.'
        : ' Nothing cheap is queued to pair with — plan something if you want the idle cores used.';
      console.log('NOTE: ' + heavy + ' slugs want a CPU-heavy stage. Run ONE.' + pair);
    }
    console.log('green is read from test-results/<slug>.json — "-" means no run on record, not zero passing.');
    console.log('Scenario counts come from the .feature files, never from the ledger.');
    console.log('');
  });
}

switch (cmd) {
  case 'plan': cmdPlan(); break;
  case 'start': cmdStart(); break;
  case 'sign-off': cmdSignOff(); break;
  case 'block': case 'unblock': cmdBlock(); break;
  case 'done': cmdDone(); break;
  case 'next': cmdNext(); break;
  case 'status': cmdStatus(); break;
  case 'sync': cmdSync(); break;
  case 'synced': cmdSynced(); break;
  case 'linked': cmdLinked(); break;
  default:
    console.error('usage: node tools/gauntlet.mjs <command> [--json]');
    console.error('  status                               everything: in flight, planned, blocked');
    console.error('  next [slug]                          the single next action, and why');
    console.error('  plan <slug> --title "…" [--ado N]    queue work before /spec runs');
    console.error('  start <slug> [--ado N]               move planned -> active');
    console.error('  sign-off <slug> <stage> --gate "…"   record a gate  [--carry "…"]');
    console.error('  block <slug> --why "…" | unblock <slug>');
    console.error('  done <slug>                          archive a finished slug');
    console.error('  sync [slug]                          what ADO should say but does not (a plan, not a write)');
    console.error('  synced <slug> <stage>                record that the ADO write landed');
    console.error('  linked <slug>                        record that the Predecessor link landed');
    process.exit(1);
}
