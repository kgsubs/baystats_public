import type { Handler } from '@netlify/functions';
import type { TropicalSystem, TropicalOutlookItem } from '../../src/types/briefing';
import { getLocationOrDefault } from '../../src/config/locations';

const NHC_RSS_URL = 'https://www.nhc.noaa.gov/index-at.xml';
const NHC_TWOAT_URL = 'https://www.nhc.noaa.gov/xml/TWOAT.xml';
const NHC_GRAPHICAL_URL = 'https://www.nhc.noaa.gov/gtwo.php?basin=atlc';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  bearing = (bearing + 360) % 360;
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return directions[Math.round(bearing / 22.5) % 16];
}

// Standard Saffir-Simpson thresholds, in knots (National Hurricane Center):
// Category 1 >= 64 kt, Category 2 >= 83 kt, Category 3 >= 96 kt,
// Category 4 >= 113 kt, Category 5 >= 137 kt.
function categorize(windKts: number): string {
  if (windKts >= 137) return 'Category 5 Hurricane';
  if (windKts >= 113) return 'Category 4 Hurricane';
  if (windKts >= 96) return 'Category 3 Hurricane';
  if (windKts >= 83) return 'Category 2 Hurricane';
  if (windKts >= 64) return 'Category 1 Hurricane';
  if (windKts >= 34) return 'Tropical Storm';
  return 'Tropical Depression';
}

interface ParsedNHCFeed {
  systems: TropicalSystem[];
  // True when the feed contained an item that reads as an active storm
  // (by title) but whose position could not be parsed out of its
  // description. That is a parse failure, not evidence the basin is clear.
  hadUnparsedStormItem: boolean;
}

async function parseNHCXml(xmlText: string, origin: { lat: number; lon: number }): Promise<ParsedNHCFeed> {
  const systems: TropicalSystem[] = [];
  let hadUnparsedStormItem = false;
  try {
    const itemRegex = /<item>\s*<title>(.*?)<\/title>\s*<description>(.*?)<\/description>[\s\S]*?<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xmlText)) !== null) {
      const title = match[1] || '';
      const description = match[2] || '';
      if (title.includes('hurricane season runs') || title.includes('Tropical Weather Outlook')) continue;

      const isTropicalSystem = /tropical|hurricane|depression|storm/i.test(title) && !/outlook|discussion/i.test(title);
      if (isTropicalSystem) {
        const posMatch = description.match(/(\d+\.?\d*)°?\s*[Nn]\s+(\d+\.?\d*)°?\s*[Ww]/);
        if (!posMatch) {
          hadUnparsedStormItem = true;
        }
        if (posMatch) {
          const lat = parseFloat(posMatch[1]);
          const lon = -parseFloat(posMatch[2]);
          const distance = calculateDistance(origin.lat, origin.lon, lat, lon);
          if (distance < 800) {
            const windMphMatch = description.match(/(\d+)\s*mph/i);
            const windKtsMatch = description.match(/(\d+)\s*(?:kt|knot)/i);
            let windMph = 0, windKts = 0;
            if (windKtsMatch) { windKts = parseInt(windKtsMatch[1]); windMph = Math.round(windKts / 0.868976); }
            else if (windMphMatch) { windMph = parseInt(windMphMatch[1]); windKts = Math.round(windMph * 0.868976); }

            const category = categorize(windKts);

            const nameMatch = title.match(/(?:Tropical Storm|Hurricane|Tropical Depression)\s+(\w+)/i);
            systems.push({
              name: nameMatch ? nameMatch[1] : 'Unknown',
              category,
              position: `${lat}°N ${Math.abs(lon)}°W`,
              distance,
              bearing: calculateBearing(origin.lat, origin.lon, lat, lon),
              windSpeed: { kts: windKts, mph: windMph },
              movement: 'See NHC advisory',
              pressure: 'See NHC advisory',
              watches: [],
              advisoryUrl: 'https://www.nhc.noaa.gov',
            });
          }
        }
      }
    }
  } catch (error) { console.error('Error parsing NHC XML:', error); }
  return { systems, hadUnparsedStormItem };
}

// Parse TWOAT XML into structured outlook
export async function fetchTropicalOutlook(): Promise<{
  items: TropicalOutlookItem[];
  issuedAt: string;
  forecaster: string;
  additionalInfo: string;
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(NHC_TWOAT_URL, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!response.ok) throw new Error(`TWOAT error: ${response.status}`);
    
    const xmlText = await response.text();
    const descMatch = xmlText.match(/<description>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/description>/is);
    if (!descMatch) return { items: [], issuedAt: '', forecaster: '', additionalInfo: '' };
    
    // Clean up the text
    const text = descMatch[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();
    
    // Extract issued time
    const issuedMatch = text.match(/(\d{3,4})\s*(AM|PM)\s*(EST|EDT|AST|ADT)\s+\w+\s+\w+\s+\d{1,2}\s+\d{4}/i);
    const issuedAt = issuedMatch ? issuedMatch[0] : '';
    
    // Extract forecaster
    const forecasterMatch = text.match(/Forecaster\s+(\w+)/i);
    const forecaster = forecasterMatch ? forecasterMatch[1] : '';
    
    // Extract main content between "For the North Atlantic..." and "$$"
    const mainMatch = text.match(/For the North Atlantic[\s\S]*?(?=\$\$|Forecaster|$)/i);
    const mainText = mainMatch ? mainMatch[0] : text;
    
    // Extract additional info (text after formation statements, before $$)
    // Look for text after the last formation statement
    const additionalMatch = text.match(/(?:Tropical cyclone formation[^$]+?\.)([\s\S]*?)(?=\$\$|Forecaster|$)/i);
    let additionalInfo = '';
    if (additionalMatch && additionalMatch[1]) {
      additionalInfo = additionalMatch[1]
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    // Parse formation statements for each area (Atlantic and Caribbean only)
    const items: TropicalOutlookItem[] = [];
    
    // Split by common area markers - Atlantic, Caribbean, and Gulf of Mexico for Rodney Bay
    const areas = [
      { name: 'North Atlantic', pattern: /North Atlantic[\s\S]*?(?=Caribbean|Gulf of Mexico|$)/i },
      { name: 'Caribbean Sea', pattern: /Caribbean[\s\S]*?(?=Gulf of Mexico|$)/i },
      { name: 'Gulf of Mexico', pattern: /Gulf of Mexico[\s\S]*/i },
    ];
    
    for (const area of areas) {
      const match = mainText.match(area.pattern);
      if (match) {
        const areaText = match[0];
        // Extract formation statement. If the text doesn't contain a
        // statement this regex can parse, skip the area rather than
        // asserting "not expected": NHC's actual text may say something
        // else entirely, and a fabricated all-clear is worse than a gap.
        const formationMatch = areaText.match(/Tropical cyclone formation[^.]*(?:\.\s*[^.]*formation[^.]*)?\./i);
        if (!formationMatch) {
          continue;
        }
        const description = formationMatch[0].trim();

        // Extract chances if present
        const chanceMatch = areaText.match(/(\d+|near\s*0)\s*percent/i);
        const chance = chanceMatch ? chanceMatch[1].replace(/near/i, '').trim() : '0';

        items.push({
          area: area.name,
          description,
          chance48h: `${chance}%`,
          chance5day: `${chance}%`,
        });
      }
    }
    
    // If no areas parsed, use the whole text
    if (items.length === 0) {
      const formationMatch = mainText.match(/Tropical cyclone formation[^.]*\./i);
      items.push({
        area: 'Atlantic Basin',
        description: formationMatch ? formationMatch[0].trim() : mainText.substring(0, 200),
        chance48h: '0%',
        chance5day: '0%',
      });
    }
    
    return { items, issuedAt, forecaster, additionalInfo };
  } catch (error) {
    console.error('TWOAT fetch error:', error);
    return { items: [], issuedAt: '', forecaster: '', additionalInfo: '' };
  }
}

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=1800',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const locationSlug = event.queryStringParameters?.location || 'rodney-bay';
  const location = getLocationOrDefault(locationSlug);
  const origin = { lat: location.coordinates.lat, lon: location.coordinates.lon };

  try {
    const rssController = new AbortController();
    const rssTimeout = setTimeout(() => rssController.abort(), 8000);
    const [rssResponse, outlookData] = await Promise.all([
      fetch(NHC_RSS_URL, { headers: { 'User-Agent': 'BayStats/1.0' }, signal: rssController.signal }),
      fetchTropicalOutlook(),
    ]);
    clearTimeout(rssTimeout);

    if (!rssResponse.ok) throw new Error(`NHC feed error: ${rssResponse.status}`);

    const xmlText = await rssResponse.text();
    const { systems: activeSystems, hadUnparsedStormItem } = await parseNHCXml(xmlText, origin);
    activeSystems.sort((a, b) => a.distance - b.distance);

    const now = new Date();
    // The label below says AST; the hour it is computed from has to be
    // read in that time zone too, not the server's own local time.
    const currentHour = Number(
      new Intl.DateTimeFormat('en-US', { timeZone: 'America/St_Lucia', hour: 'numeric', hour12: false }).format(now)
    );
    const updateHours = [3, 9, 15, 21];
    const nextUpdateHour = updateHours.find((h) => h > currentHour) || updateHours[0];
    const nextUpdate = `${nextUpdateHour > 12 ? nextUpdateHour - 12 : nextUpdateHour}:00 ${nextUpdateHour >= 12 ? 'PM' : 'AM'} AST`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        // A storm-titled feed item whose position we could not parse means
        // we cannot confirm the basin is actually clear.
        status: activeSystems.length > 0 ? 'active' : (hadUnparsedStormItem ? 'unavailable' : 'clear'),
        activeSystems,
        outlook: outlookData.items.length > 0 ? outlookData.items : undefined,
        issuedAt: outlookData.issuedAt || undefined,
        forecaster: outlookData.forecaster || undefined,
        additionalInfo: outlookData.additionalInfo || undefined,
        nextUpdate,
        nhcUrl: NHC_GRAPHICAL_URL,
        timestamp: now.toISOString(),
      }),
    };
  } catch (error) {
    // Fail closed: an unreachable or erroring NHC feed is reported as
    // unavailable, never as "clear". Reporting "clear" when the feed
    // failed would be a safety problem for a boating app.
    console.error('Tropical API error:', error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'unavailable',
        activeSystems: [],
        nextUpdate: 'See NHC website',
        nhcUrl: NHC_GRAPHICAL_URL,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
