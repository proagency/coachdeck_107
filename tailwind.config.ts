import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      borderRadius: { DEFAULT: "3px" },
      container: { center: true, padding: "1rem" },
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d9ebff",
          200: "#b7d7ff",
          300: "#86bbff",
          400: "#559bff",
          500: "#2f7cff",
          600: "#1f60e6",
          700: "#1a4cc0",
          800: "#1a4195",
          900: "#183a78"
        }
      }
    }
  },
  plugins: [],
} satisfies Config;
      