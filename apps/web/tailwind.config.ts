import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#14212b",
          soft: "#3a4a57",
          muted: "#5c6b78",
        },
        mist: {
          DEFAULT: "#eef3f6",
          deep: "#d5e0e8",
        },
        tide: {
          DEFAULT: "#0f766e",
          soft: "#ccfbf1",
          deep: "#115e59",
        },
        ember: {
          DEFAULT: "#b45309",
          soft: "#ffedd5",
        },
        foam: "#f7fafb",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        atmosphere:
          "radial-gradient(1200px 600px at 12% -10%, rgba(15, 118, 110, 0.14), transparent 55%), radial-gradient(900px 500px at 90% 0%, rgba(180, 83, 9, 0.08), transparent 50%), linear-gradient(180deg, #f7fafb 0%, #eef3f6 48%, #e7eef3 100%)",
      },
      boxShadow: {
        panel: "0 1px 0 rgba(20, 33, 43, 0.06), 0 12px 32px rgba(20, 33, 43, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
