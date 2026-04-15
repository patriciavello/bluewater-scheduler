import { Routes, Route, Navigate } from "react-router-dom";
import SchedulerApp from "./SchedulerApp";
import UserAccount from "./UserAccount";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import PaymentSuccessPage from "./PaymentSuccessPage";
import PaymentCancelledPage from "./PaymentCancelledPage";
import MaintenanceRequest from "./MaintenanceRequest";
import AdminLayout from "./admin/AdminLayout";
import Admin from "./Admin";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SchedulerApp />} />
      <Route path="/account" element={<UserAccount />} />
      <Route path="/maintenance/request" element={<MaintenanceRequest />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/payment-success" element={<PaymentSuccessPage />} />
      <Route path="/payment-cancelled" element={<PaymentCancelledPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Admin />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
