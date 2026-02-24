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
import { createFileInterceptor, SingleFileValidationInterceptor } from '../../utils/file-upload.helper';
import { UploadFileDto } from './file.dto';

@Controller('secure')
export class FileController {
    constructor(private readonly fileService: FileService) { }

    @Post('')
    @UseInterceptors(createFileInterceptor('file', 1), new SingleFileValidationInterceptor())
    async lockFile(
        @UploadedFile() file: Express.Multer.File,
        @Body() payload: UploadFileDto,
        @Res() res: Response,
    ) {

        const result = await this.fileService.encryptFile(file, payload.password);

        res.set({
            'Content-Type': result.contentType,
            'Content-Disposition': `attachment; filename="${result.filename}"`,
            'X-Secure-Password': result.password,
        });

        result.stream.pipe(res);
    }
}
