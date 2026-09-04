#!/bin/bash

# Test script to verify all location data is unique
# Compatible with macOS bash 3.2+

set -e

echo "🔍 Testing Location Data Uniqueness..."
echo ""

LOCATIONS=("rodney-bay" "marigot-bay")
BASE_URL="http://localhost:8888/.netlify/functions"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_uniqueness() {
  local api=$1
  local field=$2
  local loc1=$3
  local loc2=$4

  echo "Checking $api - $field..."

  local val1=$(curl -s "${BASE_URL}/${api}?location=${loc1}" | jq -r "$field" 2>/dev/null || echo "ERROR")
  local val2=$(curl -s "${BASE_URL}/${api}?location=${loc2}" | jq -r "$field" 2>/dev/null || echo "ERROR")

  if [ "$val1" = "ERROR" ] || [ "$val2" = "ERROR" ]; then
    echo -e "  ${RED}✗${NC} API Error - is server running?"
    return 1
  fi

  if [ -z "$val1" ] || [ "$val1" = "null" ]; then
    echo -e "  ${RED}✗${NC} ${loc1}: No data for ${field}"
    return 1
  fi

  if [ -z "$val2" ] || [ "$val2" = "null" ]; then
    echo -e "  ${RED}✗${NC} ${loc2}: No data for ${field}"
    return 1
  fi

  if [ "$val1" = "$val2" ]; then
    echo -e "  ${RED}✗${NC} DUPLICATE: Both locations have same ${field}: ${val1}"
    return 1
  fi

  echo -e "  ${GREEN}✓${NC} ${loc1}: ${val1}"
  echo -e "  ${GREEN}✓${NC} ${loc2}: ${val2}"
  echo ""
  return 0
}

# Check if server is running
echo "Checking if Netlify Dev is running..."
if ! curl -s "${BASE_URL}/clearance?location=rodney-bay" > /dev/null 2>&1; then
  echo -e "${RED}✗${NC} Server not responding at ${BASE_URL}"
  echo ""
  echo "Please start the dev server first:"
  echo "  npm run dev"
  exit 1
fi
echo -e "${GREEN}✓${NC} Server is running"
echo ""

# Test clearance API
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 Testing Clearance API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_uniqueness "clearance" ".marina.name" "rodney-bay" "marigot-bay"
check_uniqueness "clearance" ".marina.phone" "rodney-bay" "marigot-bay"
check_uniqueness "clearance" ".marina.total_berths" "rodney-bay" "marigot-bay"
check_uniqueness "clearance" ".marina.address" "rodney-bay" "marigot-bay"

# Test weather API
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌤️  Testing Weather API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_uniqueness "weather" ".location" "rodney-bay" "marigot-bay"

# Test tides API
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌊 Testing Tides API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_uniqueness "tides" ".nextHigh.height" "rodney-bay" "marigot-bay"
check_uniqueness "tides" ".nextLow.height" "rodney-bay" "marigot-bay"

# Test currents API
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "〰️  Testing Currents API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_uniqueness "currents" ".maxFlood.speed" "rodney-bay" "marigot-bay"
check_uniqueness "currents" ".maxEbb.speed" "rodney-bay" "marigot-bay"

# Test sunmoon API
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "☀️  Testing Sun/Moon API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Note: Sunrise/sunset times may be very close for nearby locations"
check_uniqueness "sunmoon" ".sunrise" "rodney-bay" "marigot-bay" || echo -e "${YELLOW}⚠️${NC} Times are close - this is expected"
echo ""

# Test vessels API
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚓ Testing Vessels API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_uniqueness "vessels" ".total_berths" "rodney-bay" "marigot-bay"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Location Data Uniqueness Test Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Manual verification checklist:"
echo "  [ ] Check UI - switch between locations in browser"
echo "  [ ] Verify marina name changes in StatsCard"
echo "  [ ] Verify phone number changes in StatsCard"
echo "  [ ] Verify berth count changes in StatsCard"
echo "  [ ] Verify weather location name changes"
echo "  [ ] Verify tide heights are different"
echo "  [ ] Verify current speeds are different"
echo ""
