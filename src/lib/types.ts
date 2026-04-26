import type { Timestamp } from "firebase/firestore";

export type Role = "student" | "admin" | "super-admin";
export type Gender = "male" | "female";
export type ContributionStatus = "pending" | "approved" | "rejected";
export type NotificationType = "reminder" | "system" | "approval";
export type Language = "en" | "am" | "om";
export type ThemePref = "light" | "dark" | "system";

export interface UserDoc {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  gender: Gender;
  role: Role;
  assignedAdminId?: string | null;
  language: Language;
  theme: ThemePref;
  isActive: boolean;
  photoURL?: string | null;
  notificationsEnabled?: boolean;
  createdAt: Timestamp | null;
}

export interface MonthDoc {
  id: string; // e.g. "2026-04"
  name: string;
  startDate: Timestamp | null;
  dueDate: Timestamp | null;
  isActive: boolean;
}

export interface ContributionDoc {
  id: string;
  userId: string;
  adminId?: string | null;
  monthId: string;
  amount: number;
  screenshotUrl: string;
  status: ContributionStatus;
  submittedAt: Timestamp | null;
  approvedAt?: Timestamp | null;
  approvedBy?: string | null;
  rejectionReason?: string | null;
  late?: boolean;
}

export interface NotificationDoc {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: Timestamp | null;
}

export interface SettingsDoc {
  contributionAmount: number;
  reminderDaysBefore: number;
  allowLatePayment: boolean;
  collectionDeadlineDay?: 28 | 29 | 30;
}
