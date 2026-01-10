// src/components/DailySummary.js
import React, { useEffect, useState, useCallback } from "react";
import { authFetch } from "../api/auth";
import ProgressRing from "./ProgressRing";

/**
 * Props:
 * - dailyGoal (number): daily calorie goal, default 2000
 */
export default function DailySummary({ dailyGoal: dailyGoalProp = 2000, lastUpdated = 0, lastAddedEntry = null }) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState(null);

  // build YYYY-MM-DD in local time
  const buildTodayDate = () => {
    const t = new Date();
    const yyyy = t.getFullYear();
    const mm = String(t.getMonth() + 1).padStart(2, "0");
    const dd = String(t.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Helper: ms until next local midnight
    const msUntilNextMidnight = () => {
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        return tomorrow.getTime() - now.getTime();
    };
    // daily goal state (persist to localStorage)
  const LS_KEY = "foodtracker_daily_goal";
  const [dailyGoal, setDailyGoal] = useState(() => {
    try {
      const v = localStorage.getItem(LS_KEY);
      return v ? Number(v) : Number(dailyGoalProp || 2000);
    } catch {
      return Number(dailyGoalProp || 2000);
    }
  });
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(dailyGoal);

  // date tracked (updates at midnight)
  const [date, setDate] = useState(() => buildTodayDate());

  const fetchEntriesForToday = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const tzOffset = new Date().getTimezoneOffset();
      const res = await authFetch(`/api/entries?date=${date}&tz_offset=${tzOffset}`, {
        method: "GET",
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Failed: ${res.status}`);
      }
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : data.entries ?? []);
    } catch (err) {
      console.error("DailySummary fetch error:", err);
      setError(err.message || "Failed to load entries");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [date, lastUpdated]);

  useEffect(() => {
    fetchEntriesForToday();
    // optionally, poll every 30s? not enabled by default
     const id = setInterval(fetchEntriesForToday, 30_000);
     return () => clearInterval(id);
  }, [fetchEntriesForToday]);

  // ✅ OPTIMISTIC PREPEND: add newly-created entry immediately
    useEffect(() => {
        if (!lastAddedEntry) return;

        console.log("DailySummary: lastAddedEntry received:", lastAddedEntry);

        const exists = entries.some((e) => {
            if (!e) return false;

            const eId = e.id ?? e._id;
            const addedId = lastAddedEntry.id ?? lastAddedEntry._id;

            if (eId && addedId) return String(eId) === String(addedId);

            if (e.timestamp && lastAddedEntry.timestamp) {
                return e.timestamp === lastAddedEntry.timestamp;
            }

            return (
                e.product_name === lastAddedEntry.product_name &&
                Number(e.total_calories || e.calories || 0) ===
                    Number(lastAddedEntry.total_calories || lastAddedEntry.calories || 0)
            );
        });

        if (!exists) {
            console.log("DailySummary: prepending lastAddedEntry to entries");
            setEntries((prev) => [lastAddedEntry, ...prev]);
        } else {
            console.log("DailySummary: lastAddedEntry already exists");
        }
    }, [lastAddedEntry]);


  // totals (defensive: parse numbers)
  const totals = entries.reduce(
    (acc, e) => {
      const toNum = (v) => {
        if (v === undefined || v === null) return 0;
        const n = parseFloat(v);
        return Number.isNaN(n) ? 0 : n;
      };
      acc.calories += toNum(e.total_calories ?? e.calories ?? e.calories_per_serving * (e.servings ?? 1) ?? 0);
      acc.fat += toNum(e.fat ?? e.total_fat ?? 0);
      acc.carbs += toNum(e.carbs ?? e.total_carbs ?? 0);
      acc.protein += toNum(e.protein ?? e.protein_g ?? 0);
      return acc;
    },
    { calories: 0, fat: 0, carbs: 0, protein: 0 }
  );

  const progress = Math.min(1, totals.calories / (dailyGoal || 1));

  // --- Midnight reset logic: set a timeout to flip `date` at local midnight ---
  useEffect(() => {
    // clear existing timers on re-run
    let timerId = null;
    const schedule = () => {
      const ms = msUntilNextMidnight();
      // at midnight update date and trigger a refetch by updating date state
      timerId = setTimeout(() => {
        setDate(buildTodayDate());
        // after flipping date, schedule next midnight
        schedule();
      }, ms + 50); // +50ms buffer
    };
    schedule();
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, []); // run once on mount

  // --- Goal editing handlers (localStorage) ---
  const saveGoal = (newGoal) => {
    const parsed = Number(newGoal) || 0;
    setDailyGoal(parsed);
    setGoalInput(parsed);
    try {
      localStorage.setItem(LS_KEY, String(parsed));
    } catch (e) {
      console.warn("Failed to save daily goal to localStorage", e);
    }
    setEditingGoal(false);
  };

  const resetGoalToDefault = () => {
    const def = Number(dailyGoalProp || 2000);
    saveGoal(def);
  };

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
      {/* Progress column */}
      <div style={{ width: 140, textAlign: "center" }}>
        <ProgressRing radius={64} stroke={10} progress={progress}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {Math.round(totals.calories)}
            </div>
            <div style={{ fontSize: 12, color: "#666" }}>kcal</div>
          </div>
        </ProgressRing>

        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, color: "#666" }}>Goal</div>
          <div style={{ fontWeight: 600 }}>{dailyGoal} kcal</div>

          <div style={{ marginTop: 8 }}>
            {editingGoal ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="number"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  style={{ width: 80 }}
                />
                <button onClick={() => saveGoal(goalInput)}>Save</button>
                <button onClick={() => { setEditingGoal(false); setGoalInput(dailyGoal); }}>Cancel</button>
              </div>
            ) : (
              <div>
                <button onClick={() => setEditingGoal(true)}>Edit goal</button>
                <button onClick={resetGoalToDefault} style={{ marginLeft: 8 }}>Reset</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Macros & list column */}
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
          <div style={{ flex: 1, padding: 8, borderRadius: 8, background: "#fafafa", textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#666" }}>Protein</div>
            <div style={{ fontWeight: 700 }}>{Math.round(totals.protein)} g</div>
          </div>
          <div style={{ flex: 1, padding: 8, borderRadius: 8, background: "#fafafa", textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#666" }}>Carbs</div>
            <div style={{ fontWeight: 700 }}>{Math.round(totals.carbs)} g</div>
          </div>
          <div style={{ flex: 1, padding: 8, borderRadius: 8, background: "#fafafa", textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#666" }}>Fat</div>
            <div style={{ fontWeight: 700 }}>{Math.round(totals.fat)} g</div>
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <h4 style={{ margin: "6px 0" }}>Today’s items</h4>
          {loading ? (
            <div>Loading…</div>
          ) : error ? (
            <div style={{ color: "crimson" }}>{error}</div>
          ) : entries.length === 0 ? (
            <div style={{ color: "#666" }}>No items yet — scan or add a product.</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {entries.map((it) => (
                <li key={it.id ?? it._id ?? (it.timestamp || Math.random())} style={{ padding: 8, borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{it.product_name ?? it.name ?? "Unnamed"}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>
                      {it.servings ? `${it.servings} serving(s)` : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700 }}>{Math.round(it.total_calories ?? it.calories ?? 0)} kcal</div>
                    {/* optional: small remove button could go here */}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
