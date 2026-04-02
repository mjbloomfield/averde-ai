/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'green-deep': '#1B3A1F',
        'green-mid': '#2D5A27',
        'green-sage': '#6B8F5E',
        'sand': '#C8A96E',
        'terracotta': '#A85C3A',
        'cream': '#F7F3ED',
        'dark': '#1A1A1A',
        'muted': '#6B7280',
        'white-warm': '#FEFCF9',
      },
      fontFamily: {
        jakarta: ['"Plus Jakarta Sans"', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
