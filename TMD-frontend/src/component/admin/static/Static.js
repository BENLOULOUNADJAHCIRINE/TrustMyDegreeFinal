import styles from "./Static.module.css";
import { useState, useEffect } from "react";
import { defaults } from "chart.js/auto";
import { Line, Bar, Doughnut } from "react-chartjs-2";

defaults.maintainAspectRatio = false;
defaults.responsive = true;
defaults.plugins.title.display = true;
defaults.plugins.title.align = "start";
defaults.plugins.title.font.size = 20;
defaults.plugins.title.color = "black";

let _statsCache = null;
let _statsCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

function Static() {
  const pieColors = [
    "#1E3A8A", "#10B981", "#F59E0B",
    "#8B5CF6", "#EF4444", "#be185d",
  ];

  const [user, setUser]         = useState(null);
  const [bargraph, setBargraph] = useState([]);
  const [linegraph, setLinegraph] = useState([]);
  const [piegraph, setPiegraph] = useState([]);
  const [heatmap, setHeatmap]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      parsed.role === "ADMIN"
        ? setUser({ name: "Admin",       email: parsed.email, avatar: parsed.avatar || null })
        : setUser({ name: "Super Admin", email: parsed.email, avatar: parsed.avatar || null });
    }
  }, []);

  function applyStats(data) {
    const monthlyVerifications = {};
    const heatFormatted = Object.entries(data.verificationsPerDay).map(
      ([day, value], i) => {
        const month = new Date(day).toLocaleString("fr-FR", { month: "short" });
        monthlyVerifications[month] = (monthlyVerifications[month] || 0) + value;
        return { day, week: Math.floor(i / 7), value };
      }
    );
    setHeatmap(heatFormatted);

    setLinegraph(
      Object.entries(data.monthlyIssuance).map(([label, value]) => ({
        label,
        Issuances: value,
        verification: monthlyVerifications[label] || 0,
      }))
    );

    setPiegraph(
      Object.entries(data.DistributionByType).map(([label, value]) => ({
        label,
        value,
      }))
    );

    setBargraph(
      data.topSpecialties.map((s) => ({
        label: s.specialty,
        value: s._count.specialty,
      }))
    );
  }

  useEffect(() => {
    if (_statsCache && Date.now() - _statsCacheTime < CACHE_TTL) {
      applyStats(_statsCache);
      setLoading(false);
      return;
    }

    fetch(`${process.env.REACT_APP_API_URL}/api/admin/statistics`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        _statsCache = data;
        _statsCacheTime = Date.now();
        applyStats(data);
      })
      .catch((err) => console.log(err))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles["main-content"]}>
      <div className={styles.login}>
        <h4>Statistics</h4>
        <div className={styles.info}>
          <div className={styles.subinfo}>
            <h4>{user ? user.name : "guest"}</h4>
            <p>{user ? user.email : "guest25@ensta.edu.dz"}</p>
          </div>
          <img
            src={
              user?.avatar
                ? user.avatar
                : "/totalcertaficates.png"
            }
            alt="ava"
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#6b7280" }}>
          Loading statistics…
        </div>
      ) : (
        <div className={styles["render-content"]}>
          {/* ── Line chart ────────────────────────────────────────── */}
          <div className={styles.line}>
            <div className={styles.chartTitle}>
              <img src="/line.png" alt="line" />
              <span>Monthly Issuance Trend</span>
            </div>
            <Line
              data={{
                labels: linegraph.map((d) => d.label),
                datasets: [
                  {
                    label: "verification",
                    data: linegraph.map((d) => d.verification),
                    backgroundColor: ["#10B981"],
                    borderColor: "#10B981",
                  },
                  {
                    label: "Issuances",
                    data: linegraph.map((d) => d.Issuances),
                    backgroundColor: ["#1E3A8A"],
                    borderColor: "#1E3A8A",
                  },
                ],
              }}
              options={{
                responsive: true,
                interaction: { mode: "index", intersect: false },
                elements: {
                  line:  { tension: 0.5, borderWidth: 3 },
                  point: { radius: 4, hoverRadius: 6 },
                },
                plugins: {
                  legend: {
                    position: "top",
                    align: "end",
                    labels: { boxWidth: 12 },
                  },
                  tooltip: { backgroundColor: "#111827", padding: 10, cornerRadius: 6 },
                  title: { display: false },
                },
                scales: {
                  x: {
                    grid: { display: false },
                    ticks: {
                      color: "#6A7282",
                      font: { size: 10, weight: "500" },
                      padding: 10,
                      autoSkip: true,
                      maxRotation: 0,
                      minRotation: 0,
                    },
                  },
                  y: {
                    grid: { color: "rgba(0,0,0,0.05)" },
                    ticks: { stepSize: 10, color: "#6A7282", font: { size: 12 } },
                  },
                },
              }}
            />
          </div>

          {/* ── Doughnut chart ────────────────────────────────────── */}
          <div className={styles.pie}>
            <div className={styles.chartTitle}>
              <img src="/pie.png" alt="pie" />
              <span>Distribution by Type</span>
            </div>
            <div className={styles.doughnutWrapper}>
              <Doughnut
                data={{
                  labels: piegraph.map((d) => d.label),
                  datasets: [
                    {
                      data: piegraph.map((d) => d.value),
                      backgroundColor: pieColors,
                      borderRadius: 8,
                      spacing: 4,
                    },
                  ],
                }}
                options={{
                  cutout: "70%",
                  plugins: {
                    legend: { display: false },
                    title:  { display: false },
                  },
                }}
              />
            </div>
            <div className={styles.legend}>
              {piegraph.map((item, index) => (
                <div key={item.label} className={styles.legendItem}>
                  <div>
                    <span
                      className={styles.dot}
                      style={{ backgroundColor: pieColors[index] }}
                    />
                    <span>{item.label}</span>
                  </div>
                  <span className={styles.percent}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Bar chart ─────────────────────────────────────────── */}
          <div className={styles.bar}>
            <div className={styles.chartTitle}>
              <img src="/bar.png" alt="bar" />
              <span>Top Specialties</span>
            </div>
            <Bar
              data={{
                labels: bargraph.map((d) => {
                  const words = d.label.split(" ");
                  const lines = [];
                  let current = "";
                  words.forEach((word) => {
                    if ((current + word).length > 15) {
                      lines.push(current);
                      current = word;
                    } else {
                      current += (current ? " " : "") + word;
                    }
                  });
                  if (current) lines.push(current);
                  return lines;
                }),
                datasets: [
                  {
                    data: bargraph.map((d) => d.value),
                    backgroundColor: "#1E3A8A",
                    borderRadius: 8,
                    barThickness: 30,
                  },
                ],
              }}
              options={{
                indexAxis: "y",
                maintainAspectRatio: false,
                layout: { padding: { left: 30 } },
                plugins: {
                  legend: { display: false },
                  title:  { display: false },
                },
                scales: {
                  x: { grid: { display: false }, ticks: { display: false } },
                  y: {
                    grid: { display: false },
                    ticks: { autoSkip: false, padding: 10, font: { size: 12 } },
                  },
                },
              }}
            />
          </div>

          {/* ── Heatmap ───────────────────────────────────────────── */}
          <div className={styles.square}>
            <div className={styles.heatHeader}>
              <div className={styles.chartTitle}>
                <div className={styles.heatIcon}>
                  <img src="/map.png" alt="heatmap" />
                </div>
                <span>Verifications per day</span>
              </div>
            </div>
            <div className={styles.heatGrid}>
              {heatmap.map((cell, i) => {
                const intensity = Math.min(cell.value / 100, 1);
                const color = `rgba(30, 58, 138, ${0.1 + intensity * 0.9})`;
                return (
                  <div
                    key={i}
                    className={styles.heatCell}
                    style={{ backgroundColor: color }}
                    title={`${cell.day} W${cell.week}: ${cell.value}`}
                  />
                );
              })}
            </div>
            <div className={styles.heatLegend}>
              <div className={styles.heatScaleBar}>
                {[0.1, 0.3, 0.6, 0.9].map((op, i) => (
                  <div
                    key={i}
                    className={styles.heatScaleCell}
                    style={{ backgroundColor: `rgba(30, 58, 138, ${op})` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Static;
