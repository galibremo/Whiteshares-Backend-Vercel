interface UserOverview {
	portfolioValue: number;
	numberOfShares: number;
	dividendGrowth: number;
	wallet: {
		balance: number;
		cashIn: number;
		cashOut: number;
	};
	totalShares: {
		amount: number; // Total shares (sold + unsold)
		sold: number; // Number of shares sold
		unsold: number; // Number of unsold shares
	};
}

interface AdminOverview {
	amountRaised: number;
	numberOfSharesSold: number;
	numberOfInvestors: number;
	averageInvestment: number;
	unsoldShares: number;
	totalShares: {
		amount: number; // Total shares (sold + unsold)
		sold: number; // Number of shares sold
		unsold: number; // Number of unsold shares
	};
}

interface InvestorWithMetrics {
	id: number;
	name: string | null;
	email: string | null;
	username: string | null;
	role: string;
	createdAt: Date;
	updatedAt: Date;
	// Individual investor metrics
	totalPurchasedShareAmount: number;
	totalPurchasedShares: number;
	totalPurchasedSharePercentage: number;
}
