import express, { Router } from "express";

import OrderController from "@/app/order/order.controller";

import { authenticationMiddleware } from "@/middlewares/authentication.middleware";

export const orderRouter: Router = (() => {
	const router = express.Router();

	router
		.route("/cart")
		.get(authenticationMiddleware, async (req, res) => {
			new OrderController(req, res).retrieveCart();
		})
		.post(authenticationMiddleware, async (req, res) => {
			new OrderController(req, res).cart();
		})
		.delete(authenticationMiddleware, async (req, res) => {
			new OrderController(req, res).removeCart();
		});

	router.put("/cart/update", authenticationMiddleware, async (req, res) => {
		new OrderController(req, res).updateCartItemQuantity();
	});

	router.post("/cart/bank", authenticationMiddleware, async (req, res) => {
		new OrderController(req, res).addBankAccountToCart();
	});

	router.post("/checkout", authenticationMiddleware, async (req, res) => {
		new OrderController(req, res).checkout();
	});

	router.post("/complete", authenticationMiddleware, async (req, res) => {
		new OrderController(req, res).completeOrder();
	});

	return router;
})();

export const orderWebhookRouter: Router = (() => {
	const router = express.Router();

	router.post("/complete", async (req, res) => {
		new OrderController(req, res).webhookCompleteOrder();
	});

	return router;
})();
