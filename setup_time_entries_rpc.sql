-- Atomisk mutation af time_entries-arrayet i raw_data (på leads og carpenters).
--
-- BAGGRUND: Tidsregistrering skete tidligere som "read-modify-write" i klienten
-- (læs raw_data -> push i JS -> skriv hele arrayet tilbage). Når to brugere
-- registrerede på samme sag samtidigt, overskrev den sidste skrivning den første
-- (lost update). Denne funktion udfører fjernelse + tilføjelse i ÉN UPDATE-sætning,
-- så Postgres serialiserer samtidige skrivninger til samme række på rækkelåsen og
-- ingen registreringer går tabt.
--
-- SECURITY INVOKER (default): funktionen kører som den kaldende bruger, så de
-- eksisterende RLS-politikker på leads/carpenters gælder uændret.

create or replace function mutate_time_entries(
    p_table      text,
    p_id         text,
    p_remove_ids text[]  default '{}',
    p_add        jsonb   default '[]'::jsonb
)
returns jsonb
language plpgsql
as $$
declare
    v_result jsonb;
begin
    if p_table not in ('leads', 'carpenters') then
        raise exception 'Ugyldig tabel: %', p_table;
    end if;

    if p_table = 'leads' then
        update leads
           set raw_data = jsonb_set(
                 coalesce(raw_data, '{}'::jsonb),
                 '{time_entries}',
                 coalesce(
                   (select jsonb_agg(e)
                      from jsonb_array_elements(coalesce(raw_data->'time_entries', '[]'::jsonb)) e
                     where not ((e->>'id') = any(p_remove_ids))),
                   '[]'::jsonb
                 ) || coalesce(p_add, '[]'::jsonb)
               )
         where id::text = p_id
         returning raw_data->'time_entries' into v_result;
    else
        update carpenters
           set raw_data = jsonb_set(
                 coalesce(raw_data, '{}'::jsonb),
                 '{time_entries}',
                 coalesce(
                   (select jsonb_agg(e)
                      from jsonb_array_elements(coalesce(raw_data->'time_entries', '[]'::jsonb)) e
                     where not ((e->>'id') = any(p_remove_ids))),
                   '[]'::jsonb
                 ) || coalesce(p_add, '[]'::jsonb)
               )
         where id::text = p_id
         returning raw_data->'time_entries' into v_result;
    end if;

    return coalesce(v_result, '[]'::jsonb);
end;
$$;

grant execute on function mutate_time_entries(text, text, text[], jsonb) to authenticated;
