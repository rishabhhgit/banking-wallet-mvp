import { GenericContainer, StartedTestContainer } from 'testcontainers'
import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'

let postgresContainer: StartedTestContainer | null = null
let redisContainer: StartedTestContainer | null = null
let prisma: PrismaClient | null = null

export async function setupTestContainers() {
  // Start PostgreSQL
  postgresContainer = await new GenericContainer('postgres:16-alpine')
    .withExposedPorts(5432)
    .withEnvironment({
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
      POSTGRES_DB: 'test_db',
    })
    .start()

  // Start Redis
  redisContainer = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .start()

  const dbHost = postgresContainer.getHost()
  const dbPort = postgresContainer.getMappedPort(5432)
  const redisHost = redisContainer.getHost()
  const redisPort = redisContainer.getMappedPort(6379)

  const dbUrl = `postgresql://test:test@${dbHost}:${dbPort}/test_db`
  const redisUrl = `redis://${redisHost}:${redisPort}`

  // Set environment variables
  process.env.DATABASE_URL = dbUrl
  process.env.REDIS_URL = redisUrl
  process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-long'
  process.env.NODE_ENV = 'test'

  // Run migrations
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: 'inherit',
  })

  // Initialize Prisma client
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  })

  return { dbUrl, redisUrl, prisma }
}

export async function teardownTestContainers() {
  if (prisma) {
    await prisma.$disconnect()
  }
  if (postgresContainer) {
    await postgresContainer.stop()
  }
  if (redisContainer) {
    await redisContainer.stop()
  }
}

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    throw new Error('Prisma client not initialized. Call setupTestContainers first.')
  }
  return prisma
}
