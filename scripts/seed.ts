import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";

const client=createClient({url:process.env.DATABASE_URL??"file:./data/school-staff-hub.db",authToken:process.env.DATABASE_AUTH_TOKEN||undefined});
const stamp=(date:Date)=>date.toISOString().replace("T"," ").slice(0,19);
const at=(days:number,hour=9)=>{const d=new Date();d.setDate(d.getDate()+days);d.setHours(hour,0,0,0);return stamp(d)};
const day=(days:number)=>at(days).slice(0,10);
const id=()=>crypto.randomUUID();
const passwordHash=await bcrypt.hash("SchoolHub123!",10);

const departments=[
  ["dep-science","Science"],["dep-maths","Mathematics"],["dep-english","English"],["dep-languages","Languages"],["dep-humanities","Humanities"],["dep-pe","PE"],["dep-admin","Administration"],
];
const users=[
  ["usr-emma","emma.morgan@school.test","Emma Morgan","teacher","dep-science","Science Teacher"],
  ["usr-liam","liam.anderson@school.test","Liam Anderson","teacher","dep-languages","Languages Teacher"],
  ["usr-jaya","jaya.patel@school.test","Jaya Patel","teacher","dep-humanities","Humanities Teacher"],
  ["usr-noah","noah.tan@school.test","Noah Tan","teacher","dep-maths","Mathematics Teacher"],
  ["usr-sofia","sofia.garcia@school.test","Sofia Garcia","teacher","dep-english","English Teacher"],
  ["usr-amir","amir.rahman@school.test","Amir Rahman","teacher","dep-pe","PE Teacher"],
  ["usr-chen","mei.chen@school.test","Mei Chen","teacher","dep-science","Lab Technician"],
  ["usr-hod-science","sarah.lee@school.test","Sarah Lee","department_head","dep-science","Head of Science"],
  ["usr-hod-maths","daniel.wong@school.test","Daniel Wong","department_head","dep-maths","Head of Mathematics"],
  ["usr-hod-languages","lucia.alvarez@school.test","Lucia Alvarez","department_head","dep-languages","Head of Languages"],
  ["usr-admin","olivia.brown@school.test","Olivia Brown","admin","dep-admin","School Administrator"],
  ["usr-office","henry.lim@school.test","Henry Lim","admin","dep-admin","Operations Manager"],
  ["usr-system","alex.chen@school.test","Alex Chen","system_admin","dep-admin","Systems Administrator"],
  ["usr-principal","maria.santos@school.test","Maria Santos","admin","dep-admin","Principal"],
];

const clear=["audit_logs","dismissals","notifications","acknowledgements","audiences","cover_applications","cover_slots","absences","staff_replies","staff_posts","events","documents","quick_links","notices","users","departments"];
for(const table of clear) await client.execute(`DELETE FROM ${table}`);
for(const [depId,name] of departments) await client.execute({sql:`INSERT INTO departments(id,name) VALUES (?,?)`,args:[depId,name]});
for(const [userId,email,name,role,departmentId,title] of users) await client.execute({sql:`INSERT INTO users(id,email,password_hash,full_name,role,department_id,job_title,phone) VALUES (?,?,?,?,?,?,?,?)`,args:[userId,email,passwordHash,name,role,departmentId,title,role==="admin"?"+65 6123 4000":null]});

const absenceRows=[
  ["absence-amir-today","usr-amir",day(0),day(0),"Medical leave","Cover required for morning PE lessons","usr-office"],
  ["absence-sofia-today","usr-sofia",day(0),day(0),"Professional learning","Off-site curriculum workshop","usr-admin"],
  ["absence-noah-tomorrow","usr-noah",day(1),day(1),"Family leave","Approved personal leave","usr-admin"],
];
for(const absence of absenceRows) await client.execute({sql:`INSERT INTO absences(id,staff_id,start_date,end_date,absence_type,notes,reported_by) VALUES (?,?,?,?,?,?,?)`,args:absence});

const coverRows=[
  ["cover-pe-p1","absence-amir-today",day(0),1,"7A","Physical Education","Sports Hall","Take attendance, then follow the athletics station plan.","open",null,null,null],
  ["cover-eng-p2","absence-sofia-today",day(0),2,"9E","English","B2-14","Students should complete the comparative paragraph in Teams.","open",null,null,null],
  ["cover-pe-p3","absence-amir-today",day(0),3,"8C","Physical Education","Main Field","Lead the football skills circuit. Equipment is in Store 2.","assigned","usr-jaya","usr-office",at(0,7)],
  ["cover-eng-p5","absence-sofia-today",day(0),5,"10B","English","B2-14","Continue Act 2 reading and collect exit tickets.","open",null,null,null],
  ["cover-math-p2","absence-noah-tomorrow",day(1),2,"8A","Mathematics","C3-06","Worksheet 4.2 is on the teacher desk.","open",null,null,null],
];
for(const slot of coverRows) await client.execute({sql:`INSERT INTO cover_slots(id,absence_id,cover_date,period,class_name,subject,room,instructions,status,assigned_user_id,assigned_by,assigned_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,args:slot});

const coverApplications=[
  ["application-emma-pe1","cover-pe-p1","usr-emma","I am free Period 1 and can take the sports hall group.","pending",null,null],
  ["application-liam-eng2","cover-eng-p2","usr-liam","I can cover before my Languages lesson.","pending",null,null],
  ["application-jaya-pe3","cover-pe-p3","usr-jaya","Available and happy to cover.","approved","usr-office",at(0,7)],
];
for(const application of coverApplications) await client.execute({sql:`INSERT INTO cover_applications(id,cover_slot_id,applicant_id,note,status,decided_by,decided_at) VALUES (?,?,?,?,?,?,?)`,args:application});

const noticeRows=[
  ["notice-fire","Fire drill at 10:40 today","Please review the revised muster point map before morning break. At the alarm, escort your class to the east field and take the red register pack.","Emergency / safety","critical",at(-1),at(1),1,"usr-admin","published"],
  ["notice-cover","Staff away and cover notes","## Today's cover arrangements\n\nPlease check the room and lesson notes on the **Cover Board** before the period begins.\n\n| Period | Absent colleague | Class | Room | Cover |\n| ---: | --- | --- | --- | --- |\n| 1 | Amir Rahman | 7A PE | Sports Hall | **Cover needed** |\n| 2 | Sofia Garcia | 9E English | B2-14 | **Cover needed** |\n| 3 | Amir Rahman | 8C PE | Main Field | Jaya Patel |\n\n> Teachers who are free may apply directly from the Cover Board.","Cover / room change","important",at(-1),at(1),0,"usr-admin","published"],
  ["notice-activity","Year 9 geography fieldwork","Students in 9A and 9B will be off campus from 08:30 to 14:30 for coastal fieldwork.","Student activity / off-campus","normal",at(-2),at(1),0,"usr-admin","published"],
  ["notice-policy","Updated safeguarding policy","The annual safeguarding policy has been updated. All staff must read and acknowledge the revision by Friday.","Policy / SOP update","important",at(-3),at(7),1,"usr-admin","published"],
  ["notice-exams","Exam access arrangements due","Submit confirmed access arrangements to the examinations office by 15:20 today.","Academic / exams","important",at(-2),at(1),0,"usr-hod-science","published"],
  ["notice-it","Planned Wi-Fi maintenance","Staff Wi-Fi may be unavailable between 17:00 and 18:00 today.","IT","normal",at(-1),at(1),0,"usr-office","published"],
  ["notice-lab","Chemical store inspection","Science staff: please label opened reagents before Monday's compliance inspection.","Facilities","normal",at(-1),at(5),0,"usr-hod-science","published"],
  ["notice-meeting","Whole-school briefing Monday","The weekly staff briefing will begin at 07:45 in the auditorium.","Meeting","normal",at(-1),at(4),0,"usr-admin","published"],
  ["notice-deadline","Professional learning choices","Select your preferred professional learning workshop by next Wednesday.","Deadline","normal",at(-1),at(8),0,"usr-admin","published"],
  ["notice-social","Friday staff breakfast","Coffee and pastries will be available in the staff room from 07:15.","Social / staff life","normal",at(-2),at(1),0,"usr-office","published"],
  ["notice-scheduled","Next term timetable consultation","The draft timetable consultation opens next week.","General announcement","important",at(3),at(14),0,"usr-admin","scheduled"],
  ["notice-expired","Last month's evacuation drill","This archived notice demonstrates expiry handling.","Emergency / safety","critical",at(-40),at(-35),1,"usr-admin","archived"],
];
for(const n of noticeRows) await client.execute({sql:`INSERT INTO notices(id,title,body,category,priority,publish_at,expires_at,acknowledgement_required,author_id,status) VALUES (?,?,?,?,?,?,?,?,?,?)`,args:n as (string|number|null)[]});

const postRows=[
  ["post-french","Looking for a French speaker","Can anyone help with a parent meeting tomorrow morning? It should take about 20 minutes.","Looking For","languages,parent meeting","usr-emma",0],
  ["post-boards","Spare display boards","Two A1 display boards are available from Humanities. Happy to deliver them this afternoon.","Resource Sharing","display,resources","usr-jaya",0],
  ["post-microscope","Microscope camera advice","Has anyone used the new USB microscope cameras with Chromebooks?","Question","science,IT","usr-emma",0],
  ["post-volunteer","Debate competition volunteer","We need one colleague to accompany the debate team next Thursday.","Volunteer Request","English,trip","usr-sofia",0],
  ["post-lost","Found: blue water bottle","Found outside Lab 2 after lunch.","Lost & Found","lost property","usr-chen",0],
  ["post-book","Recommendations for Year 8 class novel","Looking for a contemporary novel that works well for mixed reading levels.","Recommendation","English,books","usr-sofia",0],
  ["post-chairs","Need 12 folding chairs","Could anyone lend us folding chairs for the Languages showcase?","Help Needed","event,equipment","usr-liam",0],
  ["post-resolved","Projector remote found","Thanks to Facilities—the missing auditorium remote has been returned.","Lost & Found","AV,resolved","usr-jaya",1],
];
for(const p of postRows) await client.execute({sql:`INSERT INTO staff_posts(id,title,body,post_type,tags,author_id,resolved,resolved_at,created_at) VALUES (?,?,?,?,?,?,?, ?,?)`,args:[...p,p[6]?at(-1):null,at(-Number(String(p[0]).length)%4)]});
const replyBodies=[
  ["post-french","usr-liam","I can help before registration. Send me the room number."],["post-french","usr-hod-languages","Lucia is also available if you need a second person."],
  ["post-boards","usr-emma","One would be perfect for our STEM display."],["post-microscope","usr-chen","Yes—use the Camera app and set resolution to 720p."],
  ["post-volunteer","usr-jaya","I can join if the return is before 17:00."],["post-lost","usr-amir","I think this belongs to a Year 7 student; I will check."],
  ["post-book","usr-liam","Try The Explorer; our current Year 8s enjoyed it."],["post-chairs","usr-office","Facilities can deliver twelve by 14:00."],
  ["post-resolved","usr-office","Glad it is sorted."],["post-microscope","usr-hod-science","Please add this tip to the shared lab guide."],
];
for(const [postId,authorId,body] of replyBodies) await client.execute({sql:`INSERT INTO staff_replies(id,post_id,author_id,body,created_at) VALUES (?,?,?,?,?)`,args:[id(),postId,authorId,body,at(-1,11)]});

const eventRows=[
  ["event-assembly","Year 10 assembly","Year-level assembly",at(0,8),at(0,9),"Main Hall","academic","usr-admin"],
  ["event-science","Science department briefing","Weekly department check-in",at(0,12),at(0,13),"Lab 3","meeting","usr-hod-science"],
  ["event-club","Activities fair","Student clubs showcase",at(1,14),at(1,16),"Sports Hall","school","usr-admin"],
  ["event-training","Safeguarding refresher","Mandatory annual refresher",at(2,15),at(2,17),"Auditorium","staff","usr-admin"],
  ["event-match","U15 football fixture","Home match",at(3,16),at(3,18),"Main Field","sports","usr-amir"],
  ["event-parents","Year 11 parent conferences","Appointments through the LMS",at(4,15),at(4,19),"Classrooms","school","usr-admin"],
  ["event-exams","Mock examinations begin","Year 11 mock examination window",at(6,8),at(10,16),"Exam Hall","academic","usr-admin"],
  ["event-social","Staff coffee morning","Informal staff gathering",at(5,8),at(5,9),"Staff Room","staff","usr-office"],
];
for(const e of eventRows) await client.execute({sql:`INSERT INTO events(id,title,description,start_at,end_at,location,category,organizer_id) VALUES (?,?,?,?,?,?,?,?)`,args:e});

const docs=[
  ["doc-safeguarding","Safeguarding policy","Current safeguarding responsibilities and reporting process.","Policy",null,"4.2",1,1],
  ["doc-fire","Emergency evacuation SOP","Evacuation roles, muster points, and registers.","SOP",null,"3.0",1,1],
  ["doc-it","IT support quick guide","How to request support and resolve common issues.","IT",null,"2.1",1,0],
  ["doc-lab","Science laboratory safety","Risk assessment and laboratory safety procedures.","SOP","dep-science","5.0",0,1],
  ["doc-exam","Examination invigilation guide","Responsibilities for internal and public examinations.","Academic",null,"2026",0,0],
  ["doc-leave","Staff leave form","Leave request form and guidance.","HR",null,"1.4",0,0],
  ["doc-trip","Educational visits checklist","Planning and safeguarding checklist for off-campus visits.","Template",null,"2.0",0,0],
  ["doc-brand","School presentation template","Official slide deck template.","Template",null,"2026",0,0],
  ["doc-cover","Emergency cover notes template","Template for short-notice cover work.","Template",null,"1.1",0,0],
  ["doc-assessment","Assessment and feedback policy","Whole-school expectations for assessment.","Policy",null,"3.3",0,0],
];
for(const d of docs) await client.execute({sql:`INSERT INTO documents(id,title,description,category,department_id,external_url,version,pinned,acknowledgement_required,updated_by,updated_at) VALUES (?,?,?,?,?,'https://example.edu/staff-resources',?,?,?,?,?)`,args:[d[0],d[1],d[2],d[3],d[4],d[5],d[6],d[7],"usr-admin",at(-1)]});
const links=[
  ["link-lms","Learning platform","https://example.edu/lms","Classes, assignments and learning resources","Teaching",1],
  ["link-attendance","Attendance system","https://example.edu/attendance","Daily registers and attendance records","Operations",2],
  ["link-calendar","Staff calendar","https://example.edu/calendar","Whole-school and department calendar","Planning",3],
  ["link-leave","Leave form","https://example.edu/leave","Submit staff leave requests","HR",4],
  ["link-room","Room booking","https://example.edu/rooms","View room availability","Operations",5],
  ["link-it","IT support","https://example.edu/support","Report an issue or request equipment","Support",6],
  ["link-print","Printing portal","https://example.edu/print","Print balance and secure release","Tools",7],
  ["link-drive","Shared drive","https://example.edu/drive","School files and team folders","Resources",8],
];
for(const l of links) await client.execute({sql:`INSERT INTO quick_links(id,label,url,description,category,sort_order) VALUES (?,?,?,?,?,?)`,args:l});

const audienceRows:[string,string,string,string|null][]=[];
for(const n of noticeRows) audienceRows.push(["notice",String(n[0]),"all_staff",null]);
audienceRows.splice(audienceRows.findIndex((x)=>x[1]==="notice-lab"),1,["notice","notice-lab","department","dep-science"]);
for(const p of postRows) audienceRows.push(["staff_post",String(p[0]),"all_staff",null]);
for(const e of eventRows) audienceRows.push(["event",String(e[0]),"all_staff",null]);
for(const d of docs) audienceRows.push(["document",String(d[0]),d[4]?"department":"all_staff",d[4]?String(d[4]):null]);
for(const l of links) audienceRows.push(["quick_link",String(l[0]),"all_staff",null]);
for(const [entityType,entityId,audienceType,audienceValue] of audienceRows) await client.execute({sql:`INSERT INTO audiences(id,entity_type,entity_id,audience_type,audience_value) VALUES (?,?,?,?,?)`,args:[id(),entityType,entityId,audienceType,audienceValue]});

for(const user of users){
  await client.execute({sql:`INSERT INTO notifications(id,user_id,type,entity_type,entity_id,title) VALUES (?,?,?,?,?,?)`,args:[id(),user[0],"critical_notice","notice","notice-fire","Critical notice: Fire drill at 10:40 today"]});
}
console.log(`Seeded ${users.length} users, ${noticeRows.length} notices, ${postRows.length} posts, ${coverRows.length} cover slots, ${eventRows.length} events, ${docs.length} documents and ${links.length} quick links.`);
console.log("Demo password for every account: SchoolHub123!");
client.close();
