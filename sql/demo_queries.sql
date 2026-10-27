-- Join and derived balance
SELECT p.full_name, b.batch_code, b.fee, COALESCE(SUM(pay.amount),0) paid,
       b.fee-COALESCE(SUM(pay.amount),0) balance
FROM enrollments e JOIN students s USING(student_id) JOIN persons p USING(person_id)
JOIN batches b USING(batch_id) LEFT JOIN payments pay USING(enrollment_id)
GROUP BY e.enrollment_id,p.full_name,b.batch_code,b.fee;
-- Available seats
SELECT b.batch_code,b.capacity-COUNT(e.enrollment_id) AS seats_left
FROM batches b LEFT JOIN enrollments e ON b.batch_id=e.batch_id AND e.status='active'
GROUP BY b.batch_id;
-- Revenue by course
SELECT c.title,COALESCE(SUM(p.amount),0) AS received
FROM courses c LEFT JOIN batches b USING(course_id) LEFT JOIN enrollments e USING(batch_id)
LEFT JOIN payments p USING(enrollment_id) GROUP BY c.course_id ORDER BY received DESC;
