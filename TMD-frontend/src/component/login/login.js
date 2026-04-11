import styles from "./login.module.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";

function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (token && role === "ADMIN") navigate("/admin", { replace: true });
    if (token && role === "SUPER_ADMIN") navigate("/admin", { replace: true });
    if (token && role === "STUDENT") navigate("/student", { replace: true });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/auth/login", {
        email: identifier.includes("@") ? identifier : undefined,
        matricule: !identifier.includes("@") ? identifier : undefined,
        password,
      });
      const data = res.data;
      console.log("DATA FROM BACKEND:", data);

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user.role);

      if (data.user.role === "ADMIN" || data.user.role === "SUPER_ADMIN") {
        navigate("/admin", { replace: true });
      } else if (data.user.role === "STUDENT") {
        navigate("/student", { replace: true });
      } else {
        setError("Unknown role");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  }

  return (
    <div className={styles.loginBody}>
      <div className={styles.left}>
        <div className={styles.toplogo1}>
          <img src="/logoproject.png" alt="CertiChain logo" />
          <div>
            <h2>TrustMy<span className={styles.span}>Dgree</span></h2>
            <p>Verified Education</p>
          </div>
        </div>
        <h1>
          Ensuring the <span className={styles.span}>Integrity</span> of Academic Excellence.
        </h1>
        <p className={styles.description}>
          The world's most trusted platform for secure, instant diploma
          verification and credential management for over 500+ universities worldwide.
        </p>
        <div className={styles.container}>
          <div className={styles.verification}>
            <img src="/instantverification.png" alt="verification" />
            <div className={styles.inside}>
              <h4>Instant Verification</h4>
              <p>Blockchain-backed security</p>
            </div>
          </div>
          <div className={styles.network}>
            <img src="/globalnetwork.png" alt="network" />
            <div className={styles.inside}>
              <h4>Global Network</h4>
              <p>Accepted in 120+ countries</p>
            </div>
          </div>
        </div>
        <p className={styles.copyright}>© 2026 CertiVerify System. All rights reserved.</p>
      </div>

      <div className={styles.right}>
        <form className={styles.send} onSubmit={handleSubmit}>
          <div className={styles.toplogo2}>
            <img src="/logoproject.png" alt="cert" />
            <div>
              <h3 className={styles.iff}>TrustMy<span className={styles.span}>Dgree</span></h3>
              <p>Verified Education</p>
            </div>
          </div>

          <h2>Welcome Back</h2>
          <p className={styles.small}>Enter your credentials to access the verification portal.</p>

          {error && <p style={{ color: "red", marginBottom: "10px" }}>{error}</p>}

          <div className={styles.email}>
            <label className={styles.lab}>Email or Matricule</label>
            <input
              className={styles.inp}
              type="text"
              placeholder="Enter your email or matricule"
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
            <img src="/message.png" alt="message" className={styles.icon1} />
          </div>

          <div className={styles.password}>
            <label className={styles.lab}>Password</label>
            <input
              className={styles.inp}
              type="password"
              placeholder="Enter your password"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <img src="/lock.png" alt="lock" className={styles.icon1} />
          </div>

          <button className={styles.sign} type="submit">Sign in</button>

          <hr className={styles.hr} />

          <p className={styles.last}>
            Need to verify a diploma quickly? <a href="/verify">Guest Verification</a>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;