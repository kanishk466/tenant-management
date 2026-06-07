// TODO: Implement
const prisma = require("../../config/prisma");
const generateHospitalCode = require("../../utils/hospitalCode");

class HospitalService {
  async create(data, userId) {
    return prisma.hospital.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        code: generateHospitalCode(),
        createdBy: userId,
      },
    });
  }

  async getAll(page = 1, limit = 10, search = "") {
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.hospital.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.hospital.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getById(id) {
    const hospital = await prisma.hospital.findUnique({
      where: { id:parseInt(id) },
    });

    if (!hospital) {
      throw new Error("Hospital not found");
    }

    return hospital;
  }

  async update(id, payload) {

    // console.log(id)
    await this.getById(id);

    return prisma.hospital.update({
      where: { id:parseInt(id) },
      data: payload,
    });
  }

  async changeStatus(id, status) {
    await this.getById(id);

    return prisma.hospital.update({
      where: { id },
      data: {
        status,
      },
    });
  }




async  assignPackage(
  hospitalId,
  packageId
) {

  const hospital =
    await prisma.hospital.findUnique({
      where: {
        id: hospitalId
      }
    });

  if (!hospital) {
    throw new Error(
      "Hospital not found"
    );
  }

  const pkg =
    await prisma.package.findUnique({
      where: {
        id: packageId
      }
    });

  if (!pkg) {
    throw new Error(
      "Package not found"
    );
  }

  await prisma.$transaction(
    async tx => {

      await tx.assignedPackage.updateMany({
        where: {
          hospitalId,
          status: "ACTIVE"
        },
        data: {
          status: "EXPIRED",
          endDate: new Date()
        }
      });

      await tx.assignedPackage.create({
        data: {
          hospitalId,
          packageId,

          status: "ACTIVE",

          startDate: new Date()
        }
      });
    }
  );

  return {
    success: true
  };
}


async  getAssignedPackage(
  hospitalId
) {

  const hospital =
    await prisma.hospital.findUnique({
      where: {
        id: hospitalId
      }
    });

  if (!hospital) {
    throw new Error(
      "Hospital not found"
    );
  }

  return prisma.assignedPackage.findFirst({
    where: {
      hospitalId,
      status: "ACTIVE"
    },

    include: {
      package: {
        include: {
          components: {
            include: {
              component: true
            }
          },

          limits: true
        }
      }
    }
  });
}
}

module.exports = new HospitalService();