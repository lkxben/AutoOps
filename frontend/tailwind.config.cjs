/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}", 
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        charcoal: "#5B5D5B",
        cyan: "#31999B",
        aqua: "#88DFE7",
        offwhite: "#F5F5F5",
        sky: "#8AB1D0"
      },
    },
  },
  plugins: [],
};