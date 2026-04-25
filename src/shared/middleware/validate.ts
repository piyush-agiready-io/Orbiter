import { ZodType, ZodError } from 'zod';

export class ValidationError extends Error {
  details: { field: string; message: string }[];
  constructor(error: ZodError) {
    const details = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    super('Validation failed');
    this.name = 'ValidationError';
    this.details = details;
  }
}

export function validateBody<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new ValidationError(result.error);
  return result.data;
}

export function validateQuery<T>(schema: ZodType<T>, params: URLSearchParams): T {
  const obj: Record<string, string> = {};
  params.forEach((value, key) => {
    obj[key] = value;
  });
  const result = schema.safeParse(obj);
  if (!result.success) throw new ValidationError(result.error);
  return result.data;
}
