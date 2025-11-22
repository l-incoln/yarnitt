/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#f2f2f2',
        brown: {
          50: '#fdf8f6',
          100: '#f2e8e5',
          500: '#bfa094',
          600: '#a18072',
          700: '#977669',
        },
      },
      borderRadius: {
        card: '8px',
        button: '6px',
        pill: '50px',
      },
      boxShadow: {
        card: '0 2px 6px rgba(0,0,0,0.1)',
        hover: '0 4px 12px rgba(0,0,0,0.15)',
      },
    },
  },
  plugins: [],
}
