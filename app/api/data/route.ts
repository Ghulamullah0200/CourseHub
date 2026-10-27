import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authorized } from '@/lib/auth';
export const runtime = 'nodejs';
const queries = {
  students: `SELECT s.student_id AS id,p.full_name,p.email,s.student_no,s.phone FROM students s JOIN persons p USING(person_id) ORDER BY s.student_id DESC`,
  instructors: `SELECT i.instructor_id AS id,p.full_name,p.email,i.specialization FROM instructors i JOIN persons p USING(person_id) ORDER BY i.instructor_id DESC`,
  courses: `SELECT course_id AS id,code,title,duration_weeks,base_fee FROM courses ORDER BY course_id DESC`,
  batches: `SELECT b.batch_id AS id,b.batch_code,b.course_id,b.instructor_id,c.title AS course,i.person_id,p.full_name AS instructor,b.start_date,b.capacity,b.fee,COUNT(e.enrollment_id)::int AS enrolled FROM batches b JOIN courses c USING(course_id) JOIN instructors i USING(instructor_id) JOIN persons p ON p.person_id=i.person_id LEFT JOIN enrollments e ON e.batch_id=b.batch_id AND e.status='active' GROUP BY b.batch_id,c.title,i.person_id,p.full_name ORDER BY b.batch_id DESC`,
  enrollments: `SELECT e.enrollment_id AS id,e.student_id,e.batch_id,e.enrolled_on,e.status,p.full_name AS student,b.batch_code,b.fee,COALESCE(SUM(pay.amount),0) AS paid,(b.fee-COALESCE(SUM(pay.amount),0)) AS balance FROM enrollments e JOIN students s USING(student_id) JOIN persons p ON p.person_id=s.person_id JOIN batches b USING(batch_id) LEFT JOIN payments pay ON pay.enrollment_id=e.enrollment_id GROUP BY e.enrollment_id,p.full_name,b.batch_code,b.fee ORDER BY e.enrollment_id DESC`,
  payments: `SELECT pay.payment_id AS id,pay.enrollment_id,pay.amount,pay.method,pay.paid_on,p.full_name AS student,b.batch_code FROM payments pay JOIN enrollments e USING(enrollment_id) JOIN students s USING(student_id) JOIN persons p ON p.person_id=s.person_id JOIN batches b USING(batch_id) ORDER BY pay.payment_id DESC`
} as const;
type Entity = keyof typeof queries;
const bad = (error: string, status=400) => NextResponse.json({error},{status});
function field(x: any,k:string) { if(x[k]===undefined || x[k]===null || String(x[k]).trim()==='') throw Error(`${k} is required`); return x[k] }
function errorResponse(e: any) {
  const messages: Record<string,string> = { '23505':'That record already exists. Check the student number, email, course code, batch code, or enrollment.', '23503':'This record is referenced by another record.', '23514':'A value is outside the allowed range.', 'P0001':e.message };
  return bad(messages[e.code] || (e.message?.includes('required') ? e.message : 'Database operation failed. Check your data and try again.'), e.code==='23503'?409:400);
}
export async function GET() {
  if (!(await authorized())) return bad('Sign in first',401);
  try {
    const results = await Promise.all(Object.entries(queries).map(async ([name,sql])=>[name,(await db().query(sql)).rows]));
    return NextResponse.json(Object.fromEntries(results));
  } catch { return bad('Database unavailable. Check DATABASE_URL and run schema.sql.',503) }
}
export async function POST(req: NextRequest) {
  if (!(await authorized())) return bad('Sign in first',401);
  try {
    const {entity,data} = await req.json();
    if(!data || typeof data!=='object') return bad('Invalid input');
    if(entity==='students' || entity==='instructors') {
      const client=await db().connect();
      try {
        await client.query('BEGIN');
        const person=await client.query('INSERT INTO persons(full_name,email) VALUES($1,$2) RETURNING person_id',[field(data,'full_name'),field(data,'email')]);
        if(entity==='students') await client.query('INSERT INTO students(person_id,student_no,phone) VALUES($1,$2,$3)',[person.rows[0].person_id,field(data,'student_no'),data.phone||null]);
        else await client.query('INSERT INTO instructors(person_id,specialization) VALUES($1,$2)',[person.rows[0].person_id,data.specialization||null]);
        await client.query('COMMIT');
      } catch(e) { await client.query('ROLLBACK'); throw e } finally { client.release() }
    } else if(entity==='courses') await db().query('INSERT INTO courses(code,title,duration_weeks,base_fee) VALUES($1,$2,$3,$4)',[field(data,'code'),field(data,'title'),field(data,'duration_weeks'),field(data,'base_fee')]);
    else if(entity==='batches') await db().query('INSERT INTO batches(batch_code,course_id,instructor_id,start_date,capacity,fee) VALUES($1,$2,$3,$4,$5,$6)',[field(data,'batch_code'),field(data,'course_id'),field(data,'instructor_id'),field(data,'start_date'),field(data,'capacity'),field(data,'fee')]);
    else if(entity==='enrollments') await db().query('INSERT INTO enrollments(student_id,batch_id) VALUES($1,$2)',[field(data,'student_id'),field(data,'batch_id')]);
    else if(entity==='payments') await db().query('INSERT INTO payments(enrollment_id,amount,method,paid_on) VALUES($1,$2,$3,COALESCE($4::date,CURRENT_DATE))',[field(data,'enrollment_id'),field(data,'amount'),field(data,'method'),data.paid_on||null]);
    else return bad('Unknown entity');
    return NextResponse.json({ok:true},{status:201});
  } catch(e:any) { return errorResponse(e) }
}
export async function PATCH(req: NextRequest) {
  if (!(await authorized())) return bad('Sign in first',401);
  try {
    const {entity,id,status}=await req.json();
    if(entity!=='enrollments' || !['active','completed','cancelled'].includes(status)) return bad('Invalid status');
    const result=await db().query('UPDATE enrollments SET status=$1 WHERE enrollment_id=$2 RETURNING enrollment_id',[status,id]);
    if(!result.rowCount) return bad('Enrollment not found',404);
    return NextResponse.json({ok:true});
  } catch(e:any) { return errorResponse(e) }
}
