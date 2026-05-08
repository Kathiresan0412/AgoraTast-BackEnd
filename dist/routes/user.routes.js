"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const user_controller_1 = require("../controllers/user.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const image_validation_1 = require("../utils/image-validation");
exports.userRoutes = (0, express_1.Router)();
exports.userRoutes.put('/profile', auth_middleware_1.authenticate, [
    (0, express_validator_1.body)('name').optional().isString(),
    (0, express_validator_1.body)('profileImage').optional().custom(image_validation_1.isAllowedImageValue).withMessage('Profile image must be a valid image URL or image upload under 2MB')
], validate_middleware_1.validateRequest, user_controller_1.updateProfile);
exports.userRoutes.put('/password', auth_middleware_1.authenticate, [
    (0, express_validator_1.body)('currentPassword').notEmpty().withMessage('Current password is required'),
    (0, express_validator_1.body)('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
], validate_middleware_1.validateRequest, user_controller_1.updatePassword);
