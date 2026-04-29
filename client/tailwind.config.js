/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      display: ['"Clash Display"', "Inter", "sans-serif"],
      body: ["Inter", "sans-serif"],
      mono: ['"Space Mono"', "monospace"],
      sans: ["Inter", "system-ui", "sans-serif"],
    },
    extend: {
      colors: {
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981", // Emerald Primary
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22",
        },
        accent: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6", // Blue AI accent
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        slate: {
          950: "#020617",
        }
      },
      boxShadow: {
        glow: "0 0 20px -5px rgba(16, 185, 129, 0.3)",
        "glow-blue": "0 0 20px -5px rgba(59, 130, 246, 0.3)",
      },
      backgroundImage: {
        "grid-pattern":
          "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.1) 1px, transparent 0)",
        "mesh-gradient": "radial-gradient(at 0% 0%, hsla(160,84%,39%,0.15) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(217,91%,60%,0.15) 0, transparent 50%)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        }
      },
      screens: {
        "3xl": "1680px",
      },
    },
  },
  plugins: [],
}