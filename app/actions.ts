"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/auth";
import { canCreateOfficial, isAdmin } from "@/lib/types";
import { schoolTimezone } from "@/lib/format";

const text=(f:FormData,key:string)=>String(f.get(key)??"").trim();
const checked=(f:FormData,key:string)=>f.get(key)==="on"||f.get(key)==="true";
const uuid=()=>crypto.randomUUID();
const sqlDate=(value:string)=>value?new Date(value).toISOString().replace("T"," ").slice(0,19):null;

async function target(entityType:string,entityId:string,f:FormData){
  const audienceType=text(f,"audienceType")||"all_staff"; const audienceValue=text(f,"audienceValue")||null;
  await db().execute({sql:`INSERT INTO audiences(id,entity_type,entity_id,audience_type,audience_value) VALUES (?,?,?,?,?)`,args:[uuid(),entityType,entityId,audienceType,audienceType==="all_staff"?null:audienceValue]});
}
async function audit(actorId:string,action:string,entityType:string,entityId:string,metadata:object={}){await db().execute({sql:`INSERT INTO audit_logs(id,actor_id,action,entity_type,entity_id,metadata) VALUES (?,?,?,?,?,?)`,args:[uuid(),actorId,action,entityType,entityId,JSON.stringify(metadata)]});}

const coverDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const absenceType=z.enum(["Medical leave","Family leave","Professional learning","School activity","Personal leave","Other"]);
async function coverScope(user:Awaited<ReturnType<typeof requireUser>>,absenceId:string){
  const result=await db().execute({sql:`SELECT a.id,a.staff_id as staffId,a.start_date as startDate,a.end_date as endDate,u.department_id as departmentId FROM absences a JOIN users u ON u.id=a.staff_id WHERE a.id=? AND a.status='confirmed'`,args:[absenceId]});
  const absence=result.rows[0];
  if(!absence||user.role==="teacher"||user.role==="department_head"&&String(absence.departmentId)!==user.departmentId)redirect("/?denied=1");
  return absence;
}
const markdownCell=(value:unknown)=>String(value??"").replace(/\|/g,"\\|").replace(/\r?\n/g," ").trim();

export async function acknowledge(formData:FormData){const user=await requireUser();const entityType=text(formData,"entityType"),entityId=text(formData,"entityId");await db().execute({sql:`INSERT OR IGNORE INTO acknowledgements(id,entity_type,entity_id,user_id) VALUES (?,?,?,?)`,args:[uuid(),entityType,entityId,user.id]});revalidatePath("/");revalidatePath(`/${entityType==="notice"?"notices":"documents"}/${entityId}`);}

export async function createPost(formData:FormData){
  const user=await requireUser();const parsed=z.object({title:z.string().min(4).max(120),body:z.string().min(8).max(4000),postType:z.string().min(1)}).safeParse({title:text(formData,"title"),body:text(formData,"body"),postType:text(formData,"postType")});
  if(!parsed.success)redirect("/staff-board?error=validation");if(text(formData,"audienceType")==="role")formData.set("audienceValue",user.role);
  const postId=uuid();await db().execute({sql:`INSERT INTO staff_posts(id,title,body,post_type,tags,author_id) VALUES (?,?,?,?,?,?)`,args:[postId,parsed.data.title,parsed.data.body,parsed.data.postType,text(formData,"tags"),user.id]});await target("staff_post",postId,formData);revalidatePath("/staff-board");redirect(`/staff-board/${postId}`);
}
export async function replyToPost(formData:FormData){const user=await requireUser();const postId=text(formData,"postId"),body=text(formData,"body");if(body.length<2) return;await db().execute({sql:`INSERT INTO staff_replies(id,post_id,author_id,body) VALUES (?,?,?,?)`,args:[uuid(),postId,user.id,body]});const owner=await db().execute({sql:`SELECT author_id,title FROM staff_posts WHERE id=?`,args:[postId]});if(owner.rows[0]&&String(owner.rows[0].author_id)!==user.id)await db().execute({sql:`INSERT INTO notifications(id,user_id,type,entity_type,entity_id,title) VALUES (?,?,?,?,?,?)`,args:[uuid(),String(owner.rows[0].author_id),"reply","staff_post",postId,`New reply: ${String(owner.rows[0].title)}`]});revalidatePath(`/staff-board/${postId}`);}
export async function togglePostResolved(formData:FormData){const user=await requireUser();const postId=text(formData,"postId");const result=await db().execute({sql:`SELECT author_id,resolved FROM staff_posts WHERE id=?`,args:[postId]});const post=result.rows[0];if(!post||String(post.author_id)!==user.id&&!isAdmin(user)) redirect("/?denied=1");const resolved=Number(post.resolved)?0:1;await db().execute({sql:`UPDATE staff_posts SET resolved=?,resolved_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,args:[resolved,resolved?new Date().toISOString():null,postId]});revalidatePath("/staff-board");revalidatePath(`/staff-board/${postId}`);}
export async function editPost(formData:FormData){const user=await requireUser();const postId=text(formData,"postId");const result=await db().execute({sql:`SELECT author_id,resolved FROM staff_posts WHERE id=?`,args:[postId]});const post=result.rows[0];if(!post||String(post.author_id)!==user.id&&!isAdmin(user)||Boolean(post.resolved)&&!isAdmin(user))redirect("/?denied=1");await db().execute({sql:`UPDATE staff_posts SET title=?,body=?,tags=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,args:[text(formData,"title"),text(formData,"body"),text(formData,"tags"),postId]});if(String(post.author_id)!==user.id)await audit(user.id,"staff_post.moderated","staff_post",postId);revalidatePath("/staff-board");revalidatePath(`/staff-board/${postId}`);}
export async function deletePost(formData:FormData){const user=await requireUser();const postId=text(formData,"postId");const result=await db().execute({sql:`SELECT author_id,resolved FROM staff_posts WHERE id=?`,args:[postId]});const post=result.rows[0];if(!post||String(post.author_id)!==user.id&&!isAdmin(user)||Boolean(post.resolved)&&!isAdmin(user))redirect("/?denied=1");if(String(post.author_id)!==user.id)await audit(user.id,"staff_post.deleted","staff_post",postId);await db().execute({sql:`DELETE FROM staff_posts WHERE id=?`,args:[postId]});revalidatePath("/staff-board");redirect("/staff-board");}
export async function editReply(formData:FormData){const user=await requireUser();const replyId=text(formData,"replyId"),postId=text(formData,"postId");const result=await db().execute({sql:`SELECT author_id FROM staff_replies WHERE id=?`,args:[replyId]});const reply=result.rows[0];if(!reply||String(reply.author_id)!==user.id&&!isAdmin(user))redirect("/?denied=1");await db().execute({sql:`UPDATE staff_replies SET body=?,edited_at=CURRENT_TIMESTAMP WHERE id=?`,args:[text(formData,"body"),replyId]});if(String(reply.author_id)!==user.id)await audit(user.id,"staff_reply.moderated","staff_reply",replyId);revalidatePath(`/staff-board/${postId}`);}
export async function deleteReply(formData:FormData){const user=await requireUser();const replyId=text(formData,"replyId"),postId=text(formData,"postId");const result=await db().execute({sql:`SELECT author_id FROM staff_replies WHERE id=?`,args:[replyId]});const reply=result.rows[0];if(!reply||String(reply.author_id)!==user.id&&!isAdmin(user))redirect("/?denied=1");if(String(reply.author_id)!==user.id)await audit(user.id,"staff_reply.deleted","staff_reply",replyId);await db().execute({sql:`DELETE FROM staff_replies WHERE id=?`,args:[replyId]});revalidatePath(`/staff-board/${postId}`);}

export async function createNotice(formData:FormData){
  const user=await requireUser();if(!canCreateOfficial(user))redirect("/?denied=1");
  if(text(formData,"audienceType")!=="all_staff"&&!text(formData,"audienceValue"))redirect("/admin/notices?error=scope");
  if(user.role==="department_head"&&(text(formData,"audienceType")!=="department"||text(formData,"audienceValue")!==user.departmentId))redirect("/admin/notices?error=scope");
  const priority=text(formData,"priority"),noticeId=uuid();const publishAt=sqlDate(text(formData,"publishAt"))??new Date().toISOString().replace("T"," ").slice(0,19);const expiresAt=sqlDate(text(formData,"expiresAt"));const status=new Date(publishAt)>new Date()?"scheduled":"published";
  await db().execute({sql:`INSERT INTO notices(id,title,body,category,priority,publish_at,expires_at,acknowledgement_required,author_id,status) VALUES (?,?,?,?,?,?,?,?,?,?)`,args:[noticeId,text(formData,"title"),text(formData,"body"),text(formData,"category"),priority,publishAt,expiresAt,checked(formData,"acknowledgementRequired")?1:0,user.id,status]});
  await target("notice",noticeId,formData);await audit(user.id,"notice.created","notice",noticeId,{priority,status});revalidatePath("/");revalidatePath("/notices");revalidatePath("/admin/notices");
}
export async function archiveNotice(formData:FormData){
  const user=await requireRole(["department_head","admin","system_admin"]);const noticeId=text(formData,"noticeId");
  if(user.role==="department_head"){const owned=await db().execute({sql:`SELECT 1 FROM notices WHERE id=? AND author_id=?`,args:[noticeId,user.id]});if(!owned.rows.length)redirect("/admin/notices?error=scope");}
  await db().execute({sql:`UPDATE notices SET status='archived',updated_at=CURRENT_TIMESTAMP WHERE id=?`,args:[noticeId]});await audit(user.id,"notice.archived","notice",noticeId);revalidatePath("/");revalidatePath("/notices");revalidatePath("/admin/notices");
}

export async function createEvent(formData:FormData){const user=await requireRole(["admin","system_admin"]);const eventId=uuid();await db().execute({sql:`INSERT INTO events(id,title,description,start_at,end_at,all_day,location,category,organizer_id) VALUES (?,?,?,?,?,?,?,?,?)`,args:[eventId,text(formData,"title"),text(formData,"description"),sqlDate(text(formData,"startAt")),sqlDate(text(formData,"endAt")),checked(formData,"allDay")?1:0,text(formData,"location"),text(formData,"category"),user.id]});await target("event",eventId,formData);await audit(user.id,"event.created","event",eventId);revalidatePath("/events");revalidatePath("/admin/content");}
export async function createDocument(formData:FormData){const user=await requireRole(["admin","system_admin"]);const documentId=uuid();const url=z.string().url().safeParse(text(formData,"url"));if(!url.success)redirect("/admin/content?error=url");await db().execute({sql:`INSERT INTO documents(id,title,description,category,department_id,external_url,version,effective_date,pinned,acknowledgement_required,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,args:[documentId,text(formData,"title"),text(formData,"description"),text(formData,"category"),text(formData,"departmentId")||null,url.data,text(formData,"version"),text(formData,"effectiveDate")||null,checked(formData,"pinned")?1:0,checked(formData,"acknowledgementRequired")?1:0,user.id]});await target("document",documentId,formData);await audit(user.id,"document.created","document",documentId);revalidatePath("/documents");revalidatePath("/admin/content");}
export async function createQuickLink(formData:FormData){const user=await requireRole(["admin","system_admin"]);const linkId=uuid();const url=z.string().url().safeParse(text(formData,"url"));if(!url.success)redirect("/admin/content?error=url");await db().execute({sql:`INSERT INTO quick_links(id,label,url,description,category,sort_order) VALUES (?,?,?,?,?,?)`,args:[linkId,text(formData,"label"),url.data,text(formData,"description"),text(formData,"category"),Number(text(formData,"sortOrder"))||0]});await target("quick_link",linkId,formData);await audit(user.id,"quick_link.created","quick_link",linkId);revalidatePath("/links");revalidatePath("/admin/content");}
export async function updateUser(formData:FormData){const actor=await requireRole(["system_admin"]);const userId=text(formData,"userId");if(userId===actor.id&&!checked(formData,"active"))return;await db().execute({sql:`UPDATE users SET role=?,department_id=?,active=? WHERE id=?`,args:[text(formData,"role"),text(formData,"departmentId")||null,checked(formData,"active")?1:0,userId]});await audit(actor.id,"user.updated","user",userId,{role:text(formData,"role"),active:checked(formData,"active")});revalidatePath("/admin/users");}
export async function createDepartment(formData:FormData){const actor=await requireRole(["system_admin"]);const name=text(formData,"name");if(name.length<2)return;const departmentId=uuid();await db().execute({sql:`INSERT INTO departments(id,name) VALUES (?,?)`,args:[departmentId,name]});await audit(actor.id,"department.created","department",departmentId,{name});revalidatePath("/admin/users");}

export async function reportAbsence(formData:FormData){
  const user=await requireUser();const startDate=text(formData,"startDate"),endDate=text(formData,"endDate")||startDate;
  const parsedAbsenceType=absenceType.safeParse(text(formData,"absenceType"));if(!coverDate.safeParse(startDate).success||!coverDate.safeParse(endDate).success||!parsedAbsenceType.success||endDate<startDate||Date.parse(`${endDate}T00:00:00Z`)-Date.parse(`${startDate}T00:00:00Z`)>31*86400000)redirect("/cover?error=dates");
  const staffId=user.role==="teacher"?user.id:text(formData,"staffId")||user.id;
  const staffResult=await db().execute({sql:`SELECT id,department_id as departmentId FROM users WHERE id=? AND active=1`,args:[staffId]});const staff=staffResult.rows[0];
  if(!staff||user.role==="department_head"&&String(staff.departmentId)!==user.departmentId)redirect("/?denied=1");
  const overlap=await db().execute({sql:`SELECT 1 FROM absences WHERE staff_id=? AND status='confirmed' AND start_date<=? AND end_date>=? LIMIT 1`,args:[staffId,endDate,startDate]});if(overlap.rows.length)redirect(`/cover?date=${startDate}&error=overlap`);
  const absenceId=uuid();await db().execute({sql:`INSERT INTO absences(id,staff_id,start_date,end_date,absence_type,notes,reported_by) VALUES (?,?,?,?,?,?,?)`,args:[absenceId,staffId,startDate,endDate,parsedAbsenceType.data,text(formData,"notes").slice(0,500),user.id]});
  await audit(user.id,"absence.reported","absence",absenceId,{staffId,startDate,endDate});revalidatePath("/cover");redirect(`/cover?date=${startDate}`);
}

export async function cancelAbsence(formData:FormData){
  const user=await requireUser();const absenceId=text(formData,"absenceId");const result=await db().execute({sql:`SELECT a.staff_id as staffId,u.department_id as departmentId FROM absences a JOIN users u ON u.id=a.staff_id WHERE a.id=? AND a.status='confirmed'`,args:[absenceId]});const absence=result.rows[0];
  const permitted=absence&&(String(absence.staffId)===user.id||isAdmin(user)||user.role==="department_head"&&String(absence.departmentId)===user.departmentId);if(!permitted)redirect("/?denied=1");
  await db().batch([{sql:`UPDATE absences SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE id=?`,args:[absenceId]},{sql:`UPDATE cover_slots SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE absence_id=?`,args:[absenceId]},{sql:`UPDATE cover_applications SET status='declined',decided_by=?,decided_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE cover_slot_id IN (SELECT id FROM cover_slots WHERE absence_id=?) AND status='pending'`,args:[user.id,absenceId]}],"write");
  await audit(user.id,"absence.cancelled","absence",absenceId);revalidatePath("/cover");
}

export async function createCoverSlot(formData:FormData){
  const user=await requireRole(["department_head","admin","system_admin"]);const absenceId=text(formData,"absenceId"),date=text(formData,"coverDate"),period=Number(text(formData,"period"));const absence=await coverScope(user,absenceId);
  if(!coverDate.safeParse(date).success||date<String(absence.startDate)||date>String(absence.endDate)||!Number.isInteger(period)||period<1||period>8||text(formData,"className").length<1||text(formData,"subject").length<2)redirect(`/cover?date=${date||String(absence.startDate)}&error=slot`);
  const duplicate=await db().execute({sql:`SELECT 1 FROM cover_slots WHERE absence_id=? AND cover_date=? AND period=?`,args:[absenceId,date,period]});if(duplicate.rows.length)redirect(`/cover?date=${date}&error=duplicate-slot`);
  const slotId=uuid();await db().execute({sql:`INSERT INTO cover_slots(id,absence_id,cover_date,period,class_name,subject,room,instructions) VALUES (?,?,?,?,?,?,?,?)`,args:[slotId,absenceId,date,period,text(formData,"className"),text(formData,"subject"),text(formData,"room"),text(formData,"instructions").slice(0,1000)]});await audit(user.id,"cover_slot.created","cover_slot",slotId,{date,period});revalidatePath("/cover");redirect(`/cover?date=${date}`);
}

export async function applyForCover(formData:FormData){
  const user=await requireUser();if(isAdmin(user)||!checked(formData,"availabilityConfirmed"))redirect("/?denied=1");const slotId=text(formData,"slotId");
  const result=await db().execute({sql:`SELECT s.id,s.cover_date as coverDate,s.period,s.status,a.staff_id as absentStaffId FROM cover_slots s JOIN absences a ON a.id=s.absence_id WHERE s.id=? AND a.status='confirmed'`,args:[slotId]});const slot=result.rows[0];if(!slot||String(slot.status)!=="open"||String(slot.absentStaffId)===user.id)redirect("/cover?error=unavailable");
  const conflicts=await db().execute({sql:`SELECT 1 FROM absences a WHERE a.staff_id=? AND a.status='confirmed' AND a.start_date<=? AND a.end_date>=? UNION ALL SELECT 1 FROM cover_slots s WHERE s.assigned_user_id=? AND s.cover_date=? AND s.period=? AND s.status='assigned' UNION ALL SELECT 1 FROM cover_applications ca JOIN cover_slots s ON s.id=ca.cover_slot_id WHERE ca.applicant_id=? AND ca.status='pending' AND s.cover_date=? AND s.period=? AND s.id!=? LIMIT 1`,args:[user.id,String(slot.coverDate),String(slot.coverDate),user.id,String(slot.coverDate),Number(slot.period),user.id,String(slot.coverDate),Number(slot.period),slotId]});if(conflicts.rows.length)redirect(`/cover?date=${String(slot.coverDate)}&error=conflict`);
  await db().execute({sql:`INSERT INTO cover_applications(id,cover_slot_id,applicant_id,note,status) VALUES (?,?,?,?, 'pending') ON CONFLICT(cover_slot_id,applicant_id) DO UPDATE SET note=excluded.note,status='pending',decided_by=NULL,decided_at=NULL,updated_at=CURRENT_TIMESTAMP`,args:[uuid(),slotId,user.id,text(formData,"note").slice(0,300)]});await audit(user.id,"cover.applied","cover_slot",slotId);revalidatePath("/cover");
}

export async function withdrawCoverApplication(formData:FormData){
  const user=await requireUser();const applicationId=text(formData,"applicationId");await db().execute({sql:`UPDATE cover_applications SET status='withdrawn',updated_at=CURRENT_TIMESTAMP WHERE id=? AND applicant_id=? AND status='pending'`,args:[applicationId,user.id]});await audit(user.id,"cover.application_withdrawn","cover_application",applicationId);revalidatePath("/cover");
}

export async function assignCoverSlot(formData:FormData){
  const user=await requireRole(["department_head","admin","system_admin"]);const slotId=text(formData,"slotId"),coverUserId=text(formData,"coverUserId");
  const slotResult=await db().execute({sql:`SELECT s.id,s.absence_id as absenceId,s.cover_date as coverDate,s.period,a.staff_id as absentStaffId FROM cover_slots s JOIN absences a ON a.id=s.absence_id WHERE s.id=? AND s.status IN ('open','assigned')`,args:[slotId]});const slot=slotResult.rows[0];if(!slot)redirect("/cover?error=unavailable");await coverScope(user,String(slot.absenceId));
  const candidateResult=await db().execute({sql:`SELECT id,full_name as fullName FROM users WHERE id=? AND active=1 AND role IN ('teacher','department_head')`,args:[coverUserId]});const candidate=candidateResult.rows[0];if(!candidate||coverUserId===String(slot.absentStaffId))redirect(`/cover?date=${String(slot.coverDate)}&error=assignee`);
  const conflict=await db().execute({sql:`SELECT 1 FROM absences WHERE staff_id=? AND status='confirmed' AND start_date<=? AND end_date>=? UNION ALL SELECT 1 FROM cover_slots WHERE assigned_user_id=? AND cover_date=? AND period=? AND status='assigned' AND id!=? LIMIT 1`,args:[coverUserId,String(slot.coverDate),String(slot.coverDate),coverUserId,String(slot.coverDate),Number(slot.period),slotId]});if(conflict.rows.length)redirect(`/cover?date=${String(slot.coverDate)}&error=conflict`);
  await db().batch([{sql:`UPDATE cover_slots SET status='assigned',assigned_user_id=?,assigned_by=?,assigned_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?`,args:[coverUserId,user.id,slotId]},{sql:`UPDATE cover_applications SET status=CASE WHEN applicant_id=? THEN 'approved' ELSE 'declined' END,decided_by=?,decided_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE cover_slot_id=? AND status='pending'`,args:[coverUserId,user.id,slotId]},{sql:`INSERT INTO notifications(id,user_id,type,entity_type,entity_id,title) VALUES (?,?,?,?,?,?)`,args:[uuid(),coverUserId,"cover_assigned","cover_slot",slotId,`Cover assigned: Period ${Number(slot.period)} on ${String(slot.coverDate)}`]}],"write");
  await audit(user.id,"cover.assigned","cover_slot",slotId,{coverUserId});revalidatePath("/cover");
}

export async function reopenCoverSlot(formData:FormData){
  const user=await requireRole(["department_head","admin","system_admin"]);const slotId=text(formData,"slotId");const result=await db().execute({sql:`SELECT s.absence_id as absenceId,s.cover_date as coverDate FROM cover_slots s WHERE s.id=?`,args:[slotId]});const slot=result.rows[0];if(!slot)redirect("/cover");await coverScope(user,String(slot.absenceId));await db().batch([{sql:`UPDATE cover_slots SET status='open',assigned_user_id=NULL,assigned_by=NULL,assigned_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?`,args:[slotId]},{sql:`UPDATE cover_applications SET status='declined',decided_by=?,decided_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE cover_slot_id=? AND status='approved'`,args:[user.id,slotId]}],"write");await audit(user.id,"cover.reopened","cover_slot",slotId);revalidatePath("/cover");
}

export async function publishCoverNotice(formData:FormData){
  const user=await requireRole(["department_head","admin","system_admin"]);const date=text(formData,"coverDate");if(!coverDate.safeParse(date).success)redirect("/cover?error=dates");
  const result=await db().execute({sql:`SELECT s.period,absent.full_name as absentName,s.class_name as className,s.subject,s.room,cover.full_name as coverName,s.status FROM cover_slots s JOIN absences a ON a.id=s.absence_id JOIN users absent ON absent.id=a.staff_id LEFT JOIN users cover ON cover.id=s.assigned_user_id WHERE s.cover_date=? AND s.status!='cancelled' AND (?=1 OR absent.department_id=?) ORDER BY s.period,absent.full_name`,args:[date,isAdmin(user)?1:0,user.departmentId]});if(!result.rows.length)redirect(`/cover?date=${date}&error=no-slots`);
  const formattedDate=new Intl.DateTimeFormat("en-SG",{dateStyle:"full",timeZone:schoolTimezone}).format(new Date(`${date}T00:00:00+08:00`));const lines=result.rows.map(row=>`| ${row.period} | ${markdownCell(row.absentName)} | ${markdownCell(row.className)} | ${markdownCell(row.subject)} | ${markdownCell(row.room)||"—"} | ${markdownCell(row.coverName)||"**Cover needed**"} |`);
  const body=`## Cover arrangements\n\nThe following arrangements apply on **${formattedDate}**. Please check room and class details before the lesson.\n\n| Period | Absent colleague | Class | Subject | Room | Cover teacher |\n| ---: | --- | --- | --- | --- | --- |\n${lines.join("\n")}\n\n> Unassigned periods remain open for applications on the Cover Board.`;
  const noticeId=uuid(),publishAt=new Date().toISOString().replace("T"," ").slice(0,19);await db().execute({sql:`INSERT INTO notices(id,title,body,category,priority,publish_at,expires_at,acknowledgement_required,author_id,status) VALUES (?,?,?,?,?,?,?,?,?,?)`,args:[noticeId,`Cover arrangements — ${formattedDate}`,body,"Cover / room change","important",publishAt,`${date} 23:59:59`,0,user.id,"published"]});
  const audienceType=user.role==="department_head"?"department":"all_staff";await db().execute({sql:`INSERT INTO audiences(id,entity_type,entity_id,audience_type,audience_value) VALUES (?,?,?,?,?)`,args:[uuid(),"notice",noticeId,audienceType,audienceType==="department"?user.departmentId:null]});await audit(user.id,"cover.notice_published","notice",noticeId,{date,rows:result.rows.length});revalidatePath("/");revalidatePath("/notices");revalidatePath("/admin/notices");redirect(`/notices/${noticeId}`);
}
