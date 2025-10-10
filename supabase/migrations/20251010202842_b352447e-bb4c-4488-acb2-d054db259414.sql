-- Update encryption helpers to reference functions in the extensions schema explicitly and cast option to text
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

  RETURN encode(
    extensions.pgp_sym_encrypt(
      plain_text,
      encryption_key,
      'cipher-algo=aes256'::text
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

  RETURN extensions.pgp_sym_decrypt(
    decode(encrypted_text, 'base64'),
    encryption_key
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Decryption failed for encrypted text: %', SQLERRM;
    RETURN '[ENCRYPTED]';
END;
$function$;