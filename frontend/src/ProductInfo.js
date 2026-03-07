import React, { useState } from 'react';
import { useAuth } from "./auth/AuthProvider";

/*
  ProductInfo
  - displays product nutriments
  - supports selecting servings and saving an entry to the backend
*/

const ProductInfo = ({ product, onAdded }) => {
    const { user } = useAuth();
    const [servings, setServings] = useState(1);
    const [loading, setLoading] = useState(false);

    if (!product) return null;

    const nutriments = product.nutriments || {};

    const fmt = (key, options = {}) => {
        const { mul = 1 } = options;
        const v = nutriments[key];
        if (v === undefined || v === null) return '0';
        const num = (typeof v === 'number') ? v : parseFloat(v);
        if (Number.isNaN(num)) return '0';
        const servingCount = Number(servings) || 1;
        const total = num * mul * servingCount;
        return `${Math.round(total * 100) / 100}`;
    };

    // parse a nutriment into a float (per single serving or per-100g value)
    const parseNut = (key, options = {}) => {
        const { mul = 1 } = options;
        const v = nutriments[key];
        if (v === undefined || v === null) return 0;
        const num = parseFloat(v);
        if (Number.isNaN(num)) return 0;
        return num * mul;
    };

const handleAddToDatabase = async () => {
    try {
    setLoading(true);

    const caloriesPerServing = parseFloat(nutriments['energy-kcal'] ?? nutriments['energy-kcal_100g'] ?? 0) || 0;
    const servingsNumber = Number(servings) || 0;

    // build entry using parsing helper; convert units where appropriate
    const totalFat = Math.round(parseNut('fat') * servingsNumber * 100) / 100;
    const satFat = Math.round(parseNut('saturated-fat') * servingsNumber * 100) / 100;
    const transFat = Math.round(parseNut('trans-fat') * servingsNumber * 100) / 100 || 0;
    const cholesterolMg = Math.round(parseNut('cholesterol', { mul: 1000 }) * servingsNumber * 100) / 100;
    const sodiumMg = Math.round(parseNut('sodium', { mul: 1000 }) * servingsNumber * 100) / 100;
    const carbsTotal = Math.round(parseNut('carbohydrates') * servingsNumber * 100) / 100;
    const fiberTotal = Math.round(parseNut('fiber') * servingsNumber * 100) / 100;
    const sugarsTotal = Math.round(parseNut('sugars') * servingsNumber * 100) / 100;
    const addedSugarsTotal = Math.round(parseNut('added-sugars') * servingsNumber * 100) / 100;
    const proteinTotal = Math.round(parseNut('proteins') * servingsNumber * 100) / 100;

    const entry = {
        product_name: product.product_name || product.product_name_en || 'Unnamed product',
        barcode: product.code || product._id || null,
        calories_per_serving: Math.round(caloriesPerServing),
        servings: servingsNumber,
        total_calories: Math.round(caloriesPerServing * servingsNumber),

        // macros/nutrients (multiplied by servings where appropriate)
        // include both simple field names expected by the backend and
        // descriptive keys (keeps backward compatibility)
        fat: totalFat,
        total_fat: totalFat,
        saturated_fat: satFat,
        trans_fat: transFat,
        cholesterol: cholesterolMg,
        cholesterol_mg: cholesterolMg,
        sodium: sodiumMg,
        sodium_mg: sodiumMg,
        carbs: carbsTotal,
        total_carbs: carbsTotal,
        fiber: fiberTotal,
        dietary_fiber: fiberTotal,
        sugars: sugarsTotal,
        total_sugars: sugarsTotal,
        added_sugars: addedSugarsTotal,
        protein: proteinTotal,
        protein_g: proteinTotal,
    };

    // use authFetch so Authorization header (Bearer token) is included
    const { authFetch } = await import('./api/auth'); // dynamic import path depends on your bundler
    const res = await authFetch('http://localhost:8000/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server error: ${res.status} ${text}`);
    }

    // parse created entry if backend returned it
    let createdEntryRaw = null;
    try {
        createdEntryRaw = await res.json();
        console.log("ProductInfo: createdEntryRaw from server:", createdEntryRaw);
    } catch (e) {
        console.warn("ProductInfo: failed to parse POST response as JSON", e);
    }

    // normalize keys to the shape DailySummary expects
    const normalizeEntry = (e) => {
    if (!e) return null;
        return {
            id: e.id ?? e._id ?? e.entry_id ?? null,
            timestamp: e.timestamp ?? e.created_at ?? e.createdAt ?? null,
            product_name: e.product_name ?? e.name ?? e.productName ?? "Unnamed",
            total_calories: e.total_calories ?? e.total_cals ?? e.calories ?? e.totalCalories ?? null,
            servings: e.servings ?? null,
            fat: e.fat ?? e.total_fat ?? null,
            carbs: e.carbs ?? e.total_carbs ?? null,
            protein: e.protein ?? e.protein_g ?? null,
            // keep original raw for debugging if needed:
            __raw: e,
        };
    };

    const createdEntry = normalizeEntry(createdEntryRaw);

    setLoading(false);
    alert('Added to daily calories!');

    console.log("entry saved, calling onAdded with normalized createdEntry:", createdEntry);
    // Notify parent to refresh DailySummary (and provide created entry if available)
    if (typeof onAdded === "function") {
        try {
            onAdded(createdEntry ?? null);
        } catch (err) {
            console.warn("onAdded callback failed:", err);
        }
    }
    } catch (err) {
        setLoading(false);
        console.error('Error saving entry:', err);
        alert('Could not save entry: ' + (err.message || err));
    }
};

  const row = (label, value, unit) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: 13, color: "var(--text-soft)" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{value} <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{unit}</span></span>
    </div>
  );

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 20 }}>
      <h3 style={{ margin: "0 0 4px", fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
        {product.product_name ?? 'Unnamed product'}
      </h3>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700, color: "var(--accent)", marginBottom: 16 }}>
        {fmt('energy-kcal')} <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 400 }}>kcal</span>
      </div>

      <div style={{ marginBottom: 16 }}>
        {row("Total Fat", fmt('fat'), "g")}
        {row("Saturated Fat", fmt('saturated-fat'), "g")}
        {row("Trans Fat", fmt('trans-fat'), "g")}
        {row("Cholesterol", fmt('cholesterol', { mul: 1000 }), "mg")}
        {row("Sodium", fmt('sodium', { mul: 1000 }), "mg")}
        {row("Total Carbs", fmt('carbohydrates'), "g")}
        {row("Dietary Fiber", fmt('fiber'), "g")}
        {row("Total Sugars", fmt('sugars'), "g")}
        {row("Added Sugars", fmt('added-sugars'), "g")}
        {row("Protein", fmt('proteins'), "g")}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-soft)" }}>
          Servings
          <input
            type="number"
            value={servings}
            min="0.1"
            step="0.1"
            onChange={(e) => setServings(e.target.value)}
            style={{
              width: 70,
              padding: "7px 10px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--text)",
              fontFamily: "var(--font-mono)",
              fontSize: 14,
            }}
          />
        </label>
        <button
          onClick={handleAddToDatabase}
          disabled={loading || !user}
          title={!user ? "Log in to save entries" : ""}
          style={{
            flex: 1,
            padding: "10px 0",
            fontSize: 14,
            fontWeight: 600,
            background: loading || !user ? "var(--surface-3)" : "var(--accent)",
            color: loading || !user ? "var(--text-muted)" : "#0A0A08",
            border: "none",
            borderRadius: 10,
            fontFamily: "var(--font-body)",
            letterSpacing: "0.01em",
          }}
        >
          {loading ? 'Saving…' : 'Add to Daily Calories'}
        </button>
      </div>

      {!user && (
        <div style={{ color: "var(--red)", marginTop: 10, fontSize: 13 }}>
          You must be logged in to save entries.
        </div>
      )}
    </div>
  );
};

export default ProductInfo;
