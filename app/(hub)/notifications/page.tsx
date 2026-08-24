import Link from "next/link";
import { Bell } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { db, rows } from "@/lib/db";
import { relativeTime } from "@/lib/format";
export default async function NotificationsPage(){const user=await requireUser();const items=rows<Record<string,string>&{id:string}>(await db().execute({sql:`SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50`,args:[user.id]}));return <><PageHeader eyebrow="IN-APP ALERTS" title="Notifications" description="Priority notices, cover assignments, acknowledgements and Staff Board replies."/><section className="surface notification-list">{items.map((n)=><Link href={n.entity_type==="staff_post"?`/staff-board/${n.entity_id}`:n.entity_type==="cover_slot"?"/cover":`/notices/${n.entity_id}`} key={n.id}><span><Bell size={16}/></span><div><strong>{n.title}</strong><p>{relativeTime(n.created_at)}</p></div></Link>)}{items.length===0&&<EmptyState title="No notifications" description="New alerts will appear here."/>}</section></>}
