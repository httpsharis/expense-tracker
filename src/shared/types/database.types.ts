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
      periods: {
        Row: {
          id: string
          user_id: string
          name: string
          status: 'open' | 'closed'
          started_at: string
          ended_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          status?: 'open' | 'closed'
          started_at?: string
          ended_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          status?: 'open' | 'closed'
          started_at?: string
          ended_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      balance_entries: {
        Row: {
          id: string
          period_id: string
          user_id: string
          amount: number
          type: 'top_up' | 'expense' | 'settlement'
          created_at: string
        }
        Insert: {
          id?: string
          period_id: string
          user_id: string
          amount: number
          type: 'top_up' | 'expense' | 'settlement'
          created_at?: string
        }
        Update: {
          id?: string
          period_id?: string
          user_id?: string
          amount?: number
          type?: 'top_up' | 'expense' | 'settlement'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_entries_period_id_fkey"
            columns: ["period_id"]
            referencedRelation: "periods"
            referencedColumns: ["id"]
          }
        ]
      }
      people: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          period_id: string
          user_id: string
          category: string
          amount: number
          date: string
          notes: string | null
          is_group: boolean
          created_at: string
        }
        Insert: {
          id?: string
          period_id: string
          user_id: string
          category: string
          amount: number
          date?: string
          notes?: string | null
          is_group?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          period_id?: string
          user_id?: string
          category?: string
          amount?: number
          date?: string
          notes?: string | null
          is_group?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_period_id_fkey"
            columns: ["period_id"]
            referencedRelation: "periods"
            referencedColumns: ["id"]
          }
        ]
      }
      splits: {
        Row: {
          id: string
          transaction_id: string
          user_id: string
          total_amount: number
          payer_id: string | null
          num_people: number
          created_at: string
        }
        Insert: {
          id?: string
          transaction_id: string
          user_id: string
          total_amount: number
          payer_id?: string | null
          num_people: number
          created_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string
          user_id?: string
          total_amount?: number
          payer_id?: string | null
          num_people?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "splits_transaction_id_fkey"
            columns: ["transaction_id"]
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "splits_payer_id_fkey"
            columns: ["payer_id"]
            referencedRelation: "people"
            referencedColumns: ["id"]
          }
        ]
      }
      debts: {
        Row: {
          id: string
          split_id: string
          user_id: string
          person_id: string
          amount: number
          direction: 'owed_to_me' | 'i_owe'
          status: 'open' | 'partial' | 'settled'
          created_at: string
        }
        Insert: {
          id?: string
          split_id: string
          user_id: string
          person_id: string
          amount: number
          direction: 'owed_to_me' | 'i_owe'
          status?: 'open' | 'partial' | 'settled'
          created_at?: string
        }
        Update: {
          id?: string
          split_id?: string
          user_id?: string
          person_id?: string
          amount?: number
          direction?: 'owed_to_me' | 'i_owe'
          status?: 'open' | 'partial' | 'settled'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debts_split_id_fkey"
            columns: ["split_id"]
            referencedRelation: "splits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debts_person_id_fkey"
            columns: ["person_id"]
            referencedRelation: "people"
            referencedColumns: ["id"]
          }
        ]
      }
      debt_settlements: {
        Row: {
          id: string
          debt_id: string
          user_id: string
          balance_entry_id: string | null
          amount: number
          mode: 'from_balance' | 'separately'
          created_at: string
        }
        Insert: {
          id?: string
          debt_id: string
          user_id: string
          balance_entry_id?: string | null
          amount: number
          mode: 'from_balance' | 'separately'
          created_at?: string
        }
        Update: {
          id?: string
          debt_id?: string
          user_id?: string
          balance_entry_id?: string | null
          amount?: number
          mode?: 'from_balance' | 'separately'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_settlements_debt_id_fkey"
            columns: ["debt_id"]
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_settlements_balance_entry_id_fkey"
            columns: ["balance_entry_id"]
            referencedRelation: "balance_entries"
            referencedColumns: ["id"]
          }
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
      [_ in never]: never
    }
  }
}
