import { Request, Response } from "express";

import AuthenticationService from "@/app/authentication/authentication.service";
import OrderService from "@/app/order/order.service";
import {
	CartFormSchema,
	CartUpdateFormSchema,
	CheckoutFormSchema,
	OrderCompleteFormSchema
} from "@/app/order/order.validator";

import { ApiController } from "@/controllers/base/api.controller";
import { ServiceApiResponse } from "@/utils/serviceApi";

export default class OrderController extends ApiController {
	protected orderService: OrderService;
	protected authService: AuthenticationService;

	/**
	 * Construct the controller
	 *
	 * @param request
	 * @param response
	 */
	constructor(request: Request, response: Response) {
		super(request, response);
		this.orderService = new OrderService();
		this.authService = new AuthenticationService();
	}

	async cart(): Promise<Response> {
		try {
			const userId = this.request.user?.id;
			const { body } = this.request;
			const check = CartFormSchema.safeParse(body);
			if (!check.success)
				return this.apiResponse.badResponse(check.error.errors.map(e => e.message).join("\n"));

			const response = await this.orderService.cart(
				userId!,
				check.data.portfolioId,
				check.data.shares
			);

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async removeCart(): Promise<Response> {
		try {
			const userId = this.request.user?.id;

			const response = await this.orderService.removeCart(userId!);
			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async addBankAccountToCart(): Promise<Response> {
		try {
			const userId = this.request.user?.id;
			const { body } = this.request;

			if (!body.accountId) return this.apiResponse.badResponse("Account ID is required");
			if (typeof body.accountId !== "number")
				return this.apiResponse.badResponse("Account ID must be a number");

			const response = await this.orderService.addBankAccountToCart(userId!, body.accountId);
			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async retrieveCart(): Promise<Response> {
		try {
			const userId = this.request.user?.id;
			const response = await this.orderService.retrieveCart(userId!);
			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async updateCartItemQuantity(): Promise<Response> {
		try {
			const { body } = this.request;

			const check = CartUpdateFormSchema.safeParse(body);
			if (!check.success)
				return this.apiResponse.badResponse(check.error.errors.map(e => e.message).join("\n"));

			const userId = Number(this.request.user?.id);

			const response = await this.orderService.updateCartItemQuantity(
				userId,
				check.data.shares,
				check.data.updateStatus
			);

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async checkout(): Promise<Response> {
		try {
			const userId = this.request.user?.id;
			const { body } = this.request;

			const check = CheckoutFormSchema.safeParse(body);
			if (!check.success)
				return this.apiResponse.badResponse(check.error.errors.map(e => e.message).join("\n"));

			const response = await this.orderService.checkout(userId!, check.data.accountId);
			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async completeOrder(): Promise<Response> {
		try {
			const userId = this.request.user?.id;
			const { body } = this.request;
			const check = OrderCompleteFormSchema.safeParse(body);
			if (!check.success)
				return this.apiResponse.badResponse(check.error.errors.map(e => e.message).join("\n"));

			const response = await this.orderService.completeOrder(userId!, check.data.intentId);
			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async webhookCompleteOrder(): Promise<Response> {
		try {
			const { body } = this.request;
			console.log("Webhook body", body);
			return this.apiResponse.successResponse("Webhook received");
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}
}
