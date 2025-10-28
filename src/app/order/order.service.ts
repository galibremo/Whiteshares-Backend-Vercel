import { and, eq } from "drizzle-orm";
import {
	ACHClass,
	CountryCode,
	LinkTokenCreateRequest,
	Products,
	TransferIntentCreateMode,
	TransferIntentCreateNetwork,
	TransferIntentCreateRequest,
	TransferIntentGet
} from "plaid";

import AuthenticationService from "@/app/authentication/authentication.service";
import { CheckoutResponse } from "@/app/order/order.type";
import plaidClient from "@/app/plaid/plaid.config";
import PlaidService from "@/app/plaid/plaid.service";
import PortfolioService from "@/app/portfolio/portfolio.service";

import DrizzleService from "@/databases/drizzle/service";
import {
	CartSchemaType,
	CheckoutSchemaType,
	PaymentSchemaType,
	PortfolioSchemaType,
	UserSchemaType
} from "@/databases/drizzle/types";
import { cart, checkout } from "@/models/drizzle/order.model";
import { plaidBanks } from "@/models/drizzle/plaid.model";
import { ServiceApiResponse, ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

interface CartRetrieveType extends Omit<CartSchemaType, "bankAccountDetails"> {
	bankAccountNumber: string;
}

interface CartSchemaWithPortfolioType extends CartSchemaType {
	portfolio: PortfolioSchemaType;
}

export default class OrderService extends DrizzleService {
	protected portfolioService: PortfolioService;
	protected plaidService: PlaidService;
	protected authService: AuthenticationService;

	constructor() {
		super();
		this.portfolioService = new PortfolioService();
		this.plaidService = new PlaidService();
		this.authService = new AuthenticationService();
	}

	async cart(
		userId: number,
		portfolioId: number,
		shares: number
	): Promise<ServiceApiResponse<CartSchemaType>> {
		try {
			const cartResponse = await this.portfolioCart(userId, portfolioId, shares);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Cart created successfully",
				cartResponse.data
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async updateCartItemQuantity(
		userId: number,
		shares: number,
		updateStatus: "INCREMENT" | "DECREMENT"
	): Promise<ServiceApiResponse<CartSchemaType>> {
		try {
			const cartItem = await this.checkUserCartExistence(userId);

			if (cartItem.data.portfolio.shares < cartItem.data.shares + shares) {
				return ServiceResponse.createRejectResponse(
					status.HTTP_400_BAD_REQUEST,
					"Shares cannot be less than the current shares in the cart"
				);
			}

			if (updateStatus === "INCREMENT") {
				shares = cartItem.data.shares + shares;
			} else if (updateStatus === "DECREMENT") {
				shares = cartItem.data.shares - shares;
			}

			if (shares <= 0) {
				return ServiceResponse.createRejectResponse(
					status.HTTP_400_BAD_REQUEST,
					"Shares cannot be less than or equal to zero"
				);
			}

			const cartData = await this.db
				.update(cart)
				.set({
					shares
				})
				.returning()
				.where(eq(cart.userId, userId))
				.then(res => res[0]);

			const cartDataWithPortfolio = {
				...cartData,
				portfolio: cartItem.data.portfolio
			};

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Cart updated successfully",
				cartDataWithPortfolio
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async checkUserCartExistence(
		userId: number
	): Promise<ServiceApiResponse<CartSchemaWithPortfolioType>> {
		try {
			const cartData = await this.db.query.cart.findFirst({
				where: eq(cart.userId, userId),
				with: {
					portfolio: {
						with: {
							featuredImage: { columns: { id: true, secureUrl: true, url: true, fileName: true } }
						}
					}
				}
			});

			if (!cartData)
				return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Cart not found");

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Cart retrieved successfully",
				cartData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async removeCart(userId: number): Promise<ServiceApiResponse<boolean>> {
		try {
			await this.db.delete(cart).where(eq(cart.userId, userId));

			return ServiceResponse.createResponse(status.HTTP_200_OK, "Cart removed successfully", true);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async addBankAccountToCart(
		userId: number,
		accountId: number
	): Promise<ServiceApiResponse<boolean>> {
		try {
			const userBankDetails = await this.plaidService.retrieveBankAccountById(userId, accountId);

			const { bankData, ...bankAccountDetails } = userBankDetails.data;

			await this.db
				.update(cart)
				.set({
					bankAccountId: userBankDetails.data.id,
					bankAccountDetails: bankAccountDetails
				})
				.where(eq(cart.userId, userId))
				.returning();

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Bank account added to cart successfully",
				true
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveCart(userId: number): Promise<ServiceApiResponse<CartRetrieveType>> {
		try {
			const cartData = await this.db.query.cart.findFirst({
				where: eq(cart.userId, userId),
				with: {
					portfolio: {
						with: {
							featuredImage: { columns: { id: true, secureUrl: true, url: true } }
						}
					}
				}
			});

			if (!cartData)
				return ServiceResponse.createRejectResponse(status.HTTP_204_NO_DATA, "Cart not found");

			const { bankAccountDetails, ...cartDetails } = cartData!;

			const cartResponse = {
				...cartDetails,
				bankName: (cartData?.bankAccountDetails as any)?.bankName,
				bankAccountNumber: (cartData?.bankAccountDetails as any)?.accountId
					.slice(-4)
					.padStart((cartData?.bankAccountDetails as any)?.accountId.length, "*")
			};

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Cart retrieved successfully",
				cartResponse
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveCartByCartId(cartId: number): Promise<ServiceApiResponse<CartSchemaType>> {
		try {
			const cartData = await this.db.query.cart.findFirst({
				where: eq(cart.id, cartId),
				with: {
					portfolio: true
				}
			});

			if (!cartData)
				return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Cart not found");

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Cart retrieved successfully",
				cartData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	private async portfolioCart(
		userId: number,
		portfolioId: number,
		shares: number
	): Promise<ServiceApiResponse<CartSchemaType>> {
		try {
			await this.portfolioService.retrievePortfolioById(portfolioId);

			const createCart = await this.db
				.insert(cart)
				.values({
					userId,
					portfolioId,
					shares
				})
				.onConflictDoUpdate({
					target: [cart.userId],
					set: {
						portfolioId,
						shares
					}
				})
				.returning();

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Cart created successfully",
				createCart[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async checkout(userId: number, id: number): Promise<ServiceApiResponse<CheckoutResponse>> {
		try {
			const checkoutResponse = await this.portfolioCheckout(userId, id);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Checkout successful",
				checkoutResponse.data
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	private async portfolioCheckout(
		userId: number,
		id: number
	): Promise<ServiceApiResponse<CheckoutResponse>> {
		try {
			const user = await this.authService.findUserById(userId);
			const cartData = await this.db.query.cart.findFirst({
				where: eq(cart.userId, userId)
			});

			if (!cartData)
				return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Cart not found");

			const portfolioData = await this.portfolioService.retrievePortfolioById(cartData.portfolioId);

			const amount = portfolioData.data?.sharePrice! * cartData?.shares;

			const portfolioAmount = String(amount.toFixed(2));

			const intentCreateObject = this.createTransferIntent(
				user.data,
				portfolioData.data,
				cartData,
				portfolioAmount
			);

			const userBankDetails = await this.db.query.plaidBanks.findFirst({
				where: and(eq(plaidBanks.userId, userId), eq(plaidBanks.id, id))
			});

			if (userBankDetails) {
				intentCreateObject.account_id = userBankDetails.accountId;
			}

			const intendId = await this.createPlaidTransferIntent(intentCreateObject);

			const linkTokenResponse = await this.generateLinkToken(
				userId,
				user.data?.name!,
				intendId.data,
				userBankDetails?.accessToken
			);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Checkout successful",
				linkTokenResponse.data
			);
		} catch (error) {
			console.log(error);
			return ServiceResponse.createErrorResponse(error);
		}
	}

	private async generateLinkToken(
		userId: number,
		username: string,
		intentId: string,
		accessToken?: string
	): Promise<ServiceApiResponse<CheckoutResponse>> {
		try {
			const linkTokenCreateObject: LinkTokenCreateRequest = {
				user: {
					client_user_id: String(userId),
					legal_name: username
				},
				products: [Products.Transfer],
				transfer: {
					intent_id: intentId
				},
				client_name: process.env.PLAID_CLIENT_NAME,
				language: "en",
				country_codes: [CountryCode.Us]
			};

			if (accessToken) {
				linkTokenCreateObject.access_token = accessToken;
			}

			const plaidResponse = await plaidClient.linkTokenCreate(linkTokenCreateObject);

			const response = {
				linkToken: plaidResponse.data.link_token,
				intentId: intentId
			};

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Link token generated successfully",
				response
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async completeOrder(
		userId: number,
		intentId: string
	): Promise<ServiceApiResponse<PaymentSchemaType>> {
		try {
			const response = await plaidClient.transferIntentGet({
				transfer_intent_id: intentId
			});
			const intentData = response.data.transfer_intent;

			if (intentData.metadata?.portfolioId) return this.portfolioCompleteOrder(userId, intentData);

			return ServiceResponse.createRejectResponse(status.HTTP_400_BAD_REQUEST, "Order failed");
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	private async portfolioCompleteOrder(
		userId: number,
		intentData: TransferIntentGet
	): Promise<ServiceApiResponse<PaymentSchemaType>> {
		try {
			await this.authService.findUserById(userId);
			const cartData = await this.db.query.cart.findFirst({
				where: eq(cart.userId, userId)
			});

			if (!cartData)
				return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Cart not found");

			const portfolioData = await this.portfolioService.retrievePortfolioById(cartData.portfolioId);

			const plaidTransactionData = await this.createPlaidTransaction(
				intentData,
				userId,
				cartData,
				cartData.portfolioId
			);

			const checkoutData = await this.createCheckout(userId, cartData, portfolioData.data, {
				plaidTransactionId: plaidTransactionData.data.plaidTransactionId
			});

			await this.cleanupOrder(userId, cartData.portfolioId, cartData.shares);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Order completed successfully",
				plaidTransactionData.data
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	private createTransferIntent(
		user: UserSchemaType,
		portfolio: PortfolioSchemaType,
		cart: CartSchemaType,
		amount: string
	): TransferIntentCreateRequest {
		return {
			mode: TransferIntentCreateMode.Payment,
			user: {
				legal_name: user.name!,
				email_address: user.email!
			},
			amount: amount,
			description: "Investment",
			ach_class: ACHClass.Web,
			iso_currency_code: "USD",
			network: TransferIntentCreateNetwork.SameDayAch,
			metadata: {
				portfolioId: String(portfolio.id),
				portfolioName: portfolio.title,
				portfolioShares: String(cart.shares),
				portfolioSharePrice: String(portfolio.sharePrice!),
				portfolioTotalInvestment: amount
			}
		};
	}

	private async createPlaidTransferIntent(
		intentCreateObject: TransferIntentCreateRequest
	): Promise<ServiceApiResponse<string>> {
		try {
			const response = await plaidClient.transferIntentCreate(intentCreateObject);
			if (!response.data.transfer_intent.id)
				return ServiceResponse.createRejectResponse(status.HTTP_400_BAD_REQUEST, "Order failed");

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Transfer intent created successfully",
				response.data.transfer_intent.id
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	private async createPlaidTransaction(
		intentData: TransferIntentGet,
		userId: number,
		cart: CartSchemaType,
		portfolioId: number
	): Promise<ServiceApiResponse<PaymentSchemaType & { plaidTransactionId: number }>> {
		return await this.plaidService.addPlaidTransaction({
			transactionId: intentData.id,
			userId,
			achClass: intentData.ach_class!,
			amount: intentData.amount,
			share: cart.shares,
			authorizationDecision: intentData.authorization_decision,
			description: intentData.description,
			authorizationDecisionRationale: intentData.authorization_decision_rationale,
			failureReason: String(intentData.failure_reason),
			fundingAccountId: intentData.funding_account_id,
			guaranteeDecision: intentData.guarantee_decision,
			isoCurrencyCode: intentData.iso_currency_code,
			mode: intentData.mode,
			network: intentData.network!,
			guaranteeDecisionRationale: String(intentData.guarantee_decision_rationale),
			originationAccountId: intentData.origination_account_id,
			status: intentData.status,
			transferId: intentData.transfer_id,
			metadata: intentData.metadata,
			portfolioId,
			transactionDetails: intentData
		});
	}

	private async createCheckout(
		userId: number,
		cart: CartSchemaType,
		portfolioData: PortfolioSchemaType,
		transactionId: { plaidTransactionId?: number; paypalTransactionId?: number }
	): Promise<ServiceApiResponse<CheckoutSchemaType>> {
		try {
			const createdData = await this.db
				.insert(checkout)
				.values({
					userId,
					portfolioId: cart.portfolioId,
					portfolioDetails: portfolioData,
					bankAccountId: cart.bankAccountId,
					bankAccountDetails: cart.bankAccountDetails,
					shares: cart.shares,
					plaidTransactionId: transactionId.plaidTransactionId,
					paypalTransactionId: transactionId.paypalTransactionId
				})
				.returning();

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Checkout successful",
				createdData[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	private async cleanupOrder(userId: number, portfolioId: number, shares: number): Promise<void> {
		await this.portfolioService.deductInvestmentAmountForPortfolio(userId, portfolioId, shares);
		await this.db.delete(cart).where(eq(cart.userId, userId));
	}

	async completeOrderUsingPaypal(
		userId: number,
		cartData: CartSchemaType,
		portfolioData: PortfolioSchemaType,
		paypalTransactionId: number
	): Promise<ServiceApiResponse<Boolean>> {
		try {
			await this.createCheckout(userId, cartData, portfolioData, {
				paypalTransactionId
			});

			await this.cleanupOrder(userId, cartData.portfolioId, cartData.shares);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Order completed successfully",
				true
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}
}
