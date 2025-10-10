-- Ensure pgcrypto is installed
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update encryption helpers to use PGP symmetric encryption (available in pgcrypto)
CREATE OR REPLACE FUNCTION public.encrypt_text(plain_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  encryption_key TEXT;
BEGIN
  IF plain_text IS NULL OR plain_text = '' THEN
    RETURN NULL;
  END IF;

  encryption_key := public.get_encryption_key();

  -- Use pgp_sym_encrypt with AES-256; return as base64 text
  RETURN encode(
    pgp_sym_encrypt(
      plain_text,
      encryption_key,
      'cipher-algo=aes256'
    ),
    'base64'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.decrypt_text(encrypted_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  encryption_key TEXT;
BEGIN
  IF encrypted_text IS NULL OR encrypted_text = '' THEN
    RETURN NULL;
  END IF;

  encryption_key := public.get_encryption_key();

  -- Decode from base64 and decrypt with same key/options
  RETURN pgp_sym_decrypt(
    decode(encrypted_text, 'base64'),
    encryption_key
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Decryption failed for encrypted text: %', SQLERRM;
    RETURN '[ENCRYPTED]';
END;
$function$;