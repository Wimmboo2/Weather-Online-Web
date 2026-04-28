const axios = require('axios');

const API_KEY = process.env.OPENWEATHER_API_KEY;
const WEATHER_BASE = 'https://api.openweathermap.org/data/2.5';
const GEO_BASE = 'https://api.openweathermap.org/geo/1.0';

const assertApiKey = () => {
  const key = (API_KEY || '').trim();
  const looksPlaceholder =
    key.length === 0 ||
    key.toLowerCase().includes('your_openweathermap_api_key') ||
    key.toLowerCase().includes('your_api_key') ||
    key.toLowerCase().includes('placeholder');

  if (looksPlaceholder) {
    const error = new Error('Server is missing OPENWEATHER_API_KEY.');
    error.status = 500;
    throw error;
  }
};

const openWeather = axios.create({ timeout: 12000 });

const throwIfMissingData = (data, fallback = 'Invalid location') => {
  if (!data) {
    const error = new Error(fallback);
    error.status = 404;
    throw error;
  }
};

const currentByCity = async (city) => {
  assertApiKey();
  const response = await openWeather.get(`${WEATHER_BASE}/weather`, {
    params: { q: city, appid: API_KEY, units: 'metric' }
  });
  return response.data;
};

const forecastByCity = async (city) => {
  assertApiKey();
  const response = await openWeather.get(`${WEATHER_BASE}/forecast`, {
    params: { q: city, appid: API_KEY, units: 'metric' }
  });
  return response.data;
};

const currentByCoords = async (lat, lon) => {
  assertApiKey();
  const response = await openWeather.get(`${WEATHER_BASE}/weather`, {
    params: { lat, lon, appid: API_KEY, units: 'metric' }
  });
  return response.data;
};

const forecastByCoords = async (lat, lon) => {
  assertApiKey();
  const response = await openWeather.get(`${WEATHER_BASE}/forecast`, {
    params: { lat, lon, appid: API_KEY, units: 'metric' }
  });
  return response.data;
};

const reverseByCoords = async (lat, lon) => {
  assertApiKey();
  const response = await openWeather.get(`${GEO_BASE}/reverse`, {
    params: { lat, lon, limit: 1, appid: API_KEY }
  });

  const item = response.data?.[0];
  throwIfMissingData(item);

  const nameParts = [item.name, item.state, item.country].filter(Boolean);
  return {
    name: nameParts.join(', '),
    lat: item.lat,
    lon: item.lon
  };
};

module.exports = {
  currentByCity,
  forecastByCity,
  currentByCoords,
  forecastByCoords,
  reverseByCoords
};
