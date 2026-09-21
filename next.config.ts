import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client", "node-cron", "playwright"],
  async redirects() {
    return [
      {
        source: "/rotas",
        destination: "/routes",
        permanent: true,
      },
      {
        source: "/historico",
        destination: "/history",
        permanent: true,
      },
      {
        source: "/configuracoes",
        destination: "/settings",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
