export interface GoogleAccount {
  name: string;
  accountName?: string;
  type?: string;
  role?: string;
  verificationState?: string;
  vettedState?: string;
}

export interface GoogleBusinessLocation {
  name: string;
  title: string;
  storeCode?: string;
}

export type GoogleStarRating = "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE" | "STAR_RATING_UNSPECIFIED";

export interface GoogleReview {
  name: string;
  reviewId: string;
  reviewer?: { displayName?: string; isAnonymous?: boolean };
  starRating: GoogleStarRating;
  comment?: string;
  createTime?: string;
  updateTime?: string;
  reviewReply?: { comment?: string; updateTime?: string };
}

export interface GoogleReviewList {
  reviews: GoogleReview[];
  averageRating?: number;
  totalReviewCount?: number;
  nextPageToken?: string;
}
