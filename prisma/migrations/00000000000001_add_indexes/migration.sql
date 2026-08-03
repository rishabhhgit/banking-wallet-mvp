-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE INDEX "transactions_debitAccountId_idx" ON "transactions"("debitAccountId");

-- CreateIndex
CREATE INDEX "transactions_creditAccountId_idx" ON "transactions"("creditAccountId");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt");

-- CreateIndex
CREATE INDEX "transactions_idempotencyKey_idx" ON "transactions"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_idempotencyKey_key" ON "transactions"("idempotencyKey");
