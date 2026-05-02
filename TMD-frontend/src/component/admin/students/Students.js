import styles from "./Students.module.css";
import { useEffect, useState, useCallback } from "react";
import api from "../../../api";
import { toast } from "react-hot-toast";

const LIMIT = 10;

function Students() {
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [stats, setStats] = useState({ total: 0, graduated: 0, ungraduated: 0, withCerts: 0 });

  const [drawerStudent, setDrawerStudent] = useState(null);
  const [drawerCerts, setDrawerCerts] = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const role = localStorage.getItem("role");
    const parsed = storedUser ? JSON.parse(storedUser) : {};
    setUser({
      fullName: role === "SUPER_ADMIN" ? "Super Admin" : "Admin",
      email: parsed.email || "",
      avatar: parsed.avatar || null,
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchPage = useCallback((page, searchVal, statusVal) => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: LIMIT });
    if (searchVal) params.set("search", searchVal);
    if (statusVal && statusVal !== "ALL") params.set("status", statusVal);

    api
      .get(`/admin/students?${params.toString()}`)
      .then((res) => {
        setStudents(res.data.students || []);
        const p = res.data.pagination || {};
        setCurrentPage(p.page || 1);
        setTotalPages(p.totalPages || 1);
        setTotal(p.total || 0);
        if (res.data.stats) setStats(res.data.stats);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPage(1, search, statusFilter);
  }, [search, statusFilter, fetchPage]);

  function handlePageChange(n) {
    fetchPage(n, search, statusFilter);
  }

  function openDrawer(student) {
    setDrawerStudent(student);
    setDrawerCerts([]);
    setDrawerLoading(true);
    api
      .get(`/admin/students/${student.id}/certificates`)
      .then((res) => setDrawerCerts(res.data.certificates || []))
      .catch(() => toast.error("Failed to load certificates"))
      .finally(() => setDrawerLoading(false));
  }

  function closeDrawer() {
    setDrawerStudent(null);
    setDrawerCerts([]);
  }

  function handleRevokeCert(certId) {
    api
      .put(`/admin/certificates/${certId}/revoke`)
      .then(() => {
        toast.success("Certificate revoked");
        setDrawerCerts((prev) =>
          prev.map((c) => (c.id === certId ? { ...c, status: "REVOKED" } : c))
        );
        fetchPage(currentPage, search, statusFilter);
      })
      .catch((err) => toast.error(err.response?.data?.message || "Revoke failed"));
  }

  function handleRevokeAll() {
    if (!revokeTarget) return;
    setRevoking(true);
    const ids = drawerCerts.filter((c) => c.status === "ACTIVE").map((c) => c.id);

    api
      .put("/admin/certificates/bulk-revoke", { ids })
      .then((res) => {
        toast.success(`Revoked ${res.data.revoked} certificate(s)`);
        setDrawerCerts((prev) =>
          prev.map((c) => (ids.includes(c.id) ? { ...c, status: "REVOKED" } : c))
        );
        fetchPage(currentPage, search, statusFilter);
        setRevokeTarget(null);
      })
      .catch(() => toast.error("Bulk revoke failed"))
      .finally(() => setRevoking(false));
  }

  function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    api
      .delete(`/admin/students/${deleteTarget.id}`)
      .then(() => {
        toast.success(`${deleteTarget.fullName} deleted`);
        setDeleteTarget(null);
        fetchPage(currentPage, search, statusFilter);
        if (drawerStudent?.id === deleteTarget.id) closeDrawer();
      })
      .catch((err) => toast.error(err.response?.data?.message || "Delete failed"))
      .finally(() => setDeleting(false));
  }

  function downloadCert(certId) {
    const token = localStorage.getItem("token");
    toast.loading("Preparing certificate...", { id: "download" });
    fetch(`${process.env.REACT_APP_API_URL}/api/admin/certificates/${certId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Download failed" }));
          throw new Error(err.detail || err.error || "Download failed");
        }
        return res.blob();
      })
      .then((blob) => {
        toast.success("Downloaded!", { id: "download" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `certificate-${certId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => {
        toast.error(err.message || "Failed to download certificate", { id: "download" });
      });
  }

  function contractColor(ct) {
    const map = { DIPLOMA: styles.diploma, INTERNSHIP: styles.internship, STUDY: styles.study, RANK: styles.rank };
    return map[ct] || "";
  }

  return (
    <div className={styles["main-content"]}>
      <div className={styles.login}>
        <h4>Students</h4>
        <div className={styles.info}>
          <div className={styles.subinfo}>
            <h4>{user?.fullName ?? "Admin"}</h4>
            <p>{user?.email ?? ""}</p>
          </div>
          <img src={user?.avatar ? user.avatar : "/totalcertaficates.png"} alt="avatar" />
        </div>
      </div>

      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statNumber}>{stats.total}</span>
          <span className={styles.statLabel}>Total</span>
        </div>
        <div className={styles.stat}>
          <span className={`${styles.statNumber} ${styles.green}`}>{stats.graduated}</span>
          <span className={styles.statLabel}>Graduated</span>
        </div>
        <div className={styles.stat}>
          <span className={`${styles.statNumber} ${styles.orange}`}>{stats.ungraduated}</span>
          <span className={styles.statLabel}>Enrolled</span>
        </div>
        <div className={styles.stat}>
          <span className={`${styles.statNumber} ${styles.blue}`}>{stats.withCerts}</span>
          <span className={styles.statLabel}>With Certs</span>
        </div>
      </div>

      <div className={styles.search}>
        <div className={styles.searchNav}>
          <img src="/searchbar.png" alt="search" />
          <input
            type="search"
            className={styles.look}
            placeholder="Search by name, matricule, email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className={styles.filters}>
          {["ALL", "graduated", "ungraduated"].map((f) => (
            <button
              key={f}
              onClick={() => { setStatusFilter(f); setCurrentPage(1); }}
              className={`${styles.filterBtn} ${statusFilter === f ? styles.filterActive : ""}`}
            >
              {f === "ALL" ? "All" : f === "graduated" ? "Graduated" : "Enrolled"}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.main}>
        <div className={styles.countainer}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.row}>
                <th className={styles.colu}>STUDENT</th>
                <th className={styles.colu}>MATRICULE</th>
                <th className={styles.colu}>EMAIL</th>
                <th className={styles.colu}>DATE OF BIRTH</th>
                <th className={styles.colu}>CERTIFICATES</th>
                <th className={styles.colu}>STATUS</th>
                <th className={styles.colu}>JOINED</th>
                <th className={styles.colu}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className={styles.row}>
                  <td colSpan="8" style={{ textAlign: "center", padding: "40px" }}>Loading...</td>
                </tr>
              ) : students.length > 0 ? (
                students.map((s) => (
                  <tr className={styles.row} key={s.id}>
                    <td className={styles.column}>
                      <img
                        src={s.avatar ? (s.avatar.startsWith("http") ? s.avatar : `${process.env.REACT_APP_API_URL}${s.avatar}`) : "/Students.jpg"}
                        alt="student"
                      />
                      <span className={styles.student}>{s.fullName || "—"}</span>
                    </td>
                    <td className={styles.column}>{s.matricule || "—"}</td>
                    <td className={styles.column}>{s.email || "—"}</td>
                    <td className={styles.column}>{s.dateOfBirth || "—"}</td>
                    <td className={styles.column}>
                      <span className={styles.certCount}>{s._count?.certificates ?? 0}</span>
                    </td>
                    <td className={styles.column}>
                      <span className={`${styles.badge} ${s.isGraduated ? styles.graduated : styles.enrolled}`}>
                        {s.isGraduated ? "Graduated" : "Enrolled"}
                      </span>
                    </td>
                    <td className={styles.column}>{new Date(s.createdAt).toLocaleDateString("fr-FR")}</td>
                    <td className={styles.column}>
                      <div className={styles.actionBtns}>
                        <button className={styles.btnView} onClick={() => openDrawer(s)}>View Certs</button>
                        <button className={styles.btnDelete} onClick={() => setDeleteTarget(s)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className={styles.row}>
                  <td colSpan="8">No students found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <nav className={styles.arr}>
          <span style={{ fontSize: "13px", color: "#6b7280", marginRight: "12px" }}>{total} total</span>
          <div className={styles.pagination}>
            <button className={styles.change} onClick={() => handlePageChange(Math.max(currentPage - 1, 1))} disabled={currentPage === 1}>prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <div key={n} className={`${styles["page-item"]} ${currentPage === n ? styles.pageActive : ""}`}>
                <button className={styles["page-link"]} onClick={() => handlePageChange(n)}>{n}</button>
              </div>
            ))}
            <button className={styles.change} onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))} disabled={currentPage === totalPages}>next</button>
          </div>
        </nav>
      </div>

      {/* Certificates Drawer */}
      {drawerStudent && (
        <div className={styles.overlay} onClick={closeDrawer}>
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div className={styles.drawerStudentInfo}>
                <img
                  src={drawerStudent.avatar ? (drawerStudent.avatar.startsWith("http") ? drawerStudent.avatar : `${process.env.REACT_APP_API_URL}${drawerStudent.avatar}`) : "/Students.jpg"}
                  alt="student"
                  className={styles.drawerAvatar}
                />
                <div>
                  <h3>{drawerStudent.fullName}</h3>
                  <p>{drawerStudent.matricule} · {drawerStudent.email}</p>
                </div>
              </div>
              <div className={styles.drawerHeaderActions}>
                {drawerCerts.some((c) => c.status === "ACTIVE") && (
                  <button className={styles.btnRevokeAll} onClick={() => setRevokeTarget(drawerStudent)}>
                    Revoke All Active
                  </button>
                )}
                <button className={styles.drawerClose} onClick={closeDrawer}>✕</button>
              </div>
            </div>

            <div className={styles.drawerBody}>
              {drawerLoading ? (
                <div className={styles.drawerEmpty}>Loading certificates...</div>
              ) : drawerCerts.length === 0 ? (
                <div className={styles.drawerEmpty}>No certificates issued for this student.</div>
              ) : (
                drawerCerts.map((cert) => (
                  <div key={cert.id} className={styles.certCard}>
                    <div className={styles.certCardLeft}>
                      <span className={`${styles.contract} ${contractColor(cert.contractType)}`}>{cert.contractType}</span>
                      <div className={styles.certInfo}>
                        <span className={styles.certType}>{cert.type || cert.contractType}</span>
                        <span className={styles.certSpecialty}>{cert.specialty || "—"}</span>
                        <span className={styles.certDate}>{new Date(cert.issueDate).toLocaleDateString("fr-FR")}</span>
                      </div>
                    </div>
                    <div className={styles.certCardRight}>
                      <span className={`${styles.status} ${cert.status === "ACTIVE" ? styles.active : styles.revoked}`}>{cert.status}</span>
                      <div className={styles.certActions}>
                        <button className={styles.btnDownload} onClick={() => downloadCert(cert.id)}>PDF</button>
                        {cert.status === "ACTIVE" && (
                          <button className={styles.btnRevoke} onClick={() => handleRevokeCert(cert.id)}>Revoke</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className={styles.overlay} onClick={() => !deleting && setDeleteTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIcon}>🗑️</div>
            <h3 className={styles.modalTitle}>Delete Student</h3>
            <p className={styles.modalText}>
              Are you sure you want to delete <strong>{deleteTarget.fullName}</strong>?<br />
              <span className={styles.modalWarn}>This will permanently remove the student and all their certificates. Blockchain records are immutable and will remain on-chain.</span>
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
              <button className={styles.modalConfirmDelete} onClick={handleDelete} disabled={deleting}>{deleting ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke All Confirm Modal */}
      {revokeTarget && (
        <div className={styles.overlay} onClick={() => !revoking && setRevokeTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIcon}>⛔</div>
            <h3 className={styles.modalTitle}>Revoke All Certificates</h3>
            <p className={styles.modalText}>
              Revoke all active certificates for <strong>{revokeTarget.fullName}</strong>?<br />
              <span className={styles.modalWarn}>This action is recorded permanently on the blockchain and cannot be undone.</span>
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setRevokeTarget(null)} disabled={revoking}>Cancel</button>
              <button className={styles.modalConfirmRevoke} onClick={handleRevokeAll} disabled={revoking}>{revoking ? "Revoking..." : "Revoke All"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Students;
