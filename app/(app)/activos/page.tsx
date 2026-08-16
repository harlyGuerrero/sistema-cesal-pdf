import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ESTADO_PATRIMONIAL_LABELS, ESTADO_PATRIMONIAL_OPTIONS } from "@/lib/activos/labels";
import type { EstadoPatrimonial, Prisma } from "@/lib/generated/prisma/client";

const PAGE_SIZE = 20;

export default async function ActivosPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    tipoActivoId?: string;
    sedeId?: string;
    estadoPatrimonial?: string;
    page?: string;
  }>;
}) {
  const { q, tipoActivoId, sedeId, estadoPatrimonial, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where: Prisma.ActivoWhereInput = {
    ...(q ? { nombreNormalizado: { contains: q, mode: "insensitive" } } : {}),
    ...(tipoActivoId && tipoActivoId !== "all" ? { tipoActivoId } : {}),
    ...(sedeId && sedeId !== "all" ? { sedeId } : {}),
    ...(estadoPatrimonial && estadoPatrimonial !== "all"
      ? { estadoPatrimonial: estadoPatrimonial as EstadoPatrimonial }
      : {}),
  };

  const [activos, total, tiposActivo, sedes] = await Promise.all([
    prisma.activo.findMany({
      where,
      include: { tipoActivo: true, sede: true },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.activo.count({ where }),
    prisma.tipoActivo.findMany({ orderBy: { name: "asc" } }),
    prisma.sede.findMany({ orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Activos</h1>
        <Button render={<Link href="/activos/nuevo" />} nativeButton={false}>
          Nuevo activo
        </Button>
      </div>

      <form className="flex flex-wrap gap-2" method="get">
        <Input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nombre..."
          className="max-w-64"
        />
        <Select name="tipoActivoId" defaultValue={tipoActivoId ?? "all"}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Todos los tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {tiposActivo.map((tipo) => (
              <SelectItem key={tipo.id} value={tipo.id}>
                {tipo.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select name="sedeId" defaultValue={sedeId ?? "all"}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todas las sedes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las sedes</SelectItem>
            {sedes.map((sede) => (
              <SelectItem key={sede.id} value={sede.id}>
                {sede.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select name="estadoPatrimonial" defaultValue={estadoPatrimonial ?? "all"}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {ESTADO_PATRIMONIAL_OPTIONS.map((option) => (
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
            <TableHead>Nombre</TableHead>
            <TableHead>Tipo de activo</TableHead>
            <TableHead>Sede</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Código patrimonial</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activos.map((activo) => (
            <TableRow key={activo.id}>
              <TableCell>
                <Link href={`/activos/${activo.id}`} className="hover:underline">
                  {activo.nombreActivo}
                </Link>
              </TableCell>
              <TableCell>{activo.tipoActivo.name}</TableCell>
              <TableCell>{activo.sede?.name ?? <span className="text-muted-foreground">Sin sede</span>}</TableCell>
              <TableCell>
                <Badge variant="outline">
                  {ESTADO_PATRIMONIAL_LABELS[activo.estadoPatrimonial] ?? activo.estadoPatrimonial}
                </Badge>
              </TableCell>
              <TableCell>{activo.codigoPatrimonial ?? "—"}</TableCell>
            </TableRow>
          ))}
          {activos.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No hay activos que coincidan con el filtro.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <PageLink
            page={page - 1}
            disabled={page <= 1}
            q={q}
            tipoActivoId={tipoActivoId}
            sedeId={sedeId}
            estadoPatrimonial={estadoPatrimonial}
          >
            Anterior
          </PageLink>
          <span className="text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <PageLink
            page={page + 1}
            disabled={page >= totalPages}
            q={q}
            tipoActivoId={tipoActivoId}
            sedeId={sedeId}
            estadoPatrimonial={estadoPatrimonial}
          >
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
  q,
  tipoActivoId,
  sedeId,
  estadoPatrimonial,
  children,
}: {
  page: number;
  disabled: boolean;
  q?: string;
  tipoActivoId?: string;
  sedeId?: string;
  estadoPatrimonial?: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return <span className="text-muted-foreground">{children}</span>;
  }
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (tipoActivoId) params.set("tipoActivoId", tipoActivoId);
  if (sedeId) params.set("sedeId", sedeId);
  if (estadoPatrimonial) params.set("estadoPatrimonial", estadoPatrimonial);
  params.set("page", String(page));
  return (
    <Link href={`/activos?${params.toString()}`} className="hover:underline">
      {children}
    </Link>
  );
}
