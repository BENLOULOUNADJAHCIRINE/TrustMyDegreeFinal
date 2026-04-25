import styles from "./Request.module.css";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

function Request() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [request, setRequest] = useState([]);
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc",
  });

  /*each column be sorted*/
  function handleSort(key) {
    let direction = "asc";

    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }

    setSortConfig({ key, direction });
  }

  // Pagination State
  const [currentPage, setcurentPage] = useState(1);
  const perPage = 5;
  const pagesPerGroup = 3;

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
    fetchRequests();
  }, []);

  // Centralized fetch to keep stats and list in sync
  const fetchRequests = () => {
    fetch("http://localhost:5000/api/admin/requests", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setRequest(data.requests || []);
        setStats({
          TotalRequests: { number: data.summary.total, percentage: "" },
          pendingApproval: { number: data.summary.pending, percentage: "" },
          Approved: { number: data.summary.approved, percentage: "" },
          Rejected: { number: data.summary.rejected, percentage: "" },
        });
      })
      .catch((err) => console.log(err));
  };

  const filteredRequests = request.filter(
    (req) =>
      req.id?.toLowerCase().includes(search.toLowerCase()) ||
      req.student?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      req.student?.matricule?.toLowerCase().includes(search.toLowerCase()) ||
      req.documentType?.toLowerCase().includes(search.toLowerCase()) ||
      req.priority?.toLowerCase().includes(search.toLowerCase()) ||
      req.createdAt?.toLowerCase().includes(search.toLowerCase()),
  );

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let aValue;
    let bValue;

    switch (sortConfig.key) {
      case "student":
        aValue = a.student?.fullName || "";
        bValue = b.student?.fullName || "";
        break;
      case "createdAt":
        aValue = new Date(a.createdAt);
        bValue = new Date(b.createdAt);
        break;

      default:
        aValue = a[sortConfig.key];
        bValue = b[sortConfig.key];
    }

    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  // Handle Export
  function downloadExcel() {
    fetch("http://localhost:5000/api/admin/requests/export", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
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
      .catch((err) => console.log(err));
  }

  function viewDocument(id) {
    const token = localStorage.getItem("token");

    fetch(`http://localhost:5000/api/admin/requests/${id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("File not found");
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, "_blank");
      })
      .catch((err) => {
        console.error(err);
        toast.error(
          "Could not open document. Ensure it was uploaded correctly.",
        );
      });
  }

  function uploadDocument(id) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.doc,.docx";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("document", file);

      fetch(`http://localhost:5000/api/admin/requests/${id}/upload`, {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.request) {
            // Update local state with the returned object
            const updated = request.map((r) =>
              r.id === id ? data.request : r,
            );
            setRequest(updated);
            toast.success("Document uploaded and approved successfully!");
          }
        })
        .catch((err) => console.log(err), toast.error("Upload failed"));
    };
    input.click();
  }

  function updateStatus(id, newStatus) {
    fetch(`http://localhost:5000/api/admin/requests/${id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
      body: JSON.stringify({ status: newStatus }),
    })
      .then((res) => res.json())
      .then(() => {
        const updated = request.map((c) =>
          c.id === id ? { ...c, status: newStatus } : c,
        );
        setRequest(updated);
        setOpenMenu(null);
        toast.success(`Request ${newStatus.toLowerCase()} successfully.`);
      })
      .catch((err) => console.log(err), toast.error("Update failed"));
  }

  // --- PAGINATION LOGIC ---
  useEffect(() => {
    setcurentPage(1);
  }, [search]);

  const Lastindex = currentPage * perPage;
  const Firstindex = Lastindex - perPage;
  const records = sortedRequests.slice(Firstindex, Lastindex);
  const numberofpages = Math.ceil(filteredRequests.length / perPage);
  const currentGroup = Math.ceil(currentPage / pagesPerGroup);
  const startPage = (currentGroup - 1) * pagesPerGroup + 1;
  const endPage = Math.min(startPage + pagesPerGroup - 1, numberofpages);

  const numbers = [];
  for (let i = startPage; i <= endPage; i++) numbers.push(i);

  function prevPage() {
    if (startPage > 1) setcurentPage(startPage - pagesPerGroup);
  }
  function nextPage() {
    if (endPage < numberofpages) setcurentPage(endPage + 1);
  }
  function changeCurrentPage(id) {
    setcurentPage(id);
  }

  return (
    <div className={styles["main-content"]}>
      <div className={styles.login}>
        <h4>Requests</h4>
        <div className={styles.info}>
          <div className={styles.subinfo}>
            <h4>{user ? user.fullName : "Guest"}</h4>
            <p>{user ? user.email : "guest25@ensta.edu.dz"}</p>
          </div>
          <img src={user?.avatar || "/totalcertaficates.png"} alt="ava" />
        </div>
      </div>

      {/* {statusMsg && <div className={styles.successBanner}>{statusMsg}</div>} */}

      <div className={styles.search}>
        <div className={styles.title}>
          <div>
            <h3>Document Requests</h3>
            <p>Review and manage student document submissions.</p>
          </div>

          <div className={styles.searchNav}>
            <img src="/searchbar.png" alt="search" />
            <input
              className={styles.look}
              type="search"
              placeholder="Search requests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.edit}>
          <img src="/dwnld.png" alt="search" />
          <button onClick={downloadExcel}>Export Excel</button>
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles["Total-Requests"]}>
          <div>
            <img src="/TotalRequests.png" alt="TR" />
            <p>{stats?.TotalRequests.percentage}</p>
          </div>
          <h5>Total Requests</h5>
          <h2>{stats?.TotalRequests.number || "0"}</h2>
        </div>
        <div className={styles["Pending-Approval"]}>
          <div>
            <img src="/PendingApproval.png" alt="PA" />
            <p>{stats?.pendingApproval.percentage}</p>
          </div>
          <h5>Pending Approval</h5>
          <h2>{stats?.pendingApproval.number || "0"}</h2>
        </div>
        <div className={styles["Approved"]}>
          <div>
            <img src="/Approved.png" alt="AP" />
            <p>{stats?.Approved.percentage}</p>
          </div>
          <h5>Approved</h5>
          <h2>{stats?.Approved.number || "0"}</h2>
        </div>
        <div className={styles["Rejected"]}>
          <div>
            <img src="/Rejected.png" alt="RE" />
            <p>{stats?.Rejected.percentage}</p>
          </div>
          <h5>Rejected</h5>
          <h2>{stats?.Rejected.number || "0"}</h2>
        </div>
      </div>

      <div className={styles.main}>
        <div className={styles.countainer}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.line}>
                <th className={styles.colu} onClick={() => handleSort("id")}>
                  Request ID{" "}
                  {sortConfig.key === "id"
                    ? sortConfig.direction === "asc"
                      ? "↑"
                      : "↓"
                    : ""}
                </th>
                <th
                  className={styles.colu}
                  onClick={() => handleSort("student")}
                >
                  {" "}
                  Student{" "}
                  {sortConfig.key === "student"
                    ? sortConfig.direction === "asc"
                      ? "↑"
                      : "↓"
                    : ""}
                </th>
                <th
                  className={styles.colu}
                  onClick={() => handleSort("documentType")}
                >
                  Document Type
                  {sortConfig.key === "documentType"
                    ? sortConfig.direction === "asc"
                      ? "↑"
                      : "↓"
                    : ""}
                </th>
                <th
                  className={styles.colu}
                  onClick={() => handleSort("priority")}
                >
                  Priority
                  {sortConfig.key === "priority"
                    ? sortConfig.direction === "asc"
                      ? "↑"
                      : "↓"
                    : ""}
                </th>
                <th
                  className={styles.colu}
                  onClick={() => handleSort("createdAt")}
                >
                  Submitted
                  {sortConfig.key === "createdAt"
                    ? sortConfig.direction === "asc"
                      ? "↑"
                      : "↓"
                    : ""}
                </th>
                <th
                  className={styles.colu}
                  onClick={() => handleSort("status")}
                >
                  Status
                  {sortConfig.key === "status"
                    ? sortConfig.direction === "asc"
                      ? "↑"
                      : "↓"
                    : ""}
                </th>
                <th className={styles.colu}>Upload</th>
                <th className={styles.colu}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.length > 0 ? (
                records.map((req) => (
                  <tr className={styles.line} key={req.id}>
                    <td className={styles.column}>
                      {req.id.substring(0, 8)}...
                    </td>
                    <td className={styles.column}>
                      <div className={styles.leftside}>
                        <span className={styles.student}>
                          {req.student?.fullName}
                        </span>
                        <span className={styles.email}>
                          {req.student?.matricule}
                        </span>
                      </div>
                    </td>
                    <td className={styles.column}>{req.documentType}</td>
                    <td className={styles.column}>
                      <span
                        className={`${styles.priority} ${req.priority?.toLowerCase() === "normal" ? styles.normal : styles.urgent}`}
                      >
                        {req.priority}
                      </span>
                    </td>
                    <td className={styles.column}>
                      {new Date(req.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className={styles.column}>
                      <span
                        className={`${styles.status} ${styles[req.status?.toLowerCase() || "pending"]}`}
                      >
                        {req.status || "PENDING"}
                      </span>
                    </td>
                    <td className={styles.column}>
                      <button
                        className={styles.upload}
                        onClick={() => uploadDocument(req.id)}
                      >
                        &#10515; upload
                      </button>
                    </td>
                    <td className={styles.column}>
                      <div className={styles.actions}>
                        <span
                          className={styles.dots}
                          onClick={() =>
                            setOpenMenu(openMenu === req.id ? null : req.id)
                          }
                        >
                          ⋮
                        </span>
                        {openMenu === req.id && (
                          <div className={styles.menu}>
                            {req.fileUrl && (
                              <button
                                className={styles.viewBtn}
                                onClick={() => {
                                  viewDocument(req.id);
                                  setOpenMenu(null);
                                }}
                              >
                                View Doc
                              </button>
                            )}
                            <button
                              onClick={() => updateStatus(req.id, "APPROVED")}
                            >
                              approve
                            </button>
                            <button
                              onClick={() => updateStatus(req.id, "REJECTED")}
                            >
                              reject
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="8"
                    style={{ textAlign: "center", padding: "20px" }}
                  >
                    No data found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <nav className={styles.arr}>
          <div className={styles.pagination}>
            <button className={styles.change} onClick={prevPage}>
              prev
            </button>
            {numbers.map((n) => (
              <div
                className={`${styles["page-item"]} ${currentPage === n ? styles.pageActive : ""}`}
                key={n}
              >
                <button
                  className={styles["page-link"]}
                  onClick={() => changeCurrentPage(n)}
                >
                  {n}
                </button>
              </div>
            ))}
            <button className={styles.change} onClick={nextPage}>
              next
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}

export default Request;
