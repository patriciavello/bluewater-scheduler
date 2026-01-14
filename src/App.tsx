import { Routes, Route, Navigate } from "react-router-dom";
import SchedulerApp from "./SchedulerApp";
import Admin from "./Admin";
import UserAccount from "./UserAccount";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SchedulerApp />} />
      <Route path="/account" element={<UserAccount />} />
      <Route path="/admin/*" element={<Admin />} />

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
