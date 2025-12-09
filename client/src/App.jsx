import React, { useEffect, useState } from "react";
import "./styles.css";
import {
  getDailyStats,
  saveDailyStats,
  getYearTotals,
  getMonthlyTotals,
} from "./api";

const METRICS = [
  {
    key: "steps",
    label: "Steps",
    dailyTarget: 7123,
    yearlyTarget: 2600000, // 2.6M
  },
  {
    key: "pushups",
    label: "Push-ups",
    dailyTarget: 71,
    yearlyTarget: 26000,
  },
  {
    key: "situps",
    label: "Sit-ups",
    dailyTarget: 71,
    yearlyTarget: 26000,
  },
  {
    key: "pullups",
    label: "Pull-ups",
    dailyTarget: 26,
    yearlyTarget: 26 * 365, // can tweak if you want
  },
  {
    key: "plankMinutes",
    label: "Planks (min)",
    dailyTarget: 4.3, // ~ 4m 16s
    yearlyTarget: 26 * 60,
  },
  {
    key: "gym",
    label: "Gym Days",
    dailyTarget: 1,
    yearlyTarget: 26 * 12,
  },
];

// Monthly target helper:
// - If you want custom per-month goals, add metric.monthlyTarget.
// - Otherwise default to yearly / 12.
function getMonthlyTarget(metric) {
  if (metric.monthlyTarget != null) return metric.monthlyTarget;
  if (metric.yearlyTarget) return metric.yearlyTarget / 12;
  return metric.dailyTarget * 30;
}

function parseYearMonth(dateStr) {
  const [y, m] = dateStr.split("-");
  return { year: y, month: m };
}

function App() {
  const [activePage, setActivePage] = useState("daily"); // "daily" | "monthly" | "totals"

  // Default selectedDate to today's real date (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });

  const [dailyStats, setDailyStats] = useState(null);
  const [totals, setTotals] = useState(null);
  const [monthlyTotals, setMonthlyTotals] = useState(null);

  const [loadingDaily, setLoadingDaily] = useState(false);
  const [loadingTotals, setLoadingTotals] = useState(false);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  const [error, setError] = useState("");

  // --- Load DAILY stats when date changes ---
  useEffect(() => {
    async function loadDaily() {
      setLoadingDaily(true);
      try {
        const data = await getDailyStats(selectedDate);
        setDailyStats(data);
        setError("");
      } catch (err) {
        console.error(err);
        setError("Could not load daily stats.");
      } finally {
        setLoadingDaily(false);
      }
    }

    loadDaily();
  }, [selectedDate]);

  // --- Load YEARLY totals whenever the selected year changes ---
  useEffect(() => {
    refreshTotals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  async function refreshTotals() {
    setLoadingTotals(true);
    try {
      const year = new Date(selectedDate).getFullYear();
      const data = await getYearTotals(year);
      setTotals(data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Could not load yearly totals.");
    } finally {
      setLoadingTotals(false);
    }
  }

  // --- Load MONTHLY totals whenever date changes (month) or after changes ---
  useEffect(() => {
    refreshMonthlyForDate(selectedDate);
  }, [selectedDate]);

  async function refreshMonthlyForDate(dateStr) {
    const { year, month } = parseYearMonth(dateStr);
    setLoadingMonthly(true);
    try {
      const data = await getMonthlyTotals(year, month);
      setMonthlyTotals(data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Could not load monthly totals.");
    } finally {
      setLoadingMonthly(false);
    }
  }

  // Add to a metric for the selected day
  async function handleIncrement(metric) {
    if (!dailyStats) return;

    const current = Number(dailyStats[metric.key] || 0);
    const input = window.prompt(
      `Add ${metric.label} for ${selectedDate}.\nCurrent: ${current}`,
      "0"
    );
    if (input === null) return;

    const delta = Number(input);
    if (Number.isNaN(delta) || delta === 0) return;

    const next = { date: selectedDate };
    METRICS.forEach((m) => {
      next[m.key] =
        m.key === metric.key
          ? current + delta
          : Number(dailyStats[m.key] || 0);
    });

    setDailyStats(next);

    try {
      await saveDailyStats(selectedDate, next);
      await refreshTotals();
      await refreshMonthlyForDate(selectedDate);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Could not save changes. Check your connection.");
    }
  }

  const currentYear = new Date(selectedDate).getFullYear();

  const title =
    activePage === "daily"
      ? `${currentYear} Daily Challenge`
      : activePage === "monthly"
      ? `${currentYear} Monthly Stats`
      : `${currentYear} Total Stats`;

  const subtitle =
    activePage === "daily"
      ? "Made by Brooks Slaski"
      : activePage === "monthly"
      ? "See this month’s progress"
      : "See progress towards yearly goals";

  const isLoading =
    (loadingDaily && activePage === "daily") ||
    (loadingMonthly && activePage === "monthly") ||
    (loadingTotals && activePage === "totals");

  return (
    <div className="app-root">
      <div className="app-card">
        <header className="app-header">
          <div className="header-left">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>

          <div className="header-right">
            <input
              className="date-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <div className="tab-toggle">
              <button
                className={
                  "tab-btn" + (activePage === "daily" ? " tab-btn-active" : "")
                }
                onClick={() => setActivePage("daily")}
              >
                Daily
              </button>
              <button
                className={
                  "tab-btn" +
                  (activePage === "monthly" ? " tab-btn-active" : "")
                }
                onClick={() => setActivePage("monthly")}
              >
                Monthly
              </button>
              <button
                className={
                  "tab-btn" + (activePage === "totals" ? " tab-btn-active" : "")
                }
                onClick={() => setActivePage("totals")}
              >
                Totals
              </button>
            </div>
          </div>
        </header>

        {error && <div className="error-banner">{error}</div>}

        {isLoading ? (
          <div className="loading">Loading...</div>
        ) : (
          <StatsGrid
            mode={activePage}
            metrics={METRICS}
            dailyStats={dailyStats}
            totals={totals}
            monthlyTotals={monthlyTotals}
            onIncrementMetric={handleIncrement}
          />
        )}
      </div>
    </div>
  );
}

// 2x3 grid for all modes
function StatsGrid({
  mode,
  metrics,
  dailyStats,
  totals,
  monthlyTotals,
  onIncrementMetric,
}) {
  // SPECIAL CASE: totals page should NOT show rings, just raw totals
  if (mode === "totals") {
    return (
      <div className="stats-grid">
        {metrics.map((metric) => {
          const rawValue = Number(totals?.[metric.key] || 0);

          return (
            <div className="total-card" key={metric.key}>
              <div className="total-label">{metric.label}</div>
              <div className="total-value">
                {rawValue.toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // DAILY + MONTHLY still use rings
  return (
    <div className="stats-grid">
      {metrics.map((metric) => {
        let rawValue = 0;
        let target = 1;

        if (mode === "daily") {
          rawValue = Number(dailyStats?.[metric.key] || 0);
          target = metric.dailyTarget;
        } else if (mode === "monthly") {
          rawValue = Number(monthlyTotals?.[metric.key] || 0);
          target = getMonthlyTarget(metric);
        }

        const percent = target > 0 ? Math.min(rawValue / target, 1) : 0;

        let valueText = "";
        if (mode === "daily") {
          valueText = `${Math.round(rawValue)}/${metric.dailyTarget}`;
        } else if (mode === "monthly") {
          valueText = `${Math.round(rawValue)}/${Math.round(target)}`;
        }

        const showPlus = mode === "daily";

        return (
          <ProgressRing
            key={metric.key}
            label={metric.label}
            percent={percent}
            valueText={valueText}
            onAddClick={showPlus ? () => onIncrementMetric(metric) : undefined}
          />
        );
      })}
    </div>
  );
}

// Single ring card
function ProgressRing({ label, percent, valueText, onAddClick }) {
  const radius = 42;
  const stroke = 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const clampedPercent = Math.max(0, Math.min(percent, 1));
  const strokeDashoffset = circumference * (1 - clampedPercent);
  const percentText = `${Math.round(clampedPercent * 100)}%`;

  return (
    <div className="ring-card">
      <div className="ring-svg-wrapper">
        <svg height={radius * 2} width={radius * 2}>
          <circle
            stroke="#163628"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            className="ring-progress"
            fill="transparent"
            strokeWidth={stroke}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            style={{
              strokeDasharray: `${circumference} ${circumference}`,
              strokeDashoffset,
            }}
          />
        </svg>
        <div className="ring-center">
          <div className="ring-value">{valueText}</div>
          <div className="ring-percent">{percentText}</div>
        </div>
      </div>
      <div className="ring-footer">
        <span className="ring-label">{label}</span>
        {onAddClick && (
          <button className="ring-add-btn" onClick={onAddClick}>
            +
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
