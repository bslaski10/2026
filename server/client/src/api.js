const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

export async function getDailyStats(dateStr) {
  const res = await fetch(`${API_BASE}/stats/${dateStr}`);
  if (!res.ok) throw new Error("Failed to load daily stats");
  return res.json();
}

export async function saveDailyStats(dateStr, payload) {
  const res = await fetch(`${API_BASE}/stats/${dateStr}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to save daily stats");
  return res.json();
}

export async function getYearTotals(year = 2026) {
  const res = await fetch(`${API_BASE}/totals?year=${year}`);
  if (!res.ok) throw new Error("Failed to load yearly totals");
  return res.json();
}

export async function getMonthlyTotals(year, month) {
  const res = await fetch(
    `${API_BASE}/monthly-totals?year=${year}&month=${month}`
  );
  if (!res.ok) throw new Error("Failed to load monthly totals");
  return res.json();
}
