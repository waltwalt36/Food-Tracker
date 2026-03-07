// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import BarcodeScanner from "./BarcodeScanner";
import SignUp from "./components/SignUp";
import Login from "./components/Login";
import { Box, Container } from "@chakra-ui/react";
import { Flex, Heading, Button, Text } from "@chakra-ui/react";



const headerStyle = {
  display: "flex",
  alignItems: "center",
  padding: "0 32px",
  height: 60,
  borderBottom: "1px solid var(--border)",
  background: "rgba(10,10,8,0.85)",
  backdropFilter: "blur(12px)",
  position: "sticky",
  top: 0,
  zIndex: 100,
};

const logoStyle = {
  margin: 0,
  fontFamily: "var(--font-display)",
  fontSize: 18,
  fontWeight: 800,
  letterSpacing: "-0.03em",
  color: "var(--text)",
  textDecoration: "none",
};

const navLinkStyle = {
  color: "var(--text-soft)",
  textDecoration: "none",
  fontSize: 14,
  fontFamily: "var(--font-body)",
  fontWeight: 500,
  padding: "6px 14px",
  borderRadius: 8,
  border: "1px solid var(--border-btn)",
  transition: "background 0.15s, color 0.15s, border-color 0.15s",
};

const pillBtnStyle = {
  background: "var(--accent)",
  color: "#0A0A08",
  border: "1px solid rgba(245, 166, 35, 0.5)",
  borderRadius: 8,
  padding: "6px 16px",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "var(--font-body)",
  letterSpacing: "0.01em",
};

function App(){
  const { user, loading, logout } = useAuth();
  return (
    <BrowserRouter>
      <header style={headerStyle}>
        <Link to="/" style={logoStyle}>
          <span style={{ color: "var(--accent)" }}>food</span>tracker
        </Link>

        <nav style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
          {loading ? (
            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading…</span>
          ) : user ? (
            <>
              <span style={{ color: "var(--text-muted)", fontSize: 13, marginRight: 8 }}>
                {user.email}
              </span>
              <button onClick={logout} style={pillBtnStyle}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={navLinkStyle}>Login</Link>
              <Link
                to="/signup"
                style={{ ...navLinkStyle, background: "var(--accent-dim)", color: "var(--accent)", fontWeight: 600 }}
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<BarcodeScanner />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;

