import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      {
        source: "/relatorio",
        destination: "/",
        permanent: true,
      },
      {
        source: "/assinaturas",
        destination: "/",
        permanent: true,
      },
      {
        source: "/perfil",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
