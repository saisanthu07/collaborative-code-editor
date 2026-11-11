/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "#0d1117",
        surface: "#161b22",
        surface2: "#1c2128",
        border: "#30363d",
        accent: "#3b82f6",
        accent2: "#22c55e",
      },
    },
  },
  plugins: [],
};
