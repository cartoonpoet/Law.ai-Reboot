-- =============================================================================
-- slug 생성 규칙 (ContractCategory) — admin CRUD 후속에서 서버가 동일 규칙으로 자동 생성
-- =============================================================================
-- 규칙: 계층 경로 dot-notation 영문. 부모 slug 에 `.자식키` 를 누적한다. 전역 unique.
--   - 대분류(루트): 영문 키 단독            예) 개발/공급 -> dev-supply
--   - 중분류: <부모 slug>.<자식 영문 키>     예) 소프트웨어 -> dev-supply.software
--   - 소분류: <부모 slug>.<자식 영문 키>     예) SaaS이용  -> dev-supply.software.saas
--   - 영문 키: 소문자 + 하이픈(kebab). 다중 토큰은 하이픈으로 연결(예: 세무/회계 -> tax-accounting).
--
-- 한글 노드 -> 영문 키 매핑 (재현용):
--   개발/공급=dev-supply, 구매=purchase, 자문=advisory, 기타=etc,
--   소프트웨어=software, 용역=service, 물품=goods, 위탁=consignment,
--   법률=legal, 세무/회계=tax-accounting,
--   SaaS이용=saas, 라이선스=license, 구축/SI=si,
--   개발용역=dev, 유지보수=maintenance, 기술지원=support,
--   사무용품=office, IT장비=it-equipment, 원자재=raw-material,
--   제조위탁=manufacturing, 운영위탁=operation,
--   일반자문=general, 계약검토=contract-review, 소송대리=litigation,
--   기장대리=bookkeeping, 세무신고=tax-filing.
--
-- 멱등성: slug 전역 unique + `WHERE NOT EXISTS (slug=...)` 가드.
--   (루트는 parentId NULL 이라 (parentId,name) UNIQUE 로는 중복을 못 막으므로 slug 가드가 커버.)
-- 이 블록은 마이그레이션 20260622100000_add_contract_category 의 시드 INSERT 와 동일 데이터.
--   (마이그레이션이 migrate deploy 시 자동 적용. 여기는 dev 재현/재실행용 병치. 멱등이라 중복 적용 안전.)
-- =============================================================================

-- 기본 부서 시드(멱등). name unique 이라 ON CONFLICT DO NOTHING.
INSERT INTO users."Department" (id, name, "createdAt")
SELECT gen_random_uuid(), d.name, now()
FROM (VALUES
  ('개발팀'), ('운영팀'), ('인프라팀'), ('법무팀'),
  ('구매팀'), ('영업팀'), ('인사팀'), ('재무팀'), ('전략기획팀')
) AS d(name)
ON CONFLICT (name) DO NOTHING;

-- 계약 분류 트리(ContractCategory) 시드(멱등: slug 기준 WHERE NOT EXISTS).
-- 루트->중->소 순서로 parentId 를 부모 slug 서브쿼리 참조.
-- CATEGORY_TREE 전체 이관 (apps/web/src/pages/contract/contractOptions.ts). 총 4(대)+7(중)+17(소)=28 노드.

-- 대분류(루트, parentId NULL)
INSERT INTO "contracts"."ContractCategory" ("id", "name", "slug", "parentId", "sortOrder", "createdAt")
SELECT gen_random_uuid(), c.name, c.slug, NULL, c."sortOrder", CURRENT_TIMESTAMP
FROM (VALUES
  ('개발/공급', 'dev-supply', 0),
  ('구매',      'purchase',   1),
  ('자문',      'advisory',   2),
  ('기타',      'etc',        3)
) AS c(name, slug, "sortOrder")
WHERE NOT EXISTS (
  SELECT 1 FROM "contracts"."ContractCategory" e WHERE e.slug = c.slug
);

-- 중분류 (부모 = 대분류 slug)
INSERT INTO "contracts"."ContractCategory" ("id", "name", "slug", "parentId", "sortOrder", "createdAt")
SELECT gen_random_uuid(), c.name, c.slug, p.id, c."sortOrder", CURRENT_TIMESTAMP
FROM (VALUES
  ('소프트웨어',  'dev-supply.software',     'dev-supply', 0),
  ('용역',        'dev-supply.service',      'dev-supply', 1),
  ('물품',        'purchase.goods',          'purchase',   0),
  ('위탁',        'purchase.consignment',    'purchase',   1),
  ('법률',        'advisory.legal',          'advisory',   0),
  ('세무/회계',   'advisory.tax-accounting', 'advisory',   1),
  ('기타',        'etc.etc',                 'etc',        0)
) AS c(name, slug, "parentSlug", "sortOrder")
JOIN "contracts"."ContractCategory" p ON p.slug = c."parentSlug"
WHERE NOT EXISTS (
  SELECT 1 FROM "contracts"."ContractCategory" e WHERE e.slug = c.slug
);

-- 소분류 (부모 = 중분류 slug)
INSERT INTO "contracts"."ContractCategory" ("id", "name", "slug", "parentId", "sortOrder", "createdAt")
SELECT gen_random_uuid(), c.name, c.slug, p.id, c."sortOrder", CURRENT_TIMESTAMP
FROM (VALUES
  ('SaaS 이용',  'dev-supply.software.saas',        'dev-supply.software',     0),
  ('라이선스',   'dev-supply.software.license',     'dev-supply.software',     1),
  ('구축/SI',    'dev-supply.software.si',          'dev-supply.software',     2),
  ('개발용역',   'dev-supply.service.dev',          'dev-supply.service',      0),
  ('유지보수',   'dev-supply.service.maintenance',  'dev-supply.service',      1),
  ('기술지원',   'dev-supply.service.support',      'dev-supply.service',      2),
  ('사무용품',   'purchase.goods.office',           'purchase.goods',          0),
  ('IT 장비',    'purchase.goods.it-equipment',     'purchase.goods',          1),
  ('원자재',     'purchase.goods.raw-material',     'purchase.goods',          2),
  ('제조위탁',   'purchase.consignment.manufacturing', 'purchase.consignment', 0),
  ('운영위탁',   'purchase.consignment.operation',  'purchase.consignment',    1),
  ('일반자문',   'advisory.legal.general',          'advisory.legal',          0),
  ('계약검토',   'advisory.legal.contract-review',  'advisory.legal',          1),
  ('소송대리',   'advisory.legal.litigation',       'advisory.legal',          2),
  ('기장대리',   'advisory.tax-accounting.bookkeeping', 'advisory.tax-accounting', 0),
  ('세무신고',   'advisory.tax-accounting.tax-filing',  'advisory.tax-accounting', 1),
  ('기타',       'etc.etc.etc',                     'etc.etc',                 0)
) AS c(name, slug, "parentSlug", "sortOrder")
JOIN "contracts"."ContractCategory" p ON p.slug = c."parentSlug"
WHERE NOT EXISTS (
  SELECT 1 FROM "contracts"."ContractCategory" e WHERE e.slug = c.slug
);
