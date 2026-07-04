/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // High-end premium dark palette
        bgDark: "#0B0F19",
        bgDarker: "#05070C",
        glassBg: "rgba(15, 23, 42, 0.65)",
        glassBorder: "rgba(255, 255, 255, 0.08)",
        cardDark: "rgba(30, 41, 59, 0.5)",
        
        // Neon Accents
        neonBlue: "#00E5FF",
        neonPurple: "#D500F9",
        neonGreen: "#00E676",
        neonPink: "#FF2A85",
        neonOrange: "#FF9100",
        
        // Categories & Priorities
        critical: "#FF3366",
        high: "#FF9100",
        medium: "#FFEA00",
        low: "#00E676",
      },
      fontFamily: {
        sans: ["Outfit", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        neonBlue: "0 0 15px rgba(0, 229, 255, 0.3)",
        neonPurple: "0 0 15px rgba(213, 0, 249, 0.3)",
        neonPink: "0 0 15px rgba(255, 42, 133, 0.3)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        glassHover: "0 8px 32px 0 rgba(0, 229, 255, 0.15)",
      },
      backdropBlur: {
        glass: "12px",
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-blue': 'glowBlue 2s ease-in-out infinite alternate',
        'glow-purple': 'glowPurple 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glowBlue: {
          '0%': { boxShadow: '0 0 5px rgba(0, 229, 255, 0.2), 0 0 10px rgba(0, 229, 255, 0.1)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 229, 255, 0.5), 0 0 30px rgba(0, 229, 255, 0.25)' }
        },
        glowPurple: {
          '0%': { boxShadow: '0 0 5px rgba(213, 0, 249, 0.2), 0 0 10px rgba(213, 0, 249, 0.1)' },
          '100%': { boxShadow: '0 0 20px rgba(213, 0, 249, 0.5), 0 0 30px rgba(213, 0, 249, 0.25)' }
        }
      }
    },
  },
  plugins: [],
}
