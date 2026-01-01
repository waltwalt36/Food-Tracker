// src/auth/AuthProvider.js
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authFetch as defaultAuthFetch } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);            // user object or null
  const [loading, setLoading] = useState(true);      // whether we're checking session
  const [token, setTokenState] = useState(() => {
    try { return localStorage.getItem("access_token"); } catch { return null; }
  });

  // write token to localStorage and state
  const setToken = (newToken) => {
    if (newToken) {
      try { localStorage.setItem("access_token", newToken); } catch (e) {}
    } else {
      try { localStorage.removeItem("access_token"); } catch (e) {}
    }
    setTokenState(newToken);
  };

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
  }, []);

  // fetch current user from backend using authFetch
  const fetchMe = useCallback(async (fetcher = defaultAuthFetch) => {
    // debug statement
    console.log("fetchMe starting, token=", token);
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      setLoading(true);
      const res = await fetcher("/api/me", { method: "GET" });
      if (!res.ok) {
        // token invalid or expired
        setUser(null);
        setToken(null);
        setLoading(false);
        return null;
      }
      const data = await res.json();
      // adjust to how your backend returns user object
      const userObj = data.user ?? data;
      // debug statement
      console.log("fetchMe SUCCESS, user =", userObj);
      setUser(userObj);
      setLoading(false);
      return userObj;
    } catch (err) {
      console.error("fetchMe error:", err);
      setUser(null);
      setToken(null);
      setLoading(false);
      return null;
    }
  }, [token]);

  // run once on mount or whenever token changes
  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // loginWithToken: set the token *and then* immediately call fetchMe
  const loginWithToken = useCallback(async (newToken) => {
    setToken(newToken);
    // wait for fetchMe to validate token and populate user
    const u = await fetchMe();
    return u;
  }, [fetchMe]);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      setToken,
      setUser,
      loginWithToken,
      logout,
      fetchMe
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
