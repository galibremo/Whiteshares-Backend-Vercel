import bcrypt from "bcrypt";
import { Request, Response } from "express";

import AuthenticationService from "@/app/authentication/authentication.service";
import {
	UserChangePasswordSchema,
	UserPasswordResetOTPCheckSchema,
	UserPasswordResetSchema,
	UserProfileUpdateSchema,
	UserRegisterSchema,
	UserReverificationSchema,
	UserVerificationSchema,
	UsernameLoginSchema,
	UsernameLoginWithOTPSchema
} from "@/app/authentication/authentication.validator";
import DividendService from "@/app/dividend/dividend.service";
import WalletService from "@/app/wallet/wallet.service";

import { ApiController } from "@/controllers/base/api.controller";
import { TOKEN_LIST } from "@/databases/drizzle/lists";
import { UserSchemaType } from "@/databases/drizzle/types";
import CookieService from "@/service/cookieService";
import sendEmail from "@/service/emailService";
import OTPService from "@/service/otpService";
import { ServiceApiResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

export default class AuthenticationController extends ApiController {
	protected authenticationService: AuthenticationService;
	protected otpService: OTPService;
	protected cookieService: CookieService;
	protected walletService: WalletService;
	protected dividendService: DividendService;

	/**
	 * Construct the controller
	 *
	 * @param request
	 * @param response
	 */
	constructor(request: Request, response: Response) {
		super(request, response);
		this.authenticationService = new AuthenticationService();
		this.otpService = new OTPService();
		this.cookieService = new CookieService(request, response);
		this.walletService = new WalletService();
		this.dividendService = new DividendService();
	}

	async register(): Promise<Response> {
		try {
			const body = this.getReqBody();
			const check = UserRegisterSchema.safeParse(body);
			if (!check.success)
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join(" "));

			const extendedData: Omit<UserSchemaType, "id" | "role" | "createdAt" | "updatedAt"> = {
				...check.data,
				image: null,
				emailVerified: null,
				password: bcrypt.hashSync(check.data.password, 10)
			};

			const user = await this.authenticationService.createUser(extendedData);

			const otp = await this.otpService.saveOTPToDatabase(user.data, TOKEN_LIST.EMAIL_VERIFICATION);

			if (otp && user.data.email) {
				sendEmail({
					email: user.data.email,
					emailSubject: "Your account verification OTP",
					template: "otpEmailTemplate",
					data: {
						username: user.data.username,
						otp,
						otpExpirationTime: 5
					}
				});
			}

			return this.apiResponse.sendResponse(user);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async loginWithUsername(): Promise<Response | undefined> {
		try {
			const body = this.getReqBody();
			const check = UsernameLoginSchema.safeParse(body);
			if (!check.success) {
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join(" "));
			}

			const user = await this.authenticationService.findUserByUsernameOrEmail(check.data.username);
			await this.authenticationService.checkAccountVerification(user.data.id);
			await this.authenticationService.passwordChecker(check.data.password, user.data.password);

			const { password, ...userData } = user.data;

			const accessToken = await this.cookieService.saveCookieToBrowser(userData);

			const walletBalance = await this.walletService.retrieveWalletBalance(userData.id);

			const totalDividend = await this.dividendService.retrieveUserTotalDividendByUserId(
				userData.id
			);

			const updatedUserData = {
				...userData,
				walletBalance: walletBalance.data.balance,
				dividend: totalDividend.data
			};

			// Log the user in to establish session
			this.request.login(updatedUserData, err => {
				if (err) {
					return this.apiResponse.sendResponse({
						status: status.HTTP_500_INTERNAL_SERVER_ERROR,
						message: "Login failed"
					});
				}

				return this.apiResponse.successResponse("Login successful", {
					user: userData,
					token: accessToken
				});
			});
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async loginWithUsernameAndOTP(): Promise<Response | undefined> {
		try {
			const body = this.getReqBody();
			const check = UsernameLoginWithOTPSchema.safeParse(body);
			if (!check.success) {
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join(" "));
			}

			const user = await this.authenticationService.findUserByUsernameOrEmail(check.data.username);
			await this.authenticationService.checkAccountVerification(user.data.id);
			await this.authenticationService.passwordChecker(check.data.password, user.data.password);

			const { password, ...userData } = user.data;

			await this.otpService.verifyOTPFromDatabase(
				userData,
				String(check.data.otp),
				TOKEN_LIST.LOGIN_OTP
			);

			const accessToken = await this.cookieService.saveCookieToBrowser(userData);

			const walletBalance = await this.walletService.retrieveWalletBalance(userData.id);

			const totalDividend = await this.dividendService.retrieveUserTotalDividendByUserId(
				userData.id
			);

			const updatedUserData = {
				...userData,
				walletBalance: walletBalance.data.balance,
				dividend: totalDividend.data
			};

			// Log the user in to establish session
			this.request.login(updatedUserData, err => {
				if (err) {
					return this.apiResponse.sendResponse({
						status: status.HTTP_500_INTERNAL_SERVER_ERROR,
						message: "Login failed"
					});
				}

				return this.apiResponse.successResponse("Login successful", {
					user: userData,
					token: accessToken
				});
			});
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async loginWithGoogle(): Promise<Response | void> {
		try {
			const { user } = this.request;

			await this.cookieService.saveCookieToBrowser(user!);

			const appUrl = process.env.APP_URL + "?success=Google";

			return this.response.redirect(appUrl);

			// return this.apiResponse.successResponse("Login successful", {
			// 	user: user,
			// 	token: accessToken
			// });
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async logout(): Promise<Response | undefined> {
		try {
			this.request.session.destroy(err => {
				if (err) {
					return this.apiResponse.sendResponse({
						status: status.HTTP_500_INTERNAL_SERVER_ERROR,
						message: "Error logging out"
					});
				}
				this.cookieService.clearCookieFromBrowser();
				return this.apiResponse.successResponse("Logged out");
			});
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getSession(): Promise<Response> {
		try {
			const user = this.request.user;
			if (!user) return this.apiResponse.successResponse("Unauthorized");

			const walletBalance = await this.walletService.retrieveWalletBalance(user.id);

			const totalDividend = await this.dividendService.retrieveUserTotalDividendByUserId(user.id);

			const userData = {
				...user,
				walletBalance: walletBalance.data.balance,
				dividend: totalDividend.data
			};

			return this.apiResponse.successResponse("Authorized", userData);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async verifySession(): Promise<Response> {
		try {
			return this.apiResponse.successResponse("Authorized");
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async checkAccountVerification(): Promise<Response> {
		try {
			const user = this.request.user;

			if (!user?.emailVerified) {
				this.request.session.destroy(err => {
					if (err) {
						return this.apiResponse.sendResponse({
							status: status.HTTP_500_INTERNAL_SERVER_ERROR,
							message: "Error logging out"
						});
					}
					this.cookieService.clearCookieFromBrowser();
					return this.apiResponse.unauthorizedResponse("Unauthorized: Account is not verified");
				});
				return this.apiResponse.unauthorizedResponse("Unauthorized: Account is not verified");
			}

			return this.apiResponse.successResponse("User is verified");
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async checkUser(): Promise<Response> {
		try {
			const { body } = this.request;
			const check = UsernameLoginSchema.safeParse(body);
			if (!check.success)
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join(" "));

			const user = await this.authenticationService.findUserByUsernameOrEmail(check.data.username);

			await this.authenticationService.passwordChecker(check.data.password, user.data.password);

			// TODO: Remove password from user data after finishing the development
			let otp: number | ServiceApiResponse<unknown> | undefined;

			if (check.data.otp) {
				await this.authenticationService.checkAccountVerification(user.data?.id!);
				otp = await this.otpService.saveOTPToDatabase(user.data, TOKEN_LIST.LOGIN_OTP);

				if (otp && user.data.email) {
					sendEmail({
						email: user.data.email,
						emailSubject: "Login OTP",
						template: "otpEmailTemplate",
						data: {
							username: user.data?.username,
							otp,
							otpExpirationTime: 5
						}
					});
				}
			}

			return this.apiResponse.successResponse("User found", otp);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async verifyUser(): Promise<Response> {
		try {
			const { body } = this.request;
			const check = UserVerificationSchema.safeParse(body);
			if (!check.success)
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join(" "));

			const user = await this.authenticationService.findUserByUsernameOrEmail(check.data.username);

			await this.otpService.verifyOTPFromDatabase(
				user.data,
				String(check.data.otp),
				TOKEN_LIST.EMAIL_VERIFICATION
			);
			await this.authenticationService.accountVerification(user.data.id);

			return this.apiResponse.successResponse("User verified");
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getProfile(): Promise<Response> {
		try {
			const { user } = this.request;

			const userData = await this.authenticationService.retrieveUserProfile(user?.id!);

			return this.apiResponse.sendResponse(userData);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async updateProfile(): Promise<Response> {
		try {
			const { body, user } = this.request;
			const check = UserProfileUpdateSchema.safeParse(body);
			if (!check.success)
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join(" "));

			const userData = await this.authenticationService.updateUserProfile(user?.id!, check.data);

			return this.apiResponse.sendResponse(userData);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async resetPassword(): Promise<Response> {
		try {
			const { body } = this.request;
			if (!body.email) return this.apiResponse.badResponse("Email is required");

			const user = await this.authenticationService.findUserByEmail(body.email);

			const otp = await this.otpService.saveOTPToDatabase(user.data, TOKEN_LIST.PASSWORD_RESET);

			if (otp && user.data.email) {
				sendEmail({
					email: user.data.email,
					emailSubject: "Your password reset OTP",
					template: "otpEmailTemplate",
					data: {
						username: user.data?.username,
						otp,
						otpExpirationTime: 5
					}
				});
			}

			return this.apiResponse.successResponse("Password reset OTP sent");
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async resetPasswordOTPCheck(): Promise<Response> {
		try {
			const { body } = this.request;
			const check = UserPasswordResetOTPCheckSchema.safeParse(body);
			if (!check.success)
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join(" "));

			const user = await this.authenticationService.findUserByUsernameOrEmail(check.data.email);

			await this.authenticationService.checkAccountVerification(user.data.id);

			await this.otpService.checkOTPInDatabase(
				user.data,
				String(check.data.otp),
				TOKEN_LIST.PASSWORD_RESET
			);

			return this.apiResponse.successResponse("OTP verified");
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async resetPasswordConfirm(): Promise<Response> {
		try {
			const { body } = this.request;
			const check = UserPasswordResetSchema.safeParse(body);
			if (!check.success)
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join(" "));

			const user = await this.authenticationService.findUserByEmail(check.data.email);

			await this.otpService.verifyOTPFromDatabase(
				user.data,
				String(check.data.otp),
				TOKEN_LIST.PASSWORD_RESET
			);
			await this.authenticationService.changePassword(user.data.id, check.data.password);

			return this.apiResponse.successResponse("User password reset");
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async changePassword(): Promise<Response> {
		try {
			const { body, user: UserData } = this.request;
			const check = UserChangePasswordSchema.safeParse(body);
			if (!check.success)
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join(" "));

			const user = await this.authenticationService.findUserById(UserData?.id!, true);

			await this.authenticationService.passwordChecker(check.data.oldPassword, user.data.password);
			const response = await this.authenticationService.changePassword(
				user.data.id,
				check.data.newPassword
			);

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async requestOTPForUnverifiedUser(): Promise<Response> {
		try {
			const { body } = this.request;
			const check = UserReverificationSchema.safeParse(body);
			if (!check.success)
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join(" "));

			const user = await this.authenticationService.findUserByUsernameOrEmail(check.data.username);

			if (user.data.emailVerified) return this.apiResponse.badResponse("User is already verified");

			const otp = await this.otpService.saveOTPToDatabase(user.data, TOKEN_LIST.EMAIL_VERIFICATION);

			if (otp && user.data.email) {
				sendEmail({
					email: user.data.email,
					emailSubject: "Your account verification OTP",
					template: "otpEmailTemplate",
					data: {
						username: user.data?.username,
						otp,
						otpExpirationTime: 5
					}
				});
			}

			return this.apiResponse.successResponse("OTP sent");
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async uploadAvatar(): Promise<Response> {
		try {
			const { body, user } = this.request;

			if (!body.avatarUrl) return this.apiResponse.badResponse("Avatar is required");

			const response = await this.authenticationService.uploadAvatar(user?.id!, body.avatarUrl);

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}
}
