export type Member = {
  id: string;
  name: string;
  avatar_color: string;
  is_creator: boolean;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  category: string;
  estimated_duration_minutes: number | null;
  recurrence_rule: string | null;
  next_due_date: string | null;
  is_personal: boolean;
  preferred_time_of_day: string;
  assigned_to: string | null;
  assignee: { id: string; name: string; avatar_color: string } | null;
  creator: { id: string; name: string; avatar_color: string } | null;
  completer: { id: string; name: string } | null;
  completed_at: string | null;
};

export type Board = {
  id: string;
  name: string;
  invite_token: string;
  timezone: string | null;
  members: Member[];
};

export type HistoryEntry = {
  id: string;
  completed_at: string;
  notes: string | null;
  completer: { name: string; avatar_color: string };
};
