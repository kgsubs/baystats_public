// DashboardV2 - Dark UI Implementation
import React from 'react';
import { getAllLocationOptions, getLocationOrDefault } from '../config/locations';
import { isLiveLocation } from '../lib/access';
import { ComingSoonModal } from '../components/session';
import { WindFieldCard } from '../components/windfield';
import { getWindFieldLocation } from '../config/windField';
import {
  useBriefingWeather,
  useBriefingClearance,
  useBriefingWindField,
  useBriefingTides,
  useBriefingCurrents,
  useBriefingTropical,
  useBriefingSunMoon,
} from '../hooks/useBriefingData';
import type { Service } from '../types/services';

// Format phone number to "+1 xxx xxx xxxx"
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Handle US/Caribbean format (11 digits with country code)
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }

  // Handle 10-digit number (assume +1 country code)
  if (digits.length === 10) {
    return `+1 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }

  // Return original if format doesn't match
  return phone;
}

export function DashboardV2() {
  const [selectedLocation, setSelectedLocation] = React.useState(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('location') || 'rodney-bay';
    return isLiveLocation(requested) ? requested : 'rodney-bay';
  });
  const [comingSoon, setComingSoon] = React.useState<{ slug: string; name: string } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = React.useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = React.useState(0);
  const [lastRefreshTime] = React.useState(new Date());
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [isMetric, setIsMetric] = React.useState(false);

  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const locationDropdownRef = React.useRef<HTMLDivElement>(null);
  const dropdownScrollRef = React.useRef<HTMLDivElement>(null);
  const [dropdownHasMore, setDropdownHasMore] = React.useState(false);

  const checkDropdownScroll = React.useCallback((el: HTMLDivElement) => {
    setDropdownHasMore(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  }, []);

  React.useEffect(() => {
    if (isLocationDropdownOpen && dropdownScrollRef.current) {
      checkDropdownScroll(dropdownScrollRef.current);
    }
  }, [isLocationDropdownOpen, checkDropdownScroll]);

  // Theme colors
  const theme = React.useMemo(() => ({
    bg: isDarkMode ? '#000000' : '#e8e8e8',
    headerBg: isDarkMode ? '#000000' : '#e8e8e8',
    cardBg: isDarkMode ? '#141414' : '#ffffff',
    elementBg: isDarkMode ? '#1e1e1e' : '#f5f5f5',
    accentBg: isDarkMode ? '#282828' : '#e8e8e8',
    textPrimary: isDarkMode ? '#ffffff' : '#000000',
    textSecondary: isDarkMode ? '#ffffff' : '#888888',
    headerTextColor: isDarkMode ? '#ffffff' : '#000000',
    headerFontWeight: 400,
    border: isDarkMode ? '#1e1e1e' : '#e0e0e0',
    cardBorder: isDarkMode ? 'none' : '1px solid #e0e0e0',
    iconColor: isDarkMode ? '#ffffff' : '#000000',
    iconSize: '1.1em',
    linkColor: isDarkMode ? '#ffffff' : '#000000',
    linkUnderline: isDarkMode ? '#737373' : '#6b6b6b',
    warningColor: isDarkMode ? '#fbbf24' : '#d97706',
    warningBg: isDarkMode ? '#1e1e1e' : '#fef3c7',
    successColor: isDarkMode ? '#22c55e' : '#16a34a',
    successBg: isDarkMode ? '#1e1e1e' : '#dcfce7',
    buttonBg: isDarkMode ? '#000000' : '#000000',
    buttonText: '#ffffff',
    // Wind field map palette. The greens here follow the design handoff rather than the
    // page's success tokens: in dark mode the page's success background is flat grey,
    // which loses the one moment this card exists to make obvious.
    wfRowGoodBg: isDarkMode ? '#0d2a19' : '#e7f7ec',
    wfAccent: isDarkMode ? '#2fbf6a' : '#17a34a',
    wfCaption: isDarkMode ? '#8f8f8f' : '#6d6d6d',
    wfMapSea: isDarkMode ? '#111111' : '#f6f7f8',
    wfMapLand: isDarkMode ? '#1c1c1c' : '#e4e4e4',
    wfMapCoast: isDarkMode ? '#3d3d3d' : '#bdbdbd',
    wfMapArrow: isDarkMode ? '#e6e6e6' : '#111111',
    wfMapLee: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(17,17,17,0.05)',
    wfSkeleton: isDarkMode ? '#151515' : '#eaeaea',
    wfTextMuted: isDarkMode ? '#8f8f8f' : '#9a9a9a',
  }), [isDarkMode]);

  // Get location display name
  const locationConfig = getLocationOrDefault(selectedLocation);
  const locationName = locationConfig.name;

  // Fetch all briefing data
  const weather = useBriefingWeather(selectedLocation);
  const clearance = useBriefingClearance(selectedLocation);
  const tides = useBriefingTides(selectedLocation);
  const currents = useBriefingCurrents(selectedLocation);
  const tropical = useBriefingTropical();
  const windField = useBriefingWindField(selectedLocation);
  const windFieldLocation = getWindFieldLocation(selectedLocation);
  const sunmoon = useBriefingSunMoon(selectedLocation);

  // Live locations lead, everything else follows alphabetically as coming soon
  const allLocations = React.useMemo(() => {
    const order = ['rodney-bay', 'marigot-bay'];
    const rank = (slug: string) => {
      const i = order.indexOf(slug);
      return i === -1 ? order.length : i;
    };
    return getAllLocationOptions()
      .map(loc => ({ ...loc, live: isLiveLocation(loc.slug) }))
      .sort((a, b) => rank(a.slug) - rank(b.slug) || a.name.localeCompare(b.name));
  }, []);

  // Filter locations based on search query
  const filteredLocations = React.useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      return allLocations.slice(0, 7);
    }
    const startsWithMatches = allLocations.filter(location =>
      location.name.toLowerCase().startsWith(query)
    );
    const containsMatches = allLocations.filter(location =>
      location.name.toLowerCase().includes(query) &&
      !location.name.toLowerCase().startsWith(query)
    );
    return [...startsWithMatches, ...containsMatches].slice(0, 7);
  }, [searchQuery, allLocations]);

  // Focus search input when opened
  React.useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setIsLocationDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format time as HH:MM UTC
  const formatTime = (date: Date) => {
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes} UTC`;
  };

  // Handle search selection
  const chooseLocation = (locationSlug: string, locationName: string) => {
    if (!isLiveLocation(locationSlug)) {
      setComingSoon({ slug: locationSlug, name: locationName });
      return;
    }
    setSelectedLocation(locationSlug);
  };

  const handleSearchSelect = (locationSlug: string, locationName: string) => {
    chooseLocation(locationSlug, locationName);
    setIsSearchOpen(false);
    setSearchQuery('');
    setSelectedSuggestionIndex(0);
  };

  // Handle keyboard navigation in search
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev =>
        prev < filteredLocations.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredLocations[selectedSuggestionIndex]) {
        handleSearchSelect(filteredLocations[selectedSuggestionIndex].slug, filteredLocations[selectedSuggestionIndex].name);
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  // Reset selected index when filtered locations change
  React.useEffect(() => {
    setSelectedSuggestionIndex(0);
  }, [filteredLocations]);

  // Get marina data
  const marina = clearance.data?.marina;
  const weatherData = weather.data;
  const tideData = tides.data;
  const currentData = currents.data;
  const tropicalData = tropical.data;
  const sunmoonData = sunmoon.data;

  // Calculate occupancy
  // Calculate sailing conditions status
  const calculateSailingConditions = (): 'GREAT' | 'GOOD' | 'FAIR' | 'ROUGH' | 'DANGEROUS' => {
    const windSpeed = weatherData?.current?.wind_speed || 0;
    const currentSpeed = currentData?.speed || 0;
    const condition = weatherData?.current?.condition?.toLowerCase() || '';

    // Check for dangerous conditions
    if (windSpeed > 25 || currentSpeed > 3) {
      return 'DANGEROUS';
    }

    // Check for storms or severe weather
    if (condition.includes('storm') || condition.includes('thunder') || condition.includes('severe')) {
      return 'DANGEROUS';
    }

    // Check for rough conditions
    if (windSpeed > 15 || currentSpeed > 2) {
      return 'ROUGH';
    }

    // Check for heavy rain
    if (condition.includes('heavy rain') || condition.includes('downpour')) {
      return 'ROUGH';
    }

    // Check for fair conditions
    if (windSpeed > 10 || currentSpeed > 1) {
      return 'FAIR';
    }

    // Check for rain or clouds (slightly degraded)
    if (condition.includes('rain') || condition.includes('shower')) {
      return 'FAIR';
    }

    // Check for good conditions
    if (windSpeed > 5 || currentSpeed > 0.5) {
      return 'GOOD';
    }

    // Great conditions - light winds and current
    return 'GREAT';
  };

  const sailingConditions = calculateSailingConditions();

  // Convert time to 24-hour format
  const to24Hour = (time: string): string => {
    if (!time) return time;

    // Check if already in 24-hour format or if it doesn't contain AM/PM
    if (!time.match(/AM|PM/i)) return time;

    // Handle time ranges (e.g., "8:00 AM - 5:00 PM")
    if (time.includes('-')) {
      const parts = time.split('-').map(t => t.trim());
      return parts.map(convertSingleTime).join(' - ');
    }

    return convertSingleTime(time);
  };

  // Helper function to convert a single time
  const convertSingleTime = (time: string): string => {
    // Parse 12-hour format (e.g., "2:42 PM", "11:30 AM")
    const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return time;

    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = match[3].toUpperCase();

    // Convert to 24-hour
    if (period === 'AM') {
      if (hours === 12) hours = 0; // 12 AM = 00:00
    } else {
      if (hours !== 12) hours += 12; // PM hours except 12 PM
    }

    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  };

  const formatTemp = (celsius: number): string => {
    if (isMetric) return `${Math.round(celsius)}°C`;
    return `${Math.round((celsius * 9/5) + 32)}°F`;
  };

  // Convert wind direction to degrees
  const windDirectionToDegrees = (direction: string): number => {
    const directions: Record<string, number> = {
      'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5,
      'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
      'S': 180, 'SSW': 202.5, 'SW': 225, 'WSW': 247.5,
      'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5
    };
    return directions[direction.toUpperCase()] || 0;
  };

  // Abbreviate day names for forecast
  const abbreviateDay = (day: string): string => {
    const abbreviations: Record<string, string> = {
      'today': 'Today',
      'tomorrow': 'Tmrw',
      'monday': 'Mon',
      'tuesday': 'Tue',
      'wednesday': 'Wed',
      'thursday': 'Thu',
      'friday': 'Fri',
      'saturday': 'Sat',
      'sunday': 'Sun',
    };
    return abbreviations[day.toLowerCase()] || day;
  };

  // Condense WMO condition strings to ≤2 words
  const condenseCondition = (condition: string): string => {
    const map: Record<string, string> = {
      'clear sky': 'Clear Sky',
      'mainly clear': 'Mainly Clear',
      'partly cloudy': 'Partly Cloudy',
      'overcast': 'Overcast',
      'foggy': 'Foggy',
      'depositing rime fog': 'Rime Fog',
      'light drizzle': 'Light Drizzle',
      'moderate drizzle': 'Mod Drizzle',
      'dense drizzle': 'Dense Drizzle',
      'slight rain': 'Slight Rain',
      'moderate rain': 'Moderate Rain',
      'heavy rain': 'Heavy Rain',
      'slight snow': 'Slight Snow',
      'moderate snow': 'Moderate Snow',
      'heavy snow': 'Heavy Snow',
      'snow grains': 'Snow Grains',
      'slight rain showers': 'Rain Showers',
      'moderate rain showers': 'Rain Showers',
      'violent rain showers': 'Heavy Showers',
      'thunderstorm': 'Thunderstorm',
      'thunderstorm with hail': 'Hail Storm',
      'thunderstorm with heavy hail': 'Hail Storm',
    };
    return map[condition.toLowerCase()] || condition;
  };

  // Shorten status/warning messages to 4 words or less
  const shortenMessage = (message: string): string => {
    if (!message) return message;

    const shortenings: Record<string, string> = {
      // Current conditions (legacy long-form fallbacks)
      'good for dinghy transit': 'Good for dinghy',
      'safe for dinghy transit': 'Safe for dinghy',
      'easy transit': 'Easy transit',
      'strong current at entrance': 'Strong entrance current',
      'strong entrance current': 'Strong entrance current',
      'caution: strong current': 'Strong current',
      'dangerous for small craft': 'Dangerous conditions',
      'not safe for dinghies': 'Unsafe for dinghies',

      // Night visibility (legacy long-form fallbacks)
      'poor visibility for night passage': 'Poor night visibility',
      'excellent visibility for night passage': 'Excellent visibility',
      'good visibility for night passage': 'Good visibility',
      'fair visibility for night passage': 'Fair visibility',
      'moderate visibility for night passage': 'Moderate visibility',
      'bright moon': 'Bright moon',
      'moderate moonlight': 'Moderate moonlight',
      'dark: use nav lights': 'Dark: use nav lights',
      'dark night': 'Dark: use nav lights',

      // Marine advisories
      'small craft advisory': 'Small craft advisory',
      'gale warning': 'Gale warning',
      'storm warning': 'Storm warning',
      'hurricane warning': 'Hurricane warning',
      'tropical storm warning': 'Tropical storm warning',
      'high surf advisory': 'High surf',
      'rip current statement': 'Rip currents',
      'dense fog advisory': 'Dense fog',
    };

    const lowerMessage = message.toLowerCase();
    for (const [key, value] of Object.entries(shortenings)) {
      if (lowerMessage.includes(key)) {
        return value;
      }
    }

    // If no match, try to intelligently shorten
    // Capitalize first letter of result
    return message.charAt(0).toUpperCase() + message.slice(1);
  };

  // Map services - show specific ones if present
  const PRIORITY_SERVICES = new Set(['FUEL DOCK', 'SHORE WATER', 'SHORE POWER', 'WIFI', 'PROVISIONS']);

  const servicesList = React.useMemo(() => {
    if (!marina) return [];

    const result: Array<{ icon: React.ReactElement; label: string; priority: boolean }> = [];

    // Check for new services format first
    const enabledServices = marina.services?.filter((s: Service) => s.enabled) || [];
    const hasPower = enabledServices.some((s: Service) => s.category === 'power');

    // Power icon
    const powerIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>;

    // Use new services format if available
    if (enabledServices.length > 0) {
      // Add power (combined from all power services)
      if (hasPower) {
        result.push({ icon: powerIcon, label: 'SHORE POWER', priority: true });
      }

      // Add other services (excluding restrooms and security)
      const otherServices = enabledServices.filter((s: Service) => s.category !== 'power' && s.id !== 'restrooms' && s.id !== 'security');
      for (const service of otherServices) {
        const iconMap: Record<string, React.ReactElement> = {
          'water': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2.5c-4 4-7 7-7 11a7 7 0 0 0 14 0c0-4-3-7-7-11z"/></svg>,
          'wifi': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg>,
          'fuel': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C8 6 6 9 6 12.5a6 6 0 1 0 12 0C18 9 16 6 12 2z"/><path d="M12 8c-1.5 2-2 3.5-2 5a2 2 0 1 0 4 0c0-1.5-.5-3-2-5z"/></svg>,
          'chandlery': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
          'mooring': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>,
          'showers': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
          'laundry': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
          'provisioning': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
          'repairs': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
          'restaurant': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
          'bar': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
        };

        // Map service names to concise labels
        const labelMap: Record<string, string> = {
          'water': 'SHORE WATER',
          'wifi': 'WIFI',
          'fuel': 'FUEL DOCK',
          'chandlery': 'CHANDLERY',
          'mooring': 'MOORING',
          'showers': 'SHOWERS',
          'laundry': 'LAUNDRY',
          'provisioning': 'PROVISIONS',
          'repairs': 'REPAIRS',
          'restaurant': 'RESTAURANT',
          'bar': 'BAR',
        };

        const icon = iconMap[service.id] || <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>;
        const label = labelMap[service.id] || service.name.toUpperCase();
        result.push({ icon, label, priority: PRIORITY_SERVICES.has(label) });
      }
    }

    // Sort: priority services first (alphabetically), then others (alphabetically)
    return result.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
  }, [marina]);


  return (
    <div key={selectedLocation} style={{
      minHeight: '100vh',
      backgroundColor: theme.bg,
      color: theme.textPrimary,
      fontWeight: 600,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      lineHeight: '1.5',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      WebkitFontSmoothing: 'antialiased',
      width: '100%',
      touchAction: 'manipulation',
    }}>
      {/* Add responsive styles */}
      <style>{`
        html, body {
          height: 100%;
          overflow: visible;
          overscroll-behavior: contain;
        }

        .sticky-header {
          position: -webkit-sticky !important;
          position: sticky !important;
          top: 0 !important;
          z-index: 100 !important;
          margin: 0 !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }

        .sticky-footer {
          position: -webkit-sticky !important;
          position: sticky !important;
          bottom: 0 !important;
          z-index: 100 !important;
          margin: 0 !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }

        .dark-ui-card-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          column-gap: 16px;
          align-items: start;
        }

        .dark-ui-col {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        @media (max-width: 768px) {
          .dark-ui-card-grid {
            grid-template-columns: 1fr;
          }

          .dark-ui-forecast-grid {
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
          }

          .dark-ui-forecast-day {
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
            height: 48px !important;
            padding: 0 16px !important;
          }

          .dark-ui-forecast-day svg {
            width: 24px !important;
            height: 24px !important;
            margin: 0 !important;
          }

          .dark-ui-forecast-day > span:first-child {
            flex: 1;
            text-align: left;
          }

          .dark-ui-forecast-day > div {
            flex-shrink: 0;
          }
        }
      `}</style>

      {/* Spacer for sticky to work */}
      <div style={{ height: '1px' }}></div>

      {/* Sticky Header */}
      <div className="sticky-header" style={{ backgroundColor: theme.headerBg }}>
        <div style={{
          maxWidth: '1300px',
          margin: '0 auto',
          padding: '11px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          fontSize: '15px',
        }}>
          {/* Marina Dropdown - Left */}
          {!isSearchOpen && (
            <div
              ref={locationDropdownRef}
              onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                color: theme.headerTextColor,
                position: 'relative',
              }}
            >
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: theme.headerFontWeight }}>
                {locationName}
              </span>
              <svg style={{ width: theme.iconSize, height: theme.iconSize, flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>

              {/* Location Dropdown */}
              {isLocationDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '8px',
                  width: '250px',
                  zIndex: 100,
                }}>
                  <div
                    ref={dropdownScrollRef}
                    onScroll={(e) => checkDropdownScroll(e.currentTarget)}
                    style={{
                      background: theme.cardBg,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '3px',
                      maxHeight: '300px',
                      overflowY: 'auto',
                    }}
                  >
                    {allLocations.map((location) => (
                      <div
                        key={location.slug}
                        onClick={(e) => {
                          e.stopPropagation();
                          chooseLocation(location.slug, location.name);
                          setIsLocationDropdownOpen(false);
                        }}
                        style={{
                          padding: '12px 16px',
                          cursor: location.live ? 'pointer' : 'default',
                          color: location.live ? theme.textPrimary : theme.textSecondary,
                          opacity: location.live ? 1 : 0.45,
                          fontWeight: theme.headerFontWeight,
                          backgroundColor: location.slug === selectedLocation ? theme.elementBg : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                        }}
                        onMouseEnter={(e) => {
                          if (location.slug !== selectedLocation) {
                            e.currentTarget.style.backgroundColor = theme.elementBg;
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = location.slug === selectedLocation ? theme.elementBg : 'transparent';
                        }}
                      >
                        <span>{location.name}</span>
                        {!location.live && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            border: `1px solid ${theme.border}`,
                            borderRadius: '3px',
                            padding: '1px 5px',
                            flexShrink: 0,
                          }}>
                            SOON
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Scroll-more indicator */}
                  {dropdownHasMore && (
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '40px',
                      background: `linear-gradient(to bottom, transparent, ${theme.cardBg})`,
                      borderRadius: '0 0 3px 3px',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      paddingBottom: '4px',
                      pointerEvents: 'none',
                    }}>
                      <svg width="32" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.textPrimary} strokeWidth="2" opacity="0.4" preserveAspectRatio="none">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Search Expandable */}
          {isSearchOpen && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              flex: 1,
              animation: 'slideOpen 0.3s ease',
              position: 'relative',
              zIndex: 40,
              fontSize: '13px',
            }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="search for marina"
                  autoComplete="off"
                  style={{
                    width: '100%',
                    background: theme.cardBg,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '3px',
                    padding: '8px 12px',
                    color: theme.textPrimary,
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    fontSize: '16px',
                    height: '36px',
                    textTransform: 'uppercase',
                    outline: 'none',
                  }}
                  onFocus={(e) => e.target.style.borderColor = theme.textSecondary}
                  onBlur={(e) => e.target.style.borderColor = theme.border}
                />

                {/* Search Suggestions Dropdown */}
                {isSearchOpen && filteredLocations.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    background: theme.cardBg,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '3px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 100,
                  }}>
                    {filteredLocations.map((location, _index) => (
                      <div
                        key={location.slug}
                        onClick={() => handleSearchSelect(location.slug, location.name)}
                        style={{
                          padding: '12px',
                          cursor: location.live ? 'pointer' : 'default',
                          color: location.live ? theme.textPrimary : theme.textSecondary,
                          opacity: location.live ? 1 : 0.45,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          backgroundColor: location.slug === selectedLocation ? theme.elementBg : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                        }}
                        onMouseEnter={(e) => {
                          if (location.slug !== selectedLocation) {
                            e.currentTarget.style.backgroundColor = theme.elementBg;
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = location.slug === selectedLocation ? theme.elementBg : 'transparent';
                        }}
                      >
                        <span>{location.name}</span>
                        {!location.live && (
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            border: `1px solid ${theme.border}`,
                            borderRadius: '3px',
                            padding: '1px 5px',
                            flexShrink: 0,
                          }}>
                            SOON
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                }}
                style={{
                  background: theme.elementBg,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '3px',
                  color: theme.textPrimary,
                  fontWeight: 600,
                  cursor: 'pointer',
                  height: '36px',
                  padding: '0 12px',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '36px',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = theme.accentBg}
                onMouseLeave={(e) => e.currentTarget.style.background = theme.elementBg}
                aria-label="Close search"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}



          {/* Temp Unit Toggle */}
          {!isSearchOpen && (
            <button
              onClick={() => setIsMetric(!isMetric)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                height: '36px',
                minWidth: '36px',
                position: 'relative',
                zIndex: 50,
                color: theme.headerTextColor,
                fontFamily: 'inherit',
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              {isMetric ? '°C' : '°F'}
            </button>
          )}

          {/* Theme Toggle */}
          {!isSearchOpen && (
            <button
              aria-label="Toggle theme"
              onClick={() => setIsDarkMode(!isDarkMode)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                height: '36px',
                width: '36px',
                position: 'relative',
                zIndex: 50,
                color: theme.headerTextColor,
              }}
            >
            {isDarkMode ? (
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
            </button>
          )}

          {/* Search Toggle */}
          {!isSearchOpen && (
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                height: '36px',
                width: '36px',
                order: 2,
                position: 'relative',
                zIndex: 50,
                color: theme.headerTextColor,
              }}
            >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main key={selectedLocation} style={{
        maxWidth: '1300px',
        margin: '0 auto',
        padding: '1px 16px 6px 16px',
      }}>
        <div className="dark-ui-card-grid">
          {/* Left column */}
          <div className="dark-ui-col">
          {/* Marina Stats Card */}
          <article style={{
            background: theme.cardBg,
            borderRadius: '3px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              {/* Coordinates */}
              {locationConfig && (
                <div style={{
                  background: theme.elementBg,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '3px',
                }}>
                  <svg style={{ color: theme.iconColor, flexShrink: 0, width: theme.iconSize, height: theme.iconSize }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
                  </svg>
                  <a
                    href={`https://www.google.com/maps?q=${locationConfig.coordinates.lat},${locationConfig.coordinates.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: theme.linkColor,
                      textDecoration: 'underline dotted',
                      textDecorationColor: theme.linkUnderline,
                      textUnderlineOffset: '6px',
                    }}
                  >
                    {locationConfig.coordinates.lat.toFixed(4)}°{locationConfig.coordinates.lat >= 0 ? 'N' : 'S'}, {Math.abs(locationConfig.coordinates.lon).toFixed(4)}°{locationConfig.coordinates.lon >= 0 ? 'E' : 'W'}
                  </a>
                </div>
              )}

              {/* Sailing Conditions */}
              {weatherData?.current && (
                <div style={{
                  background: (sailingConditions === 'ROUGH' || sailingConditions === 'DANGEROUS') ? theme.warningBg : theme.successBg,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '3px',
                }}>
                  {sailingConditions === 'ROUGH' || sailingConditions === 'DANGEROUS' ? (
                    <svg style={{ color: theme.warningColor, flexShrink: 0, width: theme.iconSize, height: theme.iconSize }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  ) : (
                    <svg style={{ color: theme.successColor, flexShrink: 0, width: theme.iconSize, height: theme.iconSize }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  )}
                  <span style={{ color: (sailingConditions === 'ROUGH' || sailingConditions === 'DANGEROUS') ? theme.warningColor : theme.successColor, fontWeight: sailingConditions === 'ROUGH' || sailingConditions === 'DANGEROUS' ? 700 : 600 }}>
                    {sailingConditions} SAILING CONDITIONS
                  </span>
                </div>
              )}

              {/* Weather */}
              {weatherData?.current && (
                <div style={{
                  background: theme.elementBg,
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  borderRadius: '3px',
                }}>
                  <span style={{ color: theme.textPrimary, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>WINDS {Math.round(weatherData.current.wind_speed)} KT</span>
                    <span style={{
                      display: 'inline-block',
                      transform: `rotate(${windDirectionToDegrees(weatherData.current.wind_direction || 'NE')}deg)`,
                      fontSize: '1.2em',
                      lineHeight: '1'
                    }}>
                      ↓
                    </span>
                    <span>{weatherData.current.wind_direction || 'NE'}</span>
                  </span>
                  <span style={{ color: theme.textPrimary, fontWeight: 600 }}>
                    {weatherData.current.condition} {formatTemp(weatherData.current.temperature)}
                  </span>
                  <span style={{ color: theme.textPrimary, fontWeight: 600 }}>
                    {weatherData.current.humidity}% HUMIDITY
                  </span>
                </div>
              )}

              {/* Phone & VHF */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {marina?.phone && marina.phone !== 'Not specified' && marina.phone !== 'Not available' && marina.phone !== 'N/A' && (
                  <div style={{
                    background: theme.elementBg,
                    padding: '0 16px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: '3px',
                  }}>
                    <svg style={{ color: theme.iconColor, flexShrink: 0, width: theme.iconSize, height: theme.iconSize }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    <a href={`tel:${marina.phone}`} style={{
                      color: theme.linkColor,
                      textDecoration: 'underline dotted',
                      textDecorationColor: theme.linkUnderline,
                      textUnderlineOffset: '6px',
                    }}>
                      {formatPhoneNumber(marina.phone)}
                    </a>
                  </div>
                )}
                {marina?.additional_services?.email && marina.additional_services.email !== 'Not available' && (
                  <div style={{
                    background: theme.elementBg,
                    padding: '0 16px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: '3px',
                  }}>
                    <svg style={{ color: theme.iconColor, flexShrink: 0, width: theme.iconSize, height: theme.iconSize }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                    <a href={`mailto:${marina.additional_services.email}`} style={{
                      color: theme.linkColor,
                      textDecoration: 'underline dotted',
                      textDecorationColor: theme.linkUnderline,
                      textUnderlineOffset: '6px',
                    }}>
                      email marina
                    </a>
                  </div>
                )}
                {marina?.vhf_channel && (
                  <div style={{
                    background: theme.elementBg,
                    padding: '0 16px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: '3px',
                  }}>
                    <svg style={{ color: theme.iconColor, flexShrink: 0, width: theme.iconSize, height: theme.iconSize }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"></path>
                      <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"></path>
                      <circle cx="12" cy="12" r="2"></circle>
                      <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"></path>
                      <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"></path>
                    </svg>
                    <span style={{ color: theme.textPrimary, fontWeight: 600 }}>VHF {marina.vhf_channel}</span>
                  </div>
                )}
              </div>

              {/* Slips & Moorings */}
              {(marina?.total_slips || marina?.total_moorings) && (
                <div style={{
                  background: theme.elementBg,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '3px',
                }}>
                  <svg style={{ color: theme.iconColor, flexShrink: 0, width: theme.iconSize, height: theme.iconSize }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9"></circle>
                    <circle cx="12" cy="12" r="5"></circle>
                    <path d="M12 3 L12 7"></path>
                    <path d="M12 17 L12 21"></path>
                    <path d="M3 12 L7 12"></path>
                    <path d="M17 12 L21 12"></path>
                  </svg>
                  <span style={{ color: theme.textPrimary, fontWeight: 600 }}>
                    {marina.total_slips && marina.total_moorings
                      ? `${marina.total_slips} Slips and ${marina.total_moorings} Moorings`
                      : marina.total_slips
                        ? `${marina.total_slips} Slips`
                        : `${marina.total_moorings} Moorings`
                    }
                  </span>
                </div>
              )}

              {/* Reserve */}
              {marina?.reserve_berth_url && (
                <a href={marina.reserve_berth_url} target="_blank" rel="noopener noreferrer" style={{
                  background: theme.buttonBg,
                  border: `1px solid ${theme.buttonText}`,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '3px',
                  color: theme.buttonText,
                  fontWeight: 600,
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}>
                  Reserve Berth
                  <span style={{ marginLeft: '4px' }}> →</span>
                </a>
              )}
            </div>
          </article>

          {/* Local Forecast Card */}
          {weatherData?.forecast && weatherData.forecast.length >= 3 && (
            <article style={{
              background: theme.cardBg,
              borderRadius: '3px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: theme.cardBg,
              }}>
                <span style={{ color: theme.textSecondary, fontWeight: theme.headerFontWeight }}>Local Forecast</span>
              </div>
              <div style={{
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <div className="dark-ui-forecast-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                }}>
                  {weatherData.forecast.slice(0, 3).map((day, index) => (
                    <div key={index} className="dark-ui-forecast-day" style={{
                      background: theme.elementBg,
                      borderRadius: '3px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      textAlign: 'center',
                    }}>
                      <span style={{ color: theme.textPrimary, fontWeight: 600, fontSize: '15px', lineHeight: '1.3' }}>
                        {abbreviateDay(day.day)}
                      </span>
                      <span style={{ color: theme.textPrimary, fontWeight: 600, fontSize: '15px', lineHeight: '1.3' }}>
                        {condenseCondition(day.condition)}
                      </span>
                      <svg style={{ width: '48px', height: '48px', color: theme.iconColor, margin: '8px 0' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        {day.condition.toLowerCase().includes('rain') ? (
                          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z"/>
                        ) : day.condition.toLowerCase().includes('cloud') ? (
                          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
                        ) : (
                          <>
                            <circle cx="12" cy="12" r="5"/>
                            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                          </>
                        )}
                      </svg>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ color: theme.textPrimary, fontWeight: 600 }}>H {formatTemp(day.high)}</span>
                        <span style={{ color: theme.textPrimary, fontWeight: 600 }}>L {formatTemp(day.low)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          )}

            {/* Wind on the Water. Only for locations that have their own basemap. */}
            {windFieldLocation && (
            <WindFieldCard
              location={windFieldLocation}
              data={windField.data}
              loading={windField.loading}
              theme={{
                cardBg: theme.cardBg,
                headerText: theme.textSecondary,
                headerWeight: theme.headerFontWeight,
                rowBg: theme.elementBg,
                rowGoodBg: theme.wfRowGoodBg,
                accent: theme.wfAccent,
                text: theme.textPrimary,
                textMuted: theme.wfTextMuted,
                caption: theme.wfCaption,
                mapSea: theme.wfMapSea,
                mapLand: theme.wfMapLand,
                mapCoast: theme.wfMapCoast,
                mapArrow: theme.wfMapArrow,
                mapLee: theme.wfMapLee,
                skeleton: theme.wfSkeleton,
                neutralPin: theme.textPrimary,
              }}
            />
            )}

          {/* Services Card */}
          <article style={{
            background: theme.cardBg,
            borderRadius: '3px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              padding: '0 16px',
              height: '44px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: theme.cardBg,
            }}>
              <span style={{ color: theme.textSecondary, fontWeight: theme.headerFontWeight }}>Marina Services</span>
            </div>
            <div style={{
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              {servicesList.map((service, index) => (
                <div key={index} style={{
                  background: service.priority
                    ? (isDarkMode ? 'rgba(34,197,94,0.12)' : 'rgba(22,163,74,0.08)')
                    : theme.elementBg,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  borderRadius: '3px',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ color: service.priority ? theme.successColor : theme.iconColor, width: theme.iconSize, height: theme.iconSize, flexShrink: 0 }}>
                    {service.icon}
                  </div>
                  <span style={{ color: service.priority ? theme.successColor : theme.textPrimary, fontWeight: 600, flex: 1 }}>{service.label}</span>
                </div>
              ))}
            </div>
          </article>

          </div>{/* end left column */}

          {/* Right column */}
          <div className="dark-ui-col">
          {/* Tropical Systems Card */}
          {tropicalData && (
            <article style={{
              background: theme.cardBg,
              borderRadius: '3px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: theme.cardBg,
              }}>
                <span style={{ color: theme.textSecondary, fontWeight: theme.headerFontWeight }}>Storm Watch</span>
              </div>
              <div style={{
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                <div style={{
                  background: theme.successBg,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '3px',
                }}>
                  <svg style={{ color: theme.successColor, width: theme.iconSize, height: theme.iconSize, flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  <span style={{ color: theme.successColor, fontWeight: 600 }}>
                    {tropicalData.status === 'clear' ? 'No Active Systems' : `${tropicalData.activeSystems.length} Active System${tropicalData.activeSystems.length > 1 ? 's' : ''}`}
                  </span>
                </div>

                {/* Outlook */}
                {tropicalData.outlook && tropicalData.outlook.length > 0 ? (
                  tropicalData.outlook.map((item, index) => (
                    <div key={index} style={{
                      background: theme.elementBg,
                      borderRadius: '3px',
                      padding: '12px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      justifyContent: 'center',
                    }}>
                      <span style={{ color: theme.textSecondary, fontWeight: 400 }}>{item.area}</span>
                      <span style={{ color: theme.textPrimary, fontWeight: 600 }}>{item.description}</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div style={{
                      background: theme.elementBg,
                      borderRadius: '3px',
                      padding: '12px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      justifyContent: 'center',
                    }}>
                      <span style={{ color: theme.textSecondary, fontWeight: 400 }}>Atlantic</span>
                      <span style={{ color: theme.textPrimary, fontWeight: 600 }}>No Development</span>
                    </div>
                    <div style={{
                      background: theme.elementBg,
                      borderRadius: '3px',
                      padding: '12px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      justifyContent: 'center',
                    }}>
                      <span style={{ color: theme.textSecondary, fontWeight: 400 }}>Caribbean</span>
                      <span style={{ color: theme.textPrimary, fontWeight: 600 }}>No Development</span>
                    </div>
                  </>
                )}

                <a href={tropicalData.nhcUrl} target="_blank" rel="noopener noreferrer" style={{
                  background: theme.buttonBg,
                  border: `1px solid ${theme.buttonText}`,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '3px',
                  color: theme.buttonText,
                  fontWeight: 600,
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}>
                  View NHC Outlook
                  <span style={{ marginLeft: '4px' }}> →</span>
                </a>
              </div>
            </article>
          )}

          {/* Currents and Tides Card */}
          {currentData && tideData && (
            <article style={{
              background: theme.cardBg,
              borderRadius: '3px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: theme.cardBg,
              }}>
                <span style={{ color: theme.textSecondary, fontWeight: theme.headerFontWeight }}>Local Current & Tide</span>
              </div>
              <div style={{
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                {currentData.interpretation && (
                  <div style={{
                    background: (currentData.interpretation.toLowerCase().includes('strong') || currentData.interpretation.toLowerCase().includes('dangerous') || currentData.interpretation.toLowerCase().includes('unsafe')) ? theme.warningBg : theme.successBg,
                    borderRadius: '3px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 16px',
                    gap: '8px',
                  }}>
                    {currentData.interpretation.toLowerCase().includes('strong') ||
                     currentData.interpretation.toLowerCase().includes('dangerous') ||
                     currentData.interpretation.toLowerCase().includes('unsafe') ? (
                      <svg style={{ color: theme.warningColor, width: theme.iconSize, height: theme.iconSize, flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                    ) : (
                      <svg style={{ color: theme.successColor, width: theme.iconSize, height: theme.iconSize, flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                    <span style={{ color: (currentData.interpretation.toLowerCase().includes('strong') || currentData.interpretation.toLowerCase().includes('dangerous') || currentData.interpretation.toLowerCase().includes('unsafe')) ? theme.warningColor : theme.successColor, fontWeight: currentData.interpretation.toLowerCase().includes('strong') || currentData.interpretation.toLowerCase().includes('dangerous') || currentData.interpretation.toLowerCase().includes('unsafe') ? 700 : 600 }}>{shortenMessage(currentData.interpretation)}</span>
                  </div>
                )}

                <div style={{
                  background: theme.elementBg,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: '3px',
                }}>
                  <span style={{ color: theme.textPrimary, fontWeight: 600 }}>Current Speed</span>
                  <span style={{ color: theme.textPrimary, fontWeight: 600 }}>{currentData.speed.toFixed(1)} Knots</span>
                </div>

                <div style={{
                  background: theme.elementBg,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: '3px',
                }}>
                  <span style={{ color: theme.textPrimary, fontWeight: 600 }}>Current Direction</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg
                      style={{
                        color: theme.textSecondary,
                        width: theme.iconSize,
                        height: theme.iconSize,
                        transform: `rotate(${currentData.directionDegrees}deg)`
                      }}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="12" y1="19" x2="12" y2="5"></line>
                      <polyline points="5 12 12 5 19 12"></polyline>
                    </svg>
                    <span style={{ color: theme.textPrimary, fontWeight: 600 }}>{currentData.direction}</span>
                  </div>
                </div>

                {/* Tide Height */}
                <div style={{
                  background: theme.elementBg,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: '3px',
                }}>
                  <span style={{ color: theme.textPrimary, fontWeight: 600 }}>Tide Height</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: theme.textPrimary, fontWeight: 600 }}>
                      {tideData.currentLevel.toFixed(1)} FT
                    </span>
                    {tideData.trend === 'rising' && (
                      <>
                        <span style={{ color: theme.textPrimary, fontWeight: 600 }}>↑</span>
                        <span style={{ color: theme.textPrimary, fontWeight: 600 }}>Rising</span>
                      </>
                    )}
                    {tideData.trend === 'falling' && (
                      <>
                        <span style={{ color: theme.textPrimary, fontWeight: 600 }}>↓</span>
                        <span style={{ color: theme.textPrimary, fontWeight: 600 }}>Falling</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Next High Tide */}
                <div style={{
                  background: theme.elementBg,
                  borderRadius: '3px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 16px',
                  justifyContent: 'space-between',
                }}>
                  <span style={{ color: theme.textPrimary, fontWeight: 600 }}>Next High Tide</span>
                  <span style={{ color: theme.textPrimary, fontWeight: 600 }}>{to24Hour(tideData.nextHigh.time)}</span>
                </div>

                {/* Next Low Tide */}
                <div style={{
                  background: theme.elementBg,
                  borderRadius: '3px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 16px',
                  justifyContent: 'space-between',
                }}>
                  <span style={{ color: theme.textPrimary, fontWeight: 600 }}>Next Low Tide</span>
                  <span style={{ color: theme.textPrimary, fontWeight: 600 }}>{to24Hour(tideData.nextLow.time)}</span>
                </div>
              </div>
            </article>
          )}

          {/* Sun & Moon Card */}
          {sunmoonData && (
            <article style={{
              background: theme.cardBg,
              borderRadius: '3px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: theme.cardBg,
              }}>
                <span style={{ color: theme.textSecondary, fontWeight: theme.headerFontWeight }}>Sun & Moon</span>
              </div>
              <div style={{
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}>
                {/* Night Passage Note */}
                {sunmoonData.nightPassageNote && (
                  <div style={{
                    background: sunmoonData.nightPassageNote.toLowerCase().includes('dark') || sunmoonData.nightPassageNote.toLowerCase().includes('poor') || sunmoonData.nightPassageNote.toLowerCase().includes('limited') ? theme.warningBg : theme.successBg,
                    borderRadius: '3px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 16px',
                    gap: '8px',
                  }}>
                    {sunmoonData.nightPassageNote.toLowerCase().includes('dark') || sunmoonData.nightPassageNote.toLowerCase().includes('poor') || sunmoonData.nightPassageNote.toLowerCase().includes('limited') ? (
                      <svg style={{ color: theme.warningColor, width: theme.iconSize, height: theme.iconSize, flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                    ) : (
                      <svg style={{ color: theme.successColor, width: theme.iconSize, height: theme.iconSize, flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                    <span style={{ color: sunmoonData.nightPassageNote.toLowerCase().includes('dark') || sunmoonData.nightPassageNote.toLowerCase().includes('poor') || sunmoonData.nightPassageNote.toLowerCase().includes('limited') ? theme.warningColor : theme.successColor, fontWeight: 700 }}>
                      {shortenMessage(sunmoonData.nightPassageNote)}
                    </span>
                  </div>
                )}

                <div style={{
                  background: theme.elementBg,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: '3px',
                }}>
                  <span style={{ color: theme.textPrimary, fontWeight: 600 }}>SUNRISE TODAY</span>
                  <span style={{ color: theme.textPrimary, fontWeight: 600 }}>{to24Hour(sunmoonData.sunrise)}</span>
                </div>

                <div style={{
                  background: theme.elementBg,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: '3px',
                }}>
                  <span style={{ color: theme.textPrimary, fontWeight: 600 }}>SUNSET TONIGHT</span>
                  <span style={{ color: theme.textPrimary, fontWeight: 600 }}>{to24Hour(sunmoonData.sunset)}</span>
                </div>

                <div style={{
                  background: theme.elementBg,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: '3px',
                }}>
                  <span style={{ color: theme.textPrimary, fontWeight: 600 }}>Moon Phase</span>
                  <span style={{ color: theme.textPrimary, fontWeight: 600 }}>
                    {sunmoonData.moonPhase.includes('waxing') ? 'WAXING' :
                     sunmoonData.moonPhase.includes('waning') ? 'WANING' :
                     sunmoonData.moonPhase === 'new-moon' ? 'NEW MOON' :
                     sunmoonData.moonPhase === 'full-moon' ? 'FULL MOON' :
                     sunmoonData.moonPhase.toUpperCase()} {sunmoonData.moonIllumination}%
                  </span>
                </div>

              </div>
            </article>
          )}
          </div>{/* end right column */}
        </div>
      </main>

      {comingSoon && (
        <ComingSoonModal
          locationName={comingSoon.name}
          locationSlug={comingSoon.slug}
          onClose={() => setComingSoon(null)}
        />
      )}

      {/* Sticky Footer */}
      <div className="sticky-footer" style={{ backgroundColor: theme.headerBg }}>
        <div style={{
          maxWidth: '1300px',
          margin: '0 auto',
          padding: '11px 16px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <span style={{ color: theme.headerTextColor, fontWeight: 400 }}>
            Last Updated {formatTime(lastRefreshTime)} · Open-Meteo
          </span>
        </div>
      </div>

      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet" />
    </div>
  );
}
