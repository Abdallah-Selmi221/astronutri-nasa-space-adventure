/**
 * TypeScript Data Models for Official NASA Open APIs
 * Correlated with NeoWs, APOD, DONKI, and NASA Images Library.
 */

export interface EstimatedDiameterMeters {
  min: number;
  max: number;
}

export interface CloseApproachData {
  closeApproachDate: string;
  closeApproachDateFull: string;
  epochDateCloseApproach: number;
  relativeVelocityKmS: number;
  relativeVelocityKmH: number;
  missDistanceAstronomical: number;
  missDistanceLunar: number;
  missDistanceKilometers: number;
  orbitingBody: string;
}

export interface NormalizedAsteroid {
  id: string;
  spkId: string;
  name: string;
  designation?: string;
  absoluteMagnitudeH: number;
  diameterMeters: EstimatedDiameterMeters;
  isPotentiallyHazardous: boolean;
  closeApproachDate: string;
  relativeVelocityKmS: number;
  missDistanceLunar: number;
  missDistanceKm: number;
  orbitingBody: string;
  nasaJplUrl?: string;
  educationalSafetyNoteAr: string;
}

export interface NormalizedAPOD {
  date: string;
  title: string;
  titleAr?: string;
  explanation: string;
  explanationAr?: string;
  mediaType: 'image' | 'video';
  url: string;
  hdUrl?: string;
  copyright?: string;
  localAssetPath?: string;
}

export interface NormalizedDONKIEvent {
  activityId: string;
  startTime: string;
  catalog: string;
  type: 'CME' | 'SEP';
  speedKmS?: number;
  halfAngle?: number;
  note: string;
  educationalLabelAr: string;
  hazardLevel: 'low' | 'moderate' | 'severe';
  recommendedActionAr: string;
}

export interface NASASnapshotManifest {
  metadata: {
    generatedAt: string;
    source: string;
    attribution: string;
    version: string;
  };
  neows: {
    feed: unknown;
    lookup3542519: unknown;
    browseSummary: {
      totalElements: number;
      sampleNearEarthObjects: unknown[];
    } | null;
  };
  apod: {
    records: unknown[];
  };
  donki: {
    cmeEvents: unknown[];
    sepEvents: unknown[];
  };
}
