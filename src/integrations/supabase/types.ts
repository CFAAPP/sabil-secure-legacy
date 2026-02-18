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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      debt_modification_requests: {
        Row: {
          approval_token: string
          created_at: string
          debt_id: string
          debtor_message: string | null
          id: string
          proposed_amount: string | null
          proposed_currency: string | null
          proposed_due_date: string | null
          proposed_notes: string | null
          proposed_status: string | null
          resolved_at: string | null
          share_link_id: string
          status: string
        }
        Insert: {
          approval_token?: string
          created_at?: string
          debt_id: string
          debtor_message?: string | null
          id?: string
          proposed_amount?: string | null
          proposed_currency?: string | null
          proposed_due_date?: string | null
          proposed_notes?: string | null
          proposed_status?: string | null
          resolved_at?: string | null
          share_link_id: string
          status?: string
        }
        Update: {
          approval_token?: string
          created_at?: string
          debt_id?: string
          debtor_message?: string | null
          id?: string
          proposed_amount?: string | null
          proposed_currency?: string | null
          proposed_due_date?: string | null
          proposed_notes?: string | null
          proposed_status?: string | null
          resolved_at?: string | null
          share_link_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_modification_requests_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_modification_requests_share_link_id_fkey"
            columns: ["share_link_id"]
            isOneToOne: false
            referencedRelation: "debt_share_links"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_proofs: {
        Row: {
          created_at: string
          debt_id: string
          file_name: string
          file_path: string
          file_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          debt_id: string
          file_name: string
          file_path: string
          file_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          debt_id?: string
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_proofs_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_share_links: {
        Row: {
          created_at: string
          creditor_email: string
          debt_id: string
          debtor_visible_amount: string
          debtor_visible_currency: string
          debtor_visible_due_date: string | null
          debtor_visible_name: string
          id: string
          is_active: boolean
          share_token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creditor_email: string
          debt_id: string
          debtor_visible_amount: string
          debtor_visible_currency?: string
          debtor_visible_due_date?: string | null
          debtor_visible_name: string
          id?: string
          is_active?: boolean
          share_token?: string
          user_id: string
        }
        Update: {
          created_at?: string
          creditor_email?: string
          debt_id?: string
          debtor_visible_amount?: string
          debtor_visible_currency?: string
          debtor_visible_due_date?: string | null
          debtor_visible_name?: string
          id?: string
          is_active?: boolean
          share_token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_share_links_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
        ]
      }
      debts: {
        Row: {
          amount_encrypted: string
          created_at: string
          creditor_debtor_encrypted: string
          creditor_email_encrypted: string | null
          creditor_phone_encrypted: string | null
          currency_encrypted: string | null
          debt_type: string
          description_encrypted: string
          due_date_encrypted: string | null
          id: string
          is_settled: boolean
          iv: string
          notes_encrypted: string | null
          paid_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_encrypted: string
          created_at?: string
          creditor_debtor_encrypted: string
          creditor_email_encrypted?: string | null
          creditor_phone_encrypted?: string | null
          currency_encrypted?: string | null
          debt_type: string
          description_encrypted: string
          due_date_encrypted?: string | null
          id?: string
          is_settled?: boolean
          iv: string
          notes_encrypted?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_encrypted?: string
          created_at?: string
          creditor_debtor_encrypted?: string
          creditor_email_encrypted?: string | null
          creditor_phone_encrypted?: string | null
          currency_encrypted?: string | null
          debt_type?: string
          description_encrypted?: string
          due_date_encrypted?: string | null
          id?: string
          is_settled?: boolean
          iv?: string
          notes_encrypted?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          encryption_salt: string | null
          id: string
          language: string
          pin_attempts: number
          pin_hash: string | null
          pin_locked_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          encryption_salt?: string | null
          id?: string
          language?: string
          pin_attempts?: number
          pin_hash?: string | null
          pin_locked_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          encryption_salt?: string | null
          id?: string
          language?: string
          pin_attempts?: number
          pin_hash?: string | null
          pin_locked_until?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vault_items: {
        Row: {
          content_encrypted: string
          created_at: string
          id: string
          item_type: string
          iv: string
          title_encrypted: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content_encrypted: string
          created_at?: string
          id?: string
          item_type: string
          iv: string
          title_encrypted: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content_encrypted?: string
          created_at?: string
          id?: string
          item_type?: string
          iv?: string
          title_encrypted?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wakils: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          revoked_at: string | null
          user_id: string
          wakil_code: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          revoked_at?: string | null
          user_id: string
          wakil_code: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          revoked_at?: string | null
          user_id?: string
          wakil_code?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
