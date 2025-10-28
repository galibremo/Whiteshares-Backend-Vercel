import { Request, Response } from "express";

import AuthenticationService from "@/app/authentication/authentication.service";
import PaypalService from "@/app/paypal/paypal.service";
import PortfolioService from "@/app/portfolio/portfolio.service";

import { ApiController } from "@/controllers/base/api.controller";
import { ServiceApiResponse } from "@/utils/serviceApi";

export default class PaypalController extends ApiController {
	protected paypalService: PaypalService;
	protected portfolioService: PortfolioService;
	protected authService: AuthenticationService;

	/**
	 * Construct the controller
	 *
	 * @param request
	 * @param response
	 */
	constructor(request: Request, response: Response) {
		super(request, response);
		this.paypalService = new PaypalService();
		this.portfolioService = new PortfolioService();
		this.authService = new AuthenticationService();
	}

	async createOrder(): Promise<Response> {
		try {
			const userId = this.request.user?.id;

			const response = await this.paypalService.createOrder(Number(userId));

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async completeOrder(): Promise<Response> {
		try {
			const { body } = this.request;

			if (!body.orderId || !body.cartId) {
				return this.apiResponse.badResponse("Missing orderId or cartId");
			}

			const { orderId, cartId } = body;

			const cartData = await this.paypalService.orderService.retrieveCartByCartId(Number(cartId));
			await this.authService.findUserById(cartData.data.userId);
			const portfolioData = await this.portfolioService.retrievePortfolioById(
				cartData.data.portfolioId
			);

			const capturedPayment = await this.paypalService.capturePayment(
				cartData.data.userId,
				orderId,
				cartData.data.portfolioId
			);

			await this.paypalService.orderService.completeOrderUsingPaypal(
				cartData.data.userId,
				cartData.data,
				portfolioData.data,
				capturedPayment.data.id
			);

			return this.apiResponse.sendResponse(capturedPayment);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}
}
