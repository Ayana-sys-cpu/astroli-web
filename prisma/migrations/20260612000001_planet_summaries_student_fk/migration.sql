-- AddForeignKey
ALTER TABLE "planet_summaries" ADD CONSTRAINT "planet_summaries_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
