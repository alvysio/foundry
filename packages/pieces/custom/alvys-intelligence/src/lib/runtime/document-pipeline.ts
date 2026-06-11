/**
 * Document pipeline registry — Alvys-branded pipeline definitions per document
 * type. Each document type maps to a named pipeline (classify → schema mapper →
 * tenant-reference merger). Pipelines are versioned independently per doctype;
 * callers reference them via the Alvys-shaped `workflowId` returned by
 * `workflowIdFor()`. Upstream provider identity is confined to the
 * `runtime/providers/bem.ts` module — this file only emits Alvys ids.
 *
 * The mapping is intentionally a constant in code (no remote fetch) — every
 * piece sandbox sees the same pipeline catalog without an extra round-trip.
 */

export const WORKFLOW_ID_BY_DOCTYPE: Readonly<Record<string, string>> = {
  pod: 'alvys-pod-extract-v1',
  ratecon: 'alvys-ratecon-extract-v1',
  bol: 'alvys-bol-extract-v1',
  customer_invoice: 'alvys-customer-invoice-extract-v1',
  carrier_invoice: 'alvys-carrier-invoice-extract-v1',
  coi: 'alvys-coi-extract-v1',
  mvr: 'alvys-mvr-extract-v1',
  dac: 'alvys-dac-extract-v1',
  ifta: 'alvys-ifta-extract-v1',
  lumper_receipt: 'alvys-lumper-extract-v1',
  scale_ticket: 'alvys-scale-extract-v1',
  accessorial_receipt: 'alvys-accessorial-extract-v1',
  edi_204_image: 'alvys-edi204-extract-v1',
  other: 'alvys-generic-extract-v1',
};

export const CLASSIFICATION_WORKFLOW_ID = 'alvys-document-classify-v1';

export const PARSE_WORKFLOW_ID = 'alvys-document-parse-v1';

type MergeResult = {
  canonical: Record<string, unknown>;
  customReferences: Record<string, unknown>;
};

function isStringRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const documentPipeline = {
  workflowIdFor(documentType: string): string | undefined {
    return WORKFLOW_ID_BY_DOCTYPE[documentType];
  },

  classificationWorkflowId(): string {
    return CLASSIFICATION_WORKFLOW_ID;
  },

  parseWorkflowId(): string {
    return PARSE_WORKFLOW_ID;
  },

  /**
   * Split the upstream-extracted field set into:
   *   - canonical: fields that match the doc-type's well-known schema.
   *   - customReferences: tenant-defined ad-hoc fields, projected by the
   *     keys present in the supplied `customReferenceSchema`.
   *
   * No knowledge of upstream field names beyond what was extracted. If a
   * tenant reference key matches a top-level field returned by the extractor,
   * it's hoisted into customReferences; otherwise the reference value is
   * `null` so downstream flows can still branch on the key's presence.
   */
  mergeWithCustomReferences({
    fields,
    customReferenceSchema,
  }: {
    fields: Record<string, unknown>;
    customReferenceSchema: Record<string, unknown>;
  }): MergeResult {
    const canonical: Record<string, unknown> = {};
    const customReferences: Record<string, unknown> = {};

    const refKeys = Object.keys(customReferenceSchema ?? {});
    const refKeySet = new Set(refKeys);

    for (const [k, v] of Object.entries(fields ?? {})) {
      if (refKeySet.has(k)) {
        customReferences[k] = v;
      } else {
        canonical[k] = v;
      }
    }

    for (const k of refKeys) {
      if (!(k in customReferences)) {
        customReferences[k] = null;
      }
    }

    void isStringRecord;
    return { canonical, customReferences };
  },
};
