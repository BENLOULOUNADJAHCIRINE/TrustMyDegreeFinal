import styles from "./DashboardStudent.module.css";
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api";

function DashboardStudent() {
  const [user, setUser] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState(false);
  const [badgeModal, setBadgeModal] = useState(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/student/dashboard")
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

        const approvedDocs = (data.requests || []).filter(
          (req) => req.status === "APPROVED" && req.fileUrl,
        );
        setRequests(approvedDocs);
      })
      .catch((err) => console.log("Dashboard fetch error:", err));
  }, []);

  const filteredCertificates = certificates.filter(
    (cert) =>
      cert.specialty?.toLowerCase().includes(search.toLowerCase()) ||
      cert.type?.toLowerCase().includes(search.toLowerCase()) ||
      cert.uniqueCode?.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredRequests = requests.filter((req) =>
    req.documentType?.toLowerCase().includes(search.toLowerCase()),
  );

  function downloadFile(id, type = "CERT") {
    const token = localStorage.getItem("token");
    const endpoint =
      type === "CERT"
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

  function openBadgeModal(cert) {
    setBadgeModal({ ...cert, studentFullName: user?.name });
    setTimeout(() => drawBadge({ ...cert, studentFullName: user?.name }), 100);
  }

  function closeBadgeModal() {
    setBadgeModal(null);
  }

  function drawBadge(cert) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const W = 600;
    const H = 340;
    canvas.width = W;
    canvas.height = H;

    ctx.fillStyle = "#1e1b4b";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#4F46E5";
    ctx.fillRect(0, 0, 8, H);

    ctx.fillStyle = "#4F46E5";
    ctx.beginPath();
    ctx.arc(W, 0, 120, 0, Math.PI / 2);
    ctx.fill();

    ctx.fillStyle = "#a5b4fc";
    ctx.font = "bold 13px Arial";
    ctx.fillText(
      "ENSTA — École Nationale Supérieure de Technologie Avancée",
      30,
      40,
    );

    ctx.fillStyle = "#22c55e";
    ctx.font = "bold 12px Arial";
    ctx.fillText("✓ Blockchain Verified", 30, 75);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px Arial";
    ctx.fillText(
      cert.chainData?.studentName || cert.studentFullName || "Student",
      30,
      120,
    );

    ctx.strokeStyle = "#4F46E5";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, 135);
    ctx.lineTo(420, 135);
    ctx.stroke();

    ctx.fillStyle = "#a5b4fc";
    ctx.font = "13px Arial";
    ctx.fillText("CERTIFICATE TYPE", 30, 165);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px Arial";
    ctx.fillText(cert.type || "MASTER", 30, 185);

    ctx.fillStyle = "#a5b4fc";
    ctx.font = "13px Arial";
    ctx.fillText("SPECIALTY", 30, 220);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px Arial";
    ctx.fillText(cert.specialty || "", 30, 240);
    if (cert.contractType === "INTERNSHIP" && cert.chainData?.companyName) {
      ctx.fillStyle = "#a5b4fc";
      ctx.font = "13px Arial";
      ctx.fillText("COMPANY", 220, 220);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px Arial";
      ctx.fillText(cert.chainData.companyName, 220, 240);
    }

    ctx.fillStyle = "#a5b4fc";
    ctx.font = "13px Arial";
    ctx.fillText("ISSUED", 30, 275);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px Arial";
    ctx.fillText(new Date(cert.issueDate).toLocaleDateString("fr-FR"), 30, 295);

    ctx.fillStyle = "#6366f1";
    ctx.font = "11px Arial";
    ctx.fillText(cert.uniqueCode, 30, 325);

    const verifyUrl = `http://localhost:3000/verify?code=${cert.uniqueCode}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(verifyUrl)}&bgcolor=1e1b4b&color=ffffff`;
    const qrImg = new Image();
    qrImg.crossOrigin = "anonymous";
    qrImg.onload = () => {
      ctx.fillStyle = "#2d2a5e";
      ctx.beginPath();
      ctx.roundRect(440, 90, 140, 160, 12);
      ctx.fill();
      ctx.drawImage(qrImg, 445, 95, 130, 130);
      ctx.fillStyle = "#a5b4fc";
      ctx.font = "10px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Scan to verify", 510, 260);
      ctx.textAlign = "left";
    };
    qrImg.src = qrUrl;
  }

  function downloadBadge() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `badge_${badgeModal.uniqueCode}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function shareOnLinkedIn(cert) {
    const verifyUrl = `http://localhost:3000/verify?code=${cert.uniqueCode}`;
    const text = `🎓 I'm proud to share my ${cert.type} in ${cert.specialty} from ENSTA, verified on the blockchain!\n\nVerify here: ${verifyUrl}`;
    const linkedInUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
    window.open(linkedInUrl, "_blank");
  }

  function copyShareLink(cert) {
    const verifyUrl = `http://localhost:3000/verify?code=${cert.uniqueCode}`;
    navigator.clipboard.writeText(verifyUrl).then(() => {
      alert("Link copied to clipboard!");
    });
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
              <p>
                {user?.lastIssued
                  ? new Date(user.lastIssued).toLocaleDateString()
                  : "..."}
              </p>
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
            {/* 1. Certificates */}
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
                    ✓ verified on the Blockchain
                  </span>
                </div>

                <div className={styles.button}>
                  <button
                    type="button"
                    onClick={() => downloadFile(cert.id, "CERT")}
                  >
                    {" "}
                    Download PDF{" "}
                  </button>
                  <button
                    type="button"
                    onClick={() => openBadgeModal(cert)}
                    style={{
                      flex: 1,
                      backgroundColor: "#0077b5",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      padding: "9px",
                      cursor: "pointer",
                      fontWeight: "500",
                      fontSize: "13px",
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = "#005f8e")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "#0077b5")
                    }
                  >
                    Share
                  </button>
                </div>
              </div>
            ))}

            {/* 2. Approved Document Requests */}
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
                    ✓ verified on the Blockchain
                  </span>
                </div>

                <div className={styles.button}>
                  <button
                    type="button"
                    onClick={() => downloadFile(req.id, "REQ")}
                  >
                    Download PDF
                  </button>
                </div>
              </div>
            ))}

            {filteredCertificates.length === 0 &&
              filteredRequests.length === 0 && (
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
        <h4>
          © 2026 TrustMyDegree ENSTA - Verix Solution for Decentralized Academic
          Management.
        </h4>
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
                <li>
                  <Link to="/student/Settings">Parameters</Link>
                </li>
                <li>
                  <Link to="/student/RequestStudent">Request</Link>
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className={styles.info}>
          <img
            src="/totalcertaficates.png"
            alt="ava"
            className={styles.student}
          />
          <div className={styles.subinfo}>
            <h4>{user ? user.name : "guest"}</h4>
            <p>{user?.isGraduated ? "Graduated ✅" : "Not graduated yet"}</p>
          </div>
          <img
            src={user?.avatar || "/exit.png"}
            alt="exit"
            onClick={handleLogout}
            className={styles.exit}
          />
        </div>
      </div>

      {badgeModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={closeBadgeModal}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              padding: "32px",
              maxWidth: "680px",
              width: "95%",
              textAlign: "center",
              boxShadow: "0 25px 80px rgba(0,0,0,0.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                color: "#1e1b4b",
                marginBottom: "4px",
                fontSize: "20px",
              }}
            >
              Your Certificate Badge
            </h3>
            <p
              style={{ color: "#888", fontSize: "13px", marginBottom: "20px" }}
            >
              Download your badge or share your certificate link
            </p>

            <canvas
              ref={canvasRef}
              style={{
                borderRadius: "12px",
                maxWidth: "100%",
                boxShadow: "0 8px 30px rgba(79,70,229,0.3)",
                marginBottom: "24px",
              }}
            />

            <div
              style={{
                backgroundColor: "#f3f4f6",
                borderRadius: "10px",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
                gap: "12px",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  color: "#666",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {`http://localhost:3000/verify?code=${badgeModal.uniqueCode}`}
              </span>
              <button
                onClick={() => copyShareLink(badgeModal)}
                style={{
                  backgroundColor: "#4F46E5",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "12px",
                  whiteSpace: "nowrap",
                }}
              >
                Copy Link
              </button>
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <button
                onClick={downloadBadge}
                style={{
                  backgroundColor: "#1e1b4b",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  padding: "12px 20px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              >
                ⬇️ Download Badge
              </button>

              <button
                onClick={() => shareOnLinkedIn(badgeModal)}
                style={{
                  backgroundColor: "#0077b5",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  padding: "12px 20px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              >
                🔗 Share on LinkedIn
              </button>

              <button
                onClick={closeBadgeModal}
                style={{
                  backgroundColor: "#f3f4f6",
                  color: "#666",
                  border: "none",
                  borderRadius: "10px",
                  padding: "12px 20px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardStudent;