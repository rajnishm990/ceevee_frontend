import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "./auth/AuthContext";
import Layout from "./components/Layout";
import CoverLettersPage from "./pages/CoverLettersPage";
import Dashboard from "./pages/Dashboard";
import EditorPage from "./pages/EditorPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import SectionPage from "./pages/SectionPage";

function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <p className="page muted">Loading…</p>;
  return user ? <Layout /> : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<Protected />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/sections/:sectionId" element={<SectionPage />} />
        <Route path="/versions/:versionId/edit" element={<EditorPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/cover-letters" element={<CoverLettersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
