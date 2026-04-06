import { Router } from 'express';
import { getTokenStats } from '../llm/tokenCounter';

export const configRouter = Router();

configRouter.get('/provider', (req, res) => {
  const provider = process.env.LLM_PROVIDER || 'deepseek';
  res.json({ provider });
});

configRouter.get('/tokens', (req, res) => {
  res.json(getTokenStats());
});
