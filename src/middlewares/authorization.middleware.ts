import { NextFunction, Request, Response } from "express";

import { ApiResponse } from "@/utils/serviceApi";

export default class AuthorizationMiddleware {
	protected req: Request;
	protected res: Response;
	protected next: NextFunction;
	protected apiResponse: ApiResponse;

	constructor(req: Request, res: Response, next: NextFunction) {
		this.req = req;
		this.res = res;
		this.next = next;
		this.apiResponse = new ApiResponse(res);
	}

	async isAdmin() {
		try {
			const { user } = this.req;

			if (!user) {
				this.apiResponse.unauthorizedResponse("Unauthorized: No user found");
				return;
			}

			if (user.role !== "ADMIN") {
				this.apiResponse.unauthorizedResponse("Unauthorized: Not an admin");
				return;
			}

			this.next();
		} catch (error) {
			console.error("Authorization middleware error:", error);
			this.apiResponse.unauthorizedResponse("Unauthorized");
			return;
		}
	}
}
