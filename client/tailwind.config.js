/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'utm-blue': '#005eb8',
        'utm-cyan': '#00b5e2',
      },
    },
  },
  plugins: [],
}
