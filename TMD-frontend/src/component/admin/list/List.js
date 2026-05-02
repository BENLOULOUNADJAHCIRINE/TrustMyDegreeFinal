import styles from "./List.module.css";
import { useEffect, useState, useCallback } from "react";
import api from "../../../api";
import { toast } from "react-hot-toast";

const LIMIT = 8;

function List() {
  const [user, setUser]               = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading]         = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [total, setTotal]             = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]           = useState("");

  const [sort, setSort] = useState({ key: "issueDate", dir: "desc" });

  const [openMenu, setOpenMenu]     = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  // ── User ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      parsed.role === "ADMIN"
        ? setUser({ name: "Admin",       email: parsed.email, avatar: parsed.avatar || null })
        : setUser({ name: "Super Admin", email: parsed.email, avatar: parsed.avatar || null });
    }
  }, []);

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e) {
      if (!e.target.closest(`.${styles.actions}`)) setOpenMenu(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Debounce search input ─────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ── Fetch from server ────────────────────────────────────────────────────
  const fetchPage = useCallback((page, searchVal, sortObj) => {
    setLoading(true);
    const params = new URLSearchParams({
      page,
      limit: LIMIT,
      sortKey: sortObj.key,
      sortDir: sortObj.dir,
    });
    if (searchVal) params.set("search", searchVal);

    api
      .get(`/admin/certificates?${params.toString()}`)
      .then((res) => {
        setCertificates(res.data.certificates || []);
        const p = res.data.pagination || {};
        setCurrentPage(p.page       || 1);
        setTotalPages(p.totalPages  || 1);
        setTotal(p.total            || 0);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPage(currentPage, search, sort);
  }, [currentPage, search, sort, fetchPage]);

  // ── Sort ─────────────────────────────────────────────────────────────────
  function handleSort(key) {
  setSort((prev) => ({
    key,
    dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc",
  }));
  setCurrentPage(1);
}

function sortArrow(key) {
  if (sort.key !== key) return "";
  return sort.dir === "asc" ? " ↑" : " ↓";
}

  // ── Reset ─────────────────────────────────────────────────────────────────
  function resetTable() {
    setSearchInput("");
    setSearch("");
    setSort({ key: "issueDate", dir: "desc" });
    setCurrentPage(1);
    setSelectedIds([]);
  }

  // ── Selection ─────────────────────────────────────────────────────────────
  function toggleSelect(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    const pageIds = certificates.map((c) => c.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    else setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
  }

  // ── Revoke / Unrevoke ─────────────────────────────────────────────────────
  function revokeCertificate(id) {
    toast(
      (t) => (
        <div className={styles.toastConfirm}>
          <span>Revoke this certificate?</span>
          <div className={styles.toastButtons}>
            <button
              className={styles.toastConfirmBtn}
              onClick={() => {
                toast.dismiss(t.id);
                api
                  .put(`/admin/certificates/${id}/revoke`)
                  .then(() => {
                    setCertificates((prev) =>
                      prev.map((c) => (c.id === id ? { ...c, status: "REVOKED" } : c))
                    );
                    setOpenMenu(null);
                    toast.success("Certificate revoked");
                  })
                  .catch((err) => {
                    toast.error(err.response?.data?.message || "Failed to revoke");
                  });
              }}
            >
              Confirm
            </button>
            <button className={styles.toastCancelBtn} onClick={() => toast.dismiss(t.id)}>
              Cancel
            </button>
          </div>
        </div>
      ),
      { duration: Infinity }
    );
  }

  function unrevokeCert(id) {
    toast(
      (t) => (
        <div className={styles.toastConfirm}>
          <span>Unrevoke this certificate?</span>
          <div className={styles.toastButtons}>
            <button
              className={styles.toastConfirmBtn}
              onClick={() => {
                toast.dismiss(t.id);
                api
                  .put(`/admin/certificates/${id}/unrevoke`)
                  .then(() => {
                    setCertificates((prev) =>
                      prev.map((c) => (c.id === id ? { ...c, status: "ACTIVE" } : c))
                    );
                    toast.success("Certificate unrevoked");
                  })
                  .catch((err) => {
                    toast.error(err.response?.data?.message || "Failed to unrevoke");
                  });
              }}
            >
              Confirm
            </button>
            <button className={styles.toastCancelBtn} onClick={() => toast.dismiss(t.id)}>
              Cancel
            </button>
          </div>
        </div>
      ),
      { duration: Infinity }
    );
  }

  // ── Bulk revoke ───────────────────────────────────────────────────────────
  function bulkRevoke() {
    const activeSelected = selectedIds.filter(
      (id) => certificates.find((c) => c.id === id)?.status !== "REVOKED"
    );
    if (activeSelected.length === 0) {
      toast.error("All selected certificates are already revoked.");
      return;
    }
    toast(
      (t) => (
        <div className={styles.toastConfirm}>
          <span>Revoke {activeSelected.length} certificate(s)?</span>
          <div className={styles.toastButtons}>
            <button
              className={styles.toastConfirmBtn}
              onClick={() => {
                toast.dismiss(t.id);
                api
                  .put("/admin/certificates/bulk-revoke", { ids: activeSelected })
                  .then((res) => {
                    setCertificates((prev) =>
                      prev.map((c) =>
                        activeSelected.includes(c.id) ? { ...c, status: "REVOKED" } : c
                      )
                    );
                    setSelectedIds([]);
                    toast.success(res.data.message);
                  })
                  .catch((err) => console.error(err));
              }}
            >
              Confirm
            </button>
            <button className={styles.toastCancelBtn} onClick={() => toast.dismiss(t.id)}>
              Cancel
            </button>
          </div>
        </div>
      ),
      { duration: Infinity }
    );
  }

  // ── Download Excel ────────────────────────────────────────────────────────
  function downloadExcel() {
    fetch(`${process.env.REACT_APP_API_URL}/api/admin/certificates/export`, {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "certificates.xlsx";
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch((err) => console.error(err));
  }

  // ── View PDF ──────────────────────────────────────────────────────────────
  function viewCertificate(id) {
    const token = localStorage.getItem("token");
    fetch(`${process.env.REACT_APP_API_URL}/api/admin/certificates/${id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, "_blank");
      })
      .catch((err) => console.error(err));
  }

  // ── Pagination ────────────────────────────────────────────────────────────
  const pagesPerGroup = 4;
  const currentGroup  = Math.ceil(currentPage / pagesPerGroup);
  const startPage     = (currentGroup - 1) * pagesPerGroup + 1;
  const endPage       = Math.min(startPage + pagesPerGroup - 1, totalPages);
  const pageNumbers   = [];
  for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);

  return (
    <div className={styles["main-content"]}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className={styles.login}>
        <h4>Certificate List</h4>
        <div className={styles.info}>
          <div className={styles.subinfo}>
            <h4>{user ? user.name : "guest"}</h4>
            <p>{user ? user.email : "guest25@ensta.edu.dz"}</p>
          </div>
          <img
            src={user?.avatar ? user.avatar : "/totalcertaficates.png"}
            alt="avatar"
          />
        </div>
      </div>

      {/* ── Search bar + actions ────────────────────────────────────────── */}
      <div className={styles.search}>
        <div className={styles.searchNav}>
          <img src="/searchbar.png" alt="search" />
          <input
            className={styles.look}
            type="search"
            placeholder="Search by name, registration number…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <div className={styles.edit}>
          <img src="/downloadsign.png" alt="download" />
          <button onClick={downloadExcel}>Export Excel</button>
        </div>

        {selectedIds.length > 0 && (
          <div className={styles.bulkBox}>
            <button
              onClick={bulkRevoke}
              style={{
                backgroundColor: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Revoke Selected ({selectedIds.length})
            </button>
          </div>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className={styles.main}>
        <button className={styles.reset} onClick={resetTable}>
          Reset
        </button>

        <div className={styles.countainer}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.row}>
                <th className={styles.colu}>
                  <input
                    type="checkbox"
                    onChange={toggleSelectAll}
                    checked={
                      certificates.length > 0 &&
                      certificates.every((c) => selectedIds.includes(c.id))
                    }
                  />
                </th>
                <th className={styles.colu} onClick={() => handleSort("id")}>
                  ID{sortArrow("id")}
                </th>
                <th className={styles.colu} onClick={() => handleSort("student")}>
                  Student{sortArrow("student")}
                </th>
                <th className={styles.colu} onClick={() => handleSort("matricule")}>
                  Matricule{sortArrow("matricule")}
                </th>
                <th className={styles.colu} onClick={() => handleSort("type")}>
                  Type{sortArrow("type")}
                </th>
                <th className={styles.colu} onClick={() => handleSort("specialty")}>
                  Specialty{sortArrow("specialty")}
                </th>
                <th className={styles.colu} onClick={() => handleSort("issueDate")}>
                  Issue Date{sortArrow("issueDate")}
                </th>
                <th className={styles.colu} onClick={() => handleSort("status")}>
                  Statuts{sortArrow("status")}
                </th>
                <th className={styles.colu}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className={styles.row}>
                  <td colSpan="9" style={{ textAlign: "center", padding: "24px" }}>
                    Loading…
                  </td>
                </tr>
              ) : certificates.length > 0 ? (
                certificates.map((cert) => (
                  <tr className={styles.row} key={cert.id}>
                    <td className={styles.column}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(cert.id)}
                        onChange={() => toggleSelect(cert.id)}
                      />
                    </td>
                    <td className={styles.column}>{cert.id.substring(0, 8)}…</td>
                    <td className={styles.column}>
                      <img
                        src={
                          cert.student?.avatar
                            ? cert.student.avatar.startsWith("http")
                              ? cert.student.avatar
                              : `${process.env.REACT_APP_API_URL}${cert.student.avatar}`
                            : "/Students.jpg"
                        }
                        alt="student"
                      />
                      <span className={styles.student}>{cert.student?.fullName}</span>
                    </td>
                    <td className={styles.column}>{cert.student?.matricule}</td>
                    <td className={styles.column}>
                      <span className={styles.type}>
                        {cert.type === "STAGE" ? "INTERNSHIP" : cert.type}
                      </span>
                    </td>
                    <td className={styles.column}>
                      <span className={styles.specialty}>{cert.specialty}</span>
                    </td>
                    <td className={styles.column}>
                      {new Date(cert.issueDate).toLocaleDateString("fr-FR")}
                    </td>
                    <td className={styles.column}>
                      <span
                        className={`${styles.status} ${
                          cert.status === "ACTIVE" ? styles.active : styles.revoked
                        }`}
                      >
                        {cert.status}
                      </span>
                    </td>
                    <td className={styles.column}>
                      <div className={styles.actions}>
                        <span
                          className={styles.dots}
                          onClick={() =>
                            setOpenMenu(openMenu === cert.id ? null : cert.id)
                          }
                        >
                          ⋮
                        </span>
                        {openMenu === cert.id && (
                          <div className={styles.menu}>
                            <button onClick={() => viewCertificate(cert.id)}>
                              View PDF
                            </button>
                            {cert.status === "REVOKED" ? (
                              <button onClick={() => unrevokeCert(cert.id)}>
                                Unrevoke
                              </button>
                            ) : (
                              <button onClick={() => revokeCertificate(cert.id)}>
                                Revoke
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className={styles.row}>
                  <td colSpan="9">No data found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ───────────────────────────────────────────────── */}
        <nav className={styles.arr}>
          <span style={{ fontSize: "13px", color: "#6b7280", marginRight: "12px" }}>
            {total} total
          </span>
          <div className={styles.pagination}>
            <div className={styles["page-item"]}>
              <button
                className={styles.change}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={startPage === 1}
              >
                prev
              </button>
            </div>
            {pageNumbers.map((n) => (
              <div
                key={n}
                className={`${styles["page-item"]} ${currentPage === n ? styles.pageActive : ""}`}
              >
                <button
                  className={styles["page-link"]}
                  onClick={() => setCurrentPage(n)}
                >
                  {n}
                </button>
              </div>
            ))}
            <div className={styles["page-item"]}>
              <button
                className={styles.change}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={endPage >= totalPages}
              >
                next
              </button>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}

export default List;
