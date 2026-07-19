-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileNode" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "extension" TEXT,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DependencyEdge" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "DependencyEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommitNode" (
    "hash" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommitNode_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "CommitEdge" (
    "parentHash" TEXT NOT NULL,
    "childHash" TEXT NOT NULL,

    CONSTRAINT "CommitEdge_pkey" PRIMARY KEY ("parentHash","childHash")
);

-- CreateTable
CREATE TABLE "FileChange" (
    "id" TEXT NOT NULL,
    "commitHash" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "FileChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Repository_path_key" ON "Repository"("path");

-- CreateIndex
CREATE UNIQUE INDEX "FileNode_repositoryId_path_key" ON "FileNode"("repositoryId", "path");

-- CreateIndex
CREATE UNIQUE INDEX "DependencyEdge_sourceId_targetId_key" ON "DependencyEdge"("sourceId", "targetId");

-- CreateIndex
CREATE INDEX "CommitNode_repositoryId_idx" ON "CommitNode"("repositoryId");

-- CreateIndex
CREATE UNIQUE INDEX "FileChange_commitHash_fileId_key" ON "FileChange"("commitHash", "fileId");

-- AddForeignKey
ALTER TABLE "FileNode" ADD CONSTRAINT "FileNode_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DependencyEdge" ADD CONSTRAINT "DependencyEdge_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "FileNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DependencyEdge" ADD CONSTRAINT "DependencyEdge_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "FileNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitNode" ADD CONSTRAINT "CommitNode_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitEdge" ADD CONSTRAINT "CommitEdge_parentHash_fkey" FOREIGN KEY ("parentHash") REFERENCES "CommitNode"("hash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitEdge" ADD CONSTRAINT "CommitEdge_childHash_fkey" FOREIGN KEY ("childHash") REFERENCES "CommitNode"("hash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileChange" ADD CONSTRAINT "FileChange_commitHash_fkey" FOREIGN KEY ("commitHash") REFERENCES "CommitNode"("hash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileChange" ADD CONSTRAINT "FileChange_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
