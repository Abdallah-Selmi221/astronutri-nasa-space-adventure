// NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information) API Client
// Secure open API integration with robust fallback for quiet sun or network limits

export interface SolarStormData {
  activityID: string;
  eventTime: string;
  speedKmS: number;
  flareClass: string;
  eventType: string;
  sourceLocation: string;
  isFallback: boolean;
  summary: string;
}

// Fallback generator when NASA DONKI returns no recent CMEs or fails
export function getFallbackSolarStorm(): SolarStormData {
  const now = new Date();
  const timeString = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  return {
    activityID: `DONKI-CME-${now.getFullYear()}-${Math.floor(Math.random() * 899 + 100)}`,
    eventTime: timeString,
    speedKmS: 1450, // High-speed interplanetary shockwave
    flareClass: 'Class X2.8 Extreme Solar Flare',
    eventType: 'Halo Coronal Mass Ejection (CME)',
    sourceLocation: 'Solar Active Region AR3664',
    isFallback: true,
    summary: 'A fast Earth/Moon-directed Coronal Mass Ejection detected by NASA SOHO/LASCO. High-energy proton flux will impact the lunar surface in 15 minutes!'
  };
}

export async function fetchSolarStormData(): Promise<SolarStormData> {
  // Use 4-second timeout to guarantee game never freezes
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    // Look back 30 days for actual space weather events
    const endDate = new Date().toISOString().split('T')[0];
    const prevDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const url = `https://api.nasa.gov/DONKI/CME?startDate=${prevDate}&endDate=${endDate}&api_key=DEMO_KEY`;

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`NASA DONKI returned HTTP ${response.status}. Using simulation fallback.`);
      return getFallbackSolarStorm();
    }

    const data = await response.json();

    // If quiet sun period (empty array) or invalid format, use fallback
    if (!Array.isArray(data) || data.length === 0) {
      console.info('NASA DONKI: Quiet Sun detected (0 recent CMEs). Loading Class X simulation event.');
      return getFallbackSolarStorm();
    }

    // Extract the most recent real CME event
    const latestEvent = data[data.length - 1];
    const analysis = latestEvent.cmeAnalyses && latestEvent.cmeAnalyses.length > 0 
      ? latestEvent.cmeAnalyses[0] 
      : null;

    const speed = analysis && typeof analysis.speed === 'number' && analysis.speed > 0
      ? Math.round(analysis.speed)
      : 1250;

    const eventType = analysis && analysis.type 
      ? `${analysis.type} Coronal Mass Ejection` 
      : 'Coronal Mass Ejection';

    return {
      activityID: latestEvent.activityID || `NASA-DONKI-${latestEvent.startTime || 'CME'}`,
      eventTime: latestEvent.startTime || new Date().toISOString(),
      speedKmS: speed,
      flareClass: speed > 1000 ? 'Class X Major Flare' : 'Class M Moderate Flare',
      eventType: eventType,
      sourceLocation: latestEvent.sourceLocation || 'Solar Active Region',
      isFallback: false,
      summary: latestEvent.note || 'Real-time solar coronal mass ejection detected by NASA space weather satellites.'
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('NASA DONKI API fetch failed or timed out. Activating high-reliability fallback.', error);
    return getFallbackSolarStorm();
  }
}
