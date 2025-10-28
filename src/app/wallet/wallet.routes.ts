import express, { Router } from "express";

import WalletController from "@/app/wallet/wallet.controller";

import { authenticationMiddleware } from "@/middlewares/authentication.middleware";

export const walletRouter: Router = (() => {
	const router = express.Router();

	router.get("", authenticationMiddleware, async (req, res) => {
		new WalletController(req, res).retrieveUserWallet();
	});

	return router;
})();
