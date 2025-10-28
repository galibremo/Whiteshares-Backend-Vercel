import express, { Router } from "express";
import multer from "multer";

import DataRoomController from "@/app/dataRoom/dataRoom.controller";

import { authenticationMiddleware } from "@/middlewares/authentication.middleware";
import AuthorizationMiddleware from "@/middlewares/authorization.middleware";

const upload = multer();

export const dataRoomRouter: Router = (() => {
	const router = express.Router();

	router
		.route("/upload")
		.get(async (req, res) => {
			new DataRoomController(req, res).index();
		})
		.post(
			upload.any(),
			authenticationMiddleware,
			(req, res, next) => {
				return new AuthorizationMiddleware(req, res, next).isAdmin();
			},
			async (req, res) => {
				new DataRoomController(req, res).upload();
			}
		);

	router.put(
		"/update/:id",
		authenticationMiddleware,
		(req, res, next) => {
			return new AuthorizationMiddleware(req, res, next).isAdmin();
		},
		async (req, res) => {
			new DataRoomController(req, res).update();
		}
	);

	router.route("/delete/:id").delete(
		authenticationMiddleware,
		(req, res, next) => {
			return new AuthorizationMiddleware(req, res, next).isAdmin();
		},
		async (req, res) => {
			new DataRoomController(req, res).delete();
		}
	);

	return router;
})();
