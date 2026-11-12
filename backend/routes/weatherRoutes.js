import express from 'express';
import axios from 'axios';

const router = express.Router();

const KNOWN_CITIES = {
  hyderabad: { lat: 17.3850, lon: 78.4867, label: 'Hyderabad, Telangana, India' },
  guntur: { lat: 16.3067, lon: 80.4365, label: 'Guntur, Andhra Pradesh, India' },
  vijayawada: { lat: 16.5062, lon: 80.6480, label: 'Vijayawada, Andhra Pradesh, India' },
  visakhapatnam: { lat: 17.6868, lon: 83.2185, label: 'Visakhapatnam, Andhra Pradesh, India' },
  bangalore: { lat: 12.9716, lon: 77.5946, label: 'Bengaluru, Karnataka, India' },
  bengaluru: { lat: 12.9716, lon: 77.5946, label: 'Bengaluru, Karnataka, India' },
  mumbai: { lat: 19.0760, lon: 72.8777, label: 'Mumbai, Maharashtra, India' },
  delhi: { lat: 28.6139, lon: 77.2090, label: 'New Delhi, Delhi, India' },
  chennai: { lat: 13.0827, lon: 80.2707, label: 'Chennai, Tamil Nadu, India' },
  kolkata: { lat: 22.5726, lon: 88.3639, label: 'Kolkata, West Bengal, India' },
  pune: { lat: 18.5204, lon: 73.8567, label: 'Pune, Maharashtra, India' },
  tirupati: { lat: 13.6288, lon: 79.4192, label: 'Tirupati, Andhra Pradesh, India' },
  london: { lat: 51.5072, lon: -0.1276, label: 'London, United Kingdom' },
  'new york': { lat: 40.7128, lon: -74.0060, label: 'New York, United States' },
  tokyo: { lat: 35.6762, lon: 139.6503, label: 'Tokyo, Japan' },
  dubai: { lat: 25.2048, lon: 55.2708, label: 'Dubai, United Arab Emirates' },
  singapore: { lat: 1.3521, lon: 103.8198, label: 'Singapore' },
};

// WMO Weather Interpretation Code Map (Free Open-Meteo Standard)
const WMO_CODE_MAP = {
  0: { condition: 'Clear Sky', icon: '☀️', eventAdvice: 'Perfect sunny conditions for outdoor events.' },
  1: { condition: 'Mainly Clear', icon: '🌤️', eventAdvice: 'Great weather for outdoor activities.' },
  2: { condition: 'Partly Cloudy', icon: '⛅', eventAdvice: 'Pleasant and mild conditions for any gathering.' },
  3: { condition: 'Overcast', icon: '☁️', eventAdvice: 'Cloudy skies; suitable for both outdoor and indoor events.' },
  45: { condition: 'Foggy', icon: '🌫️', eventAdvice: 'Expect low morning visibility; plan travel accordingly.' },
  48: { condition: 'Depositing Rime Fog', icon: '🌫️', eventAdvice: 'Foggy and cool conditions.' },
  51: { condition: 'Light Drizzle', icon: '🌦️', eventAdvice: 'Light drizzle expected; prepare canopies or umbrellas.' },
  53: { condition: 'Moderate Drizzle', icon: '🌦️', eventAdvice: 'Drizzle likely; consider sheltered outdoor areas.' },
  55: { condition: 'Dense Drizzle', icon: '🌧️', eventAdvice: 'Wet ground expected; prefer indoor spaces or waterproof tents.' },
  61: { condition: 'Slight Rain', icon: '🌧️', eventAdvice: 'Rain likely; arrange waterproof tenting or covered venue.' },
  63: { condition: 'Moderate Rain', icon: '🌧️', eventAdvice: 'Rain expected; indoor venue strongly recommended.' },
  65: { condition: 'Heavy Rain', icon: '⛈️', eventAdvice: 'Heavy rain alert; move event indoors.' },
  71: { condition: 'Slight Snow', icon: '🌨️', eventAdvice: 'Cold snow conditions; ensure heating facilities.' },
  73: { condition: 'Moderate Snow', icon: '🌨️', eventAdvice: 'Snow expected; arrange indoor warming.' },
  75: { condition: 'Heavy Snow', icon: '❄️', eventAdvice: 'Severe cold alert; ensure warm indoor venue.' },
  80: { condition: 'Light Rain Showers', icon: '🌦️', eventAdvice: 'Passing showers; keep indoor backup option.' },
  81: { condition: 'Moderate Showers', icon: '🌧️', eventAdvice: 'Showers expected; plan rain protection.' },
  82: { condition: 'Violent Showers', icon: '⛈️', eventAdvice: 'Severe downpour alert; indoor venue required.' },
  95: { condition: 'Thunderstorm', icon: '⚡', eventAdvice: 'Thunderstorm warning; reschedule outdoor activities or stay indoors.' },
  96: { condition: 'Thunderstorm with Hail', icon: '⛈️', eventAdvice: 'Severe storm alert with hail; ensure safe indoor sheltering.' },
  99: { condition: 'Heavy Thunderstorm with Hail', icon: '⛈️', eventAdvice: 'Dangerous storm conditions; indoor shelter mandatory.' },
};

const getConditionInfo = (code) => {
  return WMO_CODE_MAP[code] || { condition: 'Partly Cloudy', icon: '⛅', eventAdvice: 'Normal event weather conditions.' };
};

const getDayName = (dateStr, index) => {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  try {
    const cleanDate = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`;
    const d = new Date(cleanDate);
    if (Number.isNaN(d.getTime())) return `Day ${index + 1}`;
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  } catch {
    return `Day ${index + 1}`;
  }
};

// GET /api/weather - Live Free Weather API via Open-Meteo / wttr.in (No API Key Required)
router.get('/', async (req, res) => {
  try {
    let { lat, lon, city } = req.query;
    let cityName = city || 'Your Location';
    const cityOnly = (city || '').split(',')[0].trim();

    // 1. If city name is provided without coordinates, resolve via Open-Meteo Geocoding or known lookup
    if (city && (!lat || !lon)) {
      try {
        const geoResp = await axios.get(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityOnly)}&count=1&language=en&format=json`,
          { timeout: 5000 }
        );
        if (geoResp.data?.results?.[0]) {
          const result = geoResp.data.results[0];
          lat = result.latitude;
          lon = result.longitude;
          cityName = [result.name, result.admin1, result.country].filter(Boolean).join(', ');
        }
      } catch (geoErr) {
        console.warn('Geocoding search failed, checking built-in lookup:', geoErr.message);
      }

      if ((!lat || !lon) && KNOWN_CITIES[cityOnly.toLowerCase()]) {
        const match = KNOWN_CITIES[cityOnly.toLowerCase()];
        lat = match.lat;
        lon = match.lon;
        cityName = match.label;
      }
    }

    const latitude = parseFloat(lat) || 17.3850;
    const longitude = parseFloat(lon) || 78.4867;
    if (!city && !req.query.lat) {
      cityName = 'Hyderabad, Telangana, India';
    }

    // 2. Primary: Open-Meteo API (Current + 7-Day Forecast)
    try {
      const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;
      const response = await axios.get(openMeteoUrl, { timeout: 6000 });
      const data = response.data;

      if (data && data.current) {
        const currentCode = data.current.weather_code ?? 0;
        const currentInfo = getConditionInfo(currentCode);

        const forecast = [];
        if (data.daily && Array.isArray(data.daily.time)) {
          data.daily.time.forEach((dateStr, idx) => {
            const code = data.daily.weather_code?.[idx] ?? 0;
            const dayInfo = getConditionInfo(code);
            forecast.push({
              day: getDayName(dateStr, idx),
              date: dateStr,
              temp: Math.round(data.daily.temperature_2m_max?.[idx] ?? data.current.temperature_2m),
              tempMin: Math.round(data.daily.temperature_2m_min?.[idx] ?? (data.current.temperature_2m - 4)),
              rainChance: Math.round(data.daily.precipitation_probability_max?.[idx] ?? 0),
              windMax: Math.round(data.daily.wind_speed_10m_max?.[idx] ?? data.current.wind_speed_10m ?? 10),
              condition: dayInfo.condition,
              icon: dayInfo.icon,
              advice: dayInfo.eventAdvice,
            });
          });
        }

        return res.json({
          success: true,
          source: 'Open-Meteo Free Weather API',
          isFree: true,
          city: cityName,
          location: cityName,
          coordinates: { lat: latitude, lon: longitude },
          temperature: Math.round(data.current.temperature_2m),
          apparentTemperature: Math.round(data.current.apparent_temperature ?? data.current.temperature_2m),
          condition: currentInfo.condition,
          icon: currentInfo.icon,
          humidity: Math.round(data.current.relative_humidity_2m),
          windSpeed: Math.round(data.current.wind_speed_10m),
          rainChance: forecast[0]?.rainChance ?? 0,
          eventAdvisory: currentInfo.eventAdvice,
          forecast: forecast.slice(0, 7),
        });
      }
    } catch (meteoErr) {
      console.warn('Open-Meteo API request failed, trying wttr.in fallback:', meteoErr.message);
    }

    // 3. Secondary: wttr.in JSON fallback
    try {
      const wttrTarget = cityOnly || `${latitude},${longitude}`;
      const wttrResp = await axios.get(`https://wttr.in/${encodeURIComponent(wttrTarget)}?format=j1`, { timeout: 6000 });
      const cur = wttrResp.data?.current_condition?.[0];
      if (cur) {
        const desc = cur.weatherDesc?.[0]?.value || 'Clear Sky';
        const forecast = (wttrResp.data.weather || []).slice(0, 7).map((w, idx) => ({
          day: getDayName(w.date, idx),
          date: w.date,
          temp: Math.round(Number(w.maxtempC)),
          tempMin: Math.round(Number(w.mintempC)),
          rainChance: Math.round(Math.max(...(w.hourly || []).map((h) => Number(h.chanceofrain || 0)), 0)),
          condition: w.hourly?.[4]?.weatherDesc?.[0]?.value || desc,
          icon: desc.toLowerCase().includes('rain') ? '🌧️' : desc.toLowerCase().includes('cloud') ? '⛅' : '☀️',
        }));

        return res.json({
          success: true,
          source: 'wttr.in Free Weather Service',
          isFree: true,
          city: cityName,
          location: cityName,
          coordinates: { lat: latitude, lon: longitude },
          temperature: Math.round(Number(cur.temp_C)),
          apparentTemperature: Math.round(Number(cur.FeelsLikeC ?? cur.temp_C)),
          condition: desc,
          icon: desc.toLowerCase().includes('rain') ? '🌧️' : desc.toLowerCase().includes('cloud') ? '⛅' : '☀️',
          humidity: Math.round(Number(cur.humidity ?? 60)),
          windSpeed: Math.round(Number(cur.windspeedKmph ?? 10)),
          rainChance: forecast[0]?.rainChance ?? 0,
          eventAdvisory: 'Check local cloud cover and arrange indoor backup if rain chance rises.',
          forecast,
        });
      }
    } catch (wttrErr) {
      console.warn('wttr.in fallback failed:', wttrErr.message);
    }

    // 4. Optional OpenWeatherMap if user configured an API key
    const openWeatherKey = process.env.OPENWEATHER_API_KEY;
    if (openWeatherKey && openWeatherKey !== 'your-openweather-api-key') {
      try {
        const owUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${openWeatherKey}&units=metric`;
        const owResp = await axios.get(owUrl, { timeout: 4000 });
        const owData = owResp.data;
        return res.json({
          success: true,
          source: 'OpenWeatherMap API',
          city: owData.name || cityName,
          location: owData.name || cityName,
          temperature: Math.round(owData.main.temp),
          condition: owData.weather?.[0]?.main || 'Clear',
          humidity: owData.main.humidity,
          windSpeed: Math.round(owData.wind.speed * 3.6),
          forecast: [
            { day: 'Today', temp: Math.round(owData.main.temp), condition: owData.weather?.[0]?.main || 'Clear' }
          ]
        });
      } catch {}
    }

    // Return clean 503 instead of returning fake numbers disguised as real weather
    return res.status(503).json({
      success: false,
      message: 'Live weather providers are currently unreachable from the server.'
    });
  } catch (error) {
    console.error('Weather route error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch weather data' });
  }
});

// GET /api/weather/forecast - Alias for multi-day forecast
router.get('/forecast', async (req, res) => {
  try {
    const { city, lat, lon } = req.query;
    const url = `/api/weather?${city ? `city=${encodeURIComponent(city)}` : `lat=${lat || 17.3850}&lon=${lon || 78.4867}`}`;
    res.redirect(url);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch forecast' });
  }
});

export default router;
