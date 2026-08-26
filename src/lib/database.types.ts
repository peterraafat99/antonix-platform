export type GlobalRole = "user" | "platform_admin";
export type MemberRole = "business_owner" | "business_member";
export type MembershipStatus = "active" | "invited" | "disabled";
export type GoogleConnectionStatus = "active" | "revoked" | "error";
export type ReviewDraftStatus = "draft" | "approved" | "published" | "rejected" | "failed";
export type ScheduledReplyStatus =
  | "pending"
  | "scheduled"
  | "approved"
  | "publishing"
  | "published"
  | "cancelled"
  | "failed"
  | "quota_exceeded";
export type QuotaRequestStatus = "pending" | "approved" | "denied";

export type Profile = {
  id: string;
  full_name: string | null;
  global_role: GlobalRole;
  created_at: string;
  updated_at: string;
};

export type Company = {
  id: string;
  name: string;
  slug: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type CompanyMembership = {
  id: string;
  company_id: string;
  user_id: string;
  member_role: MemberRole;
  status: MembershipStatus;
  created_at: string;
  updated_at: string;
};

export type GoogleConnection = {
  id: string;
  company_id: string;
  connected_by_user_id: string;
  status: GoogleConnectionStatus;
  granted_scopes: string[];
  token_expires_at: string | null;
  last_synced_at: string | null;
  last_error_code: string | null;
  created_at: string;
  updated_at: string;
};

export type GoogleLocation = {
  id: string;
  company_id: string;
  google_connection_id: string;
  google_account_name: string;
  google_location_name: string;
  title: string;
  store_code: string | null;
  is_selected: boolean;
  is_enabled: boolean;
  last_review_sync_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanySettings = {
  company_id: string;
  require_approval: boolean;
  auto_publish_eligible_replies: boolean;
  daily_ai_reply_publish_cap: number;
  timezone: string;
  ai_enabled: boolean;
  publishing_enabled: boolean;
  tone: string;
  reply_length: string;
  language: string;
  emoji_preference: string;
  customer_name_preference: string;
  company_description: string;
  custom_instructions: string;
  negative_review_policy: string;
  created_at: string;
  updated_at: string;
};

export type CompanyFAQ = {
  id: string;
  company_id: string;
  question: string;
  answer: string;
  created_at: string;
  updated_at: string;
};

export type AIExample = {
  id: string;
  company_id: string;
  star_rating: number;
  review_text: string;
  reply_text: string;
  created_at: string;
  updated_at: string;
};

export type NotificationPreferences = {
  company_id: string;
  email_on_negative: boolean;
  email_on_sensitive: boolean;
  notification_email: string | null;
  created_at: string;
  updated_at: string;
};

export type UsageEvent = {
  id: string;
  company_id: string;
  user_id: string | null;
  event_type: string;
  provider: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens: number;
  created_at: string;
};

export type AuditLog = {
  id: string;
  company_id: string | null;
  user_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
};

export type ReviewDraft = {
  id: string;
  company_id: string;
  google_location_id: string | null;
  google_review_name: string;
  original_review_text: string;
  star_rating: number;
  reviewer_name: string | null;
  generated_draft_text: string;
  status: ReviewDraftStatus;
  confidence_score: number;
  is_sensitive: boolean;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  published_at: string | null;
};

export type ScheduledReviewReply = {
  id: string;
  company_id: string;
  google_location_id: string | null;
  google_review_name: string;
  draft_id: string | null;
  scheduled_for: string;
  status: ScheduledReplyStatus;
  attempt_count: number;
  idempotency_key: string;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type QuotaRequest = {
  id: string;
  company_id: string;
  requested_by_user_id: string | null;
  current_cap: number;
  requested_cap: number;
  reason: string | null;
  status: QuotaRequestStatus;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by_user_id: string | null;
};

type Table<R extends Record<string, unknown>, I extends Record<string, unknown> = Partial<R>> = {
  Row: R;
  Insert: I;
  Update: Partial<R>;
  Relationships: [];
};

type FunctionDefinition<A extends Record<string, unknown>, R> = { Args: A; Returns: R };

export interface Database {
  public: {
    Tables: {
      profiles: Table<Profile, Partial<Profile> & Pick<Profile, "id">>;
      companies: Table<Company, Partial<Company> & Pick<Company, "name" | "slug">>;
      company_members: Table<CompanyMembership, Partial<CompanyMembership> & Pick<CompanyMembership, "company_id" | "user_id" | "member_role">>;
      google_connections: Table<GoogleConnection, Partial<GoogleConnection> & Pick<GoogleConnection, "company_id" | "connected_by_user_id">>;
      google_locations: Table<GoogleLocation, Partial<GoogleLocation> & Pick<GoogleLocation, "company_id" | "google_connection_id" | "google_account_name" | "google_location_name" | "title">>;
      company_settings: Table<CompanySettings, Partial<CompanySettings> & Pick<CompanySettings, "company_id">>;
      company_faqs: Table<CompanyFAQ, Partial<CompanyFAQ> & Pick<CompanyFAQ, "company_id" | "question" | "answer">>;
      ai_examples: Table<AIExample, Partial<AIExample> & Pick<AIExample, "company_id" | "review_text" | "reply_text">>;
      notification_preferences: Table<NotificationPreferences, Partial<NotificationPreferences> & Pick<NotificationPreferences, "company_id">>;
      usage_events: Table<UsageEvent, Partial<UsageEvent> & Pick<UsageEvent, "company_id" | "event_type">>;
      audit_logs: Table<AuditLog, Partial<AuditLog> & Pick<AuditLog, "action">>;
      review_drafts: Table<ReviewDraft, Partial<ReviewDraft> & Pick<ReviewDraft, "company_id" | "google_review_name">>;
      scheduled_review_replies: Table<ScheduledReviewReply, Partial<ScheduledReviewReply> & Pick<ScheduledReviewReply, "company_id" | "google_review_name" | "scheduled_for" | "idempotency_key">>;
      quota_requests: Table<QuotaRequest, Partial<QuotaRequest> & Pick<QuotaRequest, "company_id" | "requested_cap">>;
    };
    Views: Record<string, never>;
    Functions: {
      store_google_oauth_tokens: FunctionDefinition<
        {
          target_connection_id: string;
          access_token_ciphertext: string | null;
          refresh_token_ciphertext: string;
          expires_at: string | null;
        },
        undefined
      >;
      get_google_oauth_tokens: FunctionDefinition<{ target_connection_id: string }, Array<{ encrypted_access_token: string | null; encrypted_refresh_token: string }>>;
      reserve_daily_publish_quota: FunctionDefinition<{ p_company_id: string; p_timezone?: string }, Array<{ allowed: boolean; used_today: number; daily_cap: number; remaining: number }>>;
    };
    Enums: {
      global_role: GlobalRole;
      member_role: MemberRole;
      membership_status: MembershipStatus;
      google_connection_status: GoogleConnectionStatus;
      review_draft_status: ReviewDraftStatus;
      scheduled_reply_status: ScheduledReplyStatus;
      quota_request_status: QuotaRequestStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
