import styles from "./AuditTrail.module.css";
import { useEffect, useState } from "react";
import api from "../../../api";

function AuditTrail() {
  const [user, setUser] = useState(null);
  const [trail, setTrail] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    const role = localStorage.getItem("role");
    const storedUser = localStorage.getItem("user");
    const parsed = storedUser ? JSON.parse(storedUser) : {};
    setUser({
      fullName: role === "SUPER_ADMIN" ? "Super Admin" : "Admin",
      email: parsed.email || "",
      avatar: parsed.avatar || null,
    });
  }, []);

  useEffect(() => {
    api
      .get("/admin/audit-trail")
      .then((res) => setTrail(res.data.trail || []))
      .catch((err) => console.log(err));
  }, []);

  const filtered = trail.filter((item) => {
    const matchSearch =
      item.studentName?.toLowerCase().includes(search.toLowerCase()) ||
      item.matricule?.toLowerCase().includes(search.toLowerCase()) ||
      item.specialty?.toLowerCase().includes(search.toLowerCase()) ||
      item.uniqueCode?.toLowerCase().includes(search.toLowerCase()) ||
      item.blockchainCertId?.toLowerCase().includes(search.toLowerCase());

    const matchFilter =
      filter === "ALL" ||
      item.status === filter ||
      item.contractType === filter;

    return matchSearch && matchFilter;
  });

  useEffect(() => setCurrentPage(1), [search, filter]);

  const lastIndex = currentPage * perPage;
  const firstIndex = lastIndex - perPage;
  const records = filtered.slice(firstIndex, lastIndex);
  const totalPages = Math.ceil(filtered.length / perPage);

  function shortHash(hash) {
    if (!hash) return "—";
    return hash.substring(0, 10) + "..." + hash.substring(hash.length - 6);
  }

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
            src={
              user?.avatar
                ? user.avatar
                : "/totalcertaficates.png"
            }
            alt="avat"
          />
        </div>
      </div>

      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statNumber}>{trail.length}</span>
          <span className={styles.statLabel}>Total</span>
        </div>
        <div className={styles.stat}>
          <span className={`${styles.statNumber} ${styles.green}`}>
            {trail.filter((t) => t.status === "ACTIVE").length}
          </span>
          <span className={styles.statLabel}>Active</span>
        </div>
        <div className={styles.stat}>
          <span className={`${styles.statNumber} ${styles.red}`}>
            {trail.filter((t) => t.status === "REVOKED").length}
          </span>
          <span className={styles.statLabel}>Revoked</span>
        </div>
        <div className={styles.stat}>
          <span className={`${styles.statNumber} ${styles.blue}`}>
            {trail.filter((t) => t.contractType === "DIPLOMA").length}
          </span>
          <span className={styles.statLabel}>Diplomas</span>
        </div>
        <div className={styles.stat}>
          <span className={`${styles.statNumber} ${styles.purple}`}>
            {trail.filter((t) => t.contractType === "INTERNSHIP").length}
          </span>
          <span className={styles.statLabel}>Internships</span>
        </div>
        <div className={styles.stat}>
          <span className={`${styles.statNumber} ${styles.orange}`}>
            {trail.filter((t) => t.contractType === "STUDY").length}
          </span>
          <span className={styles.statLabel}>Scolarités</span>
        </div>
        <div className={styles.stat}>
          <span className={`${styles.statNumber} ${styles.pink}`}>
            {trail.filter((t) => t.contractType === "RANK").length}
          </span>
          <span className={styles.statLabel}>Ranks</span>
        </div>
      </div>

      <div className={styles.search}>
        <div className={styles.searchNav}>
          <img src="/searchbar.png" alt="search" />
          <input
            type="search"
            className={styles.look}
            placeholder="Search by name, matricule, code, hash..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.filters}>
          {["ALL", "ACTIVE", "REVOKED", "DIPLOMA", "INTERNSHIP", "STUDY", "RANK"].map(
            (f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ""}`}
              >
                {f}
              </button>
            ),
          )}
        </div>
      </div>

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
              {records.length > 0 ? (
                records.map((item) => (
                  <tr className={styles.row} key={item.id}>
                    <td className={styles.column}>
                      {new Date(item.issueDate).toLocaleDateString("fr-FR")}
                    </td>
                    <td className={styles.column}>
                      <img
                        src={
                          item.studentAvatar
                            ? `${process.env.REACT_APP_API_URL}${item.studentAvatar}`
                            : "/students.jpg"
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
                      <span
                        className={styles.hash}
                        title={item.blockchainCertId}
                      >
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

        <nav className={styles.arr}>
          <div className={styles.pagination}>
            <button
              className={styles.change}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
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
                  onClick={() => setCurrentPage(n)}
                >
                  {n}
                </button>
              </div>
            ))}
            <button
              className={styles.change}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
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
