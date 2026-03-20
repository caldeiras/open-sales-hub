INSERT INTO user_roles (user_id, role_id, assigned_by, is_active)
VALUES (
  '23278c0f-1cf7-40c7-854a-db5c31364e87',
  '673492ca-593f-41c9-9ccc-940ce7b6a8e0',
  '23278c0f-1cf7-40c7-854a-db5c31364e87',
  true
)
ON CONFLICT (user_id, role_id) DO UPDATE SET is_active = true, assigned_at = now();