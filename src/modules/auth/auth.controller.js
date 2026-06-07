const authService = require("./auth.service");

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const result = await authService.login(
        email,
        password
      );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();