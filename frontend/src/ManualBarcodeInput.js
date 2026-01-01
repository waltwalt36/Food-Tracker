// ManualBarcodeInput.js
import React, { useState } from "react";

/**
 * Props:
 * - onLookup(barcode) : function called when user submits a barcode (string)
 * - disabled (optional) : boolean to disable input while scanning/lookup
 */
export default function ManualBarcodeInput({ onLookup, disabled = false }) {
  const [barcode, setBarcode] = useState("");
  const [error, setError] = useState(null);

  const clean = (s) => (s ? s.replace(/\D/g, "") : ""); // digits only
  const isValidBarcode = (s) => {
    // allow 12 (UPC-A) or 13 (EAN-13). Adjust if you support other lengths.
    return /^(?:\d{12}|\d{13})$/.test(s);
  };

  const submit = () => {
    setError(null);
    const cleaned = clean(barcode);
    if (!cleaned) {
      setError("Please enter digits for the barcode.");
      return;
    }
    if (!isValidBarcode(cleaned)) {
      setError("Barcode should be 12 (UPC) or 13 (EAN) digits.");
      return;
    }
    onLookup(cleaned);
    // optionally clear input after submit:
    setBarcode("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label htmlFor="manual-barcode" style={{ fontSize: 14 }}>
        Enter barcode
      </label>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          id="manual-barcode"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={13}
          placeholder="Scan or type barcode (12 or 13 digits)"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          style={{
            flex: 1,
            padding: "8px 12px",
            fontSize: 16,
            borderRadius: 6,
            border: "1px solid #ddd",
          }}
          aria-invalid={!!error}
        />
        <button
          onClick={submit}
          disabled={disabled}
          style={{
            padding: "8px 12px",
            fontSize: 16,
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Lookup
        </button>
      </div>

      {error && (
        <div role="alert" style={{ color: "crimson", fontSize: 13 }}>
          {error}
        </div>
      )}
    </div>
  );
}
