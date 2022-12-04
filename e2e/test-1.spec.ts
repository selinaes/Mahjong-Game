import { test, expect } from '@playwright/test';


test('test', async ({ page, context }) => {
  await page.goto('http://127.0.0.1:8080/');
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByLabel('Username or email').click();
  await page.getByLabel('Username or email').fill('dennis');
  await page.getByLabel('Password').click();
  await page.getByLabel('Password').fill('1234');
  await page.getByRole('button', { name: 'Sign In' }).click();

  // const page1 = await context.newPage();
  
  // await page1.goto('http://127.0.0.1:8080/');
  // await page1.getByRole('link', { name: 'Logout' }).click();
  // await page1.getByRole('link', { name: 'Login' }).click();
  // await page1.locator('#reset-login').click();
  // await page1.getByLabel('Username or email').click();
  // await page.getByRole('button', { name: 'New Game' }).click();
  // await page1.getByLabel('Username or email').fill('alice');
  // await page1.getByLabel('Password').click();
  // await page1.getByLabel('Password').fill('1234');
  // await page1.getByRole('button', { name: 'Sign In' }).click();
  // const page2 = await context.newPage();
  // await page2.goto('http://127.0.0.1:8080/');
  // await page2.getByRole('link', { name: 'Logout' }).click();
  // await page2.getByRole('link', { name: 'Login' }).click();
  // await page2.locator('#reset-login').click();
  // await page2.getByLabel('Username or email').click();
  // await page2.getByLabel('Username or email').fill('kevin');
  // await page2.getByLabel('Password').click();
  // await page2.getByLabel('Password').fill('1234');
  // await page2.getByRole('button', { name: 'Sign In' }).click();
  // const page3 = await context.newPage();
  // await page3.goto('http://127.0.0.1:8080/');
  // await page3.getByRole('link', { name: 'Logout' }).click();
  // await page3.getByRole('link', { name: 'Login' }).click();
  // await page3.locator('#reset-login').click();
  // await page3.getByLabel('Username or email').click();
  // await page3.getByLabel('Username or email').fill('kate');
  // await page3.getByLabel('Password').click();
  // await page3.getByLabel('Password').fill('1234');
  // await page3.getByRole('button', { name: 'Sign In' }).click();

  // await page.goto('http://127.0.0.1:8080/config');
 
  
});