import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const API_URL = __ENV.API_URL || "http://localhost:8000";

// Custom metrics
const transferSuccess = new Counter("transfer_success");
const transferFailed = new Counter("transfer_failed");
const insufficientFunds = new Counter("insufficient_funds");
const transferDuration = new Trend("transfer_duration");
const successRate = new Rate("success_rate");

export const options = {
  stages: [
    { duration: "10s", target: 10 }, // ramp up to 10 VUs
    { duration: "30s", target: 50 }, // ramp up to 50 VUs
    { duration: "1m", target: 50 },  // stay at 50 VUs
    { duration: "10s", target: 0 },  // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"], // 95% of requests under 2s
    success_rate: ["rate>0.8"],        // 80% success rate
    transfer_failed: ["count<100"],    // less than 100 failures
  },
};

function getRandomEmail() {
  const id = Math.random().toString(36).substring(2, 10);
  return `loadtest-${id}@example.com`;
}

function getRandomAmount() {
  return Math.floor(Math.random() * 50) + 1; // 1-50
}

export function setup() {
  // Create two test users and accounts
  const user1Email = getRandomEmail();
  const user2Email = getRandomEmail();

  // Register user 1
  const res1 = http.post(
    `${API_URL}/api/users/register`,
    JSON.stringify({
      email: user1Email,
      password: "LoadTest123!pass",
      firstName: "Load",
      lastName: "Test1",
    }),
    { headers: { "Content-Type": "application/json" } }
  );

  check(res1, { "user1 registered": (r) => r.status === 201 });
  const token1 = res1.json("token");

  // Register user 2
  const res2 = http.post(
    `${API_URL}/api/users/register`,
    JSON.stringify({
      email: user2Email,
      password: "LoadTest123!pass",
      firstName: "Load",
      lastName: "Test2",
    }),
    { headers: { "Content-Type": "application/json" } }
  );

  check(res2, { "user2 registered": (r) => r.status === 201 });
  const token2 = res2.json("token");

  // Create accounts for user 1
  const acc1Res = http.post(
    `${API_URL}/api/accounts`,
    JSON.stringify({ name: "Source Checking", type: "CHECKING", currency: "USD" }),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token1}`,
      },
    }
  );
  check(acc1Res, { "acc1 created": (r) => r.status === 201 });
  const acc1Id = acc1Res.json("id");

  // Create accounts for user 2
  const acc2Res = http.post(
    `${API_URL}/api/accounts`,
    JSON.stringify({ name: "Destination Savings", type: "SAVINGS", currency: "USD" }),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token2}`,
      },
    }
  );
  check(acc2Res, { "acc2 created": (r) => r.status === 201 });
  const acc2Id = acc2Res.json("id");

  // Create another account for user 1 to transfer between own accounts
  const acc1bRes = http.post(
    `${API_URL}/api/accounts`,
    JSON.stringify({ name: "Source Savings", type: "SAVINGS", currency: "USD" }),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token1}`,
      },
    }
  );
  check(acc1bRes, { "acc1b created": (r) => r.status === 201 });
  const acc1bId = acc1bRes.json("id");

  // Fund accounts by creating initial transfers from a "faucet"
  // We'll seed with enough balance via multiple transfers
  for (let i = 0; i < 20; i++) {
    http.post(
      `${API_URL}/api/accounts`,
      JSON.stringify({ name: `Faucet ${i}`, type: "CHECKING", currency: "USD" }),
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token1}`,
        },
      }
    );
  }

  return {
    token1,
    token2,
    acc1Id,
    acc2Id,
    acc1bId,
  };
}

export default function (data) {
  const { token1, token2, acc1Id, acc2Id, acc1bId } = data;

  const amount = getRandomAmount();
  const idempotencyKey = `load-${Date.now()}-${__VU}-${__ITER}`;

  // Randomly choose transfer direction
  const scenario = Math.random();

  let fromAccount, toAccount, fromToken;

  if (scenario < 0.5) {
    // User 1 transfers to User 2
    fromAccount = acc1Id;
    toAccount = acc2Id;
    fromToken = token1;
  } else {
    // User 1 transfers to own account
    fromAccount = acc1Id;
    toAccount = acc1bId;
    fromToken = token1;
  }

  const startTime = Date.now();

  const res = http.post(
    `${API_URL}/api/transactions`,
    JSON.stringify({
      amount,
      description: `Load test transfer ${idempotencyKey}`,
      debitAccountId: fromAccount,
      creditAccountId: toAccount,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${fromToken}`,
        "Idempotency-Key": idempotencyKey,
      },
      timeout: "10s",
    }
  );

  const duration = Date.now() - startTime;
  transferDuration.add(duration);

  const success = check(res, {
    "transfer status is 201": (r) => r.status === 201,
    "transfer has id": (r) => r.json("id") !== undefined,
  });

  if (success) {
    transferSuccess.add(1);
    successRate.add(1);
  } else {
    transferFailed.add(1);
    successRate.add(0);

    if (res.status === 400 && res.json("error")?.includes("Insufficient")) {
      insufficientFunds.add(1);
    }
  }

  // Think time between requests
  sleep(Math.random() * 0.5 + 0.1); // 100-600ms
}

export function teardown(data) {
  // Cleanup is handled by database seeding, not per-test teardown
  // In production, you'd clean up test data here
}
