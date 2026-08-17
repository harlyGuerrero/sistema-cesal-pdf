import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sin esto, Next dev bloquea (403) los recursos internos (incluido el JS
  // de la app) cuando se accede desde una IP de LAN en vez de localhost —
  // la página carga pero nunca hidrata, así que nada responde al touch.
  // Wildcard cubre reasignación de IP por DHCP dentro de la misma subred.
  allowedDevOrigins: ["192.168.18.*"],
};

export default nextConfig;
