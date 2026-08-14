import { z } from "zod";

// Espejo del contrato HTTP del Document Service
// (document-service/app/contracts.py). Si cambia un campo allá, cambiarlo
// también acá — ver skill typescript.

export const productSourceSchema = z.object({
  page: z.number().int(),
  table: z.number().int(),
  row: z.number().int(),
});

export const productCandidateSchema = z.object({
  rawText: z.string(),
  name: z.string().nullable(),
  quantity: z.number().nullable(),
  unitPrice: z.number().nullable(),
  totalPrice: z.number().nullable(),
  currency: z.string().nullable(),
  source: productSourceSchema,
  confidence: z.number().min(0).max(1),
});

export const documentInfoSchema = z.object({
  pages: z.number().int(),
});

export const processMetricsSchema = z.object({
  fileHash: z.string(),
  fileSizeBytes: z.number().int(),
  processingTimeMs: z.number().int(),
  engine: z.string().nullable(),
});

export const processResponseSchema = z.object({
  document: documentInfoSchema,
  tables: z.array(z.record(z.string(), z.unknown())),
  products: z.array(productCandidateSchema),
  metrics: processMetricsSchema,
});

export type ProductSource = z.infer<typeof productSourceSchema>;
export type ProductCandidate = z.infer<typeof productCandidateSchema>;
export type ProcessResponse = z.infer<typeof processResponseSchema>;
