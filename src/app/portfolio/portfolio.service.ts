import { and, count, eq, gte, ilike, inArray, lte } from "drizzle-orm";

import AuthenticationService from "@/app/authentication/authentication.service";
import { PortfolioQuerySchemaType } from "@/app/portfolio/portfolio.validator";

import PaginationManager from "@/core/pagination";
import { SortingHelper } from "@/core/sortingHelper";
import DrizzleService from "@/databases/drizzle/service";
import { InvestmentSchemaType, PortfolioSchemaType } from "@/databases/drizzle/types";
import { investments, portfolioGalleryImages, portfolios } from "@/models/drizzle/portfolio.model";
import { ServiceApiResponse, ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

export default class PortfolioService extends DrizzleService {
	private readonly sortingHelper: SortingHelper<typeof portfolios>;
	protected authService: AuthenticationService;

	/**
	 * Constructor
	 */
	constructor() {
		super();
		this.sortingHelper = new SortingHelper(portfolios);
		this.authService = new AuthenticationService();
	}
	/**
	 * Validates a slug for uniqueness and modifies it if necessary
	 * @param slug The slug to validate
	 * @param excludeId Optional portfolio ID to exclude from the uniqueness check (for updates)
	 * @returns A unique slug (original or modified with incremented number)
	 */
	async validateSlug(slug: string, excludeId?: number): Promise<ServiceApiResponse<string>> {
		try {
			// Check if the slug exists
			const slugExists = await this.db.query.portfolios.findFirst({
				where: eq(portfolios.slug, slug)
			});

			// If no existing slug found, or if the existing slug belongs to the portfolio being updated
			if (!slugExists || (excludeId && slugExists.id === excludeId)) {
				return ServiceResponse.createResponse(status.HTTP_200_OK, "Slug is unique", slug); // Slug is unique
			}

			// If slug exists, we need to add a number or increment existing number
			const slugBase = slug.replace(/\-\d+$/, ""); // Remove any trailing -number
			let counter = 1;

			// Extract existing number if present
			const match = slug.match(/\-(\d+)$/);
			if (match) {
				counter = parseInt(match[1], 10) + 1;
			}

			// Generate a new slug with incremented counter
			let newSlug = `${slugBase}-${counter}`; // Check if the new slug also exists, if so increment until we find a unique one
			let exists = true;
			while (exists) {
				const slugCheck = await this.db.query.portfolios.findFirst({
					where: eq(portfolios.slug, newSlug)
				});

				// If no existing slug found, or if the existing slug belongs to the portfolio being updated
				if (!slugCheck || (excludeId && slugCheck.id === excludeId)) {
					exists = false;
				} else {
					counter++;
					newSlug = `${slugBase}-${counter}`;
				}
			}

			return ServiceResponse.createResponse(status.HTTP_200_OK, "Slug is unique", newSlug); // Return the unique slug
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async createPortfolio(
		data: Omit<PortfolioSchemaType, "id" | "createdAt" | "updatedAt"> & { galleryImages: number[] }
	): Promise<ServiceApiResponse<PortfolioSchemaType>> {
		try {
			const { galleryImages, ...portfolioData } = data;
			const createdData = await this.db
				.insert(portfolios)
				.values(portfolioData)
				.returning()
				.then(result => result[0]);

			await this.db.insert(portfolioGalleryImages).values(
				galleryImages.map((imageId, index) => ({
					portfolioId: createdData.id,
					mediaId: imageId,
					displayOrder: index
				}))
			);

			if (!createdData)
				return ServiceResponse.createRejectResponse(
					status.HTTP_400_BAD_REQUEST,
					"Portfolio not created"
				);

			return ServiceResponse.createResponse(
				status.HTTP_201_CREATED,
				"Portfolio created successfully",
				createdData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrievePortfolioById(id: number): Promise<ServiceApiResponse<PortfolioSchemaType>> {
		try {
			const portfolioData = await this.db.query.portfolios.findFirst({
				where: eq(portfolios.id, id),
				with: {
					author: {
						columns: { name: true }
					},
					featuredImage: {
						columns: { id: true, secureUrl: true, fileName: true, url: true }
					},
					galleryImages: {
						columns: {},
						with: {
							media: {
								columns: { id: true, secureUrl: true, fileName: true, url: true }
							}
						}
					}
				}
			});

			if (!portfolioData)
				return ServiceResponse.createRejectResponse(
					status.HTTP_404_NOT_FOUND,
					"Portfolio not found"
				);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Portfolio retrieve successfully",
				portfolioData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrievePortfolioBySlug(slug: string): Promise<ServiceApiResponse<PortfolioSchemaType>> {
		try {
			const portfolioData = await this.db.query.portfolios.findFirst({
				where: eq(portfolios.slug, slug),
				with: {
					author: {
						columns: { name: true }
					},
					featuredImage: {
						columns: { id: true, secureUrl: true, fileName: true, url: true }
					},
					galleryImages: {
						columns: {},
						with: {
							media: {
								columns: { id: true, secureUrl: true, fileName: true, url: true }
							}
						}
					}
				}
			});

			if (!portfolioData)
				return ServiceResponse.createRejectResponse(
					status.HTTP_404_NOT_FOUND,
					"Portfolio not found"
				);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Portfolio retrieve successfully",
				portfolioData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveAllPortfolios(
		filter: PortfolioQuerySchemaType
	): Promise<ServiceApiResponse<PortfolioSchemaType[]>> {
		try {
			const orderBy = this.sortingHelper.applySorting(filter.sortingMethod, filter.sortBy);

			if (!filter.page || !filter.limit) {
				return await this.retrieveAll(filter.sortingMethod, filter.sortBy);
			}

			// Create date objects from string inputs if they exist
			const fromDate = filter.from ? new Date(filter.from) : undefined;
			const toDate = filter.to ? new Date(filter.to) : undefined;

			// If toDate exists, set it to the end of the day
			if (toDate) {
				toDate.setHours(23, 59, 59, 999);
			}

			const conditions = [
				filter.search ? ilike(portfolios.title, `%${filter.search}%`) : undefined,
				fromDate ? gte(portfolios.createdAt, fromDate) : undefined,
				toDate ? lte(portfolios.createdAt, toDate) : undefined
			].filter(Boolean);

			const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

			const totalItems = await this.db
				.select({
					count: count()
				})
				.from(portfolios)
				.where(whereClause)
				.then(result => result[0].count);

			const { pagination, offset } = new PaginationManager(
				filter.page,
				filter.limit,
				totalItems
			).createPagination();

			const portfoliosData = await this.db.query.portfolios.findMany({
				where: whereClause,
				limit: filter.limit ? filter.limit : undefined,
				offset: filter.limit ? offset : undefined,
				orderBy,
				with: {
					author: {
						columns: { name: true }
					},
					featuredImage: {
						columns: { id: true, secureUrl: true, fileName: true, url: true }
					},
					galleryImages: {
						columns: {},
						with: {
							media: {
								columns: { id: true, secureUrl: true, fileName: true, url: true }
							}
						}
					}
				}
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Portfolios retrieve successfully",
				portfoliosData,
				pagination
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	private async retrieveAll(
		sortingMethod?: string,
		sortBy?: string
	): Promise<ServiceApiResponse<PortfolioSchemaType[]>> {
		try {
			const orderBy = this.sortingHelper.applySorting(sortingMethod, sortBy);

			const portfoliosData = await this.db.query.portfolios.findMany({
				orderBy,
				with: {
					author: {
						columns: { name: true }
					},
					featuredImage: {
						columns: { id: true, secureUrl: true, fileName: true, url: true }
					},
					galleryImages: {
						columns: {},
						with: {
							media: {
								columns: { id: true, secureUrl: true, fileName: true, url: true }
							}
						}
					}
				}
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Portfolios retrieve successfully",
				portfoliosData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveAllPortfoliosIdsNamesAndSlugs(): Promise<ServiceApiResponse<PickPortfolio[]>> {
		try {
			const portfoliosData = await this.db.query.portfolios.findMany({
				columns: {
					id: true,
					title: true,
					slug: true
				}
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Portfolios retrieve successfully",
				portfoliosData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async updatePortfolio(
		id: number,
		data: Partial<PortfolioSchemaType & { galleryImages: number[] }>
	): Promise<ServiceApiResponse<PortfolioSchemaType>> {
		try {
			const updatedData = await this.db
				.update(portfolios)
				.set(data)
				.where(eq(portfolios.id, id))
				.returning()
				.then(result => result[0]);

			data.galleryImages && (await this.updatePortfolioGalleryImages(id, data.galleryImages));

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Portfolio updated successfully",
				updatedData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async updatePortfolioGalleryImages(
		id: number,
		galleryImages: number[]
	): Promise<ServiceApiResponse<PortfolioSchemaType>> {
		try {
			const existingImages = await this.db.query.portfolioGalleryImages.findMany({
				where: eq(portfolioGalleryImages.portfolioId, id)
			});

			const existingImageIds = existingImages.map(image => image.mediaId);

			const imagesToDelete = existingImageIds.filter(imageId => !galleryImages.includes(imageId));

			if (imagesToDelete.length > 0) {
				await this.db
					.delete(portfolioGalleryImages)
					.where(
						and(
							eq(portfolioGalleryImages.portfolioId, id),
							inArray(portfolioGalleryImages.mediaId, imagesToDelete)
						)
					);
			}

			const newImages = galleryImages.filter(imageId => !existingImageIds.includes(imageId));

			if (newImages.length > 0) {
				await this.db.insert(portfolioGalleryImages).values(
					newImages.map((imageId, index) => ({
						portfolioId: id,
						mediaId: imageId,
						displayOrder: index
					}))
				);
			}

			const updatedData = await this.retrievePortfolioById(id);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Portfolio gallery images updated successfully",
				updatedData.data
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async deletePortfolio(id: number): Promise<ServiceApiResponse<boolean>> {
		try {
			const deletedData = await this.db
				.delete(portfolios)
				.where(eq(portfolios.id, id))
				.returning()
				.then(result => result[0]);

			if (!deletedData)
				return ServiceResponse.createRejectResponse(
					status.HTTP_404_NOT_FOUND,
					"Portfolio not found"
				);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Portfolio deleted successfully",
				true
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async deductInvestmentAmountForPortfolio(
		userId: number,
		portfolioId: number,
		shares: number
	): Promise<ServiceApiResponse<PortfolioSchemaType>> {
		try {
			const portfolioData = await this.retrievePortfolioById(portfolioId);

			const amount = shares * portfolioData.data.sharePrice;
			const remainingShares = portfolioData.data.remainingShares - shares;
			const remainingInvestment = portfolioData.data.remainingInvestment - amount;

			const updatedPortfolio = await this.db
				.update(portfolios)
				.set({
					remainingShares,
					remainingInvestment
				})
				.where(eq(portfolios.id, portfolioId))
				.returning();

			await this.addInvestment(userId, shares, portfolioData.data.sharePrice, amount, portfolioId);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Portfolio investment amount deducted successfully",
				updatedPortfolio[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async addInvestment(
		userId: number,
		shares: number,
		sharePrice: number,
		totalInvestment: number,
		portfolioId: number
	): Promise<ServiceApiResponse<InvestmentSchemaType>> {
		try {
			const userData = await this.authService.findUserById(userId);

			const investedData = await this.db
				.insert(investments)
				.values({
					shares,
					sharePrice,
					totalInvestment,
					investorId: userData.data.id,
					portfolioId
				})
				.returning();

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Portfolio investment amount deducted successfully",
				investedData[0]
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async retrieveLastPortfolio(): Promise<ServiceApiResponse<PortfolioSchemaType>> {
		try {
			const portfoliosData = await this.db.query.portfolios.findFirst({
				with: {
					author: {
						columns: { name: true }
					},
					featuredImage: {
						columns: { id: true, secureUrl: true, fileName: true, url: true }
					},
					galleryImages: {
						columns: {},
						with: {
							media: {
								columns: { id: true, secureUrl: true, fileName: true, url: true }
							}
						}
					}
				}
			});

			if (!portfoliosData)
				return ServiceResponse.createRejectResponse(
					status.HTTP_404_NOT_FOUND,
					"Portfolio not found"
				);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Portfolios retrieve successfully",
				portfoliosData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}
}
