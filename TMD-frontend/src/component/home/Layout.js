import { Outlet, useNavigate } from "react-router-dom";
import styles from "./Home.module.css";
import { Link } from "react-router-dom";
function Layout() {
  const navigate = useNavigate();

  return (
    <div className={styles["main-content"]}>
      <nav className={styles.top}>
        <Link to="/#home">
          <div className={styles.logopic}>
            <img src="/logoproject.png" alt="logopic" />
            <div className={styles.title}>
              <h3>
                TrustMy<span className={styles.color}>Degree</span>
              </h3>
              <p>Verified Education</p>
            </div>
          </div>
        </Link>

        <ul className={styles.access}>
          <Link to="/#home">Home</Link>
          <Link to="/#about">About</Link>
          <Link to="/#ver">Verification method</Link>
          <Link to="/#faq">FAQ</Link>
          <Link to="/#contact">Contact</Link>
        </ul>

        <button onClick={() => navigate("/login")}>login</button>
      </nav>

      <Outlet />
    </div>
  );
}

export default Layout;
