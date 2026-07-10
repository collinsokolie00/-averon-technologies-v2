import { Route, Routes } from "react-router";

import MainLayout from "../layouts/MainLayout";
import Home from "../pages/Home";
import Products from "../pages/Products";
import Services from "../pages/Services";
import Technology from "../pages/Technology";
import Projects from "../pages/Projects";
import Blog from "../pages/Blog";
import Contact from "../pages/Contact";
import NotFound from "../pages/NotFound";

export default function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/services" element={<Services />} />
        <Route path="/technology" element={<Technology />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MainLayout>
  );
}