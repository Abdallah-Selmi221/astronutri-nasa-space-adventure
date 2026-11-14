// scripts/verify_science_links.mjs
// Checks reachability of all 13 official references in src/data/science.ts
// and writes results into src/data/scienceLinkStatus.json so any blocked/non-200
// URL gets tagged "راجع / Review" in ScientificSourcesModal without removing it.
import fs from 'fs';
import path from 'path';

const scienceTs = fs.readFileSync(path.resolve('src/data/science.ts'), 'utf8');
const urlMatches = [...scienceTs.matchAll(/id:\s*'([^']+)'[\s\S]*?url:\s*'([^']+)'/g)];

if (urlMatches.length !== 13) {
  console.warn(`[verify_science_links] Expected 13 sources, parsed ${urlMatches.length}`);
}

const checkUrl = async (url) => {
  const headers = {
    'User-Agent': 'AstroNutri-Science-Verifier/1.0 (+https://nasa.gov)'
  };
  for (const method of ['HEAD', 'GET']) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    try {
      const res = await fetch(url, { method, redirect: 'follow', headers, signal: controller.signal });
      clearTimeout(timer);
      if (method === 'HEAD' && (res.status === 405 || res.status === 501 || res.status === 403)) {
        continue;
      }
      const reachable = res.status >= 200 && res.status < 400;
      return {
        statusCode: res.status,
        reachable,
        reviewRequired: !reachable,
        note: reachable ? 'HTTP OK' : `HTTP ${res.status}`
      };
    } catch (err) {
      clearTimeout(timer);
      if (method === 'HEAD') continue;
      return {
        statusCode: null,
        reachable: false,
        reviewRequired: true,
        note: err?.name === 'AbortError' ? 'Timeout' : String(err?.message || 'Network error').slice(0, 80)
      };
    }
  }
  return { statusCode: null, reachable: false, reviewRequired: true, note: 'Unreachable' };
};

const results = {};
console.log('===============================================================');
console.log('  AstroNutri — Verifying 13 Scientific Reference URLs');
console.log('===============================================================');

for (const [, id, url] of urlMatches) {
  const status = await checkUrl(url);
  results[id] = status;
  const tag = status.reviewRequired ? 'REVIEW (راجع)' : 'OK';
  console.log(`  [${tag}] ${id} -> ${status.note} (${url})`);
}

const outPath = path.resolve('src/data/scienceLinkStatus.json');
fs.writeFileSync(
  outPath,
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      results
    },
    null,
    2
  ) + '\n',
  'utf8'
);

console.log(`Saved verification status to ${outPath}`);
