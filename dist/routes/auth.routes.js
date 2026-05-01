"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_controller_1 = require("../controllers/auth.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
exports.authRoutes = (0, express_1.Router)();
exports.authRoutes.post('/login', [
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required')
], validate_middleware_1.validateRequest, auth_controller_1.login);
exports.authRoutes.get('/me', auth_middleware_1.authenticate, auth_controller_1.getMe);
