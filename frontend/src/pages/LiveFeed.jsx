  import { useState, useEffect } from "react";
  import { Line } from "react-chartjs-2";
  import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
  } from "chart.js";
  import MyVideo from "../../public/assets/videos/fight_0002.mp4";

  ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

  export default function LiveFeed() {
    const [alerts, setAlerts] = useState([]);
    const [chartData, setChartData] = useState({
      labels: Array(10).fill(""),
      datasets: [
        {
          label: "People Count",
          data: Array(10).fill(0),
          borderColor: "rgb(54, 162, 235)",
          backgroundColor: "rgba(54, 162, 235, 0.4)",
          tension: 0.3,
        },
      ],
    });

    // WebSocket connection to FastAPI backend
    useEffect(() => {
      const socket = new WebSocket("ws://127.0.0.1:8000/ws/livefeed");

      socket.onopen = () => console.log("✅ Connected to WebSocket");
      socket.onclose = () => console.log("❌ WebSocket closed");
      socket.onerror = (err) => console.error("WebSocket error:", err);

      socket.onmessage = (event) => {
        const alert = JSON.parse(event.data);
        setAlerts((prev) => [alert, ...prev.slice(0, 9)]);

        // Update chart dynamically
        setChartData((prev) => ({
          ...prev,
          labels: [...prev.labels.slice(1), alert.time],
          datasets: [
            {
              ...prev.datasets[0],
              data: [...prev.datasets[0].data.slice(1), alert.people_count],
            },
          ],
        }));
      };

      return () => socket.close();
    }, []);

    return (
      <main className="flex-1 bg-gray-100 p-6 flex flex-col">
        {/* Header */}
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Smart Surveillance Dashboard</h1>
          <div className="text-sm text-gray-500">Live Violence Detection Feed</div>
        </header>

        {/* Top Row: Video + Chart */}
        <div className="flex flex-col lg:flex-row gap-6 mb-6">
          {/* Live CCTV Feed */}
          <section className="flex-1 bg-white p-4 rounded-xl shadow-lg h-[480px] flex items-center justify-center border border-gray-200">
            <video autoPlay muted loop className="w-full h-full object-cover rounded-lg">
              <source src={MyVideo} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </section>

          {/* Event Analytics */}
          <section className="w-full lg:w-1/3 bg-white p-4 rounded-xl shadow-lg h-[480px] border border-gray-200">
            <h3 className="font-semibold mb-4 text-lg text-gray-700">Live People Count</h3>
            <Line data={chartData} />
          </section>
        </div>

        {/* Bottom Row: Alerts */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Alerts */}
          <section className="flex-1 bg-white p-4 rounded-xl shadow-lg h-[300px] overflow-y-auto border border-gray-200">
            <h3 className="font-semibold mb-4 text-lg text-gray-700">Recent Alerts</h3>
            <ul className="space-y-2">
              {alerts.length === 0 && <li className="text-gray-500">No alerts yet...</li>}
              {alerts.map((alert, index) => (
                <li
                  key={index}
                  className={`p-3 rounded-lg shadow-sm ${
                    alert.message.includes("Violence")
                      ? "bg-red-100 border border-red-300 text-red-700"
                      : "bg-green-100 border border-green-300 text-green-700"
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="font-semibold">{alert.time}</span>
                    <span className="text-sm">👥 {alert.people_count}</span>
                  </div>
                  <p className="text-sm">{alert.message}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    );
  }
