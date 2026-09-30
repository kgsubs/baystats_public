import React, { useState, useEffect } from 'react';

interface VesselCountRecord {
  id: string;
  count: number;
  recorded_at: string;
  time_of_day: 'morning' | 'evening';
  reporter: string;
  notes?: string;
}

interface FormData {
  count: string;
  time_of_day: 'morning' | 'evening';
  reporter: string;
  notes: string;
}

export const VesselCountForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    count: '',
    time_of_day: 'morning',
    reporter: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSubmissions, setRecentSubmissions] = useState<VesselCountRecord[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Rodney Bay has 253 berths
  const TOTAL_BERTHS = 253;

  // Update time every minute
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Atlantic Standard Time (AST) = UTC-4
      const astTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Port_of_Spain' }));
      setCurrentTime(astTime.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short'
      }));
      
      // Auto-select morning/evening based on time
      const hour = astTime.getHours();
      if (hour >= 6 && hour < 14) {
        setFormData(prev => ({ ...prev, time_of_day: 'morning' }));
      } else {
        setFormData(prev => ({ ...prev, time_of_day: 'evening' }));
      }
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch recent submissions
  const fetchRecentSubmissions = async () => {
    try {
      const response = await fetch('/api/admin/vessel-count');
      if (response.ok) {
        const data = await response.json();
        setRecentSubmissions(data.records || []);
      }
    } catch (err) {
      console.error('Error fetching recent submissions:', err);
    }
  };

  useEffect(() => {
    fetchRecentSubmissions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Validation
    const count = parseInt(formData.count, 10);
    if (isNaN(count) || count < 0 || count > 300) {
      setError('Please enter a valid vessel count between 0 and 300');
      setLoading(false);
      return;
    }

    if (!formData.reporter.trim()) {
      setError('Please enter your name');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/vessel-count', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          count,
          time_of_day: formData.time_of_day,
          reporter: formData.reporter.trim(),
          notes: formData.notes.trim() || null
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit vessel count');
      }

      setSuccess(true);
      // Clear form except reporter (convenience for multiple entries)
      setFormData({
        count: '',
        time_of_day: formData.time_of_day === 'morning' ? 'evening' : 'morning',
        reporter: formData.reporter,
        notes: ''
      });
      
      // Refresh recent submissions
      await fetchRecentSubmissions();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const occupancyRate = formData.count 
    ? Math.round((parseInt(formData.count, 10) / TOTAL_BERTHS) * 100)
    : 0;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-t-lg">
        <h1 className="text-2xl md:text-3xl font-bold">Rodney Bay Vessel Count</h1>
        <p className="text-blue-100 mt-1">Marina Staff Reporting Form</p>
      </div>

      <div className="bg-white p-6 rounded-b-lg shadow-lg">
        {/* Current Date/Time Display */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="text-sm text-blue-600 font-medium uppercase tracking-wide">Current Time (AST)</div>
          <div className="text-lg text-blue-900 font-semibold">{currentTime}</div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg animate-pulse">
            <div className="flex items-center">
              <span className="text-2xl mr-2">✓</span>
              <div>
                <div className="font-semibold text-green-800">Report Submitted Successfully!</div>
                <div className="text-green-700">
                  Count: {formData.count === '' ? 'N/A' : parseInt(formData.count, 10)} vessels at {formData.time_of_day} check
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <span className="text-xl mr-2">⚠</span>
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Time of Day Selection */}
          <div>
            <label className="block text-lg font-semibold text-gray-800 mb-3">
              Check Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label 
                className={`cursor-pointer border-2 rounded-lg p-4 text-center transition-all ${
                  formData.time_of_day === 'morning'
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <input
                  type="radio"
                  name="time_of_day"
                  value="morning"
                  checked={formData.time_of_day === 'morning'}
                  onChange={(e) => setFormData({ ...formData, time_of_day: e.target.value as 'morning' | 'evening' })}
                  className="sr-only"
                />
                <div className="text-2xl mb-1">☀️</div>
                <div className="font-semibold">Morning</div>
                <div className="text-sm text-gray-500">~9:00 AM</div>
              </label>

              <label 
                className={`cursor-pointer border-2 rounded-lg p-4 text-center transition-all ${
                  formData.time_of_day === 'evening'
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <input
                  type="radio"
                  name="time_of_day"
                  value="evening"
                  checked={formData.time_of_day === 'evening'}
                  onChange={(e) => setFormData({ ...formData, time_of_day: e.target.value as 'morning' | 'evening' })}
                  className="sr-only"
                />
                <div className="text-2xl mb-1">🌅</div>
                <div className="font-semibold">Evening</div>
                <div className="text-sm text-gray-500">~4:00 PM</div>
              </label>
            </div>
          </div>

          {/* Vessel Count Input */}
          <div>
            <label htmlFor="count" className="block text-lg font-semibold text-gray-800 mb-3">
              Vessel Count <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                id="count"
                value={formData.count}
                onChange={(e) => setFormData({ ...formData, count: e.target.value })}
                min="0"
                max="300"
                placeholder="0"
                className="w-full text-4xl md:text-5xl font-bold text-center py-6 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-200 outline-none transition-all"
                disabled={loading}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                vessels
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500 flex justify-between">
              <span>Enter number of vessels currently in Rodney Bay</span>
              <span>Max: 300</span>
            </div>
            
            {/* Occupancy Rate Preview */}
            {formData.count && !isNaN(parseInt(formData.count, 10)) && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Occupancy Rate:</span>
                  <span className={`font-bold ${
                    occupancyRate > 80 ? 'text-red-600' : 
                    occupancyRate > 50 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {occupancyRate}% ({formData.count} / {TOTAL_BERTHS} berths)
                  </span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all ${
                      occupancyRate > 80 ? 'bg-red-500' : 
                      occupancyRate > 50 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(occupancyRate, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Reporter Name */}
          <div>
            <label htmlFor="reporter" className="block text-lg font-semibold text-gray-800 mb-3">
              Reporter Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="reporter"
              value={formData.reporter}
              onChange={(e) => setFormData({ ...formData, reporter: e.target.value })}
              placeholder="e.g., John (Dock Master)"
              className="w-full text-xl py-4 px-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-200 outline-none transition-all"
              disabled={loading}
            />
          </div>

          {/* Notes (Optional) */}
          <div>
            <label htmlFor="notes" className="block text-lg font-semibold text-gray-800 mb-3">
              Notes <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any special events, large arrivals/departures, weather conditions..."
              rows={3}
              className="w-full text-lg py-4 px-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-200 outline-none transition-all resize-none"
              disabled={loading}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-blue-600 text-white text-xl font-bold rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-lg active:shadow-none transform active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </span>
            ) : (
              'Submit Report'
            )}
          </button>
        </form>

        {/* Recent Submissions */}
        {recentSubmissions.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Submissions</h3>
            <div className="space-y-3">
              {recentSubmissions.map((record) => (
                <div 
                  key={record.id}
                  className="bg-gray-50 rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-gray-800">
                      {record.count} vessels
                      <span className="ml-2 text-sm font-normal text-gray-500 capitalize">
                        ({record.time_of_day})
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      by {record.reporter}
                    </div>
                    {record.notes && (
                      <div className="text-sm text-gray-400 italic mt-1">
                        "{record.notes}"
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      {new Date(record.recorded_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(record.recorded_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VesselCountForm;
