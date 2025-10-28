import { Request, Response } from "express";

import GlobalService from "@/app/global/global.service";
import {
	ContactDeleteQuerySchema,
	ContactFormSchema,
	ContactQuerySchema,
	NewsletterDeleteQuerySchema,
	NewsletterFormSchema,
	NewsletterQuerySchema
} from "@/app/global/global.validator";

import { ApiController } from "@/controllers/base/api.controller";
import { SortingHelper } from "@/core/sortingHelper";
import { contact } from "@/models/drizzle/global.model";
import sendEmail from "@/service/emailService";
import { ServiceApiResponse } from "@/utils/serviceApi";

export default class GlobalController extends ApiController {
	private readonly contactSortingHelper: SortingHelper<typeof contact>;
	private readonly newsletterSortingHelper: SortingHelper<typeof contact>;
	protected globalService: GlobalService;

	constructor(request: Request, response: Response) {
		super(request, response);
		this.contactSortingHelper = new SortingHelper(contact);
		this.newsletterSortingHelper = new SortingHelper(contact);
		this.globalService = new GlobalService();
	}

	async createContactForm(): Promise<Response> {
		try {
			const { body } = this.request;

			const check = ContactFormSchema.safeParse(body);
			if (!check.success)
				return this.apiResponse.badResponse(
					check.error.errors.map(error => error.message).join(" ")
				);

			const response = await this.globalService.contactForm(check.data);

			sendEmail({
				email: check.data.email,
				emailSubject: "Thank you for contacting us",
				template: "contactThankYouEmailTemplate",
				data: {
					name: check.data.name,
					message: check.data.message
				}
			});

			sendEmail({
				email: process.env.ADMIN_EMAIL,
				emailSubject: "New Contact Form Submission - Admin",
				template: "contactAdminEmailTemplate",
				data: {
					name: check.data.name,
					email: check.data.email,
					message: check.data.message
				}
			});

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async retrieveContact(): Promise<Response> {
		try {
			const { query } = this.request;

			const check = ContactQuerySchema(this.contactSortingHelper).safeParse(query);
			if (!check.success) {
				return this.apiResponse.badResponse(
					check.error.errors.map(error => error.message).join(" ")
				);
			}

			const response = await this.globalService.retrieveContact(check.data);
			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async deleteOneContact(): Promise<Response> {
		try {
			const { params } = this.request;

			const contactId = Number(params.id);

			const response = await this.globalService.deleteOneContact(contactId);
			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async deleteManyContact(): Promise<Response> {
		try {
			const { query } = this.request;

			const check = ContactDeleteQuerySchema.safeParse(query);
			if (!check.success) {
				return this.apiResponse.badResponse(
					check.error.errors.map(error => error.message).join(" ")
				);
			}

			const response = await this.globalService.deleteAllOrDeleteManyContact(check.data.ids);
			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async createNewsletterForm(): Promise<Response> {
		try {
			const { body } = this.request;

			const check = NewsletterFormSchema.safeParse(body);
			if (!check.success)
				return this.apiResponse.badResponse(
					check.error.errors.map(error => error.message).join(" ")
				);

			const response = await this.globalService.newsletterForm(check.data);

			sendEmail({
				email: check.data.email,
				emailSubject: "Thank you for subscribing to our newsletter",
				template: "newsletterThankYouEmailTemplate"
			});

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async retrieveNewsletter(): Promise<Response> {
		try {
			const { query } = this.request;
			const check = NewsletterQuerySchema(this.newsletterSortingHelper).safeParse(query);
			if (!check.success) {
				return this.apiResponse.badResponse(
					check.error.errors.map(error => error.message).join(" ")
				);
			}
			const response = await this.globalService.retrieveNewsletter(check.data);
			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async deleteOneNewsletter(): Promise<Response> {
		try {
			const { params } = this.request;

			const newsletterId = Number(params.id);

			const response = await this.globalService.deleteOneNewsletter(newsletterId);
			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async deleteManyNewsletter(): Promise<Response> {
		try {
			const { query } = this.request;

			const check = NewsletterDeleteQuerySchema.safeParse(query);
			if (!check.success) {
				return this.apiResponse.badResponse(
					check.error.errors.map(error => error.message).join(" ")
				);
			}

			const response = await this.globalService.deleteAllOrDeleteManyNewsletter(check.data.ids);
			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}
}
