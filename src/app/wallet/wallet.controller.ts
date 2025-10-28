import { Request, Response } from "express";

import WalletService from "@/app/wallet/wallet.service";
import { WalletQuerySchema } from "@/app/wallet/wallet.validator";

import { ApiController } from "@/controllers/base/api.controller";
import { SortingHelper } from "@/core/sortingHelper";
import { portfolios } from "@/models/drizzle/portfolio.model";
import { ServiceApiResponse } from "@/utils/serviceApi";

export default class WalletController extends ApiController {
	private readonly sortingHelper: SortingHelper<typeof portfolios>;
	protected walletService: WalletService;

	constructor(request: Request, response: Response) {
		super(request, response);
		this.sortingHelper = new SortingHelper(portfolios);
		this.walletService = new WalletService();
	}

	async retrieveUserWallet() {
		try {
			const { query } = this.request;

			const check = WalletQuerySchema(this.sortingHelper).safeParse(query);
			if (!check.success) {
				const messages = check.error.issues.map(issue => {
					const field = issue.path.join(".");
					return `${field.charAt(0).toUpperCase() + field.slice(1)} is required.`;
				});

				return this.apiResponse.badResponse(messages.join(" "));
			}

			const { month } = this.request.query;
			const { user } = this.request;

			const monthQuery = month ? Boolean(month) : undefined;

			if (monthQuery) {
				const response = await this.walletService.retrieveLastThreeMonthsWallet(Number(user?.id));

				return this.apiResponse.sendResponse(response);
			} else {
				const response = await this.walletService.retrieveWallet(Number(user?.id), check.data);

				return this.apiResponse.sendResponse(response);
			}
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}
}
