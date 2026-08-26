import type{GlobalRole,MemberRole,MembershipStatus}from"@/lib/database.types";
export interface AccessContext{userId:string;globalRole:GlobalRole;memberships:Array<{companyId:string;role:MemberRole;status:MembershipStatus}>}
export const isPlatformAdmin=(c:AccessContext)=>c.globalRole==="platform_admin";
export const canAccessAdmin=isPlatformAdmin;
export function canAccessCompany(c:AccessContext,id:string){return isPlatformAdmin(c)||c.memberships.some(m=>m.companyId===id&&m.status==="active")}
