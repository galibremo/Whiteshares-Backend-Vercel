import express, { Router } from "express";

import PlaidController from "@/app/plaid/plaid.controller";

import { authenticationMiddleware } from "@/middlewares/authentication.middleware";

export const plaidRouter: Router = (() => {
	const router = express.Router();

	router.post("/link-token", authenticationMiddleware, async (req, res) => {
		new PlaidController(req, res).generateLinkToken();
	});

	router
		.route("/idv")
		.get(authenticationMiddleware, async (req, res) => {
			new PlaidController(req, res).retrieveUserIDVStatus();
		})
		.post(authenticationMiddleware, async (req, res) => {
			new PlaidController(req, res).updateUserIDVStatus();
		});

	router.get("/bank/list", authenticationMiddleware, async (req, res) => {
		new PlaidController(req, res).getPlaidBanks();
	});

	router.post("/bank/add", authenticationMiddleware, async (req, res) => {
		new PlaidController(req, res).addBank();
	});

	router.delete("/bank/remove", authenticationMiddleware, async (req, res) => {
		new PlaidController(req, res).removeBank();
	});

	router.get("/transactions", authenticationMiddleware, async (req, res) => {
		new PlaidController(req, res).getPlaidTransactionsByUserId();
	});

	router.get("/portfolios", authenticationMiddleware, async (req, res) => {
		new PlaidController(req, res).getPortfolios();
	});

	return router;
})();
