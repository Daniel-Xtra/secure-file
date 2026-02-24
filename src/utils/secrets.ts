import 'dotenv/config';
import * as env from 'env-var';

export const NODE_ENV = env.get('NODE_ENV').required().asEnum(['staging', 'development', 'production', 'test']);
export const PORT = env.get('PORT').default(3200).required().asPortNumber();
export const HOST = env.get('HOST').required().asString();
export const APP_NAME = env.get('APP_NAME').required().asString();
export const ENVIRONMENT_TYPE = env.get('ENVIRONMENT_TYPE').default('staging').required().asEnum(['live', 'staging']);
export const ALLOWED_ORIGINS = env.get('ALLOWED_ORIGINS').default('*').asString();
export const MAX_FILE_SIZE = env.get('MAX_FILE_SIZE').default(3.5 * 1024 * 1024).asInt();
export const ALLOWED_FILE_TYPES = env.get('ALLOWED_FILE_TYPES').default('image/jpeg,image/jpg,image/png,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document').asArray();
export const ALLOWED_FILE_EXTENSIONS = env.get('ALLOWED_FILE_EXTENSIONS').default('.jpg,.jpeg,.png,.pdf,.csv,.docx').asArray();


