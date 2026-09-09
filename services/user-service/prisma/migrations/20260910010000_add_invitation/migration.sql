-- 고객사 초대 테이블 (Spec 4)
CREATE TABLE "users"."Invitation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "users"."TenantRole" NOT NULL DEFAULT 'general',
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "users"."Invitation"("tokenHash");
CREATE INDEX "Invitation_tenantId_idx" ON "users"."Invitation"("tenantId");
CREATE INDEX "Invitation_email_idx" ON "users"."Invitation"("email");

ALTER TABLE "users"."Invitation" ADD CONSTRAINT "Invitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "users"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
