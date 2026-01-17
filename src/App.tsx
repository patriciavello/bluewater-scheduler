import { Routes, Route, Navigate } from "react-router-dom";
import SchedulerApp from "./SchedulerApp";
import AdminRouter from "./admin/AdminRouter";
import AdminLayout from "./admin/AdminLayout";
import UserAccount from "./UserAccount";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SchedulerApp />} />
      <Route path="/account" element={<UserAccount />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/admin" element={<AdminLayout />}>
       <Route path="*" element={<AdminRouter />} />
      </Route>

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
