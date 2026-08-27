import { db, rows } from "@/lib/db";
import { audienceMatches, type Audience, type HubUser } from "@/lib/types";

export type RecordRow = Record<string, string | number | null> & { id: string };

async function audiences(entityType: string) {
  return rows<Audience>(await db().execute({ sql: `SELECT entity_type as entityType,entity_id as entityId,audience_type as audienceType,audience_value as audienceValue FROM audiences WHERE entity_type=?`, args: [entityType] }));
}

export async function visible<T extends RecordRow>(user: HubUser, entityType: string, items: T[]) {
  const all = await audiences(entityType);
  return items.filter((item) => {
    const targets = all.filter((a) => a.entityId === item.id);
    return targets.length === 0 || targets.some((target) => audienceMatches(user, target));
  });
}

export async function notices(user: HubUser, includeArchived = false, query = "") {
  await db().batch([
    { sql: `UPDATE notices SET status='archived',updated_at=CURRENT_TIMESTAMP WHERE status!='archived' AND expires_at IS NOT NULL AND expires_at<=CURRENT_TIMESTAMP`, args: [] },
    { sql: `UPDATE notices SET status='published',updated_at=CURRENT_TIMESTAMP WHERE status='scheduled' AND publish_at<=CURRENT_TIMESTAMP`, args: [] },
  ]);
  const result = await db().execute({ sql: `SELECT n.*,u.full_name as authorName FROM notices n JOIN users u ON u.id=n.author_id WHERE (?::int=1 OR (n.status!='archived' AND n.publish_at<=CURRENT_TIMESTAMP AND (n.expires_at IS NULL OR n.expires_at>CURRENT_TIMESTAMP))) AND (?::text='' OR lower(n.title||' '||n.body||' '||n.category||' '||u.full_name) LIKE '%'||lower(?::text)||'%') ORDER BY CASE n.priority WHEN 'critical' THEN 0 WHEN 'important' THEN 1 ELSE 2 END,n.publish_at DESC`, args: [includeArchived ? 1 : 0, query, query] });
  return visible(user, "notice", rows<RecordRow>(result));
}

export async function noticeById(user: HubUser, id: string) { return (await visible(user, "notice", rows<RecordRow>(await db().execute({ sql: `SELECT n.*,u.full_name as authorName FROM notices n JOIN users u ON u.id=n.author_id WHERE n.id=?`, args: [id] }))))[0] ?? null; }
export type PostFilters = {
  status?: "open" | "resolved" | "all";
  postType?: string;
  author?: "all" | "mine";
  sort?: "newest" | "oldest" | "most-replies";
};

export async function posts(user: HubUser, includeResolved = false, query = "", filters: PostFilters = {}) {
  const status = filters.status ?? (includeResolved ? "all" : "open");
  const postType = filters.postType ?? "";
  const author = filters.author ?? "all";
  const sort = filters.sort ?? "newest";
  const orderBy = sort === "oldest" ? "p.created_at ASC" : sort === "most-replies" ? '"replyCount" DESC,p.created_at DESC' : "p.created_at DESC";
  const result = await db().execute({
    sql: `SELECT p.*,u.full_name as authorName,u.job_title as authorTitle,(SELECT count(*) FROM staff_replies r WHERE r.post_id=p.id) as replyCount FROM staff_posts p JOIN users u ON u.id=p.author_id WHERE (?::text='all' OR (?::text='open' AND p.resolved=0) OR (?::text='resolved' AND p.resolved=1)) AND (?::text='' OR p.post_type=?) AND (?::text='all' OR p.author_id=?) AND (?::text='' OR lower(p.title||' '||p.body||' '||p.post_type||' '||p.tags||' '||u.full_name) LIKE '%'||lower(?::text)||'%') ORDER BY ${orderBy}`,
    args: [status,status,status,postType,postType,author,user.id,query,query],
  });
  return visible(user,"staff_post",rows<RecordRow>(result));
}
export async function postById(user: HubUser,id:string){return (await visible(user,"staff_post",rows<RecordRow>(await db().execute({sql:`SELECT p.*,u.full_name as authorName,u.job_title as authorTitle FROM staff_posts p JOIN users u ON u.id=p.author_id WHERE p.id=?`,args:[id]}))))[0]??null;}
export async function replies(postId:string){return rows<RecordRow>(await db().execute({sql:`SELECT r.*,u.full_name as authorName,u.job_title as authorTitle FROM staff_replies r JOIN users u ON u.id=r.author_id WHERE r.post_id=? ORDER BY r.created_at`,args:[postId]}));}
export async function events(user:HubUser){const result=await db().execute(`SELECT e.*,u.full_name as organizerName FROM events e LEFT JOIN users u ON u.id=e.organizer_id WHERE e.end_at>=CURRENT_TIMESTAMP ORDER BY e.start_at`);return visible(user,"event",rows<RecordRow>(result));}
export async function documents(user:HubUser,query=""){const result=await db().execute({sql:`SELECT d.*,dep.name as departmentName,u.full_name as updatedByName FROM documents d LEFT JOIN departments dep ON dep.id=d.department_id LEFT JOIN users u ON u.id=d.updated_by WHERE ?::text='' OR lower(d.title||' '||d.description||' '||d.category||' '||coalesce(dep.name,'')) LIKE '%'||lower(?::text)||'%' ORDER BY d.pinned DESC,d.updated_at DESC`,args:[query,query]});return visible(user,"document",rows<RecordRow>(result));}
export async function quickLinks(user:HubUser){return visible(user,"quick_link",rows<RecordRow>(await db().execute(`SELECT * FROM quick_links WHERE active=1 ORDER BY sort_order,label`)));}
export async function directory(query=""){return rows<RecordRow>(await db().execute({sql:`SELECT u.id,u.full_name as fullName,u.email,u.role,u.job_title as jobTitle,u.phone,d.name as departmentName FROM users u LEFT JOIN departments d ON d.id=u.department_id WHERE u.active=1 AND (?::text='' OR lower(u.full_name||' '||u.email||' '||u.job_title||' '||coalesce(d.name,'')) LIKE '%'||lower(?::text)||'%') ORDER BY u.full_name`,args:[query,query]}));}
export async function acknowledgements(entityType:string,entityId:string){return rows<RecordRow>(await db().execute({sql:`SELECT a.*,u.full_name as userName,u.email FROM acknowledgements a JOIN users u ON u.id=a.user_id WHERE a.entity_type=? AND a.entity_id=? ORDER BY a.acknowledged_at`,args:[entityType,entityId]}));}
export async function hasAcknowledged(userId:string,entityType:string,entityId:string){const r=await db().execute({sql:`SELECT 1 FROM acknowledgements WHERE user_id=? AND entity_type=? AND entity_id=? LIMIT 1`,args:[userId,entityType,entityId]});return r.rows.length>0;}
