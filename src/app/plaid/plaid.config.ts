import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

const configuration = new Configuration({
	basePath: PlaidEnvironments[process.env.PLAID_ENV || "sandbox"],
	baseOptions: {
		headers: {
			"PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID || "",
			"PLAID-SECRET": process.env.PLAID_SECRET || "",
			"Plaid-Version": "2020-09-14"
		}
	}
});

const plaidClient = new PlaidApi(configuration);

export default plaidClient;
