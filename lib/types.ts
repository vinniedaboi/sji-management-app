export type Role = "teacher" | "department_head" | "admin" | "system_admin";

export type HubUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  departmentId: string | null;
  departmentName: string | null;
  jobTitle: string;
  active: boolean;
};

export type Audience = {
  entityType: string;
  entityId: string;
  audienceType: "all_staff" | "role" | "department" | "specific_user";
  audienceValue: string | null;
};

export const isAdmin = (user: HubUser) => user.role === "admin" || user.role === "system_admin";
export const isSystemAdmin = (user: HubUser) => user.role === "system_admin";
export const canCreateOfficial = (user: HubUser) => user.role !== "teacher";

export function audienceMatches(user: HubUser, audience: Audience) {
  if (isAdmin(user)) return true;
  if (audience.audienceType === "all_staff") return true;
  if (audience.audienceType === "role") return audience.audienceValue === user.role;
  if (audience.audienceType === "department") return audience.audienceValue === user.departmentId;
  return audience.audienceType === "specific_user" && audience.audienceValue === user.id;
}
