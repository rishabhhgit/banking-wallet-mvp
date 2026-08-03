import { PrismaClient } from "@prisma/client";
import { setupTestContainers, teardownTestContainers, getPrismaClient } from "../setup";

const CONCURRENT_TRANSFERS = 10;
const TRANSFER_AMOUNT = 10;

let prisma: PrismaClient;

beforeAll(async () => {
  await setupTestContainers();
  prisma = getPrismaClient();
}, 60000);

afterAll(async () => {
  await teardownTestContainers();
}, 30000);

async function createTestAccounts() {
  const user = await prisma.user.create({
    data: {
      email: `stress-test-${Date.now()}@example.com`,
      password: "hashed_password",
      firstName: "Stress",
      lastName: "Test",
    },
  });

  const source = await prisma.account.create({
    data: {
      userId: user.id,
      name: "Source Account",
      type: "CHECKING",
      currency: "USD",
      balance: CONCURRENT_TRANSFERS * TRANSFER_AMOUNT,
    },
  });

  const destination = await prisma.account.create({
    data: {
      userId: user.id,
      name: "Destination Account",
      type: "SAVINGS",
      currency: "USD",
      balance: 0,
    },
  });

  return { user, source, destination };
}

async function executeTransfer(
  sourceId: string,
  destinationId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.$transaction(
      async (tx) => {
        const sourceAccount = await tx.account.findUnique({
          where: { id: sourceId },
        });

        if (!sourceAccount) {
          throw new Error("Source account not found");
        }

        if (Number(sourceAccount.balance) < amount) {
          throw new Error("Insufficient funds");
        }

        await tx.account.update({
          where: { id: sourceId },
          data: { balance: { decrement: amount } },
        });

        await tx.account.update({
          where: { id: destinationId },
          data: { balance: { increment: amount } },
        });

        const transaction = await tx.transaction.create({
          data: {
            amount,
            description: "Concurrent stress test transfer",
            type: "TRANSFER",
            status: "COMPLETED",
            debitAccountId: sourceId,
            creditAccountId: destinationId,
          },
        });

        return transaction;
      },
      {
        isolationLevel: "Serializable",
      }
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

describe("Concurrent Transfer Stress Test", () => {
  let source: any;
  let destination: any;
  let user: any;

  beforeAll(async () => {
    const setup = await createTestAccounts();
    user = setup.user;
    source = setup.source;
    destination = setup.destination;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.transaction.deleteMany({
        where: {
          OR: [
            { debitAccountId: source.id },
            { creditAccountId: source.id },
            { debitAccountId: destination.id },
            { creditAccountId: destination.id },
          ],
        },
      });

      await prisma.account.deleteMany({
        where: { userId: user.id },
      });

      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  it(`should handle ${CONCURRENT_TRANSFERS} concurrent transfers without double-spending`, async () => {
    const initialSource = await prisma.account.findUnique({
      where: { id: source.id },
    });

    const initialBalance = Number(initialSource!.balance);

    const transfers = Array.from({ length: CONCURRENT_TRANSFERS }, () =>
      executeTransfer(source.id, destination.id, TRANSFER_AMOUNT)
    );

    const results = await Promise.all(transfers);

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    const finalSource = await prisma.account.findUnique({
      where: { id: source.id },
    });

    const finalDestination = await prisma.account.findUnique({
      where: { id: destination.id },
    });

    const expectedFinalBalance = initialBalance - successful.length * TRANSFER_AMOUNT;

    console.log(`Results: ${successful.length} successful, ${failed.length} failed`);
    console.log(`Source: ${initialBalance} -> ${finalSource!.balance}`);
    console.log(`Destination: 0 -> ${finalDestination!.balance}`);

    expect(Number(finalSource!.balance)).toBe(expectedFinalBalance);

    expect(
      Number(finalDestination!.balance)
    ).toBe(successful.length * TRANSFER_AMOUNT);

    const totalMoney =
      Number(finalSource!.balance) + Number(finalDestination!.balance);
    expect(totalMoney).toBe(initialBalance);

    if (failed.length > 0) {
      console.log("Failed transfers:", failed.map((f) => f.error));
    }
  });

  it("should maintain data integrity under race conditions", async () => {
    const initialSource = await prisma.account.findUnique({
      where: { id: source.id },
    });

    const initialDestination = await prisma.account.findUnique({
      where: { id: destination.id },
    });

    const initialTotal =
      Number(initialSource!.balance) + Number(initialDestination!.balance);

    const transfers = Array.from({ length: 20 }, () =>
      executeTransfer(source.id, destination.id, 1)
    );

    await Promise.all(transfers);

    const finalSource = await prisma.account.findUnique({
      where: { id: source.id },
    });

    const finalDestination = await prisma.account.findUnique({
      where: { id: destination.id },
    });

    const finalTotal =
      Number(finalSource!.balance) + Number(finalDestination!.balance);

    expect(finalTotal).toBe(initialTotal);
  });
});
