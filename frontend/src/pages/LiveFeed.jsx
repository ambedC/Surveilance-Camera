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

  ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

  export default function LiveFeed() {
    const userPhone = localStorage.getItem("userPhone") || "guest";
    const storageKey = `saved_alerts_${userPhone}`;

    const [alerts, setAlerts] = useState(() => {
      const saved = localStorage.getItem(storageKey);
      try {
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
    });
    const [webcamFrame, setWebcamFrame] = useState(null);
    const [wsError, setWsError] = useState(null);
    const [stats, setStats] = useState({
      people_count: 0,
      weapon_count: 0,
      animal_count: 0,
      fighting: false,
    });
    const [chartData, setChartData] = useState({
      labels: Array(10).fill(""),
      datasets: [
        {
          label: "People Count",
          data: Array(10).fill(0),
          borderColor: "rgb(96, 165, 250)", // blue-400
          backgroundColor: "rgba(96, 165, 250, 0.4)",
          tension: 0.3,
        },
      ],
    });

    // WebSocket connection to FastAPI backend (webcam feed)
    useEffect(() => {
      setWsError(null);
      const socket = new WebSocket("ws://127.0.0.1:8000/ws/webcam");

      socket.onopen = () => {
        console.log("✅ Connected to WebSocket (Webcam)");
        setWsError(null);
      };

      socket.onclose = (ev) => {
        console.log("❌ WebSocket closed", ev);
        if (!wsError) setWsError('WebSocket closed by server');
      };

      socket.onerror = (err) => {
        console.error("WebSocket error:", err);
        setWsError('WebSocket error (see console)');
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // handle server-side errors sent over ws
          if (data && data.error) {
            setWsError(data.error);
            return;
          }

          // clear any previous ws error when good data arrives
          setWsError(null);

          // Update stats
          setStats({
            people_count: data.people_count || 0,
            weapon_count: data.weapon_count || 0,
            animal_count: data.animal_count || 0,
            fighting: data.fighting || false,
          });

          // Set webcam frame
          if (data.frame) {
            setWebcamFrame(`data:image/jpeg;base64,${data.frame}`);
          }

          // Generate alert message
          let isAlert = false;
          let message = "All Clear ✅";
          if (data.fighting) {
            message = "⚠️ FIGHT DETECTED!";
            isAlert = true;
          } else if (data.weapon_count > 0) {
            message = `⚠️ Weapon Detected (${data.weapon_count})`;
            isAlert = true;
          } else if (data.animal_count > 0) {
            message = `Animal Detected (${data.animal_count})`;
            isAlert = true;
          }

          const currentTime = new Date().toLocaleTimeString();

          if (isAlert) {
            const alertItem = {
              date: new Date().toLocaleDateString(),
              time: currentTime,
              people_count: data.people_count,
              weapon_count: data.weapon_count,
              animal_count: data.animal_count,
              fighting: data.fighting,
              message: message,
            };

            setAlerts((prev) => {
              const newAlerts = [alertItem, ...prev].slice(0, 1000);
              localStorage.setItem(storageKey, JSON.stringify(newAlerts));
              return newAlerts;
            });
          }

          // Update chart dynamically
          setChartData((prev) => ({
            ...prev,
            labels: [...prev.labels.slice(1), currentTime],
            datasets: [
              {
                ...prev.datasets[0],
                data: [...prev.datasets[0].data.slice(1), data.people_count],
              },
            ],
          }));
        } catch (e) {
          console.error('Error parsing websocket message', e);
        }
      };

      return () => socket.close();
    }, []);

    return (
      <main className="flex-1 bg-gray-900 p-6 flex flex-col">
        {wsError && (
          <div className="max-w-6xl mx-auto mb-4">
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
              WebSocket error: {wsError}
            </div>
          </div>
        )}
        {/* Header */}
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Smart Surveillance Dashboard</h1>
          <div className="text-sm text-gray-400">Live Threat Detection Feed (Webcam)</div>
        </header>

        {/* Top Row: Video + Stats */}
        <div className="flex flex-col lg:flex-row gap-6 mb-6">
          {/* Live Webcam Feed */}
          <section className="flex-1 bg-gray-800 p-4 rounded-xl shadow-lg h-[480px] flex items-center justify-center border border-gray-700">
            {webcamFrame ? (
              <img src={webcamFrame} alt="Webcam Feed" className="w-full h-full object-cover rounded-lg" />
            ) : (
              <div className="text-gray-400 text-center">
                <p className="text-lg">Loading webcam...</p>
                <p className="text-sm">Make sure the backend is running on port 8000</p>
              </div>
            )}
          </section>

          {/* Detection Stats */}
          <section className="w-full lg:w-1/3 bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 flex flex-col justify-between">
            <div>
              <h3 className="font-semibold mb-4 text-lg text-gray-200">Live Detection Stats</h3>
              
              <div className="space-y-4">
                {/* People Count */}
                <div className="bg-gray-700/50 p-4 rounded-lg border border-blue-500/30">
                  <p className="text-sm text-gray-400">👥 People Detected</p>
                  <p className="text-3xl font-bold text-blue-400">{stats.people_count}</p>
                </div>

                {/* Weapons Count */}
                <div className="bg-gray-700/50 p-4 rounded-lg border border-red-500/30">
                  <p className="text-sm text-gray-400">🔫 Weapons Detected</p>
                  <p className="text-3xl font-bold text-red-400">{stats.weapon_count}</p>
                </div>

                {/* Animals Count */}
                <div className="bg-gray-700/50 p-4 rounded-lg border border-orange-500/30">
                  <p className="text-sm text-gray-400">🐕 Animals Detected</p>
                  <p className="text-3xl font-bold text-orange-400">{stats.animal_count}</p>
                </div>

                {/* Fighting Status */}
                <div className={`p-4 rounded-lg border ${stats.fighting ? 'bg-red-900/40 border-red-500/50' : 'bg-green-900/40 border-green-500/50'}`}>
                  <p className="text-sm text-gray-400">⚡ Fighting Detection</p>
                  <p className={`text-2xl font-bold ${stats.fighting ? 'text-red-400' : 'text-green-400'}`}>
                    {stats.fighting ? '🚨 DETECTED' : '✅ Clear'}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom Row: Chart + Alerts */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Chart */}
          <section className="flex-1 bg-gray-800 p-4 rounded-xl shadow-lg h-[300px] border border-gray-700">
            <h3 className="font-semibold mb-4 text-lg text-gray-200">People Count Over Time</h3>
            <div className="chart-container">
              <Line data={chartData} options={{ scales: { x: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } }, y: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } } }, plugins: { legend: { labels: { color: '#e5e7eb' } } } }} />
            </div>
          </section>

          {/* Alerts */}
          <section className="flex-1 bg-gray-800 p-4 rounded-xl shadow-lg h-[300px] overflow-y-auto border border-gray-700">
            <h3 className="font-semibold mb-4 text-lg text-gray-200">Recent Alerts</h3>
            <ul className="space-y-2">
              {alerts.length === 0 && <li className="text-gray-500">No alerts yet...</li>}
              {alerts.map((alert, index) => (
                <li
                  key={index}
                  className={`p-3 rounded-lg shadow-sm ${
                    alert.fighting
                      ? "bg-red-900/40 border border-red-500/50 text-red-200"
                      : alert.weapon_count > 0
                      ? "bg-orange-900/40 border border-orange-500/50 text-orange-200"
                      : "bg-green-900/40 border border-green-500/50 text-green-200"
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="font-semibold">
                      {alert.date ? `${alert.date} ` : ""}{alert.time}
                    </span>
                    <div className="text-sm space-x-2">
                      <span>👥 {alert.people_count}</span>
                      {alert.weapon_count > 0 && <span>🔫 {alert.weapon_count}</span>}
                      {alert.animal_count > 0 && <span>🐕 {alert.animal_count}</span>}
                    </div>
                  </div>
                  <p className="text-sm font-semibold">{alert.message}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    );
  }
