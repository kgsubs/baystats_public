// Marina Scrape Function - Scrape marinelink.com and parse with Claude API
import type { Handler } from '@netlify/functions';
import { verifyJwt, getSupabaseAdmin } from '../../src/lib/auth';

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '';


const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// Extract marina slug from marinelink URL
function extractSlugFromUrl(url: string): string | null {
  const match = url.match(/\/ports\/port\/(.+)$/);
  return match ? match[1] : null;
}

// Extract marina name from page content
function extractNameFromContent(content: string): string {
  // Try to find the main heading
  const h1Match = content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) return h1Match[1].trim();
  
  // Fallback: look for "Port in" pattern
  const portMatch = content.match(/Port in ([^.]+)/);
  if (portMatch) return portMatch[1].trim();
  
  return 'Unknown Marina';
}

// Parse marina data using Claude API
async function parseWithClaude(rawContent: string, url: string): Promise<{
  success: boolean;
  data?: Record<string, any>;
  error?: string;
}> {
  try {
    const prompt = `You are a marina data extraction assistant. Extract the following information from the provided marina page content from marinelink.com.

Return ONLY a JSON object with these exact keys:
{
  "name": "Marina name",
  "location": "City/Region",
  "address": "Full address",
  "phone": "Phone number",
  "website": "Website URL",
  "latitude": "latitude as number or null",
  "longitude": "longitude as number or null",
  "boat_size_capacity": "What size boats can dock here",
  "total_berths": "number of berths as integer or null",
  "mooring_ball_availability": "Mooring ball info or 'Not specified'",
  "restrooms_showers": "Restroom/shower availability",
  "water_depth": "Average water depth at entrance",
  "fuel_dock": "Fuel dock details",
  "water_availability": "Water availability info",
  "power_connections": "Power connection details",
  "maintenance_repair": "Maintenance and repair services",
  "chandlery": "Chandlery info",
  "wifi": "WiFi availability",
  "amenities": ["array", "of", "additional", "amenities"],
  "clearance_notes": "Any notes about check-in/check-out procedures, fees, or special requirements",
  "customs_hours_structured": {
    "mon_fri": { "open": "08:00", "close": "16:00" },
    "sat": { "open": "08:00", "close": "12:00" },
    "sun": { "open": "08:00", "close": "12:00" }
  },
  "immigration_hours_structured": {
    "mon_fri": { "open": "08:00", "close": "16:00" },
    "sat": { "open": "08:00", "close": "12:00" },
    "sun": { "open": "08:00", "close": "12:00" }
  }
}

For office hours (customs_hours_structured and immigration_hours_structured):
- Always include mon_fri with open and close times in 24-hour format (e.g., "08:00", "16:00")
- Include sat ONLY if Saturday hours are different from closed
- Include sun ONLY if Sunday hours are different from closed
- If no weekend hours, only include mon_fri

For any field not found in the content, use "Not specified" or null.
Be thorough and extract all relevant details from the specifications, description sections, and any port authority/clearance information.

URL: ${url}

Content to parse:
${rawContent.substring(0, 15000)}`; // Limit content length

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20251001', // Use latest Claude model
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${error}`);
    }

    const result = await response.json();
    const parsedContent = result.content?.[0]?.text || '';
    
    // Extract JSON from response
    const jsonMatch = parsedContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    const parsedData = JSON.parse(jsonMatch[0]);
    
    return { success: true, data: parsedData };
  } catch (error) {
    console.error('Claude parsing error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Scrape marinelink.com page
async function scrapeMarinaPage(url: string): Promise<{
  success: boolean;
  content?: string;
  error?: string;
}> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BayStats/1.0; +https://rodneybaydaily.com)'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Extract main content - remove scripts, styles, etc.
    const cleanContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
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

async function verifyAdminFromCookie(event: any): Promise<{ isAdmin: boolean; userId?: string }> {
  const authResult = await verifyJwt(event.headers.cookie)
  if ('error' in authResult) return { isAdmin: false }

  const { data: adminData } = await getSupabaseAdmin()
    .from('admin_users')
    .select('user_id')
    .eq('user_id', authResult.user.id)
    .single()

  return { isAdmin: !!adminData, userId: authResult.user.id }
}

// Main handler
export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  // Check admin authentication
  const { isAdmin, userId } = await verifyAdminFromCookie(event);
  
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

      // Validate marinelink URL
      if (!url.includes('ports.marinelink.com')) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Only ports.marinelink.com URLs are supported' })
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

      // Scrape the page
      console.log(`Scraping ${url}...`);
      const scrapeResult = await scrapeMarinaPage(url);
      
      if (!scrapeResult.success || !scrapeResult.content) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Failed to scrape page', 
            details: scrapeResult.error 
          })
        };
      }

      // Parse with Claude
      console.log('Parsing with Claude API...');
      const parseResult = await parseWithClaude(scrapeResult.content, url);

      if (!parseResult.success || !parseResult.data) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Failed to parse content', 
            details: parseResult.error 
          })
        };
      }

      const parsedData = parseResult.data;

      // Prepare data for database
      // Structured office hours with weekday/weekend breakdown
      const defaultHours = { mon_fri: { open: '08:00', close: '16:00' } };
      const customsStructured = parsedData.customs_hours_structured || defaultHours;
      const immigrationStructured = parsedData.immigration_hours_structured || defaultHours;
      
      // Note: We don't overwrite structured hours if manual overrides exist
      const marinaData = {
        name: parsedData.name || extractNameFromContent(scrapeResult.content),
        slug,
        location: parsedData.location || 'St. Lucia',
        address: parsedData.address || null,
        phone: parsedData.phone || null,
        website: parsedData.website || null,
        website_label: parsedData.website ? new URL(parsedData.website).hostname.replace(/^www\./, '') : null,
        latitude: parsedData.latitude ? parseFloat(parsedData.latitude) : null,
        longitude: parsedData.longitude ? parseFloat(parsedData.longitude) : null,
        boat_size_capacity: parsedData.boat_size_capacity || 'Not specified',
        total_berths: parsedData.total_berths ? parseInt(parsedData.total_berths) : null,
        mooring_ball_availability: parsedData.mooring_ball_availability || 'Not specified',
        restrooms_showers: parsedData.restrooms_showers || 'Not specified',
        water_depth: parsedData.water_depth || 'Not specified',
        fuel_dock: parsedData.fuel_dock || 'Not specified',
        water_availability: parsedData.water_availability || 'Not specified',
        power_connections: parsedData.power_connections || 'Not specified',
        maintenance_repair: parsedData.maintenance_repair || 'Not specified',
        chandlery: parsedData.chandlery || 'Not specified',
        wifi: parsedData.wifi || 'Not specified',
        amenities: parsedData.amenities || [],
        // Structured office hours
        customs_hours_structured: customsStructured,
        immigration_hours_structured: immigrationStructured,
        // Legacy text format for backwards compatibility
        customs_hours: parsedData.customs_hours || `Mon-Fri ${customsStructured.mon_fri.open}-${customsStructured.mon_fri.close}`,
        immigration_hours: parsedData.immigration_hours || `Mon-Fri ${immigrationStructured.mon_fri.open}-${immigrationStructured.mon_fri.close}`,
        clearance_notes: parsedData.clearance_notes || null,
        office_hours_scraped_at: new Date().toISOString(),
        marinelink_url: url,
        marinelink_raw_content: scrapeResult.content,
        last_scraped_at: new Date().toISOString(),
        status: 'pending_review',
        scraped_data: parsedData
      };

      // Save to database if requested
      let savedId = null;
      if (save) {
        const { data: upsertData, error: upsertError } = await getSupabaseAdmin()
          .from('marina_profiles')
          .upsert(marinaData, { onConflict: 'slug' })
          .select('id')
          .single();

        if (upsertError) {
          console.error('Database error:', upsertError);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
              error: 'Failed to save to database', 
              details: upsertError.message 
            })
          };
        }

        savedId = upsertData?.id;
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: save ? 'Marina data scraped and saved for review' : 'Marina data parsed (not saved)',
          id: savedId,
          slug,
          data: marinaData,
          review_url: savedId ? `/manage/marinalistings/${savedId}/review` : null
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
