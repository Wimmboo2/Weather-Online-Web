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

const markerIcon = new L.DivIcon({
  className: 'drop-marker-wrap',
  html: '<span class="drop-marker"></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 28]
});

function CountUp({ value, suffix = '', duration = 800 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = Number(value) || 0;
    const steps = 24;
    const interval = Math.max(20, Math.floor(duration / steps));
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep += 1;
      const progress = Math.min(1, currentStep / steps);
      setDisplay(Math.round(target * progress));
      if (progress >= 1) {
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [value, duration]);

  return (
    <span>
      {display}
      {suffix}
    </span>
  );
}

function WeatherGlyph({ condition }) {
  const c = (condition || '').toLowerCase();

  if (c.includes('rain') || c.includes('drizzle') || c.includes('thunderstorm')) {
    return (
      <svg viewBox="0 0 180 120" className="glyph glyph-rain" aria-hidden="true">
        <g className="cloud-group">
          <ellipse cx="72" cy="48" rx="30" ry="18" />
          <ellipse cx="102" cy="46" rx="28" ry="16" />
          <ellipse cx="88" cy="36" rx="24" ry="15" />
        </g>
        <g className="rain-lines">
          <line x1="60" y1="68" x2="52" y2="92" />
          <line x1="80" y1="70" x2="72" y2="96" />
          <line x1="100" y1="68" x2="92" y2="94" />
          <line x1="120" y1="70" x2="112" y2="97" />
        </g>
      </svg>
    );
  }

  if (c.includes('snow')) {
    return (
      <svg viewBox="0 0 180 120" className="glyph glyph-snow" aria-hidden="true">
        <g className="cloud-group">
          <ellipse cx="72" cy="48" rx="30" ry="18" />
          <ellipse cx="102" cy="46" rx="28" ry="16" />
          <ellipse cx="88" cy="36" rx="24" ry="15" />
        </g>
        <g className="snow-dots">
          <circle cx="62" cy="86" r="3" />
          <circle cx="82" cy="92" r="3" />
          <circle cx="102" cy="88" r="3" />
          <circle cx="122" cy="94" r="3" />
        </g>
      </svg>
    );
  }

  if (c.includes('cloud')) {
    return (
      <svg viewBox="0 0 180 120" className="glyph glyph-cloud" aria-hidden="true">
        <g className="cloud-group drift">
          <ellipse cx="72" cy="58" rx="30" ry="18" />
          <ellipse cx="102" cy="56" rx="28" ry="16" />
          <ellipse cx="88" cy="46" rx="24" ry="15" />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 180 120" className="glyph glyph-sun" aria-hidden="true">
      <g className="sun-rays">
        <line x1="90" y1="16" x2="90" y2="34" />
        <line x1="90" y1="80" x2="90" y2="98" />
        <line x1="56" y1="32" x2="68" y2="44" />
        <line x1="112" y1="76" x2="124" y2="88" />
        <line x1="42" y1="60" x2="60" y2="60" />
        <line x1="120" y1="60" x2="138" y2="60" />
        <line x1="56" y1="88" x2="68" y2="76" />
        <line x1="112" y1="44" x2="124" y2="32" />
      </g>
      <circle cx="90" cy="60" r="22" className="sun-core" />
    </svg>
  );
}

function MapSync({ marker, onMapClick, center }) {
  const map = useMapEvents({
    click: (event) => {
      onMapClick(event.latlng.lat, event.latlng.lng);
    }
  });

  useEffect(() => {
    map.flyTo([center.lat, center.lon], 8, { duration: 0.8 });
  }, [center, map]);

  return marker ? (
    <Marker
      key={marker.key}
      position={[marker.lat, marker.lon]}
      icon={markerIcon}
    />
  ) : null;
}

function LoadingSkeleton() {
  return (
    <div className="glass-card p-6">
      <div className="skeleton h-7 w-44" />
      <div className="mt-3 skeleton h-20 w-full" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="skeleton h-16" />
        <div className="skeleton h-16" />
      </div>
    </div>
  );
}

function MoodDecor({ weatherMain }) {
  const c = (weatherMain || '').toLowerCase();

  if (c.includes('rain')) {
    return <div className="mood-decor mood-rain" aria-hidden="true" />;
  }
  if (c.includes('clear')) {
    return <div className="mood-decor mood-sun" aria-hidden="true" />;
  }
  if (c.includes('cloud')) {
    return <div className="mood-decor mood-cloud" aria-hidden="true" />;
  }

  return <div className="mood-decor mood-default" aria-hidden="true" />;
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
    setMarker({ lat, lon, key: `${lat}-${lon}-${Date.now()}` });
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

  const timestamp = useMemo(() => {
    const now = new Date();
    return now.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [weather]);

  return (
    <main className={`app-shell ${weatherClass}`}>
      <div className="grain" aria-hidden="true" />
      <div className="lava" aria-hidden="true" />
      <div className="watercolor-blob" aria-hidden="true" />
      <MoodDecor weatherMain={weather?.weather?.[0]?.main} />

      <div className="page-wrap">
        <header className="glass-card top-card">
          <div className="title-row">
            <div>
              <h1 className="hero-title">Weather Online Web</h1>
            </div>
            <div className="mode-pill-wrap">
              <button
                onClick={() => setMode('search')}
                className={`mode-pill ${mode === 'search' ? 'active' : ''}`}
              >
                Search
              </button>
              <button
                onClick={() => setMode('map')}
                className={`mode-pill ${mode === 'map' ? 'active' : ''}`}
              >
                Map
              </button>
            </div>
          </div>

          <div className="search-row">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={mode === 'search' ? 'Type a city name...' : 'Click on the map to pick a location'}
              readOnly={mode === 'map'}
              className="search-input"
            />
            <div className={`mode-hint mode-search ${mode === 'search' ? 'show' : ''}`}>
              Debounced search is active.
            </div>
            <div className={`mode-hint mode-map ${mode === 'map' ? 'show' : ''}`}>
              Click anywhere on the map to fetch weather.
            </div>
          </div>
        </header>

        <section className="content-split">
          <article className="glass-card map-card">
            <div className="map-wrap">
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
          </article>

          <article className="stack-col">
            {loading && <LoadingSkeleton />}

            {!loading && error && (
              <div className="glass-card error-card">{error}</div>
            )}

            {!loading && weather && (
              <div key={weather.dt} className="glass-card weather-card reveal-card">
                <div className="weather-top">
                  <div>
                    <p className="meta-line">{timestamp}</p>
                    <h2 className="location-line">{weather.name}</h2>
                    <p className="hand-label">{weather.weather[0].description}</p>
                  </div>
                  <WeatherGlyph condition={weather.weather[0].main} />
                </div>

                <div className="temp-line">
                  <CountUp value={Math.round(weather.main.temp)} suffix="°C" />
                </div>

                <div className="stats-grid">
                  <div className="stat-card offset-a">
                    <p className="stat-label">Feels Like</p>
                    <p className="stat-value"><CountUp value={Math.round(weather.main.feels_like)} suffix="°C" /></p>
                  </div>
                  <div className="stat-card offset-b">
                    <p className="stat-label">Humidity</p>
                    <p className="stat-value"><CountUp value={weather.main.humidity} suffix="%" /></p>
                  </div>
                  <div className="stat-card offset-c">
                    <p className="stat-label">Wind</p>
                    <p className="stat-value"><CountUp value={Math.round(weather.wind.speed * 10)} suffix=" km/h" /></p>
                  </div>
                  <div className="stat-card offset-d">
                    <p className="stat-label">Condition</p>
                    <p className="stat-value">{weather.weather[0].main}</p>
                  </div>
                </div>
              </div>
            )}

            {!loading && forecast.length > 0 && (
              <div className="glass-card forecast-card">
                <div className="forecast-head">
                  <p className="meta-line">5-Day Film Strip</p>
                </div>
                <div className="forecast-strip">
                  {forecast.map((day) => (
                    <div key={day.date} className="forecast-frame">
                      <p className="forecast-day">{formatDay(day.date)}</p>
                      <p className="forecast-desc">{day.description}</p>
                      <p className="forecast-temp">{day.max}° / {day.min}°</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}
