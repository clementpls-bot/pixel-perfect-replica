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
      can_submissions: {
        Row: {
          back_image_url: string | null
          barcode: string
          barcode_image_url: string | null
          brand_id: string
          category: Database["public"]["Enums"]["can_category"]
          created_at: string
          description: string | null
          flavour: string | null
          id: string
          image_url: string
          name: string
          release_year: number | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string
        }
        Insert: {
          back_image_url?: string | null
          barcode: string
          barcode_image_url?: string | null
          brand_id: string
          category?: Database["public"]["Enums"]["can_category"]
          created_at?: string
          description?: string | null
          flavour?: string | null
          id?: string
          image_url: string
          name: string
          release_year?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by: string
        }
        Update: {
          back_image_url?: string | null
          barcode?: string
          barcode_image_url?: string | null
          brand_id?: string
          category?: Database["public"]["Enums"]["can_category"]
          created_at?: string
          description?: string | null
          flavour?: string | null
          id?: string
          image_url?: string
          name?: string
          release_year?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "can_submissions_brand_id_fkey"
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
          category: string
          created_at?: string
          details: string
          id?: string
          image_urls?: string[]
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
        ]
      }
      cans: {
        Row: {
          barcode: string
          brand_id: string
          category: Database["public"]["Enums"]["can_category"]
          color_primary: string
          color_secondary: string
          created_at: string
          description: string | null
          flavour: string | null
          historical_context: string | null
          id: string
          image_url: string | null
          name: string
          release_year: number | null
        }
        Insert: {
          barcode: string
          brand_id: string
          category?: Database["public"]["Enums"]["can_category"]
          color_primary?: string
          color_secondary?: string
          created_at?: string
          description?: string | null
          flavour?: string | null
          historical_context?: string | null
          id?: string
          image_url?: string | null
          name: string
          release_year?: number | null
        }
        Update: {
          barcode?: string
          brand_id?: string
          category?: Database["public"]["Enums"]["can_category"]
          color_primary?: string
          color_secondary?: string
          created_at?: string
          description?: string | null
          flavour?: string | null
          historical_context?: string | null
          id?: string
          image_url?: string | null
          name?: string
          release_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cans_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          user_id: string
        }
        Update: {
          comment_id?: string
          user_id?: string
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
          body: string
          can_id: string
          created_at: string
          id: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          body: string
          can_id: string
          created_at?: string
          id?: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          body?: string
          can_id?: string
          created_at?: string
          id?: string
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          favorite_can_ids: string[]
          id: string
          username: string
          username_changed_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          favorite_can_ids?: string[]
          id: string
          username: string
          username_changed_at?: string | null
        }
        Update: {
          avatar_url?: string | null
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
      user_cans: {
        Row: {
          can_id: string
          first_scanned_at: string
          id: string
          quantity: number
          user_id: string
        }
        Insert: {
          can_id: string
          first_scanned_at?: string
          id?: string
          quantity?: number
          user_id: string
        }
        Update: {
          can_id?: string
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
      [_ in never]: never
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
