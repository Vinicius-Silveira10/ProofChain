import { execSync } from 'child_process';
import { config } from 'dotenv';
import path from 'path';

export default async () => {
  config({ path: path.resolve(__dirname, '../../.env') });
  
  if (!process.env.DATABASE_URL_TEST) {
    throw new Error('DATABASE_URL_TEST is missing');
  }

  console.log('\\n🚀 Running Prisma Migrations on Test Database...');
  
  // Set DATABASE_URL to DATABASE_URL_TEST so prisma cli uses the test db
  const testEnv = { ...process.env, DATABASE_URL: process.env.DATABASE_URL_TEST };
  
  execSync('npx prisma migrate deploy', { env: testEnv, stdio: 'inherit' });
};
