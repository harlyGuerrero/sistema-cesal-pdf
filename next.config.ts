import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sin esto, Next dev bloquea (403) los recursos internos (incluido el JS
  // de la app) cuando se accede desde una IP de LAN en vez de localhost —
  // la página carga pero nunca hidrata, así que nada responde al touch.
  // Wildcard cubre reasignación de IP por DHCP dentro de la misma subred.
  allowedDevOrigins: ["192.168.18.*"],
  experimental: {
    // proxy.ts hace que Next guarde en memoria el body de cada request, con
    // un tope por defecto de 10 MB: un archivo más grande llegaría cortado a
    // la API route. Documentos e importaciones aceptan hasta 20 MB (+ margen
    // para el resto del multipart).
    proxyClientMaxBodySize: "21mb",
  },
};

export default nextConfig;
