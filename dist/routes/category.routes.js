"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryRoutes = void 0;
const express_1 = require("express");
exports.categoryRoutes = (0, express_1.Router)();
exports.categoryRoutes.get('/', (req, res) => {
    res.json({ message: 'Category routes' });
});
