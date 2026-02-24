import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { BadRequestException, CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import * as secrets from './secrets';

// File upload configuration
export const FILE_UPLOAD_CONFIG = {
	MAX_FILE_SIZE: secrets.MAX_FILE_SIZE,
	ALLOWED_FILE_TYPES: secrets.ALLOWED_FILE_TYPES,
	ALLOWED_FILE_EXTENSIONS: secrets.ALLOWED_FILE_EXTENSIONS,
	MIN_FILE_SIZE: 1, // Minimum file size in bytes (1 byte to ensure file is not empty)
	// Magic numbers for file type validation (first few bytes of files)
	MAGIC_NUMBERS: {
		'image/jpeg': [0xff, 0xd8, 0xff],
		'image/jpg': [0xff, 0xd8, 0xff],
		'image/png': [0x89, 0x50, 0x4e, 0x47],
		'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [0x50, 0x4b, 0x03, 0x04], // ZIP signature for DOCX
	},
};

// File filter function to validate file types and size
export const fileFilter: MulterOptions['fileFilter'] = (req, file, callback) => {
	// Check file extension first
	const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
	if (!FILE_UPLOAD_CONFIG.ALLOWED_FILE_EXTENSIONS.includes(fileExtension)) {
		return callback(new BadRequestException(`Invalid file extension. Allowed extensions: ${FILE_UPLOAD_CONFIG.ALLOWED_FILE_EXTENSIONS.join(', ')}`), false);
	}

	// Check file mimetype
	if (!FILE_UPLOAD_CONFIG.ALLOWED_FILE_TYPES.includes(file.mimetype)) {
		return callback(new BadRequestException(`Invalid file type. Allowed types: ${FILE_UPLOAD_CONFIG.ALLOWED_FILE_EXTENSIONS.join(', ')}`), false);
	}

	callback(null, true);
};

// Custom interceptor to validate files are not empty
@Injectable()
export class FileValidationInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest();
		const files = request.files as Record<string, Express.Multer.File[]>;

		// Check if any files were uploaded
		if (!files) {
			throw new BadRequestException('No files were uploaded. Please upload at least one file.');
		}

		// Check if any of the expected file fields have files
		let hasAnyFiles = false;

		for (const [, fileArray] of Object.entries(files)) {
			if (fileArray && fileArray.length > 0) {
				hasAnyFiles = true;
			}
		}

		if (!hasAnyFiles) {
			throw new BadRequestException('No files were uploaded. Please upload at least one file.');
		}

		// Validate that uploaded files are not empty and meet requirements
		this.validateFiles(files);

		return next.handle();
	}

	private validateFiles(files: Record<string, Express.Multer.File[]>) {
		const emptyFiles: string[] = [];
		const invalidFormatFiles: string[] = [];
		const oversizedFiles: string[] = [];

		for (const [fieldName, fileArray] of Object.entries(files)) {
			if (fileArray && fileArray.length > 0) {
				for (const file of fileArray) {
					// Check if file buffer is empty or undefined
					if (!file.buffer || file.buffer.length === 0) {
						emptyFiles.push(`${fieldName}: ${file.originalname}`);
					}

					// Check if file size is too small (empty file)
					if (file.size === 0) {
						emptyFiles.push(`${fieldName}: ${file.originalname}`);
					}

					// Check file size limit
					if (file.size > FILE_UPLOAD_CONFIG.MAX_FILE_SIZE) {
						oversizedFiles.push(`${fieldName}: ${file.originalname} (${(file.size / (1024 * 1024)).toFixed(2)}MB)`);
					}

					// Check file extension first
					const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
					if (!FILE_UPLOAD_CONFIG.ALLOWED_FILE_EXTENSIONS.includes(fileExtension)) {
						invalidFormatFiles.push(`${fieldName}: ${file.originalname} (${fileExtension})`);
					}

					// Check file mimetype
					if (!FILE_UPLOAD_CONFIG.ALLOWED_FILE_TYPES.includes(file.mimetype)) {
						invalidFormatFiles.push(
							`File ${file.originalname} in field ${fieldName} has unsupported format (${file.mimetype}). Allowed formats: ${FILE_UPLOAD_CONFIG.ALLOWED_FILE_EXTENSIONS.join(', ')}`,
						);
					}

					// Enhanced Security: Magic number validation
					if (!this.validateMagicNumber(file)) {
						invalidFormatFiles.push(
							`File ${file.originalname} in field ${fieldName} failed magic number validation. File content does not match declared type.`,
						);
					}
				}
			}
		}

		// Build comprehensive error message
		const errors: string[] = [];

		if (emptyFiles.length > 0) {
			errors.push(`Empty files: ${emptyFiles.join(', ')}`);
		}

		if (invalidFormatFiles.length > 0) {
			errors.push(
				`Unsupported file formats: ${invalidFormatFiles.join(', ')}. Allowed formats: ${FILE_UPLOAD_CONFIG.ALLOWED_FILE_EXTENSIONS.join(', ')}`,
			);
		}

		if (oversizedFiles.length > 0) {
			errors.push(`Files too large: ${oversizedFiles.join(', ')}. Maximum size: ${FILE_UPLOAD_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`);
		}

		if (errors.length > 0) {
			throw new BadRequestException(`File validation failed:\n${errors.join('\n')}`);
		}
	}

	private validateMagicNumber(file: Express.Multer.File): boolean {
		const magicNumbers = FILE_UPLOAD_CONFIG.MAGIC_NUMBERS[file.mimetype as keyof typeof FILE_UPLOAD_CONFIG.MAGIC_NUMBERS];
		if (!magicNumbers) {
			// If no magic number is defined for this type (e.g., CSV), skip validation
			return true;
		}

		if (!file.buffer || file.buffer.length < magicNumbers.length) {
			return false;
		}

		// Check if the file starts with the expected magic number
		for (let i = 0; i < magicNumbers.length; i++) {
			if (file.buffer[i] !== magicNumbers[i]) {
				return false;
			}
		}

		return true;
	}
}

// Custom interceptor for single file validation
@Injectable()
export class SingleFileValidationInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest();
		const file = request.file;

		// Check if a file was uploaded
		if (!file) {
			throw new BadRequestException('A file must be uploaded');
		}

		// Validate that the uploaded file meets all requirements
		this.validateSingleFile(file, 'uploaded_file');

		return next.handle();
	}

	private validateSingleFile(file: Express.Multer.File, fieldName: string) {
		const errors: string[] = [];

		// Check if file buffer is empty or undefined
		if (!file.buffer || file.buffer.length === 0) {
			errors.push(`File ${file.originalname} in field ${fieldName} is empty`);
		}

		// Check if file size is too small (empty file)
		if (file.size === 0) {
			errors.push(`File ${file.originalname} in field ${fieldName} has zero size`);
		}

		// Check file size limit
		if (file.size > FILE_UPLOAD_CONFIG.MAX_FILE_SIZE) {
			errors.push(
				`File ${file.originalname} in field ${fieldName} is too large (${(file.size / (1024 * 1024)).toFixed(2)}MB). Maximum size: ${FILE_UPLOAD_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`,
			);
		}

		// Check file mimetype
		if (!FILE_UPLOAD_CONFIG.ALLOWED_FILE_TYPES.includes(file.mimetype)) {
			errors.push(
				`File ${file.originalname} in field ${fieldName} has unsupported format (${file.mimetype}). Allowed formats: ${FILE_UPLOAD_CONFIG.ALLOWED_FILE_EXTENSIONS.join(', ')}`,
			);
		}

		// Check file extension
		const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
		if (!FILE_UPLOAD_CONFIG.ALLOWED_FILE_EXTENSIONS.includes(fileExtension)) {
			errors.push(
				`File ${file.originalname} in field ${fieldName} has unsupported extension (${fileExtension}). Allowed extensions: ${FILE_UPLOAD_CONFIG.ALLOWED_FILE_EXTENSIONS.join(', ')}`,
			);
		}

		// Enhanced Security: Magic number validation
		if (!this.validateMagicNumber(file)) {
			errors.push(`File ${file.originalname} in field ${fieldName} failed magic number validation. File content does not match declared type.`);
		}

		if (errors.length > 0) {
			throw new BadRequestException(`File validation failed:\n${errors.join('\n')}`);
		}
	}

	private validateMagicNumber(file: Express.Multer.File): boolean {
		const magicNumbers = FILE_UPLOAD_CONFIG.MAGIC_NUMBERS[file.mimetype as keyof typeof FILE_UPLOAD_CONFIG.MAGIC_NUMBERS];
		if (!magicNumbers) {
			// If no magic number is defined for this type (e.g., CSV), skip validation
			return true;
		}

		if (!file.buffer || file.buffer.length < magicNumbers.length) {
			return false;
		}

		// Check if the file starts with the expected magic number
		for (let i = 0; i < magicNumbers.length; i++) {
			if (file.buffer[i] !== magicNumbers[i]) {
				return false;
			}
		}

		return true;
	}
}

// Function to validate uploaded files are not empty (kept for backward compatibility)
export const validateFilesNotEmpty = (files: Record<string, Express.Multer.File[]>) => {
	const emptyFiles: string[] = [];

	for (const [fieldName, fileArray] of Object.entries(files)) {
		if (fileArray && fileArray.length > 0) {
			for (const file of fileArray) {
				// Check if file buffer is empty or undefined
				if (!file.buffer || file.buffer.length === 0) {
					emptyFiles.push(`${fieldName}: ${file.originalname}`);
				}
				// Check if file size is too small (empty file)
				if (file.size === 0) {
					emptyFiles.push(`${fieldName}: ${file.originalname}`);
				}
			}
		}
	}

	if (emptyFiles.length > 0) {
		throw new BadRequestException(`The following files are empty and cannot be uploaded: ${emptyFiles.join(', ')}`);
	}
};

// Function to validate a single file is not empty (kept for backward compatibility)
export const validateSingleFileNotEmpty = (file: Express.Multer.File, fieldName: string) => {
	if (!file) {
		throw new BadRequestException(`No file provided for field: ${fieldName}`);
	}

	if (!file.buffer || file.buffer.length === 0) {
		throw new BadRequestException(`File ${file.originalname} in field ${fieldName} is empty and cannot be uploaded`);
	}

	if (file.size === 0) {
		throw new BadRequestException(`File ${file.originalname} in field ${fieldName} has zero size and cannot be uploaded`);
	}
};

// Custom FileFieldsInterceptor with file validation
export const createFileFieldsInterceptor = (fields: Array<{ name: string; maxCount?: number }>) => {
	return FileFieldsInterceptor(fields, {
		limits: {
			fileSize: FILE_UPLOAD_CONFIG.MAX_FILE_SIZE,
		},
		fileFilter,
	});
};

// Custom FileInterceptor with file validation for single file uploads
export const createFileInterceptor = (fieldName: string, maxCount: number) => {
	return FileInterceptor(fieldName, {
		limits: {
			fileSize: FILE_UPLOAD_CONFIG.MAX_FILE_SIZE,
		},
		fileFilter,
	});
};

// Error message for file size limit
export const getFileSizeError = () => `File size exceeds the maximum limit of ${FILE_UPLOAD_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`;

// Error message for file type
export const getFileTypeError = () => `Invalid file type. Allowed types: ${FILE_UPLOAD_CONFIG.ALLOWED_FILE_EXTENSIONS.join(', ')}`;

// Error message for empty file
export const getEmptyFileError = () => `File cannot be empty. Please ensure the file contains data before uploading.`;
