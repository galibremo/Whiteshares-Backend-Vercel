import { and, count, desc, eq, gte, ilike, lte } from "drizzle-orm";

import { DividendQuerySchemaType } from "@/app/dividend/dividend.validator";
import PortfolioService from "@/app/portfolio/portfolio.service";
import WalletService from "@/app/wallet/wallet.service";

import { crudMessages } from "@/core/messages";
import PaginationManager from "@/core/pagination";
import { SortingHelper } from "@/core/sortingHelper";
import DrizzleService from "@/databases/drizzle/service";
import {
	DividendSchemaType,
	PortfolioDividendSchemaType,
	PortfolioSchemaType,
	UserDividendSchemaType
} from "@/databases/drizzle/types";
import { portfolioDividend, userDividend } from "@/models/drizzle/dividend.model";
import { investments } from "@/models/drizzle/portfolio.model";
import { ServiceApiResponse, ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

export default class DividendService extends DrizzleService {
	private readonly sortingHelper: SortingHelper<typeof userDividend>;

	protected portfolioService: PortfolioService;
	protected walletService: WalletService;

	constructor() {
		super();
		this.portfolioService = new PortfolioService();
		this.sortingHelper = new SortingHelper(userDividend);
		this.walletService = new WalletService();
	}

	async createPortfolioDividend(
		data: Omit<PortfolioDividendSchemaType, "id" | "createdAt" | "updatedAt">
	): Promise<ServiceApiResponse<PortfolioDividendSchemaType>> {
		try {
			const portfolioData = await this.portfolioService.retrievePortfolioById(data.portfolioId);

			const createdData = await this.db.insert(portfolioDividend).values(data).returning();

			await this.distributeDividend(portfolioData.data, createdData[0].totalRevenue);

			return ServiceResponse.createResponse(
				status.HTTP_201_CREATED,
				crudMessages.success.create("Portfolio Dividend"),
				createdData[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrievePortfolioDividend(): Promise<ServiceApiResponse<PortfolioDividendSchemaType[]>> {
		try {
			const data = await this.db.query.portfolioDividend.findMany({
				orderBy: desc(portfolioDividend.createdAt),
				with: {
					portfolio: {
						columns: { id: true, title: true, slug: true },
						with: {
							featuredImage: {
								columns: { id: true, url: true, secureUrl: true }
							}
						}
					}
				}
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				crudMessages.success.read("Portfolio Dividend"),
				data
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrievePortfolioDividendById(
		portfolioId: number
	): Promise<ServiceApiResponse<PortfolioDividendSchemaType>> {
		try {
			const data = await this.db.query.portfolioDividend.findFirst({
				where: eq(portfolioDividend.portfolioId, portfolioId),
				with: {
					portfolio: true
				}
			});

			if (!data) {
				return ServiceResponse.createRejectResponse(
					status.HTTP_404_NOT_FOUND,
					crudMessages.error.read.notFound("Portfolio Dividend")
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				crudMessages.success.read("Portfolio Dividend"),
				data
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveUserDividendByUserId(
		userId: number,
		filter: DividendQuerySchemaType
	): Promise<ServiceApiResponse<UserDividendSchemaType[]>> {
		try {
			const orderBy = this.sortingHelper.applySorting(filter.sortingMethod, filter.sortBy);

			if (!filter.page || !filter.limit) {
				return await this.retrieveAll(userId, filter.sortingMethod, filter.sortBy);
			}

			// Create date objects from string inputs if they exist
			const fromDate = filter.from ? new Date(filter.from) : undefined;
			const toDate = filter.to ? new Date(filter.to) : undefined;

			// If toDate exists, set it to the end of the day
			if (toDate) {
				toDate.setHours(23, 59, 59, 999);
			}

			const conditions = [
				eq(userDividend.userId, userId),
				filter.search ? ilike(userDividend.dividend, `%${filter.search}%`) : undefined,
				fromDate ? gte(userDividend.createdAt, fromDate) : undefined,
				toDate ? lte(userDividend.createdAt, toDate) : undefined
			].filter(Boolean);

			const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

			const totalItems = await this.db
				.select({
					count: count()
				})
				.from(userDividend)
				.where(whereClause)
				.then(result => result[0].count);

			const { pagination, offset } = new PaginationManager(
				filter.page,
				filter.limit,
				totalItems
			).createPagination();
			const data = await this.db.query.userDividend.findMany({
				where: whereClause,
				limit: filter.limit ? filter.limit : undefined,
				offset: filter.limit ? offset : undefined,
				orderBy
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				crudMessages.success.read("User Dividend"),
				data,
				pagination
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	private async retrieveAll(
		userId: number,
		sortingMethod?: string,
		sortBy?: string
	): Promise<ServiceApiResponse<DividendSchemaType[]>> {
		try {
			const orderBy = this.sortingHelper.applySorting(sortingMethod, sortBy);

			const dividendData = await this.db.query.userDividend.findMany({
				where: eq(userDividend.userId, userId),
				orderBy
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Wallets retrieve successfully",
				dividendData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveUserTotalDividendByUserId(userId: number): Promise<ServiceApiResponse<number>> {
		try {
			const data = await this.db.query.userDividend.findMany({
				where: eq(userDividend.userId, userId),
				with: {
					portfolio: {
						columns: { title: true, slug: true }
					}
				}
			});

			const totalDividend = data.reduce((acc, dividend) => acc + dividend.dividend, 0);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				crudMessages.success.read("User Dividend"),
				totalDividend
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveUserDividendByPortfolioId(
		portfolioId: number
	): Promise<ServiceApiResponse<UserDividendSchemaType[]>> {
		try {
			const data = await this.db.query.userDividend.findMany({
				where: eq(userDividend.portfolioId, portfolioId),
				with: {
					user: true,
					portfolio: true
				}
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				crudMessages.success.read("User Dividend"),
				data
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	private async distributeDividend(
		portfolioData: PortfolioSchemaType,
		totalRevenue: number
	): Promise<ServiceApiResponse<UserDividendSchemaType[]>> {
		try {
			// Calculate the dividend per share
			const shareDividend = totalRevenue / portfolioData.shares;

			// Retrieve all investments in the portfolio that are older than 30 days
			const thirtyDaysAgo = new Date();
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

			const retrieveAllInvestments = await this.db.query.investments.findMany({
				where: and(
					eq(investments.portfolioId, portfolioData.id),
					lte(investments.createdAt, thirtyDaysAgo)
				)
			});

			// Filter out multiple investments and calculate their total shares from the same user
			const totalShares = retrieveAllInvestments.reduce(
				(acc, investment) => {
					if (acc[investment.investorId]) {
						acc[investment.investorId] += investment.shares;
					} else {
						acc[investment.investorId] = investment.shares;
					}

					return acc;
				},
				{} as { [key: number]: number }
			);

			// Calculate the dividend for each user
			const dividendData = Object.entries(totalShares).map(([userId, shares]) => ({
				userId: Number(userId),
				portfolioId: portfolioData.id,
				totalShares: shares,
				dividend: shareDividend * shares
			}));

			if (dividendData.length === 0) {
				return ServiceResponse.createRejectResponse(
					status.HTTP_404_NOT_FOUND,
					"No investments were found for this portfolio"
				);
			}

			// Create the user dividends
			const createdDividends = await this.db.insert(userDividend).values(dividendData).returning();

			// Create the wallet entries for each user
			const walletData = await Promise.all(
				createdDividends.map(async dividend => {
					const remainingAmount = await this.walletService.retrieveCurrentRemainingAmount(
						dividend.userId,
						dividend.dividend,
						"CREDIT"
					);

					return {
						userId: dividend.userId,
						amount: dividend.dividend,
						remainingAmount: remainingAmount.data.remainingAmount,
						balanceType: "CREDIT" as const
					};
				})
			);

			// Create the wallet entries
			await this.walletService.createWallets(walletData);

			return ServiceResponse.createResponse(
				status.HTTP_201_CREATED,
				crudMessages.success.create("User Dividends"),
				createdDividends
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}
}
