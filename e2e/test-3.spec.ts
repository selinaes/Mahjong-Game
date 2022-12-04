import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://127.0.0.1:8080/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByLabel('Username or email').click();
  await page.getByLabel('Username or email').fill('dennis');
  await page.getByLabel('Password').click();
  await page.getByLabel('Password').fill('1234');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('button', { name: 'Config' }).click();
  await page.locator('[id="__BVID__21"]').click();
  await page.locator('[id="__BVID__21"]').fill('23');
  
  await page.getByRole('button', { name: 'Go Back' }).click();
});