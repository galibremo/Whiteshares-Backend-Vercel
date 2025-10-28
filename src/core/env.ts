import pc from "picocolors";
import { z } from "zod";

import { validateEnum, validateString } from "@/validators/commonRules";

const plaidEnvSchema = z.object({
	PLAID_ENV: validateString("PLAID_ENV").refine(
		value => ["sandbox", "production"].includes(value),
		"PLAID_ENV must be either 'sandbox' or 'production'"
	),
	PLAID_CLIENT_ID: validateString("PLAID_CLIENT_ID"),
	PLAID_SECRET: validateString("PLAID_SECRET"),
	PLAID_TEMPLATE_ID: validateString("PLAID_TEMPLATE_ID"),
	PLAID_CLIENT_NAME: validateString("PLAID_CLIENT_NAME")
});

const paypalEnvSchema = z.object({
	PAYPAL_API_URL: validateString("PAYPAL_API_URL"),
	PAYPAL_CLIENT_ID: validateString("PAYPAL_CLIENT_ID"),
	PAYPAL_CLIENT_SECRET: validateString("PAYPAL_CLIENT_SECRET")
});

const googleEnvSchema = z.object({
	GOOGLE_CLIENT_ID: validateString("GOOGLE_CLIENT_ID"),
	GOOGLE_CLIENT_SECRET: validateString("GOOGLE_CLIENT_SECRET"),
	GOOGLE_CALLBACK_URL: validateString("GOOGLE_CALLBACK_URL")
});

const emailEnvSchema = z.object({
	EMAIL_SERVER_HOST: validateString("EMAIL_SERVER_HOST"),
	EMAIL_SERVER_PORT: validateString("EMAIL_SERVER_PORT"),
	EMAIL_SERVER_USER: validateString("EMAIL_SERVER_USER"),
	EMAIL_SERVER_PASSWORD: validateString("EMAIL_SERVER_PASSWORD"),
	EMAIL_FROM: validateString("EMAIL_FROM")
});

const cloudinaryEnvSchema = z.object({
	CLOUDINARY_CLOUD_NAME: validateString("CLOUDINARY_CLOUD_NAME"),
	CLOUDINARY_API_KEY: validateString("CLOUDINARY_API_KEY"),
	CLOUDINARY_API_SECRET: validateString("CLOUDINARY_API_SECRET")
});

export const cookieSchema = z.object({
	COOKIE_DOMAIN: validateString("COOKIE_DOMAIN")
});

export const envSchema = z.object({
	DATABASE_URL: validateString("DATABASE_URL"),
	PORT: validateString("PORT").refine(value => !isNaN(Number(value)), "PORT must be a number"),
	SECRET: validateString("SECRET"),
	NODE_ENV: validateString("NODE_ENV").refine(
		value => ["development", "production"].includes(value),
		"NODE_ENV must be either 'development' or 'production'"
	),
	JWT_COOKIE_NAME: validateString("JWT_COOKIE_NAME"),
	SESSION_COOKIE_NAME: validateString("SESSION_COOKIE_NAME"),
	ORIGIN_URL: validateString("ORIGIN_URL"),
	APP_URL: validateString("APP_URL"),
	API_URL: validateString("API_URL"),
	ADMIN_EMAIL: validateString("ADMIN_EMAIL"),
	...cookieSchema.shape,
	...googleEnvSchema.shape,
	...plaidEnvSchema.shape,
	...paypalEnvSchema.shape,
	...emailEnvSchema.shape,
	...cloudinaryEnvSchema.shape
});

const Env = envSchema.safeParse(process.env);

if (!Env.success) {
	const errorMessages = Env.error.errors.map(e => e.message).join("\n");
	console.error(pc.red(`Environment validation failed:\n${errorMessages}`));
	process.exit(1);
}

export type EnvType = z.infer<typeof envSchema>;

declare global {
	namespace NodeJS {
		interface ProcessEnv extends EnvType {}
	}
}
