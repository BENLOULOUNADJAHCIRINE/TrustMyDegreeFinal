import styles from "./List.module.css";
import { useEffect } from "react";
import { useState } from "react";
import api from "../../../api"; // use api instead of fetch
import { toast } from "react-hot-toast";
function List() {
  const [user, setUser] = useState(null);
  const [certaficate, setCertaficate] = useState([]);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc",
  });

  // get user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      parsed.role === "ADMIN"
        ? setUser({ name: "Admin", email: parsed.email, avatar: parsed.avatar || null })
        : setUser({ name: "Super Admin", email: parsed.email, avatar: parsed.avatar || null });
    }
  }, []);

  // the new route we added
  useEffect(() => {
    api
      .get("/admin/certificates")
      .then((res) => setCertaficate(res.data.certificates || []))
      .catch((err) => console.log(err));
  }, []);

  /*each column be sorted*/
  function handleSort(key) {
    let direction = "asc";

    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }

    setSortConfig({ key, direction });
  }

  /* search bar filter - not changed */
  const filteredCertificates = certaficate.filter(
    (cert) =>
      cert.student?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      cert.student?.matricule?.toLowerCase().includes(search.toLowerCase()) ||
      cert.type?.toLowerCase().includes(search.toLowerCase()) ||
      cert.specialty?.toLowerCase().includes(search.toLowerCase()) ||
      cert.status?.toLowerCase().includes(search.toLowerCase()),
  );

  const sortedCertificates = [...filteredCertificates].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let aValue;
    let bValue;

    switch (sortConfig.key) {
      case "student":
        aValue = a.student?.fullName || "";
        bValue = b.student?.fullName || "";
        break;
      case "matricule":
        aValue = a.student?.matricule || "";
        bValue = b.student?.matricule || "";
        break;
      case "issueDate":
        aValue = new Date(a.issueDate);
        bValue = new Date(b.issueDate);
        break;
      default:
        aValue = a[sortConfig.key];
        bValue = b[sortConfig.key];
    }

    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  useEffect(() => {
    setcurentPage(1);
  }, [search]);

  // download excel - not changed
  function downloadExcel() {
    console.log("download request");
    fetch(`${process.env.REACT_APP_API_URL}/api/admin/certificates/export`, {
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

  /* pagination - not changed */
  const [currentPage, setcurentPage] = useState(1);
  const perPage = 8;
  const pagesPerGroup = 4;

  const Lastindex = currentPage * perPage;
  const Firstindex = Lastindex - perPage;

  const records = sortedCertificates.slice(Firstindex, Lastindex);
  const numberofpages = Math.ceil(filteredCertificates.length / perPage);
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

  const [openMenu, setOpenMenu] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  function revokeCertificate(id) {
    toast((t) => (
      <div className={styles.toastConfirm}>
        <span>Are you sure you want to revoke this certificate?</span>
        <div className={styles.toastButtons}>
          <button
            className={styles.toastConfirmBtn}
            onClick={() => {
              toast.dismiss(t.id);
              api.put(`/admin/certificates/${id}/revoke`)
                .then(() => {
                  const updated = certaficate.map((c) =>
                    c.id === id ? { ...c, status: "REVOKED" } : c
                  );
                  setCertaficate(updated);
                  setOpenMenu(null);
                  toast.success("Certificate revoked successfully");
                })
                .catch((err) => {
                  const message = err.response?.data?.message || "Failed to revoke certificate";
                  toast.error(message);
                });
            }}
          >
            Confirm
          </button>
          <button
            className={styles.toastCancelBtn}
            onClick={() => toast.dismiss(t.id)}
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  }
function unrevokeCert(id) {
  toast((t) => (
    <div className={styles.toastConfirm}>
      <span>Are you sure you want to unrevoke this certificate?</span>
      <div className={styles.toastButtons}>
        <button
          className={styles.toastConfirmBtn}
          onClick={() => {
            toast.dismiss(t.id);
            api.put(`/admin/certificates/${id}/unrevoke`)
              .then(() => {
                const updated = certaficate.map((c) =>
                  c.id === id ? { ...c, status: "ACTIVE" } : c
                );
                setCertaficate(updated);
                toast.success("Certificate unrevoked successfully");
              })
              .catch((err) => {
                const message = err.response?.data?.message || "Failed to unrevoke certificate";
                toast.error(message);
              });
          }}
        >
          Confirm
        </button>
        <button
          className={styles.toastCancelBtn}
          onClick={() => toast.dismiss(t.id)}
        >
          Cancel
        </button>
      </div>
    </div>
  ), { duration: Infinity });
}

  function toggleSelect(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }

  function toggleSelectAll() {
    const allIds = filteredCertificates.map((c) => c.id);

    const allSelected = allIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allIds);
    }
  }

  function resetTable() {
    setSearch("");
    setSortConfig({ key: null, direction: "asc" });
    setcurentPage(1);
    setSelectedIds([]);
  }

  function bulkRevoke() {
  const activeSelected = selectedIds.filter(
    (id) => certaficate.find((c) => c.id === id)?.status !== "REVOKED",
  );

  if (activeSelected.length === 0) {
    toast.info("All selected certificates are already revoked.");
    return;
  }

  toast((t) => (
    <div className={styles.toastConfirm}>
      <span>Are you sure you want to revoke {activeSelected.length} certificate(s)?</span>
      <div className={styles.toastButtons}>
        <button
          className={styles.toastConfirmBtn}
          onClick={() => {
            toast.dismiss(t.id);
            api.put("/admin/certificates/bulk-revoke", { ids: activeSelected })
              .then((res) => {
                const updated = certaficate.map((c) =>
                  activeSelected.includes(c.id) ? { ...c, status: "REVOKED" } : c,
                );
                setCertaficate(updated);
                setSelectedIds([]);
                toast.info(res.data.message);
              })
              .catch((err) => console.log(err));
          }}
        >
          Confirm
        </button>
        <button
          className={styles.toastCancelBtn}
          onClick={() => toast.dismiss(t.id)}
        >
          Cancel
        </button>
      </div>
    </div>
  ), { duration: Infinity });
}

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
      .catch((err) => console.log(err));
  }

  return (
    <div className={styles["main-content"]}>
      <div className={styles.login}>
        <h4>Certificate List</h4>

        <div className={styles.info}>
          <div className={styles.subinfo}>
            <h4>{user ? user.name : "guest"}</h4>
            <p>{user ? user.email : "guest25@ensta.edu.dz"}</p>
          </div>
          <img src={user?.avatar ? user.avatar : "/totalcertaficates.png"} alt="avatar" />
        </div>
      </div>

      <div className={styles.search}>
        <div className={styles.searchNav}>
          <img src="/searchbar.png" alt="search" />
          <input
            className={styles.look}
            type="search"
            name="search"
            placeholder="Search by name, registration number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.edit}>
          <img src="/downloadsign.png" alt="search" />

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
      <div className={styles.main}>
        <button className={styles.reset} onClick={resetTable}>
          Reset
        </button>
        <div className={styles.countainer}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.row}>
                <th className={styles.colu}>
                  {" "}
                  <input
                    type="checkbox"
                    onChange={toggleSelectAll}
                    checked={
                      filteredCertificates.length > 0 &&
                      filteredCertificates.every((c) =>
                        selectedIds.includes(c.id),
                      )
                    }
                  />{" "}
                </th>
                <th className={styles.colu} onClick={() => handleSort("id")}>
                  ID{" "}
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
                  Student{" "}
                  {sortConfig.key === "student"
                    ? sortConfig.direction === "asc"
                      ? "↑"
                      : "↓"
                    : ""}
                </th>
                <th
                  className={styles.colu}
                  onClick={() => handleSort("matricule")}
                >
                  Matricule{" "}
                  {sortConfig.key === "matricule"
                    ? sortConfig.direction === "asc"
                      ? "↑"
                      : "↓"
                    : ""}
                </th>
                <th className={styles.colu} onClick={() => handleSort("type")}>
                  Type{" "}
                  {sortConfig.key === "type"
                    ? sortConfig.direction === "asc"
                      ? "↑"
                      : "↓"
                    : ""}
                </th>
                <th
                  className={styles.colu}
                  onClick={() => handleSort("specialty")}
                >
                  Specialty{" "}
                  {sortConfig.key === "specialty"
                    ? sortConfig.direction === "asc"
                      ? "↑"
                      : "↓"
                    : ""}
                </th>
                <th
                  className={styles.colu}
                  onClick={() => handleSort("issueDate")}
                >
                  Issue Date{" "}
                  {sortConfig.key === "issueDate"
                    ? sortConfig.direction === "asc"
                      ? "↑"
                      : "↓"
                    : ""}
                </th>
                <th
                  className={styles.colu}
                  onClick={() => handleSort("status")}
                >
                  Statuts{" "}
                  {sortConfig.key === "status"
                    ? sortConfig.direction === "asc"
                      ? "↑"
                      : "↓"
                    : ""}
                </th>
                <th className={styles.colu}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.length > 0 ? (
                records.map((cert) => (
                  <tr className={styles.row} key={cert.id}>
                    <td className={styles.column}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(cert.id)}
                        onChange={() => toggleSelect(cert.id)}
                      />
                    </td>
                    <td className={styles.column}>
                      {cert.id.substring(0, 8)}...
                    </td>
                    <td className={styles.column}>
                      <img
                        src={cert.student?.avatar ? `${process.env.REACT_APP_API_URL}${cert.student.avatar}` : "/students.jpg"}
                        alt="student"
                      />
                      <span className={styles.student}>
                        {cert.student?.fullName}
                      </span>
                    </td>
                    <td className={styles.column}>{cert.student?.matricule}</td>
                    <td className={styles.column}>
                      <span className={styles.type}>{cert.type}</span>
                    </td>
                    <td className={styles.column}>
                      <span className={styles.specialty}>{cert.specialty}</span>
                    </td>
                    <td className={styles.column}>
                      {new Date(cert.issueDate).toLocaleDateString("fr-FR")}
                    </td>
                    <td className={styles.column}>
                      <span
                        className={`${styles.status} ${cert.status === "ACTIVE" ? styles.active : styles.revoked}`}
                      >
                        {" "}
                        {cert.status}{" "}
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
                          {" "}
                          ⋮{" "}
                        </span>
                        {openMenu === cert.id && (
                          <div className={styles.menu}>
                            <button onClick={() => viewCertificate(cert.id)}>View PDF</button>
                            {cert.status === "REVOKED" ? (
                              <button onClick={() => unrevokeCert(cert.id)}>Unrevoke</button>
                            ) : (
                              <button onClick={() => revokeCertificate(cert.id)}>Revoke</button>
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

export default List;
