import { Request, Response } from "express";
import { z } from "zod";

import MediaService from "@/app/media/media.service";

import { ApiController } from "@/controllers/base/api.controller";
import { ServiceApiResponse } from "@/utils/serviceApi";

const MediaSchema = z.record(z.string(), z.union([z.string().optional(), z.instanceof(File)]));

interface FileResult {
	fileName: string;
	success: boolean;
	error?: string;
	fileData?: {
		name: string;
		size: number;
		type: string;
	};
}

export default class MediaController extends ApiController {
	protected mediaService: MediaService;
	private readonly acceptableTypes = [
		"image/jpeg",
		"image/jpg",
		"image/png",
		"image/gif",
		"image/webp"
	];

	constructor(request: Request, response: Response) {
		super(request, response);
		this.mediaService = new MediaService();
	}

	async index(): Promise<Response> {
		try {
			const response = await this.mediaService.retrieve();
			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async upload(): Promise<Response> {
		try {
			const files = this.request.files as Express.Multer.File[];

			if (!files || files.length === 0) {
				return this.response.status(400).json({ message: "No files uploaded" });
			}

			// Convert Multer files to the expected `Files[]` format
			const processedFiles = files.map(file => ({
				file: new File([file.buffer], file.originalname, { type: file.mimetype }),
				fileName: file.originalname
			}));

			// Upload to Cloudinary and store metadata
			const uploadResult = await this.mediaService.uploadFile(processedFiles);

			// Map the result for frontend success/error matching
			const responseData =
				uploadResult.data?.map(result => ({
					fileName: result.fileName,
					success: true,
					url: result.url
				})) || [];

			// Build formatted response
			const formattedData = uploadResult.data.map(item => {
				const ext = item.mimeType;
				const name = item.fileName.replace(/\.[^/.]+$/, ""); // remove extension
				return {
					fileName: name,
					success: true,
					fileData: {
						name,
						size: item.fileSize,
						type: ext
					}
				};
			});

			return this.apiResponse.successResponse(
				`${responseData.length} file${responseData.length !== 1 ? "s" : ""} uploaded successfully`,
				formattedData
			);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async delete(): Promise<Response> {
		try {
			const { params } = this.request;

			const response = await this.mediaService.deleteFile(Number(params.id));

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	/**
	 * Extract files from form data
	 */
	private extractFilesFromFormData(data: Record<string, string | File | undefined>): {
		files: Array<{ file: File; fileName: string }>;
	} {
		const files: Array<{ file: File; fileName: string }> = [];

		Object.keys(data).forEach(key => {
			if (key.startsWith("file_")) {
				const fileIndex = key.split("_")[1];
				const file = data[key] as File;
				const fileFileName = data[`fileName_${fileIndex}`] as string;

				if (file !== undefined) {
					const fileName = fileFileName !== "" ? fileFileName : file.name;
					files.push({ file, fileName });
				}
			}
		});

		return { files };
	}

	/**
	 * Validate files for type and size constraints
	 */
	private validateFiles(files: Array<{ file: File; fileName: string }>): {
		validatedFiles: Array<{ file: File; fileName: string }>;
		invalidResults: FileResult[];
	} {
		const validatedFiles: Array<{ file: File; fileName: string }> = [];
		const invalidResults: FileResult[] = [];
		const maxSize = (Number(process.env.NEXT_PUBLIC_MAX_IMAGE_SIZE_MB) || 10) * 1024 * 1024;

		for (const { file, fileName } of files) {
			// Validate file type
			if (!this.acceptableTypes.includes(file.type)) {
				invalidResults.push({
					fileName,
					success: false,
					error: `File type not allowed: ${file.type}`
				});
				continue;
			}

			// Validate file size
			if (file.size > maxSize) {
				invalidResults.push({
					fileName,
					success: false,
					error: `File too large: ${fileName} (max size: ${maxSize / (1024 * 1024)}MB)`
				});
				continue;
			}

			// File is valid
			validatedFiles.push({ file, fileName });
		}

		return { validatedFiles, invalidResults };
	}
}
