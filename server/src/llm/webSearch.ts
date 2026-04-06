async function tavilySearch(query: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return '';

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        max_results: 5,
      }),
    });

    if (!response.ok) return '';
    const data = await response.json() as any;

    return data.results?.map((r: any) =>
      `[${r.title}](${r.url})\n${r.content}`
    ).join('\n\n') || '';
  } catch {
    return '';
  }
}

async function serpApiSearch(query: string): Promise<string> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return '';

  try {
    const url = new URL('https://serpapi.com/search');
    url.searchParams.set('q', query);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('num', '5');

    const response = await fetch(url.toString());
    if (!response.ok) return '';

    const data = await response.json() as any;
    return data.organic_results?.map((r: any) =>
      `[${r.title}](${r.link})\n${r.snippet}`
    ).join('\n\n') || '';
  } catch {
    return '';
  }
}

export async function runWebSearches(companyName: string): Promise<string> {
  const searchFn = process.env.WEB_SEARCH_PROVIDER === 'serpapi' ? serpApiSearch : tavilySearch;

  const queries = [
    `${companyName} site:reddit.com engineering problems OR tech challenges`,
    `${companyName} engineering blog OR tech blog`,
    `${companyName} site:linkedin.com recent news OR announcement`,
    `${companyName} HackerNews`,
    `${companyName} tech stack migration OR scaling challenges OR incident OR outage 2024 2025`,
    `${companyName} job descriptions backend OR infrastructure OR data engineering 2024 2025`,
  ];

  const results = await Promise.all(queries.map(q => searchFn(q)));
  const combined = results
    .filter(r => r.length > 0)
    .map((r, i) => `### Search ${i + 1}: ${queries[i]}\n${r}`)
    .join('\n\n');

  return combined;
}
