const prisma = require("../../config/prisma");

class PackageService {

  async create(data) {

    const existing =
      await prisma.package.findUnique({
        where: {
          name: data.name
        }
      });

    if (existing) {
      throw new Error(
        "Package already exists"
      );
    }

    return prisma.package.create({
      data: {
        name: data.name,
        description: data.description,
        monthlyPrice: data.monthlyPrice,
        yearlyPrice: data.yearlyPrice
      }
    });
  }

  async getAll(
    page = 1,
    limit = 10,
    search = ""
  ) {

    const skip =
      (page - 1) * limit;

    const where = search
      ? {
          name: {
            contains: search,
            mode: "insensitive"
          }
        }
      : {};

    const [items, total] =
      await Promise.all([
        prisma.package.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            createdAt: "desc"
          }
        }),

        prisma.package.count({
          where
        })
      ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages:
        Math.ceil(total / limit)
    };
  }

  async getById(id) {

    const pkg =
      await prisma.package.findUnique({
        where: { id }
      });

    if (!pkg) {
      throw new Error(
        "Package not found"
      );
    }

    return pkg;
  }

  async update(id, payload) {

    await this.getById(id);

    if (payload.name) {

      const existing =
        await prisma.package.findFirst({
          where: {
            name: payload.name,
            NOT: {
              id
            }
          }
        });

      if (existing) {
        throw new Error(
          "Package name already exists"
        );
      }
    }

    return prisma.package.update({
      where: { id },
      data: payload
    });
  }

  async changeStatus(
    id,
    isActive
  ) {

    await this.getById(id);

    return prisma.package.update({
      where: { id },
      data: {
        isActive
      }
    });
  }


 // assign component to hospital 
  async assignComponents(
  packageId,
  componentIds
) {

  const pkg =
    await prisma.package.findUnique({
      where: {
        id: parseInt(packageId)
      }
    });

  if (!pkg) {
    throw new Error(
      "Package not found"
    );
  }

  const components =
    await prisma.systemComponent.findMany({
      where: {
        id: {
          in: componentIds
        }
      }
    });

  if (
    components.length !==
    componentIds.length
  ) {
    throw new Error(
      "One or more components not found"
    );
  }

  await prisma.packageComponent.deleteMany({
    where: {
      packageId:parseInt(packageId)
    }
  });

  await prisma.packageComponent.createMany({
    data: componentIds.map(
      componentId => ({
        packageId:parseInt(packageId),
        componentId
      })
    )
  });

  return {
    success: true
  };
}


async getComponents(packageId) {

  const pkg =
    await prisma.package.findUnique({
      where: {
        id: parseInt(packageId)
      }
    });

  if (!pkg) {
    throw new Error(
      "Package not found"
    );
  }

  return prisma.packageComponent.findMany({
    where: {
      packageId: parseInt(packageId)
    },

    include: {
      component: true
    }
  });
}




async assignLimits(
  packageId,
  limits
) {

  const pkg =
    await prisma.package.findUnique({
      where: {
        id: parseInt(packageId)
      }
    });

  if (!pkg) {
    throw new Error(
      "Package not found"
    );
  }

  if (!Array.isArray(limits)) {
    throw new Error(
      "limits must be array"
    );
  }

  const keys = limits.map(
    limit => limit.key
  );

  const uniqueKeys =
    new Set(keys);

  if (
    uniqueKeys.size !== keys.length
  ) {
    throw new Error(
      "Duplicate limit keys not allowed"
    );
  }

  await prisma.packageLimit.deleteMany({
    where: {
      packageId: parseInt(packageId)
    }
  });

  await prisma.packageLimit.createMany({
    data: limits.map(limit => ({
      packageId: parseInt(packageId),
      limitKey: limit.key,
      limitValue: limit.value
    }))
  });

  return {
    success: true
  };
}


async getLimits(packageId) {

  const pkg =
    await prisma.package.findUnique({
      where: {
        id: parseInt(packageId)
      }
    });

  if (!pkg) {
    throw new Error(
      "Package not found"
    );
  }

  return prisma.packageLimit.findMany({
    where: {
      packageId: parseInt(packageId)
    },
    orderBy: {
      limitKey: "asc"
    }
  });
}
}

module.exports =
  new PackageService();