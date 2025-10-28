import { InferSelectModel } from "drizzle-orm";

import { BALANCE_TYPE, ROLE_LIST, TOKEN_LIST } from "@/databases/drizzle/lists";
import { accounts, profile, users } from "@/models/drizzle/authentication.model";
import { dataRoom } from "@/models/drizzle/dataRoom.model";
import { portfolioDividend, userDividend } from "@/models/drizzle/dividend.model";
import { contact, newsletter } from "@/models/drizzle/global.model";
import { mediaLibrary } from "@/models/drizzle/media.model";
import { cart, checkout } from "@/models/drizzle/order.model";
import { payments } from "@/models/drizzle/payment.model";
import { paypalTransactions } from "@/models/drizzle/paypal.model";
import { plaidBanks, plaidProfile, plaidTransactions } from "@/models/drizzle/plaid.model";
import { investments, portfolios } from "@/models/drizzle/portfolio.model";
import { wallet } from "@/models/drizzle/wallet.model";

export type UserSchemaType = InferSelectModel<typeof users>;
export type ProfileSchemaType = InferSelectModel<typeof profile>;
export type AccountSchemaType = InferSelectModel<typeof accounts>;
export type PlaidProfileSchemaType = InferSelectModel<typeof plaidProfile>;
export type PlaidBankSchemaType = InferSelectModel<typeof plaidBanks>;
export type PlaidTransactionSchemaType = InferSelectModel<typeof plaidTransactions>;
export type PortfolioSchemaType = InferSelectModel<typeof portfolios>;
export type InvestmentSchemaType = InferSelectModel<typeof investments>;
export type CartSchemaType = InferSelectModel<typeof cart>;
export type CheckoutSchemaType = InferSelectModel<typeof checkout>;
export type ContactSchemaType = InferSelectModel<typeof contact>;
export type NewsletterSchemaType = InferSelectModel<typeof newsletter>;
export type PortfolioDividendSchemaType = InferSelectModel<typeof portfolioDividend>;
export type UserDividendSchemaType = InferSelectModel<typeof userDividend>;
export type WalletSchemaType = InferSelectModel<typeof wallet>;
export type DividendSchemaType = InferSelectModel<typeof userDividend>;
export type PaypalTransactionSchemaType = InferSelectModel<typeof paypalTransactions>;
export type PaymentSchemaType = InferSelectModel<typeof payments>;
export type MediaLibrarySchemaType = InferSelectModel<typeof mediaLibrary>;
export type DataRoomSchemaType = InferSelectModel<typeof dataRoom>;

/**
 * Enum Schema Types
 */
export type RoleType = (typeof ROLE_LIST.enumValues)[number];
export type TokenType = (typeof TOKEN_LIST.enumValues)[number];
export type BalanceType = (typeof BALANCE_TYPE.enumValues)[number];
