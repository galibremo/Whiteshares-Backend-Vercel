import express, { Router } from "express";
import multer from "multer";

import MediaController from "@/app/media/media.controller";

const upload = multer();

export const mediaRouter: Router = (() => {
	const router = express.Router();

	router
		.route("/upload")
		.get(async (req, res) => {
			new MediaController(req, res).index();
		})
		.post(upload.any(), async (req, res) => {
			new MediaController(req, res).upload();
		});

	router.route("/delete/:id").delete(async (req, res) => {
		new MediaController(req, res).delete();
	});

	return router;
})();
