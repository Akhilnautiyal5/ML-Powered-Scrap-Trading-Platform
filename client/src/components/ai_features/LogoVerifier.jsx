import React, { useEffect, useState } from "react";
import { getLogoBrands, verifyLogo } from "../../services/api";

const initialResult = {
  is_genuine: null,
  best_brand_match: "",
  confidence: 0,
  explanation: "",
  top_matches: [],
};

const LogoVerifier = () => {
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(initialResult);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await getLogoBrands();
        setBrands(res.brands || []);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please upload a clear product/logo image.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(initialResult);
    try {
      const response = await verifyLogo({
        imageFile: file,
        brand: selectedBrand || undefined,
      });
      setResult(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  const statusLabel = result.is_genuine
    ? "Genuine Product"
    : result.is_genuine === false
      ? "Potential Counterfeit"
      : "Awaiting Verification";

  const statusColor = result.is_genuine
    ? "text-emerald-500"
    : result.is_genuine === false
      ? "text-rose-500"
      : "text-gray-400 dark:text-white/40";

  const fieldClass =
    "input-field placeholder-gray-500 text-sm md:text-base dark:bg-black/20 dark:border-white/10 dark:text-white transition-all focus:ring-2 focus:ring-emerald-500/50";

  return (
    <div className="glass-panel-dark overflow-hidden p-0 shadow-2xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600/20 to-emerald-600/20 p-8 border-b border-white/5 lg:text-left">
        <h2 className="text-3xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-white/70">
          Authenticity Lab
        </h2>
        <p className="mt-2 text-gray-700 dark:text-white/60">
          Advanced logo verification engine to detect counterfeits using computer vision.
        </p>
      </div>

      <div className="p-8">
        <div className="grid gap-10 lg:grid-cols-2">
          {/* Left: Verification Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-800 dark:text-white/80">
                  Target Brand (Optional)
                </label>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className={fieldClass}
                >
                  <option value="">Auto-detect brand</option>
                  {brands.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-800 dark:text-white/80">
                  Product / Logo Image *
                </label>
                <div className="relative group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setFile(f);
                    }}
                    className={`${fieldClass} py-3 cursor-pointer file:hidden`}
                  />
                  <p className="mt-2 text-xs text-gray-600 dark:text-white/40">
                    Upload a clear, front-facing photo of the logo area.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-800 dark:text-red-200 flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-red-500/20 text-red-600 dark:text-red-500 font-bold">!</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-gradient w-full justify-center py-4 text-lg font-semibold shadow-xl shadow-emerald-900/10 hover:shadow-emerald-900/20 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Analyzing Authenticity...
                </span>
              ) : "Verify Logo Integrity"}
            </button>

            <div className="bg-slate-100 dark:bg-white/5 rounded-2xl p-5 border border-slate-200 dark:border-white/10">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-white/30 mb-3">Engine Specs</p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.040L3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622l-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white/90">LogoGuard AI v2.1</p>
                  <p className="text-[10px] text-slate-500 dark:text-white/40">SIFT + CNN Feature Matching Logic</p>
                </div>
              </div>
            </div>
          </form>

          {/* Right: Results Display */}
          <div className="space-y-8">
            <div className={`relative glass-panel rounded-3xl p-8 border-2 transition-all ${result.is_genuine ? 'border-emerald-500/30 bg-emerald-500/5' :
              result.is_genuine === false ? 'border-rose-500/30 bg-rose-500/5' :
                'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20'
              }`}>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-white/40 mb-2">Verdict</p>
              <h3 className={`text-3xl font-bold ${statusColor}`}>
                {statusLabel}
              </h3>

              {result.is_genuine !== null && (
                <div className="mt-6 space-y-4">
                  <div className="bg-slate-100 dark:bg-black/30 rounded-2xl p-4 border border-slate-200 dark:border-white/5 text-sm leading-relaxed text-slate-700 dark:text-gray-300">
                    {result.explanation}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-100 dark:bg-white/5 rounded-xl p-3 border border-slate-200 dark:border-white/5">
                      <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-white/30">Detected</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{result.best_brand_match?.toUpperCase() || "N/A"}</p>
                    </div>
                    <div className="bg-slate-100 dark:bg-white/5 rounded-xl p-3 border border-slate-200 dark:border-white/5">
                      <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-white/30">Match Score</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{(result.confidence * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoVerifier;

