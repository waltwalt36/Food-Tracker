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
  localStorage.setItem("ft_token", token);
}

export function getToken() {
  return localStorage.getItem("ft_token");
}

export function logout() {
  localStorage.removeItem("ft_token");
}

export async function authFetch(url, opts = {}) {
  const token = localStorage.getItem('ft_token'); // adjust key if you use different key
  const headers = opts.headers ? { ...opts.headers } : {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...opts, headers });
  return res;
}