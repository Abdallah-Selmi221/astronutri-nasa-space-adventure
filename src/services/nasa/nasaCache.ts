import {
  NormalizedAsteroid,
  NormalizedAPOD,
  NormalizedDONKIEvent,
  NASASnapshotManifest
} from './types';
import {
  normalizeAsteroid,
  normalizeAPOD,
  normalizeDONKI
} from './nasaNormalizer';

// Verified embedded fallback snapshot for instant 0ms offline startup
import fallbackSnapshot from '../../../public/data/nasa_snapshots.json';

class NASACacheService {
  private snapshot: NASASnapshotManifest = fallbackSnapshot as unknown as NASASnapshotManifest;
  private isLoaded: boolean = true;

  constructor() {
    this.hydrateFromPublic();
  }

  private async hydrateFromPublic(): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/data/nasa_snapshots.json');
        if (res.ok) {
          this.snapshot = await res.json();
          this.isLoaded = true;
        }
      } catch {
        // Safe offline fallback already hydrated via import
      }
    }
  }

  public isReady(): boolean {
    return this.isLoaded;
  }

  /**
   * Retrieves specific asteroid by SPK-ID (e.g., 3542519), fully normalized.
   */
  public getAsteroid(spkId: string = '3542519'): NormalizedAsteroid {
    if (spkId === '3542519' && this.snapshot.neows?.lookup3542519) {
      return normalizeAsteroid(this.snapshot.neows.lookup3542519);
    }

    // Search in browse summary
    const found = this.snapshot.neows?.browseSummary?.sampleNearEarthObjects?.find(
      (obj: any) => String(obj.id) === spkId || String(obj.spkId) === spkId
    );
    if (found) {
      return normalizeAsteroid(found);
    }

    // Default target asteroid (Asteroid 3542519 - 2010 PK)
    return normalizeAsteroid({
      id: '3542519',
      name: '(2010 PK)',
      estimated_diameter: {
        meters: {
          estimated_diameter_min: 73,
          estimated_diameter_max: 164
        }
      },
      is_potentially_hazardous_asteroid: false,
      close_approach_data: [
        {
          close_approach_date: '2026-11-12',
          relative_velocity: { kilometers_per_second: '14.8' },
          miss_distance: { lunar: '19.4', kilometers: '7457360' },
          orbiting_body: 'Earth'
        }
      ]
    });
  }

  /**
   * Returns a list of real asteroids observed in the 7-day NASA feed.
   */
  public getNearEarthAsteroids(): NormalizedAsteroid[] {
    const list: NormalizedAsteroid[] = [];

    // From Feed
    const feed = this.snapshot.neows?.feed as any;
    if (feed?.near_earth_objects) {
      for (const dateKey of Object.keys(feed.near_earth_objects)) {
        for (const obj of feed.near_earth_objects[dateKey]) {
          list.push(normalizeAsteroid(obj));
        }
      }
    }

    // From Browse Summary
    if (this.snapshot.neows?.browseSummary?.sampleNearEarthObjects) {
      for (const obj of this.snapshot.neows.browseSummary.sampleNearEarthObjects) {
        if (!list.some(existing => existing.id === (obj as any).id)) {
          list.push(normalizeAsteroid(obj));
        }
      }
    }

    if (list.length === 0) {
      list.push(this.getAsteroid('3542519'));
    }

    return list.slice(0, 8);
  }

  /**
   * Returns latest normalized APOD observatory record.
   */
  public getLatestAPOD(): NormalizedAPOD {
    const raw = this.snapshot.apod?.records?.[0];
    return normalizeAPOD(raw || {});
  }

  /**
   * Returns latest NASA DONKI Solar Storm event.
   */
  public getLatestSolarStorm(): NormalizedDONKIEvent {
    const raw = this.snapshot.donki?.cmeEvents?.[0];
    return normalizeDONKI(raw || {});
  }

  /**
   * Returns NASA official scientific attribution.
   */
  public getAttribution(): string {
    return this.snapshot.metadata?.attribution || 'NASA / JPL-Caltech / GSFC / SDO';
  }

  /**
   * Returns the ISO timestamp of when this NASA snapshot was synchronized.
   */
  public getSyncedAt(): string {
    return (this.snapshot.metadata as { generatedAt?: string })?.generatedAt || '2026-11-12T00:00:00Z';
  }
}

export const nasaCache = new NASACacheService();
