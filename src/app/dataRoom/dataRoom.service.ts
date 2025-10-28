import { UploadApiErrorResponse, UploadApiResponse, v2 as cloudinary } from "cloudinary";
import { desc, eq } from "drizzle-orm";

import DrizzleService from "@/databases/drizzle/service";
import { DataRoomSchemaType } from "@/databases/drizzle/types";
import { dataRoom } from "@/models/drizzle/dataRoom.model";
import { ServiceApiResponse, ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

interface Files {
	file: File;
	fileName: string;
}

interface UploadApiResponseWithFileName extends UploadApiResponse {
	fileName: string;
}

interface OmittedDataRoomSchemaType
	extends Omit<DataRoomSchemaType, "id" | "createdAt" | "updatedAt"> {}

export default class DataRoomService extends DrizzleService {
	constructor() {
		super();
		cloudinary.config({
			cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
			api_key: process.env.CLOUDINARY_API_KEY,
			api_secret: process.env.CLOUDINARY_API_SECRET
		});
	}
	private managedData(data: UploadApiResponseWithFileName): OmittedDataRoomSchemaType {
		// Determine document type based on file format
		const getDocumentType = (format: string): string => {
			const formatMap: { [key: string]: string } = {
				pdf: "PDF",
				doc: "DOC",
				docx: "DOCX",
				xls: "XLS",
				xlsx: "XLSX",
				ppt: "PPT",
				pptx: "PPTX",
				txt: "TXT",
				csv: "CSV"
			};
			return formatMap[format.toLowerCase()] || "PDF";
		};

		return {
			fileName: data.fileName,
			fileSize: data.bytes,
			mimeType: data.format,
			documentType: getDocumentType(data.format) as any,
			provider: "CLOUDINARY",
			storageId: data.asset_id,
			url: data.url,
			secureUrl: data.secure_url,
			storageMetadata: JSON.stringify(data),
			pageCount: data.pages || null, // For PDF documents
			wordCount: null, // Could be calculated if needed
			duration: 0,
			isPublic: true,
			isFeatured: false,
			isArchived: false,
			description: null,
			tags: null,
			version: "1.0"
		};
	}

	private async saveToDatabase(
		data: OmittedDataRoomSchemaType | OmittedDataRoomSchemaType[]
	): Promise<DataRoomSchemaType[]> {
		try {
			if (Array.isArray(data)) {
				const saveData = await this.db.insert(dataRoom).values(data).returning();

				return Promise.resolve(saveData);
			} else {
				const saveData = await this.db.insert(dataRoom).values(data).returning();

				return Promise.resolve(saveData);
			}
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	private async uploadSingleDocument(
		folderName: string,
		documentUpload: Files
	): Promise<UploadApiResponseWithFileName> {
		const arrayBuffer = await documentUpload.file.arrayBuffer();
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
								fileName: documentUpload.fileName
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

	private async deleteUploadedDocument(public_id: string) {
		return new Promise(async (resolve, reject) => {
			try {
				const result = await cloudinary.uploader.destroy(public_id);

				return resolve(result);
			} catch (error: any) {
				reject(new Error(error.message));
			}
		});
	}

	async retrieve(): Promise<ServiceApiResponse<DataRoomSchemaType[]>> {
		try {
			const data = await this.db.query.dataRoom.findMany({
				orderBy: desc(dataRoom.createdAt)
			});

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"Documents retrieved successfully",
				data
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async uploadDocument(
		folderName: string,
		documentUploads: Files[]
	): Promise<OmittedDataRoomSchemaType[]> {
		const uploadPromises = documentUploads.map(async file => {
			const response = await this.uploadSingleDocument(folderName, file);
			return this.managedData(response);
		});
		return Promise.all(uploadPromises);
	}

	async uploadFile(files: Files[]): Promise<ServiceApiResponse<DataRoomSchemaType[]>> {
		try {
			const uploadedFile = await this.uploadDocument("Data Room", files);

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
				.delete(dataRoom)
				.where(eq(dataRoom.id, id))
				.returning()
				.then(data => data[0]);

			this.deleteUploadedDocument((deletedData.storageMetadata as UploadApiResponse).public_id);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"File deleted successfully",
				deletedData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}

	async updateFile(id: number, name: string): Promise<ServiceApiResponse<DataRoomSchemaType>> {
		try {
			const updatedData = await this.db
				.update(dataRoom)
				.set({ fileName: name })
				.where(eq(dataRoom.id, id))
				.returning()
				.then(data => data[0]);

			return ServiceResponse.createResponse(
				status.HTTP_200_OK,
				"File updated successfully",
				updatedData
			);
		} catch (error) {
			return ServiceResponse.createErrorResponse(error);
		}
	}
}
