import { expect, test } from '@playwright/test';
import { addDriver, addVehicle, loginToDashboard } from '../support/dashboard';
import { URLS, uniqueId } from '../support/env';
import { expectEmail } from '../support/mailpit';
import { bookUntilPayment, payAndGetReference } from '../support/website';

/**
 * The whole business flow across both apps:
 * customer books and pays on the website → dispatcher sees it → assigns a chauffeur →
 * customer gets the "chauffeur" email, and a second assignment is refused.
 */
test('booking on the website is dispatched from the dashboard', async ({ browser, request }) => {
  test.setTimeout(150_000);
  const id = uniqueId();

  // 1. Customer books on the website.
  const customer = await browser.newPage();
  const className = await bookUntilPayment(customer, { name: `E2E Flow ${id}`, email: `e2e-flow-${id.toLowerCase()}@example.com` });
  const reference = await payAndGetReference(customer);
  await customer.close();
  await expectEmail(request, reference, 'booking received');

  // 2. Dispatcher signs in and prepares a vehicle of the booked class + a driver.
  const dispatcher = await browser.newPage();
  await loginToDashboard(dispatcher);
  const plate = `E2E ${id.slice(-6)}`;
  const driverName = `E2E Chauffeur ${id}`;
  await addVehicle(dispatcher, plate, className);
  await addDriver(dispatcher, { name: driverName, email: `e2e-chauffeur-${id.toLowerCase()}@example.com`, plate });

  // 3. The new booking is in the list as unassigned.
  await dispatcher.goto(`${URLS.dashboard}/bookings?tab=unassigned&q=${reference}`);
  const link = dispatcher.getByRole('link', { name: reference });
  await expect(link).toBeVisible();
  await link.click();
  await expect(dispatcher.getByRole('heading', { name: new RegExp(reference) })).toBeVisible();
  await expect(dispatcher.getByText('No chauffeur assigned yet.')).toBeVisible();

  // 4. Assign the chauffeur.
  await dispatcher.getByRole('button', { name: 'Assign chauffeur' }).click();
  const dialog = dispatcher.getByRole('dialog', { name: 'Assign chauffeur' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('radio', { name: new RegExp(driverName) }).check();
  await dialog.getByRole('button', { name: 'Assign', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(dispatcher.getByText(driverName).first()).toBeVisible();
  await expect(dispatcher.getByRole('button', { name: 'Assign chauffeur' })).toBeHidden(); // no longer assignable

  // 5. It shows on the overview and in recent activity.
  await dispatcher.goto(`${URLS.dashboard}/`);
  await expect(dispatcher.getByRole('link', { name: reference })).toBeVisible();
  await expect(dispatcher.getByText('Chauffeur assigned').first()).toBeVisible();

  // 6. Customer receives the "your chauffeur" email.
  await expectEmail(request, reference, 'confirmed');
  await dispatcher.close();
});
