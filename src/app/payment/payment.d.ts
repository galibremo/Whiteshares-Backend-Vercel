interface PaymentPortfolio {
	amount: number;
	investedShares: number;
	portfolio: {
		id: number;
		title: string;
		slug: string;
		shares: number;
		sharePrice: number;
		featuredImage: {
			id: number;
			url: string;
			secureUrl: string | null;
		} | null;
	} | null;
}

interface Capital {
	investorName: string;
	totalShareOwned: number;
	percentageOwnership: number;
}
