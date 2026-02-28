import { z } from 'zod';
import { PredictRequestSchema, PredictionResponseSchema, LivePriceSchema, SignalResponseSchema, UserSettingsSchema, TimeframeSchema, type PredictRequest, type PredictionResponse } from './schema';

// Re-export types for use in hooks
export type { PredictRequest, PredictionResponse };

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  prediction: {
    analyze: {
      method: 'POST' as const,
      path: '/api/predict',
      input: PredictRequestSchema,
      responses: {
        200: PredictionResponseSchema,
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
  },
  livePrice: {
    get: {
      method: 'GET' as const,
      path: '/api/live-price',
      responses: {
        200: LivePriceSchema,
        500: errorSchemas.internal,
      },
    },
  },
  signals: {
    list: {
      method: 'GET' as const,
      path: '/api/signals',
      responses: {
        200: z.array(SignalResponseSchema),
        500: errorSchemas.internal,
      },
    },
    generate: {
      method: 'POST' as const,
      path: '/api/signals/generate',
      input: z.object({ timeframe: TimeframeSchema }),
      responses: {
        200: SignalResponseSchema,
        500: errorSchemas.internal,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/signals/:id',
      responses: {
        200: z.object({ success: z.boolean() }),
        404: errorSchemas.notFound,
        500: errorSchemas.internal,
      },
    },
  },
  settings: {
    get: {
      method: 'GET' as const,
      path: '/api/settings',
      responses: {
        200: UserSettingsSchema,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/settings',
      input: UserSettingsSchema.partial(),
      responses: {
        200: UserSettingsSchema,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
