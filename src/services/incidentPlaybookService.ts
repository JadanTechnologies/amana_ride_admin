import { supabase } from '@/lib/supabase';

// ==========================================
// TYPES
// ==========================================

export type PlaybookCategory = 'security' | 'technical' | 'operational' | 'compliance';
export type PlaybookStatus = 'active' | 'draft' | 'archived' | 'under_review';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested';

export interface IncidentPlaybook {
  id: string;
  playbook_name: string;
  playbook_category: PlaybookCategory;
  incident_type: string;
  severity_level: string;
  description?: string;
  status: PlaybookStatus;
  version: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
  usage_count: number;
  effectiveness_score?: number;
  estimated_resolution_time_minutes?: number;
  compliance_requirements?: any[];
  tags?: string[];
}

export interface PlaybookTaskTemplate {
  id: string;
  playbook_id: string;
  task_name: string;
  task_description?: string;
  task_order: number;
  is_required: boolean;
  estimated_duration_minutes?: number;
  assigned_role?: string;
  prerequisite_tasks?: any[];
  validation_criteria?: any[];
  automation_config?: any;
  created_at: string;
  updated_at: string;
}

export interface PlaybookEscalationPath {
  id: string;
  playbook_id: string;
  escalation_level: number;
  trigger_conditions: any;
  escalation_delay_minutes: number;
  escalation_recipients: any[];
  notification_channels: string[];
  escalation_actions?: any[];
  created_at: string;
  updated_at: string;
}

export interface PlaybookCommunicationScript {
  id: string;
  playbook_id: string;
  script_name: string;
  script_type: string;
  target_audience: string;
  message_template: string;
  variables?: any[];
  delivery_channels: string[];
  send_timing?: string;
  is_automated: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlaybookActivation {
  id: string;
  playbook_id: string;
  incident_id?: string;
  activated_by?: string;
  activated_at: string;
  completed_at?: string;
  resolution_outcome?: string;
  actual_resolution_time_minutes?: number;
  tasks_completed: number;
  tasks_total?: number;
  effectiveness_rating?: number;
  lessons_learned?: string;
  improvement_suggestions?: string;
  created_at: string;
  updated_at: string;
}

export interface PlaybookVersion {
  id: string;
  playbook_id: string;
  version_number: number;
  changes_summary: string;
  changed_by?: string;
  approved_by?: string;
  approval_status: ApprovalStatus;
  approval_notes?: string;
  created_at: string;
  approved_at?: string;
  playbook_snapshot: any;
}

// ==========================================
// INCIDENT PLAYBOOKS CRUD
// ==========================================

export async function fetchIncidentPlaybooks() {
  const { data, error } = await supabase
    .from('incident_playbooks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as IncidentPlaybook[];
}

export async function fetchIncidentPlaybookById(id: string) {
  const { data, error } = await supabase
    .from('incident_playbooks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as IncidentPlaybook;
}

export async function createIncidentPlaybook(playbook: Partial<IncidentPlaybook>) {
  const { data, error } = await supabase
    .from('incident_playbooks')
    .insert([playbook])
    .select()
    .single();

  if (error) throw error;
  return data as IncidentPlaybook;
}

export async function updateIncidentPlaybook(id: string, updates: Partial<IncidentPlaybook>) {
  const { data, error } = await supabase
    .from('incident_playbooks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as IncidentPlaybook;
}

export async function deleteIncidentPlaybook(id: string) {
  const { error } = await supabase
    .from('incident_playbooks')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function fetchPlaybooksByCategory(category: PlaybookCategory) {
  const { data, error } = await supabase
    .from('incident_playbooks')
    .select('*')
    .eq('playbook_category', category)
    .order('usage_count', { ascending: false });

  if (error) throw error;
  return data as IncidentPlaybook[];
}

export async function fetchPlaybooksBySeverity(severity: string) {
  const { data, error } = await supabase
    .from('incident_playbooks')
    .select('*')
    .eq('severity_level', severity)
    .order('effectiveness_score', { ascending: false });

  if (error) throw error;
  return data as IncidentPlaybook[];
}

export async function fetchPlaybooksByStatus(status: PlaybookStatus) {
  const { data, error } = await supabase
    .from('incident_playbooks')
    .select('*')
    .eq('status', status)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data as IncidentPlaybook[];
}

// ==========================================
// PLAYBOOK TASK TEMPLATES
// ==========================================

export async function fetchPlaybookTaskTemplates(playbookId: string) {
  const { data, error } = await supabase
    .from('playbook_task_templates')
    .select('*')
    .eq('playbook_id', playbookId)
    .order('task_order', { ascending: true });

  if (error) throw error;
  return data as PlaybookTaskTemplate[];
}

export async function createPlaybookTaskTemplate(task: Partial<PlaybookTaskTemplate>) {
  const { data, error } = await supabase
    .from('playbook_task_templates')
    .insert([task])
    .select()
    .single();

  if (error) throw error;
  return data as PlaybookTaskTemplate;
}

export async function updatePlaybookTaskTemplate(id: string, updates: Partial<PlaybookTaskTemplate>) {
  const { data, error } = await supabase
    .from('playbook_task_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as PlaybookTaskTemplate;
}

export async function deletePlaybookTaskTemplate(id: string) {
  const { error } = await supabase
    .from('playbook_task_templates')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ==========================================
// PLAYBOOK ESCALATION PATHS
// ==========================================

export async function fetchPlaybookEscalationPaths(playbookId: string) {
  const { data, error } = await supabase
    .from('playbook_escalation_paths')
    .select('*')
    .eq('playbook_id', playbookId)
    .order('escalation_level', { ascending: true });

  if (error) throw error;
  return data as PlaybookEscalationPath[];
}

export async function createPlaybookEscalationPath(path: Partial<PlaybookEscalationPath>) {
  const { data, error } = await supabase
    .from('playbook_escalation_paths')
    .insert([path])
    .select()
    .single();

  if (error) throw error;
  return data as PlaybookEscalationPath;
}

export async function updatePlaybookEscalationPath(id: string, updates: Partial<PlaybookEscalationPath>) {
  const { data, error } = await supabase
    .from('playbook_escalation_paths')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as PlaybookEscalationPath;
}

export async function deletePlaybookEscalationPath(id: string) {
  const { error } = await supabase
    .from('playbook_escalation_paths')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ==========================================
// PLAYBOOK COMMUNICATION SCRIPTS
// ==========================================

export async function fetchPlaybookCommunicationScripts(playbookId: string) {
  const { data, error } = await supabase
    .from('playbook_communication_scripts')
    .select('*')
    .eq('playbook_id', playbookId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as PlaybookCommunicationScript[];
}

export async function createPlaybookCommunicationScript(script: Partial<PlaybookCommunicationScript>) {
  const { data, error } = await supabase
    .from('playbook_communication_scripts')
    .insert([script])
    .select()
    .single();

  if (error) throw error;
  return data as PlaybookCommunicationScript;
}

export async function updatePlaybookCommunicationScript(id: string, updates: Partial<PlaybookCommunicationScript>) {
  const { data, error } = await supabase
    .from('playbook_communication_scripts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as PlaybookCommunicationScript;
}

export async function deletePlaybookCommunicationScript(id: string) {
  const { error } = await supabase
    .from('playbook_communication_scripts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ==========================================
// PLAYBOOK ACTIVATIONS
// ==========================================

export async function fetchPlaybookActivations(playbookId?: string) {
  let query = supabase
    .from('playbook_activations')
    .select('*')
    .order('activated_at', { ascending: false });

  if (playbookId) {
    query = query.eq('playbook_id', playbookId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as PlaybookActivation[];
}

export async function createPlaybookActivation(activation: Partial<PlaybookActivation>) {
  const { data, error } = await supabase
    .from('playbook_activations')
    .insert([activation])
    .select()
    .single();

  if (error) throw error;
  return data as PlaybookActivation;
}

export async function updatePlaybookActivation(id: string, updates: Partial<PlaybookActivation>) {
  const { data, error } = await supabase
    .from('playbook_activations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as PlaybookActivation;
}

// ==========================================
// PLAYBOOK VERSIONS
// ==========================================

export async function fetchPlaybookVersions(playbookId: string) {
  const { data, error } = await supabase
    .from('playbook_versions')
    .select('*')
    .eq('playbook_id', playbookId)
    .order('version_number', { ascending: false });

  if (error) throw error;
  return data as PlaybookVersion[];
}

export async function createPlaybookVersion(version: Partial<PlaybookVersion>) {
  const { data, error } = await supabase
    .from('playbook_versions')
    .insert([version])
    .select()
    .single();

  if (error) throw error;
  return data as PlaybookVersion;
}

export async function approvePlaybookVersion(id: string, approvedBy: string, notes?: string) {
  const { data, error } = await supabase
    .from('playbook_versions')
    .update({
      approval_status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      approval_notes: notes
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as PlaybookVersion;
}

// ==========================================
// ANALYTICS & METRICS
// ==========================================

export async function fetchPlaybookMetrics() {
  const { data, error } = await supabase
    .from('incident_playbooks')
    .select('playbook_category, status, count(*), avg(effectiveness_score), avg(usage_count)')
    .group('playbook_category, status');

  if (error) throw error;
  return data;
}

export async function fetchRecentPlaybookActivations(limit: number = 10) {
  const { data, error } = await supabase
    .from('playbook_activations')
    .select('*, incident_playbooks(playbook_name, playbook_category, severity_level)')
    .order('activated_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}