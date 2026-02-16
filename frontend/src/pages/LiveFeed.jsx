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
    const [alerts, setAlerts] = useState([]);
    const [webcamFrame, setWebcamFrame] = useState(null);
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
          borderColor: "rgb(54, 162, 235)",
          backgroundColor: "rgba(54, 162, 235, 0.4)",
          tension: 0.3,
        },
      ],
    });

    // WebSocket connection to FastAPI backend (webcam feed)
    useEffect(() => {
      const socket = new WebSocket("ws://127.0.0.1:8000/ws/webcam");

      socket.onopen = () => console.log("✅ Connected to WebSocket (Webcam)");
      socket.onclose = () => console.log("❌ WebSocket closed");
      socket.onerror = (err) => console.error("WebSocket error:", err);

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
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
        let message = "All Clear ✅";
        if (data.fighting) {
          message = "⚠️ FIGHT DETECTED!";
        } else if (data.weapon_count > 0) {
          message = `⚠️ Weapon Detected (${data.weapon_count})`;
        } else if (data.animal_count > 0) {
          message = `Animal Detected (${data.animal_count})`;
        }

        const alert = {
          time: new Date().toLocaleTimeString(),
          people_count: data.people_count,
          weapon_count: data.weapon_count,
          animal_count: data.animal_count,
          fighting: data.fighting,
          message: message,
        };

        setAlerts((prev) => [alert, ...prev.slice(0, 9)]);

        // Update chart dynamically
        setChartData((prev) => ({
          ...prev,
          labels: [...prev.labels.slice(1), alert.time],
          datasets: [
            {
              ...prev.datasets[0],
              data: [...prev.datasets[0].data.slice(1), data.people_count],
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
          <div className="text-sm text-gray-500">Live Threat Detection Feed (Webcam)</div>
        </header>

        {/* Top Row: Video + Stats */}
        <div className="flex flex-col lg:flex-row gap-6 mb-6">
          {/* Live Webcam Feed */}
          <section className="flex-1 bg-white p-4 rounded-xl shadow-lg h-[480px] flex items-center justify-center border border-gray-200">
            {webcamFrame ? (
              <img src={webcamFrame} alt="Webcam Feed" className="w-full h-full object-cover rounded-lg" />
            ) : (
              <div className="text-gray-500 text-center">
                <p className="text-lg">Loading webcam...</p>
                <p className="text-sm">Make sure the backend is running on port 8000</p>
              </div>
            )}
          </section>

          {/* Detection Stats */}
          <section className="w-full lg:w-1/3 bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col justify-between">
            <div>
              <h3 className="font-semibold mb-4 text-lg text-gray-700">Live Detection Stats</h3>
              
              <div className="space-y-4">
                {/* People Count */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-600">👥 People Detected</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.people_count}</p>
                </div>

                {/* Weapons Count */}
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="text-sm text-gray-600">🔫 Weapons Detected</p>
                  <p className="text-3xl font-bold text-red-600">{stats.weapon_count}</p>
                </div>

                {/* Animals Count */}
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <p className="text-sm text-gray-600">🐕 Animals Detected</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.animal_count}</p>
                </div>

                {/* Fighting Status */}
                <div className={`p-4 rounded-lg border ${stats.fighting ? 'bg-red-100 border-red-400' : 'bg-green-100 border-green-400'}`}>
                  <p className="text-sm text-gray-600">⚡ Fighting Detection</p>
                  <p className={`text-2xl font-bold ${stats.fighting ? 'text-red-600' : 'text-green-600'}`}>
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
          <section className="flex-1 bg-white p-4 rounded-xl shadow-lg h-[300px] border border-gray-200">
            <h3 className="font-semibold mb-4 text-lg text-gray-700">People Count Over Time</h3>
            <Line data={chartData} />
          </section>

          {/* Alerts */}
          <section className="flex-1 bg-white p-4 rounded-xl shadow-lg h-[300px] overflow-y-auto border border-gray-200">
            <h3 className="font-semibold mb-4 text-lg text-gray-700">Recent Alerts</h3>
            <ul className="space-y-2">
              {alerts.length === 0 && <li className="text-gray-500">No alerts yet...</li>}
              {alerts.map((alert, index) => (
                <li
                  key={index}
                  className={`p-3 rounded-lg shadow-sm ${
                    alert.fighting
                      ? "bg-red-100 border border-red-300 text-red-700"
                      : alert.weapon_count > 0
                      ? "bg-orange-100 border border-orange-300 text-orange-700"
                      : "bg-green-100 border border-green-300 text-green-700"
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="font-semibold">{alert.time}</span>
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
