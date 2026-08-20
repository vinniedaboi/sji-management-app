import { CheckCircle2, Clock3 } from "lucide-react";
import { Badge, PageHeader } from "@/components/app-shell";
import { db, rows } from "@/lib/db";
type Item={entityType:string;id:string;title:string;category:string};type Person={id:string;fullName:string};type Ack={entity_type:string;entity_id:string;user_id:string};
export default async function AdminAcknowledgements(){
  const [itemResult,userResult,ackResult]=await Promise.all([
    db().execute(`SELECT 'notice' as entityType,id,title,category FROM notices WHERE acknowledgement_required=1 UNION ALL SELECT 'document',id,title,category FROM documents WHERE acknowledgement_required=1 ORDER BY title`),
    db().execute(`SELECT id,full_name as fullName FROM users WHERE active=1 ORDER BY full_name`),
    db().execute(`SELECT entity_type,entity_id,user_id FROM acknowledgements`),
  ]);const items=rows<Item>(itemResult),people=rows<Person>(userResult),acks=rows<Ack>(ackResult);
  return <><PageHeader eyebrow="ADMIN · COMPLIANCE" title="Acknowledgements" description="Monitor required reading and contact outstanding staff."/><section className="content-list">{items.map(item=>{const completed=new Set(acks.filter(a=>a.entity_type===item.entityType&&a.entity_id===item.id).map(a=>a.user_id));const outstanding=people.filter(person=>!completed.has(person.id));const pct=Math.round(completed.size/people.length*100);return <article className="surface ack-row" key={`${item.entityType}-${item.id}`}><span className="ack-icon">{pct===100?<CheckCircle2 size={19}/>:<Clock3 size={19}/>}</span><div><div className="item-meta"><Badge>{item.entityType}</Badge><Badge>{item.category}</Badge></div><h2>{item.title}</h2><div className="progress"><span style={{width:`${pct}%`}}/></div><small>{completed.size} of {people.length} staff · {pct}% complete</small>{outstanding.length>0&&<details><summary>View {outstanding.length} outstanding</summary><ul>{outstanding.map(person=><li key={person.id}>{person.fullName}</li>)}</ul></details>}</div></article>})}</section></>
}
