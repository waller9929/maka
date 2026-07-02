import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#1259C3",
          blueDark: "#0B3D91",
          blueLight: "#E8F0FE",
          black: "#111315",
          gray: "#5B6168",
          bg: "#F5F6F8",
        },
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
