const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('3000'),
  MONGODB_URI: z.string().optional(),
  SESSION_SECRET: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  ADMIN_USERNAME: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  ADMIN_NAME: z.string().optional(),
  ADMIN_EMAIL: z.string().optional(),
  SESSION_COOKIE_NAME: z.string().default('filing.sid'),
  SESSION_SAME_SITE: z.string().default('lax'),
  SESSION_MAX_AGE_MS: z.string().default('3600000'),
  PASSWORD_MIN_LENGTH: z.string().default('12')
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Environment configuration validation errors:');
    parsed.error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Invalid environment configuration in production');
    }
  }
  return parsed.data;
}

module.exports = {
  envSchema,
  validateEnv
};
