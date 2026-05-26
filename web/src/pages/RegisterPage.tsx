import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("nurse");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(name, email, password, role);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h1 style={styles.logo}>CareWatch</h1>
        <p style={styles.sub}>Aged Care Behaviour Monitoring</p>

        {error && <p style={styles.error}>{error}</p>}

        <label style={styles.label}>Full Name</label>
        <input
          style={styles.input}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          placeholder="John Doe"
        />

        <label style={styles.label}>Email</label>
        <input
          style={styles.input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="user@example.com"
        />

        <label style={styles.label}>Password</label>
        <input
          style={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Enter a strong password"
        />

        <label style={styles.label}>Role</label>
        <select
          style={styles.input}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="nurse">Nurse</option>
          <option value="clinician">Clinician</option>
          <option value="admin">Admin</option>
        </select>

        <button style={styles.btn} type="submit" disabled={loading}>
          {loading ? "Creating account…" : "Sign Up"}
        </button>

        <p style={styles.footer}>
          Already have an account? <Link to="/login" style={styles.link}>Sign In</Link>
        </p>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#EBF3FC",
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: 40,
    width: 360,
    boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
  },
  logo: { color: "#4A90D9", margin: 0, fontSize: 28, fontWeight: 800 },
  sub: { color: "#888", fontSize: 13, marginTop: 4, marginBottom: 28 },
  error: { color: "#e53935", background: "#fde8e8", padding: "10px 14px", borderRadius: 8, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 6 },
  input: {
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 15,
    marginBottom: 16,
    outline: "none",
  },
  btn: {
    background: "#4A90D9",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "12px 0",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 4,
  },
  footer: {
    fontSize: 13,
    color: "#666",
    marginTop: 16,
    textAlign: "center",
  },
  link: {
    color: "#4A90D9",
    textDecoration: "none",
    fontWeight: 600,
  },
};
