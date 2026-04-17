/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'green-deep': '#2B4020',
        'green-mid': '#4A7A3C',
        'green-sage': '#8FAF82',
        'sand': '#D49846',
        'terracotta': '#C4714A',
        'cream': '#FEF7EA',
        'dark': '#1E1610',
        'muted': '#7A6A58',
        'white-warm': '#FFFCF5',
      },
      fontFamily: {
        jakarta: ['"Plus Jakarta Sans"', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
