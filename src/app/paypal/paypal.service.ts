import axios from "axios";
import { eq } from "drizzle-orm";

import OrderService from "@/app/order/order.service";
import PaymentService from "@/app/payment/payment.service";
import PortfolioService from "@/app/portfolio/portfolio.service";

import DrizzleService from "@/databases/drizzle/service";
import { PaypalTransactionSchemaType } from "@/databases/drizzle/types";
import { paypalTransactions } from "@/models/drizzle/paypal.model";
import { ServiceApiResponse, ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

export default class PaypalService extends DrizzleService {
	readonly orderService: OrderService;
	private readonly portfolioService: PortfolioService;
	private readonly paymentService: PaymentService;

	/**
	 * Construct the service
	 */
	constructor() {
		super();
		this.orderService = new OrderService();
		this.portfolioService = new PortfolioService();
		this.paymentService = new PaymentService();
	}

	private async generatePaypalToken(): Promise<ServiceApiResponse<PayPalTokenResponse>> {
		try {
			const url = process.env.PAYPAL_API_URL + "/v1/oauth2/token";
			const response = await axios({
				url,
				method: "post",
				data: "grant_type=client_credentials",
				auth: {
					username: process.env.PAYPAL_CLIENT_ID,
					password: process.env.PAYPAL_CLIENT_SECRET
				}
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Token generated successfully",
				response.data
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async createOrder(userId: number): Promise<ServiceApiResponse<string>> {
		try {
			const cartData = await this.orderService.retrieveCart(userId);
			const portfolioData = await this.portfolioService.retrievePortfolioById(
				cartData.data.portfolioId
			);
			const accessToken = await this.generatePaypalToken();

			// Calculate the total amount and force two decimal places.
			const computedAmount = cartData.data.shares * portfolioData.data.sharePrice;
			const amount = computedAmount.toFixed(2); // e.g. "100.00"

			return await axios<PaypalOrderResponse>({
				url: process.env.PAYPAL_API_URL + "/v2/checkout/orders",
				method: "post",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer " + accessToken.data.access_token
				},
				data: JSON.stringify({
					intent: "CAPTURE",
					purchase_units: [
						{
							items: [
								{
									name: portfolioData.data.title,
									description: portfolioData.data.title,
									quantity: cartData.data.shares,
									unit_amount: {
										currency_code: "USD",
										value: portfolioData.data.sharePrice.toFixed(2) // ensure proper formatting
									}
								}
							],
							amount: {
								currency_code: "USD",
								value: amount,
								breakdown: {
									item_total: {
										currency_code: "USD",
										value: amount
									}
								}
							}
						}
					],
					application_context: {
						return_url:
							process.env.API_URL + "/paypal/order/complete" + "?cartId=" + cartData.data.id,
						cancel_url: process.env.API_URL + "/paypal/order/cancel",
						shipping_preference: "NO_SHIPPING",
						user_action: "PAY_NOW",
						brand_name: "Homevest.io"
					}
				})
			})
				.then(response => {
					const responseData = response.data;

					return ServiceResponse.createResponse(
						status.HTTP_200_OK,
						"Order created successfully",
						responseData.id
					);
				})
				.catch(error => {
					console.error("Error creating PayPal order:", error.response.data);
					return ServiceResponse.createRejectResponse(
						status.HTTP_500_INTERNAL_SERVER_ERROR,
						"Error creating PayPal order"
					);
				});
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async capturePayment(
		userId: number,
		token: string,
		portfolioId: number
	): Promise<ServiceApiResponse<PaypalTransactionSchemaType & { paymentId: number }>> {
		try {
			const accessToken = await this.generatePaypalToken();

			const response = await axios({
				url: process.env.PAYPAL_API_URL + "/v2/checkout/orders/" + token + "/capture",
				method: "post",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer " + accessToken.data.access_token
				}
			});

			const responseData = response.data as PaymentCaptureResponse["data"];

			const transactionObj = {
				userId,
				payerId: responseData.payer.payer_id,
				portfolioId,
				currency: responseData.purchase_units[0].payments.captures[0].amount.currency_code,
				grossAmount:
					responseData.purchase_units[0].payments.captures[0].seller_receivable_breakdown
						.gross_amount.value,
				transactionId: responseData.id,
				netAmount:
					responseData.purchase_units[0].payments.captures[0].seller_receivable_breakdown.net_amount
						.value,
				paypalFee:
					responseData.purchase_units[0].payments.captures[0].seller_receivable_breakdown.paypal_fee
						.value,
				transactionDetails: JSON.stringify(responseData)
			};

			const transactionData = await this.createTransaction(transactionObj);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Payment captured successfully",
				transactionData.data
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrievePaypalOrderId(
		paypalOrderId: number
	): Promise<ServiceApiResponse<PaypalTransactionSchemaType>> {
		try {
			const orderData = await this.db.query.paypalTransactions.findFirst({
				where: eq(paypalTransactions.id, paypalOrderId)
			});

			if (!orderData) {
				return ServiceResponse.createRejectResponse(
					status.HTTP_404_NOT_FOUND,
					"Transaction not found"
				);
			}

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Transaction retrieved successfully",
				orderData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	private async createTransaction(
		data: Omit<PaypalTransactionSchemaType, "id" | "createdAt" | "updatedAt">
	): Promise<ServiceApiResponse<PaypalTransactionSchemaType & { paymentId: number }>> {
		try {
			const createdData = await this.db.insert(paypalTransactions).values(data).returning();

			const portfolioData = await this.portfolioService.retrievePortfolioById(data.portfolioId!);

			const investedShares = Number(data.grossAmount) / portfolioData.data.sharePrice;

			const paymentData = await this.paymentService.createPayment({
				userId: data.userId,
				amount: Number(data.grossAmount),
				currency: data.currency,
				transactionId: data.transactionId,
				fee: Number(data.paypalFee),
				netAmount: Number(data.netAmount),
				description: "Payment for portfolio purchase",
				status: "COMPLETED",
				metadata: data.transactionDetails,
				portfolioId: data.portfolioId,
				type: "PAYPAL",
				investedShares,
				errorMessage: null
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Transaction created successfully",
				{ ...createdData[0], paymentId: paymentData.data.id }
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}
}
