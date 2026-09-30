// Marina Scrape Function - scrape ports.marinelink.com and extract with Gemini
import type { Handler } from '@netlify/functions';
import { getSupabaseAdmin, findSessionByAccessToken } from '../../src/lib/auth';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const ALLOWED_HOSTNAME = 'ports.marinelink.com';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

interface OfficeHours {
  mon_fri: { open: string; close: string };
  sat?: { open: string; close: string };
  sun?: { open: string; close: string };
}

// The 22 fields the extraction is allowed to write. Kept in sync with
// marina_profiles' scraped-data columns (supabase/schema.sql).
interface MarinaScrapedFields {
  name: string;
  location: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  boat_size_capacity: string;
  total_berths: number | null;
  mooring_ball_availability: string;
  restrooms_showers: string;
  water_depth: string;
  fuel_dock: string;
  water_availability: string;
  power_connections: string;
  maintenance_repair: string;
  chandlery: string;
  wifi: string;
  amenities: string[];
  clearance_notes: string | null;
  customs_hours_structured: OfficeHours | null;
  immigration_hours_structured: OfficeHours | null;
}

const officeHoursJsonSchema = {
  type: 'object',
  properties: {
    mon_fri: {
      type: 'object',
      properties: { open: { type: 'string' }, close: { type: 'string' } },
      required: ['open', 'close'],
    },
    sat: {
      type: 'object',
      properties: { open: { type: 'string' }, close: { type: 'string' } },
      required: ['open', 'close'],
    },
    sun: {
      type: 'object',
      properties: { open: { type: 'string' }, close: { type: 'string' } },
      required: ['open', 'close'],
    },
  },
  required: ['mon_fri'],
};

// The 22-field extraction schema, enforced by the provider via
// generationConfig.responseJsonSchema (see parseWithGemini). Gemini's
// structured-output mode supports a subset of JSON Schema, including
// `type: [..., "null"]` for nullable fields (verified 2026-09-29,
// https://ai.google.dev/gemini-api/docs/generate-content/structured-output,
// "JSON schema support").
const marinaJsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Marina name' },
    location: { type: 'string', description: 'City/Region' },
    address: { type: ['string', 'null'], description: 'Full address' },
    phone: { type: ['string', 'null'], description: 'Phone number' },
    website: { type: ['string', 'null'], description: 'Website URL' },
    latitude: { type: ['number', 'null'] },
    longitude: { type: ['number', 'null'] },
    boat_size_capacity: { type: 'string', description: "What size boats can dock here, or 'Not specified'" },
    total_berths: { type: ['integer', 'null'] },
    mooring_ball_availability: { type: 'string', description: "Mooring ball info, or 'Not specified'" },
    restrooms_showers: { type: 'string', description: "Restroom/shower availability, or 'Not specified'" },
    water_depth: { type: 'string', description: "Average water depth at entrance, or 'Not specified'" },
    fuel_dock: { type: 'string', description: "Fuel dock details, or 'Not specified'" },
    water_availability: { type: 'string', description: "Water availability info, or 'Not specified'" },
    power_connections: { type: 'string', description: "Power connection details, or 'Not specified'" },
    maintenance_repair: { type: 'string', description: "Maintenance and repair services, or 'Not specified'" },
    chandlery: { type: 'string', description: "Chandlery info, or 'Not specified'" },
    wifi: { type: 'string', description: "WiFi availability, or 'Not specified'" },
    amenities: { type: 'array', items: { type: 'string' } },
    clearance_notes: { type: ['string', 'null'], description: 'Check-in/check-out procedures, fees, or special requirements' },
    customs_hours_structured: officeHoursJsonSchema,
    immigration_hours_structured: officeHoursJsonSchema,
  },
  required: ['name', 'location'],
};

// Extract marina slug from marinelink URL
function extractSlugFromUrl(url: string): string | null {
  const match = url.match(/\/ports\/port\/(.+)$/);
  return match ? match[1] : null;
}

// Extract marina name from page content
function extractNameFromContent(content: string): string {
  const h1Match = content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) return h1Match[1].trim();

  const portMatch = content.match(/Port in ([^.]+)/);
  if (portMatch) return portMatch[1].trim();

  return 'Unknown Marina';
}

function isOfficeHours(v: any): v is OfficeHours {
  return !!v && typeof v === 'object' && typeof v.mon_fri === 'object'
    && typeof v.mon_fri.open === 'string' && typeof v.mon_fri.close === 'string';
}

// Server-side validation of the extraction output. The provider's schema
// enforcement guarantees syntactically valid JSON, not semantically correct
// values, so every field is re-checked here. A field of the wrong type is
// zeroed to a safe default rather than written; the whole scrape is
// rejected only when the two required fields are missing.
export function sanitizeMarinaData(raw: any): { data: MarinaScrapedFields } | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'Extraction returned no data' };
  if (typeof raw.name !== 'string' || !raw.name.trim()) return { error: 'Extraction did not return a marina name' };
  if (typeof raw.location !== 'string' || !raw.location.trim()) return { error: 'Extraction did not return a location' };

  const str = (v: any, fallback: string) => (typeof v === 'string' && v.trim() ? v : fallback);
  const strOrNull = (v: any) => (typeof v === 'string' && v.trim() ? v : null);
  const numOrNull = (v: any) => {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
    return Number.isFinite(n) ? n : null;
  };
  const intOrNull = (v: any) => {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? parseInt(v, 10) : NaN;
    return Number.isFinite(n) ? Math.trunc(n) : null;
  };
  const strArray = (v: any) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
  // Hours the extraction did not find become null, not a guessed office
  // schedule; a fabricated "08:00-16:00" would read as a real fact.
  const hours = (v: any) => (isOfficeHours(v) ? v : null);

  return {
    data: {
      name: raw.name.trim(),
      location: raw.location.trim(),
      address: strOrNull(raw.address),
      phone: strOrNull(raw.phone),
      website: strOrNull(raw.website),
      latitude: numOrNull(raw.latitude),
      longitude: numOrNull(raw.longitude),
      boat_size_capacity: str(raw.boat_size_capacity, 'Not specified'),
      total_berths: intOrNull(raw.total_berths),
      mooring_ball_availability: str(raw.mooring_ball_availability, 'Not specified'),
      restrooms_showers: str(raw.restrooms_showers, 'Not specified'),
      water_depth: str(raw.water_depth, 'Not specified'),
      fuel_dock: str(raw.fuel_dock, 'Not specified'),
      water_availability: str(raw.water_availability, 'Not specified'),
      power_connections: str(raw.power_connections, 'Not specified'),
      maintenance_repair: str(raw.maintenance_repair, 'Not specified'),
      chandlery: str(raw.chandlery, 'Not specified'),
      wifi: str(raw.wifi, 'Not specified'),
      amenities: strArray(raw.amenities),
      clearance_notes: strOrNull(raw.clearance_notes),
      customs_hours_structured: hours(raw.customs_hours_structured),
      immigration_hours_structured: hours(raw.immigration_hours_structured),
    },
  };
}

// Parse marina data using Gemini, with schema-enforced JSON output.
async function parseWithGemini(rawContent: string, url: string): Promise<{
  success: boolean;
  data?: Record<string, any>;
  error?: string;
}> {
  try {
    const prompt = `You are a marina data extraction assistant. Extract information about this marina from the provided page content from marinelink.com.

For office hours (customs_hours_structured and immigration_hours_structured):
- Always include mon_fri with open and close times in 24-hour format (e.g., "08:00", "16:00")
- Include sat ONLY if Saturday hours are different from closed
- Include sun ONLY if Sunday hours are different from closed
- If no weekend hours, only include mon_fri

For any text field not found in the content, use "Not specified". For any number field not found, use null.
Be thorough and extract all relevant details from the specifications, description sections, and any port authority/clearance information.

URL: ${url}

Content to parse:
${rawContent.substring(0, 15000)}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          // Verified 2026-09-29 with a live call: v1beta generateContent accepts
          // responseMimeType plus responseJsonSchema and rejects responseFormat.
          generationConfig: {
            responseMimeType: 'application/json',
            responseJsonSchema: marinaJsonSchema,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${error}`);
    }

    const result = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const parsedText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!parsedText) {
      throw new Error('No content in Gemini response');
    }

    const parsedData = JSON.parse(parsedText);

    return { success: true, data: parsedData };
  } catch (error) {
    console.error('Gemini parsing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Scrape a marinelink.com page. Requires https and the exact allowed
// hostname, and refuses redirects rather than following them.
async function scrapeMarinaPage(url: string): Promise<{
  success: boolean;
  content?: string;
  error?: string;
}> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { success: false, error: 'Malformed URL' };
  }

  if (parsed.protocol !== 'https:') {
    return { success: false, error: 'Only https URLs are supported' };
  }
  if (parsed.hostname !== ALLOWED_HOSTNAME) {
    return { success: false, error: `Only ${ALLOWED_HOSTNAME} URLs are supported` };
  }

  try {
    const response = await fetch(parsed.toString(), {
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BayStats/1.0)'
      }
    });

    if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
      throw new Error('Refusing to follow a redirect');
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    const cleanContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return { success: true, content: cleanContent };
  } catch (error) {
    console.error('Scrape error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Admin check: same pattern the other admin endpoints use (session cookie
// -> sessions -> users -> admin_users by email). The previous check here
// compared admin_users.user_id, which references auth.users(id), against
// the app's own users.id -- two different id spaces that never match. See
// netlify/functions/admin-marinas.ts's verifyAdmin.
async function verifyAdminFromCookie(event: any): Promise<{ isAdmin: boolean; userId?: string }> {
  const cookieHeader = event.headers?.cookie || event.headers?.Cookie;
  const accessToken = cookieHeader?.split(';')
    .map((c: string) => c.trim().split('='))
    .find(([name]: string[]) => name === 'sb-access-token')?.[1];

  if (!accessToken) return { isAdmin: false };

  const supabaseAdmin = getSupabaseAdmin();

  const session = await findSessionByAccessToken(accessToken);

  if (!session) return { isAdmin: false };

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('id', session.user_id)
    .single();

  if (!user) return { isAdmin: false };

  const { data: adminRecord } = await supabaseAdmin
    .from('admin_users')
    .select('id')
    .eq('email', user.email)
    .single();

  return { isAdmin: !!adminRecord, userId: user.id };
}

// Main handler
export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  const { isAdmin } = await verifyAdminFromCookie(event);

  if (!isAdmin) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Admin access required' })
    };
  }

  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { url, save = true } = body;

      if (!url) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'URL is required' })
        };
      }

      const slug = extractSlugFromUrl(url);
      if (!slug) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Could not extract marina slug from URL' })
        };
      }

      console.log(`Scraping ${url}...`);
      const scrapeResult = await scrapeMarinaPage(url);

      if (!scrapeResult.success || !scrapeResult.content) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Failed to scrape page',
            details: scrapeResult.error
          })
        };
      }

      console.log('Parsing with Gemini...');
      const parseResult = await parseWithGemini(scrapeResult.content, url);

      if (!parseResult.success || !parseResult.data) {
        return {
          statusCode: 502,
          headers,
          body: JSON.stringify({
            error: 'Failed to parse content',
            details: parseResult.error
          })
        };
      }

      const sanitized = sanitizeMarinaData(parseResult.data);
      if ('error' in sanitized) {
        return {
          statusCode: 502,
          headers,
          body: JSON.stringify({ error: 'Extraction failed validation', details: sanitized.error })
        };
      }
      const parsedData = sanitized.data;

      const website = parsedData.website;
      let websiteLabel: string | null = null;
      if (website && website !== 'Not specified') {
        try {
          websiteLabel = new URL(website).hostname.replace(/^www\./, '');
        } catch {
          websiteLabel = null;
        }
      }

      const marinaData = {
        name: parsedData.name || extractNameFromContent(scrapeResult.content),
        slug,
        location: parsedData.location || 'St. Lucia',
        address: parsedData.address,
        phone: parsedData.phone,
        website: website,
        website_label: websiteLabel,
        latitude: parsedData.latitude,
        longitude: parsedData.longitude,
        boat_size_capacity: parsedData.boat_size_capacity,
        total_berths: parsedData.total_berths,
        mooring_ball_availability: parsedData.mooring_ball_availability,
        restrooms_showers: parsedData.restrooms_showers,
        water_depth: parsedData.water_depth,
        fuel_dock: parsedData.fuel_dock,
        water_availability: parsedData.water_availability,
        power_connections: parsedData.power_connections,
        maintenance_repair: parsedData.maintenance_repair,
        chandlery: parsedData.chandlery,
        wifi: parsedData.wifi,
        amenities: parsedData.amenities,
        customs_hours_structured: parsedData.customs_hours_structured,
        immigration_hours_structured: parsedData.immigration_hours_structured,
        customs_hours: parsedData.customs_hours_structured
          ? `Mon-Fri ${parsedData.customs_hours_structured.mon_fri.open}-${parsedData.customs_hours_structured.mon_fri.close}`
          : null,
        immigration_hours: parsedData.immigration_hours_structured
          ? `Mon-Fri ${parsedData.immigration_hours_structured.mon_fri.open}-${parsedData.immigration_hours_structured.mon_fri.close}`
          : null,
        clearance_notes: parsedData.clearance_notes,
        office_hours_scraped_at: new Date().toISOString(),
        marinelink_url: url,
        marinelink_raw_content: scrapeResult.content,
        last_scraped_at: new Date().toISOString(),
        scraped_data: parsedData
      };

      let savedId: string | null = null;
      let status = 'pending_review';

      if (save) {
        const { data: existing } = await getSupabaseAdmin()
          .from('marina_profiles')
          .select('id, status')
          .eq('slug', slug)
          .maybeSingle();

        if (existing && existing.status === 'approved') {
          // A published marina keeps its published values and its
          // admin's edits. Re-scraping stages the new data instead of
          // overwriting the live fields or the review status, so a
          // re-scrape can never silently wipe an admin's edits or pull
          // an approved marina off the site.
          const { error: updateError } = await getSupabaseAdmin()
            .from('marina_profiles')
            .update({
              scraped_data: parsedData,
              marinelink_url: url,
              marinelink_raw_content: scrapeResult.content,
              last_scraped_at: marinaData.last_scraped_at,
            })
            .eq('id', existing.id);

          if (updateError) {
            console.error('Database error:', updateError);
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: 'Failed to save to database', details: updateError.message })
            };
          }

          savedId = existing.id;
          status = 'approved';
        } else {
          const { data: upsertData, error: upsertError } = await getSupabaseAdmin()
            .from('marina_profiles')
            .upsert({ ...marinaData, status: 'pending_review' }, { onConflict: 'slug' })
            .select('id')
            .single();

          if (upsertError) {
            console.error('Database error:', upsertError);
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: 'Failed to save to database', details: upsertError.message })
            };
          }

          savedId = upsertData?.id ?? null;
        }
      }

      // The raw scraped page text and the internal status are not returned
      // to the caller; the review UI reads them from the record itself.
      const { marinelink_raw_content, ...responseData } = marinaData;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: status === 'approved'
            ? 'Marina re-scraped; staged for review, published data unchanged'
            : (save ? 'Marina data scraped and saved for review' : 'Marina data parsed (not saved)'),
          id: savedId,
          slug,
          data: responseData,
          // There is no per-marina review sub-page; /manage/marinalistings
          // is the real, existing admin route.
          review_url: savedId ? '/manage/marinalistings' : null
        })
      };

    } catch (error) {
      console.error('Handler error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};
