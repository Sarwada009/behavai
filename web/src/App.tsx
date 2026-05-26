import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useEffect } from "react";
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { usePresenceStore } from "./store/presenceStore";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { CamerasPage } from "./pages/CamerasPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { PatientDetailPage } from "./pages/PatientDetailPage";
import { PatientsPage } from "./pages/PatientsPage";
import { TestEmotionPage } from "./pages/TestEmotionPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function NavBar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const connected = usePresenceStore((s) => s.connected);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav style={nav.bar}>
      <Link to="/" style={nav.logo}>BehavAI</Link>
      <div style={nav.links}>
        <NavLink to="/" end style={({ isActive }) => ({ ...nav.link, ...(isActive ? nav.linkActive : {}) })}>
          Dashboard
        </NavLink>
        <NavLink to="/patients" style={({ isActive }) => ({ ...nav.link, ...(isActive ? nav.linkActive : {}) })}>
          Patients
        </NavLink>
        <NavLink to="/analytics" style={({ isActive }) => ({ ...nav.link, ...(isActive ? nav.linkActive : {}) })}>
          Analytics
        </NavLink>
        {user?.role === "admin" && (
          <NavLink to="/cameras" style={({ isActive }) => ({ ...nav.link, ...(isActive ? nav.linkActive : {}) })}>
            Cameras
          </NavLink>
        )}
      </div>
      <div style={nav.right}>
        <span style={{ ...nav.dot, background: connected ? "#4CAF50" : "#bbb" }} title={connected ? "Live" : "Offline"} />
        <span style={nav.userName}>{user?.name}</span>
        <button onClick={handleLogout} style={nav.logoutBtn}>Sign out</button>
      </div>
    </nav>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F4F7FB" }}>
      <NavBar />
      <main>{children}</main>
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const { connect, disconnect } = usePresenceStore();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (user && token) connect(token);
    else disconnect();
  }, [user]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<AuthGuard><Layout><DashboardPage /></Layout></AuthGuard>} />
      <Route path="/patients" element={<AuthGuard><Layout><PatientsPage /></Layout></AuthGuard>} />
      <Route path="/patients/:id" element={<AuthGuard><Layout><PatientDetailPage /></Layout></AuthGuard>} />
      <Route path="/analytics" element={<AuthGuard><Layout><AnalyticsPage /></Layout></AuthGuard>} />
      <Route path="/cameras" element={<AuthGuard><Layout><CamerasPage /></Layout></AuthGuard>} />
      <Route path="/test-emotion" element={<AuthGuard><Layout><TestEmotionPage /></Layout></AuthGuard>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

const nav: Record<string, React.CSSProperties> = {
  bar: {
    background: "#4A90D9", padding: "0 32px", height: 56,
    display: "flex", alignItems: "center", justifyContent: "space-between",
  },
  logo: { color: "#fff", fontWeight: 800, fontSize: 20, textDecoration: "none" },
  links: { display: "flex", gap: 8 },
  link: { color: "rgba(255,255,255,0.75)", textDecoration: "none", padding: "6px 14px", borderRadius: 6, fontSize: 14, fontWeight: 600 },
  linkActive: { background: "rgba(255,255,255,0.2)", color: "#fff" },
  right: { display: "flex", alignItems: "center", gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, display: "inline-block" },
  userName: { color: "rgba(255,255,255,0.85)", fontSize: 14 },
  logoutBtn: {
    background: "rgba(255,255,255,0.2)", border: "none", color: "#fff",
    borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 14,
  },
};
