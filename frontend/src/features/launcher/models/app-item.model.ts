export type AppStatus = "active" | "coming-soon";

export interface AppItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  status: AppStatus;
}
