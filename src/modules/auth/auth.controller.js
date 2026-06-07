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
  async refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;

    const result =
      await authService.refresh(refreshToken);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async logout(req, res, next) {
  try {
    const { refreshToken } = req.body;

    await authService.logout(refreshToken);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
}

async me(req, res) {
  return res.status(200).json({
    success: true,
    data: req.user,
  });
}
}

module.exports = new AuthController();