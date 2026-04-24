import "./Navbar.css";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
function Navbar() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role"); // determine who is logged in
  // const role ="superadmin";  if u want to see the autho page manually
  const [isOpen, setIsOpen] = useState(false);

  // log out function
  const handleLogout = () => {
    localStorage.removeItem("token"); // remove auth
    navigate("/", { replace: true }); //remove the browser back button open paltform.
  };

  return (
    <div className="navbar">
      {/* hamburger — only visible on mobile */}
      <button className="hamburger" onClick={() => setIsOpen(!isOpen)}>
        <span></span>
        <span></span>
        <span></span>
      </button>

      <nav className={isOpen ? "open" : ""}>
        <div className="logo">
          <img src="/logoproject.png" alt="navlogo" />
          <div className="logo-text">
            <h1>
              TrustMy<span className="span">Dgree</span>
            </h1>
            <p>Verified Education</p>
          </div>
        </div>

        <div className="nav-links">
          <Link to="/admin/dashboard" onClick={() => setIsOpen(false)}>
            <img src="/navdash.png" alt="navdash" />
            <span className="same">dashboard</span>
          </Link>

          {role === "SUPER_ADMIN" && (
            <>
              <Link to="/admin/authorisations" onClick={() => setIsOpen(false)}>
                <img src="/superadmine.png" alt="superadmine" />
                <span className="same">Manage admins</span>
              </Link>
              <Link to="/admin/audit" onClick={() => setIsOpen(false)}>
                <img src="/navlist.png" alt="audit" />
                <span className="same">Audit Trail</span>
              </Link>
            </>
          )}

          <Link to="/admin/add" onClick={() => setIsOpen(false)}>
            <img src="/naviss.png" alt="naviss" />
            <span className="same ">issue certificate</span>
          </Link>

          <Link to="/admin/list" onClick={() => setIsOpen(false)}>
            <img src="/navlist.png" alt="navlist" />
            <span className="same">list of certificates</span>
          </Link>

          <Link to="/admin/stat" onClick={() => setIsOpen(false)}>
            <img src="/navstat.png" alt="navstat" />
            <span className="same">statistics</span>
          </Link>

          <Link to="/admin/req" onClick={() => setIsOpen(false)}>
            <img src="/request.png" alt="navstat" />
            <span className="same">Requests</span>
          </Link>

          <Link to="/admin/para" onClick={() => setIsOpen(false)}>
            <img src="/param.png" alt="navstat" />
            <span className="same">Parameters</span>
          </Link>
        </div>

        <div className="out">
          <img src="/out.png" alt="out" />
          <span className="logout" onClick={handleLogout}>
            logout
          </span>
        </div>
      </nav>
    </div>
  );
}

export default Navbar;
