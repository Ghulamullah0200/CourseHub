-- PostgreSQL 15+. Run once in Neon SQL Editor or psql.
CREATE TABLE IF NOT EXISTS persons (
  person_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL CHECK (length(trim(full_name)) >= 2),
  email VARCHAR(180) NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS students (
  student_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  person_id BIGINT NOT NULL UNIQUE REFERENCES persons(person_id) ON DELETE RESTRICT,
  student_no VARCHAR(30) NOT NULL UNIQUE,
  phone VARCHAR(30)
);
CREATE TABLE IF NOT EXISTS instructors (
  instructor_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  person_id BIGINT NOT NULL UNIQUE REFERENCES persons(person_id) ON DELETE RESTRICT,
  specialization VARCHAR(100)
);
CREATE TABLE IF NOT EXISTS courses (
  course_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code VARCHAR(24) NOT NULL UNIQUE,
  title VARCHAR(140) NOT NULL,
  duration_weeks INT NOT NULL CHECK (duration_weeks BETWEEN 1 AND 52),
  base_fee NUMERIC(12,2) NOT NULL CHECK (base_fee >= 0)
);
CREATE TABLE IF NOT EXISTS batches (
  batch_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  batch_code VARCHAR(32) NOT NULL UNIQUE,
  course_id BIGINT NOT NULL REFERENCES courses(course_id) ON DELETE RESTRICT,
  instructor_id BIGINT NOT NULL REFERENCES instructors(instructor_id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  capacity INT NOT NULL CHECK (capacity BETWEEN 1 AND 500),
  fee NUMERIC(12,2) NOT NULL CHECK (fee >= 0)
);
CREATE TABLE IF NOT EXISTS enrollments (
  enrollment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(student_id) ON DELETE RESTRICT,
  batch_id BIGINT NOT NULL REFERENCES batches(batch_id) ON DELETE RESTRICT,
  enrolled_on DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(12) NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  UNIQUE(student_id,batch_id)
);
CREATE TABLE IF NOT EXISTS payments (
  payment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  enrollment_id BIGINT NOT NULL REFERENCES enrollments(enrollment_id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  method VARCHAR(16) NOT NULL CHECK (method IN ('cash','bank','card')),
  paid_on DATE NOT NULL DEFAULT CURRENT_DATE
);
CREATE INDEX IF NOT EXISTS idx_batches_course ON batches(course_id);
CREATE INDEX IF NOT EXISTS idx_batches_instructor ON batches(instructor_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_batch_status ON enrollments(batch_id,status);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_enrollment ON payments(enrollment_id);

CREATE OR REPLACE FUNCTION check_enrollment_capacity() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE slots INT; occupied INT;
BEGIN
  IF NEW.status = 'active' THEN
    SELECT capacity INTO slots FROM batches WHERE batch_id=NEW.batch_id FOR UPDATE;
    SELECT COUNT(*) INTO occupied FROM enrollments
      WHERE batch_id=NEW.batch_id AND status='active'
        AND (TG_OP='INSERT' OR enrollment_id<>NEW.enrollment_id);
    IF occupied >= slots THEN RAISE EXCEPTION 'Batch is full' USING ERRCODE='P0001'; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_enrollment_capacity ON enrollments;
CREATE TRIGGER trg_enrollment_capacity BEFORE INSERT OR UPDATE OF status,batch_id
ON enrollments FOR EACH ROW EXECUTE FUNCTION check_enrollment_capacity();

CREATE OR REPLACE FUNCTION check_payment_balance() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE due NUMERIC(12,2); total NUMERIC(12,2);
BEGIN
  SELECT b.fee INTO due FROM enrollments e JOIN batches b USING(batch_id)
    WHERE e.enrollment_id=NEW.enrollment_id FOR UPDATE OF e;
  SELECT COALESCE(SUM(amount),0) INTO total FROM payments
    WHERE enrollment_id=NEW.enrollment_id AND (TG_OP='INSERT' OR payment_id<>NEW.payment_id);
  IF total + NEW.amount > due THEN
    RAISE EXCEPTION 'Payment exceeds remaining fee balance' USING ERRCODE='P0001';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_payment_balance ON payments;
CREATE TRIGGER trg_payment_balance BEFORE INSERT OR UPDATE OF amount,enrollment_id
ON payments FOR EACH ROW EXECUTE FUNCTION check_payment_balance();
