
import { IsString, IsEmail, IsOptional, IsEnum, MinLength, MaxLength, Matches, IsObject, IsUUID, IsIP, IsNotEmpty } from 'class-validator';

export class UploadFileDto {
    @IsString()
    @MinLength(8, { message: 'Password should be at least 8 characters long' })
    @MaxLength(20, { message: 'Password should not exceed 20 characters' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).+$/, {
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    })
    password: string;
}