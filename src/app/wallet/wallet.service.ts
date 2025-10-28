import { and, count, desc, eq, gte, ilike, isNull, lte, not } from "drizzle-orm";

import { WalletQuerySchemaType } from "@/app/wallet/wallet.validator";

import { crudMessages } from "@/core/messages";
import PaginationManager from "@/core/pagination";
import { SortingHelper } from "@/core/sortingHelper";
import DrizzleService from "@/databases/drizzle/service";
import { BalanceType, WalletSchemaType } from "@/databases/drizzle/types";
import { wallet } from "@/models/drizzle/wallet.model";
import { ServiceApiResponse, ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

export default class WalletService extends DrizzleService {
	private readonly sortingHelper: SortingHelper<typeof wallet>;

	constructor() {
		super();
		this.sortingHelper = new SortingHelper(wallet);
	}

	async createWallet(
		data: Omit<WalletSchemaType, "id" | "createdAt" | "updatedAt">
	): Promise<ServiceApiResponse<WalletSchemaType | boolean>> {
		try {
			const checkNullWallet = await this.checkUserNullWalletExists(data.userId);
			if (checkNullWallet.data) {
				const createdData = await this.db.insert(wallet).values(data).returning();

				return ServiceResponse.createResponse(
					status.HTTP_201_CREATED,
					crudMessages.success.create("Wallet"),
					createdData[0]
				);
			} else {
				return ServiceResponse.createResponse(
					status.HTTP_200_OK,
					crudMessages.error.create.alreadyExists("Wallet"),
					true
				);
			}
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async createWallets(
		data: Omit<WalletSchemaType, "id" | "createdAt" | "updatedAt">[]
	): Promise<ServiceApiResponse<WalletSchemaType[]>> {
		try {
			const createdData = await this.db.insert(wallet).values(data).returning();

			return ServiceResponse.createResponse(
				status.HTTP_201_CREATED,
				crudMessages.success.create("Wallet"),
				createdData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveWallet(
		userId: number,
		filter: WalletQuerySchemaType
	): Promise<ServiceApiResponse<WalletSchemaType[]>> {
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
				eq(wallet.userId, userId),
				filter.search ? ilike(wallet.amount, `%${filter.search}%`) : undefined,
				fromDate ? gte(wallet.createdAt, fromDate) : undefined,
				toDate ? lte(wallet.createdAt, toDate) : undefined
			].filter(Boolean);

			const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

			const totalItems = await this.db
				.select({
					count: count()
				})
				.from(wallet)
				.where(whereClause)
				.then(result => result[0].count);

			const { pagination, offset } = new PaginationManager(
				filter.page,
				filter.limit,
				totalItems
			).createPagination();

			const userWalletData = await this.db.query.wallet.findMany({
				where: whereClause,
				limit: filter.limit ? filter.limit : undefined,
				offset: filter.limit ? offset : undefined,
				orderBy
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				crudMessages.success.read("Wallet"),
				userWalletData,
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
	): Promise<ServiceApiResponse<WalletSchemaType[]>> {
		try {
			const orderBy = this.sortingHelper.applySorting(sortingMethod, sortBy);

			const walletsData = await this.db.query.wallet.findMany({
				where: eq(wallet.userId, userId),
				orderBy
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Wallets retrieve successfully",
				walletsData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveLastSixMonthsWallet(
		userId: number
	): Promise<ServiceApiResponse<WalletSchemaType[]>> {
		try {
			// Calculate date 6 months ago from current date
			const sixMonthsAgo = new Date();
			sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

			const userWalletData = await this.db.query.wallet.findMany({
				where: and(
					eq(wallet.userId, userId),
					not(isNull(wallet.balanceType)),
					gte(wallet.createdAt, sixMonthsAgo)
				),
				orderBy: desc(wallet.createdAt)
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				crudMessages.success.read("Wallet"),
				userWalletData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveLastThreeMonthsWallet(
		userId: number
	): Promise<ServiceApiResponse<WalletSchemaType[]>> {
		try {
			// Calculate date 3 months ago from current date
			const threeMonthsAgo = new Date();
			threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

			const userWalletData = await this.db.query.wallet.findMany({
				where: and(
					eq(wallet.userId, userId),
					not(isNull(wallet.balanceType)),
					gte(wallet.createdAt, threeMonthsAgo)
				),
				orderBy: desc(wallet.createdAt)
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				crudMessages.success.read("Wallet"),
				userWalletData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveWalletBalance(
		userId: number
	): Promise<ServiceApiResponse<{ balance: number; cashIn: number; cashOut: number }>> {
		try {
			// Get the current balance (latest remaining amount)
			const userWalletData = await this.db.query.wallet.findFirst({
				where: eq(wallet.userId, userId),
				orderBy: desc(wallet.createdAt)
			});

			// Get all wallet transactions to calculate cashIn and cashOut
			const allWalletTransactions = await this.db.query.wallet.findMany({
				where: and(eq(wallet.userId, userId), not(isNull(wallet.balanceType)))
			});

			// Calculate total cash in (CREDIT transactions)
			const cashIn = allWalletTransactions
				.filter(transaction => transaction.balanceType === "CREDIT")
				.reduce((total, transaction) => total + transaction.amount, 0);

			// Calculate total cash out (DEBIT transactions)
			const cashOut = allWalletTransactions
				.filter(transaction => transaction.balanceType === "DEBIT")
				.reduce((total, transaction) => total + transaction.amount, 0);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				crudMessages.success.read("Wallet"),
				{
					balance: userWalletData?.remainingAmount ?? 0,
					cashIn,
					cashOut
				}
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveCurrentRemainingAmount(
		userId: number,
		amount: number,
		balanceType: BalanceType
	): Promise<ServiceApiResponse<{ remainingAmount: number }>> {
		try {
			const walletData = await this.db.query.wallet.findFirst({
				where: eq(wallet.userId, userId),
				orderBy: desc(wallet.createdAt)
			});

			const currentRemainingAmount =
				balanceType === "CREDIT"
					? (walletData?.remainingAmount || 0) + amount
					: (walletData?.remainingAmount || 0) - amount;

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				crudMessages.success.read("Wallet"),
				{ remainingAmount: currentRemainingAmount ?? 0 }
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async checkUserNullWalletExists(userId: number): Promise<ServiceApiResponse<boolean>> {
		try {
			const walletData = await this.db.query.wallet.findFirst({
				where: and(eq(wallet.userId, userId), isNull(wallet.balanceType))
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				crudMessages.success.read("Wallet"),
				!!walletData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}
}
