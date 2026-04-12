import { Timestamp } from 'firebase/firestore';

export type Role = 'admin' | 'teacher';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  createdAt: Timestamp;
}

export type ReportStatus = 'pending' | 'in-progress' | 'resolved';

export interface ErrorReport {
  id?: string;
  studentName: string;
  className: string;
  incorrectContent: string;
  correctContent: string;
  status: ReportStatus;
  adminNotes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
