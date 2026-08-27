import { db, rows } from "@/lib/db";

export const schoolPeriods = [1,2,3,4,5,6,7,8] as const;
export const absenceTypes = ["Medical leave","Family leave","Professional learning","School activity","Personal leave","Other"] as const;

export type CoverRow = {
  id: string;
  absenceId: string;
  coverDate: string;
  period: number;
  className: string;
  subject: string;
  room: string;
  instructions: string;
  status: "open" | "assigned" | "cancelled" | "completed";
  absentStaffId: string;
  absentStaffName: string;
  absentJobTitle: string;
  departmentId: string | null;
  departmentName: string | null;
  assignedUserId: string | null;
  assignedUserName: string | null;
  pendingApplicationCount: number;
  myApplicationId: string | null;
  myApplicationStatus: string | null;
};

export type AbsenceRow = {
  id: string;
  staffId: string;
  staffName: string;
  jobTitle: string;
  departmentId: string | null;
  departmentName: string | null;
  startDate: string;
  endDate: string;
  absenceType: string;
  notes: string;
};

export type CoverApplicationRow = {
  id: string;
  coverSlotId: string;
  applicantId: string;
  applicantName: string;
  applicantJobTitle: string;
  note: string;
  status: string;
  createdAt: string;
};

export async function coverBoard(date: string, userId: string, period = 0, status = "all") {
  const result = await db().execute({
    sql: `SELECT s.id,s.absence_id as absenceId,s.cover_date as coverDate,s.period,s.class_name as className,s.subject,s.room,s.instructions,s.status,a.staff_id as absentStaffId,absent.full_name as absentStaffName,absent.job_title as absentJobTitle,absent.department_id as departmentId,d.name as departmentName,s.assigned_user_id as assignedUserId,cover.full_name as assignedUserName,(SELECT count(*) FROM cover_applications ca WHERE ca.cover_slot_id=s.id AND ca.status='pending') as pendingApplicationCount,(SELECT ca.id FROM cover_applications ca WHERE ca.cover_slot_id=s.id AND ca.applicant_id=? LIMIT 1) as myApplicationId,(SELECT ca.status FROM cover_applications ca WHERE ca.cover_slot_id=s.id AND ca.applicant_id=? LIMIT 1) as myApplicationStatus FROM cover_slots s JOIN absences a ON a.id=s.absence_id JOIN users absent ON absent.id=a.staff_id LEFT JOIN departments d ON d.id=absent.department_id LEFT JOIN users cover ON cover.id=s.assigned_user_id WHERE s.cover_date=? AND a.status='confirmed' AND (?::int=0 OR s.period=?) AND (?::text='all' OR s.status=?) ORDER BY s.period,absent.full_name,s.class_name`,
    args: [userId,userId,date,period,period,status,status],
  });
  return rows<CoverRow>(result);
}

export async function absencesForDate(date: string) {
  return rows<AbsenceRow>(await db().execute({
    sql: `SELECT a.id,a.staff_id as staffId,u.full_name as staffName,u.job_title as jobTitle,u.department_id as departmentId,d.name as departmentName,a.start_date as startDate,a.end_date as endDate,a.absence_type as absenceType,a.notes FROM absences a JOIN users u ON u.id=a.staff_id LEFT JOIN departments d ON d.id=u.department_id WHERE a.status='confirmed' AND a.start_date<=? AND a.end_date>=? ORDER BY u.full_name`,
    args: [date,date],
  }));
}

export async function coverApplicationsForDate(date: string) {
  return rows<CoverApplicationRow>(await db().execute({
    sql: `SELECT ca.id,ca.cover_slot_id as coverSlotId,ca.applicant_id as applicantId,u.full_name as applicantName,u.job_title as applicantJobTitle,ca.note,ca.status,ca.created_at as createdAt FROM cover_applications ca JOIN cover_slots s ON s.id=ca.cover_slot_id JOIN users u ON u.id=ca.applicant_id WHERE s.cover_date=? AND ca.status='pending' ORDER BY ca.created_at`,
    args: [date],
  }));
}

export async function availableCoverStaff(date: string) {
  return rows<{id:string;fullName:string;jobTitle:string}>(await db().execute({
    sql: `SELECT u.id,u.full_name as fullName,u.job_title as jobTitle FROM users u WHERE u.active=1 AND u.role IN ('teacher','department_head') AND NOT EXISTS (SELECT 1 FROM absences a WHERE a.staff_id=u.id AND a.status='confirmed' AND a.start_date<=? AND a.end_date>=?) ORDER BY u.full_name`,
    args: [date,date],
  }));
}

export async function manageableAbsences(date: string, departmentId: string | null, unrestricted: boolean) {
  const result = await db().execute({
    sql: `SELECT a.id,u.full_name as staffName,a.start_date as startDate,a.end_date as endDate FROM absences a JOIN users u ON u.id=a.staff_id WHERE a.status='confirmed' AND a.start_date<=? AND a.end_date>=? AND (?::int=1 OR u.department_id=?) ORDER BY u.full_name`,
    args: [date,date,unrestricted?1:0,departmentId],
  });
  return rows<{id:string;staffName:string;startDate:string;endDate:string}>(result);
}
