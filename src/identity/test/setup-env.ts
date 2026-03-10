import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

const envTestPath = path.join(process.cwd(), '.env.test');

if (fs.existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath });
}

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '') {
  process.env.JWT_SECRET = 'test-jwt-secret';
}
