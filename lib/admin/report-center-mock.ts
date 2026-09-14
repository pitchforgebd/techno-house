export type ReportPeriod = "all" | "today" | "week" | "month";

export type UserSearchRow = {
  id: string;
  query: string;
  count: number;
};
