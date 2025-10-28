import express, { Router } from "express";
import passport from "passport";

import AuthenticationController from "@/app/authentication/authentication.controller";

import { authenticationMiddleware } from "@/middlewares/authentication.middleware";

export const authenticationRouter: Router = (() => {
	const router = express.Router();

	// Get current user route
	router.get("/me", (req, res) => {
		new AuthenticationController(req, res).getSession();
	});

	// Session route
	router.get("/session", authenticationMiddleware, (req, res) => {
		new AuthenticationController(req, res).verifySession();
	});

	// Account verification route
	router.get("/account-verification", authenticationMiddleware, (req, res) => {
		new AuthenticationController(req, res).checkAccountVerification();
	});

	// Register route
	router.post("/register", (req, res) => {
		new AuthenticationController(req, res).register();
	});

	// Request OTP route
	router.post("/request-otp", (req, res) => {
		new AuthenticationController(req, res).requestOTPForUnverifiedUser();
	});

	// Local Authentication
	router.post("/login", async (req, res) => {
		new AuthenticationController(req, res).loginWithUsername();
	});

	// Local Authentication with OTP
	router.post("/login/otp", async (req, res) => {
		new AuthenticationController(req, res).loginWithUsernameAndOTP();
	});

	// Google Authentication
	router.get("/login/google", passport.authenticate("google", { scope: ["profile", "email"] }));
	router.get(
		"/google/callback",
		passport.authenticate("google", { failureRedirect: "/login" }),
		(req, res) => {
			new AuthenticationController(req, res).loginWithGoogle();
		}
	);

	// Verify user route
	router.post("/verify-user", (req, res) => {
		new AuthenticationController(req, res).verifyUser();
	});

	// Check user route
	router.post("/check-user", (req, res) => {
		new AuthenticationController(req, res).checkUser();
	});

	// Profile route
	router
		.route("/profile")
		.get(authenticationMiddleware, (req, res) => {
			new AuthenticationController(req, res).getProfile();
		})
		.put(authenticationMiddleware, (req, res) => {
			new AuthenticationController(req, res).updateProfile();
		});

	router.post("/upload-avatar", authenticationMiddleware, (req, res) => {
		new AuthenticationController(req, res).uploadAvatar();
	});

	// Password reset route
	router.post("/reset-password", (req, res) => {
		new AuthenticationController(req, res).resetPassword();
	});

	// Local Authentication OTP Check
	router.post("/reset-password/otp-check", async (req, res) => {
		new AuthenticationController(req, res).resetPasswordOTPCheck();
	});

	// Password reset confirmation route
	router.post("/reset-password/confirm", (req, res) => {
		new AuthenticationController(req, res).resetPasswordConfirm();
	});

	// Password change route
	router.post("/change-password", authenticationMiddleware, (req, res) => {
		new AuthenticationController(req, res).changePassword();
	});

	// Logout route
	router.post("/logout", authenticationMiddleware, (req, res) => {
		new AuthenticationController(req, res).logout();
	});

	return router;
})();

export const authenticationWebhookRouter: Router = (() => {
	const router = express.Router();

	return router;
})();
