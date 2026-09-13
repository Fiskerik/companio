export type Locale = 'sv' | 'en';
export type HouseholdKind = 'couple' | 'family' | 'single_parent' | 'solo';
export type ChildMode = 'with' | 'without' | 'either';
export type Visibility = 'matches' | 'nearby';
export type Id = string;
export interface Adult {
  id: Id;
  name: string;
  locale: Locale;
  avatar_path?: string | null;
}
export interface Household {
  id: Id;
  kind: HouseholdKind;
  area: string;
  latitude: number;
  longitude: number;
  bio: string;
  interests: string[];
  languages: string[];
  child_ages: string[];
  child_mode: ChildMode;
  radius_km: number;
  preferred_kinds: HouseholdKind[];
  energy: 'quiet' | 'balanced' | 'lively';
  members: Adult[];
  created_at: string;
}
export interface Availability {
  id: Id;
  household_id: Id;
  activity: string;
  starts_at: string;
  ends_at: string;
  visibility: Visibility;
  child_mode: ChildMode;
  adults: number;
}
export interface Contact {
  id: Id;
  from_household: Id;
  to_household: Id;
  greeting: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}
export interface Favorite {
  household_id: Id;
  target_id: Id;
  notify: boolean;
}
export interface Conversation {
  id: Id;
  kind: 'household' | 'event' | 'group';
  title: string;
  household_a?: Id;
  household_b?: Id;
  event_id?: Id;
  group_id?: Id;
}
export interface Message {
  id: Id;
  conversation_id: Id;
  author_id: Id | null;
  body: string;
  image_path?: string | null;
  event_id?: Id | null;
  reply_to?: Id | null;
  created_at: string;
  system: boolean;
  reactions: Record<string, string[]>;
}
export interface ConversationPreference {
  conversation_id: Id;
  muted: boolean;
  archived: boolean;
  read_at: string;
}
export interface Gathering {
  id: Id;
  host_household: Id;
  title: string;
  description: string;
  activity: string;
  starts_at: string;
  ends_at: string;
  area: string;
  latitude: number;
  longitude: number;
  location: string;
  visibility: 'public' | 'private';
  child_mode: ChildMode;
  capacity: number;
  approval: boolean;
  cost: string;
  practical: string;
  status: 'active' | 'cancelled';
  group_id?: Id | null;
}
export interface Attendance {
  id: Id;
  event_id: Id;
  household_id: Id;
  adults: number;
  children: number;
  status: 'pending' | 'accepted' | 'waitlist' | 'cancelled';
  created_at: string;
}
export interface Community {
  id: Id;
  owner_household: Id;
  name: string;
  description: string;
  area: string;
  approval: boolean;
}
export interface CommunityMember {
  group_id: Id;
  household_id: Id;
  status: 'pending' | 'accepted';
}
export interface Report {
  id: Id;
  target_type: 'household' | 'message' | 'event' | 'group';
  target_id: Id;
  reason: string;
  status: 'open' | 'resolved';
  created_at: string;
}
export interface AppState {
  demo_revision?: number;
  adult: Adult | null;
  household_id: Id | null;
  households: Household[];
  availability: Availability[];
  contacts: Contact[];
  favorites: Favorite[];
  conversations: Conversation[];
  messages: Message[];
  conversation_preferences: ConversationPreference[];
  events: Gathering[];
  attendance: Attendance[];
  groups: Community[];
  group_members: CommunityMember[];
  reports: Report[];
  blocked_ids: Id[];
  is_moderator: boolean;
  media_queue?: { id: Id; path: string; status: string }[];
}
export type Command =
  | 'onboard'
  | 'profile_update'
  | 'favorite_toggle'
  | 'favorite_notify'
  | 'availability_create'
  | 'availability_delete'
  | 'contact_request'
  | 'contact_respond'
  | 'message_send'
  | 'message_react'
  | 'conversation_preference'
  | 'event_create'
  | 'event_update'
  | 'event_join'
  | 'event_cancel_attendance'
  | 'event_respond'
  | 'event_cancel'
  | 'event_feedback'
  | 'event_invite'
  | 'group_create'
  | 'group_join'
  | 'group_respond'
  | 'group_leave'
  | 'group_remove'
  | 'partner_invite'
  | 'partner_accept'
  | 'household_leave'
  | 'block'
  | 'report'
  | 'report_resolve'
  | 'device_register'
  | 'account_delete'
  | 'media_register'
  | 'avatar_set'
  | 'media_review';
export type Payload = Record<string, unknown>;
export const EMPTY_STATE: AppState = {
  adult: null,
  household_id: null,
  households: [],
  availability: [],
  contacts: [],
  favorites: [],
  conversations: [],
  messages: [],
  conversation_preferences: [],
  events: [],
  attendance: [],
  groups: [],
  group_members: [],
  reports: [],
  blocked_ids: [],
  is_moderator: false,
};
