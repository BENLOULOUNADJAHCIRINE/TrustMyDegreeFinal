import styles from "./ForgotPassword.module.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { toast } from "react-hot-toast";

function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [matricule, setMatricule] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSendCode(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { matricule });
      setMaskedEmail(res.data.maskedEmail);
      toast.success("Code sent to your email!");
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || "Matricule not found");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/verify-reset-code", { matricule, code });
      toast.success("Code verified!");
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { matricule, code, newPassword });
      toast.success("Password changed successfully!");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {step === 1 && (
          <form onSubmit={handleSendCode}>
            <h2 className={styles.title}>Forgot Password</h2>
            <p className={styles.subtitle}>
              Enter your matricule and we'll send a code to your registered
              email
            </p>
            <label className={styles.label}>Matricule</label>
            <input
              type="text"
              required
              value={matricule}
              onChange={(e) => setMatricule(e.target.value)}
              placeholder="e.g. 2A-IA-2024-045"
              className={styles.input}
            />
            <button type="submit" disabled={loading} className={styles.btn}>
              {loading ? "Sending..." : "Send Code"}
            </button>
            <p className={styles.link} onClick={() => navigate("/login")}>
              Back to Login
            </p>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyCode}>
            <h2 className={styles.title}>Enter Code</h2>
            <p className={styles.subtitle}>
              We sent a 6-digit code to <strong>{maskedEmail}</strong>
            </p>
            <label className={styles.label}>6-digit Code</label>
            <input
              type="text"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className={`${styles.input} ${styles.codeInput}`}
            />
            <button type="submit" disabled={loading} className={styles.btn}>
              {loading ? "Verifying..." : "Verify Code"}
            </button>
            <p
              className={styles.subtitle}
              style={{ textAlign: "center", marginTop: "16px" }}
            >
              Didn't receive it?{" "}
              <span className={styles.link} onClick={() => setStep(1)}>
                Resend
              </span>
            </p>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword}>
            <h2 className={styles.title}>New Password</h2>
            <p className={styles.subtitle}>Choose a strong new password</p>
            <label className={styles.label}>New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className={styles.input}
            />
            <label className={styles.label}>Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className={styles.input}
            />
            <button type="submit" disabled={loading} className={styles.btn}>
              {loading ? "Saving..." : "Change Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
