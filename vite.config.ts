import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/cge_tools/",
  plugins: [tailwindcss()],
  build: { target: "es2022" },
});
