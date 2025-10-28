import { Request, Response } from "express";

import PortfolioService from "@/app/portfolio/portfolio.service";
import { PortfolioCreateSchema, PortfolioQuerySchema } from "@/app/portfolio/portfolio.validator";

import { ApiController } from "@/controllers/base/api.controller";
import { SortingHelper } from "@/core/sortingHelper";
import { PortfolioSchemaType } from "@/databases/drizzle/types";
import { portfolios } from "@/models/drizzle/portfolio.model";
import { ServiceApiResponse } from "@/utils/serviceApi";

export default class PortfolioController extends ApiController {
	private readonly sortingHelper: SortingHelper<typeof portfolios>;
	protected portfolioService: PortfolioService;

	/**
	 * Constructor initializes the PortfolioController class
	 * @param request
	 * @param response
	 */
	constructor(request: Request, response: Response) {
		super(request, response);
		this.sortingHelper = new SortingHelper(portfolios);
		this.portfolioService = new PortfolioService();
	}

	async create(): Promise<Response> {
		try {
			const { body, user } = this.request;
			console.log("Portfolio Create Check:", body);
			const check = PortfolioCreateSchema.safeParse(body);
			if (!check.success)
				return this.apiResponse.badResponse(
					check.error.errors.map(error => error.message).join(" ")
				);

			const authorId = Number(user?.id);

			// Validate and ensure the slug is unique
			if (check.data.slug) {
				check.data.slug = (await this.portfolioService.validateSlug(check.data.slug)).data;
			}

			const data: Omit<PortfolioSchemaType, "id" | "createdAt" | "updatedAt"> & {
				galleryImages: number[];
			} = {
				...check.data,
				remainingShares: check.data.shares,
				remainingInvestment: check.data.shares * check.data.sharePrice,
				galleryImages: check.data.galleryImages || [],
				authorId
			};

			const portfolioData = await this.portfolioService.createPortfolio(data);

			return this.apiResponse.sendResponse(portfolioData);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async retrieve(): Promise<Response> {
		try {
			const { identifier } = this.request.params;
			const isId = !isNaN(Number(identifier));

			if (isId) {
				const portfolioData = await this.portfolioService.retrievePortfolioById(Number(identifier));
				return this.apiResponse.sendResponse(portfolioData);
			} else {
				const portfolioData = await this.portfolioService.retrievePortfolioBySlug(identifier);
				return this.apiResponse.sendResponse(portfolioData);
			}
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async retrieveAll(): Promise<Response> {
		try {
			const { query } = this.request;

			const check = PortfolioQuerySchema(this.sortingHelper).safeParse(query);
			if (!check.success) {
				const messages = check.error.issues.map(issue => {
					const field = issue.path.join(".");
					return `${field.charAt(0).toUpperCase() + field.slice(1)} is required.`;
				});

				return this.apiResponse.badResponse(messages.join(" "));
			}

			const portfolios = await this.portfolioService.retrieveAllPortfolios(check.data);
			return this.apiResponse.sendResponse(portfolios);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async retrieveAdminPortfolioList(): Promise<Response> {
		try {
			const portfolios = await this.portfolioService.retrieveAllPortfoliosIdsNamesAndSlugs();
			return this.apiResponse.sendResponse(portfolios);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async retrieveLastPortfolio(): Promise<Response> {
		try {
			const portfolio = await this.portfolioService.retrieveLastPortfolio();
			return this.apiResponse.sendResponse(portfolio);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async update(): Promise<Response> {
		try {
			const { body, params, user } = this.request;
			const check = PortfolioCreateSchema.partial().safeParse(body);
			if (!check.success)
				return this.apiResponse.badResponse(
					check.error.errors.map(error => error.message).join(" ")
				);
			const portfolioId = Number(params.identifier);

			// Validate and ensure the slug is unique
			if (check.data.slug) {
				check.data.slug = (
					await this.portfolioService.validateSlug(check.data.slug, portfolioId)
				).data;
			}

			const data = {
				...check.data,
				galleryImages: check.data.galleryImages || [],
				authorId: Number(user?.id)
			};

			const portfolioData = await this.portfolioService.updatePortfolio(portfolioId, data);
			return this.apiResponse.sendResponse(portfolioData);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async delete(): Promise<Response> {
		try {
			const { params } = this.request;
			const portfolioId = Number(params.identifier);

			const response = await this.portfolioService.deletePortfolio(portfolioId);
			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}
}
