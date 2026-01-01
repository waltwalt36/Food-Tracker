// src/components/Login.jsx
import React, { useState } from "react";
import { login } from "../api/auth";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function Login(){
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(null);
  const nav = useNavigate();

  const { loginWithToken } = useAuth();

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(null);
    try {
      const { access_token } = await login(email, password);
      console.log("received access_token:", access_token);
      await loginWithToken(access_token);
      nav("/");
    } catch (error) {
      setErr(error.message);
    }
  };

  return (
    <div className="auth-card">
      <h2>Login</h2>
      <form onSubmit={onSubmit}>
        <label>Email</label>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <label>Password</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        <button type="submit">Sign in</button>
        {err && <div style={{color:"red"}}>{err}</div>}
      </form>
    </div>
  );
}
