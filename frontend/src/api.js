import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 12000
});

export const getCurrentByCity = (city) =>
  api.get('/api/weather/current', { params: { city } });

export const getForecastByCity = (city) =>
  api.get('/api/weather/forecast', { params: { city } });

export const getCurrentByCoords = (lat, lon) =>
  api.get('/api/weather/coords', { params: { lat, lon } });

export const getForecastByCoords = (lat, lon) =>
  api.get('/api/weather/forecast-coords', { params: { lat, lon } });

export const reverseGeocode = (lat, lon) =>
  api.get('/api/weather/reverse-geocode', { params: { lat, lon } });

export default api;
