import styles from "./List.module.css";
import { useEffect } from "react";
import { useState } from "react";
import api from "../../../api"; // use api instead of fetch

function List() {
  const [user, setUser] = useState(null);
  const [certaficate, setCertaficate] = useState([]);
  const [search, setSearch] = useState("");

  // get user from localStorage
  useEffect(() => {
    const role = localStorage.getItem("role");
    setUser({ fullName: role === "ADMIN" ? "Admin" : "Super Admin" });
  }, []);

  // the new route we added 
  useEffect(() => {
    api.get("/admin/certificates")
      .then((res) => setCertaficate(res.data.certificates || []))
      .catch((err) => console.log(err));
  }, []);

  /* search bar filter - not changed */
  const filteredCertificates = certaficate.filter(
    (cert) =>
      cert.student?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      cert.student?.matricule?.toLowerCase().includes(search.toLowerCase()) ||
      cert.type?.toLowerCase().includes(search.toLowerCase()) ||
      cert.specialty?.toLowerCase().includes(search.toLowerCase()) ||
      cert.status?.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    setcurentPage(1);
  }, [search]);

  // download excel - not changed
  function downloadExcel() {
    console.log("download request");
    fetch("http://localhost:5000/api/admin/certificates/export", {
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

  const records = filteredCertificates.slice(Firstindex, Lastindex);
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

  
  function revokeCertificate(id) {
    if (!window.confirm("Are you sure you want to revoke this certificate?")) return;

    api.put(`/admin/certificates/${id}/revoke`)
      .then(() => {
        const updated = certaficate.map((c) =>
          c.id === id ? { ...c, status: "REVOKED" } : c,
        );
        setCertaficate(updated);
        setOpenMenu(null);
      })
      .catch((err) => console.log(err));
  }
  function viewCertificate(id) {
  const token = localStorage.getItem("token");
  fetch(`http://localhost:5000/api/admin/certificates/${id}/download`, {
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
        <div className={styles.page}>
          <h4>Certificate List</h4>
        </div>
        <div className={styles.info}>
          <div className={styles.subinfo}>
            <h4>{user ? user.fullName : "guest"}</h4>
            <p>{user ? user.email : "guest25@ensta.edu.dz"}</p>
          </div>
          {/* removed user?.avatar since admin has no avatar */}
          <img src="/totalcertaficates.png" alt="avatar" />
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
      </div>

      <div className={styles.main}>
        <div className={styles.countainer}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.row}>
                <th className={styles.colu}>ID</th>
                <th className={styles.colu}>Student</th>
                <th className={styles.colu}>Matricule</th>
                <th className={styles.colu}>Type</th>
                <th className={styles.colu}>Specialty</th>
                <th className={styles.colu}>Issue Date</th>
                <th className={styles.colu}>Statut</th>
                <th className={styles.colu}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.length > 0 ? (
                records.map((cert) => (
                  <tr className={styles.row} key={cert.id}>
                    <td className={styles.column}>{cert.id.substring(0, 8)}...</td>
                    <td className={styles.column}>
                      <img src="/students.jpg" alt="student" />
                      <span className={styles.student}>{cert.student?.fullName}</span>
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
    <button onClick={() => revokeCertificate(cert.id)}>
      Revoke
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
              <button className={styles.change} onClick={prevPage}>prev</button>
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
              <button className={styles.change} onClick={nextPage}>next</button>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}

export default List;