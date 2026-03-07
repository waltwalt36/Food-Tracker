// src/components/DailySummary.js
import React, { useEffect, useState, useCallback } from "react";
import deleteEntry from "../utils/api";
import { authFetch } from "../api/auth";
import ProgressRing from "./ProgressRing";
import EntryRow from "./EntryRow";


/**
 * Props:
 * - dailyGoal (number): daily calorie goal, default 2000
 */
export default function DailySummary({ dailyGoal: dailyGoalProp = 2000, lastUpdated = 0, lastAddedEntry = null }) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState(null);
  const [removingIds, setRemovingIds] = useState(new Set());


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
      const tzOffset = new Date().getTimezoneOffset(); // minutes

      const url = `/api/entries/?date=${encodeURIComponent(date)}&tz_offset=${encodeURIComponent(tzOffset)}&page_size=200`;
      console.log("fetchEntriesForToday -> GET", url);

      const res = await authFetch(url, {
        method: "GET",
        headers: { Accept: "application/json" }, // explicit, harmless
        cache: "no-store"
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

        console.log("DailySummary: evaluating lastAddedEntry for prepend:", lastAddedEntry);

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
            console.log("DailySummary: prepending lastAddedEntry to entries:", lastAddedEntry);
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

  // DailySummary.js
async function handleRemove(id) {
  // optimistic UI update
  setEntries(prev => prev.filter(e => e.id !== id));

  try {
    await deleteEntry(id); // your deleteEntry should throw on non-2xx
    console.log("handleRemove: delete confirmed for id", id);
    // optional: re-fetch to ensure server and client fully in sync
    // await fetchEntriesForToday();
  } catch (err) {
    console.error("handleRemove: delete failed, reverting UI:", err);
    // revert: re-fetch server state (safer than guessing)
    await fetchEntriesForToday();
    alert("Failed to delete item — refreshed list.");
  }
}


  const macroCard = { flex: 1, padding: "10px 8px", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--border-btn)", textAlign: "center" };

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border-btn)", borderRadius: "var(--radius-lg)", padding: 20 }}>
      <h3 style={{ margin: "0 0 16px", fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)" }}>
        Today’s Summary
      </h3>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* Progress column */}
        <div style={{ width: 130, textAlign: "center", flexShrink: 0 }}>
          <ProgressRing radius={64} stroke={10} progress={progress}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text)" }}>
                {Math.round(totals.calories)}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>kcal</div>
            </div>
          </ProgressRing>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>GOAL</div>
            <div style={{ fontWeight: 600, fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text)" }}>{dailyGoal}</div>

            <div style={{ marginTop: 8 }}>
              {editingGoal ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <input
                    type="number"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    style={{ width: "100%", padding: "6px 8px", background: "var(--surface-2)", border: "1px solid var(--border-btn)", borderRadius: 8, color: "var(--text)", fontFamily: "var(--font-mono)", fontSize: 13 }}
                  />
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => saveGoal(goalInput)} style={{ flex: 1, padding: "5px 0", fontSize: 12, background: "var(--accent)", color: "#0A0A08", border: "none", borderRadius: 6, fontWeight: 600 }}>Save</button>
                    <button onClick={() => { setEditingGoal(false); setGoalInput(dailyGoal); }} style={{ flex: 1, padding: "5px 0", fontSize: 12, background: "var(--surface-3)", color: "var(--text-muted)", border: "1px solid var(--border-btn)", borderRadius: 6 }}>✕</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                  <button onClick={() => setEditingGoal(true)} style={{ fontSize: 11, padding: "4px 8px", background: "var(--surface-3)", border: "1px solid var(--border-btn)", borderRadius: 6, color: "var(--text-soft)" }}>Edit</button>
                  <button onClick={resetGoalToDefault} style={{ fontSize: 11, padding: "4px 8px", background: "var(--surface-3)", border: "1px solid var(--border-btn)", borderRadius: 6, color: "var(--text-soft)" }}>Reset</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Macros & list column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <div style={macroCard}>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Protein</div>
              <div style={{ fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 15, color: "var(--text)" }}>{Math.round(totals.protein)}<span style={{ fontSize: 10, color: "var(--text-muted)" }}> g</span></div>
            </div>
            <div style={macroCard}>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Carbs</div>
              <div style={{ fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 15, color: "var(--text)" }}>{Math.round(totals.carbs)}<span style={{ fontSize: 10, color: "var(--text-muted)" }}> g</span></div>
            </div>
            <div style={macroCard}>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Fat</div>
              <div style={{ fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 15, color: "var(--text)" }}>{Math.round(totals.fat)}<span style={{ fontSize: 10, color: "var(--text-muted)" }}> g</span></div>
            </div>
          </div>

          <div>
            <h4 style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>TODAY’S ITEMS</h4>
            {loading ? (
              <div style={{ color: "var(--text-muted)", fontSize: 13, fontFamily: "var(--font-mono)" }}>Loading…</div>
            ) : error ? (
              <div style={{ color: "var(--red)", fontSize: 13 }}>{error}</div>
            ) : entries.length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No items yet — scan or add a product.</div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {entries.map((entry) => (
                  <EntryRow
                    key={entry.id ?? entry._id ?? entry.timestamp}
                    entry={entry}
                    isRemoving={removingIds.has(entry.id)}
                    onRemove={() => handleRemove(entry.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
