/**
 * Seed: first SUPER_ADMIN, vehicle categories, demo pricing, dispatch settings.
 *
 * Vehicle categories and prices come from denmark_limousine_fleet_data.xlsx and are
 * marked isConfirmed = false until management answers D-09 (fleet) and D-06 (pricing).
 * Safe to run many times (upserts).
 */
import argon2 from 'argon2';
import { createPrismaClient, Currency, StaffRole } from '../src/index.js';

const prisma = createPrismaClient();

// Source: fleet spreadsheet. Unconfirmed demo data (D-09). "Starting Price" in EUR → base fare.
const categories = [
  { code: 'ELECTRIC', name: 'Electric car', exampleModel: 'Mercedes EQE', maxPassengers: 3, luggageNote: '3 bags', startingEur: 120 },
  { code: 'BUSINESS', name: 'Business Class', exampleModel: 'Mercedes E-Class', maxPassengers: 3, luggageNote: '3 bags', startingEur: 120 },
  { code: 'FIRST', name: 'First Class', exampleModel: 'Mercedes S-Class', maxPassengers: 2, luggageNote: '2 bags', startingEur: 135 },
  { code: 'PREMIUM_ELECTRIC_VAN', name: 'Premium Electric Van', exampleModel: 'Mercedes V-Class', maxPassengers: 7, luggageNote: '6 luggage + 5 small luggage', startingEur: 140 },
  { code: 'PREMIUM_MINIVAN', name: 'Premium Minivan', exampleModel: 'Mercedes V-Class', maxPassengers: 7, luggageNote: '6 luggage + 5 small luggage', startingEur: 140 },
  { code: 'GROUP_SHUTTLE', name: 'Group Shuttle', exampleModel: 'Mercedes Sprinter', maxPassengers: 16, luggageNote: 'Small bags capacity', startingEur: 270 },
  { code: 'LUXURY_COACH', name: 'Luxury Coach', exampleModel: 'Mercedes Coach', maxPassengers: 50, luggageNote: 'Large luggage capacity', startingEur: null },
] as const;

async function seedAdmin(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env');
  if (password.length < 12) throw new Error('SEED_ADMIN_PASSWORD must be at least 12 characters');

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: 'Super Admin', passwordHash: await argon2.hash(password) },
  });
  await prisma.userRole.upsert({
    where: { userId_role: { userId: user.id, role: StaffRole.SUPER_ADMIN } },
    update: {},
    create: { userId: user.id, role: StaffRole.SUPER_ADMIN },
  });
  console.log(`Super admin ready: ${email}`);
}

async function seedFleet(): Promise<void> {
  for (const [index, c] of categories.entries()) {
    const category = await prisma.vehicleCategory.upsert({
      where: { code: c.code },
      update: {},
      create: {
        code: c.code,
        name: c.name,
        exampleModel: c.exampleModel,
        maxPassengers: c.maxPassengers,
        luggageNote: c.luggageNote,
        sortOrder: index,
        isConfirmed: false,
      },
    });
    if (c.startingEur !== null) {
      await prisma.pricingRule.upsert({
        where: { categoryId_currency: { categoryId: category.id, currency: Currency.EUR } },
        update: {},
        create: {
          categoryId: category.id,
          currency: Currency.EUR,
          baseFareMinor: c.startingEur * 100,
          minimumFareMinor: c.startingEur * 100,
          perKmMinor: 0, // TODO(decision D-06): pricing model not decided
          isConfirmed: false,
        },
      });
    }
  }
  console.log(`Vehicle categories: ${categories.length} (unconfirmed, D-09)`);
}

async function seedDispatchSettings(): Promise<void> {
  await prisma.dispatchSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  console.log('Dispatch settings ready (placeholder values, D-03/D-04/D-22)');
}

async function main(): Promise<void> {
  await seedAdmin();
  await seedFleet();
  await seedDispatchSettings();
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
