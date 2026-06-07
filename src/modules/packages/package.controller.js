const packageService =
  require("./package.service");

class PackageController {

  async create(req, res, next) {
    try {

      const result =
        await packageService.create(
          req.body
        );

      res.status(201).json({
        success: true,
        data: result
      });

    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {

      const page =
        Number(req.query.page) || 1;

      const limit =
        Number(req.query.limit) || 10;

      const search =
        req.query.search || "";

      const result =
        await packageService.getAll(
          page,
          limit,
          search
        );

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {

      const result =
        await packageService.getById(
          req.params.id
        );

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {

      const result =
        await packageService.update(
          req.params.id,
          req.body
        );

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      next(error);
    }
  }

  async changeStatus(
    req,
    res,
    next
  ) {
    try {

      const result =
        await packageService.changeStatus(
          req.params.id,
          req.body.isActive
        );

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      next(error);
    }
  }


  async assignComponents(
  req,
  res,
  next
) {
  try {

    const result =
      await packageService.assignComponents(
        req.params.id,
        req.body.componentIds
      );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    next(error);
  }
}

async getComponents(
  req,
  res,
  next
) {
  try {

    const result =
      await packageService.getComponents(
        req.params.id
      );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    next(error);
  }
}

async assignLimits(
  req,
  res,
  next
) {
  try {

    const result =
      await packageService.assignLimits(
        req.params.id,
        req.body.limits
      );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    next(error);
  }
}

async getLimits(
  req,
  res,
  next
) {
  try {

    const result =
      await packageService.getLimits(
        req.params.id
      );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    next(error);
  }
}
}

module.exports =
  new PackageController();