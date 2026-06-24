-- ============================================================================
-- Aftaleseddel-bekræftelse via hemmeligt token (offentlig kunde-side).
-- Mirror af setup_public_quotes_rpc.sql, men bekræfter ÉN aftaleseddel inde i
-- leads.raw_data.extra_agreements[] uden at kunden kan ændre pris eller andet.
--
-- Bruges af den offentlige side /:slug/aftale/:token/:agreementId
-- (src/components/Wizard/AgreementConfirmPage.jsx).
-- get_lead_by_token findes allerede (setup_public_quotes_rpc.sql) og genbruges
-- til at HENTE sagen + aftalesedlen.
-- ============================================================================

CREATE OR REPLACE FUNCTION confirm_agreement_by_token(
  token_val UUID,
  agreement_id TEXT,
  confirm_data JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  agreements JSONB;
BEGIN
  -- Find sagens nuværende aftalesedler ud fra token.
  SELECT raw_data->'extra_agreements' INTO agreements
  FROM leads
  WHERE quote_token = token_val;

  IF agreements IS NULL THEN
    RAISE EXCEPTION 'Ingen aftalesedler fundet for dette token';
  END IF;

  -- Gendan arrayet, men sæt KUN status + confirmation på den matchende seddel.
  -- Kunden kan hverken ændre pris, titel, beskrivelse eller andre felter.
  UPDATE leads
  SET raw_data = jsonb_set(
    raw_data,
    '{extra_agreements}',
    (
      SELECT jsonb_agg(
        CASE
          WHEN elem->>'id' = agreement_id THEN
            elem
              || jsonb_build_object('status', 'bekraeftet')
              || jsonb_build_object('confirmation', COALESCE(confirm_data, jsonb_build_object('method', 'email')))
          ELSE elem
        END
      )
      FROM jsonb_array_elements(raw_data->'extra_agreements') AS elem
    )
  )
  WHERE quote_token = token_val;
END;
$$;
