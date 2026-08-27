import Link from "next/link";
import { BookOpen, CalendarDays, ExternalLink, FileText, MessageSquare, Search, Users } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { directory, documents, events, notices, posts, quickLinks, type RecordRow } from "@/lib/data";
import { markdownSnippet, snippet } from "@/lib/format";

type SearchItem=RecordRow&{title?:string;label?:string;fullName?:string;body?:string;description?:string;jobTitle?:string;url?:string};
export default async function SearchPage({searchParams}:{searchParams:Promise<{q?:string}>}){
  const user=await requireUser();const q=(await searchParams).q??"";
  const [ns,ps,ds,es,ls,people]=q?await Promise.all([notices(user,false,q),posts(user,true,q),documents(user,q),events(user).then(x=>x.filter(e=>`${e.title} ${e.description}`.toLowerCase().includes(q.toLowerCase()))),quickLinks(user).then(x=>x.filter(l=>`${l.label} ${l.description}`.toLowerCase().includes(q.toLowerCase()))),directory(q)]):[[],[],[],[],[],[]];
  const groups:{name:string;Icon:typeof Search;items:SearchItem[];href:(item:SearchItem)=>string}[]=[
    {name:"Notices",Icon:FileText,items:ns,href:x=>`/notices/${x.id}`},{name:"Staff Board",Icon:MessageSquare,items:ps,href:x=>`/staff-board/${x.id}`},{name:"Documents",Icon:BookOpen,items:ds,href:()=>"/documents"},{name:"Events",Icon:CalendarDays,items:es,href:()=>"/events"},{name:"Quick Links",Icon:ExternalLink,items:ls,href:x=>String(x.url)},{name:"People",Icon:Users,items:people,href:()=>"/directory"},
  ];const count=groups.reduce((sum,g)=>sum+g.items.length,0);
  return <><PageHeader eyebrow="GLOBAL SEARCH" title="Search the hub" description="Results always respect your role and audience permissions."/><form className="global-search"><Search size={20}/><input name="q" defaultValue={q} placeholder="Search notices, people, documents and more"/><button className="button button-primary">Search</button></form>{q&&<p className="result-count">{count} results for “{q}”</p>}<div className="search-results">{groups.filter(g=>g.items.length).map(({name,Icon,items,href})=><section className="surface" key={name}><h2><Icon size={17}/>{name}<span>{items.length}</span></h2>{items.slice(0,5).map(item=><Link href={href(item)} key={item.id}><strong>{item.title??item.label??item.fullName}</strong><p>{name==="Notices"?markdownSnippet(String(item.body??""),110):snippet(String(item.body??item.description??item.jobTitle??""),110)}</p></Link>)}</section>)}</div>{q&&count===0&&<EmptyState title="No matches" description="Try fewer or more general keywords."/>}</>
}
