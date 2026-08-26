import { z } from "zod";
import type { GoogleConnection } from "@/lib/database.types";
import { getGoogleEnv } from "@/lib/env";
import { getValidAccessToken } from "./tokens";
import type { GoogleAccount, GoogleBusinessLocation, GoogleReviewList } from "./types";

export const accountNameSchema = z.string().regex(/^accounts\/[A-Za-z0-9_-]+$/);
export const locationNameSchema = z.string().regex(/^locations\/[A-Za-z0-9_-]+$/);
export const reviewNameSchema = z.string().regex(/^accounts\/[A-Za-z0-9_-]+\/locations\/[A-Za-z0-9_-]+\/reviews\/[A-Za-z0-9_-]+$/);

export class GoogleApiError extends Error {
  constructor(public readonly status: number, public readonly safeCode: string) { super(safeCode); }
}

async function googleFetch<T>(connection: Pick<GoogleConnection,"id"|"token_expires_at">, url: string, init?: RequestInit): Promise<T> {
  let token = await getValidAccessToken(connection);
  let response = await fetch(url, { ...init, headers:{ ...init?.headers, authorization:`Bearer ${token}`, accept:"application/json" }, cache:"no-store" });
  if (response.status === 401) {
    token = await getValidAccessToken(connection, true);
    response = await fetch(url, { ...init, headers:{ ...init?.headers, authorization:`Bearer ${token}`, accept:"application/json" }, cache:"no-store" });
  }
  if (!response.ok) {
    let code = `google_api_${response.status}`;
    try { const body = await response.json() as { error?:{ status?:string } }; if (body.error?.status) code = body.error.status.toLowerCase(); } catch {}
    throw new GoogleApiError(response.status, code);
  }
  return response.json() as Promise<T>;
}

const mockAccounts: GoogleAccount[] = [{ name:"accounts/mock-account", accountName:"Demo Business Account", type:"LOCATION_GROUP", role:"OWNER", verificationState:"VERIFIED" }];
const mockLocations: GoogleBusinessLocation[] = [{ name:"locations/mock-location", title:"Demo Coffee House", storeCode:"DEMO-01" }];
const mockReviews: GoogleReviewList = { totalReviewCount:2, averageRating:4, reviews:[
  { name:"accounts/mock-account/locations/mock-location/reviews/review-1", reviewId:"review-1", reviewer:{displayName:"Maya"}, starRating:"FIVE", comment:"Warm service and excellent coffee.", createTime:"2026-08-01T10:00:00Z" },
  { name:"accounts/mock-account/locations/mock-location/reviews/review-2", reviewId:"review-2", reviewer:{displayName:"Omar"}, starRating:"THREE", comment:"Good coffee, but the wait was longer than expected.", createTime:"2026-08-02T11:30:00Z" },
] };

export async function listGoogleAccounts(connection: Pick<GoogleConnection,"id"|"token_expires_at">) {
  if (getGoogleEnv().GOOGLE_API_MOCK === "true") return mockAccounts;
  const data = await googleFetch<{accounts?:GoogleAccount[]}>(connection, "https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageSize=20");
  return data.accounts ?? [];
}

export async function listGoogleLocations(connection: Pick<GoogleConnection,"id"|"token_expires_at">, accountName: string) {
  const account = accountNameSchema.parse(accountName);
  if (getGoogleEnv().GOOGLE_API_MOCK === "true") return mockLocations;
  const query = new URLSearchParams({ readMask:"name,title,storeCode", pageSize:"100", orderBy:"title" });
  const data = await googleFetch<{locations?:GoogleBusinessLocation[]}>(connection, `https://mybusinessbusinessinformation.googleapis.com/v1/${account}/locations?${query}`);
  return data.locations ?? [];
}

export async function listGoogleReviews(connection: Pick<GoogleConnection,"id"|"token_expires_at">, accountName: string, locationName: string) {
  const account = accountNameSchema.parse(accountName);
  const location = locationNameSchema.parse(locationName);
  if (getGoogleEnv().GOOGLE_API_MOCK === "true") return mockReviews;
  const parent = `${account}/${location}`;
  const query = new URLSearchParams({ pageSize:"50", orderBy:"updateTime desc" });
  return googleFetch<GoogleReviewList>(connection, `https://mybusiness.googleapis.com/v4/${parent}/reviews?${query}`);
}

export async function updateGoogleReviewReply(connection: Pick<GoogleConnection,"id"|"token_expires_at">, reviewName: string, comment: string) {
  const name = reviewNameSchema.parse(reviewName);
  if (getGoogleEnv().GOOGLE_API_MOCK === "true") return { comment, updateTime:new Date().toISOString() };
  return googleFetch<{comment:string;updateTime?:string}>(connection, `https://mybusiness.googleapis.com/v4/${name}/reply`, {
    method:"PUT", headers:{"content-type":"application/json"}, body:JSON.stringify({comment}),
  });
}
