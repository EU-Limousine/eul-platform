import { expect, test, type Page } from '@playwright/test';
import { addDriver, addVehicle, loginToDashboard, sidebar } from '../support/dashboard';
import { URLS, uniqueId } from '../support/env';

/**
 * Dashboard shell and screens. One login for the whole file: the tests share one signed-in page
 * and run in order.
 */
test.describe.configure({ mode: 'serial' });

let page: Page;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  await loginToDashboard(page);
});

test.afterAll(async () => {
  await page.close();
});

test('overview shows KPIs, quick access and charts', async () => {
  await page.goto(`${URLS.dashboard}/`);
  await expect(page.getByText('Bookings (7 days)')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Quick access' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bookings overview' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Vehicle status' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Driver status' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recent bookings' })).toBeVisible();
  await expect(page.getByText('Arrives with the driver app')).toBeVisible();
});

for (const [link, heading, path] of [
  ['Bookings', 'Bookings', '/bookings'],
  ['Drivers', 'Drivers', '/drivers'],
  ['Vehicles', 'Vehicles', '/vehicles'],
  ['Pricing', 'Pricing', '/pricing'],
  ['Spare drivers', 'Spare drivers', '/spares'],
  ['Dashboard', 'Dashboard', '/'],
] as const) {
  test(`sidebar opens ${link}`, async () => {
    await sidebar(page).getByRole('link', { name: link, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path === '/' ? '/$' : path}`));
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
  });
}

test('dark theme switches on, survives a reload, and switches off', async () => {
  await page.getByRole('banner').getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  await page.getByRole('banner').getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
});

test('Ctrl+K search jumps to a screen', async () => {
  await page.keyboard.press('Control+k');
  const input = page.getByPlaceholder('Type a screen or action…');
  await expect(input).toBeVisible();
  await input.fill('Vehicles');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/vehicles/);
});

test('the bell lists bookings to handle', async () => {
  await page.getByRole('button', { name: /^Alerts/ }).click();
  await expect(page.getByRole('menuitem', { name: /Needs attention/ })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: /Waiting for a chauffeur/ })).toBeVisible();
  await page.getByRole('menuitem', { name: /Needs attention/ }).click();
  await expect(page).toHaveURL(/\/bookings\?.*tab=attention/);
});

test('the sidebar collapses to icons and expands again', async () => {
  await page.getByRole('button', { name: 'Collapse or expand the menu' }).click();
  await expect(sidebar(page).getByText('Bookings', { exact: true })).toBeHidden();
  await expect(sidebar(page).getByRole('link', { name: 'Bookings' })).toBeVisible(); // icon keeps its name
  await page.getByRole('button', { name: 'Collapse or expand the menu' }).click();
  await expect(sidebar(page).getByText('Bookings', { exact: true })).toBeVisible();
});

test('quick access "Add driver" opens the add form directly', async () => {
  await page.goto(`${URLS.dashboard}/`);
  await page.getByRole('main').getByRole('link', { name: 'Add driver' }).click();
  await expect(page.getByRole('dialog', { name: 'Add driver' })).toBeVisible();
  await expect(page).not.toHaveURL(/new=/); // URL cleaned after opening
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('add a vehicle and find it by plate', async () => {
  const plate = `E2E ${uniqueId().slice(-6)}`;
  await addVehicle(page, plate);
  await page.getByPlaceholder('Plate, make or model').fill(plate);
  await expect(page.getByText(plate).first()).toBeVisible();
});

test('vehicle form refuses empty fields', async () => {
  await page.goto(`${URLS.dashboard}/vehicles`);
  await page.getByRole('button', { name: 'Add vehicle' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('dialog', { name: 'Add vehicle' })).toBeVisible(); // still open
  await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
});

test('add a driver with a default vehicle and find them', async () => {
  const id = uniqueId();
  const plate = `E2E ${id.slice(-6)}`;
  await addVehicle(page, plate);
  const name = `E2E Driver ${id}`;
  await addDriver(page, { name, email: `e2e-driver-${id.toLowerCase()}@example.com`, plate });
  await page.getByPlaceholder('Name, email or phone').fill(name);
  await expect(page.getByText(name).first()).toBeVisible();
});

test('pricing shows the price rules with currency', async () => {
  await page.goto(`${URLS.dashboard}/pricing`);
  await expect(page.getByRole('heading', { name: 'Pricing', level: 1 })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'EUR', exact: true }).first()).toBeVisible();
});

test('bookings filters by status tab', async () => {
  await page.goto(`${URLS.dashboard}/bookings`);
  await page.getByRole('tab', { name: 'Unassigned' }).click();
  await expect(page).toHaveURL(/tab=unassigned/);
  await page.getByRole('tab', { name: 'All' }).click();
});

test('on a phone-sized window the menu opens as a panel', async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${URLS.dashboard}/`);
  await page.getByRole('button', { name: 'Open menu' }).click();
  const panel = page.getByRole('dialog');
  await expect(panel).toBeVisible();
  await panel.getByRole('link', { name: 'Drivers' }).click();
  await expect(page).toHaveURL(/\/drivers/);
  await expect(panel).toBeHidden(); // closes after navigating
  await page.setViewportSize({ width: 1280, height: 800 });
});
