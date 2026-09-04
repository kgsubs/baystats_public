// Admin Marinas API - CRUD operations for marina profiles
import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { refreshSession } from '../../src/lib/auth';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

const origin = process.env.SITE_URL || 'https://baystats.com';
const headers = {
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

// Extract JWT token from cookie header
function getTokenFromCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'sb-access-token') {
      return value;
    }
  }
  return null;
}

// Extract refresh token from cookie header
function getRefreshTokenFromCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'sb-refresh-token') {
      return value;
    }
  }
  return null;
}

// Verify admin authentication from session cookie
async function verifyAdmin(event: any): Promise<{
  isAdmin: boolean;
  userId?: string;
  error?: string;
  newCookies?: string[];
}> {
  const cookieHeader = event.headers?.cookie || event.headers?.Cookie;
  const accessToken = getTokenFromCookie(cookieHeader);

  if (!accessToken) {
    return { isAdmin: false, error: 'Unauthorized' };
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Look up session by access_token
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .select('user_id, session_end')
    .eq('access_token', accessToken)
    .gt('session_end', new Date().toISOString())
    .single();

  if (sessionError || !session) {
    return { isAdmin: false, error: 'Unauthorized' };
  }

  // Get user email from custom users table
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('id', session.user_id)
    .single();

  if (userError || !user) {
    return { isAdmin: false, error: 'Unauthorized' };
  }

  // Check admin_users table by email
  const { data: adminRecord, error: adminError } = await supabaseAdmin
    .from('admin_users')
    .select('id')
    .eq('email', user.email)
    .single();

  if (adminError || !adminRecord) {
    return { isAdmin: false, error: 'Forbidden' };
  }

  return { isAdmin: true, userId: user.id };
}

// ... rest of the file remains the same

// List all marinas (admin sees all, public sees approved)
async function listMarinas(isAdmin: boolean) {
  const query = getSupabaseAdmin()
    .from('marina_profiles')
    .select('*')
    .order('updated_at', { ascending: false });

  if (!isAdmin) {
    query.in('status', ['approved', 'manual_only']);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

// Get single marina by ID
async function getMarina(id: string, isAdmin: boolean) {
  const query = getSupabaseAdmin()
    .from('marina_profiles')
    .select('*')
    .eq('id', id)
    .single();

  const { data, error } = await query;

  if (error) throw error;
  
  // Check permissions
  if (!isAdmin && !['approved', 'manual_only'].includes(data.status)) {
    throw new Error('Not found');
  }

  return data;
}

// Get marina by slug (public endpoint)
async function getMarinaBySlug(slug: string) {
  const { data, error } = await getSupabaseAdmin()
    .from('marina_profiles')
    .select('*')
    .eq('slug', slug)
    .in('status', ['approved', 'manual_only'])
    .single();

  if (error) throw error;
  return data;
}

// Update marina (admin only)
async function updateMarina(
  id: string, 
  updates: Record<string, any>, 
  userId: string,
  action: 'update' | 'approve' | 'reject'
) {
  const updateData: Record<string, any> = {
    ...updates,
    updated_at: new Date().toISOString()
  };

  if (action === 'approve') {
    updateData.status = 'approved';
    updateData.reviewed_by = userId;
    updateData.reviewed_at = new Date().toISOString();
  } else if (action === 'reject') {
    updateData.status = 'rejected';
    updateData.reviewed_by = userId;
    updateData.reviewed_at = new Date().toISOString();
  }

  // Track manual overrides
  if (action === 'update') {
    const { data: current } = await getSupabaseAdmin()
      .from('marina_profiles')
      .select('scraped_data, manual_overrides, customs_hours_structured, immigration_hours_structured, clearance_notes')
      .eq('id', id)
      .single();

    const manualOverrides = current?.manual_overrides || {};
    const scrapedData = current?.scraped_data || {};
    
    // Structured office hours fields
    const structuredOfficeHoursFields = ['customs_hours_structured', 'immigration_hours_structured'];
    const legacyOfficeHoursFields = ['clearance_notes'];
    let officeHoursChanged = false;

    // Compare updates with scraped data to track overrides
    for (const key of Object.keys(updates)) {
      // Check for structured office hours fields (JSON comparison)
      if (structuredOfficeHoursFields.includes(key)) {
        const scrapedValue = scrapedData[key];
        const newValue = updates[key];
        const currentDbValue = current?.[key as keyof typeof current];
        
        const newValueStr = JSON.stringify(newValue);
        const scrapedValueStr = JSON.stringify(scrapedValue);
        const currentDbValueStr = JSON.stringify(currentDbValue);
        
        // If value is different from what's in scraped_data, it's a manual override
        if (newValueStr !== scrapedValueStr && newValueStr !== currentDbValueStr) {
          manualOverrides[key] = {
            original: scrapedValue || null,
            manual: newValue,
            updated_at: new Date().toISOString()
          };
          officeHoursChanged = true;
        }
        
        // If value matches scraped data, remove any manual override
        if (newValueStr === scrapedValueStr && manualOverrides[key]) {
          delete manualOverrides[key];
          officeHoursChanged = true;
        }
      }
      // Legacy text fields
      else if (legacyOfficeHoursFields.includes(key)) {
        const scrapedValue = scrapedData[key];
        const newValue = updates[key];
        const currentDbValue = current?.[key as keyof typeof current];
        
        if (newValue !== scrapedValue && newValue !== currentDbValue) {
          manualOverrides[key] = {
            original: scrapedValue || null,
            manual: newValue,
            updated_at: new Date().toISOString()
          };
          officeHoursChanged = true;
        }
        
        if (newValue === scrapedValue && manualOverrides[key]) {
          delete manualOverrides[key];
          officeHoursChanged = true;
        }
      }
      // Regular fields in scraped_data
      else if (scrapedData[key] !== undefined && scrapedData[key] !== updates[key]) {
        manualOverrides[key] = {
          original: scrapedData[key],
          manual: updates[key],
          updated_at: new Date().toISOString()
        };
      }
    }

    updateData.manual_overrides = manualOverrides;
    
    // Track when office hours were manually edited
    if (officeHoursChanged) {
      updateData.office_hours_manual_at = new Date().toISOString();
    }
  }

  const { data, error } = await getSupabaseAdmin()
    .from('marina_profiles')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Create new marina (admin only)
async function createMarina(marinaData: Record<string, any>, userId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from('marina_profiles')
    .insert({
      ...marinaData,
      status: marinaData.status || 'manual_only',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete marina (admin only)
async function deleteMarina(id: string) {
  const { error } = await getSupabaseAdmin()
    .from('marina_profiles')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Search St Lucia ports on marinelink.com
async function searchStLuciaPorts(): Promise<Array<{
  name: string;
  url: string;
  slug: string;
}>> {
  try {
    const searchUrl = 'https://ports.marinelink.com/ports?search=st+lucia';
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BayStats/1.0)'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    
    // Extract port links
    const ports: Array<{ name: string; url: string; slug: string }> = [];
    const portRegex = /<a[^>]*href="(\/ports\/port\/([^"]+))"[^>]*>\s*<h[^>]*>([^<]+)<\/h[^>]*>/gi;
    
    let match;
    while ((match = portRegex.exec(html)) !== null) {
      const url = `https://ports.marinelink.com${match[1]}`;
      const slug = match[2];
      const name = match[3].trim();
      
      // Avoid duplicates
      if (!ports.find(p => p.slug === slug)) {
        ports.push({ name, url, slug });
      }
    }

    return ports;
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  const { isAdmin, userId, error: authError, newCookies } = await verifyAdmin(event);
  
  // If token was refreshed, return new cookies
  if (newCookies) {
    return {
      statusCode: 401,
      headers: {
        ...headers,
        'Set-Cookie': newCookies
      },
      body: JSON.stringify({ error: 'Token refreshed - please retry' })
    };
  }

  // Handle both direct function calls and API proxy paths
  const path = event.path
    .replace('/.netlify/functions/admin-marinas', '')
    .replace('/api/admin-marinas', '')
    .replace(/^\//, '');
  const pathParts = path.split('/').filter(Boolean);

  try {
    // GET /api/admin-marinas - List all marinas
    if (event.httpMethod === 'GET' && pathParts.length === 0) {
      const marinas = await listMarinas(isAdmin);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ marinas, count: marinas?.length || 0 })
      };
    }

    // GET /api/admin-marinas/search - Search St Lucia ports
    if (event.httpMethod === 'GET' && pathParts[0] === 'search') {
      if (!isAdmin) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin required' }) };
      }
      
      const ports = await searchStLuciaPorts();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ports, count: ports.length })
      };
    }

    // GET /api/admin-marinas/by-slug/:slug - Get marina by slug (public)
    if (event.httpMethod === 'GET' && pathParts[0] === 'by-slug' && pathParts[1]) {
      const marina = await getMarinaBySlug(pathParts[1]);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ marina })
      };
    }

    // GET /api/admin-marinas/:id - Get single marina
    if (event.httpMethod === 'GET' && pathParts.length === 1) {
      const marina = await getMarina(pathParts[0], isAdmin);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ marina })
      };
    }

    // POST /api/admin-marinas - Create new marina
    if (event.httpMethod === 'POST' && pathParts.length === 0) {
      if (!isAdmin || !userId) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin required' }) };
      }

      const body = JSON.parse(event.body || '{}');
      const marina = await createMarina(body, userId);
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ marina, message: 'Marina created successfully' })
      };
    }

    // PUT /api/admin-marinas/:id - Update marina
    if (event.httpMethod === 'PUT' && pathParts.length === 1) {
      if (!isAdmin || !userId) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin required' }) };
      }

      const body = JSON.parse(event.body || '{}');
      const { action = 'update', ...updates } = body;
      
      const marina = await updateMarina(pathParts[0], updates, userId, action);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          marina, 
          message: action === 'approve' 
            ? 'Marina approved and published' 
            : action === 'reject'
            ? 'Marina rejected'
            : 'Marina updated successfully'
        })
      };
    }

    // DELETE /api/admin-marinas/:id - Delete marina
    if (event.httpMethod === 'DELETE' && pathParts.length === 1) {
      if (!isAdmin) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin required' }) };
      }

      await deleteMarina(pathParts[0]);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Marina deleted successfully' })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' })
    };

  } catch (error) {
    console.error('Admin marinas error:', error);
    
    const statusCode = (error as Error).message === 'Not found' ? 404 : 500;
    
    return {
      statusCode,
      headers,
      body: JSON.stringify({ 
        error: (error as Error).message || 'Internal server error'
      })
    };
  }
};
