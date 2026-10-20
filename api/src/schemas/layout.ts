import { z } from 'zod';

export const layoutItemSchema = z.object({
  i: z.string().min(1, 'Widget ID is required'),
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
});

export const dashboardLayoutSchema = z.array(layoutItemSchema);

export type LayoutItem = z.infer<typeof layoutItemSchema>;
export type DashboardLayout = z.infer<typeof dashboardLayoutSchema>;