import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const apiFile = path.join(repoRoot, 'server/src/routes/api.js');
const text = fs.readFileSync(apiFile, 'utf8');
const routePattern = /router\.(get|post|put|patch|delete)\('([^']+)'\s*,([^\n]+)/g;

const groups = [
  ['account', /^\/(?:health|public-config|register|login|logout|me)\b/],
  ['asset-preferences', /^\/taoyuan\/.*preferences/],
  ['save', /^\/taoyuan\/save(?:\/|$)/],
  ['announcements', /^\/taoyuan\/announcements(?:\/|$)/],
  ['gameplay-log', /^\/taoyuan\/logs\/gameplay(?:\/|$)/],
  ['mail', /^\/taoyuan\/mail(?:\/|$)/],
  ['hall', /^\/taoyuan\/hall(?:\/|$)/],
  ['online-profile', /^\/taoyuan\/online\/profile(?:\/|$)/],
  ['social', /^\/taoyuan\/online\/social(?:\/|$)/],
  ['manor', /^\/taoyuan\/online\/manor(?:\/|$)/],
  ['cohabitation', /^\/taoyuan\/online\/cohabitation(?:\/|$)/],
  ['festival-room', /^\/taoyuan\/online\/festival(?:\/|$)/],
  ['expedition-room', /^\/taoyuan\/online\/expedition(?:\/|$)/],
  ['orders', /^\/taoyuan\/online\/orders(?:\/|$)/],
  ['world-events', /^\/taoyuan\/online\/world-events(?:\/|$)/],
  ['society', /^\/taoyuan\/online\/societies(?:\/|$)/],
  ['chat', /^\/taoyuan\/online\/chat(?:\/|$)/],
  ['exchange-station', /^\/taoyuan\/exchange-station(?:\/|$)/],
  ['quota', /^\/taoyuan\/quota(?:\/|$)/],
  ['ai', /^\/taoyuan\/ai(?:\/|$)/],
  ['admin', /^\/admin(?:\/|$)/],
  ['official-control', /^\/official-control(?:\/|$)/],
];

function classify(route) {
  for (const [name, matcher] of groups) {
    if (matcher.test(route)) return name;
  }
  return 'misc';
}

function authFromTail(tail) {
  if (/adminAuth|userAdminAuth/.test(tail)) return 'admin';
  if (/loginRequired/.test(tail)) return 'login';
  return 'public';
}

function csvCell(value) {
  const textValue = String(value ?? '');
  return /[",\n]/.test(textValue) ? `"${textValue.replace(/"/g, '""')}"` : textValue;
}

const rows = [];
let match;
while ((match = routePattern.exec(text))) {
  const [, rawMethod, route, tail] = match;
  const release = /createOnlineReleaseGuard\('([^']+)'\)/.exec(tail)?.[1] || '';
  rows.push({
    group: classify(route),
    method: rawMethod.toUpperCase(),
    path: `/api${route}`,
    auth: authFromTail(tail),
    csrf: /signRequired/.test(tail) ? 'yes' : 'no',
    release_guard: release,
  });
}

const format = process.argv.includes('--markdown') ? 'markdown' : 'csv';
const includeAdmin = process.argv.includes('--include-admin');
const filteredRows = includeAdmin ? rows : rows.filter((row) => row.group !== 'admin');

if (format === 'markdown') {
  console.log('| Group | Method | Path | Auth | CSRF | Release guard |');
  console.log('| --- | --- | --- | --- | --- | --- |');
  for (const row of filteredRows) {
    console.log(`| ${row.group} | ${row.method} | \`${row.path}\` | ${row.auth} | ${row.csrf} | ${row.release_guard || '-'} |`);
  }
} else {
  console.log(['group', 'method', 'path', 'auth', 'csrf', 'release_guard'].join(','));
  for (const row of filteredRows) {
    console.log([row.group, row.method, row.path, row.auth, row.csrf, row.release_guard].map(csvCell).join(','));
  }
}

const counts = filteredRows.reduce((record, row) => {
  record[row.group] = (record[row.group] || 0) + 1;
  return record;
}, {});

console.error(JSON.stringify({
  route_count: filteredRows.length,
  total_express_routes: rows.length,
  groups: counts,
}, null, 2));
