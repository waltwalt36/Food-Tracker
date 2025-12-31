// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import BarcodeScanner from "./BarcodeScanner";
import SignUp from "./components/SignUp";
import Login from "./components/Login";

function App(){
  return (
    <BrowserRouter>
      <header style={{display:"flex", gap:12, alignItems:"center"}}>
        <h1 style={{margin:0}}>Food Tracker</h1>
        <nav style={{marginLeft: "auto"}}>
          <Link to="/">Scan</Link> {" | "}
          <Link to="/login">Login</Link> {" | "}
          <Link to="/signup">Sign up</Link>
        </nav>
      </header>

      <main style={{padding:16}}>
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

