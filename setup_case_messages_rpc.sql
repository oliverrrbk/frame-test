-- Atomisk mutation af sags-beskeder (raw_data.case_messages på leads).
--
-- Beskeder (dagens huske-ting til holdet eller en bestemt person) gemmes i et array
-- på sagen. Flere kan skrive, så vi fjerner + tilføjer i én sætning for at undgå at
-- to skrivninger overskriver hinanden.
--
-- SECURITY INVOKER (default): RLS på leads gælder. Politikken tillader allerede ejer,
-- assigned_pm, assigned_workers og bogholder at opdatere sagen — så mester/projektleder
-- kan sende, og modtagere kan markere set.

create or replace function mutate_case_messages(
    p_lead_id    text,
    p_remove_ids text[]  default '{}',
    p_add        jsonb   default '[]'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
    v_result jsonb;
begin
    update leads
       set raw_data = jsonb_set(
             coalesce(raw_data, '{}'::jsonb),
             '{case_messages}',
             coalesce(
               (select jsonb_agg(e)
                  from jsonb_array_elements(coalesce(raw_data->'case_messages', '[]'::jsonb)) e
                 where not ((e->>'id') = any(p_remove_ids))),
               '[]'::jsonb
             ) || coalesce(p_add, '[]'::jsonb)
           )
     where id::text = p_lead_id
     returning raw_data->'case_messages' into v_result;

    return coalesce(v_result, '[]'::jsonb);
end;
$$;

grant execute on function mutate_case_messages(text, text[], jsonb) to authenticated;
