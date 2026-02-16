import './App.css';
import Sidebar from './components/Sidebar';
import LiveFeed from './pages/LiveFeed';

function App() {

  return (
    <div className="flex h-screen">
      <Sidebar/>
      <LiveFeed/>
    </div>
  );
}

export default App;
