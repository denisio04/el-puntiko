import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        black: "#000000",
        white: "#FFFFFF",
        gray: {
          50: "#F9F9F9",
          100: "#F5F5F5",
          200: "#E5E5E5",
          300: "#D4D4D4",
          400: "#A3A3A3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
        },
      },
      borderRadius: {
        none: "0px",
        DEFAULT: "0px",
        sm: "0px",
        md: "0px",
        lg: "0px",
        xl: "0px",
        "2xl": "0px",
        "3xl": "0px",
        full: "9999px",
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        26: "6.5rem",
        30: "7.5rem",
        88: "22rem",
        100: "25rem",
        112: "28rem",
        128: "32rem",
      },
      fontFamily: {
        sans: ["Inter", "Helvetica Neue", "Arial", "sans-serif"],
        display: ["Inter", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "Monaco", "monospace"],
      },
      fontSize: {
        "10xl": "6rem",
        "11xl": "7rem",
        "12xl": "8rem",
      },
      transitionDuration: {
        DEFAULT: "150ms",
        fast: "100ms",
        normal: "150ms",
        slow: "300ms",
      },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.4, 0, 0.2, 1)",
        bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },
      boxShadow: {
        subtle: "0 1px 2px 0rgb(0 0 0 / 0.05)",
        soft: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
        medium: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
      },
      zIndex: {
        dropdown: "1000",
        sticky: "1100",
        modal: "1200",
        popover: "1300",
        tooltip: "1400",
      },
    },
  },
  plugins: [],
};

export default config;