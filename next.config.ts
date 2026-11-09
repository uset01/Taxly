import os from "os";
import type { NextConfig } from "next";

const localIps = Object.values(os.networkInterfaces())
  .flat()
  .filter((iface): iface is os.NetworkInterfaceInfo => Boolean(iface && iface.family === "IPv4"))
  .map((iface) => iface.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.100.84", ...localIps],
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
