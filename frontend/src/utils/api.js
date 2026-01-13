// src/utils/api.js

export async function deleteEntry(id, token) {
  if (!id) {
    throw new Error("No entry id provided");
  }

  // normalize id to a plain string
  const plainId =
    typeof id === "object"
      ? id.$oid || id.id || id.toString()
      : String(id);

  const res = await fetch(`/api/entries/${encodeURIComponent(plainId)}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(`${res.status} ${JSON.stringify(body)}`);
  }

  return body;
}
