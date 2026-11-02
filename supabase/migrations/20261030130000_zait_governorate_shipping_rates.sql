-- Import the 27 Egyptian governorate delivery rates used by Zait Store.
-- Normal delivery keeps each governorate's Zait price; express delivery is 150 EGP.
with rates(governorate, normal_amount) as (
  values
    ('Cairo', 9000),
    ('Giza', 9000),
    ('Alexandria', 9000),
    ('Qalyubia', 9000),
    ('Sharqia', 9000),
    ('Dakahlia', 10000),
    ('Damietta', 10000),
    ('Monufia', 10000),
    ('Gharbia', 10000),
    ('Beheira', 10000),
    ('Kafr El Sheikh', 10000),
    ('Port Said', 10000),
    ('Suez', 10000),
    ('Ismailia', 10000),
    ('Assiut', 10000),
    ('Minya', 10000),
    ('Beni Suef', 10000),
    ('Fayoum', 10000),
    ('Qena', 12000),
    ('Red Sea', 13000),
    ('Luxor', 13000),
    ('Aswan', 13000),
    ('Sohag', 13000),
    ('Matrouh', 15000),
    ('South Sinai', 15000),
    ('North Sinai', 15000),
    ('New Valley', 15000)
)
insert into public.shipping_areas(
  id,
  governorate,
  name,
  enabled,
  amount,
  service_type,
  delivery_min_hours,
  delivery_max_hours,
  business_days
)
select
  'eg-' || lower(regexp_replace(governorate, '[^a-zA-Z]+', '-', 'g')) || '-standard',
  governorate,
  governorate || ' - standard',
  true,
  normal_amount,
  'standard',
  48,
  120,
  true
from rates
union all
select
  'eg-' || lower(regexp_replace(governorate, '[^a-zA-Z]+', '-', 'g')) || '-express',
  governorate,
  governorate || ' - express',
  true,
  15000,
  'express',
  null,
  48,
  false
from rates
on conflict (id) do update set
  governorate = excluded.governorate,
  name = excluded.name,
  enabled = excluded.enabled,
  amount = excluded.amount,
  service_type = excluded.service_type,
  delivery_min_hours = excluded.delivery_min_hours,
  delivery_max_hours = excluded.delivery_max_hours,
  business_days = excluded.business_days;
