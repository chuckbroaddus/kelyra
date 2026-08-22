-- Fetch a public https page and return title / description / preview image.
-- Paste in the SQL editor. Uses the http extension (no Edge Function deploy).

create extension if not exists http with schema extensions;

create or replace function public.unfurl_link(p_url text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  raw text := trim(both from coalesce(p_url, ''));
  html text := '';
  title text;
  descr text;
  img text;
  host text;
  origin text;
  res record;
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;
  if raw !~* '^https://[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+' then
    raise exception 'Need an https link';
  end if;
  if raw ~* 'localhost|127\.0\.0\.1|0\.0\.0\.0|169\.254\.|::1' then
    raise exception 'Need an https link';
  end if;

  host := substring(raw from '^https://([^/]+)');
  origin := 'https://' || host;

  begin
    select * into res from extensions.http_get(left(raw, 2000));
    html := left(coalesce(res.content, ''), 180000);
  exception when others then
    html := '';
  end;

  title := (regexp_match(html, 'property=["'']og:title["''][^>]*content=["'']([^"'']+)', 'i'))[1];
  if title is null then
    title := (regexp_match(html, 'content=["'']([^"'']+)["''][^>]*property=["'']og:title["'']', 'i'))[1];
  end if;
  if title is null then
    title := (regexp_match(html, '<title[^>]*>([^<]+)', 'i'))[1];
  end if;
  title := nullif(trim(both from replace(replace(coalesce(title, ''), '&amp;', '&'), '&nbsp;', ' ')), '');

  descr := (regexp_match(html, 'property=["'']og:description["''][^>]*content=["'']([^"'']+)', 'i'))[1];
  if descr is null then
    descr := (regexp_match(html, 'content=["'']([^"'']+)["''][^>]*property=["'']og:description["'']', 'i'))[1];
  end if;
  descr := nullif(trim(both from coalesce(descr, '')), '');

  img := (regexp_match(html, 'property=["'']og:image["''][^>]*content=["'']([^"'']+)', 'i'))[1];
  if img is null then
    img := (regexp_match(html, 'content=["'']([^"'']+)["''][^>]*property=["'']og:image["'']', 'i'))[1];
  end if;
  if img is null then
    img := (regexp_match(html, 'name=["'']twitter:image["''][^>]*content=["'']([^"'']+)', 'i'))[1];
  end if;
  if img is not null and img !~* '^https?://' then
    if left(img, 1) = '/' then
      img := origin || img;
    else
      img := origin || '/' || img;
    end if;
  end if;

  return jsonb_build_object(
    'url', raw,
    'title', coalesce(title, host),
    'description', descr,
    'image_url', img
  );
end;
$$;

grant execute on function public.unfurl_link(text) to authenticated;
