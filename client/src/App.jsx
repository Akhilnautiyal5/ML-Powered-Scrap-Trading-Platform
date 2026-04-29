import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/common/ProtectedRoute";
import Navbar from "./components/common/Navbar";
import Home from "./pages/Home";
import PricePredictionPage from "./pages/PricePredictor";
import ImageSearchPage from "./pages/ImageSearchPage";
import BrowseProducts from "./pages/BrowseProducts";
import SellProduct from "./pages/SellProduct";
import ProductDetails from "./pages/ProductDetails";
import TransactionDashboard from "./pages/TransactionDashboard";
import Wishlist from "./pages/Wishlist";
import LogoVerifierPage from "./pages/LogoVerifier";
import Signin from "./pages/Signin";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import SellerProfile from "./pages/SellerProfile";
import Notifications from "./pages/Notifications";
import MyOrders from "./pages/MyOrders";
import MySoldItems from "./pages/MySoldItems";
import MySoldItemTransactions from "./pages/MySoldItemTransactions";
import MyAddress from "./pages/MyAddress";
import StripePaymentPage from "./pages/VirtualPaymentPage";
import Cashout from "./pages/Cashout";
import Footer from "./components/common/Footer";
import BackToTop from "./components/common/BackToTop";
import "./config/firebase";

function App() {
	return (
		<AuthProvider>
			<ThemeProvider>
				<Router>
					<div className="App min-h-screen flex flex-col transition-colors duration-300 bg-white dark:bg-slate-950">
						<Navbar />
						<div className="animate-fade-in flex-grow">
							<Routes>
								<Route path="/" element={<Home />} />
								<Route path="/browse" element={<BrowseProducts />} />
								<Route
									path="/price-predictor"
									element={<PricePredictionPage />}
								/>
								<Route path="/image-search" element={<ImageSearchPage />} />
								<Route path="/logo-verifier" element={<LogoVerifierPage />} />
								<Route path="/product/:id" element={<ProductDetails />} />
								<Route path="/seller/:sellerId" element={<SellerProfile />} />
								<Route path="/signin" element={<Signin />} />
								<Route path="/signup" element={<Signup />} />
								{/* Protected Routes */}
								<Route
									path="/sell"
									element={
										<ProtectedRoute>
											<SellProduct />
										</ProtectedRoute>
									}
								/>
								<Route
									path="/escrow/:escrowId"
									element={
										<ProtectedRoute>
											<TransactionDashboard />
										</ProtectedRoute>
									}
								/>
								<Route
									path="/payment/:escrowId"
									element={
										<ProtectedRoute>
											<StripePaymentPage />
										</ProtectedRoute>
									}
								/>
								<Route
									path="/my-orders"
									element={
										<ProtectedRoute>
											<MyOrders />
										</ProtectedRoute>
									}
								/>
								<Route
									path="/my-address"
									element={
										<ProtectedRoute>
											<MyAddress />
										</ProtectedRoute>
									}
								/>
								<Route
									path="/my-sold-items"
									element={
										<ProtectedRoute>
											<MySoldItems />
										</ProtectedRoute>
									}
								/>
								<Route
									path="/my-sold-items/:productId"
									element={
										<ProtectedRoute>
											<MySoldItemTransactions />
										</ProtectedRoute>
									}
								/>
								<Route
									path="/notifications"
									element={
										<ProtectedRoute>
											<Notifications />
										</ProtectedRoute>
									}
								/>
								<Route
									path="/wishlist"
									element={
										<ProtectedRoute>
											<Wishlist />
										</ProtectedRoute>
									}
								/>
								<Route
									path="/profile"
									element={
										<ProtectedRoute>
											<Profile />
										</ProtectedRoute>
									}
								/>
								<Route
									path="/cashout"
									element={
										<ProtectedRoute>
											<Cashout />
										</ProtectedRoute>
									}
								/>
							</Routes>
						</div>
						<Footer />
						<BackToTop />
					</div>
				</Router>
			</ThemeProvider>
		</AuthProvider>
	);
}

export default App;
