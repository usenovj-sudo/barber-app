"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../src/generated/prisma");
const bcrypt = require("bcrypt");
const prisma = new prisma_1.PrismaClient();
async function main() {
    console.log('Seeding database...');
    const cafe = await prisma.cafe.upsert({
        where: { id: 'seed-cafe-001' },
        update: {},
        create: {
            id: 'seed-cafe-001',
            name: 'Кафе "Арлан"',
            address: 'г. Алматы, ул. Абая 10',
            timezone: 'Asia/Almaty',
        },
    });
    console.log('✓ Cafe created:', cafe.name);
    const passwordHash = await bcrypt.hash('admin123', 12);
    const admin = await prisma.user.upsert({
        where: { email_cafeId: { email: 'admin@arlan.kz', cafeId: cafe.id } },
        update: {},
        create: {
            cafeId: cafe.id,
            role: 'ADMIN',
            name: 'Жанас (Администратор)',
            email: 'admin@arlan.kz',
            passwordHash,
        },
    });
    console.log('✓ Admin user created:', admin.email);
    const cat = await prisma.category.upsert({
        where: { id: 'seed-cat-hot' },
        update: {},
        create: {
            id: 'seed-cat-hot',
            cafeId: cafe.id,
            name: 'Горячие блюда',
            sortOrder: 1,
        },
    });
    const catDrinks = await prisma.category.upsert({
        where: { id: 'seed-cat-drinks' },
        update: {},
        create: {
            id: 'seed-cat-drinks',
            cafeId: cafe.id,
            name: 'Напитки',
            sortOrder: 2,
        },
    });
    console.log('✓ Categories created');
    const ingredients = await Promise.all([
        prisma.ingredient.upsert({
            where: { id: 'seed-ing-rice' },
            update: {},
            create: {
                id: 'seed-ing-rice',
                cafeId: cafe.id,
                name: 'Рис',
                unit: 'kg',
                stockQty: 20,
                pricePerUnit: 350,
                minStockLevel: 5,
            },
        }),
        prisma.ingredient.upsert({
            where: { id: 'seed-ing-lamb' },
            update: {},
            create: {
                id: 'seed-ing-lamb',
                cafeId: cafe.id,
                name: 'Баранина',
                unit: 'kg',
                stockQty: 8,
                pricePerUnit: 3200,
                minStockLevel: 3,
            },
        }),
        prisma.ingredient.upsert({
            where: { id: 'seed-ing-carrot' },
            update: {},
            create: {
                id: 'seed-ing-carrot',
                cafeId: cafe.id,
                name: 'Морковь',
                unit: 'kg',
                stockQty: 15,
                pricePerUnit: 120,
                minStockLevel: 2,
            },
        }),
        prisma.ingredient.upsert({
            where: { id: 'seed-ing-oil' },
            update: {},
            create: {
                id: 'seed-ing-oil',
                cafeId: cafe.id,
                name: 'Масло растительное',
                unit: 'l',
                stockQty: 5,
                pricePerUnit: 800,
                minStockLevel: 1,
            },
        }),
    ]);
    console.log('✓ Ingredients seeded:', ingredients.length);
    const plov = await prisma.dish.upsert({
        where: { id: 'seed-dish-plov' },
        update: {},
        create: {
            id: 'seed-dish-plov',
            cafeId: cafe.id,
            categoryId: cat.id,
            name: 'Плов узбекский',
            description: 'Традиционный плов с бараниной',
            price: 2800,
            section: 'hot',
            isAvailable: true,
        },
    });
    console.log('✓ Dish created:', plov.name);
    const existingRecipe = await prisma.recipe.findFirst({ where: { dishId: plov.id } });
    if (!existingRecipe) {
        await prisma.recipe.create({
            data: {
                dishId: plov.id,
                version: 1,
                isActive: true,
                items: {
                    create: [
                        { ingredientId: 'seed-ing-rice', quantity: 0.3 },
                        { ingredientId: 'seed-ing-lamb', quantity: 0.25 },
                        { ingredientId: 'seed-ing-carrot', quantity: 0.15 },
                        { ingredientId: 'seed-ing-oil', quantity: 0.05 },
                    ],
                },
            },
        });
        console.log('✓ Recipe v1 created for Плов');
    }
    const hall = await prisma.hall.upsert({
        where: { id: 'seed-hall-main' },
        update: {},
        create: { id: 'seed-hall-main', cafeId: cafe.id, name: 'Основной зал' },
    });
    for (let i = 1; i <= 8; i++) {
        await prisma.table.upsert({
            where: { cafeId_number: { cafeId: cafe.id, number: i } },
            update: {},
            create: {
                cafeId: cafe.id,
                hallId: hall.id,
                number: i,
                capacity: i <= 4 ? 4 : 6,
                qrCode: `cafe-arlan-table-${i}`,
            },
        });
    }
    console.log('✓ Hall and 8 tables created');
    console.log('\n✅ Seed complete!');
    console.log('─────────────────────────────────');
    console.log('Cafe ID:      ', cafe.id);
    console.log('Admin login:  ', 'admin@arlan.kz');
    console.log('Password:     ', 'admin123');
    console.log('─────────────────────────────────');
}
main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map