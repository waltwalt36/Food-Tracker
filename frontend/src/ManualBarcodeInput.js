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
      <label htmlFor="manual-barcode" style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
        OR ENTER BARCODE MANUALLY
      </label>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          id="manual-barcode"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={13}
          placeholder="12 or 13 digit barcode"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          style={{
            flex: 1,
            padding: "11px 16px",
            fontSize: 15,
            borderRadius: "var(--radius)",
            border: "1px solid var(--border-btn)",
            background: "var(--surface)",
            color: "var(--text)",
            fontFamily: "var(--font-mono)",
            outline: "none",
            transition: "border-color 0.15s",
          }}
          onFocus={e => e.target.style.borderColor = "var(--accent)"}
          onBlur={e => e.target.style.borderColor = "var(--border)"}
          aria-invalid={!!error}
        />
        <button
          onClick={submit}
          disabled={disabled}
          style={{
            padding: "11px 20px",
            fontSize: 14,
            fontWeight: 600,
            borderRadius: "var(--radius)",
            border: "none",
            background: "var(--accent)",
            color: "#0A0A08",
            whiteSpace: "nowrap",
            fontFamily: "var(--font-body)",
          }}
        >
          Look up
        </button>
      </div>

      {error && (
        <div role="alert" style={{ color: "var(--red)", fontSize: 13 }}>
          {error}
        </div>
      )}
    </div>
  );
}
