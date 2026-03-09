import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: { colorize: true, ignore: 'pid,hostname' },
      }
    : undefined,
  redact: {
    paths: [
      'req.headers.authorization',
      'body.password',
      'body.token',
      'body.amount',
      'body.income',
      '*.ssn',
      '*.salary',
    ],
    censor: '[REDACTED]',
  },
})
