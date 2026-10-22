import { z } from "zod";
import {
  DESIGNS,
  IMAGE_RATIOS,
  MERCHANT_ID_PATTERN,
  type DesignId,
} from "./index";

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "must be a 6-digit hex colour like #ed186f");

const designIds = DESIGNS.map((d) => d.id) as [DesignId, ...DesignId[]];

export const OptionsSchema = z.object({
  accentColor: hexColor,
  textColor: hexColor,
  backgroundColor: hexColor,
  radius: z.number().int().min(0).max(24),
  imageRatio: z.enum(IMAGE_RATIOS),
  showBadge: z.boolean(),
  showQuickBuy: z.boolean(),
  showRating: z.boolean(),
  showCompareAt: z.boolean(),
});

export const SettingsSchema = z.object({
  enabled: z.boolean(),
  design: z.enum(designIds),
  options: OptionsSchema,
});

export const MerchantIdSchema = z
  .string()
  .regex(MERCHANT_ID_PATTERN, "invalid merchant id");
