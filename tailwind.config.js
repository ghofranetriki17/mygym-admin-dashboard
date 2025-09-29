/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:"#ffe9e7",100:"#ffc9c4",200:"#ffa39b",300:"#ff7c71",400:"#ff584f",
          500:"#FF3B30", // rouge principal
          600:"#e53329",700:"#c12a22",800:"#9f241d",900:"#6c1712"
        },
        surface: {
          900: "#0d0d0d",
          800: "#121212",
          700: "#1E1E1E",
          600: "#2A2A2A"
        }
      }
    },
  },
  darkMode: 'class',
  plugins: [],
}
