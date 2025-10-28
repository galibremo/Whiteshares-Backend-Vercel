import express, { Router } from "express";

import OnboardingController from "@/app/onboarding/onboarding.controller";

import { authenticationMiddleware } from "@/middlewares/authentication.middleware";

export const onboardingRouter: Router = (() => {
	const router = express.Router();

	router
		.route("")
		.get(authenticationMiddleware, async (req, res) => {
			new OnboardingController(req, res).getOnBoardingStatus();
		})
		.post(authenticationMiddleware, async (req, res) => {
			new OnboardingController(req, res).completeOnBoarding();
		});

	return router;
})();
