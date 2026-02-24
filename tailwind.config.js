/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0d1117',
        'dark-surface': '#161b22',
        'dark-border': '#30363d',
        'dark-text': '#c9d1d9',
        'dark-text-muted': '#8b949e',
        'accent-green': '#238636',
        'accent-green-hover': '#2ea043',
        'accent-blue': '#1f6feb',
        'accent-red': '#da3633',
      },
    },
  },
  plugins: [],
};
