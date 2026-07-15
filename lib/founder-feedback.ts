// Shared types, validation, and row mapping for the founder_feedback table.
// Used by /api/admin/feedback and /api/admin/feedback/[id].

import { z } from './validate';

export const FEEDBACK_SOURCES = ['whatsapp', 'email', 'in_person', 'other'] as const;
export const FEEDBACK_STATUSES = ['new', 'reviewed', 'actioned'] as const;

export type FeedbackSource = (typeof FEEDBACK_SOURCES)[number];
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const CreateFeedbackBody = z.object({
  studentId: z.string().min(1).nullable().optional(),
  source:    z.enum(FEEDBACK_SOURCES).default('other'),
  content:   z.string().trim().min(1),
  tags:      z.array(z.string().trim().min(1)).default([]),
});

export const UpdateFeedbackBody = z.object({
  studentId:   z.string().min(1).nullable().optional(),
  source:      z.enum(FEEDBACK_SOURCES).optional(),
  content:     z.string().trim().min(1).optional(),
  status:      z.enum(FEEDBACK_STATUSES).optional(),
  tags:        z.array(z.string().trim().min(1)).optional(),
  actionNotes: z.string().nullable().optional(),
});

export type FeedbackRow = {
  id:           string;
  student_id:   string | null;
  source:       FeedbackSource;
  content:      string;
  status:       FeedbackStatus;
  tags:         string[];
  action_notes: string | null;
  created_at:   string;
  updated_at:   string;
};

export type FeedbackEntry = {
  id:          string;
  studentId:   string | null;
  studentName: string | null;
  source:      FeedbackSource;
  content:     string;
  status:      FeedbackStatus;
  tags:        string[];
  actionNotes: string | null;
  createdAt:   string;
  updatedAt:   string;
};

export function toFeedbackEntry(row: FeedbackRow, studentName: string | null = null): FeedbackEntry {
  return {
    id:          row.id,
    studentId:   row.student_id,
    studentName,
    source:      row.source,
    content:     row.content,
    status:      row.status,
    tags:        row.tags ?? [],
    actionNotes: row.action_notes,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}
