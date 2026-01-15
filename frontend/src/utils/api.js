import { authFetch } from "../api/auth"; // adjust path if necessary

async function deleteEntry(entryOrId) {
  let entryId = entryOrId;
  if (typeof entryOrId === "object" && entryOrId !== null) {
    entryId = entryOrId.id ?? entryOrId._id ?? entryOrId.entryId;
    console.warn("deleteEntry: received object, derived id ->", entryId);
  }
  if (entryId === undefined || entryId === null) {
    throw new Error("deleteEntry: missing entryId");
  }

  const url = `/api/entries/${encodeURIComponent(entryId)}/`; // <-- trailing slash
  console.log("deleteEntry -> calling authFetch DELETE", url);

  const res = await authFetch(url, { method: "DELETE" });

  console.log("deleteEntry -> status", res.status, res.statusText);

  if (res.status === 204 || res.status === 200) return { success: true };

  const body = await res.text().catch(()=>null);
  console.error("deleteEntry -> failed:", res.status, body);
  const err = new Error(`Delete failed: ${res.status} ${body || ""}`);
  err.status = res.status;
  err.body = body;
  throw err;
}

export default deleteEntry;

