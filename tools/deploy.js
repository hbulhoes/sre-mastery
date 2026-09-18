#!/usr/bin/env node
/* SRE Track — deploy the static site to S3 and invalidate CloudFront.

   Reads the bucket and distribution from the CloudFormation stack outputs, so
   nothing about the target is hardcoded here. Runs the content validators
   first and refuses to publish if any of them fails.

   Usage:
     node tools/deploy.js [--stack sre-track-site] [--region us-east-1]
                          [--skip-checks] [--dry-run] [--no-wait]

   Requires the AWS CLI v2 on PATH with credentials for the target account.
*/
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ROOT, readManifest } = require('./lib');

const args = process.argv.slice(2);
const flag = n => args.includes(n);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

const STACK = argOf('--stack', 'sre-track-site');
const REGION = argOf('--region', 'us-east-1');
const DRY = flag('--dry-run');
const NO_WAIT = flag('--no-wait');

// index.html must be revalidated on every load; everything else may sit in the
// browser for 5 minutes and at the edge for a day. The filenames are stable
// (there is no build step, so no content hashing), which is why the edge copy
// is cleared by an invalidation on every deploy rather than left to expire.
const ASSET_CACHE = 'public,max-age=300,s-maxage=86400';
const HTML_CACHE = 'public,max-age=0,must-revalidate';

/* The set of files to publish is built explicitly rather than by excluding
   authoring directories from a sync of the repo root. A denylist is one typo
   away from publishing .git to a public CDN; an allowlist cannot leak a file
   nobody named. It also makes `--delete` unambiguous, since the staging
   directory contains exactly what the bucket should contain. */
function collectFiles() {
  const files = ['index.html', 'styles.css', 'app.js', 'diagrams.js', 'i18n/manifest.js', 'i18n/boot.js'];
  const { locales, fallback } = readManifest();
  Object.keys(locales).forEach(loc => {
    ['ui', 'dg'].forEach(kind => {
      const f = 'i18n/' + kind + '.' + loc + '.js';
      if (fs.existsSync(path.join(ROOT, f))) files.push(f);
    });
    locales[loc].worlds.forEach(n => files.push('content/' + loc + '/w' + n + '.js'));
  });
  // Every locale falls back to the source language for untranslated worlds,
  // so those files must ship even when no locale lists them itself.
  locales[fallback].worlds.forEach(n => {
    const f = 'content/' + fallback + '/w' + n + '.js';
    if (!files.includes(f)) files.push(f);
  });

  const missing = files.filter(f => !fs.existsSync(path.join(ROOT, f)));
  if (missing.length) {
    console.error('refusing to deploy: these files are referenced but missing:\n  ' + missing.join('\n  '));
    process.exit(1);
  }
  return [...new Set(files)].sort();
}

function stage(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sre-track-deploy-'));
  files.forEach(f => {
    const dest = path.join(dir, f);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(ROOT, f), dest);
  });
  return dir;
}

/* Windows joins arguments into a command line when `shell` is set, without
   quoting them, which splits any value containing a semicolon — such as a
   content type with a charset. Spawning without a shell keeps arguments
   intact. Fall back to a shell only if the binary cannot be found that way,
   as happens when `aws` on PATH is a .cmd shim. */
const USE_SHELL = (() => {
  if (DRY) return false;
  const probe = spawnSync('aws', ['--version'], { encoding: 'utf8', shell: false });
  return !!probe.error;
})();

function run(bin, argv, { capture = false, allowFail = false } = {}) {
  const pretty = bin + ' ' + argv.map(a => (/[\s*;]/.test(a) ? JSON.stringify(a) : a)).join(' ');
  if (DRY) { console.log('  [dry-run] ' + pretty); return ''; }
  const r = spawnSync(bin, argv, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: USE_SHELL,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit'
  });
  if (r.error) { console.error('could not run: ' + pretty + '\n' + r.error.message); process.exit(1); }
  if (r.status !== 0 && !allowFail) {
    if (capture && r.stderr) console.error(r.stderr.trim());
    console.error('\nfailed: ' + pretty);
    process.exit(r.status || 1);
  }
  return capture ? (r.stdout || '').trim() : '';
}

const aws = (argv, opts) => run('aws', argv.concat(['--region', REGION]), opts);

// ---- 1. gate on the content validators -------------------------------------
if (!flag('--skip-checks')) {
  console.log('checking content before publishing');
  ['check-content.js', 'check-locales.js', 'check-svg-fit.js'].forEach(script => {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', script)], { cwd: ROOT, encoding: 'utf8' });
    const ok = r.status === 0;
    console.log('  ' + (ok ? 'ok  ' : 'FAIL') + '  ' + script);
    if (!ok) {
      console.error((r.stdout || '') + (r.stderr || ''));
      console.error('refusing to deploy: ' + script + ' failed. Fix it, or pass --skip-checks if you really mean to.');
      process.exit(1);
    }
  });
}

// ---- 2. read the target from the stack --------------------------------------
console.log('\nreading stack ' + STACK + ' in ' + REGION);
const outputsRaw = aws([
  'cloudformation', 'describe-stacks',
  '--stack-name', STACK,
  '--query', 'Stacks[0].Outputs',
  '--output', 'json'
], { capture: true, allowFail: true });

if (!outputsRaw && !DRY) {
  console.error('could not read stack "' + STACK + '". Deploy infra/site.yaml first (see infra/README.md).');
  process.exit(1);
}

let bucket = 'DRY-RUN-BUCKET', distribution = 'DRYRUNDIST', siteUrl = 'https://example.invalid/';
if (outputsRaw) {
  const outputs = {};
  JSON.parse(outputsRaw).forEach(o => { outputs[o.OutputKey] = o.OutputValue; });
  bucket = outputs.BucketName;
  distribution = outputs.DistributionId;
  siteUrl = outputs.SiteUrl;
  if (!bucket || !distribution) {
    console.error('stack is missing BucketName or DistributionId outputs; is it the right stack?');
    process.exit(1);
  }
}
console.log('  bucket       ' + bucket);
console.log('  distribution ' + distribution);

// ---- 3. upload ---------------------------------------------------------------
const files = collectFiles();
const bytes = files.reduce((a, f) => a + fs.statSync(path.join(ROOT, f)).size, 0);
console.log('\npublishing ' + files.length + ' files, ' + Math.round(bytes / 1024) + ' KB');
files.forEach(f => console.log('  ' + f));

const staging = stage(files);
try {
  console.log('\nsyncing site files');
  aws(['s3', 'sync', staging, 's3://' + bucket, '--delete', '--cache-control', ASSET_CACHE]);
} finally {
  fs.rmSync(staging, { recursive: true, force: true });
}

// The AWS CLI guesses content types from the extension. When it guesses wrong
// for .js the browser refuses to execute the file and the page renders blank,
// so pin it explicitly with one server-side copy rather than trusting the guess.
console.log('\npinning content-type on JavaScript');
aws([
  's3', 'cp', 's3://' + bucket + '/', 's3://' + bucket + '/',
  '--recursive', '--exclude', '*', '--include', '*.js',
  '--metadata-directive', 'REPLACE',
  '--content-type', 'text/javascript; charset=utf-8',
  '--cache-control', ASSET_CACHE
]);

console.log('\nuploading index.html with a revalidating cache header');
aws([
  's3', 'cp', 'index.html', 's3://' + bucket + '/index.html',
  '--content-type', 'text/html; charset=utf-8',
  '--cache-control', HTML_CACHE
]);

// ---- 4. invalidate ------------------------------------------------------------
console.log('\ninvalidating the edge cache');
const invRaw = aws([
  'cloudfront', 'create-invalidation',
  '--distribution-id', distribution,
  '--paths', '/*',
  '--query', 'Invalidation.Id',
  '--output', 'text'
], { capture: true });

if (invRaw && !NO_WAIT) {
  console.log('  invalidation ' + invRaw + ', waiting for it to complete');
  aws(['cloudfront', 'wait', 'invalidation-completed', '--distribution-id', distribution, '--id', invRaw]);
}

console.log('\ndeployed: ' + siteUrl);
