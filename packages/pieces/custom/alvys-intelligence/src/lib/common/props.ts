import { Property } from '@activepieces/pieces-framework';

/**
 * Tier-style model selector for Alvys Intelligence text actions. Mirrors the
 * `ALVYS_INTELLIGENCE_TIERS` defined in `@activepieces/shared`. Single dropdown
 * — no provider picker because every Alvys text action is pinned to the
 * platform-configured Alvys Intelligence AI Provider.
 */
export const alvysModelProp = Property.StaticDropdown<string>({
  displayName: 'Model',
  description:
    'Capability tier. Alvys Intelligence routes to the best available underlying model.',
  required: true,
  defaultValue: 'alvys-balanced',
  options: {
    options: [
      { label: 'Fast', value: 'alvys-fast' },
      { label: 'Balanced (default)', value: 'alvys-balanced' },
      { label: 'Smart', value: 'alvys-smart' },
      { label: 'Long Context (1M tokens)', value: 'alvys-long-context' },
    ],
  },
});
