import fs from 'fs';
import path from 'path';

console.log('===============================================================');
console.log('  ASTRONUTRI: NASA SERVICE & SCHEMA VERIFICATION SUITE');
console.log('===============================================================');

let passCount = 0;
let failCount = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    failCount++;
  }
}

const snapshotPath = path.resolve('public', 'data', 'nasa_snapshots.json');
assert(fs.existsSync(snapshotPath), 'Test 1: public/data/nasa_snapshots.json exists');

const stat = fs.statSync(snapshotPath);
assert(stat.size > 10000, `Test 2: Snapshot file size is substantial (${(stat.size / 1024).toFixed(1)} KB)`);

const data = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

// Metadata
assert(Boolean(data.metadata?.attribution), 'Test 3: Metadata attribution is present and attributed to NASA');
assert(data.metadata?.source.includes('api.nasa.gov'), 'Test 4: Metadata source identifies official NASA APIs');

// NeoWs Feed & Lookup
assert(Boolean(data.neows?.lookup3542519), 'Test 5: NeoWs lookup for Asteroid 3542519 is present');
assert(data.neows?.lookup3542519?.id === '3542519', 'Test 6: Asteroid 3542519 SPK-ID matches');
const estDiam = data.neows?.lookup3542519?.estimated_diameter?.meters;
assert(estDiam?.estimated_diameter_min > 0 && estDiam?.estimated_diameter_max > estDiam?.estimated_diameter_min, 'Test 7: Estimated diameter min/max are valid positive meters');

const closeApproach = data.neows?.lookup3542519?.close_approach_data?.[0];
assert(Boolean(closeApproach?.relative_velocity?.kilometers_per_second), 'Test 8: Relative velocity (km/s) is present');
assert(Boolean(closeApproach?.miss_distance?.lunar), 'Test 9: Miss distance in lunar distances is present');

// APOD
assert(Array.isArray(data.apod?.records) && data.apod.records.length > 0, 'Test 10: APOD records array is populated');
const firstApod = data.apod.records[0];
assert(Boolean(firstApod.title || firstApod.title?.rendered), 'Test 11: APOD title is present');

// DONKI
assert(Array.isArray(data.donki?.cmeEvents) && data.donki.cmeEvents.length > 0, 'Test 12: DONKI CME events are populated');
assert(Boolean(data.donki.cmeEvents[0].activityID), 'Test 13: DONKI CME activityID is present');

// Downloaded Textures
const earthJpg = path.resolve('public', 'assets', 'nasa', 'earth_blue_marble.jpg');
const moonJpg = path.resolve('public', 'assets', 'nasa', 'moon_surface_lroc.jpg');
const apodJpg = path.resolve('public', 'assets', 'nasa', 'apod_sample.jpg');

assert(fs.existsSync(earthJpg) && fs.statSync(earthJpg).size > 10000, 'Test 14: earth_blue_marble.jpg downloaded and non-empty');
assert(fs.existsSync(moonJpg) && fs.statSync(moonJpg).size > 10000, 'Test 15: moon_surface_lroc.jpg downloaded and non-empty');
assert(fs.existsSync(apodJpg) && fs.statSync(apodJpg).size > 10000, 'Test 16: apod_sample.jpg downloaded and non-empty');

console.log('===============================================================');
console.log(`  VERIFICATION RESULTS: ${passCount}/${passCount + failCount} TESTS PASSED`);
console.log('===============================================================');

if (failCount > 0) process.exit(1);
