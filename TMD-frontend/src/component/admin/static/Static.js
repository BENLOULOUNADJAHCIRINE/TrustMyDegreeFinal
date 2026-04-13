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

function Static() {
  const pieColors = ["#1E3A8A", "#10B981", "#F59E0B"];

  const [user, setUser] = useState(null); //state for the profile
  const [bargraph, setBargraph] = useState([]);
  const [linegraph, setLinegraph] = useState([]);
  const [piegraph, setPiegraph] = useState([]);
  const [heatmap, setHeatmap] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/auth/user", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    }) // fetch the user who logged in
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch((err) => console.log(err));
  }, []);

  useEffect(() => {
    fetch("http://localhost:5000/api/admin/statistics", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        // Line graph - monthly issuance
        const lineFormatted = Object.entries(data.monthlyIssuance).map(
          ([label, value]) => ({
            label,
            Issuances: value,
            verification: 0,
          }),
        );
        setLinegraph(lineFormatted);

        // Pie graph - distribution by type
        const pieFormatted = Object.entries(data.distributionByType).map(
          ([label, value]) => ({
            label,
            value,
          }),
        );
        setPiegraph(pieFormatted);

        // Bar graph - top specialties
        const barFormatted = data.topSpecialties.map((s) => ({
          label: s.specialty,
          value: s._count.specialty,
        }));
        setBargraph(barFormatted);

        // Heatmap - verifications per day
        const heatFormatted = Object.entries(data.verificationsPerDay).map(
          ([day, value], i) => ({
            day,
            week: Math.floor(i / 7),
            value,
          }),
        );
        setHeatmap(heatFormatted);
      })
      .catch((err) => console.log(err));
  }, []);

  return (
    <div className={styles["main-content"]}>
      <div className={styles.login}>
        <h4>Statistics</h4>
        <div className={styles.info}>
          <div className={styles.subinfo}>
            <h4>{user ? user.name : "guest"}</h4>{" "}
            <p>{user ? user.email : "guest25@ensta.edu.dz"}</p>
          </div>
          <img src={user?.avatar || "/totalcertaficates.png"} alt="ava" />
        </div>
      </div>

      <div className={styles["render-content"]}>
        <div className={styles.line}>
          <div className={styles.chartTitle}>
            <img src="/line.png" alt="line" />
            <span>Monthly Issuance Trend</span>
          </div>

          <Line
            data={{
              labels: linegraph.map((data) => data.label),
              datasets: [
                {
                  label: "verification",
                  data: linegraph.map((data) => data.verification),
                  backgroundColor: ["#10B981"],
                  borderColor: "#10B981",
                },
                {
                  label: "Issuances",
                  data: linegraph.map((data) => data.Issuances),
                  backgroundColor: ["#1E3A8A"],
                  borderColor: "#1E3A8A",
                },
              ],
            }}
            options={{
              responsive: true,
              interaction: {
                mode: "index",
                intersect: false,
              },
              elements: {
                line: {
                  tension: 0.5,
                  borderWidth: 3,
                },
                point: {
                  radius: 4,
                  hoverRadius: 6,
                },
              },

              plugins: {
                legend: {
                  position: "top",
                  align: "end",
                  labels: { boxWidth: 12 },
                },
                tooltip: {
                  backgroundColor: "#111827",
                  padding: 10,
                  cornerRadius: 6,
                },
                title: {
                  display: false,
                },
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

        <div className={styles.pie}>
          <div className={styles.chartTitle}>
            <img src="/pie.png" alt="pie" />
            <span>Distribution by Type</span>
          </div>

          <div className={styles.doughnutWrapper}>
            <Doughnut
              data={{
                labels: piegraph.map((data) => data.label),

                datasets: [
                  {
                    data: piegraph.map((data) => data.value),

                    backgroundColor: ["#1E3A8A", "#10B981", "#F59E0B"],

                    borderRadius: 8,
                    spacing: 4,
                  },
                ],
              }}
              options={{
                cutout: "70%",

                plugins: {
                  legend: { display: false },
                  title: { display: false },
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
                  ></span>
                  <span>{item.label}</span>
                </div>
                <span className={styles.percent}> {item.value} </span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.bar}>
          <div className={styles.chartTitle}>
            <img src="/bar.png" alt="bar" />
            <span>Top Specialties</span>
          </div>

          <Bar
            data={{
              labels: bargraph.map((data) => data.label),
              datasets: [
                {
                  data: bargraph.map((data) => data.value),
                  backgroundColor: "#1E3A8A",
                  borderRadius: 8,
                  barThickness: 30,
                },
              ],
            }}
            options={{
              indexAxis: "y",
              plugins: {
                legend: { display: false },
                title: { display: false },
              },
              scales: {
                x: { grid: { display: false }, ticks: { display: false } },
                y: { grid: { display: false } },
              },
            }}
          />
        </div>

        <div className={styles.square}>
          <div className={styles.heatHeader}>
            <div className={styles.chartTitle}>
              <div className={styles.heatIcon}>
                <img src="/map.png" alt="heatmap" />
              </div>
              <span>Verifications per day</span>
            </div>

            {/* <span className={styles.badge}>+24% vs last month</span> */}
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
    </div>
  );
}

export default Static;
