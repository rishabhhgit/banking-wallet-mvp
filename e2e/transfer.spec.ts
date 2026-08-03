import { test, expect } from '@playwright/test'

test.describe('Transfer Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('input[name="email"]', 'alice@example.com')
    await page.fill('input[name="password"]', 'Password123!')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
  })

  test('should complete a transfer flow', async ({ page }) => {
    // Navigate to wallets
    await page.goto('/wallets')

    // Wait for accounts to load
    await expect(page.locator('text=Source Account')).toBeVisible()

    // Click transfer on first account
    const transferButton = page.locator('button:has-text("Transfer")').first()
    await transferButton.click()

    // Fill in transfer form
    await expect(page.locator('text=Transfer Money')).toBeVisible()

    // Select source account (should be pre-selected)
    // Select destination account
    await page.selectOption('select:nth-of-type(2)', { index: 1 })

    // Enter amount
    await page.fill('input[type="number"]', '10')

    // Enter description
    await page.fill('input[type="text"]', 'E2E test transfer')

    // Submit transfer
    await page.click('button:has-text("Send Money")')

    // Should close modal and show success
    await expect(page.locator('text=Transfer Money')).not.toBeVisible()
  })

  test('should validate transfer form', async ({ page }) => {
    // Navigate to wallets
    await page.goto('/wallets')

    // Wait for accounts to load
    await expect(page.locator('text=Source Account')).toBeVisible()

    // Click transfer on first account
    const transferButton = page.locator('button:has-text("Transfer")').first()
    await transferButton.click()

    // Try to submit without filling form
    await page.click('button:has-text("Send Money")')

    // Should show validation errors
    await expect(page.locator('text=Transfer Money')).toBeVisible()
  })
})

test.describe('Account Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('input[name="email"]', 'alice@example.com')
    await page.fill('input[name="password"]', 'Password123!')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
  })

  test('should create a new account', async ({ page }) => {
    // Navigate to wallets
    await page.goto('/wallets')

    // Click create wallet
    await page.click('button:has-text("Create Wallet")')

    // Fill in account form
    await expect(page.locator('text=New Account')).toBeVisible()

    await page.fill('input[type="text"]', 'My New Account')

    // Submit form
    await page.click('button:has-text("Create Account")')

    // Should close modal
    await expect(page.locator('text=New Account')).not.toBeVisible()
  })
})

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('input[name="email"]', 'alice@example.com')
    await page.fill('input[name="password"]', 'Password123!')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
  })

  test('should navigate between pages', async ({ page }) => {
    // Navigate to each page
    await page.click('a[href="/wallets"]')
    await expect(page).toHaveURL('/wallets')

    await page.click('a[href="/transactions"]')
    await expect(page).toHaveURL('/transactions')

    await page.click('a[href="/users"]')
    await expect(page).toHaveURL('/users')

    await page.click('a[href="/security"]')
    await expect(page).toHaveURL('/security')

    await page.click('a[href="/settings"]')
    await expect(page).toHaveURL('/settings')

    await page.click('a[href="/"]')
    await expect(page).toHaveURL('/')
  })
})
