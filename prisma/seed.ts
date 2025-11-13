console.log("starting seed file")

import { PrismaClient } from "./app/generated/prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();



async function main() {
    console.log("🌱 Seeding AFF Database...");

    // 1️⃣ Create 10 users
    const users = [];
    for (let i = 0; i < 10; i++) {
        const user = await prisma.user.create({
            data: {
                first_name: faker.person.firstName(),
                last_name: faker.person.lastName(),
                email: faker.internet.email(),
                password_hash: faker.internet.password(),
                phone_number: faker.phone.number(),
                role: faker.helpers.arrayElement(["DESIGNER", "TAILOR"]),
                bio: faker.person.bio(),
                avatar_url: faker.image.avatar(),
                rating: faker.number.float({ min: 3, max: 5 }),
                country: faker.location.country(),
                city: faker.location.city(),
                display_name: faker.internet.username(),
                is_active: true,
                is_verified: faker.datatype.boolean(),
            },
        });
        users.push(user);
        console.log("seeded users", user)
    }

    // 2️⃣ Create Designs for each user
    for (const user of users) {
        const design = await prisma.design.create({
            data: {
                user_id: user.id,
                title: faker.commerce.productName(),
                garment_type: faker.helpers.arrayElement(["shirt", "dress", "trousers", "skirt"]),
                pattern_data: { pattern: faker.lorem.word(), scale: faker.number.int({ min: 1, max: 3 }) },
                fabric_texture: faker.helpers.arrayElement(["denim", "ankara", "cotton", "silk"]),
                export_png_url: faker.image.url(),
                export_svg_url: faker.image.url(),
                export_json_url: faker.internet.url(),
                is_public: faker.datatype.boolean(),
            },
        });

        // 3️⃣ Create a Project
        const project = await prisma.project.create({
            data: {
                designer_id: user.id,
                design_id: design.id,
                title: `${faker.commerce.productAdjective()} ${design.garment_type}`,
                description: faker.commerce.productDescription(),
                budget: faker.number.float({ min: 50, max: 500 }),
                status: faker.helpers.arrayElement(["OPEN", "IN_PROGRESS", "COMPLETED"]),
                deadline: faker.date.future(),
            },
        });

        // 4️⃣ Add Project Requirements
        await prisma.projectRequirement.create({
            data: {
                project_id: project.id,
                content: { materials: faker.commerce.productMaterial(), details: faker.lorem.sentence() },
                designer_approved: faker.datatype.boolean(),
                tailor_approved: faker.datatype.boolean(),
            },
        });

        // 5️⃣ Tailor Bids
        const tailor = faker.helpers.arrayElement(users.filter(u => u.id !== user.id));
        const bid = await prisma.bid.create({
            data: {
                project_id: project.id,
                tailor_id: tailor.id,
                amount: faker.number.float({ min: 30, max: 300 }),
                duration: `${faker.number.int({ min: 3, max: 14 })} days`,
                message: faker.lorem.sentence(),
                status: faker.helpers.arrayElement(["PENDING", "APPROVED", "REJECTED"]),
            },
        });

        // 6️⃣ Orders
        const order = await prisma.order.create({
            data: {
                buyer_id: user.id,
                seller_id: tailor.id,
                project_id: project.id,
                amount: bid.amount,
                commission: Number(bid.amount) * 0.1,
                status: faker.helpers.arrayElement(["PENDING", "ACTIVE", "COMPLETED"]),
            },
        });

        // 7️⃣ Escrows
        const escrow = await prisma.escrow.create({
            data: {
                buyer_id: user.id,
                seller_id: tailor.id,
                order_id: order.id,
                gateway: faker.helpers.arrayElement(["PAYSTACK", "FLUTTERWAVE"]),
                amount: order.amount,
                commission: order.commission,
                escrow_status: faker.helpers.arrayElement(["PENDING", "RELEASED", "REFUNDED"]),
                payment_ref: faker.string.uuid(),
            },
        });

        // 8️⃣ Transactions
        await prisma.transaction.create({
            data: {
                user_id: user.id,
                order_id: order.id,
                escrow_id: escrow.id,
                amount: escrow.amount,
                currency: "NGN",
                status: faker.helpers.arrayElement(["SUCCESS", "FAILED", "PENDING"]),
                payment_gateway: escrow.gateway,
                reference: faker.string.uuid(),
                transaction_type: faker.helpers.arrayElement(["CREDIT", "DEBIT"]),
            },
        });

        // 9️⃣ Products
        const product = await prisma.product.create({
            data: {
                product_name: faker.commerce.productName(),
                product_description: faker.commerce.productDescription(),
                product_type: faker.helpers.arrayElement(["top", "bottom", "dress"]),
                price: faker.number.float({ min: 20, max: 250 }),
                user_id: user.id,
            },
        });

        await prisma.productImage.create({
            data: {
                product_id: product.id,
                image_url: faker.image.url(),
                is_primary: true,
            },
        });

        // 🔟 Notifications
        await prisma.notification.create({
            data: {
                user_id: user.id,
                title: "Welcome to AFF!",
                message: `Hi ${user.first_name}, start designing your next masterpiece!`,
                type: "WELCOME",
                data: { role: user.role },
            },
        });

        // 🧰 Support Tickets
        await prisma.supportTicket.create({
            data: {
                user_id: user.id,
                order_id: order.id,
                subject: "Fabric texture issue",
                description: "The selected pattern didn’t render properly.",
                status: faker.helpers.arrayElement(["OPEN", "RESOLVED"]),
            },
        });
    }

    console.log("✅ Seeding complete!");
}

main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
