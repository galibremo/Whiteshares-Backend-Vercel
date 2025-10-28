import { Request, Response } from "express";

import UserService from "@/app/user/user.service";
import {
	UserCreateSchema,
	UserQuerySchema,
	UserUpdatePasswordSchema
} from "@/app/user/user.validator";

import { ApiController } from "@/controllers/base/api.controller";
import { SortingHelper } from "@/core/sortingHelper";
import { UserSchemaType } from "@/databases/drizzle/types";
import { users } from "@/models/drizzle/authentication.model";
import { ServiceApiResponse } from "@/utils/serviceApi";

export default class UserController extends ApiController {
	private readonly sortingHelper: SortingHelper<typeof users>;
	protected userService: UserService;

	/**
	 * Constructor initializes the UserController class
	 * @param request
	 * @param response
	 */
	constructor(request: Request, response: Response) {
		super(request, response);
		this.sortingHelper = new SortingHelper(users);
		this.userService = new UserService();
	}

	async index(): Promise<Response> {
		try {
			const { query } = this.request;

			const check = UserQuerySchema(this.sortingHelper).safeParse(query);
			if (!check.success) {
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join(" "));
			}

			const response = await this.userService.retrieve(check.data);

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async show(): Promise<Response> {
		try {
			const { params } = this.request;
			const userId = Number(params.id);

			if (isNaN(userId)) {
				return this.apiResponse.badResponse("Invalid user ID");
			}

			const response = await this.userService.retrieveOne(userId);

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async create(): Promise<Response> {
		try {
			const { body } = this.request;

			const check = UserCreateSchema.safeParse(body);
			if (!check.success) {
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join(" "));
			}

			const payload: Omit<UserSchemaType, "id" | "createdAt" | "updatedAt"> = {
				...check.data,
				emailVerified: check.data.emailVerified ? new Date() : null,
				password: null,
				image: null
			};

			const response = await this.userService.create(payload);

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async update(): Promise<Response> {
		try {
			const { params, body } = this.request;
			const userId = Number(params.id);

			if (isNaN(userId)) {
				return this.apiResponse.badResponse("Invalid user ID");
			}

			const check = UserCreateSchema.safeParse(body);
			if (!check.success) {
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join(" "));
			}

			const payload: Omit<UserSchemaType, "id" | "emailVerified" | "createdAt" | "updatedAt"> & {
				emailVerified: boolean;
			} = {
				...check.data,
				password: null,
				image: null
			};

			const response = await this.userService.update(userId, payload);

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async delete(): Promise<Response> {
		try {
			const { params } = this.request;
			const userId = Number(params.id);

			if (isNaN(userId)) {
				return this.apiResponse.badResponse("Invalid user ID");
			}

			const response = await this.userService.delete(userId);

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async destroy(): Promise<Response> {
		try {
			const { query } = this.request;
			const ids = query.ids ? (Array.isArray(query.ids) ? query.ids : [query.ids]) : [];

			const parsedIds = ids.map(id => Number(id)).filter(id => !isNaN(id));

			const response = await this.userService.deleteAll(parsedIds);
			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async updatePassword(): Promise<Response> {
		try {
			const { body } = this.request;

			const check = UserUpdatePasswordSchema.safeParse(body);
			if (!check.success) {
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join(" "));
			}

			const response = await this.userService.updatePassword(
				check.data.userId,
				check.data.password
			);

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async overview(): Promise<Response> {
		try {
			const userId = Number(this.request.user?.id);
			const response = await this.userService.overview(userId);

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async adminOverview(): Promise<Response> {
		try {
			const response = await this.userService.adminOverview();

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async investors(): Promise<Response> {
		try {
			const { query } = this.request;

			const check = UserQuerySchema(this.sortingHelper).safeParse(query);
			if (!check.success) {
				return this.apiResponse.badResponse(check.error.errors.map(err => err.message).join(" "));
			}

			const response = await this.userService.retrieveInvestors(check.data);

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}
}
