import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import { Express } from 'express'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Banking/Wallet System API',
      version: '1.0.0',
      description: `
# Banking/Wallet System API

A production-grade banking and wallet system with atomic money transfers, distributed idempotency, and real-time SSE streaming.

## Features

- **User Management**: Registration, login, refresh tokens
- **Account Management**: Create and list bank accounts
- **Transfers**: Atomic money transfers with idempotency and distributed locks
- **Real-time Updates**: SSE streaming for live transaction updates
- **Audit Trail**: Complete event logging for compliance
- **Health Checks**: Dependency-aware health monitoring
- **Metrics**: Prometheus-compatible metrics endpoint

## Authentication

All protected endpoints require a Bearer token in the Authorization header.

\`\`\`
Authorization: Bearer <token>
\`\`\`

## Rate Limiting

- **Auth endpoints**: 10 requests per 15 minutes
- **API endpoints**: 100 requests per 15 minutes
- **Transfer endpoints**: 10 requests per minute

## Idempotency

Transfer operations support idempotency keys via the \`Idempotency-Key\` header. Duplicate requests with the same key will return the original response without re-processing.
      `,
      contact: {
        name: 'Rishabh Jain',
        email: 'rishabh@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:8000',
        description: 'Development server',
      },
      {
        url: 'https://your-api.railway.app',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'cuid' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Account: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'cuid' },
            userId: { type: 'string' },
            name: { type: 'string' },
            balance: { type: 'number', format: 'decimal' },
            currency: { type: 'string', example: 'USD' },
            type: { type: 'string', enum: ['CHECKING', 'SAVINGS'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'cuid' },
            amount: { type: 'number', format: 'decimal' },
            description: { type: 'string' },
            type: { type: 'string', example: 'TRANSFER' },
            status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'FAILED'] },
            debitAccountId: { type: 'string' },
            creditAccountId: { type: 'string' },
            debitAccount: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                userId: { type: 'string' },
              },
            },
            creditAccount: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                userId: { type: 'string' },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        AuditEvent: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'cuid' },
            eventType: { type: 'string' },
            userId: { type: 'string', nullable: true },
            metadata: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['OK', 'DEGRADED'] },
            timestamp: { type: 'string', format: 'date-time' },
            checks: {
              type: 'object',
              properties: {
                postgres: { type: 'string' },
                redis: { type: 'string' },
                queues: { type: 'string' },
                queue_depth: { type: 'string' },
                sse_clients: { type: 'string' },
              },
            },
            uptime: { type: 'number' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/server.ts'],
}

const swaggerSpec = swaggerJsdoc(options)

export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Banking API Documentation',
  }))

  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(swaggerSpec)
  })
}

export default swaggerSpec
