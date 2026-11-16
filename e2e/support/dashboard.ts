import { expect, type Page } from '@playwright/test';
import { ADMIN, URLS } from './env';

/** Signs in through the login screen. Use once per test file (the API allows 10 logins a minute). */
export async function loginToDashboard(page: Page): Promise<void> {
  await page.goto(`${URLS.dashboard}/login`);
  await page.getByLabel('Email', { exact: true }).fill(ADMIN.email);
  await page.getByLabel('Password', { exact: true }).fill(ADMIN.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
}

export function sidebar(page: Page) {
  return page.getByRole('navigation', { name: 'Main menu' });
}

/** Adds a vehicle through the Vehicles screen. Returns the plate. */
export async function addVehicle(page: Page, plate: string, className?: string): Promise<void> {
  await page.goto(`${URLS.dashboard}/vehicles`);
  await page.getByRole('button', { name: 'Add vehicle' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add vehicle' });
  await expect(dialog).toBeVisible();
  if (className) await dialog.locator('#categoryId').selectOption({ label: className });
  else await dialog.locator('#categoryId').selectOption({ index: 1 });
  await dialog.getByLabel('Make').fill('E2E');
  await dialog.getByLabel('Model').fill('Test car');
  await dialog.getByLabel('Plate').fill(plate);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeHidden();
}

/** Adds a driver through the Drivers screen, with the given vehicle as default. */
export async function addDriver(page: Page, driver: { name: string; email: string; plate: string }): Promise<void> {
  await page.goto(`${URLS.dashboard}/drivers`);
  await page.getByRole('button', { name: 'Add driver' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add driver' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Name', { exact: true }).fill(driver.name);
  await dialog.getByLabel('Email (login)').fill(driver.email);
  await dialog.getByLabel('Password', { exact: true }).fill('e2e-test-password-123');
  await dialog.getByLabel('Work phone').fill('+45 11 22 33 44');
  const option = dialog.locator('#vehicleId option', { hasText: driver.plate });
  const value = await option.getAttribute('value');
  await dialog.locator('#vehicleId').selectOption(value ?? '');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeHidden();
}
