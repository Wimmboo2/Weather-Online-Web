import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  getCurrentByCity,
  getCurrentByCoords,
  getForecastByCity,
  getForecastByCoords,
  reverseGeocode
} from './api';
import { formatDay, getWeatherClass, toDailyForecast } from './weatherUtils';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

const DEFAULT_CENTER = { lat: 20, lon: 0 };

function MapSync({ marker, onMapClick, center }) {
  const map = useMapEvents({
    click: (event) => {
      onMapClick(event.latlng.lat, event.latlng.lng);
    }
  });

  useEffect(() => {
    map.flyTo([center.lat, center.lon], 8, { duration: 0.8 });
  }, [center, map]);

  return marker ? <Marker position={[marker.lat, marker.lon]} /> : null;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 rounded-2xl bg-black/20 p-6 backdrop-blur-sm">
      <div className="h-8 w-1/3 animate-pulseSlow rounded bg-white/30" />
      <div className="h-20 w-full animate-pulseSlow rounded bg-white/20" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-16 animate-pulseSlow rounded bg-white/20" />
        <div className="h-16 animate-pulseSlow rounded bg-white/20" />
      </div>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState('search');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [marker, setMarker] = useState(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 500);

    return () => clearTimeout(timeout);
  }, [search]);

  const applyWeather = (currentRes, forecastRes, nextLabel) => {
    const current = currentRes.data;
    const rawForecast = forecastRes.data;

    setWeather(current);
    setForecast(toDailyForecast(rawForecast.list));

    const lat = current.coord.lat;
    const lon = current.coord.lon;
    setMarker({ lat, lon });
    setMapCenter({ lat, lon });

    const resolvedLabel = nextLabel || current.name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    setSearch(resolvedLabel);
    setError('');
  };

  const fetchByCity = async (city) => {
    if (!city) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [currentRes, forecastRes] = await Promise.all([
        getCurrentByCity(city),
        getForecastByCity(city)
      ]);
      applyWeather(currentRes, forecastRes, currentRes.data.name);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to fetch weather for that city.');
    } finally {
      setLoading(false);
    }
  };

  const fetchByCoords = async (lat, lon, useReverse = true) => {
    // Coordinate-driven selection should behave as map mode so we don't
    // accidentally re-query by the reverse-geocoded label string.
    setMode('map');

    setLoading(true);
    setError('');

    try {
      const [currentRes, forecastRes, reverseRes] = await Promise.all([
        getCurrentByCoords(lat, lon),
        getForecastByCoords(lat, lon),
        useReverse ? reverseGeocode(lat, lon) : Promise.resolve({ data: {} })
      ]);

      const label = reverseRes.data?.name || currentRes.data?.name;
      applyWeather(currentRes, forecastRes, label);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to fetch weather for that location.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!debouncedSearch || mode !== 'search') {
      return;
    }
    fetchByCity(debouncedSearch);
  }, [debouncedSearch, mode]);

  useEffect(() => {
    if (!navigator.geolocation) {
      fetchByCity('London');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchByCoords(position.coords.latitude, position.coords.longitude, true);
      },
      () => {
        fetchByCity('London');
      },
      {
        enableHighAccuracy: true,
        timeout: 9000
      }
    );
  }, []);

  const weatherClass = useMemo(() => {
    return getWeatherClass(weather?.weather?.[0]?.main, weather?.weather?.[0]?.icon);
  }, [weather]);

  return (
    <main className={`min-h-screen transition-all duration-500 ${weatherClass}`}>
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 p-4 md:p-8">
        <header className="rounded-2xl bg-black/20 p-5 backdrop-blur-sm">
          <h1 className="text-3xl font-bold">Weather Online Web</h1>
          <p className="mt-1 text-sm text-white/80">Search by city or click anywhere on the map.</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setMode('search')}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                mode === 'search' ? 'bg-white text-slate-900' : 'bg-black/30 text-white'
              }`}
            >
              Search Bar
            </button>
            <button
              onClick={() => setMode('map')}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                mode === 'map' ? 'bg-white text-slate-900' : 'bg-black/30 text-white'
              }`}
            >
              Interactive Map
            </button>
          </div>

          <div className="mt-4">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={mode === 'search' ? 'Type a city name...' : 'Click on the map to pick a location'}
              readOnly={mode === 'map'}
              className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            />
            <p className="mt-2 text-xs text-white/75">
              {mode === 'search'
                ? 'Debounced search runs automatically after you stop typing.'
                : 'Map mode: click anywhere on the map to update weather and marker.'}
            </p>
          </div>
        </header>

        <section className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-[420px] overflow-hidden rounded-2xl border border-white/20 bg-black/20 backdrop-blur-sm lg:h-full">
            <MapContainer center={[mapCenter.lat, mapCenter.lon]} zoom={5} scrollWheelZoom className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapSync
                marker={marker}
                center={mapCenter}
                onMapClick={(lat, lon) => {
                  fetchByCoords(lat, lon, true);
                }}
              />
            </MapContainer>
          </div>

          <div className="space-y-4">
            {loading && <LoadingSkeleton />}

            {!loading && error && (
              <div className="rounded-2xl border border-red-300/30 bg-red-500/20 p-4 text-sm text-red-100">
                {error}
              </div>
            )}

            {!loading && weather && (
              <div className="rounded-2xl bg-black/20 p-6 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">{weather.name}</h2>
                    <p className="capitalize text-white/80">{weather.weather[0].description}</p>
                  </div>
                  <img
                    src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`}
                    alt={weather.weather[0].description}
                    className="h-20 w-20"
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-black/25 p-3">Temp: {Math.round(weather.main.temp)}°C</div>
                  <div className="rounded-xl bg-black/25 p-3">Feels: {Math.round(weather.main.feels_like)}°C</div>
                  <div className="rounded-xl bg-black/25 p-3">Humidity: {weather.main.humidity}%</div>
                  <div className="rounded-xl bg-black/25 p-3">Wind: {weather.wind.speed} m/s</div>
                </div>
              </div>
            )}

            {!loading && forecast.length > 0 && (
              <div className="rounded-2xl bg-black/20 p-6 backdrop-blur-sm">
                <h3 className="mb-3 text-lg font-semibold">5-Day Forecast</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {forecast.map((day) => (
                    <div key={day.date} className="rounded-xl bg-black/25 p-3">
                      <p className="font-semibold">{formatDay(day.date)}</p>
                      <p className="capitalize text-sm text-white/80">{day.description}</p>
                      <p className="text-sm">H: {day.max}°C / L: {day.min}°C</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
