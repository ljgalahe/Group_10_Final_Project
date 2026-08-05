-- Customer notes (property access notes) — shared by portal Profile and crew lead

alter table customers
  add column if not exists customer_notes text;

update customers set customer_notes =
  E'Office park has a security dog that barks at crews near the rear lot — do not approach the fenced kennel area.\nPark trailers only in the designated service bay; front entrance must stay clear for tenants.'
where id = '11111111-1111-1111-1111-111111111101'
  and (customer_notes is null or trim(customer_notes) = '');

update customers set customer_notes =
  E'Retail center: avoid leaf blowing near storefronts before 9:00 AM.\nIrrigation controller is inside the locked utility closet — key is in the crew lockbox.'
where id = '11111111-1111-1111-1111-111111111102'
  and (customer_notes is null or trim(customer_notes) = '');

update customers set customer_notes =
  E'HOA common areas: resident owns a dog that may bite if the side gate is left open — keep gate latched.\nDo not mow within 3 feet of playground equipment during school pickup hours.'
where id = '11111111-1111-1111-1111-111111111103'
  and (customer_notes is null or trim(customer_notes) = '');

update customers set customer_notes =
  E'Industrial site: PPE required (vest + boots). Check in at the guard booth before entering.\nDetention pond bank can be slick after rain — use caution and avoid lone work near the edge.'
where id = '11111111-1111-1111-1111-111111111104'
  and (customer_notes is null or trim(customer_notes) = '');
