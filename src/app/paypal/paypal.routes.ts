import express, { Router } from "express";

import PaypalController from "@/app/paypal/paypal.controller";

import { authenticationMiddleware } from "@/middlewares/authentication.middleware";

export const paypalRouter: Router = (() => {
	const router = express.Router();

	router.post("/order", authenticationMiddleware, async (req, res) => {
		new PaypalController(req, res).createOrder();
	});

	router.post("/order/complete", async (req, res) => {
		new PaypalController(req, res).completeOrder();
	});

	return router;
})();
