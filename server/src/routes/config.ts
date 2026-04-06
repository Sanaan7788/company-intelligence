import { Router } from 'express';

export const configRouter = Router();

configRouter.get('/provider', (req, res) => {
  const provider = process.env.LLM_PROVIDER || 'deepseek';
  res.json({ provider });
});
