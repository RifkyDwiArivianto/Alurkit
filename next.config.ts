import type { NextConfig } from "next";

// Export statis + basePath hanya aktif saat deploy ke GitHub Pages.
// basePath harus sama dengan nama repo GitHub (huruf besar/kecil berpengaruh).
const isPages = process.env.DEPLOY_TARGET === "pages";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isPages && {
    output: "export",
    images: { unoptimized: true },
    basePath: "/Flowforge",
  }),
};

export default nextConfig;