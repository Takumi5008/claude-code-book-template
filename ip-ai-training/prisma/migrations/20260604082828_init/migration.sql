-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'TEAM_LEADER', 'VIEWER', 'TRAINEE');

-- CreateEnum
CREATE TYPE "Step" AS ENUM ('ASSIGNED', 'SCRIPT_LEARNING', 'TEST_1', 'TEST_2', 'TEST_3', 'MEETING', 'OBSERVATION', 'ASSIGNMENT_MEETING', 'PRACTICE_1', 'PRACTICE_2', 'FIRST_WORK', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CustomerPattern" AS ENUM ('A', 'B', 'C', 'D', 'E');

-- CreateEnum
CREATE TYPE "PracticeMode" AS ENUM ('TEXT', 'VOICE');

-- CreateEnum
CREATE TYPE "MilestoneType" AS ENUM ('JOINED', 'SCRIPT_LEARNING_START', 'TEST_1_START', 'TEST_1_PASS', 'TEST_2_START', 'TEST_2_PASS', 'TEST_3_START', 'TEST_3_PASS', 'TEST_4_PASS', 'TEST_5_PASS', 'TEST_6_PASS', 'MEETING_ATTENDED', 'OBSERVATION_DONE', 'ASSIGNMENT_MEETING_DONE', 'PRACTICE_1_DONE', 'PRACTICE_2_DONE', 'FIRST_WORK');

-- CreateEnum
CREATE TYPE "AdminRecordType" AS ENUM ('ASSIGNMENT_MEETING', 'OBSERVATION', 'PRACTICE_EVAL', 'MEMO', 'CUSTOM');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "line_user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "team" TEXT,
    "joined_at" TIMESTAMP(3) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'TRAINEE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "current_step" "Step" NOT NULL DEFAULT 'ASSIGNED',
    "estimated_first_work_at" TIMESTAMP(3),
    "first_work_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_results" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "test_number" INTEGER NOT NULL,
    "customer_pattern" "CustomerPattern" NOT NULL,
    "score" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "feedback_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "mode" "PracticeMode" NOT NULL,
    "customer_pattern" "CustomerPattern" NOT NULL,
    "score" INTEGER,
    "feedback_json" JSONB,
    "conversation_log" JSONB,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "item_number" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "approved_by" TEXT,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_results" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "quiz_type" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_views" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "video_type" TEXT NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "milestone_type" "MilestoneType" NOT NULL,
    "achieved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "record_type" "AdminRecordType" NOT NULL,
    "content_json" JSONB NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_states" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "current_mode" TEXT,
    "context_json" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_line_user_id_key" ON "users"("line_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "progress_user_id_key" ON "progress"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_items_user_id_item_number_key" ON "checklist_items"("user_id", "item_number");

-- CreateIndex
CREATE UNIQUE INDEX "milestones_user_id_milestone_type_key" ON "milestones"("user_id", "milestone_type");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_states_user_id_key" ON "conversation_states"("user_id");

-- AddForeignKey
ALTER TABLE "progress" ADD CONSTRAINT "progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_results" ADD CONSTRAINT "quiz_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_views" ADD CONSTRAINT "video_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_records" ADD CONSTRAINT "admin_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_states" ADD CONSTRAINT "conversation_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
