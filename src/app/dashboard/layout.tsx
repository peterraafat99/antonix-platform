import type{ReactNode}from"react";import{requireUser}from"@/lib/auth/server";export default async function Layout({children}:{children:ReactNode}){await requireUser();return children}
