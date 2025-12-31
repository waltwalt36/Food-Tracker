// src/components/SignUp.jsx
import React, { useState } from "react";
import { signup, login, saveToken } from "../api/auth";
import { useNavigate } from "react-router-dom";

export default function SignUp(){
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(null);
  const nav = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(null);
    try {
      await signup(email, password);
      const { access_token } = await login(email, password);
      saveToken(access_token);
      nav("/"); // or /daily depending on your routes
    } catch (error) {
      setErr(error.message);
    }
  };

  return (
    <div className="auth-card">
      <h2>Create account</h2>
      <form onSubmit={onSubmit}>
        <label>Email</label>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <label>Password</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} maxLength={64}/>
        <button type="submit">Sign up</button>
        {err && <div style={{color:"red"}}>{err}</div>}
      </form>
    </div>
  );
}
