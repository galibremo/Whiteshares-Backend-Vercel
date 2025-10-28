export const ROLE_LIST = {
	INVESTOR: "INVESTOR",
	ADMIN: "ADMIN",
	enumValues: ["INVESTOR", "ADMIN"]
} as const;

export const TOKEN_LIST = {
	PASSWORD_RESET: "PASSWORD_RESET",
	EMAIL_VERIFICATION: "EMAIL_VERIFICATION",
	LOGIN_OTP: "LOGIN_OTP",
	enumValues: ["PASSWORD_RESET", "EMAIL_VERIFICATION", "LOGIN_OTP"]
} as const;

export const PAYMENT_METHOD_TYPE = {
	PAYPAL: "PAYPAL",
	PLAID: "PLAID",
	enumValues: ["PAYPAL", "PLAID"]
} as const;

export const PAYMENT_STATUS = {
	PENDING: "PENDING",
	PROCESSING: "PROCESSING",
	COMPLETED: "COMPLETED",
	FAILED: "FAILED",
	REFUNDED: "REFUNDED",
	CANCELED: "CANCELED",
	enumValues: ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "REFUNDED", "CANCELED"]
} as const;

export const CATEGORY_LIST = {
	PROPERTY: "PROPERTY",
	FUND: "FUND",
	enumValues: ["PROPERTY", "FUND"]
} as const;

export const BALANCE_TYPE = {
	CREDIT: "CREDIT",
	DEBIT: "DEBIT",
	enumValues: ["CREDIT", "DEBIT"]
} as const;

export const MEDIA_LIST = {
	IMAGE: "IMAGE",
	VIDEO: "VIDEO",
	AUDIO: "AUDIO",
	DOCUMENT: "DOCUMENT",
	OTHER: "OTHER",
	enumValues: ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT", "OTHER"]
} as const;

export const DATA_ROOM_LIST = {
	PDF: "PDF",
	DOC: "DOC",
	DOCX: "DOCX",
	XLS: "XLS",
	XLSX: "XLSX",
	PPT: "PPT",
	PPTX: "PPTX",
	TXT: "TXT",
	CSV: "CSV",
	enumValues: ["PDF", "DOC", "DOCX", "XLS", "XLSX", "PPT", "PPTX", "TXT", "CSV"]
} as const;

export const STORAGE_PROVIDER_LIST = {
	FIREBASE: "FIREBASE",
	CLOUDINARY: "CLOUDINARY",
	UPLOADTHING: "UPLOADTHING",
	S3: "S3",
	LOCAL: "LOCAL",
	enumValues: ["FIREBASE", "CLOUDINARY", "UPLOADTHING", "S3", "LOCAL"]
} as const;
