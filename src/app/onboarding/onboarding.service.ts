import DrizzleService from "@/databases/drizzle/service";
import { onboardingData } from "@/models/drizzle/authentication.model";
import { ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

interface OnboardingData {
	userId: number;
	accreditationStatus: boolean;
	onboardingJsonData: any;
	currentStep: number;
	complete: boolean;
}

export default class OnboardingService extends DrizzleService {
	async completeOnBoarding(data: OnboardingData) {
		try {
			const { userId, accreditationStatus, onboardingJsonData, currentStep, complete } = data;
			const response = await this.db
				.insert(onboardingData)
				.values({
					userId,
					accreditationStatus,
					onboardingJsonData,
					currentStep,
					complete
				})
				.onConflictDoUpdate({
					target: [onboardingData.userId],
					set: { complete, onboardingJsonData, accreditationStatus, currentStep }
				})
				.returning();

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Onboarding completed",
				response[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async getOnBoardingStatus(userId: number) {
		try {
			const response = await this.db.query.onboardingData.findFirst({
				where: (table, { eq }) => eq(table.userId, userId)
			});

			if (!response) {
				return ServiceResponse.createResponse(status.HTTP_200_OK, "Onboarding not found", {
					complete: false
				});
			}

			return ServiceResponse.createResponse(status.HTTP_200_OK, "Onboarding found", response);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}
}
