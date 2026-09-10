import { Route, Routes } from "react-router";

import AdminLayout from "../components/layout/AdminLayout";
import ApiHealthProbe from "../components/ApiHealthProbe";
import ScrollToTop from "../components/layout/ScrollToTop";
import { CustomerAuthProvider } from "../contexts/CustomerAuthContext";
import { adminSections } from "../data/adminConfig";
import MainLayout from "../layouts/MainLayout";
import { AccountDashboard, AccountSectionPage } from "../pages/account/CustomerAccountPages";
import AdminDashboard from "../pages/admin/Dashboard";
import AdminHomepage from "../pages/admin/Homepage";
import AdminLogin from "../pages/admin/Login";
import ManagerPage from "../pages/admin/ManagerPage";
import AdminProducts from "../pages/admin/Products";
import AdminProjects from "../pages/admin/Projects";
import { CustomerAuthPage } from "../pages/auth/CustomerAuthPages";
import ClientPortalBridge from "../pages/client-portal/ClientPortalBridge";
import Home from "../pages/Home";
import ProductDetail from "../pages/ProductDetail";
import { PaymentCancelPage, PaymentSuccessPage } from "../pages/payment/PaymentResultPages";
import Products from "../pages/Products";
import Services from "../pages/Services";
import Technology from "../pages/Technology";
import TechnologyTopic from "../pages/TechnologyTopic";
import Blog from "../pages/Blog";
import BlogArticle from "../pages/BlogArticle";
import Contact from "../pages/Contact";
import NotFound from "../pages/NotFound";
import CustomerProtectedRoute from "../routes/CustomerProtectedRoute";
import PageMetadataManager from "../components/PageMetadataManager";

export default function App() {
  return (
    <CustomerAuthProvider>
      <PageMetadataManager />
      <ApiHealthProbe />
      <ScrollToTop />
      <Routes>
        <Route
          path="/*"
          element={
            <MainLayout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/products" element={<Products />} />
                <Route path="/products/:slug" element={<ProductDetail />} />
                <Route path="/services" element={<Services />} />
                <Route path="/technology" element={<Technology />} />
                <Route path="/technology/:topicSlug" element={<TechnologyTopic />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogArticle />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/payment/success" element={<PaymentSuccessPage />} />
                <Route path="/payment/cancel" element={<PaymentCancelPage />} />
                <Route path="/login" element={<CustomerAuthPage mode="login" />} />
                <Route path="/register" element={<CustomerAuthPage mode="register" />} />
                <Route path="/forgot-password" element={<CustomerAuthPage mode="forgot" />} />
                <Route path="/verify-email" element={<CustomerAuthPage mode="verify" />} />
                <Route element={<CustomerProtectedRoute />}>
                  <Route path="/account" element={<AccountDashboard />} />
                  <Route path="/account/:section" element={<AccountSectionPage />} />
                  <Route path="/client-portal" element={<ClientPortalBridge />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </MainLayout>
          }
        />

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="homepage" element={<AdminHomepage />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="projects" element={<AdminProjects />} />
          {adminSections.map((section) => (
            <Route key={section.key} path={section.path} element={<ManagerPage section={section} />} />
          ))}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </CustomerAuthProvider>
  );
}
