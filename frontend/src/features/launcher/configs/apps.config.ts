import type { AppItem } from "../models/app-item.model";

/**
 * App registry — add a new entry here to auto-expand the launcher grid.
 * In the future this array will be replaced by a BE call.
 */
export const APPS: AppItem[] = [
  {
    id: "under-task",
    name: "UnderTask",
    description: "Manage tasks, projects, and deadlines with precision",
    icon: "task",
    route: "/under-task",
    status: "active",
  },
  {
    id: "under-finance",
    name: "UnderFinance",
    description: "Track expenses, budgets, and financial goals",
    icon: "finance",
    route: "/under-finance",
    status: "active",
  },
  {
    id: "under-board",
    name: "UnderBoard",
    description: "Visual boards for organizing workflows and ideas",
    icon: "board",
    route: "/under-board",
    status: "active",
  },
];
