"use client";

import { useEffect, useState } from "react";

type WeatherInfo = {
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  precipitationProbability: number;
};

function weatherLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow / ice";
  if (code <= 82) return "Showers";
  if (code <= 99) return "Thunderstorms";
  return "Variable";
}

function readinessTip(info: WeatherInfo): string {
  if (info.precipitationProbability >= 60 || info.weatherCode >= 61) {
    return "Rain likely — confirm outdoor work and watch slick pond banks.";
  }
  if (info.tempMax >= 90) {
    return "Hot day — schedule water breaks and check irrigation stress.";
  }
  if (info.tempMax <= 45) {
    return "Cool conditions — prioritize frost-sensitive plant checks.";
  }
  if (info.weatherCode === 0) {
    return "Clear skies — good day for mowing and detail work.";
  }
  return "Monitor conditions and adjust blower / fertilizer timing as needed.";
}

/** Day readiness weather strip for Oxford, MS (Open-Meteo). */
export function ScheduleWeatherStrip({ today }: { today: string }) {
  const [info, setInfo] = useState<WeatherInfo | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const url =
          "https://api.open-meteo.com/v1/forecast?latitude=34.3665&longitude=-89.5192&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&timezone=America%2FChicago&forecast_days=1";
        const res = await fetch(url);
        if (!res.ok) throw new Error("weather fetch failed");
        const data = await res.json();
        if (cancelled) return;
        setInfo({
          tempMax: Math.round(data.daily.temperature_2m_max[0]),
          tempMin: Math.round(data.daily.temperature_2m_min[0]),
          weatherCode: Number(data.daily.weather_code[0]),
          precipitationProbability: Number(
            data.daily.precipitation_probability_max[0] ?? 0
          ),
        });
      } catch {
        if (!cancelled) setError(true);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [today]);

  if (error) {
    return (
      <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
        <p className="font-semibold">Today&apos;s Conditions — Oxford, MS</p>
        <p className="mt-1 text-sky-900/80">
          Weather feed unavailable. Check outdoor conditions before departure.
        </p>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900/70">
        Loading today&apos;s forecast for Oxford, MS…
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-emerald-50 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
            Day Readiness · Oxford, MS
          </p>
          <p className="mt-1 text-lg font-semibold text-green-950">
            Today: {weatherLabel(info.weatherCode)}, {info.tempMax}°F
            <span className="text-base font-normal text-stone-600">
              {" "}
              (low {info.tempMin}°F)
            </span>
          </p>
          <p className="mt-1 text-sm text-stone-700">{readinessTip(info)}</p>
        </div>
        <div className="rounded-lg border border-sky-200 bg-white/80 px-3 py-2 text-center text-sm">
          <p className="text-xs uppercase tracking-wide text-stone-500">
            Precip chance
          </p>
          <p className="text-xl font-bold text-sky-900">
            {info.precipitationProbability}%
          </p>
        </div>
      </div>
    </div>
  );
}
