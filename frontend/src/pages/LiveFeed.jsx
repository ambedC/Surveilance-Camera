import { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  Users,
  Dog,
  Sword,
  Activity,
  Maximize2,
  Settings,
  Circle,
  Clock,
  History,
  AlertTriangle
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  Filler
);

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
    labels: Array(15).fill(""),
    datasets: [
      {
        label: "Real-time Occupancy",
        data: Array(15).fill(0),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  });

  useEffect(() => {
    setWsError(null);
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000';
    const socket = new WebSocket(`${wsUrl}/ws/webcam`);

    socket.onopen = () => {
      console.log("✅ Connected to WebSocket (Webcam)");
      setWsError(null);
    };

    socket.onclose = (ev) => {
      console.log("❌ WebSocket closed", ev);
      if (!wsError) setWsError('Connection Interrupted');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.error) {
          setWsError(data.error);
          return;
        }
        setWsError(null);

        setStats({
          people_count: data.people_count || 0,
          weapon_count: data.weapon_count || 0,
          animal_count: data.animal_count || 0,
          fighting: data.fighting || false,
        });

        if (data.frame) {
          setWebcamFrame(`data:image/jpeg;base64,${data.frame}`);
        }

        let isAlert = false;
        let message = "Normal Activity";
        let severity = "low";

        if (data.fighting) {
          message = "CRITICAL: Physical Altercation Detected";
          isAlert = true;
          severity = "high";
        } else if (data.weapon_count > 0) {
          message = `WARNING: Weapon Identified (${data.weapon_count})`;
          isAlert = true;
          severity = "high";
        } else if (data.animal_count > 0) {
          message = `Alert: Animal Intrusion (${data.animal_count})`;
          isAlert = true;
          severity = "medium";
        }

        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        if (isAlert) {
          const alertItem = {
            id: Date.now(),
            date: new Date().toLocaleDateString(),
            time: currentTime,
            people_count: data.people_count,
            weapon_count: data.weapon_count,
            animal_count: data.animal_count,
            fighting: data.fighting,
            message: message,
            severity: severity
          };

          setAlerts((prev) => {
            const newAlerts = [alertItem, ...prev].slice(0, 50);
            localStorage.setItem(storageKey, JSON.stringify(newAlerts));
            return newAlerts;
          });
        }

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

  const StatBox = ({ label, value, icon: Icon, color, isActive }) => (
    <Card className={cn(
      "bg-white/[0.02] border-white/5 backdrop-blur-md transition-all duration-500",
      isActive && "bg-opacity-10 border-opacity-30",
      isActive ? `border-${color}-500/50 shadow-[0_0_20px_rgba(0,0,0,0.3)]` : "hover:bg-white/[0.04]"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg bg-opacity-10 transition-colors duration-500",
            isActive ? `bg-${color}-500 text-${color}-400` : "bg-white/5 text-slate-400"
          )}>
            <Icon size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">{label}</p>
            <p className={cn(
              "text-2xl font-bold tracking-tight transition-colors duration-500",
              isActive ? `text-${color}-400` : "text-white"
            )}>
              {value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <main className="flex-1 h-screen overflow-hidden bg-black text-foreground flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-white/5 px-8 flex items-center justify-between bg-black/50 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="SentrixAI" className="w-8 h-8 object-contain" />
            <h1 className="text-sm font-bold tracking-tight uppercase">Sentrix<span className="text-blue-500">AI</span> Live</h1>
          </div>
          <span className="w-px h-4 bg-white/10" />
          <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">Source: Webcam Channel 01</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <Activity size={12} className="text-green-500" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">System Active</span>
          </div>
          {/* <Button variant="outline" size="icon" className="h-8 w-8 border-white/10 hover:bg-white/5 text-slate-400">
            <Settings size={14} />
          </Button> */}
        </div>
      </header>

      {/* Content Scrollable */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#030303]">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Main Viewport Row */}
          <div className="grid grid-cols-12 gap-8">
            {/* Feed Section */}
            <div className="col-span-12 lg:col-span-8 space-y-4">
              <div className="relative aspect-video bg-white/[0.02] rounded-3xl overflow-hidden border border-white/5 shadow-2xl group">
                {webcamFrame ? (
                  <motion.img 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    src={webcamFrame} 
                    alt="Live Stream" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 bg-white/[0.01]">
                    <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] animate-pulse">Initializing Stream...</p>
                  </div>
                )}

                {/* Overlays */}
                <div className="absolute top-6 left-6 flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white tracking-widest uppercase">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  Live
                </div>

                <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between pointer-events-none">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white">
                    <Clock size={12} className="text-slate-400" />
                    {new Date().toLocaleTimeString()}
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white pointer-events-auto hover:bg-white/10">
                    <Maximize2 size={14} />
                  </Button>
                </div>

                {wsError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8 text-center">
                    <div className="max-w-xs space-y-4">
                      <AlertTriangle size={48} className="mx-auto text-red-500" />
                      <h3 className="text-lg font-bold">Signal Lost</h3>
                      <p className="text-sm text-slate-400">{wsError}</p>
                      <Button onClick={() => window.location.reload()} className="bg-white text-black font-bold h-9">Reconnect</Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatBox label="People" value={stats.people_count} icon={Users} color="blue" isActive={stats.people_count > 0} />
                <StatBox label="Weapon" value={stats.weapon_count} icon={Sword} color="red" isActive={stats.weapon_count > 0} />
                <StatBox label="Animal" value={stats.animal_count} icon={Dog} color="orange" isActive={stats.animal_count > 0} />
                <StatBox label="Fight" value={stats.fighting ? "Alert" : "Clean"} icon={Activity} color={stats.fighting ? "red" : "green"} isActive={stats.fighting} />
              </div>
            </div>

            {/* Side Analytics */}
            <div className="col-span-12 lg:col-span-4 space-y-8">
              {/* Chart Card */}
              <Card className="bg-white/[0.02] border-white/5 backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                    <Activity size={14} /> Activity Pattern
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-48 pt-4">
                  <Line 
                    data={chartData} 
                    options={{ 
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: { 
                        x: { display: false }, 
                        y: { 
                          ticks: { color: '#475569', font: { size: 9 }, maxTicksLimit: 5 }, 
                          grid: { color: 'rgba(255,255,255,0.03)' } 
                        } 
                      }, 
                      plugins: { legend: { display: false }, tooltip: { enabled: true } } 
                    }} 
                  />
                </CardContent>
              </Card>

              {/* Alerts Timeline */}
              <Card className="bg-white/[0.02] border-white/5 backdrop-blur-xl flex-1 flex flex-col h-[400px]">
                <CardHeader className="pb-4 border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                      <History size={14} /> Security Log
                    </CardTitle>
                    <span className="text-[9px] font-bold bg-white/10 px-1.5 py-0.5 rounded text-slate-400">{alerts.length} Records</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                  <AnimatePresence initial={false}>
                    {alerts.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-3">
                         <ShieldAlert size={32} />
                         <p className="text-[10px] font-bold uppercase tracking-widest">Scanning Environment...</p>
                      </div>
                    ) : (
                      alerts.map((alert) => (
                        <motion.div
                          key={alert.id}
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "p-3 rounded-2xl border bg-white/[0.01] transition-all duration-300",
                            alert.severity === 'high' ? "border-red-500/20 bg-red-500/5" : "border-white/5"
                          )}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                              <Clock size={10} /> {alert.time}
                            </span>
                            <div className="flex gap-1.5">
                               {alert.weapon_count > 0 && <Sword size={12} className="text-red-500" />}
                               {alert.animal_count > 0 && <Dog size={12} className="text-orange-500" />}
                               {alert.fighting && <Activity size={12} className="text-red-500" />}
                            </div>
                          </div>
                          <p className={cn(
                            "text-xs font-semibold leading-relaxed",
                            alert.severity === 'high' ? "text-red-400" : "text-white"
                          )}>
                            {alert.message}
                          </p>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
