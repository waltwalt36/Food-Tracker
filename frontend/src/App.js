// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import BarcodeScanner from "./BarcodeScanner";
import SignUp from "./components/SignUp";
import Login from "./components/Login";
import { Box, Container } from "@chakra-ui/react";
import { Flex, Heading, Button } from "@chakra-ui/react";



function App(){
  const { user, loading, logout } = useAuth();
  return (
    <Box minH="100vh" bg="gray.50">
      <BrowserRouter>
        <Container maxW="container.md" py={4}>
          <header style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <h1 style={{ margin: 0 }}>Food Tracker</h1>

            <nav style={{ marginLeft: "auto" }}>
              <Link to="/">Scan</Link>

              {loading ? (
                <span style={{ marginLeft: 12 }}>Checking session…</span>
              ) : user ? (
                <>
                  <span style={{ marginLeft: 12 }}>
                    Logged in as <strong>{user.email}</strong>
                  </span>
                  <button onClick={logout} style={{ marginLeft: 8 }}>
                    Logout
                  </button>
                </>
              ) : (
                <>
                  {" | "}
                  <Link to="/login">Login</Link>
                  {" | "}
                  <Link to="/signup">Sign up</Link>
                </>
              )}
            </nav>
          </header>

          <main style={{ padding: 16 }}>
            <Routes>
              <Route path="/" element={<BarcodeScanner />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
            </Routes>
          </main>
        </Container>
      </BrowserRouter>
    </Box>
  );
}

export default App;

