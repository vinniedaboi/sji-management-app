import Link from "next/link";
import { ChevronRight, ListFilter, MessageCircle, Plus, Search, X } from "lucide-react";
import { createPost } from "@/app/actions";
import { Badge, EmptyState, PageHeader } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { posts } from "@/lib/data";
import { relativeTime, snippet } from "@/lib/format";
const types=["Question","Looking For","Help Needed","Resource Request","Resource Sharing","Volunteer Request","Lost & Found","Recommendation","Social","General"];
export default async function StaffBoard({searchParams}:{searchParams:Promise<{q?:string;status?:string;type?:string;author?:string;sort?:string;compose?:string;error?:string}>}){
  const user=await requireUser();const p=await searchParams;
  const status=p.status==="resolved"||p.status==="all"?p.status:"open";
  const postType=types.includes(p.type??"")?p.type??"":"";
  const author=p.author==="mine"?"mine":"all";
  const sort=p.sort==="oldest"||p.sort==="most-replies"?p.sort:"newest";
  const items=await posts(user,true,p.q??"",{status,postType,author,sort});
  const hasFilters=Boolean(p.q||status!=="open"||postType||author!=="all"||sort!=="newest");
  return <><PageHeader eyebrow="TEACHER COMMUNITY" title="Staff Board" description="Ask colleagues, share resources, and find help." actions={<Link className="button button-primary" href="/staff-board?compose=1"><Plus size={16}/>New post</Link>}/>{p.compose&&<section className="surface form-panel"><h2>Create a staff post</h2><form action={createPost} className="form-grid"><label className="span-2">Title<input name="title" required minLength={4} placeholder="What do you need?"/></label><label>Post type<select name="postType">{types.map((type)=><option key={type}>{type}</option>)}</select></label><label>Audience<select name="audienceType"><option value="all_staff">All staff</option><option value="department">My department</option><option value="role">Role</option></select></label><input type="hidden" name="audienceValue" value={user.departmentId??user.role}/><label className="span-2">Details<textarea name="body" required rows={4} placeholder="Add enough context for colleagues to help."/></label><label className="span-2">Tags<input name="tags" placeholder="languages, resources"/></label><div className="span-2 form-actions"><Link className="button button-secondary" href="/staff-board">Cancel</Link><button className="button button-primary">Publish post</button></div></form></section>}
    <form className="surface board-filters">
      <div className="board-filter-search"><Search size={17}/><label className="sr-only" htmlFor="board-search">Search the Staff Board</label><input id="board-search" name="q" defaultValue={p.q} placeholder="Search posts, tags or colleagues"/></div>
      <div className="board-filter-fields">
        <label>Status<select name="status" defaultValue={status}><option value="open">Open posts</option><option value="resolved">Resolved posts</option><option value="all">All posts</option></select></label>
        <label>Post type<select name="type" defaultValue={postType}><option value="">All types</option>{types.map(type=><option key={type}>{type}</option>)}</select></label>
        <label>Posted by<select name="author" defaultValue={author}><option value="all">Everyone</option><option value="mine">My posts</option></select></label>
        <label>Sort by<select name="sort" defaultValue={sort}><option value="newest">Newest first</option><option value="most-replies">Most replies</option><option value="oldest">Oldest first</option></select></label>
        <div className="board-filter-actions"><button className="button button-primary"><ListFilter size={15}/>Apply filters</button>{hasFilters&&<Link className="button button-secondary" href="/staff-board"><X size={15}/>Clear</Link>}</div>
      </div>
    </form>
    <p className="board-results-summary">{items.length} {items.length===1?"post":"posts"} found</p>
    <section className="content-list community-list">{items.map((post)=><Link className={`content-row ${post.resolved?"is-resolved":""}`} href={`/staff-board/${post.id}`} key={post.id}><div className="content-row-main"><div className="item-meta"><Badge tone={post.resolved?"success":"info"}>{post.resolved?"Resolved":post.post_type}</Badge>{post.resolved&&<Badge>{post.post_type}</Badge>}</div><h2>{post.title}</h2><p>{snippet(String(post.body),180)}</p><small>{post.authorName} · {relativeTime(String(post.created_at))} · <MessageCircle size={12}/>{post.replyCount} replies</small></div><ChevronRight size={18}/></Link>)}{items.length===0&&<EmptyState title="No posts found" description="Try clearing a filter or using a broader search."/>}</section></>}
