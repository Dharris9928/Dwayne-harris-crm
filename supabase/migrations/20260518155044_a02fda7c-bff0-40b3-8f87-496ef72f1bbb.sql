CREATE UNIQUE INDEX IF NOT EXISTS job_quotes_quote_number_unique 
ON public.job_quotes (quote_number) 
WHERE quote_number IS NOT NULL;