/**
 * Reusable Zod schemas with a security-focused error map.
 *
 * Ported from `@alvysio/odin` `packages/@odin/security/src/input-validator.ts`.
 * Error messages are deliberately generic — never echo back input bytes, size
 * limits, or regex internals to the caller; those leak shape information that
 * a malicious flow author could fingerprint.
 */

import { z } from 'zod';

const SAFE_STRING_MAX = 4096;
const FILENAME_PATTERN = /^[\w\-. ]+$/;

export const SafeStringSchema = z
  .string({ message: 'Input must be a string' })
  .min(1, { message: 'Input must not be empty' })
  .max(SAFE_STRING_MAX, { message: 'Input too large' })
  .refine((s) => !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(s), {
    message: 'Input contains disallowed control characters',
  });

export const IdentifierSchema = z
  .string({ message: 'Identifier must be a string' })
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_\-:.]+$/, { message: 'Identifier contains disallowed characters' });

export const FilenameSchema = z
  .string({ message: 'Filename must be a string' })
  .min(1)
  .max(255)
  .regex(FILENAME_PATTERN, { message: 'Filename contains disallowed characters' })
  .refine((s) => !s.includes('..'), { message: 'Filename contains traversal sequence' });

export const UrlHttpsSchema = z
  .string()
  .url({ message: 'Invalid URL' })
  .startsWith('https://', { message: 'URL must use https://' });

export const DocumentTypeSchema = z.enum([
  'pod',
  'ratecon',
  'bol',
  'customer_invoice',
  'carrier_invoice',
  'coi',
  'mvr',
  'dac',
  'ifta',
  'lumper_receipt',
  'scale_ticket',
  'accessorial_receipt',
  'edi_204_image',
  'other',
]);

export const EntityTypeSchema = z.enum([
  'load',
  'trip',
  'driver',
  'truck',
  'trailer',
  'carrier',
  'customer',
  'maintenance_order',
  'invoice',
  'none',
]);

export const AlvysTierSchema = z.enum([
  'alvys-fast',
  'alvys-balanced',
  'alvys-smart',
  'alvys-long-context',
]);
