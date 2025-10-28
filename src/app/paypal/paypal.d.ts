interface PayPalTokenResponse {
	scope: string;
	access_token: string;
	token_type: string;
	app_id: string;
	expires_in: number;
	nonce: string;
}

interface PaypalOrderLink {
	href: string;
	rel: string;
	method: string;
}

interface PaypalOrderResponse {
	id: string;
	status: string;
	links: PaypalOrderLink[];
}

interface PaymentCaptureResponse {
	status: number;
	message: string;
	data: {
		id: string;
		status: string;
		payment_source: {
			paypal: {
				email_address: string;
				account_id: string;
				account_status: string;
				name: {
					given_name: string;
					surname: string;
				};
				address: {
					country_code: string;
				};
			};
		};
		purchase_units: Array<{
			reference_id: string;
			payments: {
				captures: Array<{
					id: string;
					status: string;
					amount: {
						currency_code: string;
						value: string;
					};
					final_capture: boolean;
					seller_protection: {
						status: string;
						dispute_categories: string[];
					};
					seller_receivable_breakdown: {
						gross_amount: {
							currency_code: string;
							value: string;
						};
						paypal_fee: {
							currency_code: string;
							value: string;
						};
						net_amount: {
							currency_code: string;
							value: string;
						};
					};
					links: Array<{
						href: string;
						rel: string;
						method: string;
					}>;
					create_time: string;
					update_time: string;
				}>;
			};
		}>;
		payer: {
			name: {
				given_name: string;
				surname: string;
			};
			email_address: string;
			payer_id: string;
			address: {
				country_code: string;
			};
		};
		links: Array<{
			href: string;
			rel: string;
			method: string;
		}>;
	};
}
