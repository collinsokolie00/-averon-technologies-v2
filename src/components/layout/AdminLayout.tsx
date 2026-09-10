import { useEffect, useState } from "react";
import { LogOut, PanelLeftClose, ShieldAlert } from "lucide-react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router";

import { adminNav } from "../../data/adminConfig";
import { logoutAdmin, watchAdminAuth, type AdminSession } from "../../utils/adminAuth";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [hasUser, setHasUser] = useState(false);
  const [session, setSession] = useState<AdminSession | null>(null);

  useEffect(() => {
    return watchAdminAuth(({ user, session: nextSession }) => {
      setHasUser(Boolean(user));
      setSession(nextSession);
      setLoading(false);
    });
  }, []);

  function handleLogout() {
    void logoutAdmin().finally(() => navigate("/admin/login", { replace: true }));
  }

  if (loading) {
    return <main className="admin-route-state">Verifying admin access...</main>;
  }

  if (!hasUser) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  if (!session) {
    return (
      <main className="admin-route-state">
        <ShieldAlert size={34} />
        <h1>Admin access required</h1>
        <p>This Firebase account is signed in, but it does not have an owner or admin custom claim.</p>
        <button className="admin-secondary-button" type="button" onClick={handleLogout}>
          <LogOut size={17} />
          Sign out
        </button>
      </main>
    );
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-mark">A</div>
          <div>
            <p>Averon</p>
            <strong>Admin V1</strong>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Admin navigation">
          {adminNav.map((item) => {
            const to = item.path ? `/admin/${item.path}` : "/admin";

            return (
              <NavLink key={to} to={to} end={to === "/admin"}>
                <item.icon size={17} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <div>
            <p>{session.role}</p>
            <strong>{session.name}</strong>
          </div>
          <button className="admin-icon-button" type="button" onClick={handleLogout} title="Sign out">
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="admin-eyebrow">Operations foundation</p>
            <h1>Averon Technologies Admin</h1>
          </div>
          <div className="admin-topbar-actions">
            <span>Firebase secured</span>
            <button className="admin-icon-button light" type="button" title="Navigation prepared for mobile">
              <PanelLeftClose size={17} />
            </button>
          </div>
        </header>

        <Outlet />
      </div>
    </div>
  );
}
