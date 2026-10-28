import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <>
      <header className="topbar">
        <strong>ceevee</strong>
        <nav>
          <NavLink to="/" end>Sections</NavLink>
          <NavLink to="/profile">Profile</NavLink>
          <NavLink to="/cover-letters">Cover letters</NavLink>
        </nav>
        <span className="spacer" />
        <span className="muted">{user?.email}</span>
        <button className="small" onClick={logout}>Log out</button>
      </header>
      <main className="page"><Outlet /></main>
    </>
  );
}
