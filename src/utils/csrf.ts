import { doubleCsrf } from "csrf-csrf";

import { csrfTimeout } from "@/core/constants";
import AppHelpers from "@/utils/appHelpers";

const { generateCsrfToken, validateRequest, doubleCsrfProtection, invalidCsrfTokenError } =
	doubleCsrf({
		getSecret: () => process.env.SECRET,
		getSessionIdentifier: () => process.env.SECRET,
		cookieName: "csrf-token",
		cookieOptions: {
			maxAge: csrfTimeout,
			sameSite: AppHelpers.sameSiteCookieConfig().sameSite,
			secure: AppHelpers.sameSiteCookieConfig().secure,
			...(AppHelpers.sameSiteCookieConfig().domain && {
				domain: AppHelpers.sameSiteCookieConfig().domain
			})
		},
		size: 32,
		errorConfig: {
			message: "Invalid CSRF token"
		},
		getCsrfTokenFromRequest: req => {
			// Check both lowercase and uppercase variants
			const token = req.headers["x-csrf-token"] || req.headers["X-CSRF-Token"];
			// Return the token as a string (handle array case)
			return Array.isArray(token) ? token[0] : token || "";
		}
	});

export { doubleCsrfProtection, generateCsrfToken, invalidCsrfTokenError, validateRequest };
