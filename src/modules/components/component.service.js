const prisma = require("../../config/prisma");

class ComponentService {

//   async create(data) {
//     return prisma.systemComponent.create({
//       data: {
//         code: data.code,
//         name: data.name,
//         type: data.type,
//         parentId: data.parentId || null,
//         displayOrder: data.displayOrder || 0
//       }
//     });
//   }


async create(data) {

  // MODULE validation
  if (
    data.type === "MODULE" &&
    data.parentId
  ) {
    throw new Error(
      "MODULE cannot have parent"
    );
  }

  // SUB_MODULE validation
  if (
    data.type === "SUB_MODULE" &&
    !data.parentId
  ) {
    throw new Error(
      "SUB_MODULE requires parent"
    );
  }

  // FEATURE validation
  if (
    data.type === "FEATURE" &&
    !data.parentId
  ) {
    throw new Error(
      "FEATURE requires parent"
    );
  }

  // Validate parent existence
  if (data.parentId) {

    const parent =
      await prisma.systemComponent.findUnique({
        where: {
          id: data.parentId
        }
      });

    if (!parent) {
      throw new Error(
        "Parent component not found"
      );
    }

    // Hierarchy validation

    if (
      data.type === "SUB_MODULE" &&
      parent.type !== "MODULE"
    ) {
      throw new Error(
        "SUB_MODULE parent must be MODULE"
      );
    }

    if (
      data.type === "FEATURE" &&
      parent.type !== "SUB_MODULE"
    ) {
      throw new Error(
        "FEATURE parent must be SUB_MODULE"
      );
    }
  }

  return prisma.systemComponent.create({
    data: {
      code: data.code,
      name: data.name,
      type: data.type,
      parentId: data.parentId || null,
      displayOrder: data.displayOrder || 0
    }
  });
}

  async getAll() {
    return prisma.systemComponent.findMany({
      orderBy: [
        {
          displayOrder: "asc"
        }
      ]
    });
  }

  async getById(id) {
    const component =
      await prisma.systemComponent.findUnique({
        where: { id }
      });

    if (!component) {
      throw new Error("Component not found");
    }

    return component;
  }

  async update(id, payload) {
    await this.getById(id);

    return prisma.systemComponent.update({
      where: { id },
      data: payload
    });
  }

  async getTree() {
    const components =
      await prisma.systemComponent.findMany({
        orderBy: {
          displayOrder: "asc"
        }
      });

    const map = {};

    components.forEach(component => {
      map[component.id] = {
        ...component,
        children: []
      };
    });

    const tree = [];

    components.forEach(component => {

      if (!component.parentId) {
        tree.push(map[component.id]);
        return;
      }

      if (map[component.parentId]) {
        map[component.parentId]
          .children
          .push(map[component.id]);
      }
    });

    return tree;
  }
}

module.exports = new ComponentService();