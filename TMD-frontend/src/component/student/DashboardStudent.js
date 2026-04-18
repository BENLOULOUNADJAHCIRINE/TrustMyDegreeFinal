import styles from "./DashboardStudent.module.css";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api";

function DashboardStudent() {
  const [user, setUser] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [requests, setRequests] = useState([]); 
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Single fetch to get everything (User, Certs, and Requests)
    api.get("/student/dashboard")
      .then((res) => {
        const data = res.data;
        setUser({
          name: data.fullName,
          isGraduated: data.isGraduated,
          totalCertificates: data.totalCertificates,
          activeCertificates: data.activeCertificates,
          lastIssued: data.lastIssuedCertificate?.issueDate || null,
        });

        setCertificates(data.certificates || []);
        
        // Filter approved requests that have a file attached
        const approvedDocs = (data.requests || []).filter(
          (req) => req.status === "APPROVED" && req.fileUrl
        );
        setRequests(approvedDocs);
      })
      .catch((err) => console.log("Dashboard fetch error:", err));
  }, []);

  // Filter both lists based on search bar
  const filteredCertificates = certificates.filter(
    (cert) =>
      cert.specialty?.toLowerCase().includes(search.toLowerCase()) ||
      cert.type?.toLowerCase().includes(search.toLowerCase()) ||
      cert.uniqueCode?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredRequests = requests.filter((req) =>
    req.documentType?.toLowerCase().includes(search.toLowerCase())
  );

  // Unified download function
 function downloadFile(id, type = "CERT") {
  const token = localStorage.getItem("token");
  const endpoint = type === "CERT" 
    ? `http://localhost:5000/api/student/certificates/${id}/download`
    : `http://localhost:5000/api/student/requests/${id}/download`;

  fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => {
      if (!res.ok) throw new Error("File not found");
      return res.blob();
    })
    .then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = type === "CERT" ? `cert_${id}.pdf` : `doc_${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    })
    .catch((err) => alert(err.message));
}
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/", { replace: true });
  };

  return (
    <div className={styles["main-content"]}>
      <nav className={styles.hello}>
        <div className={styles.title}>
          <h3>Hello {user ? user.name : "guest"}👋</h3>
          <p>View and share your blockchain-verified academic certificates</p>
        </div>

        <div className={styles.information}>
          <div className={styles.inf}>
            <img src="/studenttotalcertificates.png" alt="total" />
            <div>
              <h5>Total Certificates</h5>
              <p>{user ? user.totalCertificates : "..."}</p>
            </div>
          </div>

          <div className={styles.inf}>
            <img src="/studentactivecertificates.png" alt="active" />
            <div>
              <h5>Active Certificates</h5>
              <p>{user ? user.activeCertificates : "..."}</p>
            </div>
          </div>

          <div className={styles.inf}>
            <img src="/studentlastissued.png" alt="last" />
            <div>
              <h5>Last Issued</h5>
              <p>{user?.lastIssued ? new Date(user.lastIssued).toLocaleDateString() : "..."}</p>
            </div>
          </div>
        </div>
      </nav>

      <div className={styles.dashboard}>
        <div className={styles.left}>
          <div className={styles.search}>
            <h3>My Certificates & Documents</h3>
            <div>
              <img src="/searchbar.png" alt="searching" />
              <input
                type="search"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.diplomes}>
            {/* 1. Map Certificates */}
            {filteredCertificates.map((cert) => (
              <div key={cert.id} className={styles["diplome-div"]}>
                <div className={styles.type}>
                  <div>
                    <h4>{cert.specialty}</h4>
                    <p>{cert.type}</p>
                  </div>
                </div>
                <div className={styles.date}>
                  <div className={styles.calander}>
                    <img src="/calander.png" alt="cal" />
                    <h5>{new Date(cert.graduationDate).toLocaleDateString()}</h5>
                  </div>
                  <div className={styles.chain}>
                    <img src="/chain.png" alt="chain" />
                    <p>{cert.uniqueCode}</p>
                  </div>
                  <span className={`${styles.state} ${styles.verified}`}>
                    verified on the Blockchain
                  </span>
                </div>
                <div className={styles.button}>
                  <img src="/downloadsign.png" alt="dwnld" />
                  <button type="button" onClick={() => downloadFile(cert.id, "CERT")}>
                    Download PDF
                  </button>
                </div>
              </div>
            ))}

            {/* 2. Map Approved Document Requests */}
            {filteredRequests.map((req) => (
              <div key={req.id} className={styles["diplome-div"]}>
                <div className={styles.type}>
                  <div>
                    <h4>{req.documentType}</h4>
                    <p>OFFICIAL DOCUMENT</p>
                  </div>
                </div>
                <div className={styles.date}>
                  <div className={styles.calander}>
                    <img src="/calander.png" alt="cal" />
                    <h5>{new Date(req.updatedAt).toLocaleDateString()}</h5>
                  </div>
                  <span className={`${styles.state} ${styles.verified}`}>
                    verified on the Blockchain
                  </span>
                </div>
                <div className={styles.button}>
                  <img src="/downloadsign.png" alt="dwnld" />
                  <button type="button" onClick={() => downloadFile(req.id, "REQ")}>
                    Download PDF
                  </button>
                </div>
              </div>
            ))}

            {filteredCertificates.length === 0 && filteredRequests.length === 0 && (
              <p className={styles.noData}>No records found.</p>
            )}
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.request}>
            <img src="/add.png" alt="adding" />
            <h3>Request documents</h3>
            <Link to="/student/RequestStudent">
              <button>Request now</button>
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.policy}>
        <h4>© 2026 TrustMyDegree ENSTA - Verix Solution for Decentralized Academic Management.</h4>
      </div>

      {/* Profile & Settings Menu */}
      <div className={styles.login}>
        <div className={styles.image}>
          <img
            src="/setting.png"
            alt="setting"
            onClick={() => setOpenMenu(!openMenu)}
            className={openMenu ? styles.rotate : ""}
          />
          {openMenu && (
            <div className={styles.menu}>
              <ul className={styles.list}>
                <li><Link to="/student/Settings">Parameters</Link></li>
                <li><Link to="/student/RequestStudent">Request</Link></li>
              </ul>
            </div>
          )}
        </div>

        <div className={styles.info}>
          <img src="/totalcertaficates.png" alt="ava" className={styles.student} />
          <div className={styles.subinfo}>
            <h4>{user ? user.name : "guest"}</h4>
            <p>{user?.isGraduated ? "Graduated ✅" : "Not graduated yet"}</p>
          </div>
          <img src="/exit.png" alt="exit" onClick={handleLogout} className={styles.exit} />
        </div>
      </div>
    </div>
  );
}

export default DashboardStudent;