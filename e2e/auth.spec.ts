import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should register a new user', async ({ page }) => {
    await page.goto('/register')

    // Fill in registration form
    await page.fill('input[name="firstName"]', 'Test')
    await page.fill('input[name="lastName"]', 'User')
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`)
    await page.fill('input[name="password"]', 'SecurePass123!')

    // Submit form
    await page.click('button[type="submit"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/')
  })

  test('should login with existing user', async ({ page }) => {
    await page.goto('/login')

    // Fill in login form
    await page.fill('input[name="email"]', 'alice@example.com')
    await page.fill('input[name="password"]', 'Password123')

    // Submit form
    await page.click('button[type="submit"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/')
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')

    // Fill in login form with wrong password
    await page.fill('input[name="email"]', 'alice@example.com')
    await page.fill('input[name="password"]', 'WrongPassword')

    // Submit form
    await page.click('button[type="submit"]')

    // Should show error message
    await expect(page.locator('text=Invalid email or password')).toBeVisible()
  })
})

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('input[name="email"]', 'alice@example.com')
    await page.fill('input[name="password"]', 'Password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
  })

  test('should display dashboard stats', async ({ page }) => {
    // Check that dashboard elements are visible
    await expect(page.locator('text=Dashboard')).toBeVisible()
    await expect(page.locator('text=Total Balance')).toBeVisible()
  })

  test('should open transfer form', async ({ page }) => {
    // Click transfer button
    await page.click('button:has-text("Transfer")')

    // Should open modal
    await expect(page.locator('text=Transfer Money')).toBeVisible()
  })
})

test.describe('Wallets', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('input[name="email"]', 'alice@example.com')
    await page.fill('input[name="password"]', 'Password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
  })

  test('should display wallets page', async ({ page }) => {
    await page.goto('/wallets')

    // Check that wallets page is visible
    await expect(page.locator('text=Wallets')).toBeVisible()
    await expect(page.locator('text=Create Wallet')).toBeVisible()
  })

  test('should open account creation form', async ({ page }) => {
    await page.goto('/wallets')

    // Click create wallet button
    await page.click('button:has-text("Create Wallet")')

    // Should open modal
    await expect(page.locator('text=New Account')).toBeVisible()
  })
})

test.describe('Transactions', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('input[name="email"]', 'alice@example.com')
    await page.fill('input[name="password"]', 'Password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
  })

  test('should display transactions page', async ({ page }) => {
    await page.goto('/transactions')

    // Check that transactions page is visible
    await expect(page.locator('text=Transactions')).toBeVisible()
  })
})

test.describe('Security', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('input[name="email"]', 'alice@example.com')
    await page.fill('input[name="password"]', 'Password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
  })

  test('should display security page', async ({ page }) => {
    await page.goto('/security')

    // Check that security page is visible
    await expect(page.locator('text=Audit Trail')).toBeVisible()
  })
})

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('input[name="email"]', 'alice@example.com')
    await page.fill('input[name="password"]', 'Password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')
  })

  test('should display settings page', async ({ page }) => {
    await page.goto('/settings')

    // Check that settings page is visible
    await expect(page.locator('text=Settings')).toBeVisible()
    await expect(page.locator('text=Sign out')).toBeVisible()
  })
})
