import { Request, Response } from "express";
import { Products } from "plaid";

import PlaidService from "@/app/plaid/plaid.service";
import {
	GenerateLinkSchema,
	PlaidBankFormSchema,
	PlaidBankQuerySchema
} from "@/app/plaid/plaid.validator";

import { ApiController } from "@/controllers/base/api.controller";
import { SortingHelper } from "@/core/sortingHelper";
import { plaidBanks } from "@/models/drizzle/plaid.model";
import { ServiceApiResponse } from "@/utils/serviceApi";

export default class PlaidController extends ApiController {
	protected readonly sortingHelper: SortingHelper<typeof plaidBanks>;
	protected plaidService: PlaidService;
	/**
	 * Construct the controller
	 *
	 * @param request
	 * @param response
	 */
	constructor(request: Request, response: Response) {
		super(request, response);
		this.sortingHelper = new SortingHelper(plaidBanks);
		this.plaidService = new PlaidService();
	}

	async generateLinkToken(): Promise<Response> {
		try {
			const { body } = this.request;
			const userId = this.request.user?.id;

			const check = GenerateLinkSchema.safeParse(body);
			if (!check.success)
				return this.apiResponse.badResponse(check.error.errors.map(e => e.message).join("\n"));

			const product =
				check.data.product === "IDENTITY_VERIFICATION"
					? Products.IdentityVerification
					: Products.Auth;

			const response = await this.plaidService.generateLinkToken(userId!, product);
			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async retrieveUserIDVStatus(): Promise<Response> {
		try {
			const userId = this.request.user?.id;
			const response = await this.plaidService.retrieveUserIDVStatus(userId!);
			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async updateUserIDVStatus(): Promise<Response> {
		try {
			const userId = this.request.user?.id;
			const { body } = this.request;

			if (!body.idvSession) return this.apiResponse.badResponse("IDV session is required");

			const response = await this.plaidService.updateUserIDVStatus(userId!, body.idvSession);
			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getPlaidBanks(): Promise<Response> {
		try {
			const userId = this.request.user?.id;
			const { query } = this.request;

			const check = PlaidBankQuerySchema(this.sortingHelper).safeParse(query);
			if (!check.success) {
				return this.apiResponse.badResponse(check.error.errors.map(e => e.message).join(" "));
			}

			const response = await this.plaidService.retrieveBankAccounts(userId!, check.data);
			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async addBank(): Promise<Response> {
		try {
			const userId = this.request.user?.id;
			const { body } = this.request;

			const check = PlaidBankFormSchema.safeParse(body);
			if (!check.success)
				return this.apiResponse.badResponse(check.error.errors.map(e => e.message).join("\n"));

			const data = {
				userId: userId!,
				...check.data
			};

			const response = await this.plaidService.addBank(data);
			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async removeBank(): Promise<Response> {
		try {
			const userId = this.request.user?.id;
			const { body } = this.request;

			if (!body.accountId) return this.apiResponse.badResponse("Account ID is required");
			if (isNaN(body.accountId)) return this.apiResponse.badResponse("Account ID must be a number");

			const response = await this.plaidService.removeBank(userId!, body.accountId);
			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getPlaidTransactionsByUserId(): Promise<Response> {
		try {
			const userId = this.request.user?.id;
			const response = await this.plaidService.retrieveCurrentUserTransactions(userId!);
			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getPortfolios(): Promise<Response> {
		try {
			const userId = this.request.user?.id;
			const response = await this.plaidService.retrieveCurrentUserBuyingPortfolios(userId!);
			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}
}
