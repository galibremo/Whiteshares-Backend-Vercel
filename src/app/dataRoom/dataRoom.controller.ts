import { Request, Response } from "express";
import { z } from "zod";

import DataRoomService from "@/app/dataRoom/dataRoom.service";

import { ApiController } from "@/controllers/base/api.controller";
import { ServiceApiResponse } from "@/utils/serviceApi";

const DataRoomSchema = z.record(z.string(), z.union([z.string().optional(), z.instanceof(File)]));

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

export default class DataRoomController extends ApiController {
	protected dataRoomService: DataRoomService;
	private readonly acceptableTypes = [
		"application/pdf",
		"application/msword",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		"application/vnd.ms-excel",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		"application/vnd.ms-powerpoint",
		"application/vnd.openxmlformats-officedocument.presentationml.presentation",
		"text/plain",
		"text/csv"
	];

	constructor(request: Request, response: Response) {
		super(request, response);
		this.dataRoomService = new DataRoomService();
	}

	async index(): Promise<Response> {
		try {
			const response = await this.dataRoomService.retrieve();
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
			const uploadResult = await this.dataRoomService.uploadFile(processedFiles);

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

	async update(): Promise<Response> {
		try {
			const { params, body } = this.request;

			if (!body.name) return this.apiResponse.badResponse("File name is required");

			const response = await this.dataRoomService.updateFile(Number(params.id), body.name);

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}

	async delete(): Promise<Response> {
		try {
			const { params } = this.request;

			const response = await this.dataRoomService.deleteFile(Number(params.id));

			return this.apiResponse.sendResponse(response);
		} catch (error) {
			return this.apiResponse.sendResponse(error as ServiceApiResponse<unknown>);
		}
	}
}
