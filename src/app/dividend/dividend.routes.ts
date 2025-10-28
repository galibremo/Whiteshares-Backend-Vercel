import express, { Router } from "express";

import DividendController from "@/app/dividend/dividend.controller";

import { authenticationMiddleware } from "@/middlewares/authentication.middleware";
import AuthorizationMiddleware from "@/middlewares/authorization.middleware";

export const dividendRouter: Router = (() => {
	const router = express.Router();

	router.get("/admin/portfolio", authenticationMiddleware, async (req, res) => {
		new DividendController(req, res).retrievePortfolioDividend();
	});

	router.post(
		"/admin/create",
		authenticationMiddleware,
		(req, res, next) => {
			return new AuthorizationMiddleware(req, res, next).isAdmin();
		},
		async (req, res) => {
			new DividendController(req, res).createPortfolioDividend();
		}
	);

	router.get("/portfolio/:id", authenticationMiddleware, async (req, res) => {
		new DividendController(req, res).retrievePortfolioDividendById();
	});

	router.get("/user", authenticationMiddleware, async (req, res) => {
		new DividendController(req, res).retrieveUserDividendByUserId();
	});

	return router;
})();
