update public.site_settings set value=replace(value::text,'موبك','موبِك')::jsonb where key='storefront';
update public.cms_pages set title=replace(title::text,'موبك','موبِك')::jsonb,body=replace(body::text,'موبك','موبِك')::jsonb,seo=replace(seo::text,'موبك','موبِك')::jsonb;
