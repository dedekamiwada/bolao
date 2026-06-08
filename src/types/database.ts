export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      teams: {
        Row: {
          id: number
          fifa_code: string
          name: string
          group_letter: string | null
          flag_url: string | null
        }
        Insert: Omit<Database["public"]["Tables"]["teams"]["Row"], "id"> & { id?: number }
        Update: Partial<Database["public"]["Tables"]["teams"]["Insert"]>
      }
      matches: {
        Row: {
          id: number
          external_id: number | null
          stage: string
          group_letter: string | null
          match_number: number
          home_team_id: number | null
          away_team_id: number | null
          scheduled_at: string
          status: string
          home_score: number | null
          away_score: number | null
          home_score_et: number | null
          away_score_et: number | null
          winner_team_id: number | null
          result_confirmed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["matches"]["Row"], "id" | "created_at" | "updated_at"> & { id?: number }
        Update: Partial<Database["public"]["Tables"]["matches"]["Insert"]>
      }
      participants: {
        Row: {
          id: string
          name: string
          token_hash: string
          created_at: string
          is_active: boolean
        }
        Insert: Omit<Database["public"]["Tables"]["participants"]["Row"], "id" | "created_at"> & { id?: string }
        Update: Partial<Database["public"]["Tables"]["participants"]["Insert"]>
      }
      group_predictions: {
        Row: {
          id: string
          participant_id: string
          match_id: number
          home_score: number
          away_score: number
          submitted_at: string
          updated_at: string
          is_locked: boolean
        }
        Insert: Omit<Database["public"]["Tables"]["group_predictions"]["Row"], "id" | "submitted_at" | "updated_at"> & { id?: string }
        Update: Partial<Database["public"]["Tables"]["group_predictions"]["Insert"]>
      }
      group_classification_predictions: {
        Row: {
          id: string
          participant_id: string
          group_letter: string
          position: number
          team_id: number
          submitted_at: string
          is_locked: boolean
        }
        Insert: Omit<Database["public"]["Tables"]["group_classification_predictions"]["Row"], "id" | "submitted_at"> & { id?: string }
        Update: Partial<Database["public"]["Tables"]["group_classification_predictions"]["Insert"]>
      }
      knockout_predictions: {
        Row: {
          id: string
          participant_id: string
          match_id: number
          home_team_id: number | null
          away_team_id: number | null
          home_score: number | null
          away_score: number | null
          winner_team_id: number | null
          submitted_at: string
          updated_at: string
          is_locked: boolean
        }
        Insert: Omit<Database["public"]["Tables"]["knockout_predictions"]["Row"], "id" | "submitted_at" | "updated_at"> & { id?: string }
        Update: Partial<Database["public"]["Tables"]["knockout_predictions"]["Insert"]>
      }
      match_scores: {
        Row: {
          id: string
          participant_id: string
          match_id: number
          points_exact_score: number
          points_result: number
          points_goal_diff: number
          points_classification: number
          total_points: number
          calculated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["match_scores"]["Row"], "id" | "calculated_at"> & { id?: string }
        Update: Partial<Database["public"]["Tables"]["match_scores"]["Insert"]>
      }
      ranking_snapshots: {
        Row: {
          id: string
          participant_id: string
          snapshot_date: string
          total_points: number
          exact_scores: number
          correct_results: number
          rank_position: number | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["ranking_snapshots"]["Row"], "id" | "created_at"> & { id?: string }
        Update: Partial<Database["public"]["Tables"]["ranking_snapshots"]["Insert"]>
      }
      pool_config: {
        Row: {
          key: string
          value: Json
        }
        Insert: Database["public"]["Tables"]["pool_config"]["Row"]
        Update: Partial<Database["public"]["Tables"]["pool_config"]["Row"]>
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
