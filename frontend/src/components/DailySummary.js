// src/components/DailySummary.js
import React, { useEffect, useState } from "react";
import { authFetch } from "../api/auth";
import ProgressRing from "./ProgressRing";

/**
 * Props:
 * - dailyGoal (number): daily calorie goal, default 2000
 */
export default function DailySummary({ dailyGoal = 2000, lastUpdated = 0, lastAddedEntry = null }) {
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

  const fetchEntriesForToday = async () => {
    try {
      setLoading(true);
      setError(null);
      const date = buildTodayDate();
      // debug statement
      console.log("[DailySummary] fetching entries for date:", date);
      const res = await authFetch(`/api/entries?date=${date}`, { method: "GET" });

      // Debug statement  
      console.log("[DailySummary] GET status:", res.status);

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Failed: ${res.status}`);
      }
      const data = await res.json();
      // debug statement
      console.log("[DailySummary] GET response data:", data);
      // expect an array of entries
      setEntries(Array.isArray(data) ? data : data.entries ?? []);
    } catch (err) {
      console.error("DailySummary fetch error:", err);
      setError(err.message || "Failed to load entries");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntriesForToday();
    // optionally, poll every 30s? not enabled by default
     const id = setInterval(fetchEntriesForToday, 30_000);
     return () => clearInterval(id);
  }, [lastUpdated]);

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
    }, [lastAddedEntry, entries]);


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
