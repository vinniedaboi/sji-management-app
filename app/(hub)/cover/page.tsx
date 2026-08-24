import Link from "next/link";
import { addDays, format } from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Inbox,
  LayoutDashboard,
  Plus,
  RotateCcw,
  Send,
  UserCheck,
  UserRoundX,
  Users,
} from "lucide-react";
import {
  applyForCover,
  assignCoverSlot,
  cancelAbsence,
  createCoverSlot,
  publishCoverNotice,
  reopenCoverSlot,
  reportAbsence,
  withdrawCoverApplication,
} from "@/app/actions";
import { Badge, EmptyState, PageHeader } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import {
  absenceTypes,
  absencesForDate,
  availableCoverStaff,
  coverApplicationsForDate,
  coverBoard,
  manageableAbsences,
  schoolPeriods,
} from "@/lib/cover";
import { db, rows } from "@/lib/db";
import { schoolDate } from "@/lib/format";
import { isAdmin } from "@/lib/types";

type CoverView = "overview" | "open" | "mine" | "applications";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const errorMessages: Record<string, string> = {
  dates: "Choose a valid absence date range.",
  overlap: "That colleague already has an absence recorded for these dates.",
  slot: "Check the period and lesson details.",
  "duplicate-slot": "A cover requirement already exists for that absence and period.",
  unavailable: "That cover slot is no longer available.",
  conflict: "That colleague already has an absence, assignment or application in this period.",
  assignee: "Choose an available teaching colleague.",
  "no-slots": "Add at least one cover requirement before publishing the notice.",
};

export default async function CoverPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    period?: string;
    view?: string;
    report?: string;
    add?: string;
    error?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const date = datePattern.test(params.date ?? "") ? params.date! : schoolDate();
  const period = schoolPeriods.includes(Number(params.period) as (typeof schoolPeriods)[number]) ? Number(params.period) : 0;
  const manager = user.role !== "teacher";
  const unrestricted = isAdmin(user);
  const requestedView = ["overview", "open", "mine", "applications"].includes(params.view ?? "") ? (params.view as CoverView) : "overview";
  const view: CoverView = requestedView === "applications" && !manager ? "overview" : requestedView;

  const [dailySlots, absences, applications, coverStaff, slotAbsences, absenceStaff] = await Promise.all([
    coverBoard(date, user.id),
    absencesForDate(date),
    manager ? coverApplicationsForDate(date) : Promise.resolve([]),
    manager ? availableCoverStaff(date) : Promise.resolve([]),
    manager ? manageableAbsences(date, user.departmentId, unrestricted) : Promise.resolve([]),
    manager
      ? db().execute({
          sql: `SELECT u.id,u.full_name as fullName,u.job_title as jobTitle FROM users u WHERE u.active=1 AND u.role IN ('teacher','department_head') AND (?=1 OR u.department_id=?) ORDER BY u.full_name`,
          args: [unrestricted ? 1 : 0, user.departmentId],
        }).then((result) => rows<{ id: string; fullName: string; jobTitle: string }>(result))
      : Promise.resolve([]),
  ]);

  const canManageSlot = (slot: (typeof dailySlots)[number]) => unrestricted || (user.role === "department_head" && slot.departmentId === user.departmentId);
  const periodSlots = period ? dailySlots.filter((slot) => slot.period === period) : dailySlots;
  const openCount = dailySlots.filter((slot) => slot.status === "open").length;
  const assignedCount = dailySlots.filter((slot) => slot.status === "assigned").length;
  const mySlots = dailySlots.filter((slot) => slot.assignedUserId === user.id || slot.myApplicationStatus === "pending");
  const applicationCount = dailySlots.filter(canManageSlot).reduce((total, slot) => total + Number(slot.pendingApplicationCount), 0);
  const visibleSlots = periodSlots.filter((slot) => {
    if (view === "open") return slot.status === "open";
    if (view === "mine") return slot.assignedUserId === user.id || slot.myApplicationStatus === "pending";
    if (view === "applications") return canManageSlot(slot) && Number(slot.pendingApplicationCount) > 0;
    return true;
  });
  const applicationsBySlot = Map.groupBy(applications, (application) => application.coverSlotId);
  const previous = format(addDays(new Date(`${date}T12:00:00`), -1), "yyyy-MM-dd");
  const next = format(addDays(new Date(`${date}T12:00:00`), 1), "yyyy-MM-dd");
  const dateLabel = new Intl.DateTimeFormat("en-SG", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`));
  const coverUrl = (nextView: CoverView = view, nextPeriod = period, nextDate = date) => `/cover?date=${nextDate}&view=${nextView}${nextPeriod ? `&period=${nextPeriod}` : ""}`;
  const viewCopy = {
    overview: ["All cover", "Every cover requirement for the selected day."],
    open: ["Cover needed", "Open lessons where a colleague can volunteer."],
    mine: ["My cover", "Your assignments and pending applications."],
    applications: ["Applications", "Cover offers waiting for a coordinator decision."],
  } as const;

  return <>
    <PageHeader eyebrow="DAILY OPERATIONS" title="Cover" description="Choose a day, then go straight to the cover task you need." actions={<div className="cover-header-actions"><Link className="button button-secondary" href={`${coverUrl()}&report=1`}><UserRoundX size={16}/>Report absence</Link>{manager&&<Link className="button button-primary" href={`${coverUrl()}&add=1`}><Plus size={16}/>Add cover need</Link>}</div>}/>
    {params.error&&<div className="form-error">{errorMessages[params.error]??"That cover action could not be completed."}</div>}

    {params.report&&<section className="surface form-panel cover-form-panel" id="report-absence"><h2><UserRoundX size={18}/>Report an absence</h2><form action={reportAbsence} className="form-grid">{manager?<label className="span-2">Absent colleague<select name="staffId" required>{absenceStaff.map((person)=><option value={person.id} key={person.id}>{person.fullName} — {person.jobTitle}</option>)}</select></label>:<div className="span-2 notice-inline"><Users size={17}/><p>This absence will be recorded for <strong>{user.fullName}</strong>.</p></div>}<label>First day<input type="date" name="startDate" defaultValue={date} required/></label><label>Last day<input type="date" name="endDate" defaultValue={date} required/></label><label>Absence type<select name="absenceType">{absenceTypes.map((type)=><option key={type}>{type}</option>)}</select></label><label>Operational note<input name="notes" maxLength={500} placeholder="Information for the cover coordinator"/></label><div className="span-2 form-actions"><Link className="button button-secondary" href={coverUrl()}>Cancel</Link><button className="button button-primary">Record absence</button></div></form></section>}

    {manager&&params.add&&<section className="surface form-panel cover-form-panel" id="add-cover"><h2><ClipboardCheck size={18}/>Add a cover requirement</h2>{slotAbsences.length?<form action={createCoverSlot} className="form-grid"><label className="span-2">Absent colleague<select name="absenceId" required>{slotAbsences.map((absence)=><option value={absence.id} key={absence.id}>{absence.staffName}</option>)}</select></label><input type="hidden" name="coverDate" value={date}/><label>Period<select name="period">{schoolPeriods.map((item)=><option key={item} value={item}>Period {item}</option>)}</select></label><label>Class or group<input name="className" required placeholder="e.g. 8A"/></label><label>Subject<input name="subject" required placeholder="e.g. Mathematics"/></label><label>Room<input name="room" placeholder="e.g. C3-06"/></label><label className="span-2">Cover instructions<textarea name="instructions" rows={3} maxLength={1000} placeholder="Work set, register notes, equipment or safeguarding information"/></label><div className="span-2 form-actions"><Link className="button button-secondary" href={coverUrl()}>Cancel</Link><button className="button button-primary">Add to cover board</button></div></form>:<div className="notice-inline notice-warning"><UserRoundX size={17}/><p>Record an absence for {date} before adding cover requirements.</p></div>}</section>}

    <section className="surface cover-workspace-nav">
      <div className="cover-date-bar"><Link className="icon-button" href={coverUrl(view,period,previous)} aria-label="Previous day"><ChevronLeft size={18}/></Link><form><label><CalendarDays size={17}/><span className="sr-only">Cover date</span><input type="date" name="date" defaultValue={date}/></label><input type="hidden" name="view" value={view}/><input type="hidden" name="period" value={period||""}/><button className="button button-secondary">Go</button></form><Link className="icon-button" href={coverUrl(view,period,next)} aria-label="Next day"><ChevronRight size={18}/></Link><div className="cover-date-summary"><strong>{dateLabel}</strong><span>{absences.length} away · {openCount} open · {assignedCount} assigned</span></div><Link className="button button-secondary" href={coverUrl(view,period,schoolDate())}>Today</Link></div>
      <nav className="cover-view-tabs" aria-label="Cover views"><Link className={view==="overview"?"active":""} href={coverUrl("overview")}><LayoutDashboard size={17}/><span><strong>Day overview</strong><small>{dailySlots.length} lessons</small></span></Link><Link className={view==="open"?"active":""} href={coverUrl("open")}><ClipboardCheck size={17}/><span><strong>Cover needed</strong><small>{openCount} open</small></span></Link><Link className={view==="mine"?"active":""} href={coverUrl("mine")}><UserCheck size={17}/><span><strong>My cover</strong><small>{mySlots.length} items</small></span></Link>{manager&&<Link className={view==="applications"?"active":""} href={coverUrl("applications")}><Inbox size={17}/><span><strong>Applications</strong><small>{applicationCount} waiting</small></span></Link>}</nav>
      <nav className="period-chips" aria-label="Filter by period"><span>Period</span><Link className={!period?"active":""} href={coverUrl(view,0)}>All</Link>{schoolPeriods.map((item)=><Link className={period===item?"active":""} href={coverUrl(view,item)} key={item}>{item}</Link>)}</nav>
    </section>

    {view==="overview"&&<section className="surface absent-panel"><div className="surface-header"><h2><UserRoundX size={17}/>Who is absent</h2><Badge tone={absences.length?"important":"success"}>{absences.length||"None"}</Badge></div>{absences.length?<div className="absence-list">{absences.map((absence)=>{const canManageAbsence=absence.staffId===user.id||unrestricted||user.role==="department_head"&&absence.departmentId===user.departmentId;return <article key={absence.id}><span className="avatar">{absence.staffName.split(/\s+/).map((part)=>part[0]).join("").slice(0,2)}</span><div><strong>{absence.staffName}</strong><small>{absence.jobTitle} · {absence.departmentName??"School"}</small>{canManageAbsence&&absence.notes&&<span className="absence-note">{absence.notes}</span>}</div><Badge>{canManageAbsence?absence.absenceType:"Away"}</Badge>{canManageAbsence&&<form action={cancelAbsence}><input type="hidden" name="absenceId" value={absence.id}/><button className="text-link" type="submit">Cancel absence</button></form>}</article>})}</div>:<p className="panel-empty">No confirmed staff absences for this date.</p>}</section>}

    <div className="cover-board-heading"><div><p className="eyebrow">{period?`PERIOD ${period}`:"PERIOD-BY-PERIOD"}</p><h2>{viewCopy[view][0]}</h2><p>{viewCopy[view][1]}</p></div>{manager&&dailySlots.length>0&&<form action={publishCoverNotice}><input type="hidden" name="coverDate" value={date}/><button className="button button-secondary"><FileText size={15}/>Publish daily notice</button></form>}</div>
    <section className="surface cover-table-wrap">{visibleSlots.length?<table className="cover-table"><thead><tr><th>Period</th><th>Absent</th><th>Lesson</th><th>Room</th><th>Cover</th><th>Next step</th></tr></thead><tbody>{visibleSlots.map((slot)=>{const canManage=canManageSlot(slot);const slotApplications=applicationsBySlot.get(slot.id)??[];return <tr key={slot.id}><td data-label="Period"><span className="period-pill">{slot.period}</span></td><td data-label="Absent"><strong>{slot.absentStaffName}</strong><small>{slot.departmentName}</small></td><td data-label="Lesson"><strong>{slot.className} · {slot.subject}</strong>{slot.instructions&&<small>{slot.instructions}</small>}</td><td data-label="Room">{slot.room||"—"}</td><td data-label="Cover">{slot.assignedUserName?<><strong>{slot.assignedUserName}</strong>{slot.assignedUserId===user.id&&<Badge tone="success">You</Badge>}</>:<span className="cover-needed">Cover needed</span>}</td><td data-label="Next step"><div className="cover-actions"><Badge tone={slot.status==="assigned"?"success":"important"}>{slot.status}</Badge>{canManage?(slot.status==="assigned"?<form action={reopenCoverSlot}><input type="hidden" name="slotId" value={slot.id}/><button className="text-link"><RotateCcw size={13}/>Reopen</button></form>:<details className="cover-assignment" open={view==="applications"}><summary>{slot.pendingApplicationCount?`Review ${slot.pendingApplicationCount} application${Number(slot.pendingApplicationCount)===1?"":"s"}`:"Assign colleague"}</summary>{slotApplications.length>0&&<div className="application-list">{slotApplications.map((application)=><article key={application.id}><div><strong>{application.applicantName}</strong><small>{application.applicantJobTitle}</small>{application.note&&<p>{application.note}</p>}</div><form action={assignCoverSlot}><input type="hidden" name="slotId" value={slot.id}/><input type="hidden" name="coverUserId" value={application.applicantId}/><button className="button button-primary">Approve</button></form></article>)}</div>}<form action={assignCoverSlot} className="direct-assign"><input type="hidden" name="slotId" value={slot.id}/><label><span className="sr-only">Assign a colleague</span><select name="coverUserId" required defaultValue=""><option value="" disabled>Select colleague…</option>{coverStaff.filter((person)=>person.id!==slot.absentStaffId).map((person)=><option value={person.id} key={person.id}>{person.fullName}</option>)}</select></label><button className="button button-secondary">Assign</button></form></details>):slot.status==="open"&&slot.absentStaffId!==user.id?(slot.myApplicationStatus==="pending"?<div className="application-pending"><span>Application pending</span><form action={withdrawCoverApplication}><input type="hidden" name="applicationId" value={slot.myApplicationId??""}/><button className="text-link">Withdraw</button></form></div>:<details className="cover-apply"><summary>Apply to cover</summary><form action={applyForCover}><input type="hidden" name="slotId" value={slot.id}/><label>Note (optional)<input name="note" maxLength={300} placeholder="Relevant experience or context"/></label><label className="check"><input type="checkbox" name="availabilityConfirmed" required/>I confirm I am free this period</label><button className="button button-primary"><Send size={14}/>Submit application</button></form></details>):null}</div></td></tr>})}</tbody></table>:<EmptyState title={view==="open"?"All cover is assigned":view==="mine"?"Nothing assigned to you":view==="applications"?"No applications waiting":"No cover requirements"} description={view==="open"?"There are no open cover lessons for this selection.":"Try another period or date."}/>}</section>
  </>;
}
