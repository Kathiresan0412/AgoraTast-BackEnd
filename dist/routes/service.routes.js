"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceRoutes = void 0;
const express_1 = require("express");
const service_controller_1 = require("../controllers/service.controller");
exports.serviceRoutes = (0, express_1.Router)();
exports.serviceRoutes.get('/providers/:slug', service_controller_1.getPublicProviderBySlug);
exports.serviceRoutes.get('/:slug', service_controller_1.getPublicServiceBySlug);
exports.serviceRoutes.get('/', service_controller_1.getPublicServices);
