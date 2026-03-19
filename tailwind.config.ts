import type { Config } from "tailwindcss";


export default {
content: [
"./app/**/*.{ts,tsx}",
"./components/**/*.{ts,tsx}",
],
theme: {
extend: {
  colors: {
    brand: {
      DEFAULT: '#122454',
      hover: '#1a3270',
      dark: '#0d1a3a',
      secondary: '#8E2A2A',
      'secondary-hover': '#a83333',
      'secondary-dark': '#6b1f1f',
    }
  }
},
},
plugins: [],
} satisfies Config;
