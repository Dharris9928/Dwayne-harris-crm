-- Add conversation_active column to company_communications table
ALTER TABLE public.company_communications
ADD COLUMN conversation_active boolean DEFAULT true;

-- Add index for better query performance on conversation_active
CREATE INDEX idx_company_communications_conversation_active 
ON public.company_communications(conversation_active);

-- Add comment to explain the column
COMMENT ON COLUMN public.company_communications.conversation_active IS 'Indicates if this communication is part of an active/ongoing conversation';
