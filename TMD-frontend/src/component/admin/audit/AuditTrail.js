import styles from "./AuditTrail.module.css";
import { useEffect, useState, useCallback } from "react";
import api from "../../../api";

const LIMIT = 10;

function AuditTrail() {
  const [user, setUser]               = useState(null);
  const [trail, setTrail]             = useState([]);
  const [search, setSearch]           = useState("");
  const [filter, setFilter]           = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(false);

  const [stats, setStats] = useState({
    total: 0, active: 0, revoked: 0,
    diploma: 0, internship: 0, study: 0, rank: 0,
  });

  // ── User from localStorage ────────────────────────────────────────────────
  useEffect(() => {
    const role       = localStorage.getItem("role");
    const storedUser = localStorage.getItem("user");
    const parsed     = storedUser ? JSON.parse(storedUser) : {};
    setUser({
      fullName: role === "SUPER_ADMIN" ? "Super Admin" : "Admin",
      email:    parsed.email  || "",
      avatar:   parsed.avatar || null,
    });
  }, []);


  const fetchPage = useCallback((page, searchVal, filterVal) => {
    setLoading(true);

    const params = new URLSearchParams({ page, limit: LIMIT });
    if (searchVal) params.set("search", searchVal);
    if (filterVal && filterVal !== "ALL") {
      const statusFilters       = ["ACTIVE", "REVOKED"];
      const contractTypeFilters = ["DIPLOMA", "INTERNSHIP", "STUDY", "RANK"];
      if (statusFilters.includes(filterVal))       params.set("status",       filterVal);
      if (contractTypeFilters.includes(filterVal)) params.set("contractType", filterVal);
    }

    api
      .get(`/admin/audit-trail?${params.toString()}`)
      .then((res) => {
        setTrail(res.data.trail || []);
        const p = res.data.pagination || {};
        setCurrentPage(p.page  || 1);
        setTotalPages(p.totalPages || 1);
        setTotal(p.total || 0);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const fetchStats = useCallback(() => {
    const counts = ["ACTIVE", "REVOKED", "DIPLOMA", "INTERNSHIP", "STUDY", "RANK"].map(f => {
      const params = new URLSearchParams({ page: 1, limit: 1 });
      const statusFilters = ["ACTIVE", "REVOKED"];
      if (statusFilters.includes(f)) params.set("status", f);
      else params.set("contractType", f);
      return api.get(`/admin/audit-trail?${params.toString()}`).then(r => ({
        key: f,
        count: r.data.pagination?.total || 0,
      }));
    });
    // Also get total (no filter)
    counts.push(
      api.get(`/admin/audit-trail?page=1&limit=1`).then(r => ({
        key: "total",
        count: r.data.pagination?.total || 0,
      }))
    );
    Promise.all(counts).then(results => {
      const s = {};
      results.forEach(({ key, count }) => { s[key.toLowerCase()] = count; });
      setStats({
        total:      s.total      || 0,
        active:     s.active     || 0,
        revoked:    s.revoked    || 0,
        diploma:    s.diploma    || 0,
        internship: s.internship || 0,
        study:      s.study      || 0,
        rank:       s.rank       || 0,
      });
    });
  }, []);

  // Initial load
  useEffect(() => {
    fetchPage(1, "", "ALL");
    fetchStats();
  }, [fetchPage, fetchStats]);

  // When search/filter changes, go back to page 1
  useEffect(() => {
    fetchPage(1, search, filter);
  }, [search, filter, fetchPage]);

  function handlePageChange(n) {
    fetchPage(n, search, filter);
  }

  function shortHash(hash) {
    if (!hash) return "—";
    return hash.substring(0, 10) + "..." + hash.substring(hash.length - 6);
  }

  // Debounce search so we don't fire on every keystroke
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  return (
    <div className={styles["main-content"]}>
      <div className={styles.login}>
        <h4>Audit Trail</h4>
        <div className={styles.info}>
          <div className={styles.subinfo}>
            <h4>{user ? user.fullName : "guest"}</h4>
            <p>{user ? user.email : "super@ensta.edu.dz"}</p>
          </div>
          <img
            src={user?.avatar ? user.avatar : "/totalcertaficates.png"}
            alt="avat"
          />
        </div>
      </div>

      {/* Stats bar — counts from server, loaded once */}
      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statNumber}>{stats.total}</span>
          <span className={styles.statLabel}>Total</span>
        </div>
        <div className={styles.stat}>
          <span className={`${styles.statNumber} ${styles.green}`}>{stats.active}</span>
          <span className={styles.statLabel}>Active</span>
        </div>
        <div className={styles.stat}>
          <span className={`${styles.statNumber} ${styles.red}`}>{stats.revoked}</span>
          <span className={styles.statLabel}>Revoked</span>
        </div>
        <div className={styles.stat}>
          <span className={`${styles.statNumber} ${styles.blue}`}>{stats.diploma}</span>
          <span className={styles.statLabel}>Diplomas</span>
        </div>
        <div className={styles.stat}>
          <span className={`${styles.statNumber} ${styles.purple}`}>{stats.internship}</span>
          <span className={styles.statLabel}>Internships</span>
        </div>
        <div className={styles.stat}>
          <span className={`${styles.statNumber} ${styles.orange}`}>{stats.study}</span>
          <span className={styles.statLabel}>Scolarités</span>
        </div>
        <div className={styles.stat}>
          <span className={`${styles.statNumber} ${styles.pink}`}>{stats.rank}</span>
          <span className={styles.statLabel}>Ranks</span>
        </div>
      </div>

      {/* Search + filter */}
      <div className={styles.search}>
        <div className={styles.searchNav}>
          <img src="/searchbar.png" alt="search" />
          <input
            type="search"
            className={styles.look}
            placeholder="Search by name, matricule, code, hash..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className={styles.filters}>
          {["ALL", "ACTIVE", "REVOKED", "DIPLOMA", "INTERNSHIP", "STUDY", "RANK"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ""}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className={styles.main}>
        <div className={styles.countainer}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.row}>
                <th className={styles.colu}>DATE</th>
                <th className={styles.colu}>STUDENT</th>
                <th className={styles.colu}>MATRICULE</th>
                <th className={styles.colu}>TYPE</th>
                <th className={styles.colu}>SPECIALTY</th>
                <th className={styles.colu}>CONTRACT</th>
                <th className={styles.colu}>BLOCKCHAIN ID</th>
                <th className={styles.colu}>IPFS</th>
                <th className={styles.colu}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className={styles.row}>
                  <td colSpan="9" style={{ textAlign: "center", padding: "24px" }}>
                    Loading...
                  </td>
                </tr>
              ) : trail.length > 0 ? (
                trail.map((item) => (
                  <tr className={styles.row} key={item.id}>
                    <td className={styles.column}>
                      {new Date(item.issueDate).toLocaleDateString("fr-FR")}
                    </td>
                    <td className={styles.column}>
                      <img
                        src={
                          item.student?.avatar
                            ? item.student.avatar.startsWith("http")
                              ? item.student.avatar
                              : `${process.env.REACT_APP_API_URL}${item.student.avatar}`
                            : "/Students.jpg"
                        }
                        alt="student"
                      />
                      <span className={styles.student}>{item.studentName}</span>
                    </td>
                    <td className={styles.column}>{item.matricule}</td>
                    <td className={styles.column}>
                      <span className={styles.type}>{item.type}</span>
                    </td>
                    <td className={styles.column}>
                      <span className={styles.specialty}>{item.specialty}</span>
                    </td>
                    <td className={styles.column}>
                      <span
                        className={`${styles.contract} ${styles[item.contractType?.toLowerCase()]}`}
                      >
                        {item.contractType}
                      </span>
                    </td>
                    <td className={styles.column}>
                      <span className={styles.hash} title={item.blockchainCertId}>
                        {shortHash(item.blockchainCertId)}
                      </span>
                    </td>
                    <td className={styles.column}>
                      {item.ipfsUrl ? (
                        <a
                          href={item.ipfsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.ipfsLink}
                        >
                          View PDF
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={styles.column}>
                      <span
                        className={`${styles.status} ${item.status === "ACTIVE" ? styles.active : styles.revoked}`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className={styles.row}>
                  <td colSpan="9">No transactions found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination — now controls which page the SERVER returns */}
        <nav className={styles.arr}>
          <span style={{ fontSize: "13px", color: "#6b7280", marginRight: "12px" }}>
            {total} total
          </span>
          <div className={styles.pagination}>
            <button
              className={styles.change}
              onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1}
            >
              prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <div
                key={n}
                className={`${styles["page-item"]} ${currentPage === n ? styles.pageActive : ""}`}
              >
                <button
                  className={styles["page-link"]}
                  onClick={() => handlePageChange(n)}
                >
                  {n}
                </button>
              </div>
            ))}
            <button
              className={styles.change}
              onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              next
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}

export default AuditTrail;
