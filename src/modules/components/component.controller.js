const componentService =
  require("./component.service");

class ComponentController {

  async create(req, res, next) {
    try {

      const component =
        await componentService.create(
          req.body
        );

      res.status(201).json({
        success: true,
        data: component
      });

    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {

      const components =
        await componentService.getAll();

      res.json({
        success: true,
        data: components
      });

    } catch (error) {
      next(error);
    }
  }

  async getTree(req, res, next) {
    try {

      const tree =
        await componentService.getTree();

      res.json({
        success: true,
        data: tree
      });

    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {

      const component =
        await componentService.getById(
          req.params.id
        );

      res.json({
        success: true,
        data: component
      });

    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {

      const component =
        await componentService.update(
          req.params.id,
          req.body
        );

      res.json({
        success: true,
        data: component
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports =
  new ComponentController();