import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        surface: "#071014",
        panel: "#0d1a1e",
        cyanline: "#38d9c8",
        signal: "#ffcc66",
        danger: "#ff5c7c"
      },
      boxShadow: {
        glow: "0 0 32px rgba(56, 217, 200, 0.18)"
      }
    }
  },
  plugins: []
};

export default config;
