import styles from "./Request.module.css";
import { useState, useEffect } from "react";

function Request() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [request, setRequest] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  useEffect(() => {
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
  }, []);

  const filteredRequests = request.filter(
    (req) =>
      req.id?.toLowerCase().includes(search.toLowerCase()) ||
      req.student?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      req.student?.matricule?.toLowerCase().includes(search.toLowerCase()) ||
      req.documentType?.toLowerCase().includes(search.toLowerCase()) ||
      req.priority?.toLowerCase().includes(search.toLowerCase()) ||
      req.createdAt?.toLowerCase().includes(search.toLowerCase()),
  );

  function downloadExcel() {
    console.log("downlaod request");
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

  useEffect(() => {
    setcurentPage(1);
  }, [search]);

  const [currentPage, setcurentPage] = useState(1);
  const perPage = 5;
  const pagesPerGroup = 3;

  const Lastindex = currentPage * perPage;
  const Firstindex = Lastindex - perPage;

  const records = filteredRequests.slice(Firstindex, Lastindex);

  const numberofpages = Math.ceil(filteredRequests.length / perPage);
  const currentGroup = Math.ceil(currentPage / pagesPerGroup);

  const startPage = (currentGroup - 1) * pagesPerGroup + 1;
  const endPage = Math.min(startPage + pagesPerGroup - 1, numberofpages);

  const numbers = [];
  for (let i = startPage; i <= endPage; i++) {
    numbers.push(i);
  }

  function prevPage() {
    if (startPage > 1) {
      setcurentPage(startPage - pagesPerGroup);
    }
  }

  function changeCurrentPage(id) {
    setcurentPage(id);
  }

  function nextPage() {
    if (endPage < numberofpages) {
      setcurentPage(endPage + 1);
    }
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
      formData.append("status", "APPROVED");

      fetch(`http://localhost:5000/api/admin/requests/${id}/upload`, {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          const updated = request.map((r) =>
            r.id === id
              ? { ...r, status: "APPROVED", fileUrl: data.request.fileUrl }
              : r,
          );
          setRequest(updated);
          alert("Document uploaded successfully!");
        })
        .catch((err) => console.log(err));
    };
    input.click();
  }

  const [openMenu, setOpenMenu] = useState(null);

  function updateStatus(id, newStatus) {
    console.log("active demande");

    fetch(`http://localhost:5000/api/admin/requests/${id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
      body: JSON.stringify({ status: newStatus }),
    })
      .then((res) => res.json())
      .then((data) => {
        const updated = request.map((c) =>
          c.id === id ? { ...c, status: newStatus } : c,
        );
        setRequest(updated);
        setOpenMenu(null);
      })
      .catch((err) => console.log(err));
  }

  return (
    <div className={styles["main-content"]}>
      <div className={styles.login}>
        <h4>Requests</h4>
        <div className={styles.info}>
          <div className={styles.subinfo}>
            <h4>{user ? user.fullName : "guest"}</h4>{" "}
            <p>{user ? user.email : "guest25@ensta.edu.dz"}</p>
          </div>
          <img src={user?.avatar || "/totalcertaficates.png"} alt="ava" />
        </div>
      </div>

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
              name="search"
              placeholder="Search requests..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
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
            <img src="/TotalRequests.png" alt="TotalRequests" />
            <p>{stats ? stats.TotalRequests.percentage : "..."}</p>
          </div>
          <h5>Total Requests</h5>
          <h2>{stats ? stats.TotalRequests.number : "..."}</h2>
        </div>

        <div className={styles["Pending-Approval"]}>
          <div>
            <img src="/PendingApproval.png" alt="PendingApproval" />
            <p>{stats ? stats.pendingApproval.percentage : "..."}</p>
          </div>
          <h5>Pending Approval</h5>
          <h2>{stats ? stats.pendingApproval.number : "..."}</h2>
        </div>

        <div className={styles["Approved"]}>
          <div>
            <img src="/Approved.png" alt="Approved" />
            <p>{stats ? stats.Approved.percentage : "..."}</p>
          </div>
          <h5>Approved</h5>
          <h2>{stats ? stats.Approved.number : "..."}</h2>
        </div>
        <div className={styles["Rejected"]}>
          <div>
            <img src="/Rejected.png" alt="Rejected" />
            <p>{stats ? stats.Rejected.percentage : "..."}</p>
          </div>
          <h5>Rejected</h5>
          <h2>{stats ? stats.Rejected.number : "..."}</h2>
        </div>
      </div>

      <div className={styles.main}>
        <div className={styles.countainer}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.line}>
                <th className={styles.colu}>Request ID</th>
                <th className={styles.colu}>Student</th>
                <th className={styles.colu}>Document Type</th>
                <th className={styles.colu}>Priority</th>
                <th className={styles.colu}>Submitted</th>
                <th className={styles.colu}>Status</th>
                <th className={styles.colu}>upload</th>
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
                    <td className={styles.column}>
                      <span className={styles.docum}>{req.documentType}</span>
                    </td>
                    <td className={styles.column}>
                      <span
                        className={`${styles.priority} ${req.priority?.toLowerCase() === "normal" ? styles.normal : styles.urgent}`}
                      >
                        {req.priority}
                      </span>
                    </td>
                    <td className={styles.column}>
                      <span className={styles.issue_date}>
                        {new Date(req.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                    </td>

                    <td className={styles.column}>
                      <span
                        className={`${styles.status} ${
                          req.status?.toLowerCase() === "approved"
                            ? styles.approved
                            : req.status?.toLowerCase() === "rejected"
                              ? styles.rejected
                              : styles.pending
                        }`}
                      >
                        {req.status || "PENDING"}
                      </span>
                    </td>

                    <td className={styles.column}>
                      <div className={styles.uploadcontainer}>
                        <button
                          className={styles.upload}
                          onClick={() => uploadDocument(req.id)}
                        >
                          &#10515; upload
                        </button>
                      </div>
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
                <tr className={styles.row}>
                  <td colSpan="8">No data found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <nav className={styles.arr}>
          <div className={styles.pagination}>
            <div className={styles["page-item"]}>
              <button className={styles.change} onClick={prevPage}>
                prev
              </button>
            </div>

            {numbers.map((n, i) => (
              <div
                className={`${styles["page-item"]} ${currentPage === n ? styles.pageActive : ""}`}
                key={i}
              >
                <button
                  className={styles["page-link"]}
                  onClick={() => changeCurrentPage(n)}
                >
                  {n}
                </button>
              </div>
            ))}

            <div className={styles["page-item"]}>
              <button className={styles.change} onClick={nextPage}>
                next
              </button>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}

export default Request;
