export default function EntryRow({ entry, isRemoving, onRemove }) {
  return (
    <li
      className="flex justify-between items-center p-3 border-b"
      style={{ opacity: isRemoving ? 0.5 : 1 }}
    >
      <div>
        <div style={{ fontWeight: 600 }}>
          {entry.product_name ?? entry.name ?? "Unnamed"}
        </div>
        {entry.servings && (
          <div style={{ fontSize: 12, color: "#666" }}>
            {entry.servings} serving(s)
          </div>
        )}
      </div>

      <div style={{ textAlign: "right" }}>
        <div style={{ fontWeight: 700 }}>
          {Math.round(entry.total_calories ?? entry.calories ?? 0)} kcal
        </div>

        <button
          onClick={() => onRemove(entry)}
          disabled={isRemoving}
          style={{
            marginTop: 6,
            fontSize: 12,
            color: "crimson",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          {isRemoving ? "Removing…" : "Remove"}
        </button>
      </div>
    </li>
  );
}
