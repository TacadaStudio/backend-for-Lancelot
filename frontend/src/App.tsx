import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainDashboard from './pages/MainDashboard';
import PdfProcessor from './pages/PdfProcessor';
import About from './pages/About';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-text-main custom-scrollbar">
        <Routes>
          <Route path="/" element={<MainDashboard />} />
          <Route path="/process" element={<PdfProcessor />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
