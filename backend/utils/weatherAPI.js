import axios from 'axios';

// WMO Weather code map for Open-Meteo
const WMO_CODE_MAP = {
  0: { condition: 'Clear', alert: null, suggestion: 'Ideal clear skies for outdoor event setups.' },
  1: { condition: 'Mainly Clear', alert: null, suggestion: 'Great conditions for outdoor activities.' },
  2: { condition: 'Partly Cloudy', alert: null, suggestion: 'Mild conditions; perfect for outdoor gatherings.' },
  3: { condition: 'Overcast', alert: null, suggestion: 'Cloudy; suitable for both indoor and outdoor events.' },
  45: { condition: 'Fog', alert: 'Morning fog expected 🌫️', suggestion: 'Plan travel times carefully.' },
  51: { condition: 'Drizzle', alert: 'Light drizzle expected 🌦️', suggestion: 'Have canopies or umbrella stands ready.' },
  53: { condition: 'Drizzle', alert: 'Drizzle expected 🌦️', suggestion: 'Ensure covered seating areas.' },
  55: { condition: 'Drizzle', alert: 'Heavy drizzle expected 🌧️', suggestion: 'Consider water-resistant flooring or tents.' },
  61: { condition: 'Rain', alert: 'Light rain expected 🌧️', suggestion: 'Provide rain covers or choose covered venue.' },
  63: { condition: 'Rain', alert: 'Rain expected 🌧️', suggestion: 'Indoor venue strongly recommended.' },
  65: { condition: 'Heavy Rain', alert: 'Heavy rain warning ⛈️', suggestion: 'Move event indoors to avoid disruption.' },
  71: { condition: 'Snow', alert: 'Snow expected ❄️', suggestion: 'Ensure heated venue and check roads.' },
  75: { condition: 'Heavy Snow', alert: 'Severe snow alert ❄️', suggestion: 'Indoor venue mandatory; ensure heating.' },
  80: { condition: 'Rain Showers', alert: 'Passing rain showers 🌦️', suggestion: 'Keep an indoor backup plan.' },
  82: { condition: 'Violent Showers', alert: 'Severe downpour alert ⛈️', suggestion: 'Indoor venue required.' },
  95: { condition: 'Thunderstorm', alert: 'Thunderstorm warning ⚡', suggestion: 'Reschedule outdoor activities or move indoors.' },
  96: { condition: 'Thunderstorm with Hail', alert: 'Severe storm alert with hail ⛈️', suggestion: 'Ensure safe indoor shelter.' },
  99: { condition: 'Severe Thunderstorm', alert: 'Dangerous storm alert ⛈️', suggestion: 'Emergency indoor shelter mandatory.' },
};

/**
 * Get 100% Free Weather Forecast via Open-Meteo (No API Key Required)
 */
export const getWeatherForecast = async (lat = 17.3850, lon = 78.4867, apiKey = null) => {
  try {
    // 1. Try 100% Free Open-Meteo API
    const response = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`,
      { timeout: 5000 }
    );
    return {
      source: 'Open-Meteo (Free)',
      isFree: true,
      ...response.data
    };
  } catch (openMeteoError) {
    // 2. Fallback to OpenWeatherMap if user has provided an API key
    if (apiKey && apiKey !== 'your-openweather-api-key') {
      try {
        const owResponse = await axios.get(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`,
          { timeout: 4000 }
        );
        return owResponse.data;
      } catch (owErr) {
        console.warn('OpenWeatherMap fallback failed:', owErr.message);
      }
    }
    console.error('Weather forecast API error:', openMeteoError.message);
    throw new Error('Failed to fetch weather forecast');
  }
};

/**
 * Get 100% Free Current Weather via Open-Meteo (No API Key Required)
 */
export const getCurrentWeather = async (lat = 17.3850, lon = 78.4867, apiKey = null) => {
  try {
    // 1. Try 100% Free Open-Meteo API
    const response = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`,
      { timeout: 5000 }
    );
    const cur = response.data?.current || {};
    const codeInfo = WMO_CODE_MAP[cur.weather_code] || { condition: 'Clear Sky' };

    return {
      source: 'Open-Meteo (Free)',
      temperature: Math.round(cur.temperature_2m || 25),
      condition: codeInfo.condition,
      humidity: cur.relative_humidity_2m || 65,
      windSpeed: Math.round(cur.wind_speed_10m || 10),
      raw: response.data
    };
  } catch (error) {
    if (apiKey && apiKey !== 'your-openweather-api-key') {
      try {
        const owResp = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
        );
        return {
          source: 'OpenWeatherMap',
          temperature: Math.round(owResp.data.main.temp),
          condition: owResp.data.weather?.[0]?.main || 'Clear',
          humidity: owResp.data.main.humidity,
          windSpeed: Math.round(owResp.data.wind.speed * 3.6),
          raw: owResp.data
        };
      } catch {}
    }
    throw new Error('Failed to fetch current weather');
  }
};

/**
 * Intelligent Event Weather Analysis
 */
export const analyzeWeatherForEvent = (forecast, eventDate) => {
  if (!eventDate) {
    return {
      condition: 'Clear',
      temperature: 26,
      alerts: [],
      suggestions: ['Check weather forecast closer to event date.'],
    };
  }

  const targetDateStr = new Date(eventDate).toISOString().split('T')[0];
  let condition = 'Clear';
  let temp = 26;
  let alerts = [];
  let suggestions = [];

  // Check Open-Meteo format daily forecast
  if (forecast?.daily?.time && Array.isArray(forecast.daily.time)) {
    const idx = forecast.daily.time.findIndex(t => t === targetDateStr);
    if (idx !== -1) {
      const code = forecast.daily.weather_code?.[idx] ?? 0;
      const codeInfo = WMO_CODE_MAP[code] || { condition: 'Clear Sky' };
      condition = codeInfo.condition;
      temp = Math.round(forecast.daily.temperature_2m_max?.[idx] || 26);

      if (codeInfo.alert) alerts.push(codeInfo.alert);
      if (codeInfo.suggestion) suggestions.push(codeInfo.suggestion);
    }
  } 
  // Check OpenWeatherMap format forecast list
  else if (forecast?.list && Array.isArray(forecast.list)) {
    const matched = forecast.list.find(item => {
      const d = new Date(item.dt * 1000).toISOString().split('T')[0];
      return d === targetDateStr;
    });
    if (matched) {
      condition = matched.weather?.[0]?.main || 'Clear';
      temp = Math.round(matched.main?.temp || 26);
    }
  }

  // General Temperature & Condition Alerts
  const condLower = condition.toLowerCase();
  if (condLower.includes('rain') || condLower.includes('drizzle') || condLower.includes('storm')) {
    if (!alerts.some(a => a.includes('rain') || a.includes('storm'))) {
      alerts.push('Precipitation expected on event day 🌧️');
      suggestions.push('Arrange rainproofing, tents, or indoor backup facility.');
    }
  } else if (temp > 35) {
    alerts.push('High temperature forecast (>35°C) 🔥');
    suggestions.push('Provide ample shade, cooling fans, and hydration stations for guests.');
  } else if (temp < 12) {
    alerts.push('Cold weather expected (<12°C) 🥶');
    suggestions.push('Provide indoor heating and warm refreshments.');
  } else {
    suggestions.push('Favorable weather conditions for planned activities!');
  }

  return {
    condition,
    temperature: temp,
    alerts,
    suggestions,
  };
};

export const getWeatherColorCode = (condition = '') => {
  const c = condition.toLowerCase();
  if (c.includes('rain') || c.includes('drizzle') || c.includes('snow') || c.includes('storm')) {
    return 'red';
  } else if (c.includes('cloud') || c.includes('fog')) {
    return 'yellow';
  } else {
    return 'green';
  }
};

export default {
  getWeatherForecast,
  getCurrentWeather,
  analyzeWeatherForEvent,
  getWeatherColorCode,
};
