-- Set featured projects order
UPDATE projects SET sort_order = 0 WHERE id = 'f0163fc8-9e6a-4970-a2e0-b420a208402f'; -- Stash
UPDATE projects SET sort_order = 1 WHERE id = 'd8307ba2-cc0e-4fc5-bc00-48fd5458dd08'; -- weOS
UPDATE projects SET sort_order = 2 WHERE id = '7d67278a-09bd-4ab2-bc3d-794e97e43d69'; -- aspect-os
UPDATE projects SET sort_order = 3 WHERE id = '04193cf2-c3f0-4698-89d5-7593e1f29563'; -- Project Ariadne

-- Fill in sort_order for remaining projects
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) + 3 AS new_order
  FROM projects
  WHERE sort_order IS NULL
)
UPDATE projects p
SET sort_order = o.new_order
FROM ordered o
WHERE p.id = o.id;
