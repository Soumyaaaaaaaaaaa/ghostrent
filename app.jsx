import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";

function App() {
  return (
    <BrowserRouter>
      {/* Navbar */}
      <nav style={{ padding: "10px", background: "black" }}>
        <Link to="/" style={{ color: "white", marginRight: "10px" }}>Home</Link>
        <Link to="/about" style={{ color: "white", marginRight: "10px" }}>About</Link>
        <Link to="/contact" style={{ color: "white" }}>Contact</Link>
      </nav>

      {/* Pages */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;