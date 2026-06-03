import { Property } from '@activepieces/pieces-framework';

export function requireTier(tier: string | undefined): string {
  if (!tier) throw new Error('Tier is required.');
  return tier;
}

export const tierProperty = Property.StaticDropdown<string>({
  displayName: 'Tier',
  description:
    'Capability tier — Alvys routes the request to the best underlying model for that tier. ' +
    'Fast = quickest/cheapest, Balanced = default, Smart = strongest reasoning, Long Context = large documents.',
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
