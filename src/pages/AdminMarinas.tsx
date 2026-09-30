// AdminMarinas - Marina data management page
import { useState, useEffect } from 'react';
import { DEFAULT_SERVICES, type Service } from '../types/services';

interface TimeRange {
  open: string
  close: string
}

interface OfficeHoursStructured {
  mon_fri: TimeRange
  sat?: TimeRange
  sun?: TimeRange
}

interface MarinaProfile {
  id: string;
  name: string;
  slug: string;
  location: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'manual_only';
  phone: string | null;
  website: string | null;
  website_label: string | null;
  reserve_berth_url: string | null;
  vhf_channel: string | null;
  additional_services: Record<string, any> | null;
  total_berths: number | null;
  total_slips: number | null;
  total_moorings: number | null;
  last_scraped_at: string | null;
  created_at: string;
  updated_at: string;
  boat_size_capacity: string | null;
  mooring_ball_availability: string | null;
  restrooms_showers: string | null;
  water_depth: string | null;
  fuel_dock: string | null;
  water_availability: string | null;
  power_connections: string | null;
  maintenance_repair: string | null;
  chandlery: string | null;
  wifi: string | null;
  amenities: string[];
  services: Service[];
  marinelink_url: string | null;
  scraped_data: Record<string, any> | null;
  manual_overrides: Record<string, any> | null;
  // Office hours fields (legacy text format)
  customs_hours: string | null;
  immigration_hours: string | null;
  clearance_notes: string | null;
  office_hours_scraped_at: string | null;
  office_hours_manual_at: string | null;
  // New structured office hours
  customs_hours_structured: OfficeHoursStructured | null;
  immigration_hours_structured: OfficeHoursStructured | null;
}

interface StLuciaPort {
  name: string;
  url: string;
  slug: string;
}

const SCRAPE_FIELDS = [
  { key: 'boat_size_capacity', label: 'Boat Size Capacity', type: 'text' },
  { key: 'total_berths', label: 'Total Berths', type: 'text' },
  { key: 'water_depth', label: 'Water Depth', type: 'text' },
  { key: 'mooring_ball_availability', label: 'Mooring', type: 'checkbox' },
  { key: 'restrooms_showers', label: 'Showers', type: 'checkbox' },
  { key: 'fuel_dock', label: 'Fuel Dock', type: 'checkbox' },
  { key: 'water_availability', label: 'Shore Water', type: 'checkbox' },
  { key: 'power_connections', label: 'Shore Power', type: 'checkbox' },
  { key: 'chandlery', label: 'Chandlery', type: 'checkbox' },
  { key: 'wifi', label: 'WiFi', type: 'checkbox' },
];

// Time input component for office hours
const TimeInput: React.FC<{
  label: string
  value: TimeRange | undefined
  onChange: (value: TimeRange | undefined) => void
  enabled: boolean
  onToggle: (enabled: boolean) => void
}> = ({ label, value, onChange, enabled, onToggle }) => {
  return (
    <div className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onToggle(e.target.checked)}
        className="w-4 h-4"
      />
      <span className="text-sm font-medium text-gray-700 w-16">{label}</span>
      {enabled ? (
        <>
          <input
            type="time"
            value={value?.open || '08:00'}
            onChange={(e) => onChange({ ...value, open: e.target.value, close: value?.close || '16:00' })}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          />
          <span className="text-gray-500">-</span>
          <input
            type="time"
            value={value?.close || '16:00'}
            onChange={(e) => onChange({ ...value, open: value?.open || '08:00', close: e.target.value })}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </>
      ) : (
        <span className="text-sm text-gray-400">Closed</span>
      )}
    </div>
  )
}

// Office hours editor component
const OfficeHoursEditor: React.FC<{
  title: string
  value: OfficeHoursStructured | null
  onChange: (value: OfficeHoursStructured) => void
  hasManualOverride: boolean
}> = ({ title, value, onChange, hasManualOverride }) => {
  const hours = value || { mon_fri: { open: '08:00', close: '16:00' } }
  
  return (
    <div className={`p-4 rounded-lg border ${hasManualOverride ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900">{title}</h4>
        {hasManualOverride && (
          <span className="text-xs text-blue-600 font-semibold">MANUAL OVERRIDE</span>
        )}
      </div>
      
      <div className="space-y-3">
        {/* Mon-Fri - Always shown */}
        <TimeInput
          label="Mon-Fri"
          value={hours.mon_fri}
          enabled={true}
          onToggle={() => {}} // Always enabled
          onChange={(v) => v && onChange({ ...hours, mon_fri: v })}
        />
        
        {/* Sat - Optional */}
        <TimeInput
          label="Sat"
          value={hours.sat}
          enabled={!!hours.sat}
          onToggle={(enabled) => {
            if (enabled) {
              onChange({ ...hours, sat: { open: '08:00', close: '12:00' } })
            } else {
              const { sat, ...rest } = hours
              onChange(rest)
            }
          }}
          onChange={(v) => v && onChange({ ...hours, sat: v })}
        />
        
        {/* Sun - Optional */}
        <TimeInput
          label="Sun"
          value={hours.sun}
          enabled={!!hours.sun}
          onToggle={(enabled) => {
            if (enabled) {
              onChange({ ...hours, sun: { open: '08:00', close: '12:00' } })
            } else {
              const { sun, ...rest } = hours
              onChange(rest)
            }
          }}
          onChange={(v) => v && onChange({ ...hours, sun: v })}
        />
      </div>
    </div>
  )
}

export function AdminMarinas() {
  const [marinas, setMarinas] = useState<MarinaProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMarina, setSelectedMarina] = useState<MarinaProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<MarinaProfile>>({});
  
  // Scrape dialog state
  const [showScrapeDialog, setShowScrapeDialog] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [stLuciaPorts, setStLuciaPorts] = useState<StLuciaPort[]>([]);
  const [searchingPorts, setSearchingPorts] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<any>(null);

  useEffect(() => {
    fetchMarinas();
  }, []);

  const fetchMarinas = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin-marinas', {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to fetch marinas');

      const data = await response.json();
      setMarinas(data.marinas || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const searchStLuciaPorts = async () => {
    try {
      setSearchingPorts(true);
      const response = await fetch('/api/admin-marinas/search', {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to search ports');

      const data = await response.json();
      setStLuciaPorts(data.ports || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearchingPorts(false);
    }
  };

  const scrapeMarina = async (url: string) => {
    try {
      setScraping(true);
      setScrapeResult(null);

      const response = await fetch('/api/marina-scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ url, save: true })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Scrape failed');
      }

      setScrapeResult(data);
      fetchMarinas(); // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scrape failed');
    } finally {
      setScraping(false);
    }
  };

  const updateMarina = async (action: 'update' | 'approve' | 'reject') => {
    if (!selectedMarina) return;

    try {
      // Clean up editData to only send changed fields
      const updatePayload: Record<string, any> = { action };

      // Only send fields that have been modified
      for (const key of Object.keys(editData)) {
        const newValue = (editData as any)[key];
        const originalValue = (selectedMarina as any)[key];

        // Handle JSON comparison for structured fields
        if (key.includes('_structured')) {
          if (JSON.stringify(newValue) !== JSON.stringify(originalValue)) {
            updatePayload[key] = newValue;
          }
        } else if (newValue !== originalValue) {
          updatePayload[key] = newValue;
        }
      }

      const response = await fetch(`/api/admin-marinas/${selectedMarina.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(updatePayload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Update failed:', errorData);
        throw new Error(errorData.error || errorData.details || 'Failed to update');
      }

      const data = await response.json();
      setSelectedMarina(data.marina);
      // Reset editData to reflect saved state - stays on page
      setEditData({ ...data.marina });
      fetchMarinas();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const startEditing = (marina: MarinaProfile) => {
    setSelectedMarina(marina);

    // Initialize services from defaults if none exist
    let initialServices = marina.services || [];
    if (initialServices.length === 0) {
      initialServices = DEFAULT_SERVICES.map((s: Omit<Service, 'enabled'>) => ({ ...s, enabled: false }));
    }

    setEditData({ ...marina, services: initialServices });
    setIsEditing(true);
    setError(null);
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = (): boolean => {
    if (!selectedMarina) return false;

    for (const key of Object.keys(editData)) {
      const newValue = (editData as any)[key];
      const originalValue = (selectedMarina as any)[key];

      // Handle JSON comparison for structured fields
      if (key.includes('_structured')) {
        if (JSON.stringify(newValue) !== JSON.stringify(originalValue)) {
          return true;
        }
      } else if (newValue !== originalValue) {
        return true;
      }
    }
    return false;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending_review: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      manual_only: 'bg-blue-100 text-blue-800'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Marina Listing Manager</h1>
            <button
              onClick={() => {
                setShowScrapeDialog(true);
                setScrapeUrl('');
                setScrapeResult(null);
                setStLuciaPorts([]);
              }}
              className="bg-water text-white px-4 py-2 rounded hover:bg-water-dark"
            >
              + Scrape New Marina
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-sm underline">Dismiss</button>
          </div>
        )}

        {/* Marina List */}
        {loading ? (
          <div className="text-center py-12">Loading marinas...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Berths</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Last Updated</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {marinas.map((marina) => (
                  <tr key={marina.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{marina.name}</div>
                      <div className="text-sm text-gray-500">{marina.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{marina.location}</td>
                    <td className="px-4 py-3">{getStatusBadge(marina.status)}</td>
                    <td className="px-4 py-3 text-gray-700">{marina.total_berths || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(marina.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => startEditing(marina)}
                        className="text-water hover:text-water-dark text-sm font-medium"
                      >
                        {marina.status === 'pending_review' ? 'Review' : 'Edit'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Scrape Dialog */}
      {showScrapeDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Scrape Marina from MarineLink.com</h2>
            </div>
            
            <div className="p-6 space-y-4">
              {/* URL Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  MarineLink.com URL
                </label>
                <input
                  type="url"
                  value={scrapeUrl}
                  onChange={(e) => setScrapeUrl(e.target.value)}
                  placeholder="https://ports.marinelink.com/ports/port/..."
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <button
                onClick={() => scrapeUrl && scrapeMarina(scrapeUrl)}
                disabled={!scrapeUrl || scraping}
                className="w-full bg-water text-white py-2 rounded hover:bg-water-dark disabled:bg-gray-300"
              >
                {scraping ? 'Scraping...' : 'Scrape & Parse with AI'}
              </button>

              {/* Or search St Lucia ports */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>

              <button
                onClick={searchStLuciaPorts}
                disabled={searchingPorts}
                className="w-full border border-water text-water py-2 rounded hover:bg-water/5"
              >
                {searchingPorts ? 'Searching...' : 'Search St Lucia Ports'}
              </button>

              {/* St Lucia Ports Results */}
              {stLuciaPorts.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 font-medium text-sm">Found {stLuciaPorts.length} ports</div>
                  <div className="divide-y divide-gray-200 max-h-48 overflow-y-auto">
                    {stLuciaPorts.map((port) => (
                      <div key={port.slug} className="px-4 py-2 flex items-center justify-between hover:bg-gray-50">
                        <span className="text-sm">{port.name}</span>
                        <button
                          onClick={() => scrapeMarina(port.url)}
                          disabled={scraping}
                          className="text-xs bg-water text-white px-2 py-1 rounded"
                        >
                          Scrape
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scrape Result */}
              {scrapeResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-900 mb-2">Scrape Successful!</h3>
                  <p className="text-sm text-green-700 mb-2">
                    <strong>{scrapeResult.data.name}</strong> has been saved with status "pending_review".
                  </p>
                  <p className="text-sm text-green-700">
                    Click "Review" in the list to edit and approve the data.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowScrapeDialog(false)}
                className="text-gray-600 hover:text-gray-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Review Dialog */}
      {isEditing && selectedMarina && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedMarina.status === 'pending_review' ? 'Review Scraped Data' : 'Edit Marina'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Source: {selectedMarina.marinelink_url || 'Manual entry'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {hasUnsavedChanges() && (
                  <span className="text-amber-600 text-sm font-medium">
                    Unsaved changes
                  </span>
                )}
                {getStatusBadge(selectedMarina.status)}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={editData.name || ''}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <input
                    type="text"
                    value={editData.slug || ''}
                    disabled
                    className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={editData.location || ''}
                    onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editData.phone || ''}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="+1 758-XXX-XXXX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VHF Channel</label>
                  <input
                    type="text"
                    value={editData.vhf_channel || ''}
                    onChange={(e) => setEditData({ ...editData, vhf_channel: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="16"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={(editData.additional_services as any)?.email || ''}
                    onChange={(e) => setEditData({
                      ...editData,
                      additional_services: {
                        ...(editData.additional_services || {}),
                        email: e.target.value
                      }
                    })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="contact@marina.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    value={editData.website || ''}
                    onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="https://www.marina.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reserve Berth URL</label>
                  <input
                    type="url"
                    value={editData.reserve_berth_url || ''}
                    onChange={(e) => setEditData({ ...editData, reserve_berth_url: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="https://reserve.marina.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">Adds "Reserve Berth" button on frontend if present</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Slips</label>
                  <input
                    type="number"
                    value={editData.total_slips || ''}
                    onChange={(e) => setEditData({ ...editData, total_slips: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="253"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Moorings</label>
                  <input
                    type="number"
                    value={editData.total_moorings || ''}
                    onChange={(e) => setEditData({ ...editData, total_moorings: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="20"
                  />
                </div>
              </div>

              {/* Scraped Fields */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-medium text-gray-900 mb-4">Marina Details</h3>

                {/* Text Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {SCRAPE_FIELDS.filter(f => f.type === 'text').map((field) => {
                    const value = (editData as any)[field.key];
                    const hasOverride = selectedMarina.manual_overrides?.[field.key];
                    const originalValue = selectedMarina.scraped_data?.[field.key];

                    return (
                      <div key={field.key} className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                          {hasOverride && (
                            <span className="ml-2 text-xs text-blue-600">(edited)</span>
                          )}
                        </label>
                        <input
                          type="text"
                          value={value || ''}
                          onChange={(e) => setEditData({ ...editData, [field.key]: e.target.value })}
                          className={`w-full border rounded px-3 py-2 ${
                            hasOverride
                              ? 'border-blue-400 bg-blue-50'
                              : 'border-gray-300'
                          }`}
                        />
                        {hasOverride && originalValue && (
                          <div className="text-xs text-gray-500 mt-1">
                            Original: {originalValue}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Checkbox Fields */}
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Available Services</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {SCRAPE_FIELDS.filter(f => f.type === 'checkbox').map((field) => {
                      const value = (editData as any)[field.key];
                      const hasOverride = selectedMarina.manual_overrides?.[field.key];
                      // Checkbox is checked if value exists and is not "Not specified" or "Not available"
                      const isChecked = value && value !== 'Not specified' && value !== 'Not available';

                      return (
                        <div key={field.key} className="relative">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                // Set to field label when checked, "Not specified" when unchecked
                                setEditData({
                                  ...editData,
                                  [field.key]: e.target.checked ? field.label : 'Not specified'
                                });
                              }}
                              className="w-4 h-4"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              {field.label}
                              {hasOverride && (
                                <span className="ml-1 text-xs text-blue-600">(edited)</span>
                              )}
                            </span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Services Manager */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Services & Amenities</h3>
                  <button
                    onClick={() => {
                      const newService: Service = {
                        id: `custom_${Date.now()}`,
                        name: 'New Service',
                        emoji: '✨',
                        enabled: false,
                        category: 'amenity'
                      };
                      const currentServices = editData.services || selectedMarina.services || DEFAULT_SERVICES.map((s: Omit<Service, 'enabled'>) => ({ ...s, enabled: false }));
                      setEditData({ ...editData, services: [...currentServices, newService] });
                    }}
                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    + Add Service
                  </button>
                </div>

                {/* Initialize services from defaults if none exist */}
                {(() => {
                  const currentServices = editData.services || selectedMarina.services || DEFAULT_SERVICES.map((s: Omit<Service, 'enabled'>) => ({ ...s, enabled: false }));

                  // Group by category
                  const powerServices = currentServices.filter(s => s.category === 'power');
                  const basicServices = currentServices.filter(s => s.category === 'basic');
                  const amenityServices = currentServices.filter(s => s.category === 'amenity');
                  const customServices = currentServices.filter(s => !s.category || (s.category !== 'power' && s.category !== 'basic' && s.category !== 'amenity'));

                  const updateService = (serviceId: string, updates: Partial<Service>) => {
                    const updated = currentServices.map(s =>
                      s.id === serviceId ? { ...s, ...updates } : s
                    );
                    setEditData({ ...editData, services: updated });
                  };

                  const deleteService = (serviceId: string) => {
                    const updated = currentServices.filter(s => s.id !== serviceId);
                    setEditData({ ...editData, services: updated });
                  };

                  return (
                    <div className="space-y-4">
                      {/* Power Services */}
                      <div className="p-3 bg-gray-50 rounded">
                        <div className="text-sm font-medium text-gray-700 mb-2">⚡ Power</div>
                        <div className="grid grid-cols-3 gap-2">
                          {powerServices.map(service => (
                            <label key={service.id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={service.enabled}
                                onChange={(e) => updateService(service.id, { enabled: e.target.checked })}
                                className="w-4 h-4"
                              />
                              <span>{service.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Basic Services */}
                      <div className="p-3 bg-gray-50 rounded">
                        <div className="text-sm font-medium text-gray-700 mb-2">Basic Services</div>
                        <div className="grid grid-cols-2 gap-3">
                          {basicServices.map(service => (
                            <div key={service.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={service.enabled}
                                onChange={(e) => updateService(service.id, { enabled: e.target.checked })}
                                className="w-4 h-4"
                              />
                              <input
                                type="text"
                                value={service.emoji}
                                onChange={(e) => updateService(service.id, { emoji: e.target.value })}
                                className="w-10 text-center border border-gray-300 rounded px-1 py-1 text-sm"
                                placeholder="📌"
                              />
                              <input
                                type="text"
                                value={service.name}
                                onChange={(e) => updateService(service.id, { name: e.target.value })}
                                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Amenities */}
                      <div className="p-3 bg-gray-50 rounded">
                        <div className="text-sm font-medium text-gray-700 mb-2">Amenities</div>
                        <div className="grid grid-cols-2 gap-3">
                          {amenityServices.map(service => (
                            <div key={service.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={service.enabled}
                                onChange={(e) => updateService(service.id, { enabled: e.target.checked })}
                                className="w-4 h-4"
                              />
                              <input
                                type="text"
                                value={service.emoji}
                                onChange={(e) => updateService(service.id, { emoji: e.target.value })}
                                className="w-10 text-center border border-gray-300 rounded px-1 py-1 text-sm"
                                placeholder="📌"
                              />
                              <input
                                type="text"
                                value={service.name}
                                onChange={(e) => updateService(service.id, { name: e.target.value })}
                                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Custom Services */}
                      {customServices.length > 0 && (
                        <div className="p-3 bg-gray-50 rounded">
                          <div className="text-sm font-medium text-gray-700 mb-2">Custom Services</div>
                          <div className="space-y-2">
                            {customServices.map(service => (
                              <div key={service.id} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={service.enabled}
                                  onChange={(e) => updateService(service.id, { enabled: e.target.checked })}
                                  className="w-4 h-4"
                                />
                                <input
                                  type="text"
                                  value={service.emoji}
                                  onChange={(e) => updateService(service.id, { emoji: e.target.value })}
                                  className="w-10 text-center border border-gray-300 rounded px-1 py-1 text-sm"
                                  placeholder="📌"
                                />
                                <input
                                  type="text"
                                  value={service.name}
                                  onChange={(e) => updateService(service.id, { name: e.target.value })}
                                  className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                                  placeholder="Service name"
                                />
                                <button
                                  onClick={() => deleteService(service.id)}
                                  className="text-red-600 hover:text-red-800 text-sm px-2 py-1"
                                  title="Delete"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Office Hours Section */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Office Hours (AST)</h3>
                  {selectedMarina.office_hours_scraped_at && (
                    <span className="text-xs text-gray-500">
                      Scraped: {new Date(selectedMarina.office_hours_scraped_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <OfficeHoursEditor
                    title="Customs"
                    value={editData.customs_hours_structured || selectedMarina.customs_hours_structured}
                    onChange={(v) => setEditData({ ...editData, customs_hours_structured: v })}
                    hasManualOverride={!!selectedMarina.manual_overrides?.customs_hours_structured}
                  />
                  <OfficeHoursEditor
                    title="Immigration"
                    value={editData.immigration_hours_structured || selectedMarina.immigration_hours_structured}
                    onChange={(v) => setEditData({ ...editData, immigration_hours_structured: v })}
                    hasManualOverride={!!selectedMarina.manual_overrides?.immigration_hours_structured}
                  />
                </div>

                {/* Clearance Notes */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Clearance Notes
                  </label>
                  <textarea
                    value={editData.clearance_notes || ''}
                    onChange={(e) => setEditData({ ...editData, clearance_notes: e.target.value })}
                    placeholder="Additional notes about check-in/out procedures"
                    rows={2}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                  <strong>Note:</strong> Manual edits to office hours are saved as overrides and will persist even after re-scraping. 
                  The system uses manual values if set, otherwise falls back to scraped values.
                </div>
              </div>
            </div>

            {/* Actions - Sticky Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateMarina('update')}
                  disabled={!hasUnsavedChanges()}
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    hasUnsavedChanges()
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-white border border-gray-300 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Save Changes
                </button>
                {!hasUnsavedChanges() && (
                  <span className="text-sm text-green-600 font-medium">✓ All changes saved</span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {selectedMarina.status === 'pending_review' && (
                  <>
                    <button
                      onClick={() => updateMarina('reject')}
                      className="bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200 font-medium"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => updateMarina('approve')}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-medium"
                    >
                      Approve & Publish
                    </button>
                  </>
                )}
                
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setSelectedMarina(null);
                    setEditData({});
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium border border-gray-300 rounded hover:bg-gray-50"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
