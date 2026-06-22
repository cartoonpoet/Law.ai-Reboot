-- 계약 검토 코멘트(Comment) 신설. 계약 1:N 종속(contractId 직접 FK Cascade).
-- authorId → users.User(cross-schema). 작성자 삭제 정책은 보수적(NO ACTION) — Contract requester/owner(SET NULL)와 달리 NOT NULL 컬럼이라 면제 불가.
-- role 은 작성 시점 작성자 role 스냅(표시용).

-- CreateTable
CREATE TABLE "contracts"."Comment" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Comment_contractId_idx" ON "contracts"."Comment"("contractId");

-- AddForeignKey (contractId → Contract, Cascade)
ALTER TABLE "contracts"."Comment" ADD CONSTRAINT "Comment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"."Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (authorId → users 스키마, NO ACTION — 작성자 삭제 보수적)
ALTER TABLE "contracts"."Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"."User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
