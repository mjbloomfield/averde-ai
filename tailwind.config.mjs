/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Reclaimed-wood palette
        'green-deep':  '#2A1B11',   // walnut-700
        'green-mid':   '#4F3522',   // walnut-500
        'green-sage':  '#B7A990',   // driftwood
        'sand':        '#C99356',   // honey-300
        'terracotta':  '#A86237',   // rust
        'cream':       '#F4ECDB',   // paper
        'dark':        '#1F1A12',   // ink
        'muted':       '#7A6A58',
        'white-warm':  '#F4ECDB',   // paper
        // Extended palette
        'honey-50':    '#F6E8D0',
        'honey-100':   '#E8C896',
        'honey-300':   '#C99356',
        'honey-500':   '#9C6A33',
        'walnut-300':  '#7A5238',
        'walnut-500':  '#4F3522',
        'walnut-700':  '#2A1B11',
        'bone':        '#E5DBC9',
        'driftwood':   '#B7A990',
        'blue-shelf':  '#6E8E97',
        'blue-shelf-light': '#9CB6BD',
        'rust':        '#A86237',
        'paper':       '#F4ECDB',
        'aged-cream':  '#EDE3D0',
      },
      fontFamily: {
        jakarta: ['"Plus Jakarta Sans"', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
