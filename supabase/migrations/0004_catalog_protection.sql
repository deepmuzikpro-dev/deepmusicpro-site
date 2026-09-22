-- Catalog protection: auto-pull a beat once its exclusive rights sell, and
-- give every sold license a resolvable PDF-agreement path.
-- Run after 0003.

alter table tracks add column if not exists exclusive_sold boolean not null default false;
alter table order_items add column if not exists license_pdf_path text;
alter table order_items add column if not exists bundle_id uuid; -- FK added in 0006 once bundles exists

comment on column tracks.exclusive_sold is
  'Set true by the stripe-webhook function the moment an exclusive license sells. is_published is flipped to false in the same update, so the track disappears from the storefront automatically.';
comment on column order_items.license_pdf_path is
  'Private storage path (docs bucket) of the generated license agreement PDF for this line item, set by stripe-webhook after payment.';
