import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    Body,
    Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileService } from './file.service';
import { createFileInterceptor, SingleFileValidationInterceptor } from '../utils/file-upload.helper';

@Controller('secure')
export class FileController {
    constructor(private readonly fileService: FileService) { }

    @Post('')
    @UseInterceptors(createFileInterceptor('file', 1), new SingleFileValidationInterceptor())
    async lockFile(
        @UploadedFile() file: Express.Multer.File,
        @Body('password') password: string,
        @Res() res: Response,
    ) {

        const result = await this.fileService.encryptFile(file, password);

        res.set({
            'Content-Type': result.contentType,
            'Content-Disposition': `attachment; filename="${result.filename}"`,
            'X-Secure-Password': result.password,
        });

        result.stream.pipe(res);
    }
}
