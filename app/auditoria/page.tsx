import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ENTIDADES_AUDITADAS, TIPO_ACCION_AUDITORIA_LABELS, TIPO_ACCION_AUDITORIA_OPTIONS } from "@/lib/auditoria/labels";
import type { Prisma, TipoAccionAuditoria } from "@/lib/generated/prisma/client";

const PAGE_SIZE = 30;

function resumenDetalle(detalle: unknown): string {
  if (!detalle || typeof detalle !== "object") return "—";
  const entries = Object.entries(detalle as Record<string, unknown>).filter(([, v]) => v != null);
  if (entries.length === 0) return "—";
  return entries.map(([key, value]) => `${key}: ${value}`).join(" · ");
}

// Fase 11 de Activos: log de solo lectura, filtrable por entidad/acción.
// Sin restricción por rol todavía — no hay autenticación (fuera de alcance,
// ver CLAUDE.md); cuando exista, esta pantalla debería quedar solo para un
// rol administrador.
export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ entidad?: string; accion?: string; page?: string }>;
}) {
  const { entidad, accion, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where: Prisma.AuditoriaLogWhereInput = {
    ...(entidad && entidad !== "all" ? { entidad } : {}),
    ...(accion && accion !== "all" ? { accion: accion as TipoAccionAuditoria } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditoriaLog.findMany({
      where,
      include: { usuario: true },
      orderBy: { fecha: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditoriaLog.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-medium">Auditoría</h1>
        <p className="text-sm text-muted-foreground">
          Qué hizo el usuario en el sistema — distinto del historial de movimientos de cada activo.
        </p>
      </div>

      <form className="flex flex-wrap gap-2" method="get">
        <Select name="entidad" defaultValue={entidad ?? "all"}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todas las entidades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las entidades</SelectItem>
            {ENTIDADES_AUDITADAS.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select name="accion" defaultValue={accion ?? "all"}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Todas las acciones" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las acciones</SelectItem>
            {TIPO_ACCION_AUDITORIA_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Acción</TableHead>
            <TableHead>Entidad</TableHead>
            <TableHead>Detalle</TableHead>
            <TableHead>Usuario</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="text-xs text-muted-foreground">
                {log.fecha.toLocaleString("es-PE")}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{TIPO_ACCION_AUDITORIA_LABELS[log.accion] ?? log.accion}</Badge>
              </TableCell>
              <TableCell>{log.entidad}</TableCell>
              <TableCell className="max-w-96 truncate text-sm text-muted-foreground" title={resumenDetalle(log.detalle)}>
                {resumenDetalle(log.detalle)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{log.usuario?.nombre ?? "—"}</TableCell>
            </TableRow>
          ))}
          {logs.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Sin registros que coincidan con el filtro.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <PageLink page={page - 1} disabled={page <= 1} entidad={entidad} accion={accion}>
            Anterior
          </PageLink>
          <span className="text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <PageLink page={page + 1} disabled={page >= totalPages} entidad={entidad} accion={accion}>
            Siguiente
          </PageLink>
        </div>
      )}
    </main>
  );
}

function PageLink({
  page,
  disabled,
  entidad,
  accion,
  children,
}: {
  page: number;
  disabled: boolean;
  entidad?: string;
  accion?: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return <span className="text-muted-foreground">{children}</span>;
  }
  const params = new URLSearchParams();
  if (entidad) params.set("entidad", entidad);
  if (accion) params.set("accion", accion);
  params.set("page", String(page));
  return (
    <Link href={`/auditoria?${params.toString()}`} className="hover:underline">
      {children}
    </Link>
  );
}
