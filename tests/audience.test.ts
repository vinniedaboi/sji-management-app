import assert from "node:assert/strict";
import test from "node:test";
import { audienceMatches, canCreateOfficial, isAdmin, type Audience, type HubUser } from "../lib/types";

const teacher:HubUser={id:"teacher-1",email:"teacher@test",fullName:"Teacher",role:"teacher",departmentId:"science",departmentName:"Science",jobTitle:"Teacher",active:true};
const admin:HubUser={...teacher,id:"admin-1",role:"admin",departmentId:"admin"};
const audience=(audienceType:Audience["audienceType"],audienceValue:string|null):Audience=>({entityType:"notice",entityId:"n1",audienceType,audienceValue});
test("all-staff content is visible",()=>assert.equal(audienceMatches(teacher,audience("all_staff",null)),true));
test("department targeting does not leak across departments",()=>assert.equal(audienceMatches(teacher,audience("department","mathematics")),false));
test("specific-user targeting matches only that user",()=>{assert.equal(audienceMatches(teacher,audience("specific_user","teacher-1")),true);assert.equal(audienceMatches(teacher,audience("specific_user","teacher-2")),false)});
test("admins receive the administrative visibility override",()=>assert.equal(audienceMatches(admin,audience("department","mathematics")),true));
test("teachers cannot create official notices",()=>{assert.equal(canCreateOfficial(teacher),false);assert.equal(isAdmin(teacher),false);assert.equal(canCreateOfficial(admin),true)});
