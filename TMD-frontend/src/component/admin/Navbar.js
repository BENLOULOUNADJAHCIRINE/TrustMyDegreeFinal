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
        <Link to="/admin/dashboard">
          <div className="logo">
            <img src="/logoproject.png" alt="navlogo" />
            <div className="logo-text">
              <h1>
                TrustMy<span className="span">Degree</span>
              </h1>
              <p>Verified Education</p>
            </div>
          </div>
        </Link>

        <div className="nav-links">
          <Link to="/admin/dashboard" onClick={() => setIsOpen(false)}>
            <img src="/navdash.png" alt="navdash" />
            <span className="same">Dashboard</span>
          </Link>

          {role === "SUPER_ADMIN" && (
            <>
              <Link to="/admin/authorisations" onClick={() => setIsOpen(false)}>
                <img src="/superadmine.png" alt="superadmine" />
                <span className="same">Manage Admins</span>
              </Link>
              <Link to="/admin/audit" onClick={() => setIsOpen(false)}>
                <img src="/navlist.png" alt="audit" />
                <span className="same">Audit Trail</span>
              </Link>
            </>
          )}

          <Link to="/admin/add" onClick={() => setIsOpen(false)}>
            <img src="/naviss.png" alt="naviss" />
            <span className="same ">Issue Documents</span>
          </Link>

          <Link to="/admin/students" onClick={() => setIsOpen(false)}>
            <img src="/studenticon.png" alt="students" style={{ width: "20px", height: "20px" }} />
            <span className="same">Students</span>
          </Link>

          <Link to="/admin/list" onClick={() => setIsOpen(false)}>
            <img src="/navlist.png" alt="navlist" />
            <span className="same">List of Certificates</span>
          </Link>

          <Link to="/admin/stat" onClick={() => setIsOpen(false)}>
            <img src="/navstat.png" alt="navstat" />
            <span className="same">Statistics</span>
          </Link>

          <Link to="/admin/req" onClick={() => setIsOpen(false)}>
            <img src="/request.png" alt="navstat" />
            <span className="same">Requests</span>
          </Link>

          <Link to="/admin/para" onClick={() => setIsOpen(false)}>
            <img src="/param.png" alt="navstat" />
            <span className="same">Parameters</span>
          </Link>

          <Link to="/admin/verif" onClick={() => setIsOpen(false)}>
            <img src="/veri.png" alt="verify" />
            <span className="same">Verify</span>
          </Link>
        </div>

        <div className="out" onClick={handleLogout}>
          <img src="/out.png" alt="out" />
          <span className="logout">Logout</span>
        </div>
      </nav>
    </div>
  );
}

export default Navbar;
