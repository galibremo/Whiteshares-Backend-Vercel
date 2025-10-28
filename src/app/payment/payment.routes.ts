import express, { Router } from "express";

import PaymentController from "@/app/payment/payment.controller";

import { authenticationMiddleware } from "@/middlewares/authentication.middleware";
import AuthorizationMiddleware from "@/middlewares/authorization.middleware";

export const paymentRouter: Router = (() => {
	const router = express.Router();

	router.get("/transactions", authenticationMiddleware, async (req, res) => {
		await new PaymentController(req, res).retrieveAllPayments();
	});

	router.get("/transactions/:id", authenticationMiddleware, async (req, res) => {
		await new PaymentController(req, res).retrievePayment();
	});

	router.get("/portfolios", authenticationMiddleware, async (req, res) => {
		await new PaymentController(req, res).retrievePortfolios();
	});

	router.get(
		"/admin/portfolios",
		authenticationMiddleware,
		(req, res, next) => {
			return new AuthorizationMiddleware(req, res, next).isAdmin();
		},
		async (req, res) => {
			await new PaymentController(req, res).retrievePortfoliosForAdmin();
		}
	);

	router.get(
		"/capital",
		authenticationMiddleware,
		(req, res, next) => {
			return new AuthorizationMiddleware(req, res, next).isAdmin();
		},
		async (req, res) => {
			await new PaymentController(req, res).retrieveCapital();
		}
	);

	router.get(
		"/admin/transactions",
		authenticationMiddleware,
		(req, res, next) => {
			return new AuthorizationMiddleware(req, res, next).isAdmin();
		},
		async (req, res) => {
			await new PaymentController(req, res).retrieveAllPaymentsForAdmin();
		}
	);

	return router;
})();
