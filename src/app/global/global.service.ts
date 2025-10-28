import { SQL, and, count, eq, gte, ilike, lte, or } from "drizzle-orm";

import { ContactQuerySchemaType, NewsletterQuerySchemaType } from "@/app/global/global.validator";

import PaginationManager from "@/core/pagination";
import { SortingHelper } from "@/core/sortingHelper";
import DrizzleService from "@/databases/drizzle/service";
import { ContactSchemaType, NewsletterSchemaType } from "@/databases/drizzle/types";
import { contact, newsletter } from "@/models/drizzle/global.model";
import { ServiceApiResponse, ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

export default class GlobalService extends DrizzleService {
	private readonly contactSortingHelper: SortingHelper<typeof contact>;
	private readonly newsletterSortingHelper: SortingHelper<typeof newsletter>;

	constructor() {
		super();
		this.contactSortingHelper = new SortingHelper(contact);
		this.newsletterSortingHelper = new SortingHelper(newsletter);
	}

	async contactForm(
		data: Omit<ContactSchemaType, "id" | "createdAt" | "updatedAt">
	): Promise<ServiceApiResponse<ContactSchemaType>> {
		try {
			const createdData = await this.db.insert(contact).values(data).returning();

			return ServiceResponse.createResponse(
				status.HTTP_201_CREATED,
				"Contact form submitted successfully",
				createdData[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveContact(
		filter: ContactQuerySchemaType
	): Promise<ServiceApiResponse<ContactSchemaType[]>> {
		try {
			const orderBy = this.contactSortingHelper.applySorting(filter.sortingMethod, filter.sortBy);

			// Create date objects from string inputs if they exist
			const fromDate = filter.from ? new Date(filter.from) : undefined;
			const toDate = filter.to ? new Date(filter.to) : undefined;

			// If toDate exists, set it to the end of the day
			if (toDate) {
				toDate.setHours(23, 59, 59, 999);
			}

			const conditions = [
				filter.search
					? and(
							ilike(contact.name, `%${filter.search}%`),
							or(ilike(contact.email, `%${filter.search}%`)),
							or(ilike(contact.message, `%${filter.search}%`))
						)
					: undefined,
				fromDate ? gte(contact.createdAt, fromDate) : undefined,
				toDate ? lte(contact.createdAt, toDate) : undefined
			].filter(Boolean);

			const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

			if (!filter.page || !filter.limit) {
				return await this.retrieveAllContact(whereClause, filter.sortingMethod, filter.sortBy);
			}

			const totalItems = await this.db
				.select({
					count: count()
				})
				.from(contact)
				.where(whereClause)
				.then(result => result[0].count);

			const { pagination, offset } = new PaginationManager(
				filter.page,
				filter.limit,
				totalItems
			).createPagination();

			const contacts = await this.db.query.contact.findMany({
				where: whereClause,
				limit: filter.limit ? filter.limit : undefined,
				offset: filter.limit ? offset : undefined,
				orderBy
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Contacts retrieved successfully",
				contacts,
				pagination
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveAllContact(
		whereClause?: SQL<unknown>,
		sortingMethod?: string,
		sortBy?: string
	): Promise<ServiceApiResponse<ContactSchemaType[]>> {
		try {
			const orderBy = this.contactSortingHelper.applySorting(sortingMethod, sortBy);

			const contacts = await this.db.query.contact.findMany({
				where: whereClause,
				orderBy
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Contacts retrieved successfully",
				contacts
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async newsletterForm(
		data: Omit<NewsletterSchemaType, "id" | "createdAt" | "updatedAt">
	): Promise<ServiceApiResponse<NewsletterSchemaType>> {
		try {
			const existingSubscription = await this.db.query.newsletter.findFirst({
				where: eq(newsletter.email, data.email)
			});

			if (existingSubscription) {
				return ServiceResponse.createRejectResponse(
					status.HTTP_409_CONFLICT,
					"Email already subscribed to the newsletter"
				);
			}

			const createdData = await this.db.insert(newsletter).values(data).returning();

			return ServiceResponse.createResponse(
				status.HTTP_201_CREATED,
				"Newsletter subscription successful",
				createdData[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveNewsletter(
		filter: NewsletterQuerySchemaType
	): Promise<ServiceApiResponse<NewsletterSchemaType[]>> {
		try {
			const orderBy = this.newsletterSortingHelper.applySorting(
				filter.sortingMethod,
				filter.sortBy
			);

			// Create date objects from string inputs if they exist
			const fromDate = filter.from ? new Date(filter.from) : undefined;
			const toDate = filter.to ? new Date(filter.to) : undefined;

			// If toDate exists, set it to the end of the day
			if (toDate) {
				toDate.setHours(23, 59, 59, 999);
			}

			const conditions = [
				filter.search ? ilike(newsletter.email, `%${filter.search}%`) : undefined,
				fromDate ? gte(newsletter.createdAt, fromDate) : undefined,
				toDate ? lte(newsletter.createdAt, toDate) : undefined
			].filter(Boolean);

			const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

			if (!filter.page || !filter.limit) {
				return await this.retrieveAllNewsletter(whereClause, filter.sortingMethod, filter.sortBy);
			}

			const totalItems = await this.db
				.select({
					count: count()
				})
				.from(newsletter)
				.where(whereClause)
				.then(result => result[0].count);

			const { pagination, offset } = new PaginationManager(
				filter.page,
				filter.limit,
				totalItems
			).createPagination();

			const newsletters = await this.db.query.newsletter.findMany({
				where: whereClause,
				limit: filter.limit ? filter.limit : undefined,
				offset: filter.limit ? offset : undefined,
				orderBy
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Newsletters retrieved successfully",
				newsletters,
				pagination
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveAllNewsletter(
		whereClause?: SQL<unknown>,
		sortingMethod?: string,
		sortBy?: string
	): Promise<ServiceApiResponse<NewsletterSchemaType[]>> {
		try {
			const orderBy = this.newsletterSortingHelper.applySorting(sortingMethod, sortBy);

			const newsletters = await this.db.query.newsletter.findMany({
				where: whereClause,
				orderBy
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Newsletters retrieved successfully",
				newsletters
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async deleteOneNewsletter(id: number): Promise<ServiceApiResponse<boolean>> {
		try {
			await this.db.delete(newsletter).where(eq(newsletter.id, id)).returning();

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Newsletter deleted successfully",
				true
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async deleteOneContact(id: number): Promise<ServiceApiResponse<boolean>> {
		try {
			await this.db.delete(contact).where(eq(contact.id, id)).returning();

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Contact deleted successfully",
				true
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async deleteAllOrDeleteManyContact(ids?: number[]): Promise<ServiceApiResponse<boolean>> {
		try {
			if (ids && ids.length > 0) {
				await this.db
					.delete(contact)
					.where(or(...ids.map(id => eq(contact.id, id))))
					.returning();

				return ServiceResponse.createResponse(
					status.HTTP_200_OK,
					"Contacts deleted successfully",
					true
				);
			} else {
				await this.db.delete(contact).returning();

				return ServiceResponse.createResponse(
					status.HTTP_200_OK,
					"All contacts deleted successfully",
					true
				);
			}
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async deleteAllOrDeleteManyNewsletter(ids?: number[]): Promise<ServiceApiResponse<boolean>> {
		try {
			if (ids && ids.length > 0) {
				await this.db
					.delete(newsletter)
					.where(or(...ids.map(id => eq(newsletter.id, id))))
					.returning();

				return ServiceResponse.createResponse(
					status.HTTP_200_OK,
					"Newsletters deleted successfully",
					true
				);
			} else {
				await this.db.delete(newsletter).returning();

				return ServiceResponse.createResponse(
					status.HTTP_200_OK,
					"All newsletters deleted successfully",
					true
				);
			}
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}
}
