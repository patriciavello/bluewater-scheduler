import React from "react";
import { Link } from "react-router-dom";

export default function PaymentCancelledPage() {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Payment cancelled</h1>
        <p style={styles.text}>
          Your card payment was not completed.
        </p>
        <p style={styles.text}>
          No reservation was created. You can go back and try again whenever you are ready.
        </p>

        <div style={styles.actions}>
          <Link to="/" style={styles.primaryLink}>
            Return to Schedule
          </Link>
          <Link to="/account" style={styles.link}>
            Go to My Account
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    background: "#f8fafc",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
  },
  card: {
    width: "100%",
    maxWidth: 560,
    background: "white",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 20px 60px rgba(0,0,0,0.10)",
    border: "1px solid #e5e7eb",
  },
  title: {
    margin: "0 0 12px 0",
    fontSize: 28,
  },
  text: {
    margin: "0 0 10px 0",
    color: "#475569",
    lineHeight: 1.5,
  },
  actions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 20,
  },
  primaryLink: {
    textDecoration: "none",
    padding: "10px 14px",
    borderRadius: 12,
    background: "#0f172a",
    color: "white",
    fontWeight: 700,
  },
  link: {
    textDecoration: "none",
    padding: "10px 14px",
    borderRadius: 12,
    background: "white",
    color: "#111827",
    border: "1px solid #d1d5db",
  },
};