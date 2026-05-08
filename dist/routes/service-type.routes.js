"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceTypeRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const service_type_controller_1 = require("../controllers/service-type.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const image_validation_1 = require("../utils/image-validation");
exports.serviceTypeRoutes = (0, express_1.Router)();
// Publicly accessible; authenticated admins can also see inactive records.
exports.serviceTypeRoutes.get('/', auth_middleware_1.optionalAuthenticate, service_type_controller_1.getServiceTypes);
// Only admins can modify
exports.serviceTypeRoutes.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['admin']), [
    (0, express_validator_1.body)('name').notEmpty().withMessage('Name is required'),
    (0, express_validator_1.body)('parent_id').optional({ nullable: true }).isUUID().withMessage('Parent id must be a valid UUID'),
    (0, express_validator_1.body)('slug').optional().isString(),
    (0, express_validator_1.body)('description').optional().isString(),
    (0, express_validator_1.body)('icon').optional().isString(),
    (0, express_validator_1.body)('image_url').optional({ nullable: true }).custom(image_validation_1.isAllowedImageValue).withMessage('Service type image must be a valid image URL or image upload under 2MB'),
    (0, express_validator_1.body)('color').optional().isString(),
    (0, express_validator_1.body)('active').optional().isBoolean(),
    (0, express_validator_1.body)('sort_order').optional().isInt()
], validate_middleware_1.validateRequest, service_type_controller_1.createServiceType);
exports.serviceTypeRoutes.put('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['admin']), [
    (0, express_validator_1.body)('parent_id').optional({ nullable: true }).isUUID().withMessage('Parent id must be a valid UUID'),
    (0, express_validator_1.body)('slug').optional().isString(),
    (0, express_validator_1.body)('name').optional().isString(),
    (0, express_validator_1.body)('description').optional().isString(),
    (0, express_validator_1.body)('icon').optional().isString(),
    (0, express_validator_1.body)('image_url').optional({ nullable: true }).custom(image_validation_1.isAllowedImageValue).withMessage('Service type image must be a valid image URL or image upload under 2MB'),
    (0, express_validator_1.body)('color').optional().isString(),
    (0, express_validator_1.body)('sort_order').optional().isInt()
], validate_middleware_1.validateRequest, service_type_controller_1.updateServiceType);
exports.serviceTypeRoutes.patch('/:id/status', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['admin']), [
    (0, express_validator_1.body)('active').isBoolean().withMessage('Active status must be a boolean')
], validate_middleware_1.validateRequest, service_type_controller_1.toggleServiceTypeStatus);
exports.serviceTypeRoutes.delete('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['admin']), service_type_controller_1.deleteServiceType);
