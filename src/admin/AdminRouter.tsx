import { Routes, Route, Navigate } from "react-router-dom";
import Admin from "../Admin";
import BoatsPage from "./pages/BoatsPage";

export default function AdminRouter() {
  return (
    <Routes>
      <Route path="boats" element={<BoatsPage />} />
      <Route path="reservations" element={<Admin />} />

      {/* default /admin -> go to reservations */}
      <Route path="/" element={<Navigate to="reservations" replace />} />

      {/* fallback */}
      <Route path="*" element={<Navigate to="reservations" replace />} />
    </Routes>
  );
}
