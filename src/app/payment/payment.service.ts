import { and, count, eq, exists, gte, ilike, inArray, lte, or, sum } from "drizzle-orm";

import {
	AdminPaymentTransactionsQuerySchemaType,
	PaymentPortfolioQuerySchemaType,
	PaymentTransactionsQuerySchemaType
} from "@/app/payment/payment.validator";

import PaginationManager from "@/core/pagination";
import { SortingHelper } from "@/core/sortingHelper";
import DrizzleService from "@/databases/drizzle/service";
import { PaymentSchemaType } from "@/databases/drizzle/types";
import { users } from "@/models/drizzle/authentication.model";
import { payments } from "@/models/drizzle/payment.model";
import { portfolios } from "@/models/drizzle/portfolio.model";
import { ServiceApiResponse, ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

export default class PaymentService extends DrizzleService {
	private readonly sortingHelper: SortingHelper<typeof payments>;

	/**
	 * Constructor
	 */
	constructor() {
		super();
		this.sortingHelper = new SortingHelper(payments);
	}

	async createPayment(
		data: Omit<PaymentSchemaType, "id" | "createdAt" | "updatedAt">
	): Promise<ServiceApiResponse<PaymentSchemaType>> {
		try {
			const createdData = await this.db.insert(payments).values(data).returning();

			return ServiceResponse.createResponse(
				status.HTTP_201_CREATED,
				"Payment created successfully",
				createdData[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrievePayment(
		id: number,
		userId: number
	): Promise<ServiceApiResponse<Omit<PaymentSchemaType, "metadata">>> {
		try {
			const paymentData = await this.db.query.payments.findFirst({
				where: and(eq(payments.id, id), eq(payments.userId, userId)),
				columns: { metadata: false },
				with: {
					portfolio: {
						columns: {
							id: true,
							title: true,
							slug: true,
							shares: true,
							sharePrice: true
						},
						with: {
							featuredImage: {
								columns: { id: true, url: true, secureUrl: true }
							}
						}
					}
				}
			});

			if (!paymentData)
				return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Payment not found");

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Payment retrieved successfully",
				paymentData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveAllPayments(
		filter: PaymentTransactionsQuerySchemaType,
		userId: number
	): Promise<ServiceApiResponse<Omit<PaymentSchemaType, "metadata">[]>> {
		try {
			const orderBy = this.sortingHelper.applySorting(filter.sortingMethod, filter.sortBy);

			if (!filter.page || !filter.limit) {
				return await this.retrieveAllTransactionPayments(
					userId,
					filter.sortingMethod,
					filter.sortBy
				);
			}

			// Create date objects from string inputs if they exist
			const fromDate = filter.from ? new Date(filter.from) : undefined;
			const toDate = filter.to ? new Date(filter.to) : undefined;

			// If toDate exists, set it to the end of the day
			if (toDate) {
				toDate.setHours(23, 59, 59, 999);
			}

			const conditions = [
				eq(payments.userId, userId),
				filter.search
					? or(
							exists(
								this.db
									.select()
									.from(portfolios)
									.where(
										and(ilike(portfolios.title, `%${filter.search}%`), eq(payments.userId, userId))
									)
									.leftJoin(payments, eq(payments.portfolioId, portfolios.id))
							),
							ilike(payments.transactionId, `%${filter.search}%`)
						)
					: undefined,
				fromDate ? gte(payments.createdAt, fromDate) : undefined,
				toDate ? lte(payments.createdAt, toDate) : undefined
			].filter(Boolean);

			const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

			const totalItems = await this.db
				.select({
					count: count()
				})
				.from(payments)
				.where(whereClause)
				.then(result => result[0].count);

			const { pagination, offset } = new PaginationManager(
				filter.page,
				filter.limit,
				totalItems
			).createPagination();

			const paymentData = await this.db.query.payments.findMany({
				where: whereClause,
				limit: filter.limit ? filter.limit : undefined,
				offset: filter.limit ? offset : undefined,
				orderBy,
				columns: { metadata: false },
				with: {
					portfolio: true
				}
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Payments retrieved successfully",
				paymentData,
				pagination
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	private async retrieveAllTransactionPayments(
		userId: number,
		sortingMethod?: string,
		sortBy?: string
	): Promise<ServiceApiResponse<Omit<PaymentSchemaType, "metadata">[]>> {
		try {
			const orderBy = this.sortingHelper.applySorting(sortingMethod, sortBy);

			const paymentData = await this.db.query.payments.findMany({
				where: eq(payments.userId, userId),
				orderBy,
				columns: { metadata: false },
				with: {
					portfolio: true
				}
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Payments retrieved successfully",
				paymentData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveCurrentUserBuyingPortfolios(
		filter: PaymentPortfolioQuerySchemaType,
		userId: number
	): Promise<ServiceApiResponse<PaymentPortfolio[]>> {
		try {
			const orderBy = this.sortingHelper.applySorting(filter.sortingMethod, filter.sortBy);

			if (!filter.page || !filter.limit) {
				return await this.retrieveAllCurrentUserBuyingPortfolios(
					userId,
					filter.sortingMethod,
					filter.sortBy
				);
			}

			// Create date objects from string inputs if they exist
			const fromDate = filter.from ? new Date(filter.from) : undefined;
			const toDate = filter.to ? new Date(filter.to) : undefined;

			// If toDate exists, set it to the end of the day
			if (toDate) {
				toDate.setHours(23, 59, 59, 999);
			}

			const conditions = [
				eq(payments.userId, userId),
				filter.search
					? or(
							exists(
								this.db
									.select()
									.from(portfolios)
									.where(
										and(ilike(portfolios.title, `%${filter.search}%`), eq(payments.userId, userId))
									)
									.leftJoin(payments, eq(payments.portfolioId, portfolios.id))
							),
							ilike(payments.transactionId, `%${filter.search}%`)
						)
					: undefined,
				fromDate ? gte(payments.createdAt, fromDate) : undefined,
				toDate ? lte(payments.createdAt, toDate) : undefined
			].filter(Boolean);

			const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

			const totalItems = await this.db
				.select({
					count: count()
				})
				.from(payments)
				.where(whereClause)
				.then(result => result[0].count);

			const { pagination, offset } = new PaginationManager(
				filter.page,
				filter.limit,
				totalItems
			).createPagination();

			const paymentData = await this.db.query.payments.findMany({
				where: whereClause,
				limit: filter.limit ? filter.limit : undefined,
				offset: filter.limit ? offset : undefined,
				orderBy,
				columns: { id: true, amount: true, investedShares: true, createdAt: true },
				with: {
					portfolio: {
						columns: {
							id: true,
							title: true,
							slug: true,
							shares: true,
							sharePrice: true
						},
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
				"Payments retrieved successfully",
				paymentData,
				pagination
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	private async retrieveAllCurrentUserBuyingPortfolios(
		userId: number,
		sortingMethod?: string,
		sortBy?: string
	): Promise<ServiceApiResponse<PaymentPortfolio[]>> {
		try {
			const orderBy = this.sortingHelper.applySorting(sortingMethod, sortBy);

			const paymentData = await this.db.query.payments.findMany({
				where: eq(payments.userId, userId),
				orderBy,
				columns: { id: true, amount: true, investedShares: true, createdAt: true },
				with: {
					portfolio: {
						columns: {
							id: true,
							title: true,
							slug: true,
							shares: true,
							sharePrice: true
						},
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
				"Payments retrieved successfully",
				paymentData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrievePortfoliosForAdminThreeMonths(): Promise<ServiceApiResponse<PaymentPortfolio[]>> {
		try {
			const threeMonthsAgo = new Date();
			threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
			const paymentData = await this.db.query.payments.findMany({
				columns: { id: true, amount: true, investedShares: true, createdAt: true },
				where: (payments, { gte }) => gte(payments.createdAt, threeMonthsAgo),
				with: {
					portfolio: {
						columns: {
							id: true,
							title: true,
							slug: true,
							shares: true,
							sharePrice: true
						},
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
				"Payments retrieved successfully",
				paymentData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrievePaymentsForAdmin(
		filter: AdminPaymentTransactionsQuerySchemaType
	): Promise<ServiceApiResponse<PaymentSchemaType[]>> {
		try {
			const orderBy = this.sortingHelper.applySorting(filter.sortingMethod, filter.sortBy);

			if (!filter.page || !filter.limit) {
				return await this.retrieveAllPaymentsForAdmin(filter.sortingMethod, filter.sortBy);
			}

			// Create date objects from string inputs if they exist
			const fromDate = filter.from ? new Date(filter.from) : undefined;
			const toDate = filter.to ? new Date(filter.to) : undefined;

			// If toDate exists, set it to the end of the day
			if (toDate) {
				toDate.setHours(23, 59, 59, 999);
			}

			const conditions = [
				filter.search
					? or(
							exists(
								this.db
									.select()
									.from(portfolios)
									.where(ilike(portfolios.title, `%${filter.search}%`))
									.leftJoin(payments, eq(payments.portfolioId, portfolios.id))
							),
							ilike(payments.transactionId, `%${filter.search}%`),
							exists(
								this.db
									.select()
									.from(users)
									.where(ilike(users.name, `%${filter.search}%`))
									.leftJoin(users, eq(payments.userId, users.id))
							)
						)
					: undefined,
				filter.userIdQuery ? inArray(payments.userId, filter.userIdQuery) : undefined,
				filter.portfolioIdQuery
					? inArray(payments.portfolioId, filter.portfolioIdQuery)
					: undefined,
				filter.paymentMethodQuery ? inArray(payments.type, filter.paymentMethodQuery) : undefined,
				filter.paymentStatusQuery ? inArray(payments.status, filter.paymentStatusQuery) : undefined,
				fromDate ? gte(payments.createdAt, fromDate) : undefined,
				toDate ? lte(payments.createdAt, toDate) : undefined
			].filter(Boolean);

			const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

			const totalItems = await this.db
				.select({
					count: count()
				})
				.from(payments)
				.where(whereClause)
				.then(result => result[0].count);

			const { pagination, offset } = new PaginationManager(
				filter.page,
				filter.limit,
				totalItems
			).createPagination();

			const paymentData = await this.db.query.payments.findMany({
				where: whereClause,
				limit: filter.limit ? filter.limit : undefined,
				offset: filter.limit ? offset : undefined,
				orderBy,
				with: {
					user: {
						columns: { id: true, name: true, email: true, username: true }
					},
					portfolio: {
						columns: {
							id: true,
							title: true,
							slug: true,
							shares: true,
							sharePrice: true
						},
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
				"Payments retrieved successfully",
				paymentData,
				pagination
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	private async retrieveAllPaymentsForAdmin(
		sortingMethod?: string,
		sortBy?: string
	): Promise<ServiceApiResponse<PaymentSchemaType[]>> {
		try {
			const orderBy = this.sortingHelper.applySorting(sortingMethod, sortBy);

			const paymentData = await this.db.query.payments.findMany({
				orderBy,
				with: {
					user: {
						columns: { id: true, name: true, email: true, username: true }
					},
					portfolio: {
						columns: {
							id: true,
							title: true,
							slug: true,
							shares: true,
							sharePrice: true
						},
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
				"Payments retrieved successfully",
				paymentData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveCapital(
		filter: PaymentPortfolioQuerySchemaType
	): Promise<ServiceApiResponse<Capital[]>> {
		try {
			const orderBy = this.sortingHelper.applySorting(filter.sortingMethod, filter.sortBy);

			if (!filter.page || !filter.limit) {
				return await this.retrieveAllCapital(filter.sortingMethod, filter.sortBy);
			}

			// Create date objects from string inputs if they exist
			const fromDate = filter.from ? new Date(filter.from) : undefined;
			const toDate = filter.to ? new Date(filter.to) : undefined;

			// If toDate exists, set it to the end of the day
			if (toDate) {
				toDate.setHours(23, 59, 59, 999);
			}

			const conditions = [
				filter.search
					? or(
							exists(
								this.db
									.select()
									.from(portfolios)
									.where(and(ilike(portfolios.title, `%${filter.search}%`)))
									.leftJoin(payments, eq(payments.portfolioId, portfolios.id))
							),
							ilike(payments.transactionId, `%${filter.search}%`)
						)
					: undefined,
				fromDate ? gte(payments.createdAt, fromDate) : undefined,
				toDate ? lte(payments.createdAt, toDate) : undefined
			].filter(Boolean);

			const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

			const totalItems = await this.db
				.select({
					count: count()
				})
				.from(payments)
				.where(whereClause)
				.then(result => result[0].count);

			const { pagination, offset } = new PaginationManager(
				filter.page,
				filter.limit,
				totalItems
			).createPagination();

			const paymentData = await this.db.query.payments.findMany({
				where: whereClause,
				limit: filter.limit ? filter.limit : undefined,
				offset: filter.limit ? offset : undefined,
				orderBy,
				columns: { id: true, amount: true, investedShares: true, createdAt: true },
				with: {
					user: {
						columns: { name: true }
					},
					portfolio: {
						columns: {
							id: true,
							title: true,
							slug: true,
							shares: true,
							sharePrice: true
						},
						with: {
							featuredImage: {
								columns: { id: true, url: true, secureUrl: true }
							}
						}
					}
				}
			});

			// Convert data into Capital format
			const capitalData: Capital[] = paymentData.map(payment => {
				const portfolio = payment.portfolio;
				return {
					investorName: payment.user?.name || "Unknown",
					totalShareOwned: payment.investedShares,
					percentageOwnership: portfolio ? (payment.investedShares / portfolio.shares) * 100 : 0
				};
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Payments retrieved successfully",
				capitalData,
				pagination
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	private async retrieveAllCapital(
		sortingMethod?: string,
		sortBy?: string
	): Promise<ServiceApiResponse<Capital[]>> {
		try {
			const orderBy = this.sortingHelper.applySorting(sortingMethod, sortBy);

			const paymentData = await this.db.query.payments.findMany({
				orderBy,
				columns: { id: true, amount: true, investedShares: true, createdAt: true },
				with: {
					user: {
						columns: { name: true }
					},
					portfolio: {
						columns: {
							id: true,
							title: true,
							slug: true,
							shares: true,
							sharePrice: true
						},
						with: {
							featuredImage: {
								columns: { id: true, url: true, secureUrl: true }
							}
						}
					}
				}
			});

			// Convert data into Capital format
			const capitalData: Capital[] = paymentData.map(payment => {
				const portfolio = payment.portfolio;
				return {
					investorName: payment.user?.name || "Unknown",
					totalShareOwned: payment.investedShares,
					percentageOwnership: portfolio ? (payment.investedShares / portfolio.shares) * 100 : 0
				};
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Payments retrieved successfully",
				capitalData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async updatePayment(
		id: number,
		data: Partial<Omit<PaymentSchemaType, "id" | "createdAt" | "updatedAt">>
	): Promise<ServiceApiResponse<PaymentSchemaType>> {
		try {
			const updatedData = await this.db
				.update(payments)
				.set(data)
				.where(eq(payments.id, id))
				.returning();

			if (updatedData.length === 0) {
				return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Payment not found");
			}

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Payment updated successfully",
				updatedData[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async userNumberOfSharesBought(userId: number): Promise<ServiceApiResponse<number>> {
		try {
			const totalShares = await this.db
				.select({
					totalShares: count()
				})
				.from(payments)
				.where(and(eq(payments.userId, userId), eq(payments.status, "COMPLETED")))
				.then(result => result[0].totalShares);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Total shares bought retrieved successfully",
				totalShares
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async userPortfolioValue(userId: number): Promise<ServiceApiResponse<number>> {
		try {
			const totalValue = await this.db
				.select({
					totalValue: sum(payments.amount)
				})
				.from(payments)
				.where(and(eq(payments.userId, userId), eq(payments.status, "COMPLETED")))
				.then(result => Number(result[0].totalValue) || 0);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Total portfolio value retrieved successfully",
				totalValue
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}
}
