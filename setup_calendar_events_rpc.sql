-- Atomisk, autoriseret mutation af firmaets kalender-events.
--
-- Kalenderaftaler ligger i carpenters.raw_data.calendar_events på FIRMA-EJERENS
-- række. Tidligere kunne kun ejeren skrive der (RLS), så menige medarbejdere kunne
-- ikke oprette aftaler. Denne funktion kører SECURITY DEFINER (omgår RLS) MEN tjekker
-- selv at kalderen tilhører firmaet — og fjerner + tilføjer i én sætning, så samtidige
-- skrivninger ikke overskriver hinanden.
--
-- Rediger/slet-regler (egne events / kun mester) håndhæves i frontend; her sikrer vi
-- blot at man overhovedet hører til firmaet.

create or replace function mutate_calendar_events(
    p_company_id text,
    p_remove_ids text[]  default '{}',
    p_add        jsonb   default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_result jsonb;
begin
    -- Autorisation: kalderen skal være ejer af eller ansat i firmaet.
    if not exists (
        select 1 from carpenters c
        where c.id = auth.uid()
          and (c.id::text = p_company_id or c.company_id::text = p_company_id)
    ) then
        raise exception 'Ingen adgang til denne kalender';
    end if;

    update carpenters
       set raw_data = jsonb_set(
             coalesce(raw_data, '{}'::jsonb),
             '{calendar_events}',
             coalesce(
               (select jsonb_agg(e)
                  from jsonb_array_elements(coalesce(raw_data->'calendar_events', '[]'::jsonb)) e
                 where not ((e->>'id') = any(p_remove_ids))),
               '[]'::jsonb
             ) || coalesce(p_add, '[]'::jsonb)
           )
     where id::text = p_company_id
     returning raw_data->'calendar_events' into v_result;

    return coalesce(v_result, '[]'::jsonb);
end;
$$;

grant execute on function mutate_calendar_events(text, text[], jsonb) to authenticated;
