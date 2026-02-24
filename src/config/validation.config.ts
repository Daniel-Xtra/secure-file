import { ValidationPipe, BadRequestException } from '@nestjs/common';

export function createValidationConfig(): ValidationPipe {
	return new ValidationPipe({
		transform: true,
		whitelist: true,
		forbidNonWhitelisted: false,
		disableErrorMessages: process.env.NODE_ENV === 'production',
		skipMissingProperties: false,
		skipNullProperties: false,
		skipUndefinedProperties: false,
		validateCustomDecorators: true,
		exceptionFactory: (errors) => {
			const firstError = errors[0];
			const errorMessage = Object.values(firstError.constraints || {}).join(', ');

			if (process.env.NODE_ENV === 'production') {
				return new BadRequestException('Invalid request data');
			}
			return new BadRequestException(errorMessage);
		},
	});
}


