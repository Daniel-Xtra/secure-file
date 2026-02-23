import { Injectable } from '@nestjs/common';
import { Readable, PassThrough } from 'stream';
import * as muhammara from 'muhammara';
import archiver from 'archiver';
import { nanoid } from 'nanoid';

// Register archiver-zip-encrypted
// Note: archiver-zip-encrypted is used as a format for archiver
const registerZipEncrypted = require('archiver-zip-encrypted');
archiver.registerFormat('zip-encrypted', registerZipEncrypted);

export interface EncryptionResult {
    stream: Readable;
    password: string;
    filename: string;
    contentType: string;
}

@Injectable()
export class FileService {
    async encryptFile(file: Express.Multer.File, password?: string): Promise<EncryptionResult> {
        const encryptionPassword = password || nanoid(12);

        if (file.mimetype === 'application/pdf') {
            return this.encryptPdf(file, encryptionPassword);
        } else {
            return this.encryptOtherFile(file, encryptionPassword);
        }
    }

    private async encryptPdf(file: Express.Multer.File, password: string): Promise<EncryptionResult> {
        const outStream = new PassThrough();


        const encryptionOptions = {
            userPassword: password,
            ownerPassword: password,
            userProtectionFlag: 4,
        };

        const writer = muhammara.createWriter(
            new muhammara.PDFStreamForResponse(outStream),
            {
                ...encryptionOptions,
            }
        );

        const inputStream = new muhammara.PDFRStreamForBuffer(file.buffer);
        const copyingContext = writer.createPDFCopyingContext(inputStream);

        const pageCount = copyingContext.getSourceDocumentParser(inputStream).getPagesCount();
        for (let i = 0; i < pageCount; i++) {
            copyingContext.appendPDFPageFromPDF(i);
        }

        writer.end();
        outStream.end();

        return {
            stream: outStream,
            password: password,
            filename: `${file.originalname}`,
            contentType: 'application/pdf',
        };
    }

    private async encryptOtherFile(file: Express.Multer.File, password: string): Promise<EncryptionResult> {
        const archive = archiver('zip-encrypted' as any, {
            zlib: { level: 9 },
            encryptionMethod: 'zip20',
            password: password,
        } as any);

        archive.on('error', (err) => {
            console.error('Archive error:', err);
        });

        archive.append(file.buffer, { name: file.originalname });
        archive.finalize();

        return {
            stream: archive as any,
            password: password,
            filename: `${file.originalname}.zip`,
            contentType: 'application/zip',
        };
    }
}
