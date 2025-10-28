import express, { Router } from "express";

import PortfolioController from "@/app/portfolio/portfolio.controller";

import { authenticationMiddleware } from "@/middlewares/authentication.middleware";
import AuthorizationMiddleware from "@/middlewares/authorization.middleware";

export const portfolioRouter: Router = (() => {
	const router = express.Router();

	// Static Routes
	router
		.route("")
		.get(async (req, res) => {
			new PortfolioController(req, res).retrieveAll();
		})
		.post(
			authenticationMiddleware,
			(req, res, next) => {
				return new AuthorizationMiddleware(req, res, next).isAdmin();
			},
			async (req, res) => {
				new PortfolioController(req, res).create();
			}
		);

	router.get(
		"/admin/list",
		authenticationMiddleware,
		(req, res, next) => {
			return new AuthorizationMiddleware(req, res, next).isAdmin();
		},
		async (req, res) => {
			new PortfolioController(req, res).retrieveAdminPortfolioList();
		}
	);

	router.get(
		"/last",
		authenticationMiddleware,
		(req, res, next) => {
			return new AuthorizationMiddleware(req, res, next).isAdmin();
		},
		async (req, res) => {
			new PortfolioController(req, res).retrieveLastPortfolio();
		}
	);

	// Dynamic Routes
	router
		.route("/:identifier")
		.get(async (req, res) => {
			new PortfolioController(req, res).retrieve();
		})
		.put(
			authenticationMiddleware,
			(req, res, next) => {
				return new AuthorizationMiddleware(req, res, next).isAdmin();
			},
			async (req, res) => {
				new PortfolioController(req, res).update();
			}
		)
		.delete(
			authenticationMiddleware,
			(req, res, next) => {
				return new AuthorizationMiddleware(req, res, next).isAdmin();
			},
			async (req, res) => {
				new PortfolioController(req, res).delete();
			}
		);

	return router;
})();
