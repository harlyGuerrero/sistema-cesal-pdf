"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { IMPORT_ITEM_STATUS_LABELS, IMPORT_ITEM_STATUS_VARIANT } from "@/lib/import-workflow/labels";
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
  category: { id: string; name: string } | null;
  categoryConfidence: number | null;
  relevanceConfidence: number | null;
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
    <div className="space-y-3">
      <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
        <TabsList>
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
              {f.value !== "ALL" && (
                <span className="ml-1 text-muted-foreground">
                  ({items.filter((item) => item.status === f.value).length})
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>Cantidad</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Confianza</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Acciones</TableHead>
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

  return (
    <TableRow>
      <TableCell className="max-w-64 truncate" title={item.rawText}>
        {item.normalizedName ?? item.rawText}
      </TableCell>
      <TableCell>{item.quantity ?? "—"}</TableCell>
      <TableCell>{item.unitPrice != null ? item.unitPrice.toFixed(2) : "—"}</TableCell>
      <TableCell>{item.category?.name ?? "—"}</TableCell>
      <TableCell>{confidence != null ? `${Math.round(confidence * 100)}%` : "—"}</TableCell>
      <TableCell>
        <Badge variant={IMPORT_ITEM_STATUS_VARIANT[item.status] ?? "outline"}>
          {IMPORT_ITEM_STATUS_LABELS[item.status] ?? item.status}
        </Badge>
      </TableCell>
      <TableCell>
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
