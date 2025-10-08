"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seeding...');
    const hashedPassword = await bcryptjs_1.default.hash('admin123', 12);
    const superAdmin = await prisma.user.upsert({
        where: { email: 'admin@linkmanagement.com' },
        update: {},
        create: {
            email: 'admin@linkmanagement.com',
            password: hashedPassword,
            firstName: 'Super',
            lastName: 'Admin',
            role: client_1.UserRole.SUPER_ADMIN,
        },
    });
    const admin = await prisma.user.upsert({
        where: { email: 'user@linkmanagement.com' },
        update: {},
        create: {
            email: 'user@linkmanagement.com',
            password: hashedPassword,
            firstName: 'John',
            lastName: 'Admin',
            role: client_1.UserRole.ADMIN,
        },
    });
    console.log('✅ Users created');
    const client1 = await prisma.client.create({
        data: {
            name: 'TechCorp Inc.',
            email: 'billing@techcorp.com',
            phone: '+1-555-0123',
            address: '123 Tech Street, Silicon Valley, CA 94000',
            billingEmail: 'accounting@techcorp.com',
            currency: client_1.Currency.USD,
            createdById: admin.id,
        },
    });
    const client2 = await prisma.client.create({
        data: {
            name: 'Digital Marketing Agency',
            email: 'contact@dmagency.com',
            phone: '+1-555-0456',
            address: '456 Marketing Ave, New York, NY 10001',
            billingEmail: 'finance@dmagency.com',
            currency: client_1.Currency.USD,
            createdById: admin.id,
        },
    });
    console.log('✅ Clients created');
    const project1 = await prisma.project.create({
        data: {
            name: 'TechCorp SEO Campaign Q1',
            description: 'Link building campaign for tech products',
            minDomainRating: 30,
            minMonthlyTraffic: 5000,
            budgetCap: 10000.00,
            anchorDistribution: {
                exactMatch: 25,
                partialMatch: 35,
                branded: 25,
                generic: 15
            },
            blacklistedDomains: ['spamsite.com', 'lowquality.net'],
            whitelistedDomains: ['techcrunch.com', 'wired.com'],
            clientId: client1.id,
            createdById: admin.id,
        },
    });
    const project2 = await prisma.project.create({
        data: {
            name: 'DMA Content Marketing',
            description: 'Guest post campaign for digital marketing',
            minDomainRating: 25,
            minMonthlyTraffic: 2000,
            budgetCap: 5000.00,
            anchorDistribution: {
                exactMatch: 30,
                partialMatch: 40,
                branded: 20,
                generic: 10
            },
            clientId: client2.id,
            createdById: admin.id,
        },
    });
    console.log('✅ Projects created');
    const publisher1 = await prisma.publisher.create({
        data: {
            name: 'Tech Blog Network',
            email: 'editor@techblognetwork.com',
            phone: '+1-555-0789',
            website: 'https://techblognetwork.com',
            paymentInfo: {
                method: 'PayPal',
                email: 'payments@techblognetwork.com'
            },
            createdById: admin.id,
        },
    });
    const publisher2 = await prisma.publisher.create({
        data: {
            name: 'Marketing Insights Hub',
            email: 'content@marketinginsights.com',
            phone: '+1-555-0321',
            website: 'https://marketinginsights.com',
            paymentInfo: {
                method: 'Bank Transfer',
                accountNumber: '****1234',
                routingNumber: '****5678'
            },
            createdById: admin.id,
        },
    });
    console.log('✅ Publishers created');
    const site1 = await prisma.site.create({
        data: {
            domain: 'techblognetwork.com',
            domainRating: 45,
            monthlyTraffic: 25000,
            category: 'Technology',
            language: 'en',
            country: 'US',
            turnaroundTime: 7,
            clientPrice: 350.00,
            internalCost: 200.00,
            publisherId: publisher1.id,
        },
    });
    const site2 = await prisma.site.create({
        data: {
            domain: 'marketinginsights.com',
            domainRating: 38,
            monthlyTraffic: 15000,
            category: 'Marketing',
            language: 'en',
            country: 'US',
            turnaroundTime: 5,
            clientPrice: 280.00,
            internalCost: 150.00,
            publisherId: publisher2.id,
        },
    });
    const site3 = await prisma.site.create({
        data: {
            domain: 'techreviews.net',
            domainRating: 52,
            monthlyTraffic: 45000,
            category: 'Technology',
            language: 'en',
            country: 'US',
            turnaroundTime: 10,
            clientPrice: 450.00,
            internalCost: 280.00,
            publisherId: publisher1.id,
        },
    });
    console.log('✅ Sites created');
    const order1 = await prisma.order.create({
        data: {
            orderNumber: 'ORD-2024-001',
            totalAmount: 350.00,
            totalCost: 200.00,
            targetUrl: 'https://techcorp.com/products/ai-platform',
            anchorText: 'AI platform solution',
            anchorType: client_1.AnchorType.PARTIAL_MATCH,
            deadline: new Date('2024-02-15'),
            notes: 'Focus on AI and machine learning benefits',
            projectId: project1.id,
            createdById: admin.id,
        },
    });
    const orderSite1 = await prisma.orderSite.create({
        data: {
            price: 350.00,
            cost: 200.00,
            orderId: order1.id,
            siteId: site1.id,
        },
    });
    await prisma.content.create({
        data: {
            brief: 'Write a comprehensive article about AI platforms in business, highlighting the benefits and implementation strategies. Include a natural mention of TechCorp\'s AI platform.',
            wordCount: 1500,
            orderId: order1.id,
        },
    });
    console.log('✅ Orders and content created');
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
    console.log('Super Admin: admin@linkmanagement.com / admin123');
    console.log('Admin: user@linkmanagement.com / admin123');
}
main()
    .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map