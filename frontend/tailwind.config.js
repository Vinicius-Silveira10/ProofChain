/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'emerald-500': '#10B981',
        'red-500': '#EF4444',
        'amber-500': '#F59E0B'
      }
    },
  },
  plugins: [],
}
