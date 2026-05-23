import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(__dirname, '../../.env') });
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
