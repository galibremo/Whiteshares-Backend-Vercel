import { UploadApiErrorResponse, UploadApiResponse, v2 as cloudinary } from "cloudinary";
import { desc, eq } from "drizzle-orm";

import DrizzleService from "@/databases/drizzle/service";
import { MediaLibrarySchemaType } from "@/databases/drizzle/types";
import { mediaLibrary } from "@/models/drizzle/media.model";
import { ServiceApiResponse, ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

interface Files {
	file: File;
	fileName: string;
}

interface UploadApiResponseWithFileName extends UploadApiResponse {
	fileName: string;
}

interface OmittedMediaLibrarySchemaType
	extends Omit<MediaLibrarySchemaType, "id" | "createdAt" | "updatedAt"> {}

export default class MediaService extends DrizzleService {
	constructor() {
		super();
		cloudinary.config({
			cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
			api_key: process.env.CLOUDINARY_API_KEY,
			api_secret: process.env.CLOUDINARY_API_SECRET
		});
	}

	private managedData(data: UploadApiResponseWithFileName): OmittedMediaLibrarySchemaType {
		return {
			fileName: data.fileName,
			fileSize: data.bytes,
			mimeType: data.format,
			mediaType: "IMAGE",
			provider: "CLOUDINARY",
			storageId: data.asset_id,
			url: data.url,
			secureUrl: data.secure_url,
			storageMetadata: JSON.stringify(data),
			width: data.width,
			height: data.height,
			duration: 0,
			isPublic: true,
			isFeatured: false
		};
	}

	private async saveToDatabase(
		data: OmittedMediaLibrarySchemaType | OmittedMediaLibrarySchemaType[]
	): Promise<MediaLibrarySchemaType[]> {
		try {
			if (Array.isArray(data)) {
				const saveData = await this.db.insert(mediaLibrary).values(data).returning();

				return Promise.resolve(saveData);
			} else {
				const saveData = await this.db.insert(mediaLibrary).values(data).returning();

				return Promise.resolve(saveData);
			}
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	private async uploadSingleImage(
		folderName: string,
		imageUpload: Files
	): Promise<UploadApiResponseWithFileName> {
		const arrayBuffer = await imageUpload.file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		return new Promise((resolve, reject) => {
			cloudinary.uploader
				.upload_stream(
					{
						resource_type: "auto",
						folder: folderName
					},
					(error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
						if (error) {
							return reject(error);
						}
						if (result) {
							const resultWithFileName = {
								...result,
								fileName: imageUpload.fileName
							};
							return resolve(resultWithFileName);
						} else {
							return reject(new Error("Upload failed: No result returned"));
						}
					}
				)
				.end(buffer);
		});
	}

	private async deleteUploadedImage(public_id: string) {
		return new Promise(async (resolve, reject) => {
			try {
				const result = await cloudinary.uploader.destroy(public_id);

				return resolve(result);
			} catch (error: any) {
				reject(new Error(error.message));
			}
		});
	}

	async retrieve(): Promise<ServiceApiResponse<MediaLibrarySchemaType[]>> {
		try {
			const data = await this.db.query.mediaLibrary.findMany({
				orderBy: desc(mediaLibrary.createdAt)
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Media retrieved successfully",
				data
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async uploadImage(
		folderName: string,
		imageUploads: Files[]
	): Promise<OmittedMediaLibrarySchemaType[]> {
		const uploadPromises = imageUploads.map(async file => {
			const response = await this.uploadSingleImage(folderName, file);
			return this.managedData(response);
		});
		return Promise.all(uploadPromises);
	}

	async uploadFile(files: Files[]): Promise<ServiceApiResponse<MediaLibrarySchemaType[]>> {
		try {
			const uploadedFile = await this.uploadImage("Testing", files);

			const result = await this.saveToDatabase(uploadedFile);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"File uploaded successfully",
				result
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	public async deleteFile(id: number) {
		try {
			const deletedData = await this.db
				.delete(mediaLibrary)
				.where(eq(mediaLibrary.id, id))
				.returning()
				.then(data => data[0]);

			this.deleteUploadedImage((deletedData.storageMetadata as UploadApiResponse).public_id);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"File deleted successfully",
				deletedData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}
}
