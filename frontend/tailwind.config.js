/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef8f6",
          100: "#d8ede8",
          200: "#b7ddd5",
          500: "#2f8f86",
          600: "#25776f",
          700: "#1d615a",
          800: "#184f4a",
          900: "#163f3c"
        }
      }
    }
  },
  plugins: []
};
