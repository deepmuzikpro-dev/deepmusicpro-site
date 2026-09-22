import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import PlayerBar from './components/PlayerBar.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import Browse from './pages/Browse.jsx'
import Shop from './pages/Shop.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import TrackDetail from './pages/TrackDetail.jsx'
import BundleDetail from './pages/BundleDetail.jsx'
import Cart from './pages/Cart.jsx'
import CheckoutSuccess from './pages/CheckoutSuccess.jsx'
import Rewards from './pages/Rewards.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Account from './pages/Account.jsx'
import Sell from './pages/Sell.jsx'
import SellerUpload from './pages/seller/SellerUpload.jsx'
import SellerDashboard from './pages/seller/SellerDashboard.jsx'
import Terms from './pages/legal/Terms.jsx'
import Privacy from './pages/legal/Privacy.jsx'
import Refunds from './pages/legal/Refunds.jsx'
import Dmca from './pages/legal/Dmca.jsx'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminUpload from './pages/admin/AdminUpload.jsx'
import AdminTracks from './pages/admin/AdminTracks.jsx'
import AdminProducts from './pages/admin/AdminProducts.jsx'
import AdminOrders from './pages/admin/AdminOrders.jsx'
import AdminRewards from './pages/admin/AdminRewards.jsx'
import AdminGenres from './pages/admin/AdminGenres.jsx'
import AdminUsers from './pages/admin/AdminUsers.jsx'
import AdminBundles from './pages/admin/AdminBundles.jsx'
import AdminAffiliates from './pages/admin/AdminAffiliates.jsx'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-dmp-black">
      <Navbar />
      <main className="flex-1 pb-28">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/track/:id" element={<TrackDetail />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/shop/:category" element={<Shop />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/bundle/:id" element={<BundleDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/account" element={<Account />} />
          <Route path="/sell" element={<Sell />} />
          <Route path="/sell/upload" element={<SellerUpload />} />
          <Route path="/sell/dashboard" element={<SellerDashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/refunds" element={<Refunds />} />
          <Route path="/dmca" element={<Dmca />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="upload" element={<AdminUpload />} />
            <Route path="tracks" element={<AdminTracks />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="bundles" element={<AdminBundles />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="rewards" element={<AdminRewards />} />
            <Route path="genres" element={<AdminGenres />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="affiliates" element={<AdminAffiliates />} />
          </Route>
        </Routes>
      </main>
      <Footer />
      <PlayerBar />
    </div>
  )
}
