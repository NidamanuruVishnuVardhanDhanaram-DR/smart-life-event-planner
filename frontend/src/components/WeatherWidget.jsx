import React, { useState, useEffect, useCallback, useRef } from 'react';
import API_URL from '../config';
import {
  CloudSun, Droplets, Wind, Search, MapPin, RefreshCw,
  Sparkles, CheckCircle2, AlertTriangle, Compass,
  Download, FileText, Copy, Check, Umbrella, ShieldCheck
} from 'lucide-react';

// Built-in coordinate lookup for major & local event hubs (prevents geocoding fallbacks to wrong cities)
const KNOWN_CITIES = {
  hyderabad: { lat: 17.3850, lon: 78.4867, label: 'Hyderabad, Telangana, India', short: 'Hyderabad' },
  guntur: { lat: 16.3067, lon: 80.4365, label: 'Guntur, Andhra Pradesh, India', short: 'Guntur' },
  vijayawada: { lat: 16.5062, lon: 80.6480, label: 'Vijayawada, Andhra Pradesh, India', short: 'Vijayawada' },
  visakhapatnam: { lat: 17.6868, lon: 83.2185, label: 'Visakhapatnam, Andhra Pradesh, India', short: 'Visakhapatnam' },
  vizag: { lat: 17.6868, lon: 83.2185, label: 'Visakhapatnam, Andhra Pradesh, India', short: 'Visakhapatnam' },
  bangalore: { lat: 12.9716, lon: 77.5946, label: 'Bengaluru, Karnataka, India', short: 'Bangalore' },
  bengaluru: { lat: 12.9716, lon: 77.5946, label: 'Bengaluru, Karnataka, India', short: 'Bengaluru' },
  mumbai: { lat: 19.0760, lon: 72.8777, label: 'Mumbai, Maharashtra, India', short: 'Mumbai' },
  delhi: { lat: 28.6139, lon: 77.2090, label: 'New Delhi, Delhi, India', short: 'Delhi' },
  'new delhi': { lat: 28.6139, lon: 77.2090, label: 'New Delhi, Delhi, India', short: 'New Delhi' },
  chennai: { lat: 13.0827, lon: 80.2707, label: 'Chennai, Tamil Nadu, India', short: 'Chennai' },
  kolkata: { lat: 22.5726, lon: 88.3639, label: 'Kolkata, West Bengal, India', short: 'Kolkata' },
  pune: { lat: 18.5204, lon: 73.8567, label: 'Pune, Maharashtra, India', short: 'Pune' },
  tirupati: { lat: 13.6288, lon: 79.4192, label: 'Tirupati, Andhra Pradesh, India', short: 'Tirupati' },
  tenali: { lat: 16.2428, lon: 80.6400, label: 'Tenali, Andhra Pradesh, India', short: 'Tenali' },
  ponnur: { lat: 16.0667, lon: 80.5667, label: 'Ponnur, Andhra Pradesh, India', short: 'Ponnur' },
  narakodu: { lat: 16.2500, lon: 80.5200, label: 'Narakodu, Andhra Pradesh, India', short: 'Narakodu' },
  vadlamudi: { lat: 16.2350, lon: 80.5580, label: 'Vadlamudi, Andhra Pradesh, India', short: 'Vadlamudi' },
  london: { lat: 51.5072, lon: -0.1276, label: 'London, United Kingdom', short: 'London' },
  'new york': { lat: 40.7128, lon: -74.0060, label: 'New York, United States', short: 'New York' },
  tokyo: { lat: 35.6762, lon: 139.6503, label: 'Tokyo, Japan', short: 'Tokyo' },
  dubai: { lat: 25.2048, lon: 55.2708, label: 'Dubai, United Arab Emirates', short: 'Dubai' },
  singapore: { lat: 1.3521, lon: 103.8198, label: 'Singapore', short: 'Singapore' },
};

// WMO Weather Interpretation Code Map
const WMO_CODE_MAP = {
  0: { condition: 'Clear Sky', icon: '☀️', eventAdvice: 'Optimal clear skies; ideal for outdoor venues & open-air gatherings.' },
  1: { condition: 'Mainly Clear', icon: '🌤️', eventAdvice: 'Great bright weather for outdoor activities and photo shoots.' },
  2: { condition: 'Partly Cloudy', icon: '⛅', eventAdvice: 'Pleasant and mild conditions; comfortable for any gathering.' },
  3: { condition: 'Overcast', icon: '☁️', eventAdvice: 'Cloudy skies; suitable for both outdoor marquee and indoor banquet halls.' },
  45: { condition: 'Foggy', icon: '🌫️', eventAdvice: 'Low morning visibility; advise guests on morning transit times.' },
  48: { condition: 'Depositing Rime Fog', icon: '🌫️', eventAdvice: 'Cool and foggy; recommend ambient outdoor patio heaters.' },
  51: { condition: 'Light Drizzle', icon: '🌦️', eventAdvice: 'Light drizzle predicted; prepare waterproof canopies or umbrellas.' },
  53: { condition: 'Moderate Drizzle', icon: '🌦️', eventAdvice: 'Drizzle likely; ensure covered walkways and sheltered seating.' },
  55: { condition: 'Dense Drizzle', icon: '🌧️', eventAdvice: 'Wet ground expected; prefer indoor spaces or elevated wooden decking.' },
  61: { condition: 'Slight Rain', icon: '🌧️', eventAdvice: 'Rain likely; arrange waterproof tenting or move dining indoors.' },
  63: { condition: 'Moderate Rain', icon: '🌧️', eventAdvice: 'Rain expected; indoor banquet venue strongly recommended.' },
  65: { condition: 'Heavy Rain', icon: '⛈️', eventAdvice: 'Heavy rain warning; indoor venue mandatory with valet parking.' },
  71: { condition: 'Slight Snow', icon: '🌨️', eventAdvice: 'Crisp cold snowfall; verify indoor heating and warm welcome drinks.' },
  73: { condition: 'Moderate Snow', icon: '🌨️', eventAdvice: 'Snow accumulations expected; arrange heated entryways.' },
  75: { condition: 'Heavy Snow', icon: '❄️', eventAdvice: 'Severe cold alert; indoor hall with central heating required.' },
  80: { condition: 'Light Showers', icon: '🌦️', eventAdvice: 'Passing rain showers; keep waterproof backup option ready.' },
  81: { condition: 'Moderate Showers', icon: '🌧️', eventAdvice: 'Intermittent showers; indoor dining recommended.' },
  82: { condition: 'Violent Showers', icon: '⛈️', eventAdvice: 'Heavy downpour alert; keep all stage equipment inside.' },
  95: { condition: 'Thunderstorm', icon: '⚡', eventAdvice: 'Thunderstorm alert; postpone outdoor activities & shelter indoors.' },
  96: { condition: 'Thunderstorm with Hail', icon: '⛈️', eventAdvice: 'Severe storm alert with hail; ensure safe indoor sheltering.' },
  99: { condition: 'Heavy Thunderstorm', icon: '⛈️', eventAdvice: 'Severe weather advisory; indoor ballroom mandatory.' },
};

const getConditionInfo = (code) => {
  return WMO_CODE_MAP[code] || { condition: 'Partly Cloudy', icon: '⛅', eventAdvice: 'Normal weather conditions for event scheduling.' };
};

const mapDescriptionToCondition = (desc = '') => {
  const d = desc.toLowerCase();
  if (d.includes('thunder') || d.includes('storm')) return { condition: desc, icon: '⛈️', severe: true, rain: true };
  if (d.includes('heavy rain') || d.includes('downpour')) return { condition: desc, icon: '⛈️', severe: true, rain: true };
  if (d.includes('rain') || d.includes('shower')) return { condition: desc, icon: '🌧️', severe: false, rain: true };
  if (d.includes('drizzle') || d.includes('mist')) return { condition: desc, icon: '🌦️', severe: false, rain: true };
  if (d.includes('snow') || d.includes('sleet')) return { condition: desc, icon: '🌨️', severe: true, rain: false };
  if (d.includes('fog') || d.includes('haze')) return { condition: desc, icon: '🌫️', severe: false, rain: false };
  if (d.includes('overcast')) return { condition: desc, icon: '☁️', severe: false, rain: false };
  if (d.includes('cloud')) return { condition: desc, icon: '⛅', severe: false, rain: false };
  return { condition: desc || 'Clear Sky', icon: '☀️', severe: false, rain: false };
};

// Avoid UTC midnight day-shift bug by anchoring at local noon
const getDayName = (dateStr, index) => {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  if (!dateStr) return `Day ${index + 1}`;
  try {
    const cleanDate = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`;
    const d = new Date(cleanDate);
    if (Number.isNaN(d.getTime())) return `Day ${index + 1}`;
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  } catch {
    return `Day ${index + 1}`;
  }
};

// Clean fetch without global Authorization headers (prevents CORS preflight 404 failures on third-party APIs)
const fetchJsonClean = async (url, timeoutMs = 6000, headers = undefined) => {
  if (typeof fetch !== 'function') {
    throw new Error('Fetch API unavailable');
  }
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const options = {};
    if (controller) options.signal = controller.signal;
    if (headers) options.headers = headers;
    const res = await fetch(url, options);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
};

// Evaluate event suitability for a forecast day or current conditions
const evaluateSuitability = ({ temp, condition = '', rainChance = 0, windSpeed = 0 }) => {
  const c = condition.toLowerCase();
  const isStorm = c.includes('thunder') || c.includes('storm') || c.includes('violent') || c.includes('heavy rain');
  const isRain = isStorm || c.includes('rain') || c.includes('drizzle') || c.includes('shower') || rainChance >= 55;

  if (isStorm || rainChance >= 70 || windSpeed >= 40) {
    return {
      rating: 'Indoor Venue Recommended',
      level: 'poor',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      advisory: `High weather risk (${condition}${rainChance ? `, ${rainChance}% rain chance` : ''}). Book an enclosed hall or keep emergency indoor backup ready.`
    };
  }
  if (isRain || rainChance >= 30 || temp >= 37 || temp <= 10 || windSpeed >= 25) {
    return {
      rating: 'Moderate — Canopy / Precautions',
      level: 'moderate',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      advisory: temp >= 37
        ? `Hot conditions (${temp}°C). Provide shaded seating, mist fans, and chilled hydration stations.`
        : temp <= 10
          ? `Cold weather (${temp}°C). Arrange patio heaters and warm indoor lounge access.`
          : `Possible rain or breeze (${condition}${rainChance ? `, ${rainChance}% rain chance` : ''}). Arrange waterproof canopies and covered dining.`
    };
  }
  return {
    rating: 'Ideal for Outdoor & Indoor',
    level: 'good',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    advisory: `Favorable weather (${condition}, ${temp}°C). Great conditions for open-air lawns, stage setups, and photography.`
  };
};

const WEATHER_CACHE_PREFIX = 'smartlife_weather_cache_v2_';

const saveWeatherCache = (key, payload) => {
  try {
    if (!key) return;
    localStorage.setItem(
      `${WEATHER_CACHE_PREFIX}${key.toLowerCase()}`,
      JSON.stringify({ savedAt: new Date().toISOString(), payload })
    );
  } catch {}
};

const loadWeatherCache = (key) => {
  try {
    if (!key) return null;
    const raw = localStorage.getItem(`${WEATHER_CACHE_PREFIX}${key.toLowerCase()}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.payload) return null;
    return parsed;
  } catch {
    return null;
  }
};

const WeatherWidget = () => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activePill, setActivePill] = useState('Current Location');
  const [tempUnit, setTempUnit] = useState('C'); // 'C' or 'F'
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [copiedReport, setCopiedReport] = useState(false);

  const requestIdRef = useRef(0);
  const lastQueryRef = useRef({ lat: 17.3850, lon: 78.4867, cityName: 'Hyderabad', pill: 'Current Location' });

  const popularCities = ['Current Location', 'Hyderabad', 'Guntur', 'Bangalore', 'Mumbai', 'Delhi'];

  // Resolve coordinates & display name for any city query
  const resolveCityCoordinates = async (rawCity) => {
    const cleanedFull = (rawCity || '').trim();
    const cityOnly = cleanedFull.split(',')[0].trim();
    const lookupKey = cityOnly.toLowerCase();

    // 1. Try Open-Meteo Geocoding via clean fetch (no Authorization header!)
    try {
      const geoData = await fetchJsonClean(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityOnly)}&count=1&language=en&format=json`,
        4500
      );
      if (geoData?.results?.[0]) {
        const top = geoData.results[0];
        return {
          lat: top.latitude,
          lon: top.longitude,
          label: [top.name, top.admin1, top.country].filter(Boolean).join(', '),
          short: top.name || cityOnly
        };
      }
    } catch {}

    // 2. Fallback to Photon (OpenStreetMap CORS-friendly geocoder)
    try {
      const photonData = await fetchJsonClean(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanedFull)}&limit=1`,
        4500
      );
      const feat = photonData?.features?.[0];
      if (feat?.geometry?.coordinates) {
        const [lon, lat] = feat.geometry.coordinates;
        const props = feat.properties || {};
        const name = props.name || props.city || cityOnly;
        return {
          lat,
          lon,
          label: [name, props.state, props.country].filter(Boolean).join(', '),
          short: name
        };
      }
    } catch {}

    // 3. Built-in coordinate table so known cities always work reliably
    if (KNOWN_CITIES[lookupKey]) {
      return KNOWN_CITIES[lookupKey];
    }

    return null;
  };

  // Reverse geocode GPS coordinates to human-readable city/state
  const reverseGeocodeCoords = async (lat, lon) => {
    try {
      const data = await fetchJsonClean(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
        4000
      );
      if (data && (data.city || data.locality || data.principalSubdivision)) {
        const primary = data.city || data.locality;
        return {
          label: [primary, data.principalSubdivision, data.countryName].filter(Boolean).join(', '),
          short: primary || 'Current Location'
        };
      }
    } catch {}
    return { label: `Current Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`, short: 'Current Location' };
  };

  // Fetch from Open-Meteo Forecast
  const fetchFromOpenMeteo = async (lat, lon, displayLabel) => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;
    const data = await fetchJsonClean(url, 5500);
    if (!data?.current) throw new Error('Open-Meteo returned empty current payload');

    const code = data.current.weather_code ?? 0;
    const currentInfo = getConditionInfo(code);
    const currentTemp = Math.round(data.current.temperature_2m);
    const currentWind = Math.round(data.current.wind_speed_10m ?? 0);
    const currentHumidity = Math.round(data.current.relative_humidity_2m ?? 0);

    const forecast = [];
    if (Array.isArray(data.daily?.time)) {
      data.daily.time.forEach((dateStr, idx) => {
        const dayCode = data.daily.weather_code?.[idx] ?? 0;
        const dayInfo = getConditionInfo(dayCode);
        const tempMax = Math.round(data.daily.temperature_2m_max?.[idx] ?? data.current.temperature_2m);
        const tempMin = Math.round(data.daily.temperature_2m_min?.[idx] ?? (tempMax - 5));
        const rainChance = Math.round(data.daily.precipitation_probability_max?.[idx] ?? 0);
        const windMax = Math.round(data.daily.wind_speed_10m_max?.[idx] ?? currentWind);
        const suitability = evaluateSuitability({
          temp: tempMax,
          condition: dayInfo.condition,
          rainChance,
          windSpeed: windMax
        });

        forecast.push({
          day: getDayName(dateStr, idx),
          date: dateStr,
          temp: tempMax,
          tempMin,
          rainChance,
          windMax,
          condition: dayInfo.condition,
          icon: dayInfo.icon,
          advice: suitability.advisory,
          suitability
        });
      });
    }

    const todaySuitability = evaluateSuitability({
      temp: currentTemp,
      condition: currentInfo.condition,
      rainChance: forecast[0]?.rainChance ?? 0,
      windSpeed: currentWind
    });

    return {
      success: true,
      isLive: true,
      source: 'Open-Meteo Meteorological API',
      generatedAt: new Date().toISOString(),
      city: displayLabel,
      location: displayLabel,
      coordinates: { lat, lon },
      temperature: currentTemp,
      apparentTemperature: Math.round(data.current.apparent_temperature ?? currentTemp),
      condition: currentInfo.condition,
      icon: currentInfo.icon,
      humidity: currentHumidity,
      windSpeed: currentWind,
      rainChance: forecast[0]?.rainChance ?? 0,
      suitability: todaySuitability,
      eventAdvisory: todaySuitability.advisory,
      forecast: forecast.slice(0, 7)
    };
  };

  // Secondary live fallback: wttr.in JSON API
  const fetchFromWttrIn = async (queryText, displayLabel) => {
    const q = (queryText || 'Hyderabad').split(',')[0].trim();
    const data = await fetchJsonClean(`https://wttr.in/${encodeURIComponent(q)}?format=j1`, 5500);
    const cur = data?.current_condition?.[0];
    if (!cur) throw new Error('wttr.in returned empty condition');

    const desc = cur.weatherDesc?.[0]?.value || 'Clear Sky';
    const mapped = mapDescriptionToCondition(desc);
    const currentTemp = Math.round(Number(cur.temp_C));
    const apparentTemp = Math.round(Number(cur.FeelsLikeC ?? cur.temp_C));
    const humidity = Math.round(Number(cur.humidity ?? 60));
    const windSpeed = Math.round(Number(cur.windspeedKmph ?? 10));

    const area = data.nearest_area?.[0];
    const resolvedName = area
      ? [area.areaName?.[0]?.value, area.region?.[0]?.value, area.country?.[0]?.value].filter(Boolean).join(', ')
      : displayLabel;

    const forecast = (data.weather || []).slice(0, 7).map((w, idx) => {
      const midHour = w.hourly?.[4] || w.hourly?.[0] || {};
      const dayDesc = midHour.weatherDesc?.[0]?.value || desc;
      const dayMapped = mapDescriptionToCondition(dayDesc);
      const maxTemp = Math.round(Number(w.maxtempC));
      const minTemp = Math.round(Number(w.mintempC));
      const rainChance = Math.round(
        Math.max(...(w.hourly || []).map((h) => Number(h.chanceofrain || 0)), 0)
      );
      const windMax = Math.round(
        Math.max(...(w.hourly || []).map((h) => Number(h.windspeedKmph || 0)), windSpeed)
      );
      const suitability = evaluateSuitability({
        temp: maxTemp,
        condition: dayMapped.condition,
        rainChance,
        windSpeed: windMax
      });

      return {
        day: getDayName(w.date, idx),
        date: w.date,
        temp: maxTemp,
        tempMin: minTemp,
        rainChance,
        windMax,
        condition: dayMapped.condition,
        icon: dayMapped.icon,
        advice: suitability.advisory,
        suitability
      };
    });

    const todaySuitability = evaluateSuitability({
      temp: currentTemp,
      condition: mapped.condition,
      rainChance: forecast[0]?.rainChance ?? 0,
      windSpeed
    });

    return {
      success: true,
      isLive: true,
      source: 'wttr.in Global Weather Service',
      generatedAt: new Date().toISOString(),
      city: resolvedName || displayLabel,
      location: resolvedName || displayLabel,
      temperature: currentTemp,
      apparentTemperature: apparentTemp,
      condition: mapped.condition,
      icon: mapped.icon,
      humidity,
      windSpeed,
      rainChance: forecast[0]?.rainChance ?? 0,
      suitability: todaySuitability,
      eventAdvisory: todaySuitability.advisory,
      forecast
    };
  };

  // Tertiary live fallback: Norwegian Meteorological Institute (met.no)
  const fetchFromMetNo = async (lat, lon, displayLabel) => {
    const data = await fetchJsonClean(
      `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${Number(lat).toFixed(4)}&lon=${Number(lon).toFixed(4)}`,
      5500
    );
    const series = data?.properties?.timeseries;
    if (!Array.isArray(series) || series.length === 0) throw new Error('met.no returned empty timeseries');

    const nowEntry = series[0];
    const details = nowEntry.data?.instant?.details || {};
    const symbolCode =
      nowEntry.data?.next_1_hours?.summary?.symbol_code ||
      nowEntry.data?.next_6_hours?.summary?.symbol_code ||
      'clearsky';
    const cleanCond = symbolCode.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const mapped = mapDescriptionToCondition(cleanCond);

    const currentTemp = Math.round(details.air_temperature ?? 25);
    const humidity = Math.round(details.relative_humidity ?? 60);
    const windSpeed = Math.round((details.wind_speed ?? 3) * 3.6);

    // Group series by YYYY-MM-DD for daily forecast
    const byDate = new Map();
    series.forEach((entry) => {
      const dateStr = (entry.time || '').split('T')[0];
      if (!dateStr) return;
      if (!byDate.has(dateStr)) byDate.set(dateStr, []);
      byDate.get(dateStr).push(entry);
    });

    const forecast = Array.from(byDate.entries()).slice(0, 7).map(([dateStr, entries], idx) => {
      const temps = entries.map((e) => e.data?.instant?.details?.air_temperature).filter((t) => typeof t === 'number');
      const winds = entries.map((e) => (e.data?.instant?.details?.wind_speed ?? 0) * 3.6);
      const maxTemp = Math.round(Math.max(...temps, currentTemp));
      const minTemp = Math.round(Math.min(...temps, currentTemp));
      const windMax = Math.round(Math.max(...winds, windSpeed));
      const mid = entries[Math.floor(entries.length / 2)] || entries[0];
      const sym = (mid.data?.next_6_hours?.summary?.symbol_code || mid.data?.next_1_hours?.summary?.symbol_code || 'partlycloudy')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      const m = mapDescriptionToCondition(sym);
      const suitability = evaluateSuitability({ temp: maxTemp, condition: m.condition, rainChance: m.rain ? 60 : 10, windSpeed: windMax });
      return {
        day: getDayName(dateStr, idx),
        date: dateStr,
        temp: maxTemp,
        tempMin: minTemp,
        rainChance: m.rain ? 60 : 10,
        windMax,
        condition: m.condition,
        icon: m.icon,
        advice: suitability.advisory,
        suitability
      };
    });

    const todaySuitability = evaluateSuitability({
      temp: currentTemp,
      condition: mapped.condition,
      rainChance: forecast[0]?.rainChance ?? 0,
      windSpeed
    });

    return {
      success: true,
      isLive: true,
      source: 'MET Norway Weather API',
      generatedAt: new Date().toISOString(),
      city: displayLabel,
      location: displayLabel,
      temperature: currentTemp,
      apparentTemperature: currentTemp,
      condition: mapped.condition,
      icon: mapped.icon,
      humidity,
      windSpeed,
      rainChance: forecast[0]?.rainChance ?? 0,
      suitability: todaySuitability,
      eventAdvisory: todaySuitability.advisory,
      forecast
    };
  };

  // Core Weather Report Loader
  const fetchWeather = useCallback(async (lat = null, lon = null, cityName = null, pillOverride = null) => {
    const reqId = ++requestIdRef.current;
    setLoading(true);
    setErrorMsg('');
    setSelectedDayIdx(0);

    let resolvedLat = lat;
    let resolvedLon = lon;
    let displayLabel = cityName || 'Your Location';
    let cacheKey = cityName ? cityName.split(',')[0].trim() : 'current_location';

    if (pillOverride) {
      setActivePill(pillOverride);
    }

    try {
      // Case A: Searching/selecting by city name
      if (cityName && cityName !== 'Current Location' && (!lat || !lon)) {
        const geo = await resolveCityCoordinates(cityName);
        if (reqId !== requestIdRef.current) return;

        if (geo) {
          resolvedLat = geo.lat;
          resolvedLon = geo.lon;
          displayLabel = geo.label;
          cacheKey = geo.short || cityName.split(',')[0].trim();
        } else {
          // If no geocoder returned coordinates, let wttr.in resolve city name directly
          displayLabel = cityName;
          cacheKey = cityName.split(',')[0].trim();
        }
      }
      // Case B: GPS Coordinates supplied -> Reverse geocode for real city label
      else if (resolvedLat && resolvedLon && !cityName) {
        const rev = await reverseGeocodeCoords(resolvedLat, resolvedLon);
        if (reqId !== requestIdRef.current) return;
        displayLabel = rev.label;
        cacheKey = `${resolvedLat.toFixed(2)}_${resolvedLon.toFixed(2)}`;
      }
      // Case C: Fallback default coordinates
      else if (!resolvedLat || !resolvedLon) {
        resolvedLat = 17.3850;
        resolvedLon = 78.4867;
        displayLabel = 'Hyderabad, Telangana, India';
        cacheKey = 'Hyderabad';
      }

      // Save clean query for Refresh button (prevents Refresh bug!)
      lastQueryRef.current = {
        lat: resolvedLat,
        lon: resolvedLon,
        cityName: cityName && cityName !== 'Current Location' ? cacheKey : null,
        displayLabel,
        pill: pillOverride || (cityName || 'Current Location')
      };

      let report = null;

      // 1. Primary: Open-Meteo (if coordinates known)
      if (resolvedLat && resolvedLon) {
        try {
          report = await fetchFromOpenMeteo(resolvedLat, resolvedLon, displayLabel);
        } catch (err) {
          console.warn('Open-Meteo unavailable, trying secondary live weather:', err.message);
        }
      }

      // 2. Secondary: wttr.in
      if (!report) {
        try {
          const wttrQuery = resolvedLat && resolvedLon && !cityName
            ? `${resolvedLat.toFixed(3)},${resolvedLon.toFixed(3)}`
            : cacheKey;
          report = await fetchFromWttrIn(wttrQuery, displayLabel);
        } catch (err) {
          console.warn('wttr.in unavailable, trying met.no:', err.message);
        }
      }

      // 3. Tertiary: met.no
      if (!report && resolvedLat && resolvedLon) {
        try {
          report = await fetchFromMetNo(resolvedLat, resolvedLon, displayLabel);
        } catch (err) {
          console.warn('met.no unavailable, trying backend proxy:', err.message);
        }
      }

      // 4. Backend proxy (/api/weather)
      if (!report) {
        try {
          let proxyUrl = `${API_URL}/api/weather`;
          if (cityName && cityName !== 'Current Location') {
            proxyUrl += `?city=${encodeURIComponent(cityName.split(',')[0].trim())}`;
          } else if (resolvedLat && resolvedLon) {
            proxyUrl += `?lat=${resolvedLat}&lon=${resolvedLon}`;
          }
          const backendData = await fetchJsonClean(proxyUrl, 3500);
          if (backendData?.success && !String(backendData.source || '').includes('Model')) {
            const suitability = evaluateSuitability({
              temp: backendData.temperature,
              condition: backendData.condition,
              rainChance: 0,
              windSpeed: backendData.windSpeed
            });
            report = {
              ...backendData,
              isLive: true,
              generatedAt: new Date().toISOString(),
              suitability,
              forecast: (backendData.forecast || []).map((f) => ({
                ...f,
                suitability: evaluateSuitability({ temp: f.temp, condition: f.condition, rainChance: f.rainChance || 0, windSpeed: f.windMax || 10 })
              }))
            };
          }
        } catch (err) {
          console.warn('Backend weather proxy unavailable:', err.message);
        }
      }

      if (reqId !== requestIdRef.current) return;

      if (report) {
        saveWeatherCache(cacheKey, report);
        setWeather(report);
        setErrorMsg('');
        return;
      }

      // 5. Check real cached weather before reporting unavailable (never show fake numbers!)
      const cached = loadWeatherCache(cacheKey);
      if (cached?.payload) {
        setWeather({
          ...cached.payload,
          isLive: false,
          isCached: true,
          cachedAt: cached.savedAt,
          source: `Cached Real Weather (${new Date(cached.savedAt).toLocaleString()})`
        });
        setErrorMsg('Live weather servers timed out — showing last verified report.');
      } else {
        setWeather(null);
        setErrorMsg(`Unable to generate live weather report for "${displayLabel}". Check internet connectivity and click Retry.`);
      }
    } finally {
      if (reqId === requestIdRef.current) {
        setLoading(false);
        setIsSearching(false);
      }
    }
  }, []);

  const detectLocationAndFetch = useCallback(() => {
    setActivePill('Current Location');
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          fetchWeather(latitude, longitude, null, 'Current Location');
        },
        () => {
          fetchWeather(17.3850, 78.4867, 'Hyderabad', 'Current Location');
        },
        { timeout: 4500 }
      );
    } else {
      fetchWeather(17.3850, 78.4867, 'Hyderabad', 'Current Location');
    }
  }, [fetchWeather]);

  useEffect(() => {
    detectLocationAndFetch();
  }, [detectLocationAndFetch]);

  const handleRefresh = () => {
    const q = lastQueryRef.current;
    if (q?.lat && q?.lon && !q.cityName) {
      fetchWeather(q.lat, q.lon, null, q.pill);
    } else {
      fetchWeather(null, null, q?.cityName || 'Hyderabad', q?.pill || 'Hyderabad');
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const city = searchCity.trim();
    if (!city) return;
    setIsSearching(true);
    setActivePill(city);
    fetchWeather(null, null, city, city);
    setSearchCity('');
  };

  const handleCitySelect = (city) => {
    if (city === 'Current Location') {
      detectLocationAndFetch();
    } else {
      fetchWeather(null, null, city, city);
    }
  };

  // Temperature display converter
  const formatTemp = (celsius) => {
    if (celsius === undefined || celsius === null || Number.isNaN(celsius)) return '--';
    if (tempUnit === 'F') {
      return `${Math.round((celsius * 9) / 5 + 32)}°F`;
    }
    return `${celsius}°C`;
  };

  const activeDay = weather?.forecast?.[selectedDayIdx] || null;
  const activeReportSuitability = activeDay?.suitability || weather?.suitability;

  // Build plain-text Weather Report summary
  const buildReportText = () => {
    if (!weather) return '';
    const lines = [
      'SMART LIFE EVENT PLANNER — WEATHER REPORT',
      `Location: ${weather.location || weather.city}`,
      `Generated: ${new Date(weather.generatedAt || Date.now()).toLocaleString()}`,
      `Data Source: ${weather.source}`,
      '',
      'CURRENT CONDITIONS:',
      `• Temperature: ${formatTemp(weather.temperature)} (Feels like ${formatTemp(weather.apparentTemperature)})`,
      `• Condition: ${weather.condition}`,
      `• Humidity: ${weather.humidity}%`,
      `• Wind Speed: ${weather.windSpeed} km/h`,
      ...(weather.rainChance !== undefined ? [`• Rain Probability: ${weather.rainChance}%`] : []),
      '',
      `SELECTED DAY ANALYSIS (${activeDay ? `${activeDay.day}${activeDay.date ? ` - ${activeDay.date}` : ''}` : 'Today'}):`,
      `• Suitability: ${activeReportSuitability?.rating || 'Normal'}`,
      `• Advisory: ${activeDay?.advice || weather.eventAdvisory}`,
      '',
      'UPCOMING FORECAST:'
    ];

    (weather.forecast || []).forEach((d) => {
      lines.push(
        `• ${d.day}${d.date ? ` (${d.date})` : ''}: ${formatTemp(d.temp)}${d.tempMin !== undefined ? ` / ${formatTemp(d.tempMin)}` : ''} — ${d.condition}${d.rainChance !== undefined ? ` (Rain: ${d.rainChance}%)` : ''}`
      );
    });

    return lines.join('\n');
  };

  const handleCopyReport = async () => {
    const text = buildReportText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2500);
    } catch {}
  };

  const handleDownloadPdfReport = async () => {
    if (!weather) return;
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const loc = weather.location || weather.city || 'Location';

      doc.setFontSize(18);
      doc.setTextColor(30, 64, 175);
      doc.text('Smart Life Event Planner - Weather Report', 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Location: ${loc}`, 14, 29);
      doc.text(`Generated: ${new Date(weather.generatedAt || Date.now()).toLocaleString()}`, 14, 35);
      doc.text(`Source: ${weather.source}`, 14, 41);

      doc.setDrawColor(203, 213, 225);
      doc.line(14, 45, 196, 45);

      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text('Current Conditions', 14, 54);

      doc.setFontSize(11);
      doc.text(`Temperature: ${formatTemp(weather.temperature)} (Feels like ${formatTemp(weather.apparentTemperature)})`, 14, 62);
      doc.text(`Condition: ${weather.condition}`, 14, 69);
      doc.text(`Humidity: ${weather.humidity}%   |   Wind Speed: ${weather.windSpeed} km/h   |   Rain Chance: ${weather.rainChance ?? 0}%`, 14, 76);

      doc.setFontSize(13);
      doc.text(`Event Suitability Analysis (${activeDay ? `${activeDay.day}${activeDay.date ? ` - ${activeDay.date}` : ''}` : 'Today'})`, 14, 88);

      doc.setFontSize(11);
      doc.text(`Rating: ${activeReportSuitability?.rating || 'Favorable'}`, 14, 96);
      const wrappedAdvice = doc.splitTextToSize(`Advisory: ${activeDay?.advice || weather.eventAdvisory}`, 180);
      doc.text(wrappedAdvice, 14, 103);

      let yPos = 103 + wrappedAdvice.length * 6 + 8;
      doc.setFontSize(13);
      doc.text('Multi-Day Forecast Breakdown', 14, yPos);
      yPos += 8;

      doc.setFontSize(10);
      (weather.forecast || []).forEach((d) => {
        const line = `${d.day}${d.date ? ` (${d.date})` : ''}: High ${formatTemp(d.temp)} / Low ${formatTemp(d.tempMin)} | ${d.condition} | Rain: ${d.rainChance ?? 0}% | ${d.suitability?.rating || ''}`;
        const splitLine = doc.splitTextToSize(line, 180);
        doc.text(splitLine, 14, yPos);
        yPos += splitLine.length * 6 + 2;
      });

      const safeCity = loc.split(',')[0].trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      doc.save(`weather-report-${safeCity || 'event'}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
    }
  };

  const getWeatherColor = (cond = '') => {
    const c = cond.toLowerCase();
    if (c.includes('rain') || c.includes('drizzle') || c.includes('storm')) {
      return 'from-blue-600/30 via-slate-700/30 to-indigo-900/30 border-blue-500/40 text-blue-200';
    }
    if (c.includes('cloud') || c.includes('fog') || c.includes('overcast')) {
      return 'from-slate-700/30 via-indigo-900/30 to-purple-900/30 border-indigo-500/40 text-indigo-200';
    }
    return 'from-amber-500/20 via-blue-600/20 to-purple-600/20 border-amber-500/30 text-amber-200';
  };

  return (
    <div className={`p-4 sm:p-6 rounded-3xl backdrop-blur-2xl border border-white/20 border-t-white/45 bg-gradient-to-br shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-300 relative overflow-hidden ${getWeatherColor(weather?.condition)}`}>
      {/* Top-edge specular glint */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent"></div>
      <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-white/[0.09] to-transparent pointer-events-none rounded-t-3xl"></div>

      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header bar: Badge, Report Export, Temperature Unit Toggle & Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 relative z-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider shadow-sm ${
            weather?.isCached
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              : weather
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full animate-pulse ${
              weather?.isCached ? 'bg-amber-400' : weather ? 'bg-emerald-400' : 'bg-rose-400'
            }`}></span>
            {weather?.isCached
              ? 'Cached Weather Report'
              : weather
                ? `Live Weather Report (${weather.source?.split(' ')[0] || 'Open-Meteo'})`
                : 'Weather Report Unavailable'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {weather && (
            <>
              <button
                onClick={handleCopyReport}
                className="text-xs px-2.5 py-1.5 bg-gray-800/70 hover:bg-gray-800 border border-gray-700 rounded-xl text-gray-200 hover:text-white transition-all flex items-center gap-1"
                title="Copy full weather report"
              >
                {copiedReport ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span className="hidden sm:inline">{copiedReport ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={handleDownloadPdfReport}
                className="text-xs px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-500 border border-indigo-400/40 rounded-xl text-white font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                title="Download PDF Event Weather Report"
              >
                <Download size={13} />
                <span>Export Report PDF</span>
              </button>
            </>
          )}

          {/* °C / °F Unit Switcher */}
          <div className="flex bg-gray-900/70 border border-gray-700/80 rounded-xl p-0.5 text-xs font-bold">
            <button
              onClick={() => setTempUnit('C')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                tempUnit === 'C' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              °C
            </button>
            <button
              onClick={() => setTempUnit('F')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                tempUnit === 'F' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              °F
            </button>
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="text-xs px-3 py-1.5 bg-gray-800/60 hover:bg-gray-800 border border-gray-700 rounded-xl text-gray-300 hover:text-white transition-all flex items-center gap-1.5"
            title="Refresh real-time weather report"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* City Search Bar & Quick Filters */}
      <div className="mb-6 space-y-3 relative z-10">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Generate weather report for any city (e.g. Hyderabad, Guntur, Mumbai, Delhi, London)..."
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-900/60 border border-gray-700/80 rounded-xl text-white placeholder-gray-400 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            {isSearching ? <RefreshCw size={13} className="animate-spin" /> : <Compass size={13} />}
            <span>Generate Report</span>
          </button>
        </form>

        {/* Quick Location Pills */}
        <div className="flex flex-wrap gap-1.5 text-xs">
          {popularCities.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => handleCitySelect(city)}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
                activePill.toLowerCase() === city.toLowerCase()
                  ? 'bg-blue-500 text-white border-blue-400 shadow-sm'
                  : 'bg-gray-800/50 hover:bg-gray-800 border-gray-700/70 text-gray-300 hover:text-white'
              }`}
            >
              {city === 'Current Location' ? '📍 My Location' : city}
            </button>
          ))}
        </div>
      </div>

      {/* Warning Banner if Cached or Error */}
      {errorMsg && (
        <div className="mb-4 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/35 text-amber-200 text-xs flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 rounded-lg bg-amber-500/30 hover:bg-amber-500/40 text-white font-semibold flex-shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Weather Display */}
      {loading ? (
        <div className="py-10 text-center animate-pulse space-y-3">
          <div className="h-6 w-36 bg-gray-700/50 rounded-full mx-auto"></div>
          <div className="h-10 w-28 bg-gray-700/50 rounded-xl mx-auto"></div>
          <p className="text-xs text-gray-400">Generating real-time meteorological report...</p>
        </div>
      ) : !weather ? (
        <div className="py-10 text-center space-y-3 bg-gray-900/40 rounded-2xl border border-gray-700/50 relative z-10">
          <AlertTriangle size={36} className="mx-auto text-amber-400" />
          <p className="text-sm font-semibold text-white">Could not load live weather report</p>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Weather servers could not be reached right now. Please verify your internet connection and retry.
          </p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5"
          >
            <RefreshCw size={13} /> Retry Weather Report
          </button>
        </div>
      ) : (
        <div className="space-y-6 relative z-10">

          {/* Current Temperature & Details Card */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-gray-900/40 p-5 rounded-2xl border border-gray-700/50">
            <div className="flex items-center gap-4">
              <span className="text-5xl drop-shadow-md select-none">{weather.icon || '☀️'}</span>
              <div>
                <div className="flex items-center gap-1.5 text-gray-300 text-sm font-semibold">
                  <MapPin size={15} className="text-rose-400 flex-shrink-0" />
                  <span>{weather.location || weather.city || 'Your Location'}</span>
                </div>
                <div className="text-4xl font-black text-white mt-0.5">
                  {formatTemp(weather.temperature)}
                </div>
                <div className="text-xs font-semibold text-blue-300 mt-0.5 flex flex-wrap items-center gap-2">
                  <span>{weather.condition}</span>
                  {weather.apparentTemperature !== undefined && (
                    <span className="text-gray-400 font-normal">
                      (Feels like {formatTemp(weather.apparentTemperature)})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Weather Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto">
              <div className="bg-gray-800/60 p-3 rounded-xl border border-gray-700/40 text-center">
                <div className="flex items-center justify-center gap-1 text-cyan-400 text-xs font-semibold">
                  <Droplets size={13} /> Humidity
                </div>
                <div className="text-lg font-bold text-white mt-0.5">{weather.humidity}%</div>
              </div>

              <div className="bg-gray-800/60 p-3 rounded-xl border border-gray-700/40 text-center">
                <div className="flex items-center justify-center gap-1 text-teal-400 text-xs font-semibold">
                  <Wind size={13} /> Wind
                </div>
                <div className="text-lg font-bold text-white mt-0.5">{weather.windSpeed} km/h</div>
              </div>

              <div className="bg-gray-800/60 p-3 rounded-xl border border-gray-700/40 text-center col-span-2 sm:col-span-1">
                <div className="flex items-center justify-center gap-1 text-sky-400 text-xs font-semibold">
                  <Umbrella size={13} /> Rain Prob.
                </div>
                <div className="text-lg font-bold text-white mt-0.5">{weather.rainChance ?? 0}%</div>
              </div>
            </div>
          </div>

          {/* Interactive Event Weather Report Card (Updates based on clicked day!) */}
          <div className="p-4 bg-indigo-950/50 border border-indigo-500/35 rounded-2xl space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <FileText size={14} className="text-indigo-400" />
                <span>
                  Event Weather Report — {activeDay ? `${activeDay.day}${activeDay.date ? ` (${activeDay.date})` : ''}` : 'Today'}
                </span>
              </div>
              {activeReportSuitability && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${activeReportSuitability.badgeClass}`}>
                  <ShieldCheck size={12} />
                  {activeReportSuitability.rating}
                </span>
              )}
            </div>

            {activeDay && (
              <div className="flex flex-wrap gap-4 text-xs text-gray-300 pt-1">
                <span>Condition: <strong className="text-white">{activeDay.condition}</strong></span>
                <span>Range: <strong className="text-white">{formatTemp(activeDay.tempMin)} – {formatTemp(activeDay.temp)}</strong></span>
                <span>Rain Risk: <strong className="text-cyan-300">{activeDay.rainChance ?? 0}%</strong></span>
                {activeDay.windMax !== undefined && (
                  <span>Peak Wind: <strong className="text-teal-300">{activeDay.windMax} km/h</strong></span>
                )}
              </div>
            )}

            <div className="text-xs text-indigo-200 flex items-start gap-2 pt-1">
              <Sparkles size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">Venue Advisory: </strong>
                {activeDay?.advice || weather.eventAdvisory}
              </span>
            </div>
          </div>

          {/* 7-Day Live Forecast Strip (Clickable to inspect Event Day Report) */}
          {weather.forecast && weather.forecast.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CloudSun size={14} className="text-blue-400" />
                  Event Day Forecast Report (Click any day for details)
                </span>
                <span className="text-[11px] text-gray-400">{weather.forecast.length}-Day Live Report</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {weather.forecast.map((dayItem, idx) => {
                  const isSelected = selectedDayIdx === idx;
                  return (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setSelectedDayIdx(idx)}
                      className={`p-3 rounded-2xl text-center transition-all duration-300 flex flex-col items-center justify-between gap-1 cursor-pointer border ${
                        isSelected
                          ? 'bg-blue-600/30 border-blue-400 ring-2 ring-blue-400/50 -translate-y-1 shadow-xl'
                          : 'bg-gray-900/50 hover:bg-gray-900/80 border-gray-700/40 hover:border-blue-500/50 hover:-translate-y-1 shadow-sm'
                      }`}
                    >
                      <span className="text-[11px] font-bold text-gray-200">{dayItem.day}</span>
                      <span className="text-2xl my-0.5">{dayItem.icon || '☀️'}</span>
                      <div className="text-xs font-bold text-white">
                        {formatTemp(dayItem.temp)}
                        {dayItem.tempMin !== undefined && (
                          <span className="text-gray-400 text-[10px] font-normal ml-1">
                            /{formatTemp(dayItem.tempMin)}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-300 truncate max-w-[85px]" title={dayItem.condition}>
                        {dayItem.condition}
                      </span>
                      {dayItem.rainChance !== undefined && (
                        <span className="text-[9px] text-cyan-300 font-semibold">
                          💧 {dayItem.rainChance}%
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Footer info */}
      <div className="mt-4 pt-3 border-t border-gray-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400 relative z-10">
        <span>Source: {weather?.source || 'Open-Meteo / wttr.in / MET Norway Multi-Source'}</span>
        <span className="text-emerald-400 font-semibold flex items-center gap-1">
          <CheckCircle2 size={12} />
          {weather?.generatedAt
            ? `Updated ${new Date(weather.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'Real-Time Sync'}
        </span>
      </div>

    </div>
  );
};

export default WeatherWidget;
