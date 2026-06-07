// TODO: Implement
const hospitalService = require("./hospital.service");

class HospitalController {
  async create(req, res, next) {
    try {
      const hospital =
        await hospitalService.create(
          req.body,
          req.user.sub
        );

      res.status(201).json({
        success: true,
        data: hospital,
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
        await hospitalService.getAll(
          page,
          limit,
          search
        );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const hospital =
        await hospitalService.getById(
          req.params.id
        );

      res.json({
        success: true,
        data: hospital,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const hospital =
        await hospitalService.update(
          req.params.id,
          req.body
        );

      res.json({
        success: true,
        data: hospital,
      });
    } catch (error) {
      next(error);
    }
  }

  async changeStatus(req, res, next) {
    try {
      const hospital =
        await hospitalService.changeStatus(
          req.params.id,
          req.body.status
        );

      res.json({
        success: true,
        data: hospital,
      });
    } catch (error) {
      next(error);
    }
  }

  async assignPackage(
  req,
  res,
  next
) {
  try {

    const result =
      await hospitalService.assignPackage(
        req.params.hospitalId,
        req.body.packageId
      );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    next(error);
  }
}
async getAssignedPackage(
  req,
  res,
  next
) {
  try {

    const result =
      await hospitalService.getAssignedPackage(
        req.params.hospitalId
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

module.exports = new HospitalController();