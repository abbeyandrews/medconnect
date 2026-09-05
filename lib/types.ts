/** Shapes returned by the MedConnect API. Kept in one file so a backend
 *  change surfaces as a compile error rather than a runtime surprise. */

export type Role = 'admin' | 'receptionist' | 'doctor';

export type User = {
  id: number;
  staffCode: string;
  username: string;
  /** Internal address derived from the username. Never shown or edited. */
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  doctorId: number | null;
  departmentId: number | null;
};

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type Channel = 'ussd' | 'web';

export type Appointment = {
  id: number;
  reference: string;
  appointment_date: string;
  appointment_time: string;
  slot_minutes: number;
  reason: string | null;
  status: AppointmentStatus;
  channel: Channel;
  clinical_notes: string | null;
  cancel_reason: string | null;
  checked_in_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
  patient_id: number;
  patient_code: string;
  patient_name: string;
  patient_phone: string;
  patient_email: string | null;
  patient_gender: string | null;
  patient_dob: string | null;
  doctor_id: number;
  doctor_name: string;
  doctor_specialty: string | null;
  doctor_room: string | null;
  department_id: number;
  department_name: string;
  department_location: string | null;
  booked_by_name: string | null;
};

export type Patient = {
  id: number;
  patient_code: string;
  full_name: string;
  phone: string;
  alt_phone: string | null;
  email: string | null;
  gender: 'male' | 'female' | 'other' | null;
  date_of_birth: string | null;
  national_id: string | null;
  blood_group: string | null;
  address: string | null;
  next_of_kin_name: string | null;
  next_of_kin_phone: string | null;
  notes: string | null;
  source: 'ussd' | 'staff';
  is_active: number;
  created_at: string;
  updated_at: string;
  registered_by_name?: string | null;
  appointment_count?: number;
  upcoming_count?: number;
  last_visit_date?: string | null;
};

export type AvailabilityBand = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
};

/** Neither an email nor a licence number is collected for a doctor any more. */
export type Doctor = {
  id: number;
  user_id: number | null;
  department_id: number;
  full_name: string;
  specialty: string | null;
  phone: string | null;
  room: string | null;
  bio: string | null;
  slot_minutes: number;
  is_active: number;
  department_name: string;
  username: string | null;
  staff_code: string | null;
  account_active: number | null;
  last_login_at: string | null;
  availability?: AvailabilityBand[];
};

export type TimeOff = {
  id: number;
  doctor_id: number;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_by_name: string | null;
};

export type Department = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  location: string | null;
  is_active: number;
  sort_order: number;
  doctor_count: number;
  upcoming_count: number;
};

export type StaffAccount = {
  id: number;
  staff_code: string;
  username: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: Role;
  is_active: number;
  must_change_password: number;
  last_login_at: string | null;
  failed_attempts: number;
  locked_until: string | null;
  created_at: string;
  created_by_name: string | null;
  doctor_id: number | null;
  department_name: string | null;
};

/** The username and starting password shown after creating or resetting an account. */
export type Credentials = { username: string; password: string };

export type ScheduleSlot = {
  time: string;
  minutes: number;
  status: 'free' | 'booked' | 'unavailable';
  outsideHours?: boolean;
  appointment: {
    id: number;
    reference: string;
    appointment_time: string;
    status: AppointmentStatus;
    reason: string | null;
    channel: Channel;
    patient_id: number;
    patient_code: string;
    patient_name: string;
    patient_phone: string;
  } | null;
};

export type DaySchedule = {
  date: string;
  dayName: string;
  onLeave: boolean;
  hasClinic: boolean;
  slots: ScheduleSlot[];
  bookedCount: number;
  freeCount: number;
};

export type UssdSession = {
  id: number;
  session_id: string;
  msisdn: string;
  stage: string;
  step_count: number;
  ended: number;
  end_reason: string | null;
  created_at: string;
  updated_at: string;
  patient_id: number | null;
  patient_code: string | null;
  patient_name: string | null;
};

export type UssdLogEntry = {
  id: number;
  session_id: string;
  msisdn: string;
  stage_in: string | null;
  user_input: string | null;
  stage_out: string | null;
  response: string | null;
  is_terminal: number;
  duration_ms: number | null;
  created_at: string;
};

export type NotificationLog = {
  id: number;
  appointment_id: number | null;
  patient_id: number | null;
  channel: 'sms' | 'email';
  event: 'booking_confirmation' | 'reminder' | 'cancellation' | 'reschedule';
  recipient: string;
  message: string;
  status: 'sent' | 'failed' | 'skipped';
  error: string | null;
  created_at: string;
  reference?: string | null;
  patient_name?: string | null;
};

export type AuditEntry = {
  id: number;
  user_id: number | null;
  user_label: string | null;
  action: string;
  entity: string | null;
  entity_id: number | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
};

export type StatusHistoryEntry = {
  id: number;
  from_status: string | null;
  to_status: string;
  actor_type: 'staff' | 'patient_ussd' | 'system';
  actor_id: number | null;
  actor_name: string | null;
  actor_role: string | null;
  note: string | null;
  created_at: string;
};

export type SettingItem = {
  key: string;
  value: string | number | boolean;
  type: 'string' | 'number' | 'boolean';
  label: string;
  description: string;
  default: string | number | boolean;
};

export type Dashboard = {
  scope: 'hospital' | 'doctor';
  role: Role;
  generatedAt: string;
  stats: Record<string, number>;
  today: Appointment[];
  recent?: Appointment[];
  next?: Appointment[];
  channelSplit?: { channel: Channel; count: number }[];
  statusSplit?: { status: AppointmentStatus; count: number }[];
  byDepartment?: { name: string; count: number }[];
  trend?: { date: string; ussd: number; web: number }[];
  weekLoad?: { date: string; count: number }[];
};

export type ReportSummary = {
  range: { from: string; to: string };
  totals: {
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
    viaUssd: number;
    viaWeb: number;
    ussdShare: number;
    attendanceRate: number;
    noShowRate: number;
  };
  patients: { registered: number; viaUssd: number };
  messages: { total: number; sent: number; failed: number; skipped: number };
  byDepartment: { name: string; total: number; via_ussd: number; completed: number; no_show: number }[];
  byDoctor: { doctor: string; department: string; total: number; completed: number; no_show: number }[];
  daily: { date: string; ussd: number; web: number }[];
};

export type Paginated<T, K extends string> = { total: number; page: number; pageSize: number } & Record<K, T[]>;
