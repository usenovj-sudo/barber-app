"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcrypt = __importStar(require("bcrypt"));
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var cafe, passwordHash, admin, cat, catDrinks, ingredients, plov, existingRecipe, hall, i, supplier, supProducts, _i, supProducts_1, p, supPasswordHash;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('Seeding database...');
                    return [4 /*yield*/, prisma.cafe.upsert({
                            where: { id: 'seed-cafe-001' },
                            update: {},
                            create: {
                                id: 'seed-cafe-001',
                                name: 'Кафе "Арлан"',
                                address: 'г. Алматы, ул. Абая 10',
                                timezone: 'Asia/Almaty',
                            },
                        })];
                case 1:
                    cafe = _a.sent();
                    console.log('✓ Cafe created:', cafe.name);
                    return [4 /*yield*/, bcrypt.hash('admin123', 12)];
                case 2:
                    passwordHash = _a.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email_cafeId: { email: 'admin@arlan.kz', cafeId: cafe.id } },
                            update: {},
                            create: {
                                cafeId: cafe.id,
                                role: 'ADMIN',
                                name: 'Жанас (Администратор)',
                                email: 'admin@arlan.kz',
                                passwordHash: passwordHash,
                            },
                        })];
                case 3:
                    admin = _a.sent();
                    console.log('✓ Admin user created:', admin.email);
                    return [4 /*yield*/, prisma.category.upsert({
                            where: { id: 'seed-cat-hot' },
                            update: {},
                            create: {
                                id: 'seed-cat-hot',
                                cafeId: cafe.id,
                                name: 'Горячие блюда',
                                sortOrder: 1,
                            },
                        })];
                case 4:
                    cat = _a.sent();
                    return [4 /*yield*/, prisma.category.upsert({
                            where: { id: 'seed-cat-drinks' },
                            update: {},
                            create: {
                                id: 'seed-cat-drinks',
                                cafeId: cafe.id,
                                name: 'Напитки',
                                sortOrder: 2,
                            },
                        })];
                case 5:
                    catDrinks = _a.sent();
                    console.log('✓ Categories created');
                    return [4 /*yield*/, Promise.all([
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
                        ])];
                case 6:
                    ingredients = _a.sent();
                    console.log('✓ Ingredients seeded:', ingredients.length);
                    return [4 /*yield*/, prisma.dish.upsert({
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
                        })];
                case 7:
                    plov = _a.sent();
                    console.log('✓ Dish created:', plov.name);
                    return [4 /*yield*/, prisma.recipe.findFirst({ where: { dishId: plov.id } })];
                case 8:
                    existingRecipe = _a.sent();
                    if (!!existingRecipe) return [3 /*break*/, 10];
                    return [4 /*yield*/, prisma.recipe.create({
                            data: {
                                dishId: plov.id,
                                version: 1,
                                isActive: true,
                                items: {
                                    create: [
                                        { ingredientId: 'seed-ing-rice', quantity: 0.3 }, // 300g per portion
                                        { ingredientId: 'seed-ing-lamb', quantity: 0.25 }, // 250g per portion
                                        { ingredientId: 'seed-ing-carrot', quantity: 0.15 }, // 150g per portion
                                        { ingredientId: 'seed-ing-oil', quantity: 0.05 }, // 50ml per portion
                                    ],
                                },
                            },
                        })];
                case 9:
                    _a.sent();
                    console.log('✓ Recipe v1 created for Плов');
                    _a.label = 10;
                case 10: return [4 /*yield*/, prisma.hall.upsert({
                        where: { id: 'seed-hall-main' },
                        update: {},
                        create: { id: 'seed-hall-main', cafeId: cafe.id, name: 'Основной зал' },
                    })];
                case 11:
                    hall = _a.sent();
                    i = 1;
                    _a.label = 12;
                case 12:
                    if (!(i <= 8)) return [3 /*break*/, 15];
                    return [4 /*yield*/, prisma.table.upsert({
                            where: { cafeId_number: { cafeId: cafe.id, number: i } },
                            update: {},
                            create: {
                                cafeId: cafe.id,
                                hallId: hall.id,
                                number: i,
                                capacity: i <= 4 ? 4 : 6,
                                qrCode: "cafe-arlan-table-".concat(i),
                            },
                        })];
                case 13:
                    _a.sent();
                    _a.label = 14;
                case 14:
                    i++;
                    return [3 /*break*/, 12];
                case 15:
                    console.log('✓ Hall and 8 tables created');
                    return [4 /*yield*/, prisma.supplier.upsert({
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
                        })];
                case 16:
                    supplier = _a.sent();
                    return [4 /*yield*/, prisma.cafeSupplier.upsert({
                            where: { cafeId_supplierId: { cafeId: cafe.id, supplierId: supplier.id } },
                            update: {},
                            create: { cafeId: cafe.id, supplierId: supplier.id, isFavorite: true },
                        })];
                case 17:
                    _a.sent();
                    supProducts = [
                        { id: 'sp-rice-agro', name: 'Рис длиннозёрный', unit: 'kg', price: 320, minOrderQty: 10 },
                        { id: 'sp-carrot-agro', name: 'Морковь свежая', unit: 'kg', price: 110, minOrderQty: 10 },
                        { id: 'sp-lamb-agro', name: 'Баранина охл.', unit: 'kg', price: 3100, minOrderQty: 5 },
                    ];
                    _i = 0, supProducts_1 = supProducts;
                    _a.label = 18;
                case 18:
                    if (!(_i < supProducts_1.length)) return [3 /*break*/, 21];
                    p = supProducts_1[_i];
                    return [4 /*yield*/, prisma.supplierProduct.upsert({
                            where: { id: p.id },
                            update: {},
                            create: __assign(__assign({}, p), { supplierId: supplier.id }),
                        })];
                case 19:
                    _a.sent();
                    _a.label = 20;
                case 20:
                    _i++;
                    return [3 /*break*/, 18];
                case 21: return [4 /*yield*/, bcrypt.hash('agro123', 12)];
                case 22:
                    supPasswordHash = _a.sent();
                    return [4 /*yield*/, prisma.supplierUser.upsert({
                            where: { email: 'agro@postavka.kz' },
                            update: {},
                            create: {
                                supplierId: supplier.id,
                                name: 'Менеджер АгроПоставки',
                                email: 'agro@postavka.kz',
                                passwordHash: supPasswordHash,
                            },
                        })];
                case 23:
                    _a.sent();
                    console.log('✓ Supplier + portal login created');
                    console.log('\n✅ Seed complete!');
                    console.log('─────────────────────────────────');
                    console.log('Cafe ID:        ', cafe.id);
                    console.log('Admin login:    ', 'admin@arlan.kz / admin123');
                    console.log('Supplier portal:', 'agro@postavka.kz / agro123');
                    console.log('─────────────────────────────────');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) { console.error(e); process.exit(1); })
    .finally(function () { return prisma.$disconnect(); });
