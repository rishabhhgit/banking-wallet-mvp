import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seed() {
  console.log('Seeding database...')

  // Clean existing data
  await prisma.auditEvent.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()

  // Create demo users
  const password = await bcrypt.hash('Password123!', 12)

  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      password,
      firstName: 'Alice',
      lastName: 'Johnson',
    },
  })

  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      password,
      firstName: 'Bob',
      lastName: 'Smith',
    },
  })

  const charlie = await prisma.user.create({
    data: {
      email: 'charlie@example.com',
      password,
      firstName: 'Charlie',
      lastName: 'Brown',
    },
  })

  console.log(`Created users: ${alice.id}, ${bob.id}, ${charlie.id}`)

  // Create accounts
  const aliceChecking = await prisma.account.create({
    data: {
      userId: alice.id,
      name: 'Main Checking',
      type: 'CHECKING',
      balance: 5000.0,
    },
  })

  const aliceSavings = await prisma.account.create({
    data: {
      userId: alice.id,
      name: 'Savings',
      type: 'SAVINGS',
      balance: 15000.0,
    },
  })

  const bobChecking = await prisma.account.create({
    data: {
      userId: bob.id,
      name: 'Checking',
      type: 'CHECKING',
      balance: 3200.0,
    },
  })

  const charlieChecking = await prisma.account.create({
    data: {
      userId: charlie.id,
      name: 'Checking',
      type: 'CHECKING',
      balance: 800.0,
    },
  })

  console.log(
    `Created accounts: ${aliceChecking.id}, ${aliceSavings.id}, ${bobChecking.id}, ${charlieChecking.id}`
  )

  // Create some transactions
  const tx1 = await prisma.transaction.create({
    data: {
      amount: 150.0,
      description: 'Lunch payment',
      type: 'TRANSFER',
      status: 'COMPLETED',
      debitAccountId: aliceChecking.id,
      creditAccountId: bobChecking.id,
    },
  })

  const tx2 = await prisma.transaction.create({
    data: {
      amount: 50.0,
      description: 'Coffee',
      type: 'TRANSFER',
      status: 'COMPLETED',
      debitAccountId: bobChecking.id,
      creditAccountId: charlieChecking.id,
    },
  })

  console.log(`Created transactions: ${tx1.id}, ${tx2.id}`)

  // Create audit events
  await prisma.auditEvent.createMany({
    data: [
      { eventType: 'USER_REGISTERED', userId: alice.id },
      { eventType: 'USER_REGISTERED', userId: bob.id },
      { eventType: 'USER_REGISTERED', userId: charlie.id },
      { eventType: 'ACCOUNT_CREATED', userId: alice.id },
      { eventType: 'ACCOUNT_CREATED', userId: bob.id },
      { eventType: 'TRANSFER_COMPLETED', userId: alice.id },
      { eventType: 'TRANSFER_COMPLETED', userId: bob.id },
    ],
  })

  console.log('Created audit events')

  console.log('\n--- Seed Complete ---')
  console.log('Demo credentials:')
  console.log('  alice@example.com / Password123!')
  console.log('  bob@example.com / Password123!')
  console.log('  charlie@example.com / Password123!')
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
