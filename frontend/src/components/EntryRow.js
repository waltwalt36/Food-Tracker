export default function EntryRow({ entry, isRemoving, onRemove }) {
  return (
    <li
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 14px",
        marginBottom: 6,
        borderRadius: 10,
        background: "var(--surface-2)",
        border: "1px solid var(--border-btn)",
        opacity: isRemoving ? 0.4 : 1,
        transition: "opacity 0.2s",
      }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>
          {entry.product_name ?? entry.name ?? "Unnamed"}
        </div>
        {entry.servings && (
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            {entry.servings} serving{entry.servings !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <div style={{ fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--accent)" }}>
          {Math.round(entry.total_calories ?? entry.calories ?? 0)} kcal
        </div>
        <button
          onClick={() => onRemove(entry)}
          disabled={isRemoving}
          style={{
            fontSize: 11,
            color: "var(--red)",
            background: "none",
            border: "none",
            padding: 0,
            fontFamily: "var(--font-body)",
          }}
        >
          {isRemoving ? "Removing…" : "Remove"}
        </button>
      </div>
    </li>
  );
}
