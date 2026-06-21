-- 기본 부서 시드(멱등). name unique 이라 ON CONFLICT DO NOTHING.
INSERT INTO users."Department" (id, name, "createdAt")
SELECT gen_random_uuid(), d.name, now()
FROM (VALUES
  ('개발팀'), ('운영팀'), ('인프라팀'), ('법무팀'),
  ('구매팀'), ('영업팀'), ('인사팀'), ('재무팀'), ('전략기획팀')
) AS d(name)
ON CONFLICT (name) DO NOTHING;
