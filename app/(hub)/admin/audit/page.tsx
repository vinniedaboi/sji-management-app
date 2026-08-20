import { History } from "lucide-react";
import { Badge, PageHeader } from "@/components/app-shell";
import { db, rows } from "@/lib/db";
import { prettyDateTime } from "@/lib/format";
export default async function AuditPage(){const logs=rows<any>(await db().execute(`SELECT a.*,u.full_name as actorName FROM audit_logs a JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 100`));return <><PageHeader eyebrow="ADMIN · AUDIT" title="Audit log" description="A permanent record of important administrative changes."/><section className="surface audit-list">{logs.map(log=><article key={log.id}><span><History size={15}/></span><div><strong>{log.actorName}</strong> <span>{String(log.action).replaceAll("."," ")}</span><p><Badge>{log.entity_type}</Badge> {log.entity_id}</p></div><time>{prettyDateTime(log.created_at)}</time></article>)}</section></>}
