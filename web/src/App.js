import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { usePresenceStore } from "./store/presenceStore";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { CamerasPage } from "./pages/CamerasPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { PatientDetailPage } from "./pages/PatientDetailPage";
import { PatientsPage } from "./pages/PatientsPage";
const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});
function NavBar() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const connected = usePresenceStore((s) => s.connected);
    const handleLogout = () => {
        logout();
        navigate("/login");
    };
    return (_jsxs("nav", { style: nav.bar, children: [_jsx(Link, { to: "/", style: nav.logo, children: "CareWatch" }), _jsxs("div", { style: nav.links, children: [_jsx(NavLink, { to: "/", end: true, style: ({ isActive }) => ({ ...nav.link, ...(isActive ? nav.linkActive : {}) }), children: "Dashboard" }), _jsx(NavLink, { to: "/patients", style: ({ isActive }) => ({ ...nav.link, ...(isActive ? nav.linkActive : {}) }), children: "Patients" }), _jsx(NavLink, { to: "/analytics", style: ({ isActive }) => ({ ...nav.link, ...(isActive ? nav.linkActive : {}) }), children: "Analytics" }), user?.role === "admin" && (_jsx(NavLink, { to: "/cameras", style: ({ isActive }) => ({ ...nav.link, ...(isActive ? nav.linkActive : {}) }), children: "Cameras" }))] }), _jsxs("div", { style: nav.right, children: [_jsx("span", { style: { ...nav.dot, background: connected ? "#4CAF50" : "#bbb" }, title: connected ? "Live" : "Offline" }), _jsx("span", { style: nav.userName, children: user?.name }), _jsx("button", { onClick: handleLogout, style: nav.logoutBtn, children: "Sign out" })] })] }));
}
function Layout({ children }) {
    return (_jsxs("div", { style: { minHeight: "100vh", background: "#F4F7FB" }, children: [_jsx(NavBar, {}), _jsx("main", { children: children })] }));
}
function AuthGuard({ children }) {
    const user = useAuthStore((s) => s.user);
    if (!user)
        return _jsx(Navigate, { to: "/login", replace: true });
    return _jsx(_Fragment, { children: children });
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
        if (user && token)
            connect(token);
        else
            disconnect();
    }, [user]);
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/", element: _jsx(AuthGuard, { children: _jsx(Layout, { children: _jsx(DashboardPage, {}) }) }) }), _jsx(Route, { path: "/patients", element: _jsx(AuthGuard, { children: _jsx(Layout, { children: _jsx(PatientsPage, {}) }) }) }), _jsx(Route, { path: "/patients/:id", element: _jsx(AuthGuard, { children: _jsx(Layout, { children: _jsx(PatientDetailPage, {}) }) }) }), _jsx(Route, { path: "/analytics", element: _jsx(AuthGuard, { children: _jsx(Layout, { children: _jsx(AnalyticsPage, {}) }) }) }), _jsx(Route, { path: "/cameras", element: _jsx(AuthGuard, { children: _jsx(Layout, { children: _jsx(CamerasPage, {}) }) }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }));
}
export default function App() {
    return (_jsx(QueryClientProvider, { client: queryClient, children: _jsx(BrowserRouter, { children: _jsx(AppRoutes, {}) }) }));
}
const nav = {
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
