export const getWeatherClass = (weatherMain, iconCode) => {
  const main = (weatherMain || '').toLowerCase();
  const isNight = iconCode?.endsWith('n');

  if (main.includes('clear')) {
    return isNight ? 'weather-bg-clear-night' : 'weather-bg-clear-day';
  }
  if (main.includes('rain') || main.includes('drizzle') || main.includes('thunderstorm')) {
    return 'weather-bg-rain';
  }
  if (main.includes('cloud')) {
    return 'weather-bg-clouds';
  }
  if (main.includes('snow')) {
    return 'weather-bg-snow';
  }

  return 'weather-bg-default';
};

export const toDailyForecast = (list = []) => {
  const grouped = list.reduce((acc, item) => {
    const date = item.dt_txt.split(' ')[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(item);
    return acc;
  }, {});

  return Object.entries(grouped)
    .slice(0, 5)
    .map(([date, entries]) => {
      const temps = entries.map((entry) => entry.main.temp);
      const weather = entries[Math.floor(entries.length / 2)].weather[0];

      return {
        date,
        min: Math.round(Math.min(...temps)),
        max: Math.round(Math.max(...temps)),
        main: weather.main,
        description: weather.description,
        icon: weather.icon
      };
    });
};

export const formatDay = (dateString) =>
  new Date(dateString).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
