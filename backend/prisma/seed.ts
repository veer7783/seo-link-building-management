import { PrismaClient, $Enums } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create Super Admin user
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: {},
    create: {
      email: 'superadmin@example.com',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: $Enums.UserRole.SUPER_ADMIN,
    },
  });

  // Create Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Admin',
      role: $Enums.UserRole.ADMIN,
    },
  });

  console.log('✅ Users created');

  // Create sample clients (idempotent)
  const existingClient1 = await prisma.client.findFirst({
    where: { email: 'billing@techcorp.com', name: 'TechCorp Inc.' },
  });
  const client1 = existingClient1 ?? await prisma.client.create({
    data: {
      name: 'TechCorp Inc.',
      email: 'billing@techcorp.com',
      address: '123 Tech Street, Silicon Valley, CA 94000',
      billingEmail: 'accounting@techcorp.com',
      currency: $Enums.Currency.USD,
      createdById: admin.id,
    },
  });

  const existingClient2 = await prisma.client.findFirst({
    where: { email: 'contact@dmagency.com', name: 'Digital Marketing Agency' },
  });
  const client2 = existingClient2 ?? await prisma.client.create({
    data: {
      name: 'Digital Marketing Agency',
      email: 'contact@dmagency.com',
      address: '456 Marketing Ave, New York, NY 10001',
      billingEmail: 'finance@dmagency.com',
      currency: $Enums.Currency.USD,
      createdById: admin.id,
    },
  });

  console.log('✅ Clients created');

  // Create sample projects (simplified schema)
  const existingProject1 = await prisma.project.findFirst({ where: { projectName: 'TechCorp SEO Campaign Q1', clientId: client1.id } });
  const project1 = existingProject1 ?? await prisma.project.create({
    data: {
      projectName: 'TechCorp SEO Campaign Q1',
      websiteUrl: 'https://techcorp.com',
      companyName: 'TechCorp Inc.',
      clientId: client1.id,
      createdById: admin.id,
    },
  });

  const existingProject2 = await prisma.project.findFirst({ where: { projectName: 'DMA Content Marketing', clientId: client2.id } });
  const project2 = existingProject2 ?? await prisma.project.create({
    data: {
      projectName: 'DMA Content Marketing',
      websiteUrl: 'https://dmagency.com',
      companyName: 'Digital Marketing Agency',
      clientId: client2.id,
      createdById: admin.id,
    },
  });

  console.log('✅ Projects created');

  // Create sample publishers (temporarily disabled due to schema update)
  console.log('⚠️ Publisher seeding temporarily disabled - will be fixed after Prisma client regeneration');
  
  // Placeholder publishers for now
  const publisher1 = { id: 'temp-publisher-1' };
  const publisher2 = { id: 'temp-publisher-2' };
  
  /*
  const existingPublisher1 = await prisma.publisher.findFirst({ where: { publisherName: 'Tech Blog Network' } });
  const publisher1 = existingPublisher1 ?? await prisma.publisher.create({
    data: {
      publisherName: 'Tech Blog Network',
      email: 'editor@techblognetwork.com',
      whatsapp: '+1-555-0789',
      modeOfCommunication: 'EMAIL',
      createdById: admin.id,
    },
  });

  const existingPublisher2 = await prisma.publisher.findFirst({ where: { publisherName: 'Marketing Insights Hub' } });
  const publisher2 = existingPublisher2 ?? await prisma.publisher.create({
    data: {
      publisherName: 'Marketing Insights Hub',
      email: 'content@marketinginsights.com',
      whatsapp: '+1-555-0321',
      modeOfCommunication: 'WHATSAPP',
      createdById: admin.id,
    },
  });
  */

  console.log('✅ Publishers created');

  // Skip sites creation for now due to missing publishers
  console.log('⚠️ Sites creation skipped - will be added after publishers are properly seeded');

  // Skip orders creation for now due to missing sites
  console.log('⚠️ Orders creation skipped - will be added after sites are properly seeded');

  // Create system settings
  const settings = [
    { key: 'LINK_CHECK_INTERVAL_HOURS', value: '24' },
    { key: 'BUDGET_WARNING_THRESHOLD', value: '0.8' },
    { key: 'DEFAULT_CURRENCY', value: 'USD' },
    { key: 'MAX_ANCHOR_EXACT_MATCH_PERCENT', value: '30' },
    { key: 'EMAIL_NOTIFICATIONS_ENABLED', value: 'true' },
    { key: 'SLACK_NOTIFICATIONS_ENABLED', value: 'false' },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  console.log('✅ System settings created');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Default login credentials:');
  console.log('Super Admin: superadmin@example.com / password123');
  console.log('Admin: admin@example.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
