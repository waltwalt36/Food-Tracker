import React, { useState } from 'react';

/*
  ProductInfo
  - displays product nutriments
  - supports selecting servings and saving an entry to the backend
*/

const ProductInfo = ({ product }) => {
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

      const res = await fetch('http://localhost:8000/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server error: ${res.status} ${text}`);
      }

      setLoading(false);
      alert('Added to daily calories!');
    } catch (err) {
      setLoading(false);
      console.error('Error saving entry:', err);
      alert('Could not save entry: ' + (err.message || err));
    }
  };

  return (
    <div>
      <h3>{product.product_name ?? 'Unnamed product'}</h3>
      <p>Calories: {fmt('energy-kcal')} kcal</p>
      <p>Total Fat: {fmt('fat')} g</p>
      <p>Saturated Fat: {fmt('saturated-fat')} g</p>
      <p>Trans Fat: {fmt('trans-fat')} g</p>
      <p>Cholesterol: {fmt('cholesterol', { mul: 1000 })} mg</p>
      <p>Sodium: {fmt('sodium', { mul: 1000 })} mg</p>
      <p>Total Carbs: {fmt('carbohydrates')} g</p>
      <p>Dietary Fiber: {fmt('fiber')} g</p>
      <p>Total Sugars: {fmt('sugars')} g</p>
      <p>Added Sugars: {fmt('added-sugars')} g</p>
      <p>Protein: {fmt('proteins')} g</p>

      <div style={{ marginTop: 12 }}>
        <label>
          Servings:
          <input
            type="number"
            value={servings}
            min="0.1"
            step="0.1"
            onChange={(e) => setServings(e.target.value)}
            style={{ marginLeft: 8, width: 80 }}
          />
        </label>
        <button onClick={handleAddToDatabase} disabled={loading} style={{ marginLeft: 12 }}>
          {loading ? 'Saving...' : 'Add to Daily Calories'}
        </button>
      </div>
    </div>
  );
};

export default ProductInfo;
