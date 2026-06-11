/**
 * Document pipeline helpers — Alvys-shaped post-processing of extracted
 * fields. Upstream workflows are provisioned per flow/step at runtime (see
 * `runtime/providers/bem.ts`); this module only handles splitting extractor
 * output into the canonical schema and tenant custom-references.
 */

type MergeResult = {
  canonical: Record<string, unknown>;
  customReferences: Record<string, unknown>;
};

export const documentPipeline = {
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

    return { canonical, customReferences };
  },
};
