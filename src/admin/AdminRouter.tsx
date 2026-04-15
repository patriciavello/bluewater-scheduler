import { Routes, Route, Navigate } from "react-router-dom";
import Admin from "../Admin";

export default function AdminRouter() {
  return (
    <Routes>
      <Route path="/" element={<Admin />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}