import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

export function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <path d="M6 2h12l6 6v18H6z" fill="currentColor" opacity=".12" />
      <path d="M6 2h12l6 6v18H6z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M18 2v6h6" fill="none" stroke="#b4441f" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 14h9M10 18h9M10 22h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <>
      <header className="topbar">
        <NavLink to="/" className="brand"><BrandMark /><span className="brandtext">ceevee</span></NavLink>
        <nav aria-label="Main">
          <NavLink to="/" end>Resumes</NavLink>
          <NavLink to="/cover-letters">Cover letters</NavLink>
          <NavLink to="/profile">Your details</NavLink>
        </nav>
        <span className="spacer" />
        <span className="useremail">{user?.email}</span>
        <button className="ghost small" onClick={logout}>Log out</button>
      </header>
      <Outlet />
    </>
  );
}
