const bcrypt = require("bcrypt");
const { PrismaClient, PlatformRole, ComponentType } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  // Super Admin

  const passwordHash = await bcrypt.hash("Admin@123", 10);

  await prisma.platformUser.upsert({
    where: {
      email: "admin@his.com",
    },
    update: {},
    create: {
      email: "admin@his.com",
      passwordHash,
      role: PlatformRole.SUPER_ADMIN,
    },
  });

  const components = [
    {
      code: "PATIENTS",
      name: "Patients",
      type: ComponentType.MODULE,
    },
    {
      code: "APPOINTMENTS",
      name: "Appointments",
      type: ComponentType.MODULE,
    },
    {
      code: "DOCTORS",
      name: "Doctors",
      type: ComponentType.MODULE,
    },
    {
      code: "BILLING",
      name: "Billing",
      type: ComponentType.MODULE,
    },
    {
      code: "LAB",
      name: "Lab",
      type: ComponentType.MODULE,
    },
    {
      code: "INVENTORY",
      name: "Inventory",
      type: ComponentType.MODULE,
    },
    {
      code: "REPORTS",
      name: "Reports",
      type: ComponentType.MODULE,
    },
  ];

  for (const component of components) {
    await prisma.systemComponent.upsert({
      where: {
        code: component.code,
      },
      update: {},
      create: component,
    });
  }

  console.log("Seed completed");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });