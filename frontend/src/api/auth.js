// src/api/auth.js
const API = process.env.REACT_APP_API_BASE || "http://localhost:8000";

export async function signup(email, password) {
  const res = await fetch(`${API}/api/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(payload.detail || "Signup failed");
  }
  return res.json();
}

export async function login(email, password) {
  const body = new URLSearchParams();
  body.append("username", email);
  body.append("password", password);

  const res = await fetch(`${API}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(payload.detail || "Login failed");
  }
  return res.json(); // { access_token, token_type }
}

export function saveToken(token) {
  try { localStorage.setItem("access_token", token); } catch {}
}

export function getToken() {
  return localStorage.getItem("access_token");
}

export function logout() {
  localStorage.removeItem("access_token");
}

export async function authFetch(url, options = {}) {
  const token = localStorage.getItem("access_token");
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const opts = {...options, headers};
  const absolute = url.startsWith("http") ? url : `http://localhost:8000${url}`;
  console.log("authFetch ->", opts.method || "GET", absolute);
  console.log("authFetch headers:", headers);
  if (opts.body) console.log("authFetch body preview:", typeof opts.body === 'string' ? opts.body.slice(0,1000) : opts.body);
  const resp = await fetch(absolute, opts);
  console.log("authFetch response status:", resp.status);
  return resp;
}
