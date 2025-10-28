import { Request, Response } from "express";

import DividendService from "@/app/dividend/dividend.service";
import {
	DividendQuerySchema,
	PortfolioDividendCreateSchema
} from "@/app/dividend/dividend.validator";

import { ApiController } from "@/controllers/base/api.controller";
import { SortingHelper } from "@/core/sortingHelper";
import { portfolios } from "@/models/drizzle/portfolio.model";
import { ServiceApiResponse } from "@/utils/serviceApi";

export default class DividendController extends ApiController {
	private readonly sortingHelper: SortingHelper<typeof portfolios>;
	protected dividendService: DividendService;

	constructor(request: Request, response: Response) {
		super(request, response);
		this.sortingHelper = new SortingHelper(portfolios);
		this.dividendService = new DividendService();
	}

	async createPortfolioDividend() {
		try {
			const { body } = this.request;

			const check = PortfolioDividendCreateSchema.safeParse(body);

			if (!check.success)
				return this.apiResponse.badResponse(
					check.error.errors.map(error => error.message).join(" ")
				);

			const totalRevenue = check.data.netRentalIncome - check.data.expenses;

			const checkedData = {
				...check.data,
				totalRevenue
			};

			const response = await this.dividendService.createPortfolioDividend(checkedData);

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async retrievePortfolioDividend() {
		try {
			const response = await this.dividendService.retrievePortfolioDividend();

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async retrievePortfolioDividendById() {
		try {
			const { id } = this.request.params;

			const response = await this.dividendService.retrievePortfolioDividendById(Number(id));

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async retrieveUserDividendByUserId() {
		try {
			const { query } = this.request;

			const check = DividendQuerySchema(this.sortingHelper).safeParse(query);
			if (!check.success) {
				const messages = check.error.issues.map(issue => {
					const field = issue.path.join(".");
					return `${field.charAt(0).toUpperCase() + field.slice(1)} is required.`;
				});

				return this.apiResponse.badResponse(messages.join(" "));
			}
			const { user } = this.request;

			const response = await this.dividendService.retrieveUserDividendByUserId(
				Number(user?.id),
				check.data
			);

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async retrieveUserDividendByPortfolioId() {
		try {
			const { id } = this.request.params;

			const response = await this.dividendService.retrieveUserDividendByPortfolioId(Number(id));

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}
}
