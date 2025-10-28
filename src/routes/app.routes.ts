import { Router } from "express";

import { authenticationRouter } from "@/app/authentication/authentication.routes";
import { dataRoomRouter } from "@/app/dataRoom/dataRoom.routes";
import { dividendRouter } from "@/app/dividend/dividend.routes";
import { globalRouter } from "@/app/global/global.routes";
import { mediaRouter } from "@/app/media/media.routes";
import { onboardingRouter } from "@/app/onboarding/onboarding.routes";
import { orderRouter } from "@/app/order/order.routes";
import { paymentRouter } from "@/app/payment/payment.routes";
import { paypalRouter } from "@/app/paypal/paypal.routes";
import { plaidRouter } from "@/app/plaid/plaid.routes";
import { portfolioRouter } from "@/app/portfolio/portfolio.routes";
import { usersRouter } from "@/app/user/user.routes";
import { walletRouter } from "@/app/wallet/wallet.routes";

import { csrfRouter } from "@/routes/csrf.route";

interface RouteConfig {
	path: string;
	router: Router;
}

export const routes: RouteConfig[] = [
	{ path: "", router: globalRouter },
	{ path: "/auth", router: authenticationRouter },
	{ path: "/onboarding", router: onboardingRouter },
	{ path: "/portfolio", router: portfolioRouter },
	{ path: "/order", router: orderRouter },
	{ path: "/dividend", router: dividendRouter },
	{ path: "/wallet", router: walletRouter },
	{ path: "/plaid", router: plaidRouter },
	{ path: "/csrf-token", router: csrfRouter },
	{ path: "/paypal", router: paypalRouter },
	{ path: "/payment", router: paymentRouter },
	{ path: "/media", router: mediaRouter },
	{ path: "/users", router: usersRouter },
	{ path: "/data-room", router: dataRoomRouter }
];
