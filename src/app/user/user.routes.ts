import express, { Router } from "express";

import UserController from "@/app/user/user.controller";

import { authenticationMiddleware } from "@/middlewares/authentication.middleware";
import AuthorizationMiddleware from "@/middlewares/authorization.middleware";

export const usersRouter: Router = (() => {
	const router = express.Router();

	router
		.route("")
		.get(
			authenticationMiddleware,
			(req, res, next) => {
				return new AuthorizationMiddleware(req, res, next).isAdmin();
			},
			async (req, res) => {
				new UserController(req, res).index();
			}
		)
		.post(
			authenticationMiddleware,
			(req, res, next) => {
				return new AuthorizationMiddleware(req, res, next).isAdmin();
			},
			async (req, res) => {
				new UserController(req, res).create();
			}
		)
		.delete(
			authenticationMiddleware,
			(req, res, next) => {
				return new AuthorizationMiddleware(req, res, next).isAdmin();
			},
			async (req, res) => {
				new UserController(req, res).delete();
			}
		);

	router.get("/investors", authenticationMiddleware, async (req, res) => {
		new UserController(req, res).investors();
	});

	router.get("/overview", authenticationMiddleware, async (req, res) => {
		new UserController(req, res).overview();
	});

	router.get(
		"/admin/overview",
		authenticationMiddleware,
		(req, res, next) => {
			return new AuthorizationMiddleware(req, res, next).isAdmin();
		},
		async (req, res) => {
			new UserController(req, res).adminOverview();
		}
	);

	router.put(
		"/password",
		authenticationMiddleware,
		(req, res, next) => {
			return new AuthorizationMiddleware(req, res, next).isAdmin();
		},
		async (req, res) => {
			new UserController(req, res).updatePassword();
		}
	);

	router
		.route("/:id")
		.get(
			authenticationMiddleware,
			(req, res, next) => {
				return new AuthorizationMiddleware(req, res, next).isAdmin();
			},
			async (req, res) => {
				new UserController(req, res).show();
			}
		)
		.put(
			authenticationMiddleware,
			(req, res, next) => {
				return new AuthorizationMiddleware(req, res, next).isAdmin();
			},
			async (req, res) => {
				new UserController(req, res).update();
			}
		)
		.delete(
			authenticationMiddleware,
			(req, res, next) => {
				return new AuthorizationMiddleware(req, res, next).isAdmin();
			},
			async (req, res) => {
				new UserController(req, res).delete();
			}
		);

	return router;
})();
