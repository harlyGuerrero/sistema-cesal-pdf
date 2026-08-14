import type { ClassificationProvider, ClassificationResult } from "./provider";
import type { CategoryClassificationInput, CategoryCode } from "./category-schema";

// Clasificación patrimonial por reglas (ver ARCHITECTURE.md 5.2, skill
// product-classification). Semántica, no estructural — ver nota en
// lib/classification/relevance.ts sobre por qué esto no viola la prohibición
// de "listas de palabras prohibidas" de ARCHITECTURE.md 4.
const CATEGORY_PATTERNS: Record<CategoryCode, RegExp[]> = {
  EQUIPOS_INFORMATICOS: [
    /\bLAPTOPS?\b/,
    /\bCOMPUTADORAS?\b/,
    /\bDESKTOP\b/,
    /\bCPU\b/,
    /\bMONITOR(ES)?\b/,
    /\bIMPRESORAS?\b/,
    /\bESC[AÁ]NER\b|\bSCANNER\b/,
    /\bTECLADOS?\b/,
    /\bMOUSE\b/,
    /\bROUTERS?\b/,
    /\bSWITCH(ES)?\b/,
    /\bSERVIDOR(ES)?\b/,
    /\bTABLETS?\b/,
    /\bPROYECTOR(ES)?\b/,
    /\bDISCO DURO\b/,
    /\bUPS\b/,
  ],
  EQUIPOS_DE_OFICINA: [
    /\bFOTOCOPIADORAS?\b/,
    /\bTEL[EÉ]FONOS?\b/,
    /\bCALCULADORAS?\b/,
    /\bFAX\b/,
    /\bTRITURADORA\b/,
    /\bAIRE ACONDICIONADO\b/,
    /\bVENTILADOR(ES)?\b/,
    /\bDISPENSADOR DE AGUA\b/,
    /\bCAFETERAS?\b/,
  ],
  MUEBLES_DE_OFICINA: [
    /\bESCRITORIOS?\b/,
    /\bSILLAS?\b/,
    /\bARCHIVADOR(ES)?\b/,
    /\bESTANTES?\b/,
    /\bMESAS?\b/,
    /\bLIBREROS?\b/,
    /\bCREDENZA\b/,
    /\bPIZARRAS?\b/,
  ],
  BIENES_VEHICULARES: [
    /\bCAMIONETAS?\b/,
    /\bAUTOM[OÓ]VIL(ES)?\b/,
    /\bCAMI[OÓ]N(ES)?\b/,
    /\bMOTOCICLETAS?\b/,
    /\bVEH[IÍ]CULOS?\b/,
    /\bFURG[OÓ]N(ES)?\b/,
    /\bBUS(ES)?\b/,
  ],
  EQUIPOS_DE_MAQUINARIA: [
    /\bMAQUINARIA\b/,
    /\bGENERADOR(ES)?\b/,
    /\bCOMPRESORAS?\b/,
    /\bMONTACARGAS\b/,
    /\bEXCAVADORAS?\b/,
    /\bTRACTOR(ES)?\b/,
    /\bSOLDADORAS?\b/,
    /\bTORNOS?\b/,
    /\bGR[UÚ]AS?\b/,
  ],
  BIENES_INMUEBLES: [
    /\bTERRENOS?\b/,
    /\bEDIFICIOS?\b/,
    /\bLOCAL(ES)? COMERCIAL(ES)?\b/,
    /\bPREDIOS?\b/,
    /\bINMUEBLES?\b/,
    /\bALMAC[EÉ]N(ES)?\b/,
    /\bNAVE INDUSTRIAL\b/,
  ],
};

const RULE_CONFIDENCE = 0.85;

export class RuleCategoryProvider
  implements ClassificationProvider<CategoryClassificationInput, CategoryCode>
{
  async classify(
    input: CategoryClassificationInput
  ): Promise<ClassificationResult<CategoryCode> | null> {
    const text = (input.normalizedName ?? input.name ?? "").toUpperCase();
    if (!text) return null;

    const matches = (Object.entries(CATEGORY_PATTERNS) as [CategoryCode, RegExp[]][])
      .filter(([, patterns]) => patterns.some((pattern) => pattern.test(text)))
      .map(([code]) => code);

    // Sin match, o ambiguo entre más de una categoría: sin respuesta, que
    // decida el fallback (ver ARCHITECTURE.md 5.2: nunca forzar la más
    // probable sin marcarla como incierta).
    if (matches.length !== 1) return null;

    return { value: matches[0], confidence: RULE_CONFIDENCE, method: "RULE" };
  }
}
