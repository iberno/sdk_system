-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- Insert default roles
INSERT INTO "Role" ("id", "name", "label", "isSystem", "updatedAt") VALUES
    ('ADMIN', 'ADMIN', 'Administrador', true, CURRENT_TIMESTAMP),
    ('MANAGER', 'MANAGER', 'Gerente', true, CURRENT_TIMESTAMP),
    ('AGENT', 'AGENT', 'Agente', true, CURRENT_TIMESTAMP),
    ('USER', 'USER', 'Usuário', true, CURRENT_TIMESTAMP);

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
