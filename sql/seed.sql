-- Demo data for an empty database. Run schema.sql first, then run this once.
INSERT INTO persons(full_name,email) VALUES
 ('Ayesha Khan','ayesha.demo@example.com'),('Bilal Ahmed','bilal.demo@example.com'),
 ('Sara Malik','sara.demo@example.com'),('Hassan Raza','hassan.demo@example.com');
INSERT INTO students(person_id,student_no,phone) VALUES
 ((SELECT person_id FROM persons WHERE email='ayesha.demo@example.com'),'CH-1001','0300-0000001'),
 ((SELECT person_id FROM persons WHERE email='bilal.demo@example.com'),'CH-1002','0300-0000002');
INSERT INTO instructors(person_id,specialization) VALUES
 ((SELECT person_id FROM persons WHERE email='sara.demo@example.com'),'Web development'),
 ((SELECT person_id FROM persons WHERE email='hassan.demo@example.com'),'Data analytics');
INSERT INTO courses(code,title,duration_weeks,base_fee) VALUES
 ('WD101','Web Development Fundamentals',8,12000),
 ('DA101','Data Analysis with SQL',6,10000);
INSERT INTO batches(batch_code,course_id,instructor_id,start_date,capacity,fee) VALUES
 ('WEB-01',(SELECT course_id FROM courses WHERE code='WD101'),(SELECT instructor_id FROM instructors i JOIN persons p USING(person_id) WHERE p.email='sara.demo@example.com'),CURRENT_DATE+14,20,12000),
 ('SQL-01',(SELECT course_id FROM courses WHERE code='DA101'),(SELECT instructor_id FROM instructors i JOIN persons p USING(person_id) WHERE p.email='hassan.demo@example.com'),CURRENT_DATE+21,15,10000);
INSERT INTO enrollments(student_id,batch_id) VALUES
 ((SELECT student_id FROM students WHERE student_no='CH-1001'),(SELECT batch_id FROM batches WHERE batch_code='WEB-01')),
 ((SELECT student_id FROM students WHERE student_no='CH-1002'),(SELECT batch_id FROM batches WHERE batch_code='SQL-01'));
INSERT INTO payments(enrollment_id,amount,method)
SELECT e.enrollment_id,4000,'cash' FROM enrollments e JOIN students s USING(student_id) WHERE s.student_no='CH-1001';
