import dotenv from 'dotenv';
import path from 'path';
const envPath = path.resolve(process.cwd(), '../.env');
console.log('Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });
console.log('dotenv result:', result.error || 'OK');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
import express from 'express';
import cors from 'cors';
import { companiesRouter } from './routes/companies';
import { configRouter } from './routes/config';
import { scoringRouter } from './routes/scoring';
import { initDb } from './db';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/companies', companiesRouter);
app.use('/api/config', configRouter);
app.use('/api/scoring', scoringRouter);

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch(console.error);
