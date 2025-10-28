import express, { Router } from "express";

import GlobalController from "@/app/global/global.controller";

export const globalRouter: Router = (() => {
	const router = express.Router();

	router
		.route("/contact")
		.get(async (req, res) => {
			new GlobalController(req, res).retrieveContact();
		})
		.post(async (req, res) => {
			new GlobalController(req, res).createContactForm();
		})
		.delete(async (req, res) => {
			new GlobalController(req, res).deleteManyContact();
		});

	router.delete("/contact/:id", async (req, res) => {
		new GlobalController(req, res).deleteOneContact();
	});

	router
		.route("/newsletter")
		.get(async (req, res) => {
			new GlobalController(req, res).retrieveNewsletter();
		})
		.post(async (req, res) => {
			new GlobalController(req, res).createNewsletterForm();
		})
		.delete(async (req, res) => {
			new GlobalController(req, res).deleteManyNewsletter();
		});

	router.delete("/newsletter/:id", async (req, res) => {
		new GlobalController(req, res).deleteOneNewsletter();
	});

	return router;
})();
