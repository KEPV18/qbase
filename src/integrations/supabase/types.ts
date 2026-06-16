export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          changed_fields: Json
          created_at: string
          form_code: string | null
          id: string
          new_values: Json
          performed_by: string
          previous_values: Json
          record_id: string
          serial: string | null
          user_email: string | null
          action_type: string | null
        }
        Insert: {
          action: string
          changed_fields?: Json
          created_at?: string
          form_code?: string | null
          id?: string
          new_values?: Json
          performed_by?: string
          previous_values?: Json
          record_id: string
          serial?: string | null
          user_email?: string | null
          action_type?: string | null
        }
        Update: {
          action?: string
          changed_fields?: Json
          created_at?: string
          form_code?: string | null
          id?: string
          new_values?: Json
          performed_by?: string
          previous_values?: Json
          record_id?: string
          serial?: string | null
          user_email?: string | null
          action_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "records"
            referencedColumns: ["id"]
          },
        ]
      }
      capas: {
        Row: {
          capa_id: string
          corrective_action: string | null
          created_at: string | null
          description: string | null
          effectiveness: string | null
          id: string
          preventive_action: string | null
          reference: string | null
          related_risk: string | null
          responsible_person: string | null
          root_cause_analysis: string | null
          source_of_capa: string | null
          status: string | null
          target_completion_date: string | null
          type: string | null
          updated_at: string | null
          verification_date: string | null
        }
        Insert: {
          capa_id: string
          corrective_action?: string | null
          created_at?: string | null
          description?: string | null
          effectiveness?: string | null
          id?: string
          preventive_action?: string | null
          reference?: string | null
          related_risk?: string | null
          responsible_person?: string | null
          root_cause_analysis?: string | null
          source_of_capa?: string | null
          status?: string | null
          target_completion_date?: string | null
          type?: string | null
          updated_at?: string | null
          verification_date?: string | null
        }
        Update: {
          capa_id?: string
          corrective_action?: string | null
          created_at?: string | null
          description?: string | null
          effectiveness?: string | null
          id?: string
          preventive_action?: string | null
          reference?: string | null
          related_risk?: string | null
          responsible_person?: string | null
          root_cause_analysis?: string | null
          source_of_capa?: string | null
          status?: string | null
          target_completion_date?: string | null
          type?: string | null
          updated_at?: string | null
          verification_date?: string | null
        }
        Relationships: []
      }
      document_metadata: {
        Row: {
          approval_date: string | null
          approval_status: string | null
          approver_id: string | null
          approver_name: string | null
          archival_date: string | null
          author_id: string | null
          author_name: string | null
          bucket_id: string
          change_description: string | null
          change_reason: string | null
          checksum: string | null
          classification: string | null
          created_at: string | null
          created_by: string | null
          department: string | null
          description: string | null
          document_number: string
          file_size: number | null
          form_code: string | null
          id: string
          iso_clause: string | null
          keywords: string[] | null
          mime_type: string | null
          parent_document_id: string | null
          previous_version: string | null
          process_id: string | null
          record_type: string | null
          related_documents: string[] | null
          retention_until: string | null
          retention_years: number | null
          review_date: string | null
          reviewer_id: string | null
          reviewer_name: string | null
          revision_date: string | null
          storage_path: string
          title: string | null
          updated_at: string | null
          updated_by: string | null
          version: string
        }
        Insert: {
          approval_date?: string | null
          approval_status?: string | null
          approver_id?: string | null
          approver_name?: string | null
          archival_date?: string | null
          author_id?: string | null
          author_name?: string | null
          bucket_id: string
          change_description?: string | null
          change_reason?: string | null
          checksum?: string | null
          classification?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string | null
          document_number: string
          file_size?: number | null
          form_code?: string | null
          id?: string
          iso_clause?: string | null
          keywords?: string[] | null
          mime_type?: string | null
          parent_document_id?: string | null
          previous_version?: string | null
          process_id?: string | null
          record_type?: string | null
          related_documents?: string[] | null
          retention_until?: string | null
          retention_years?: number | null
          review_date?: string | null
          reviewer_id?: string | null
          reviewer_name?: string | null
          revision_date?: string | null
          storage_path: string
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version?: string
        }
        Update: {
          approval_date?: string | null
          approval_status?: string | null
          approver_id?: string | null
          approver_name?: string | null
          archival_date?: string | null
          author_id?: string | null
          author_name?: string | null
          bucket_id?: string
          change_description?: string | null
          change_reason?: string | null
          checksum?: string | null
          classification?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string | null
          document_number?: string
          file_size?: number | null
          form_code?: string | null
          id?: string
          iso_clause?: string | null
          keywords?: string[] | null
          mime_type?: string | null
          parent_document_id?: string | null
          previous_version?: string | null
          process_id?: string | null
          record_type?: string | null
          related_documents?: string[] | null
          retention_until?: string | null
          retention_years?: number | null
          review_date?: string | null
          reviewer_id?: string | null
          reviewer_name?: string | null
          revision_date?: string | null
          storage_path?: string
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_metadata_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "document_metadata_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "document_metadata_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "document_metadata_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "document_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_metadata_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "retention_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_metadata_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "document_metadata_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      document_reviews: {
        Row: {
          completed_at: string | null
          created_at: string | null
          document_id: string
          id: string
          review_notes: string | null
          review_status: string | null
          reviewed_by: string | null
          scheduled_date: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          document_id: string
          id?: string
          review_notes?: string | null
          review_status?: string | null
          reviewed_by?: string | null
          scheduled_date: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          document_id?: string
          id?: string
          review_notes?: string | null
          review_status?: string | null
          reviewed_by?: string | null
          scheduled_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_reviews_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_reviews_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "retention_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      document_versions: {
        Row: {
          change_description: string | null
          change_reason: string | null
          changed_by: string | null
          changed_by_name: string | null
          checksum: string | null
          created_at: string | null
          document_id: string
          id: string
          storage_path: string
          version: string
        }
        Insert: {
          change_description?: string | null
          change_reason?: string | null
          changed_by?: string | null
          changed_by_name?: string | null
          checksum?: string | null
          created_at?: string | null
          document_id: string
          id?: string
          storage_path: string
          version: string
        }
        Update: {
          change_description?: string | null
          change_reason?: string | null
          changed_by?: string | null
          changed_by_name?: string | null
          checksum?: string | null
          created_at?: string | null
          document_id?: string
          id?: string
          storage_path?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "retention_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      error_reports: {
        Row: {
          browser_info: Json | null
          context: Json | null
          created_at: string | null
          error_message: string
          error_stack: string | null
          id: string
          page_url: string
          resolution_notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          user_email: string | null
          version: string
        }
        Insert: {
          browser_info?: Json | null
          context?: Json | null
          created_at?: string | null
          error_message: string
          error_stack?: string | null
          id?: string
          page_url: string
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          user_email?: string | null
          version: string
        }
        Update: {
          browser_info?: Json | null
          context?: Json | null
          created_at?: string | null
          error_message?: string
          error_stack?: string | null
          id?: string
          page_url?: string
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          user_email?: string | null
          version?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          data: Json | null
          event_type: string | null
          id: string
          link: string | null
          message: string
          priority: string | null
          read: boolean | null
          target_id: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          data?: Json | null
          event_type?: string | null
          id?: string
          link?: string | null
          message: string
          priority?: string | null
          read?: boolean | null
          target_id?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          actor_id?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          data?: Json | null
          event_type?: string | null
          id?: string
          link?: string | null
          message?: string
          priority?: string | null
          read?: boolean | null
          target_id?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      process_interactions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          interaction_type: string | null
          source_process_id: string
          target_process_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          interaction_type?: string | null
          source_process_id: string
          target_process_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          interaction_type?: string | null
          source_process_id?: string
          target_process_id?: string
        }
        Relationships: []
      }
      processes: {
        Row: {
          category: string | null
          competence_needed: string | null
          controls: string | null
          created_at: string | null
          effectiveness: string | null
          id: string
          inputs: string | null
          outputs: string | null
          owner: string | null
          process_id: string
          process_name: string
          resources: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          competence_needed?: string | null
          controls?: string | null
          created_at?: string | null
          effectiveness?: string | null
          id?: string
          inputs?: string | null
          outputs?: string | null
          owner?: string | null
          process_id: string
          process_name: string
          resources?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          competence_needed?: string | null
          controls?: string | null
          created_at?: string | null
          effectiveness?: string | null
          id?: string
          inputs?: string | null
          outputs?: string | null
          owner?: string | null
          process_id?: string
          process_name?: string
          resources?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string
          id: string
          is_active: boolean | null
          last_login: string | null
          password: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          password?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          password?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      records: {
        Row: {
          id: string
          form_code: string
          serial: string
          form_name: string
          status: string
          form_data: Json
          section: number | null
          section_name: string
          frequency: string
          created_by: string
          last_modified_by: string
          edit_count: number
          modification_reason: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          form_code: string
          serial: string
          form_name: string
          status?: string
          form_data?: Json
          section?: number | null
          section_name?: string
          frequency?: string
          created_by?: string
          last_modified_by?: string
          edit_count?: number
          modification_reason?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          form_code?: string
          serial?: string
          form_name?: string
          status?: string
          form_data?: Json
          section?: number | null
          section_name?: string
          frequency?: string
          created_by?: string
          last_modified_by?: string
          edit_count?: number
          modification_reason?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      risks: {
        Row: {
          action_control: string | null
          cause: string | null
          created_at: string | null
          id: string
          impact: number | null
          likelihood: number | null
          linked_capa: string | null
          owner: string | null
          process_department: string
          review_date: string | null
          risk_description: string
          risk_id: string
          risk_score: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          action_control?: string | null
          cause?: string | null
          created_at?: string | null
          id?: string
          impact?: number | null
          likelihood?: number | null
          linked_capa?: string | null
          owner?: string | null
          process_department: string
          review_date?: string | null
          risk_description: string
          risk_id: string
          risk_score?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          action_control?: string | null
          cause?: string | null
          created_at?: string | null
          id?: string
          impact?: number | null
          likelihood?: number | null
          linked_capa?: string | null
          owner?: string | null
          process_department?: string
          review_date?: string | null
          risk_description?: string
          risk_id?: string
          risk_score?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      retention_summary: {
        Row: {
          approval_date: string | null
          approval_status: string | null
          approver_id: string | null
          approver_name: string | null
          archival_date: string | null
          author_id: string | null
          author_name: string | null
          bucket_id: string | null
          change_description: string | null
          change_reason: string | null
          checksum: string | null
          classification: string | null
          created_at: string | null
          created_by: string | null
          department: string | null
          description: string | null
          document_number: string | null
          file_size: number | null
          form_code: string | null
          id: string | null
          iso_clause: string | null
          keywords: string[] | null
          mime_type: string | null
          parent_document_id: string | null
          previous_version: string | null
          process_id: string | null
          record_type: string | null
          related_documents: string[] | null
          retention_status: string | null
          retention_until: string | null
          retention_years: number | null
          review_date: string | null
          reviewer_id: string | null
          reviewer_name: string | null
          revision_date: string | null
          storage_path: string | null
          title: string | null
          updated_at: string | null
          updated_by: string | null
          version: string | null
        }
        Insert: {
          approval_date?: string | null
          approval_status?: string | null
          approver_id?: string | null
          approver_name?: string | null
          archival_date?: string | null
          author_id?: string | null
          author_name?: string | null
          bucket_id?: string | null
          change_description?: string | null
          change_reason?: string | null
          checksum?: string | null
          classification?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string | null
          document_number?: string | null
          file_size?: number | null
          form_code?: string | null
          id?: string | null
          iso_clause?: string | null
          keywords?: string[] | null
          mime_type?: string | null
          parent_document_id?: string | null
          previous_version?: string | null
          process_id?: string | null
          record_type?: string | null
          related_documents?: string[] | null
          retention_status?: never
          retention_until?: string | null
          retention_years?: number | null
          review_date?: string | null
          reviewer_id?: string | null
          reviewer_name?: string | null
          revision_date?: string | null
          storage_path?: string | null
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version?: string | null
        }
        Update: {
          approval_date?: string | null
          approval_status?: string | null
          approver_id?: string | null
          approver_name?: string | null
          archival_date?: string | null
          author_id?: string | null
          author_name?: string | null
          bucket_id?: string | null
          change_description?: string | null
          change_reason?: string | null
          checksum?: string | null
          classification?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          description?: string | null
          document_number?: string | null
          file_size?: number | null
          form_code?: string | null
          id?: string | null
          iso_clause?: string | null
          keywords?: string[] | null
          mime_type?: string | null
          parent_document_id?: string | null
          previous_version?: string | null
          process_id?: string | null
          record_type?: string | null
          related_documents?: string[] | null
          retention_status?: never
          retention_until?: string | null
          retention_years?: number | null
          review_date?: string | null
          reviewer_id?: string | null
          reviewer_name?: string | null
          revision_date?: string | null
          storage_path?: string | null
          title?: string | null
          updated_at?: string | null
          updated_by?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_metadata_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "document_metadata_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "document_metadata_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "document_metadata_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "document_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_metadata_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "retention_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_metadata_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "document_metadata_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      upcoming_reviews: {
        Row: {
          completed_at: string | null
          created_at: string | null
          department: string | null
          document_id: string | null
          document_number: string | null
          form_code: string | null
          id: string | null
          review_notes: string | null
          review_status: string | null
          reviewed_by: string | null
          scheduled_date: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_reviews_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_metadata"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_reviews_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "retention_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Functions: {
      append_audit_log: {
        Args: {
          p_action: string
          p_changed_fields?: Json
          p_new_values?: Json
          p_performed_by?: string
          p_previous_values?: Json
          p_record_id: string
        }
        Returns: Json
      }
      create_notification:
        | {
            Args: {
              p_message: string
              p_title: string
              p_type?: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_created_by?: string
              p_data?: Json
              p_link?: string
              p_message: string
              p_title: string
              p_type?: string
              p_user_id: string
            }
            Returns: Json
          }
      create_notifications_batch:
        | {
            Args: {
              p_message: string
              p_title: string
              p_type?: string
              p_user_ids: string[]
            }
            Returns: Json
          }
        | {
            Args: {
              p_created_by?: string
              p_data?: Json
              p_link?: string
              p_message: string
              p_title: string
              p_type?: string
              p_user_ids: string[]
            }
            Returns: Json
          }
      has_role: { Args: { _role: string }; Returns: boolean }
      soft_delete_record: { Args: { p_record_id: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
