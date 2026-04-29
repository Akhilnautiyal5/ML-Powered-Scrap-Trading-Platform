import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
    return (
        <footer className="footer-container border-t border-slate-200 dark:border-white/5 bg-white dark:bg-slate-950 transition-colors duration-300">
            <div className="section-container !py-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
                    {/* Brand Identity Section */}
                    <div className="space-y-6">
                        <Link to="/" className="group flex items-center gap-3.5">
                            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white font-bold shadow-lg shadow-brand-500/20 transition-all duration-300 group-hover:rotate-6 group-hover:scale-110">
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent"></div>
                                ML
                            </div>
                            <span className="font-display text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">
                                TradeSmart
                            </span>
                        </Link>
                        <p className="max-w-xs text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                            The first AI-integrated marketplace for high-performance resale assets.
                            Delivering data-driven trust, verified brand authentication,
                            and precise market valuation since 2024.
                        </p>
                        <div className="flex items-center gap-4 text-slate-400 dark:text-slate-600">
                            <button className="hover:text-brand-500 transition-colors p-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.493v-8.74h-2.942v-3.403h2.942v-2.505c0-2.911 1.777-4.496 4.376-4.496 1.244 0 2.315.093 2.626.134v3.045l-1.802.001c-1.413 0-1.687.671-1.687 1.656v2.165h3.37l-.439 3.403h-2.931v8.74h6.039c.731 0 1.325-.593 1.325-1.324v-21.351c0-.732-.594-1.325-1.325-1.325z" /></svg>
                            </button>
                            <button className="hover:text-brand-500 transition-colors p-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
                            </button>
                            <button className="hover:text-brand-500 transition-colors p-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Core Platform Links */}
                    <div className="space-y-6">
                        <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-900 dark:text-white">Platform</h4>
                        <ul className="space-y-4">
                            <li><Link to="/browse" className="text-sm text-slate-500 hover:text-brand-500 dark:text-slate-400 dark:hover:text-brand-400 transition-colors">Marketplace</Link></li>
                            <li><Link to="/sell" className="text-sm text-slate-500 hover:text-brand-500 dark:text-slate-400 dark:hover:text-brand-400 transition-colors">List an Item</Link></li>
                            <li><Link to="/wishlist" className="text-sm text-slate-500 hover:text-brand-500 dark:text-slate-400 dark:hover:text-brand-400 transition-colors">Saved Listings</Link></li>
                            <li><Link to="/profile" className="text-sm text-slate-500 hover:text-brand-500 dark:text-slate-400 dark:hover:text-brand-400 transition-colors">Member Profile</Link></li>
                        </ul>
                    </div>

                    {/* AI Services Section */}
                    <div className="space-y-6">
                        <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-900 dark:text-white">AI Intelligence</h4>
                        <ul className="space-y-4">
                            <li><Link to="/price-predictor" className="text-sm text-slate-500 hover:text-brand-500 dark:text-slate-400 dark:hover:text-brand-400 transition-colors flex items-center gap-2 underline decoration-brand-500/20 underline-offset-4 decoration-2">Price Estimation</Link></li>
                            <li><Link to="/logo-verifier" className="text-sm text-slate-500 hover:text-brand-500 dark:text-slate-400 dark:hover:text-brand-400 transition-colors">Brand Authentication</Link></li>
                            <li><Link to="/image-search" className="text-sm text-slate-500 hover:text-brand-500 dark:text-slate-400 dark:hover:text-brand-400 transition-colors">Visual Search Engine</Link></li>
                            <li><Link to="/" className="text-sm text-slate-500 hover:text-brand-500 dark:text-slate-400 dark:hover:text-brand-400 transition-colors">Enterprise API</Link></li>
                        </ul>
                    </div>

                    {/* Newsletter / Contact Section */}
                    <div className="space-y-6">
                        <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-900 dark:text-white">Ecosystem Update</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Receive weekly market reports and exclusive AI-vetted deals.</p>
                        <div className="relative group">
                            <input
                                type="email"
                                placeholder="partner@enterprise.com"
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20"
                            />
                            <button className="absolute right-2 top-2 h-8 w-8 rounded-lg bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            </button>
                        </div>
                        <div className="pt-2 flex items-center gap-3">
                            <div className="flex -space-x-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800"></div>
                                ))}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Join 12k+ Traders</span>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-20 pt-10 border-t border-slate-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">
                        © 2026 TRADESMART AI HUB. INDUSTRIAL-GRADE TRADING SYSTEM.
                    </p>
                    <div className="flex items-center gap-8">
                        <Link to="/" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Privacy Neural Policy</Link>
                        <Link to="/" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Terms of Exchange</Link>
                    </div>
                </div>
            </div>

            {/* Visual Accent */}
            <div className="h-1.5 w-full bg-gradient-to-r from-brand-500 via-accent-500 to-brand-600"></div>
        </footer>
    );
};

export default Footer;
