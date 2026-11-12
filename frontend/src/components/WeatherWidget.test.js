import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WeatherWidget from './WeatherWidget';

jest.mock('jspdf', () => ({
  jsPDF: jest.fn().mockImplementation(() => ({
    setFontSize: jest.fn(),
    setTextColor: jest.fn(),
    setDrawColor: jest.fn(),
    line: jest.fn(),
    text: jest.fn(),
    splitTextToSize: jest.fn((t) => [t]),
    save: jest.fn(),
  })),
}));

const mockOpenMeteoWeather = {
  current: {
    temperature_2m: 31.4,
    relative_humidity_2m: 54,
    apparent_temperature: 33.1,
    weather_code: 2,
    wind_speed_10m: 14.2,
  },
  daily: {
    time: ['2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18'],
    weather_code: [2, 61, 0, 1, 3, 80, 0],
    temperature_2m_max: [32, 27, 30, 31, 29, 26, 33],
    temperature_2m_min: [22, 20, 21, 21, 20, 19, 22],
    precipitation_probability_max: [10, 80, 5, 10, 20, 65, 0],
    wind_speed_10m_max: [15, 22, 12, 14, 18, 25, 11],
  },
};

describe('WeatherWidget', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: undefined,
    });

    global.fetch = jest.fn((url, options = {}) => {
      // Ensure NO Authorization header is ever attached to third-party APIs (prevents CORS 404 preflight)
      if (url.includes('open-meteo.com') || url.includes('wttr.in') || url.includes('bigdatacloud.net')) {
        expect(options.headers?.Authorization).toBeUndefined();
      }

      if (url.includes('geocoding-api.open-meteo.com')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            results: [{ name: 'Guntur', admin1: 'Andhra Pradesh', country: 'India', latitude: 16.3067, longitude: 80.4365 }]
          }),
        });
      }

      if (url.includes('api.open-meteo.com')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockOpenMeteoWeather),
        });
      }

      return Promise.reject(new Error('Unexpected URL'));
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders live weather report, supports C/F toggle and day inspection', async () => {
    render(<WeatherWidget />);

    await waitFor(() => {
      expect(screen.getAllByText('31°C').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('Partly Cloudy').length).toBeGreaterThan(0);
    expect(screen.getByText('54%')).toBeInTheDocument();
    expect(screen.getByText('14 km/h')).toBeInTheDocument();

    // Toggle to Fahrenheit
    fireEvent.click(screen.getByRole('button', { name: '°F' }));
    expect(screen.getAllByText('88°F').length).toBeGreaterThan(0);

    // Click Tomorrow (Rainy day: 80% rain probability) to inspect Event Weather Report
    fireEvent.click(screen.getByText('Tomorrow'));
    await waitFor(() => {
      expect(screen.getByText('Indoor Venue Recommended')).toBeInTheDocument();
    });

    // Search a city and verify clean geocoding + live report regeneration
    const input = screen.getByPlaceholderText(/Generate weather report for any city/i);
    fireEvent.change(input, { target: { value: 'Guntur' } });
    fireEvent.submit(input.closest('form'));

    await waitFor(() => {
      expect(screen.getByText('Guntur, Andhra Pradesh, India')).toBeInTheDocument();
    });
  });

  test('falls back to wttr.in when Open-Meteo is unreachable', async () => {
    global.fetch = jest.fn((url) => {
      if (url.includes('open-meteo.com') || url.includes('photon.komoot.io')) {
        return Promise.reject(new Error('Connection timed out'));
      }
      if (url.includes('wttr.in')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            current_condition: [{ temp_C: '29', FeelsLikeC: '31', humidity: '62', windspeedKmph: '18', weatherDesc: [{ value: 'Sunny' }] }],
            nearest_area: [{ areaName: [{ value: 'Mumbai' }], region: [{ value: 'Maharashtra' }], country: [{ value: 'India' }] }],
            weather: [
              { date: '2026-11-12', maxtempC: '31', mintempC: '24', hourly: [{ chanceofrain: '5', windspeedKmph: '18', weatherDesc: [{ value: 'Sunny' }] }] },
              { date: '2026-11-13', maxtempC: '30', mintempC: '23', hourly: [{ chanceofrain: '15', windspeedKmph: '14', weatherDesc: [{ value: 'Partly cloudy' }] }] },
            ]
          }),
        });
      }
      return Promise.reject(new Error('Offline'));
    });

    render(<WeatherWidget />);

    await waitFor(() => {
      expect(screen.getAllByText('29°C').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('Mumbai, Maharashtra, India')).toBeInTheDocument();
    expect(screen.getAllByText(/wttr\.in/i).length).toBeGreaterThan(0);
  });
});
