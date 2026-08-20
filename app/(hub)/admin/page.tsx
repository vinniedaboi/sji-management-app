import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, FileText, History, Settings2, Users } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
const areas=[
  ["Official notices","Publish, schedule and archive the official bulletin.","/admin/notices",FileText],
  ["Content library","Manage events, documents and Quick Links.","/admin/content",BookOpen],
  ["Acknowledgements","Review completion and outstanding staff.","/admin/acknowledgements",CheckCircle2],
  ["Users & departments","Manage roles, departments and account status.","/admin/users",Users],
  ["Audit log","Review important administrative activity.","/admin/audit",History],
] as const;
export default function AdminPage(){return <><PageHeader eyebrow="ADMINISTRATION" title="Admin console" description="Manage the content and access that keep the hub reliable."/><section className="admin-grid">{areas.map(([title,description,href,Icon])=><Link href={href} className="surface admin-card" key={href}><span><Icon size={20}/></span><div><h2>{title}</h2><p>{description}</p></div><ArrowRight size={17}/></Link>)}</section><div className="notice-inline"><Settings2 size={17}/><div><strong>Server-enforced access</strong><p>Admin routes and mutations check the signed-in role on the server, independently of navigation visibility.</p></div></div></>}
