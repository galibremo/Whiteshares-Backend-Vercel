import { Request, Response } from "express";

import AuthenticationService from "@/app/authentication/authentication.service";
import OnboardingService from "@/app/onboarding/onboarding.service";
import { OnboardingFormSchema } from "@/app/onboarding/onboarding.validator";

import { ApiController } from "@/controllers/base/api.controller";
import { ServiceApiResponse } from "@/utils/serviceApi";

export default class OnboardingController extends ApiController {
	protected onboardingService: OnboardingService;
	protected authService: AuthenticationService;

	/**
	 * Construct the controller
	 *
	 * @param request
	 * @param response
	 */
	constructor(request: Request, response: Response) {
		super(request, response);
		this.onboardingService = new OnboardingService();
		this.authService = new AuthenticationService();
	}

	async completeOnBoarding(): Promise<Response> {
		try {
			const { user } = this.request;

			const body = await this.getReqBody();

			const check = OnboardingFormSchema.safeParse(body);
			if (!check.success)
				return this.apiResponse.badResponse(
					check.error.errors.map(error => error.message).join(" ")
				);

			const userId = await this.authService.findUserById(user?.id!);

			const data = {
				userId: userId.data.id,
				...check.data,
				onboardingJsonData: check.data.onboardingData || {}
			};

			const response = await this.onboardingService.completeOnBoarding(data);

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async getOnBoardingStatus(): Promise<Response> {
		try {
			const { user } = this.request;

			const userId = await this.authService.findUserById(user?.id!);

			const response = await this.onboardingService.getOnBoardingStatus(userId.data.id);

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}
}
