import * as Joi from 'joi';

export default Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().default(3000),

  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),

  DATABASE_URL: Joi.string().uri().required(),
  DEBUG_QUERIES: Joi.boolean().default(false),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_USERNAME: Joi.string().optional(),

  SESSION_COOKIE_NAME: Joi.string().required(),
  SESSION_SECRET: Joi.string().required(),
  SESSION_MAX_AGE: Joi.number().default(604800000),
  ENABLE_HTTPS: Joi.boolean().default(false),

  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),

  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),

  WEBHOOK_HMAC_SECRET: Joi.string().optional(),
});

// openssl rand -base64 64
