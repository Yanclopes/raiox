import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import FormPage from "./pages/FormPage.tsx";
import ManagerPage from "./pages/ManagerPage.tsx";
import DisplayPage from "./pages/DisplayPage.tsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FormPage />} />
        <Route path="/manager" element={<ManagerPage />} />
        <Route path="/display" element={<DisplayPage />} />
      </Routes>
    </BrowserRouter>
  );
}
