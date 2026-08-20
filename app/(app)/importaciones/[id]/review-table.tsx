"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PackageIcon, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IMPORT_ITEM_STATUS_LABELS, IMPORT_ITEM_STATUS_META } from "@/lib/import-workflow/labels";
import { TIPO_ACTIVO_META } from "@/lib/activos/tipo-activo-meta";
import type { TipoActivoCode } from "@/lib/generated/prisma/client";
import { confirmItemAction, editAndConfirmItemAction, rejectItemAction } from "./actions";

export interface ReviewItem {
  id: string;
  rawText: string;
  normalizedName: string | null;
  quantity: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  relevance: string | null;
  status: string;
  categoryId: string | null;
  category: { id: string; name: string; code: TipoActivoCode } | null;
  categoryConfidence: number | null;
  relevanceConfidence: number | null;
  extractionConfidence: number | null;
}

function formatCurrency(value: number): string {
  return `S/ ${value.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;
}

// Umbral estructural real (HIGH_CONFIDENCE_THRESHOLD, ver skill
// product-classification) — no un corte de color arbitrario: 0.8 es el punto
// en el que una clasificación por reglas se auto-confirma sin pasar por acá.
function confidenceColor(value: number): string {
  if (value >= 0.8) return "var(--color-good)";
  if (value >= 0.5) return "var(--color-warning)";
  return "var(--color-critical)";
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = confidenceColor(value);
  return (
    <div className="flex items-center gap-2">
      <span className="w-9 shrink-0 text-sm tabular-nums">{pct}%</span>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export interface ReviewCategory {
  id: string;
  name: string;
}

const FILTERS = [
  { value: "ALL", label: "Todos" },
  { value: "REVIEW_REQUIRED", label: "Pendientes" },
  { value: "CONFIRMED", label: "Confirmados" },
  { value: "REJECTED", label: "Rechazados" },
  { value: "IGNORED", label: "Ignorados" },
] as const;

export function ReviewTable({
  items,
  categories,
}: {
  items: ReviewItem[];
  categories: ReviewCategory[];
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("ALL");
  const visibleItems = filter === "ALL" ? items : items.filter((item) => item.status === filter);

  return (
    <div className="space-y-4">
      <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
        {/* overflow-x-auto: en móvil las 5 pestañas no caben en una fila
            (TabsList es w-fit sin wrap) — sin esto "Ignorados" quedaba
            recortado fuera de la pantalla, inalcanzable. */}
        <div className="overflow-x-auto">
          <TabsList variant="line">
            {FILTERS.map((f) => (
              <TabsTrigger
                key={f.value}
                value={f.value}
                className="data-active:text-primary data-active:after:bg-primary"
              >
                {f.label}
                {f.value !== "ALL" && (
                  <span className="ml-1 text-muted-foreground">
                    ({items.filter((item) => item.status === f.value).length})
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      <Card>
        <CardContent className="overflow-x-auto px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Producto</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Confianza</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="pr-6">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleItems.map((item) => (
                <ReviewRow key={item.id} item={item} categories={categories} />
              ))}
              {visibleItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No hay productos en esta vista.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}

function ReviewRow({ item, categories }: { item: ReviewItem; categories: ReviewCategory[] }) {
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const confidence = item.categoryConfidence ?? item.relevanceConfidence;
  const meta = item.category ? TIPO_ACTIVO_META[item.category.code] : null;
  const Icon: LucideIcon = meta?.icon ?? PackageIcon;
  const color = meta?.color ?? "var(--color-neutral)";
  const statusMeta = IMPORT_ITEM_STATUS_META[item.status] ?? IMPORT_ITEM_STATUS_META.REVIEW_REQUIRED;
  const StatusIcon = statusMeta.icon;

  return (
    <TableRow>
      <TableCell className="max-w-64 pl-6">
        <div className="flex items-center gap-2.5">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)`, color }}
          >
            <Icon className="size-4" />
          </span>
          <span className="truncate" title={item.rawText}>
            {item.normalizedName ?? item.rawText}
          </span>
        </div>
      </TableCell>
      <TableCell>{item.quantity ?? "—"}</TableCell>
      <TableCell>{item.unitPrice != null ? formatCurrency(item.unitPrice) : "—"}</TableCell>
      <TableCell>{item.category?.name ?? "—"}</TableCell>
      <TableCell>{confidence != null ? <ConfidenceBar value={confidence} /> : "—"}</TableCell>
      <TableCell>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: `color-mix(in oklch, ${statusMeta.color} 15%, transparent)`,
            color: statusMeta.color,
          }}
        >
          <StatusIcon className="size-3" />
          {IMPORT_ITEM_STATUS_LABELS[item.status] ?? item.status}
        </span>
      </TableCell>
      <TableCell className="pr-6">
        {item.status !== "REVIEW_REQUIRED" ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <div className="flex gap-1.5">
            <Button
              size="sm"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await confirmItemAction(item.id);
                    toast.success(`"${item.normalizedName ?? item.rawText}" confirmado.`);
                  } catch (error) {
                    toast.error(errorMessage(error));
                  }
                })
              }
            >
              Confirmar
            </Button>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger render={<Button size="sm" variant="outline" />}>Editar</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar producto</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    startTransition(async () => {
                      try {
                        await editAndConfirmItemAction(item.id, formData);
                        setEditOpen(false);
                        toast.success("Producto editado y confirmado.");
                      } catch (error) {
                        toast.error(errorMessage(error));
                      }
                    });
                  }}
                  className="space-y-3"
                >
                  <div className="space-y-1">
                    <Label htmlFor={`name-${item.id}`}>Nombre</Label>
                    <Input
                      id={`name-${item.id}`}
                      name="name"
                      defaultValue={item.normalizedName ?? ""}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`category-${item.id}`}>Categoría</Label>
                    <Select name="categoryId" defaultValue={item.categoryId ?? undefined}>
                      <SelectTrigger id={`category-${item.id}`} className="w-full">
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {item.extractionConfidence != null && (
                    <div className="space-y-1">
                      <Label>Confianza de extracción (cantidad/precio)</Label>
                      <ConfidenceBar value={item.extractionConfidence} />
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor={`qty-${item.id}`}>Cantidad</Label>
                      <Input
                        id={`qty-${item.id}`}
                        name="quantity"
                        type="number"
                        step="0.001"
                        defaultValue={item.quantity ?? ""}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`unit-${item.id}`}>P. unitario</Label>
                      <Input
                        id={`unit-${item.id}`}
                        name="unitPrice"
                        type="number"
                        step="0.01"
                        defaultValue={item.unitPrice ?? ""}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`total-${item.id}`}>Total</Label>
                      <Input
                        id={`total-${item.id}`}
                        name="totalPrice"
                        type="number"
                        step="0.01"
                        defaultValue={item.totalPrice ?? ""}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isPending}>
                      Guardar y confirmar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
              <DialogTrigger render={<Button size="sm" variant="destructive" />}>
                Rechazar
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Rechazar producto</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    startTransition(async () => {
                      try {
                        await rejectItemAction(item.id, formData);
                        setRejectOpen(false);
                        toast.success("Producto rechazado.");
                      } catch (error) {
                        toast.error(errorMessage(error));
                      }
                    });
                  }}
                  className="space-y-3"
                >
                  <div className="space-y-1">
                    <Label htmlFor={`notes-${item.id}`}>Motivo (opcional)</Label>
                    <Textarea id={`notes-${item.id}`} name="reviewNotes" rows={3} />
                  </div>
                  <DialogFooter>
                    <Button type="submit" variant="destructive" disabled={isPending}>
                      Rechazar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
