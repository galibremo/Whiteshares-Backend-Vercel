import { hash } from "bcrypt";
import { and, count, eq, gte, ilike, inArray, lte, or, sum } from "drizzle-orm";

import PaymentService from "@/app/payment/payment.service";
import { UserQuerySchemaType } from "@/app/user/user.validator";
import WalletService from "@/app/wallet/wallet.service";

import PaginationManager from "@/core/pagination";
import { SortingHelper } from "@/core/sortingHelper";
import DrizzleService from "@/databases/drizzle/service";
import { UserSchemaType } from "@/databases/drizzle/types";
import { users } from "@/models/drizzle/authentication.model";
import { payments } from "@/models/drizzle/payment.model";
import { portfolios } from "@/models/drizzle/portfolio.model";
import { ServiceApiResponse, ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

export default class UserService extends DrizzleService {
	private readonly sortingHelper: SortingHelper<typeof users>;
	private readonly paymentService: PaymentService;
	private readonly walletService: WalletService;

	constructor() {
		super();
		this.sortingHelper = new SortingHelper(users);
		this.paymentService = new PaymentService();
		this.walletService = new WalletService();
	}

	private async preventDuplicateUsernameOrEmail(
		username?: string | null,
		email?: string | null
	): Promise<ServiceApiResponse<boolean>> {
		if (username) {
			const existingUser = await this.db.query.users.findFirst({
				where: eq(users.username, username)
			});
			if (existingUser) {
				return ServiceResponse.createRejectResponse(
					status.HTTP_400_BAD_REQUEST,
					"Username already exists"
				);
			}
		}

		if (email) {
			const existingUser = await this.db.query.users.findFirst({
				where: eq(users.email, email)
			});
			if (existingUser) {
				return ServiceResponse.createRejectResponse(
					status.HTTP_400_BAD_REQUEST,
					"Email already exists"
				);
			}
		}

		return ServiceResponse.createResponse(
			status.HTTP_200_OK,
			"Username and email are unique",
			true
		);
	}

	async create(
		data: Omit<UserSchemaType, "id" | "createdAt" | "updatedAt">
	): Promise<ServiceApiResponse<UserSchemaType>> {
		try {
			await this.preventDuplicateUsernameOrEmail(data.username, data.email);
			const createdUser = await this.db
				.insert(users)
				.values(data)
				.returning()
				.then(result => result[0]);

			return ServiceResponse.createResponse(
				status.HTTP_201_CREATED,
				"User created successfully",
				createdUser
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveOne(id: number): Promise<ServiceApiResponse<UserSchemaType>> {
		try {
			const user = await this.db.query.users.findFirst({
				where: eq(users.id, id)
			});

			if (!user) {
				return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "User not found");
			}

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"User retrieved successfully",
				user
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieve(filter: UserQuerySchemaType): Promise<ServiceApiResponse<UserSchemaType[]>> {
		try {
			const orderBy = this.sortingHelper.applySorting(filter.sortingMethod, filter.sortBy);

			if (!filter.page || !filter.limit) {
				return await this.retrieveAll(filter.sortingMethod, filter.sortBy);
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
							ilike(users.name, `%${filter.search}%`),
							ilike(users.email, `%${filter.search}%`),
							ilike(users.username, `%${filter.search}%`)
						)
					: undefined,
				filter.roleQuery ? eq(users.role, filter.roleQuery) : undefined,
				fromDate ? gte(users.createdAt, fromDate) : undefined,
				toDate ? lte(users.createdAt, toDate) : undefined
			].filter(Boolean);

			const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

			const totalItems = await this.db
				.select({
					count: count()
				})
				.from(users)
				.where(whereClause)
				.then(result => result[0].count);

			const { pagination, offset } = new PaginationManager(
				filter.page,
				filter.limit,
				totalItems
			).createPagination();

			const usersData = await this.db.query.users.findMany({
				where: whereClause,
				limit: filter.limit ? filter.limit : undefined,
				offset: filter.limit ? offset : undefined,
				orderBy
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Users retrieved successfully",
				usersData,
				pagination
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	private async retrieveAll(
		sortingMethod?: string,
		sortBy?: string
	): Promise<ServiceApiResponse<UserSchemaType[]>> {
		try {
			const orderBy = this.sortingHelper.applySorting(sortingMethod, sortBy);

			const usersData = await this.db.query.users.findMany({
				orderBy
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Users retrieved successfully",
				usersData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async update(
		id: number,
		data: Partial<
			Omit<UserSchemaType, "id" | "emailVerified" | "createdAt" | "updatedAt"> & {
				emailVerified: boolean;
			}
		>
	): Promise<ServiceApiResponse<UserSchemaType>> {
		try {
			const { emailVerified, ...restData } = data;
			const userData = await this.retrieveOne(id);

			const updatedUser = await this.db
				.update(users)
				.set({
					...restData,
					emailVerified: userData.data.emailVerified ? userData.data.emailVerified : null
				})
				.where(eq(users.id, id))
				.returning()
				.then(result => result[0]);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"User updated successfully",
				updatedUser
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async delete(id: number): Promise<ServiceApiResponse<boolean>> {
		try {
			await this.db.delete(users).where(eq(users.id, id)).returning();

			return ServiceResponse.createResponse(status.HTTP_200_OK, "User deleted successfully", true);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async deleteAll(ids?: number[]): Promise<ServiceApiResponse<boolean>> {
		try {
			if (ids && ids.length > 0) {
				await this.db.delete(users).where(inArray(users.id, ids)).returning();

				return ServiceResponse.createResponse(
					status.HTTP_200_OK,
					"Users deleted successfully",
					true
				);
			}

			await this.db.delete(users).returning();

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"All users deleted successfully",
				true
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async updatePassword(id: number, password: string): Promise<ServiceApiResponse<UserSchemaType>> {
		try {
			const hashedPassword = await hash(password, 10);
			const updatedUser = await this.db
				.update(users)
				.set({ password: hashedPassword })
				.where(eq(users.id, id))
				.returning()
				.then(result => result[0]);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Password updated successfully",
				updatedUser
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async overview(userId: number): Promise<ServiceApiResponse<UserOverview>> {
		try {
			await this.retrieveOne(userId);

			const walletBalance = await this.walletService.retrieveWalletBalance(userId);

			const portfolioValue = await this.paymentService.userPortfolioValue(userId);
			const numberOfSharesResult = await this.db
				.select({
					totalShares: sum(payments.investedShares)
				})
				.from(payments)
				.where(and(eq(payments.userId, userId), eq(payments.status, "COMPLETED")))
				.then(result => result[0]);
			const numberOfShares = Number(numberOfSharesResult.totalShares) || 0;

			const paymentStats = await this.db
				.select({
					investedShares: payments.investedShares,
					amount: payments.amount,
					type: payments.type
				})
				.from(payments)
				.where(eq(payments.status, "COMPLETED"));

			const numberOfSharesSold = paymentStats.reduce(
				(total, payment) => total + payment.investedShares,
				0
			);

			// Calculate unsold shares from all portfolios
			const totalRemainingShares = await this.db
				.select({ remainingShares: portfolios.remainingShares })
				.from(portfolios)
				.then(results =>
					results.reduce((total, portfolio) => total + portfolio.remainingShares, 0)
				);

			const unsoldShares = totalRemainingShares;
			const totalSharesAmount = numberOfSharesSold + unsoldShares;

			const data: UserOverview = {
				dividendGrowth: 10,
				wallet: {
					balance: walletBalance.data.balance,
					cashIn: walletBalance.data.cashIn,
					cashOut: walletBalance.data.cashOut
				},
				portfolioValue: portfolioValue.data,
				numberOfShares: numberOfShares,
				totalShares: {
					amount: totalSharesAmount,
					sold: numberOfSharesSold,
					unsold: unsoldShares
				}
			};

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"User overview retrieved successfully",
				data
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async adminOverview(): Promise<ServiceApiResponse<AdminOverview>> {
		try {
			// Get total amount raised, shares sold, and payment types
			const paymentStats = await this.db
				.select({
					investedShares: payments.investedShares,
					amount: payments.amount,
					type: payments.type
				})
				.from(payments)
				.where(eq(payments.status, "COMPLETED"));

			const numberOfSharesSold = paymentStats.reduce(
				(total, payment) => total + payment.investedShares,
				0
			);
			const amountRaised = paymentStats.reduce((total, payment) => total + payment.amount, 0);

			const numberOfInvestors = await this.db
				.select({ count: count() })
				.from(users)
				.where(eq(users.role, "INVESTOR"))
				.then(result => result[0].count); // Prevent division by zero
			const averageInvestment = numberOfInvestors > 0 ? amountRaised / numberOfInvestors : 0;

			// Calculate unsold shares from all portfolios
			const totalRemainingShares = await this.db
				.select({ remainingShares: portfolios.remainingShares })
				.from(portfolios)
				.then(results =>
					results.reduce((total, portfolio) => total + portfolio.remainingShares, 0)
				);

			const unsoldShares = totalRemainingShares;
			const totalSharesAmount = numberOfSharesSold + unsoldShares;

			const data: AdminOverview = {
				amountRaised,
				numberOfSharesSold,
				numberOfInvestors,
				averageInvestment,
				unsoldShares,
				totalShares: {
					amount: totalSharesAmount,
					sold: numberOfSharesSold,
					unsold: unsoldShares
				}
			};

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Admin overview retrieved successfully",
				data
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveInvestors(
		filter: UserQuerySchemaType
	): Promise<ServiceApiResponse<InvestorWithMetrics[]>> {
		try {
			const orderBy = this.sortingHelper.applySorting(filter.sortingMethod, filter.sortBy);

			if (!filter.page || !filter.limit) {
				// For retrieveAll case without pagination, we'll apply the same logic
				const allUsers = await this.db.query.users.findMany({
					orderBy
				});

				// Get total shares for percentage calculations
				const totalPortfolioShares = await this.db
					.select({ shares: portfolios.shares })
					.from(portfolios)
					.then(results => results.reduce((total, portfolio) => total + portfolio.shares, 0));

				// Apply same metrics enhancement
				const allInvestorsWithMetrics: InvestorWithMetrics[] = await Promise.all(
					allUsers.map(async user => {
						const userPayments = await this.db
							.select({
								investedShares: payments.investedShares,
								amount: payments.amount,
								type: payments.type
							})
							.from(payments)
							.where(and(eq(payments.userId, user.id), eq(payments.status, "COMPLETED")));

						const totalPurchasedShares = userPayments.reduce(
							(total, payment) => total + payment.investedShares,
							0
						);
						const totalInvestedAmount = userPayments.reduce(
							(total, payment) => total + payment.amount,
							0
						);

						const totalPurchasedSharePercentage =
							totalPortfolioShares > 0
								? parseFloat(((totalPurchasedShares / totalPortfolioShares) * 100).toFixed(2))
								: 0;

						return {
							id: user.id,
							name: user.name,
							email: user.email,
							username: user.username,
							role: user.role,
							createdAt: user.createdAt,
							updatedAt: user.updatedAt,
							totalPurchasedShareAmount: totalInvestedAmount,
							totalPurchasedShares,
							totalPurchasedSharePercentage
						};
					})
				);

				return ServiceResponse.createResponse(
					status.HTTP_200_OK,
					"All investors retrieved successfully with individual metrics",
					allInvestorsWithMetrics
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
				filter.search
					? or(
							ilike(users.name, `%${filter.search}%`),
							ilike(users.email, `%${filter.search}%`),
							ilike(users.username, `%${filter.search}%`)
						)
					: undefined,
				filter.roleQuery ? eq(users.role, filter.roleQuery) : undefined,
				fromDate ? gte(users.createdAt, fromDate) : undefined,
				toDate ? lte(users.createdAt, toDate) : undefined
			].filter(Boolean);

			const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

			const totalItems = await this.db
				.select({
					count: count()
				})
				.from(users)
				.where(whereClause)
				.then(result => result[0].count);

			const { pagination, offset } = new PaginationManager(
				filter.page,
				filter.limit,
				totalItems
			).createPagination();

			const usersData = await this.db.query.users.findMany({
				where: whereClause,
				limit: filter.limit ? filter.limit : undefined,
				offset: filter.limit ? offset : undefined,
				orderBy
			});

			// Get total shares across all portfolios for percentage calculations
			const totalPortfolioShares = await this.db
				.select({ shares: portfolios.shares })
				.from(portfolios)
				.then(results => results.reduce((total, portfolio) => total + portfolio.shares, 0));

			// Enhance each user with individual metrics
			const investorsWithMetrics: InvestorWithMetrics[] = await Promise.all(
				usersData.map(async user => {
					// Get individual investor's payment data
					const userPayments = await this.db
						.select({
							investedShares: payments.investedShares,
							amount: payments.amount,
							type: payments.type
						})
						.from(payments)
						.where(and(eq(payments.userId, user.id), eq(payments.status, "COMPLETED")));

					const totalPurchasedShares = userPayments.reduce(
						(total, payment) => total + payment.investedShares,
						0
					);
					const totalInvestedAmount = userPayments.reduce(
						(total, payment) => total + payment.amount,
						0
					);

					const totalPurchasedSharePercentage =
						totalPortfolioShares > 0
							? parseFloat(((totalPurchasedShares / totalPortfolioShares) * 100).toFixed(2))
							: 0;
					return {
						id: user.id,
						name: user.name,
						email: user.email,
						username: user.username,
						role: user.role,
						createdAt: user.createdAt,
						updatedAt: user.updatedAt,
						totalPurchasedShareAmount: totalInvestedAmount,
						totalPurchasedShares,
						totalPurchasedSharePercentage
					};
				})
			);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Investors retrieved successfully with individual metrics",
				investorsWithMetrics,
				pagination
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}
}
