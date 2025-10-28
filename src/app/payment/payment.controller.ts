import { Request, Response } from "express";

import AuthenticationService from "@/app/authentication/authentication.service";
import PaymentService from "@/app/payment/payment.service";
import {
	AdminPaymentTransactionsQuerySchema,
	PaymentPortfolioQuerySchema,
	PaymentTransactionsQuerySchema
} from "@/app/payment/payment.validator";

import { ApiController } from "@/controllers/base/api.controller";
import { SortingHelper } from "@/core/sortingHelper";
import { payments } from "@/models/drizzle/payment.model";
import { ServiceApiResponse } from "@/utils/serviceApi";

export default class PaymentController extends ApiController {
	protected readonly sortingHelper: SortingHelper<typeof payments>;
	protected paymentService: PaymentService;
	protected authService: AuthenticationService;

	/**
	 * Construct the controller
	 *
	 * @param request
	 * @param response
	 */
	constructor(request: Request, response: Response) {
		super(request, response);
		this.sortingHelper = new SortingHelper(payments);
		this.paymentService = new PaymentService();
		this.authService = new AuthenticationService();
	}

	async retrievePayment(): Promise<Response> {
		try {
			const { user } = this.request;
			const paymentId = this.request.params.id;

			const response = await this.paymentService.retrievePayment(
				Number(paymentId),
				Number(user?.id)
			);

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async retrieveAllPayments(): Promise<Response> {
		try {
			const { user } = this.request;

			const { query } = this.request;

			const check = PaymentTransactionsQuerySchema(this.sortingHelper).safeParse(query);
			if (!check.success) {
				const messages = check.error.issues.map(issue => {
					const field = issue.path.join(".");
					return `${field.charAt(0).toUpperCase() + field.slice(1)} is required.`;
				});

				return this.apiResponse.badResponse(messages.join(" "));
			}

			const response = await this.paymentService.retrieveAllPayments(check.data, Number(user?.id));

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async retrievePortfolios(): Promise<Response> {
		try {
			const userId = this.request.user?.id;

			const { query } = this.request;

			const check = PaymentPortfolioQuerySchema(this.sortingHelper).safeParse(query);
			if (!check.success) {
				const messages = check.error.issues.map(issue => {
					const field = issue.path.join(".");
					return `${field.charAt(0).toUpperCase() + field.slice(1)} is required.`;
				});

				return this.apiResponse.badResponse(messages.join(" "));
			}

			const response = await this.paymentService.retrieveCurrentUserBuyingPortfolios(
				check.data,
				userId!
			);
			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async retrievePortfoliosForAdmin(): Promise<Response> {
		try {
			const response = await this.paymentService.retrievePortfoliosForAdminThreeMonths();

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async retrieveAllPaymentsForAdmin(): Promise<Response> {
		try {
			const { query } = this.request;

			const check = AdminPaymentTransactionsQuerySchema(this.sortingHelper).safeParse(query);
			if (!check.success) {
				return this.apiResponse.badResponse(
					check.error.errors.map(error => error.message).join(" ")
				);
			}

			const response = await this.paymentService.retrievePaymentsForAdmin(check.data);

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async retrieveCapital(): Promise<Response> {
		try {
			const { query } = this.request;

			const check = PaymentPortfolioQuerySchema(this.sortingHelper).safeParse(query);
			if (!check.success) {
				const messages = check.error.issues.map(issue => {
					const field = issue.path.join(".");
					return `${field.charAt(0).toUpperCase() + field.slice(1)} is required.`;
				});

				return this.apiResponse.badResponse(messages.join(" "));
			}

			const response = await this.paymentService.retrieveCapital(check.data);

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}
}
