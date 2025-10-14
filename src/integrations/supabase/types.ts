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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          role: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_query_log: {
        Row: {
          created_at: string
          id: string
          query_content: string | null
          query_type: string
          response_content: string | null
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          query_content?: string | null
          query_type: string
          response_content?: string | null
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          query_content?: string | null
          query_type?: string
          response_content?: string | null
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      app_logs: {
        Row: {
          action: string | null
          component: string | null
          context: Json | null
          created_at: string
          error_message: string | null
          error_name: string | null
          event: string
          id: string
          ip: unknown | null
          level: string
          message: string | null
          request_id: string | null
          route: string | null
          session_id: string | null
          stack: string | null
          status_code: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          component?: string | null
          context?: Json | null
          created_at?: string
          error_message?: string | null
          error_name?: string | null
          event: string
          id?: string
          ip?: unknown | null
          level: string
          message?: string | null
          request_id?: string | null
          route?: string | null
          session_id?: string | null
          stack?: string | null
          status_code?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          component?: string | null
          context?: Json | null
          created_at?: string
          error_message?: string | null
          error_name?: string | null
          event?: string
          id?: string
          ip?: unknown | null
          level?: string
          message?: string | null
          request_id?: string | null
          route?: string | null
          session_id?: string | null
          stack?: string | null
          status_code?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bill_reminder_jobs: {
        Row: {
          bill_reminder_id: string
          created_at: string
          cron_expression: string
          error_message: string | null
          executed_at: string | null
          execution_date: string
          id: string
          job_name: string
          status: string
          updated_at: string
        }
        Insert: {
          bill_reminder_id: string
          created_at?: string
          cron_expression: string
          error_message?: string | null
          executed_at?: string | null
          execution_date: string
          id?: string
          job_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          bill_reminder_id?: string
          created_at?: string
          cron_expression?: string
          error_message?: string | null
          executed_at?: string | null
          execution_date?: string
          id?: string
          job_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_reminder_jobs_bill_reminder_id_fkey"
            columns: ["bill_reminder_id"]
            isOneToOne: false
            referencedRelation: "bill_reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_reminders: {
        Row: {
          bill_id: string
          created_at: string
          delivery_status: string | null
          email_sent_at: string | null
          error_message: string | null
          id: string
          max_retries: number
          priority: string
          reminder_date: string
          reminder_days_before: number
          resend_email_id: string | null
          retry_count: number
          scheduled_job_id: string | null
          scheduled_send_at: string | null
          sent_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bill_id: string
          created_at?: string
          delivery_status?: string | null
          email_sent_at?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number
          priority?: string
          reminder_date: string
          reminder_days_before?: number
          resend_email_id?: string | null
          retry_count?: number
          scheduled_job_id?: string | null
          scheduled_send_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bill_id?: string
          created_at?: string
          delivery_status?: string | null
          email_sent_at?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number
          priority?: string
          reminder_date?: string
          reminder_days_before?: number
          resend_email_id?: string | null
          retry_count?: number
          scheduled_job_id?: string | null
          scheduled_send_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_reminders_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          amount: number
          auto_reminder_enabled: boolean | null
          category: string
          created_at: string
          due_date: string
          id: string
          name: string
          notes: string | null
          priority: string | null
          recurring: boolean
          reminder_days_before: number | null
          status: Database["public"]["Enums"]["bill_status"]
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          auto_reminder_enabled?: boolean | null
          category: string
          created_at?: string
          due_date: string
          id?: string
          name: string
          notes?: string | null
          priority?: string | null
          recurring?: boolean
          reminder_days_before?: number | null
          status?: Database["public"]["Enums"]["bill_status"]
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          auto_reminder_enabled?: boolean | null
          category?: string
          created_at?: string
          due_date?: string
          id?: string
          name?: string
          notes?: string | null
          priority?: string | null
          recurring?: boolean
          reminder_days_before?: number | null
          status?: Database["public"]["Enums"]["bill_status"]
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          base_currency: string | null
          business_address: string | null
          business_name: string | null
          business_tax_id_label: string | null
          business_tax_id_value: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          id: string
          number_format: string | null
          tax_regime: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          base_currency?: string | null
          business_address?: string | null
          business_name?: string | null
          business_tax_id_label?: string | null
          business_tax_id_value?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          number_format?: string | null
          tax_regime?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          base_currency?: string | null
          business_address?: string | null
          business_name?: string | null
          business_tax_id_label?: string | null
          business_tax_id_value?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          number_format?: string | null
          tax_regime?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string
          id: string
          name: string
          party_gstin: string | null
          party_state: string | null
          party_state_code: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          party_gstin?: string | null
          party_state?: string | null
          party_state_code?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          party_gstin?: string | null
          party_state?: string | null
          party_state_code?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_bonuses: {
        Row: {
          bonus_date: string
          claimed_at: string | null
          created_at: string
          id: string
          reward_type: string
          reward_value: Json
          streak_day: number
          user_id: string
        }
        Insert: {
          bonus_date?: string
          claimed_at?: string | null
          created_at?: string
          id?: string
          reward_type: string
          reward_value: Json
          streak_day?: number
          user_id: string
        }
        Update: {
          bonus_date?: string
          claimed_at?: string | null
          created_at?: string
          id?: string
          reward_type?: string
          reward_value?: Json
          streak_day?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_bonuses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      export_logs: {
        Row: {
          created_at: string
          date_from: string | null
          date_to: string | null
          export_type: string
          file_format: string
          file_name: string
          id: string
          record_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          export_type: string
          file_format: string
          file_name: string
          id?: string
          record_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          export_type?: string
          file_format?: string
          file_name?: string
          id?: string
          record_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      indian_states: {
        Row: {
          created_at: string
          id: string
          state_code: string
          state_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          state_code: string
          state_name: string
        }
        Update: {
          created_at?: string
          id?: string
          state_code?: string
          state_name?: string
        }
        Relationships: []
      }
      inventory_txns: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_id: string | null
          product_id: string
          quantity: number
          reference_type: string | null
          txn_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          product_id: string
          quantity: number
          reference_type?: string | null
          txn_type: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          product_id?: string
          quantity?: number
          reference_type?: string | null
          txn_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_txns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          description: string | null
          due_date: string
          id: string
          invoice_number: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          description?: string | null
          due_date: string
          id?: string
          invoice_number?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          description?: string | null
          due_date?: string
          id?: string
          invoice_number?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_lines: {
        Row: {
          cgst_amount: number | null
          created_at: string
          description: string | null
          gst_rate: number | null
          hsn_sac_code: string | null
          id: string
          igst_amount: number | null
          order_id: string
          order_type: Database["public"]["Enums"]["order_type"]
          product_id: string | null
          product_name: string
          quantity: number
          rcm: boolean | null
          sgst_amount: number | null
          subtotal: number
          tax_amount: number
          tax_rate: number
          taxable_amount: number | null
          total_amount: number
          unit_price: number
          updated_at: string
          zero_rated: boolean | null
        }
        Insert: {
          cgst_amount?: number | null
          created_at?: string
          description?: string | null
          gst_rate?: number | null
          hsn_sac_code?: string | null
          id?: string
          igst_amount?: number | null
          order_id: string
          order_type: Database["public"]["Enums"]["order_type"]
          product_id?: string | null
          product_name: string
          quantity?: number
          rcm?: boolean | null
          sgst_amount?: number | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          taxable_amount?: number | null
          total_amount?: number
          unit_price?: number
          updated_at?: string
          zero_rated?: boolean | null
        }
        Update: {
          cgst_amount?: number | null
          created_at?: string
          description?: string | null
          gst_rate?: number | null
          hsn_sac_code?: string | null
          id?: string
          igst_amount?: number | null
          order_id?: string
          order_type?: Database["public"]["Enums"]["order_type"]
          product_id?: string | null
          product_name?: string
          quantity?: number
          rcm?: boolean | null
          sgst_amount?: number | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          taxable_amount?: number | null
          total_amount?: number
          unit_price?: number
          updated_at?: string
          zero_rated?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_access_log: {
        Row: {
          accessed_at: string | null
          accessed_by: string
          action: string
          id: string
          notes: string | null
          payment_transaction_id: string | null
        }
        Insert: {
          accessed_at?: string | null
          accessed_by: string
          action: string
          id?: string
          notes?: string | null
          payment_transaction_id?: string | null
        }
        Update: {
          accessed_at?: string | null
          accessed_by?: string
          action?: string
          id?: string
          notes?: string | null
          payment_transaction_id?: string | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          plan_type: string
          processed: boolean | null
          status: string
          transaction_id: string
          updated_at: string
          upi_id: string | null
          user_email: string | null
          user_id: string
          user_phone: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          plan_type: string
          processed?: boolean | null
          status?: string
          transaction_id: string
          updated_at?: string
          upi_id?: string | null
          user_email?: string | null
          user_id: string
          user_phone?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          plan_type?: string
          processed?: boolean | null
          status?: string
          transaction_id?: string
          updated_at?: string
          upi_id?: string | null
          user_email?: string | null
          user_id?: string
          user_phone?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          default_gst_rate: number | null
          id: string
          name: string
          purchase_price: number
          reorder_level: number
          selling_price: number
          sku: string
          stock_qty: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_gst_rate?: number | null
          id?: string
          name: string
          purchase_price?: number
          reorder_level?: number
          selling_price?: number
          sku: string
          stock_qty?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_gst_rate?: number | null
          id?: string
          name?: string
          purchase_price?: number
          reorder_level?: number
          selling_price?: number
          sku?: string
          stock_qty?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_legal_name: string | null
          company: string | null
          company_address: string | null
          company_gstin: string | null
          company_pan: string | null
          company_state: string | null
          company_state_code: string | null
          created_at: string
          email: string
          email_notifications_enabled: boolean | null
          full_name: string | null
          id: string
          is_active: boolean | null
          phone_number: string | null
          reminder_email: string | null
          short_id: string | null
          sms_notifications_enabled: boolean | null
          tax_regime: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          business_legal_name?: string | null
          company?: string | null
          company_address?: string | null
          company_gstin?: string | null
          company_pan?: string | null
          company_state?: string | null
          company_state_code?: string | null
          created_at?: string
          email: string
          email_notifications_enabled?: boolean | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          phone_number?: string | null
          reminder_email?: string | null
          short_id?: string | null
          sms_notifications_enabled?: boolean | null
          tax_regime?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          business_legal_name?: string | null
          company?: string | null
          company_address?: string | null
          company_gstin?: string | null
          company_pan?: string | null
          company_state?: string | null
          company_state_code?: string | null
          created_at?: string
          email?: string
          email_notifications_enabled?: boolean | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          phone_number?: string | null
          reminder_email?: string | null
          short_id?: string | null
          sms_notifications_enabled?: boolean | null
          tax_regime?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          amount_paid: number
          cgst_amount: number | null
          created_at: string
          due_date: string | null
          eway_bill_no: string | null
          fx_currency: string | null
          fx_rate_to_base: number | null
          grand_total: number
          id: string
          igst_amount: number | null
          invoice_number: string
          is_igst: boolean | null
          is_reverse_charge: boolean | null
          notes: string | null
          payment_status: string
          place_of_supply: string | null
          sgst_amount: number | null
          supplier_address: string | null
          supplier_gstin: string | null
          supplier_name: string
          supplier_state: string | null
          tax_amount: number
          tax_regime: string | null
          terms_conditions: string | null
          total_amount: number
          transaction_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          cgst_amount?: number | null
          created_at?: string
          due_date?: string | null
          eway_bill_no?: string | null
          fx_currency?: string | null
          fx_rate_to_base?: number | null
          grand_total?: number
          id?: string
          igst_amount?: number | null
          invoice_number: string
          is_igst?: boolean | null
          is_reverse_charge?: boolean | null
          notes?: string | null
          payment_status?: string
          place_of_supply?: string | null
          sgst_amount?: number | null
          supplier_address?: string | null
          supplier_gstin?: string | null
          supplier_name: string
          supplier_state?: string | null
          tax_amount?: number
          tax_regime?: string | null
          terms_conditions?: string | null
          total_amount?: number
          transaction_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          cgst_amount?: number | null
          created_at?: string
          due_date?: string | null
          eway_bill_no?: string | null
          fx_currency?: string | null
          fx_rate_to_base?: number | null
          grand_total?: number
          id?: string
          igst_amount?: number | null
          invoice_number?: string
          is_igst?: boolean | null
          is_reverse_charge?: boolean | null
          notes?: string | null
          payment_status?: string
          place_of_supply?: string | null
          sgst_amount?: number | null
          supplier_address?: string | null
          supplier_gstin?: string | null
          supplier_name?: string
          supplier_state?: string | null
          tax_amount?: number
          tax_regime?: string | null
          terms_conditions?: string | null
          total_amount?: number
          transaction_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          amount_paid: number
          cgst_amount: number | null
          created_at: string
          customer_address: string | null
          customer_gstin: string | null
          customer_name: string
          customer_state: string | null
          due_date: string | null
          eway_bill_no: string | null
          fx_currency: string | null
          fx_rate_to_base: number | null
          grand_total: number
          id: string
          igst_amount: number | null
          invoice_number: string
          is_igst: boolean | null
          is_reverse_charge: boolean | null
          notes: string | null
          payment_status: string
          place_of_supply: string | null
          sgst_amount: number | null
          tax_amount: number
          tax_regime: string | null
          terms_conditions: string | null
          total_amount: number
          transaction_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          cgst_amount?: number | null
          created_at?: string
          customer_address?: string | null
          customer_gstin?: string | null
          customer_name: string
          customer_state?: string | null
          due_date?: string | null
          eway_bill_no?: string | null
          fx_currency?: string | null
          fx_rate_to_base?: number | null
          grand_total?: number
          id?: string
          igst_amount?: number | null
          invoice_number: string
          is_igst?: boolean | null
          is_reverse_charge?: boolean | null
          notes?: string | null
          payment_status?: string
          place_of_supply?: string | null
          sgst_amount?: number | null
          tax_amount?: number
          tax_regime?: string | null
          terms_conditions?: string | null
          total_amount?: number
          transaction_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          cgst_amount?: number | null
          created_at?: string
          customer_address?: string | null
          customer_gstin?: string | null
          customer_name?: string
          customer_state?: string | null
          due_date?: string | null
          eway_bill_no?: string | null
          fx_currency?: string | null
          fx_rate_to_base?: number | null
          grand_total?: number
          id?: string
          igst_amount?: number | null
          invoice_number?: string
          is_igst?: boolean | null
          is_reverse_charge?: boolean | null
          notes?: string | null
          payment_status?: string
          place_of_supply?: string | null
          sgst_amount?: number | null
          tax_amount?: number
          tax_regime?: string | null
          terms_conditions?: string | null
          total_amount?: number
          transaction_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      streak_history: {
        Row: {
          broke_at: string
          created_at: string
          id: string
          protection_method: string | null
          streak_length: number
          user_id: string
          was_protected: boolean
        }
        Insert: {
          broke_at?: string
          created_at?: string
          id?: string
          protection_method?: string | null
          streak_length: number
          user_id: string
          was_protected?: boolean
        }
        Update: {
          broke_at?: string
          created_at?: string
          id?: string
          protection_method?: string | null
          streak_length?: number
          user_id?: string
          was_protected?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "streak_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      streak_shields: {
        Row: {
          created_at: string
          earned_method: string
          expires_at: string | null
          id: string
          is_active: boolean
          shield_type: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          earned_method: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          shield_type: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          earned_method?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          shield_type?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streak_shields_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["user_role"]
          team_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["user_role"]
          team_id: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["user_role"]
          team_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string | null
          role: Database["public"]["Enums"]["user_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      temporary_unlocks: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          unlock_data: Json
          unlock_type: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          is_active?: boolean
          unlock_data: Json
          unlock_type: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          unlock_data?: Json
          unlock_type?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "temporary_unlocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_description: string | null
          badge_icon: string | null
          badge_id: string
          badge_name: string
          badge_tier: string | null
          earned_at: string
          id: string
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          badge_description?: string | null
          badge_icon?: string | null
          badge_id: string
          badge_name: string
          badge_tier?: string | null
          earned_at?: string
          id?: string
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          badge_description?: string | null
          badge_icon?: string | null
          badge_id?: string
          badge_name?: string
          badge_tier?: string | null
          earned_at?: string
          id?: string
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: []
      }
      user_collectibles: {
        Row: {
          collected_at: string
          collectible_id: string
          collectible_name: string
          collectible_type: string
          id: string
          image_url: string | null
          rarity: string
          user_id: string
        }
        Insert: {
          collected_at?: string
          collectible_id: string
          collectible_name: string
          collectible_type: string
          id?: string
          image_url?: string | null
          rarity: string
          user_id: string
        }
        Update: {
          collected_at?: string
          collectible_id?: string
          collectible_name?: string
          collectible_type?: string
          id?: string
          image_url?: string | null
          rarity?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_collectibles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_plan_changes: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_plan: string
          old_plan: string
          user_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_plan: string
          old_plan: string
          user_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_plan?: string
          old_plan?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_plan_changes_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_plan_changes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_plans: {
        Row: {
          ai_queries_limit: number
          ai_queries_reset_date: string
          ai_queries_used: number
          created_at: string
          id: string
          plan: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_queries_limit?: number
          ai_queries_reset_date?: string
          ai_queries_used?: number
          created_at?: string
          id?: string
          plan?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_queries_limit?: number
          ai_queries_reset_date?: string
          ai_queries_used?: number
          created_at?: string
          id?: string
          plan?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_rewards: {
        Row: {
          created_at: string
          current_level: number
          current_streak: number
          early_payments: number
          has_streak_insurance: boolean
          id: string
          last_activity_date: string | null
          last_streak_save_date: string | null
          late_payments: number
          longest_streak: number
          on_time_payments: number
          streak_expires_at: string | null
          tier: string
          total_bills_paid: number
          total_shields_used: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_level?: number
          current_streak?: number
          early_payments?: number
          has_streak_insurance?: boolean
          id?: string
          last_activity_date?: string | null
          last_streak_save_date?: string | null
          late_payments?: number
          longest_streak?: number
          on_time_payments?: number
          streak_expires_at?: string | null
          tier?: string
          total_bills_paid?: number
          total_shields_used?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_level?: number
          current_streak?: number
          early_payments?: number
          has_streak_insurance?: boolean
          id?: string
          last_activity_date?: string | null
          last_streak_save_date?: string | null
          late_payments?: number
          longest_streak?: number
          on_time_payments?: number
          streak_expires_at?: string | null
          tier?: string
          total_bills_paid?: number
          total_shields_used?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          auto_renew: boolean
          created_at: string
          expires_at: string | null
          id: string
          payment_transaction_id: string | null
          plan_type: string
          starts_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          payment_transaction_id?: string | null
          plan_type?: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          payment_transaction_id?: string | null
          plan_type?: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_transactions: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          id: string
          related_bill_id: string | null
          user_id: string
          xp_amount: number
        }
        Insert: {
          action_type: string
          created_at?: string
          description?: string | null
          id?: string
          related_bill_id?: string | null
          user_id: string
          xp_amount: number
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          id?: string
          related_bill_id?: string | null
          user_id?: string
          xp_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "xp_transactions_related_bill_id_fkey"
            columns: ["related_bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      gst_summary: {
        Row: {
          month: string | null
          total_amount: number | null
          total_cgst: number | null
          total_igst: number | null
          total_sgst: number | null
          total_tax: number | null
          transaction_type: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_sample_data_for_user: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      admin_get_logs: {
        Args: { p_level?: string; p_limit?: number }
        Returns: {
          action: string
          component: string
          context: Json
          created_at: string
          error_message: string
          error_name: string
          event: string
          id: string
          level: string
          message: string
          route: string
          stack: string
          status_code: number
          user_id: string
        }[]
      }
      amount_to_words: {
        Args: { amount: number }
        Returns: string
      }
      award_streak_shield: {
        Args: {
          p_earned_method: string
          p_shield_type: string
          p_user_id: string
        }
        Returns: string
      }
      award_xp: {
        Args: {
          p_action_type: string
          p_description?: string
          p_related_bill_id?: string
          p_user_id: string
          p_xp_amount: number
        }
        Returns: Json
      }
      calculate_gst_breakdown: {
        Args: {
          p_gst_rate: number
          p_is_igst: boolean
          p_taxable_amount: number
        }
        Returns: {
          cgst: number
          igst: number
          sgst: number
        }[]
      }
      calculate_streak_expiration: {
        Args: { p_last_activity_date: string }
        Returns: string
      }
      calculate_user_level: {
        Args: { xp: number }
        Returns: number
      }
      calculate_user_tier: {
        Args: { level: number }
        Returns: string
      }
      can_claim_daily_bonus: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      can_manage_team_members: {
        Args: { target_team_id: string }
        Returns: boolean
      }
      can_view_team_membership: {
        Args: { target_team_id: string; target_user_id: string }
        Returns: boolean
      }
      create_default_user_plan: {
        Args: { _user_id: string }
        Returns: undefined
      }
      generate_daily_reward: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      generate_invoice_number: {
        Args: { p_order_type: string; p_user_id: string }
        Returns: string
      }
      get_user_stats: {
        Args: { target_user_id: string }
        Returns: {
          bill_count: number
          email_confirmed_at: string
          invoice_count: number
          last_sign_in_at: string
          user_id: string
        }[]
      }
      has_team_role: {
        Args: {
          _required_role: Database["public"]["Enums"]["user_role"]
          _team_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_system_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
      log_payment_access: {
        Args: { p_action: string; p_notes?: string; p_payment_id?: string }
        Returns: undefined
      }
      purchase_streak_shield: {
        Args: { p_shield_type: string; p_user_id: string; p_xp_cost: number }
        Returns: Json
      }
      require_payment_access_verification: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      schedule_manual_reminder: {
        Args: { p_bill_id: string; p_days_before?: number }
        Returns: string
      }
      set_user_active_status: {
        Args: { active_status: boolean; target_user_id: string }
        Returns: undefined
      }
      use_streak_shield: {
        Args: { p_shield_type?: string; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      bill_status: "unpaid" | "paid" | "overdue"
      invoice_status: "pending" | "paid" | "overdue"
      order_type: "sale" | "purchase"
      user_role: "owner" | "admin" | "member" | "viewer"
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
    Enums: {
      bill_status: ["unpaid", "paid", "overdue"],
      invoice_status: ["pending", "paid", "overdue"],
      order_type: ["sale", "purchase"],
      user_role: ["owner", "admin", "member", "viewer"],
    },
  },
} as const
