import { Express, Router } from "express";
import fs from "fs";

import { authenticationWebhookRouter } from "@/app/authentication/authentication.routes";
import { orderWebhookRouter } from "@/app/order/order.routes";

interface RouteConfig {
	path: string;
	router: Router;
}

export const routes: RouteConfig[] = [
	{ path: "/order", router: orderWebhookRouter },
	{ path: "/auth", router: authenticationWebhookRouter }
];

/**
 * Call this function before the csrf middleware
 * Call this function in app.ts
 */
export default function webhookAppRouter(app: Express, initialRoute: string = "/webhook") {
	const allRoutes: { method: string; path: string }[] = [];

	// Iterate over all the routes in the `routes` configuration
	for (const { path, router } of routes) {
		const basePath = `${initialRoute}${path}`;
		app.use(basePath, router);

		// Access the stack to get the registered routes in the router
		router.stack.forEach((middleware: any) => {
			if (middleware.route) {
				const methods = Object.keys(middleware.route.methods);
				methods.forEach(method => {
					allRoutes.push({
						method: method.toUpperCase(),
						path: `${basePath}${middleware.route.path}`
					});
				});
			}
		});
	}

	if (process.env.NODE_ENV === "development") {
		fs.writeFileSync("webhook-routes.json", JSON.stringify(allRoutes, null, 2));
	}
}
