import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create a test cafe
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

  // 2. Create admin user  (password: admin123)
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

  // 3. Seed ingredient categories
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

  // 4. Seed ingredients
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

  // 5. Seed a dish
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

  // 6. Seed recipe for the dish (version 1)
  const existingRecipe = await prisma.recipe.findFirst({ where: { dishId: plov.id } });
  if (!existingRecipe) {
    await prisma.recipe.create({
      data: {
        dishId: plov.id,
        version: 1,
        isActive: true,
        items: {
          create: [
            { ingredientId: 'seed-ing-rice',   quantity: 0.3  },  // 300g per portion
            { ingredientId: 'seed-ing-lamb',   quantity: 0.25 },  // 250g per portion
            { ingredientId: 'seed-ing-carrot', quantity: 0.15 },  // 150g per portion
            { ingredientId: 'seed-ing-oil',    quantity: 0.05 },  // 50ml per portion
          ],
        },
      },
    });
    console.log('✓ Recipe v1 created for Плов');
  }

  // 7. Create hall and tables with QR codes
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

  // 8. Seed a supplier + B2B portal login + catalogue, linked to the cafe
  const supplier = await prisma.supplier.upsert({
    where: { id: 'sup-agro-001' },
    update: {},
    create: {
      id: 'sup-agro-001',
      name: 'АгроПоставка',
      contactInfo: '+7 727 111-22-33',
      region: 'Алматы',
      rating: 4.7,
      reviewCount: 3,
    },
  });

  await prisma.cafeSupplier.upsert({
    where: { cafeId_supplierId: { cafeId: cafe.id, supplierId: supplier.id } },
    update: {},
    create: { cafeId: cafe.id, supplierId: supplier.id, isFavorite: true },
  });

  const supProducts = [
    { id: 'sp-rice-agro', name: 'Рис длиннозёрный', unit: 'kg', price: 320, minOrderQty: 10 },
    { id: 'sp-carrot-agro', name: 'Морковь свежая', unit: 'kg', price: 110, minOrderQty: 10 },
    { id: 'sp-lamb-agro', name: 'Баранина охл.', unit: 'kg', price: 3100, minOrderQty: 5 },
  ];
  for (const p of supProducts) {
    await prisma.supplierProduct.upsert({
      where: { id: p.id },
      update: {},
      create: { ...p, supplierId: supplier.id },
    });
  }

  // Link cafe ingredients to this supplier's products so the AI agent can
  // actually pick a supplier (and its minOrderQty) when it plans a purchase.
  const ingredientLinks = [
    { ingredientId: 'seed-ing-rice', supplierProductId: 'sp-rice-agro' },
    { ingredientId: 'seed-ing-carrot', supplierProductId: 'sp-carrot-agro' },
    { ingredientId: 'seed-ing-lamb', supplierProductId: 'sp-lamb-agro' },
  ];
  for (const link of ingredientLinks) {
    await prisma.supplierIngredientLink.upsert({
      where: {
        cafeId_ingredientId_supplierProductId: {
          cafeId: cafe.id,
          ingredientId: link.ingredientId,
          supplierProductId: link.supplierProductId,
        },
      },
      update: {},
      create: {
        cafeId: cafe.id,
        ingredientId: link.ingredientId,
        supplierId: supplier.id,
        supplierProductId: link.supplierProductId,
        isVerified: true,
      },
    });
  }
  console.log('✓ Ingredient↔supplier links created');

  const supPasswordHash = await bcrypt.hash('agro123', 12);
  await prisma.supplierUser.upsert({
    where: { email: 'agro@postavka.kz' },
    update: {},
    create: {
      supplierId: supplier.id,
      name: 'Менеджер АгроПоставки',
      email: 'agro@postavka.kz',
      passwordHash: supPasswordHash,
    },
  });
  console.log('✓ Supplier + portal login created');

  console.log('\n✅ Seed complete!');
  console.log('─────────────────────────────────');
  console.log('Cafe ID:        ', cafe.id);
  console.log('Admin login:    ', 'admin@arlan.kz / admin123');
  console.log('Supplier portal:', 'agro@postavka.kz / agro123');
  console.log('─────────────────────────────────');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
