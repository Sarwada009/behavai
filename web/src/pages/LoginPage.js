import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
export function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const login = useAuthStore((s) => s.login);
    const navigate = useNavigate();
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(email, password);
            navigate("/");
        }
        catch {
            setError("Invalid email or password.");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { style: styles.page, children: _jsxs("form", { onSubmit: handleSubmit, style: styles.card, children: [_jsx("h1", { style: styles.logo, children: "CareWatch" }), _jsx("p", { style: styles.sub, children: "Aged Care Behaviour Monitoring" }), error && _jsx("p", { style: styles.error, children: error }), _jsx("label", { style: styles.label, children: "Email" }), _jsx("input", { style: styles.input, type: "email", value: email, onChange: (e) => setEmail(e.target.value), required: true, autoFocus: true }), _jsx("label", { style: styles.label, children: "Password" }), _jsx("input", { style: styles.input, type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true }), _jsx("button", { style: styles.btn, type: "submit", disabled: loading, children: loading ? "Signing in…" : "Sign In" })] }) }));
}
const styles = {
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
};
