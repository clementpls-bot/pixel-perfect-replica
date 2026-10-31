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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      brands: {
        Row: {
          color: string
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      can_barcodes: {
        Row: {
          barcode: string
          can_id: string
          created_at: string
          id: string
          status: string
          submitted_by: string | null
        }
        Insert: {
          barcode: string
          can_id: string
          created_at?: string
          id?: string
          status?: string
          submitted_by?: string | null
        }
        Update: {
          barcode?: string
          can_id?: string
          created_at?: string
          id?: string
          status?: string
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "can_barcodes_can_id_fkey"
            columns: ["can_id"]
            isOneToOne: false
            referencedRelation: "cans"
            referencedColumns: ["id"]
          },
        ]
      }
      can_models: {
        Row: {
          brand_id: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          flavour: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          brand_id: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          flavour?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          brand_id?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          flavour?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "can_models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      can_reports: {
        Row: {
          can_id: string
          category: string
          created_at: string
          details: string
          id: string
          image_urls: string[]
          model_id: string | null
          proposed_field: string | null
          proposed_value: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          can_id: string
          category?: string
          created_at?: string
          details: string
          id?: string
          image_urls?: string[]
          model_id?: string | null
          proposed_field?: string | null
          proposed_value?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          can_id?: string
          category?: string
          created_at?: string
          details?: string
          id?: string
          image_urls?: string[]
          model_id?: string | null
          proposed_field?: string | null
          proposed_value?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "can_reports_can_id_fkey"
            columns: ["can_id"]
            isOneToOne: false
            referencedRelation: "cans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "can_reports_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "can_models"
            referencedColumns: ["id"]
          },
        ]
      }
      can_submissions: {
        Row: {
          back_image_url: string | null
          barcode: string
          barcode_image_url: string | null
          brand_id: string
          caffeine_mg_per_100ml: number | null
          category: Database["public"]["Enums"]["can_category"]
          color_primary: string | null
          color_secondary: string | null
          created_at: string
          description: string | null
          edition_type: string | null
          energy_kcal_per_100ml: number | null
          flavour: string | null
          historical_context: string | null
          history_verified: boolean
          id: string
          image_url: string
          model_id: string | null
          name: string
          notes: string | null
          proposed_brand_name: string | null
          region: string | null
          release_year: number | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string
          sugar_g_per_100ml: number | null
          tab_color: string | null
          taurine_mg_per_100ml: number | null
          variant_name: string | null
          volume_ml: number | null
        }
        Insert: {
          back_image_url?: string | null
          barcode: string
          barcode_image_url?: string | null
          brand_id: string
          caffeine_mg_per_100ml?: number | null
          category?: Database["public"]["Enums"]["can_category"]
          color_primary?: string | null
          color_secondary?: string | null
          created_at?: string
          description?: string | null
          edition_type?: string | null
          energy_kcal_per_100ml?: number | null
          flavour?: string | null
          historical_context?: string | null
          history_verified?: boolean
          id?: string
          image_url: string
          model_id?: string | null
          name: string
          notes?: string | null
          proposed_brand_name?: string | null
          region?: string | null
          release_year?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by: string
          sugar_g_per_100ml?: number | null
          tab_color?: string | null
          taurine_mg_per_100ml?: number | null
          variant_name?: string | null
          volume_ml?: number | null
        }
        Update: {
          back_image_url?: string | null
          barcode?: string
          barcode_image_url?: string | null
          brand_id?: string
          caffeine_mg_per_100ml?: number | null
          category?: Database["public"]["Enums"]["can_category"]
          color_primary?: string | null
          color_secondary?: string | null
          created_at?: string
          description?: string | null
          edition_type?: string | null
          energy_kcal_per_100ml?: number | null
          flavour?: string | null
          historical_context?: string | null
          history_verified?: boolean
          id?: string
          image_url?: string
          model_id?: string | null
          name?: string
          notes?: string | null
          proposed_brand_name?: string | null
          region?: string | null
          release_year?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string
          sugar_g_per_100ml?: number | null
          tab_color?: string | null
          taurine_mg_per_100ml?: number | null
          variant_name?: string | null
          volume_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "can_submissions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "can_submissions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "can_models"
            referencedColumns: ["id"]
          },
        ]
      }
      cans: {
        Row: {
          back_image_url: string | null
          barcode: string
          barcode_image_url: string | null
          brand_id: string
          caffeine_mg_per_100ml: number | null
          category: Database["public"]["Enums"]["can_category"]
          color_primary: string
          color_secondary: string
          created_at: string
          description: string | null
          edition_type: string
          energy_kcal_per_100ml: number | null
          flavour: string | null
          historical_context: string | null
          history_verified: boolean
          id: string
          image_url: string | null
          model_id: string | null
          name: string
          notes: string | null
          region: string | null
          release_year: number | null
          sugar_g_per_100ml: number | null
          tab_color: string | null
          taurine_mg_per_100ml: number | null
          variant_name: string
          volume_ml: number | null
        }
        Insert: {
          back_image_url?: string | null
          barcode: string
          barcode_image_url?: string | null
          brand_id: string
          caffeine_mg_per_100ml?: number | null
          category?: Database["public"]["Enums"]["can_category"]
          color_primary?: string
          color_secondary?: string
          created_at?: string
          description?: string | null
          edition_type?: string
          energy_kcal_per_100ml?: number | null
          flavour?: string | null
          historical_context?: string | null
          history_verified?: boolean
          id?: string
          image_url?: string | null
          model_id?: string | null
          name: string
          notes?: string | null
          region?: string | null
          release_year?: number | null
          sugar_g_per_100ml?: number | null
          tab_color?: string | null
          taurine_mg_per_100ml?: number | null
          variant_name?: string
          volume_ml?: number | null
        }
        Update: {
          back_image_url?: string | null
          barcode?: string
          barcode_image_url?: string | null
          brand_id?: string
          caffeine_mg_per_100ml?: number | null
          category?: Database["public"]["Enums"]["can_category"]
          color_primary?: string
          color_secondary?: string
          created_at?: string
          description?: string | null
          edition_type?: string
          energy_kcal_per_100ml?: number | null
          flavour?: string | null
          historical_context?: string | null
          history_verified?: boolean
          id?: string
          image_url?: string | null
          model_id?: string | null
          name?: string
          notes?: string | null
          region?: string | null
          release_year?: number | null
          sugar_g_per_100ml?: number | null
          tab_color?: string | null
          taurine_mg_per_100ml?: number | null
          variant_name?: string
          volume_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cans_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cans_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "can_models"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_cleanup_archive: {
        Row: {
          archived_at: string
          brand_name: string | null
          can_id: string
          can_name: string
          can_record: Json
          id: string
          related_records: Json
          user_collection_records: Json
        }
        Insert: {
          archived_at?: string
          brand_name?: string | null
          can_id: string
          can_name: string
          can_record: Json
          id?: string
          related_records?: Json
          user_collection_records?: Json
        }
        Update: {
          archived_at?: string
          brand_name?: string | null
          can_id?: string
          can_name?: string
          can_record?: Json
          id?: string
          related_records?: Json
          user_collection_records?: Json
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          user_id: string
          vote: number
        }
        Insert: {
          comment_id: string
          user_id: string
          vote?: number
        }
        Update: {
          comment_id?: string
          user_id?: string
          vote?: number
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string | null
          can_id: string
          created_at: string
          id: string
          image_url: string | null
          parent_id: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          can_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          parent_id?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          can_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_can_id_fkey"
            columns: ["can_id"]
            isOneToOne: false
            referencedRelation: "cans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_gallery: {
        Row: {
          created_at: string
          id: string
          image_url: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_reports: {
        Row: {
          comment: string
          created_at: string
          id: string
          photo_paths: string[]
          reported_user_id: string
          reporter_id: string
          status: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          photo_paths?: string[]
          reported_user_id: string
          reporter_id: string
          status?: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          photo_paths?: string[]
          reported_user_id?: string
          reporter_id?: string
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          created_at: string
          favorite_can_ids: string[]
          id: string
          username: string
          username_changed_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string
          favorite_can_ids?: string[]
          id: string
          username: string
          username_changed_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string
          favorite_can_ids?: string[]
          id?: string
          username?: string
          username_changed_at?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          can_id: string
          design: number | null
          taste: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          can_id: string
          design?: number | null
          taste?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          can_id?: string
          design?: number | null
          taste?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_can_id_fkey"
            columns: ["can_id"]
            isOneToOne: false
            referencedRelation: "cans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_can_drinks: {
        Row: {
          can_id: string
          drinks_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          can_id: string
          drinks_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          can_id?: string
          drinks_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_can_drinks_can_id_fkey"
            columns: ["can_id"]
            isOneToOne: false
            referencedRelation: "cans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_cans: {
        Row: {
          can_id: string
          condition: string
          first_scanned_at: string
          id: string
          quantity: number
          user_id: string
        }
        Insert: {
          can_id: string
          condition?: string
          first_scanned_at?: string
          id?: string
          quantity?: number
          user_id: string
        }
        Update: {
          can_id?: string
          condition?: string
          first_scanned_at?: string
          id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cans_can_id_fkey"
            columns: ["can_id"]
            isOneToOne: false
            referencedRelation: "cans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_can_submission: {
        Args: { p_submission_id: string }
        Returns: undefined
      }
      get_total_can_drinks: { Args: { p_can_id: string }; Returns: number }
      review_can_report: {
        Args: {
          p_approve: boolean
          p_field?: string
          p_report_id: string
          p_review_notes?: string
          p_value?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      can_category: "Energy Drink" | "Soda" | "Soft Drink" | "Limited Edition"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      can_category: ["Energy Drink", "Soda", "Soft Drink", "Limited Edition"],
    },
  },
} as const
