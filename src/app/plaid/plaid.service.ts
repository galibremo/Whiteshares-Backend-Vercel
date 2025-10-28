import { and, count, desc, eq, gte, ilike, lte } from "drizzle-orm";
import { CountryCode, LinkTokenCreateRequest, Products } from "plaid";

import AuthenticationService from "@/app/authentication/authentication.service";
import PaymentService from "@/app/payment/payment.service";
import plaidClient from "@/app/plaid/plaid.config";
import { BuyingPortfolio, CreatePlaidTransaction } from "@/app/plaid/plaid.type";
import { PlaidBankQuerySchemaType } from "@/app/plaid/plaid.validator";

import PaginationManager from "@/core/pagination";
import { SortingHelper } from "@/core/sortingHelper";
import DrizzleService from "@/databases/drizzle/service";
import {
	PaymentSchemaType,
	PlaidBankSchemaType,
	PlaidProfileSchemaType,
	PlaidTransactionSchemaType
} from "@/databases/drizzle/types";
import { plaidBanks, plaidProfile, plaidTransactions } from "@/models/drizzle/plaid.model";
import { ServiceApiResponse, ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

interface PlaidBankData {
	userId: number;
	bankName: string;
	bankType: string;
	accountId: string;
	publicToken: string;
	bankData?: any;
}

interface PlaidBankFormattedData {
	id: number;
	bankName: string;
	bankType: string;
	accountId: string;
	createdAt: Date;
}

export default class PlaidService extends DrizzleService {
	private authService: AuthenticationService;
	private sortingHelper: SortingHelper<typeof plaidBanks>;
	private paymentService: PaymentService;

	/**
	 * Construct the service
	 */
	constructor() {
		super();
		this.authService = new AuthenticationService();
		this.sortingHelper = new SortingHelper(plaidBanks);
		this.paymentService = new PaymentService();
	}

	async generateLinkToken(id: number, products: Products): Promise<ServiceApiResponse<string>> {
		try {
			const user = await this.authService.findUserById(id);

			const request: LinkTokenCreateRequest = {
				user: {
					client_user_id: String(user.data?.id),
					email_address: user.data?.email || ""
				},
				products: [products],
				client_name: process.env.PLAID_CLIENT_NAME,
				language: "en",
				country_codes: [CountryCode.Us]
			};

			if (products === Products.IdentityVerification) {
				request.identity_verification = {
					template_id: process.env.PLAID_TEMPLATE_ID
				};
			}

			const tokenResponse = await plaidClient.linkTokenCreate(request);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Link token generated successfully",
				tokenResponse.data.link_token
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async exchangePublicToken(publicToken: string): Promise<ServiceApiResponse<string>> {
		try {
			const data = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Public token exchanged successfully",
				data.data.access_token
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveUserIDVStatus(userId: number): Promise<ServiceApiResponse<string | boolean>> {
		try {
			const profile = await this.db.query.plaidProfile.findFirst({
				where: eq(plaidProfile.userId, userId)
			});

			if (!profile?.idv_status)
				return ServiceResponse.createRejectResponse(
					status.HTTP_404_NOT_FOUND,
					"No IDV status found"
				);

			if (profile.idv_status === "FAILED")
				return ServiceResponse.createRejectResponse(
					status.HTTP_400_BAD_REQUEST,
					"IDV status is failed"
				);

			if (profile.idv_status === "PENDING")
				return ServiceResponse.createResponse(
					status.HTTP_208_ALREADY_REPORTED,
					"IDV status is pending",
					true
				);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"IDV status found",
				profile.idv_status
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async updateUserIDVStatus(
		userId: number,
		idvSession: string
	): Promise<ServiceApiResponse<PlaidProfileSchemaType>> {
		try {
			const IDVResult = await plaidClient.identityVerificationGet({
				identity_verification_id: idvSession
			});
			const IDVData = IDVResult.data;

			const IDVStatus = IDVData.status === "success" ? true : false;

			const response = await this.db
				.insert(plaidProfile)
				.values({
					userId,
					idv_status: IDVData.status,
					is_verified: IDVStatus,
					most_recent_idv_session: IDVData.id,
					plaidProfileData: IDVData
				})
				.onConflictDoUpdate({
					target: [plaidProfile.userId],
					set: {
						idv_status: IDVData.status,
						is_verified: IDVStatus,
						most_recent_idv_session: IDVData.id,
						plaidProfileData: IDVData
					}
				})
				.returning();

			return ServiceResponse.createResponse(status.HTTP_200_OK, "IDV status updated", response[0]);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async addBank(data: PlaidBankData): Promise<ServiceApiResponse<PlaidBankFormattedData>> {
		try {
			const accessToken = await this.exchangePublicToken(data.publicToken);

			const bodyData = {
				...data,
				accessToken: accessToken.data
			};

			const response = await this.db
				.insert(plaidBanks)
				.values(bodyData)
				.onConflictDoNothing({
					target: [plaidBanks.accountId]
				})
				.returning();

			const formattedData = {
				id: response[0].id,
				bankName: response[0].bankName,
				bankType: response[0].bankType,
				accountId: response[0].accountId.slice(-4).padStart(response[0].accountId.length, "*"),
				createdAt: response[0].createdAt
			};

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Bank added successfully",
				formattedData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveBankAccounts(
		userId: number,
		filter: PlaidBankQuerySchemaType
	): Promise<ServiceApiResponse<PlaidBankFormattedData[]>> {
		try {
			const orderBy = this.sortingHelper.applySorting(filter.sortingMethod, filter.sortBy);

			if (!filter.page || !filter.limit) {
				return await this.retrieveBankAllAccounts(userId, filter.sortingMethod, filter.sortBy);
			}

			// Create date objects from string inputs if they exist
			const fromDate = filter.from ? new Date(filter.from) : undefined;
			const toDate = filter.to ? new Date(filter.to) : undefined;

			// If toDate exists, set it to the end of the day
			if (toDate) {
				toDate.setHours(23, 59, 59, 999);
			}

			const conditions = [
				filter.search ? ilike(plaidBanks.bankName, `%${filter.search}%`) : undefined,
				fromDate ? gte(plaidBanks.createdAt, fromDate) : undefined,
				toDate ? lte(plaidBanks.createdAt, toDate) : undefined,
				eq(plaidBanks.userId, userId)
			].filter(Boolean);

			const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

			const totalItems = await this.db
				.select({
					count: count()
				})
				.from(plaidBanks)
				.where(whereClause)
				.then(result => result[0].count);

			const { pagination, offset } = new PaginationManager(
				filter.page,
				filter.limit,
				totalItems
			).createPagination();

			const bankData = await this.db.query.plaidBanks.findMany({
				orderBy,
				limit: filter.limit,
				offset,
				where: whereClause
			});

			const formattedData = bankData.map(data => {
				return {
					id: data.id,
					bankName: data.bankName,
					bankType: data.bankType,
					accountId: data.accountId.slice(-4).padStart(data.accountId.length, "*"),
					createdAt: data.createdAt
				};
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Bank account retrieved successfully",
				formattedData,
				pagination
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	private async retrieveBankAllAccounts(userId: number, sortingMethod?: string, sortBy?: string) {
		try {
			const orderBy = this.sortingHelper.applySorting(sortingMethod, sortBy);

			const bankData = await this.db.query.plaidBanks.findMany({
				orderBy,
				where: eq(plaidBanks.userId, userId)
			});

			const formattedData = bankData.map(data => {
				return {
					id: data.id,
					bankName: data.bankName,
					bankType: data.bankType,
					accountId: data.accountId.slice(-4).padStart(data.accountId.length, "*"),
					createdAt: data.createdAt
				};
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Bank account retrieved successfully",
				formattedData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveBankAccount(
		userId: number,
		accountId: string
	): Promise<ServiceApiResponse<PlaidBankSchemaType>> {
		try {
			const bankData = await this.db.query.plaidBanks.findFirst({
				where: and(eq(plaidBanks.userId, userId), eq(plaidBanks.accountId, accountId))
			});

			if (!bankData)
				return ServiceResponse.createRejectResponse(
					status.HTTP_404_NOT_FOUND,
					"Bank account not found"
				);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Bank account retrieved successfully",
				bankData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveBankAccountById(
		userId: number,
		id: number
	): Promise<ServiceApiResponse<PlaidBankSchemaType>> {
		try {
			const bankData = await this.db.query.plaidBanks.findFirst({
				where: and(eq(plaidBanks.userId, userId), eq(plaidBanks.id, id))
			});

			if (!bankData)
				return ServiceResponse.createRejectResponse(
					status.HTTP_404_NOT_FOUND,
					"Bank account not found"
				);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Bank account retrieved successfully",
				bankData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async removeBank(userId: number, id: number): Promise<ServiceApiResponse<PlaidBankSchemaType>> {
		try {
			const bankData = await this.db.query.plaidBanks.findFirst({
				where: and(eq(plaidBanks.userId, userId), eq(plaidBanks.id, id))
			});

			if (!bankData)
				return ServiceResponse.createRejectResponse(
					status.HTTP_404_NOT_FOUND,
					"Bank account not found"
				);

			await this.db.delete(plaidBanks).where(eq(plaidBanks.id, bankData.id));

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Bank account removed successfully",
				bankData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async addPlaidTransaction(
		data: CreatePlaidTransaction
	): Promise<ServiceApiResponse<PaymentSchemaType & { plaidTransactionId: number }>> {
		try {
			const plaidTransaction = await this.db.insert(plaidTransactions).values(data).returning();

			const paymentResponse = await this.paymentService.createPayment({
				userId: data.userId,
				amount: Number(data.amount),
				currency: data.isoCurrencyCode,
				transactionId: data.transactionId,
				fee: null,
				netAmount: Number(data.amount),
				description: "Payment for portfolio purchase",
				status: "COMPLETED",
				metadata: data.transactionDetails,
				portfolioId: data.portfolioId,
				type: "PLAID",
				investedShares: data.share!,
				errorMessage: null
			});

			return {
				...paymentResponse,
				data: {
					...paymentResponse.data,
					plaidTransactionId: plaidTransaction[0].id
				}
			};
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveCurrentUserTransactions(
		userId: number
	): Promise<ServiceApiResponse<PlaidTransactionSchemaType[]>> {
		try {
			const transactions = await this.db.query.plaidTransactions.findMany({
				where: eq(plaidTransactions.userId, userId),
				orderBy: desc(plaidTransactions.id)
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Transactions retrieved successfully",
				transactions
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveCurrentUserBuyingPortfolios(
		userId: number
	): Promise<ServiceApiResponse<unknown | BuyingPortfolio[]>> {
		try {
			const transactions = await this.db.query.plaidTransactions.findMany({
				where: eq(plaidTransactions.userId, userId),
				orderBy: desc(plaidTransactions.id),
				with: {
					portfolio: {
						columns: {
							id: true,
							title: true,
							slug: true,
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

			const formattedTransactions = transactions
				.map(transaction => {
					const investment = transaction.portfolio;
					if (!investment)
						return ServiceResponse.createRejectResponse(
							status.HTTP_404_NOT_FOUND,
							"Investment not found"
						);

					return {
						portfolio: {
							id: investment.id,
							title: investment.title,
							slug: investment.slug,
							image: transaction.portfolio?.featuredImage
						},
						investment: investment.title,
						shares: transaction.share || 0,
						amount: (transaction.share || 0) * (investment.sharePrice || 0)
					};
				})
				.filter(Boolean); // Remove any null entries

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Data retrieved successfully",
				formattedTransactions
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}
}
