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
      app_settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_value: number | null
          store_id: string
          updated_at: string
          used_count: number
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_value?: number | null
          store_id: string
          updated_at?: string
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_value?: number | null
          store_id?: string
          updated_at?: string
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_activity_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          employee_id: string
          id: string
          resource_id: string | null
          resource_type: string | null
          store_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          employee_id: string
          id?: string
          resource_id?: string | null
          resource_type?: string | null
          store_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          employee_id?: string
          id?: string
          resource_id?: string | null
          resource_type?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_activity_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "store_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_activity_log_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_invites: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string
          expires_at: string
          id: string
          invite_token: string
          is_used: boolean | null
          permissions: Json
          position: string | null
          store_id: string
          used_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email: string
          expires_at: string
          id?: string
          invite_token: string
          is_used?: boolean | null
          permissions?: Json
          position?: string | null
          store_id: string
          used_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          invite_token?: string
          is_used?: boolean | null
          permissions?: Json
          position?: string | null
          store_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_invites_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_edit_history: {
        Row: {
          changes: Json
          created_at: string | null
          edited_by: string
          editor_name: string
          id: string
          order_id: string
        }
        Insert: {
          changes: Json
          created_at?: string | null
          edited_by: string
          editor_name: string
          id?: string
          order_id: string
        }
        Update: {
          changes?: Json
          created_at?: string | null
          edited_by?: string
          editor_name?: string
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_edit_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_complete_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_edit_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_addons: {
        Row: {
          addon_name: string
          addon_price: number
          created_at: string
          id: string
          order_item_id: string
        }
        Insert: {
          addon_name: string
          addon_price: number
          created_at?: string
          id?: string
          order_item_id: string
        }
        Update: {
          addon_name?: string
          addon_price?: number
          created_at?: string
          id?: string
          order_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_item_addons_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_flavors: {
        Row: {
          created_at: string
          flavor_name: string
          flavor_price: number
          id: string
          order_item_id: string
        }
        Insert: {
          created_at?: string
          flavor_name: string
          flavor_price?: number
          id?: string
          order_item_id: string
        }
        Update: {
          created_at?: string
          flavor_name?: string
          flavor_price?: number
          id?: string
          order_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_item_flavors_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          observation: string | null
          order_id: string
          product_id: string | null
          product_name: string
          product_slug: string | null
          quantity: number
          short_id: string | null
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          observation?: string | null
          order_id: string
          product_id?: string | null
          product_name: string
          product_slug?: string | null
          quantity: number
          short_id?: string | null
          subtotal: number
          unit_price: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          observation?: string | null
          order_id?: string
          product_id?: string | null
          product_name?: string
          product_slug?: string | null
          quantity?: number
          short_id?: string | null
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_complete_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_configs: {
        Row: {
          created_at: string | null
          display_order: number
          id: string
          is_active: boolean | null
          status_color: string
          status_key: string
          status_label: string
          store_id: string
          updated_at: string | null
          whatsapp_message: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          status_color?: string
          status_key: string
          status_label: string
          store_id: string
          updated_at?: string | null
          whatsapp_message?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          status_color?: string
          status_key?: string
          status_label?: string
          store_id?: string
          updated_at?: string | null
          whatsapp_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_configs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          change_amount: number | null
          coupon_code: string | null
          coupon_discount: number | null
          created_at: string
          customer_id: string | null
          customer_name: string
          customer_notes: string | null
          customer_phone: string
          delivery_complement: string | null
          delivery_fee: number
          delivery_neighborhood: string | null
          delivery_number: string | null
          delivery_street: string | null
          delivery_type: string
          id: string
          notes: string | null
          order_number: string
          payment_method: string
          payment_notes: string | null
          payment_received: boolean | null
          status: Database["public"]["Enums"]["order_status"]
          store_id: string
          store_image_url: string | null
          store_notes: string | null
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          change_amount?: number | null
          coupon_code?: string | null
          coupon_discount?: number | null
          created_at?: string
          customer_id?: string | null
          customer_name: string
          customer_notes?: string | null
          customer_phone: string
          delivery_complement?: string | null
          delivery_fee?: number
          delivery_neighborhood?: string | null
          delivery_number?: string | null
          delivery_street?: string | null
          delivery_type?: string
          id?: string
          notes?: string | null
          order_number: string
          payment_method?: string
          payment_notes?: string | null
          payment_received?: boolean | null
          status?: Database["public"]["Enums"]["order_status"]
          store_id: string
          store_image_url?: string | null
          store_notes?: string | null
          subtotal: number
          total: number
          updated_at?: string
        }
        Update: {
          change_amount?: number | null
          coupon_code?: string | null
          coupon_discount?: number | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          customer_notes?: string | null
          customer_phone?: string
          delivery_complement?: string | null
          delivery_fee?: number
          delivery_neighborhood?: string | null
          delivery_number?: string | null
          delivery_street?: string | null
          delivery_type?: string
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string
          payment_notes?: string | null
          payment_received?: boolean | null
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string
          store_image_url?: string | null
          store_notes?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_addons: {
        Row: {
          created_at: string
          id: string
          is_available: boolean | null
          name: string
          price: number
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_available?: boolean | null
          name: string
          price?: number
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_available?: boolean | null
          name?: string
          price?: number
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_addons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          store_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          store_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_flavors: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_available: boolean | null
          name: string
          price: number
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_available?: boolean | null
          name: string
          price?: number
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_available?: boolean | null
          name?: string
          price?: number
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_flavors_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          is_pizza: boolean | null
          max_flavors: number | null
          name: string
          price: number
          promotional_price: number | null
          short_id: string | null
          stock_quantity: number | null
          store_id: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_pizza?: boolean | null
          max_flavors?: number | null
          name: string
          price: number
          promotional_price?: number | null
          short_id?: string | null
          stock_quantity?: number | null
          store_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_pizza?: boolean | null
          max_flavors?: number | null
          name?: string
          price?: number
          promotional_price?: number | null
          short_id?: string | null
          stock_quantity?: number | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          complement: string | null
          created_at: string
          full_name: string | null
          id: string
          neighborhood: string | null
          phone: string | null
          street: string | null
          street_number: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          complement?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          neighborhood?: string | null
          phone?: string | null
          street?: string | null
          street_number?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          complement?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          neighborhood?: string | null
          phone?: string | null
          street?: string | null
          street_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          order_id: string | null
          rating: number
          store_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          order_id?: string | null
          rating: number
          store_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          order_id?: string | null
          rating?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_complete_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_employees: {
        Row: {
          created_at: string | null
          created_by: string | null
          employee_email: string
          employee_name: string
          employee_phone: string | null
          hired_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          permissions: Json
          position: string | null
          store_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          employee_email: string
          employee_name: string
          employee_phone?: string | null
          hired_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          permissions?: Json
          position?: string | null
          store_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          employee_email?: string
          employee_name?: string
          employee_phone?: string | null
          hired_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          permissions?: Json
          position?: string | null
          store_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_employees_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_instances: {
        Row: {
          created_at: string | null
          evolution_instance_id: string
          id: number
          store_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          evolution_instance_id: string
          id?: number
          store_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          evolution_instance_id?: string
          id?: number
          store_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      stores: {
        Row: {
          accepts_card: boolean | null
          accepts_cash: boolean | null
          accepts_delivery: boolean | null
          accepts_pickup: boolean | null
          accepts_pix: boolean | null
          address: string | null
          avg_delivery_time: number | null
          banner_url: string | null
          category: string
          created_at: string
          delivery_fee: number | null
          description: string | null
          email: string | null
          id: string
          is_open: boolean | null
          logo_url: string | null
          menu_label: string
          min_order_value: number | null
          name: string
          operating_hours: Json | null
          owner_id: string
          phone: string | null
          pickup_address: string | null
          pix_key: string | null
          rating: number | null
          show_avg_delivery_time: boolean | null
          show_pix_key_to_customer: boolean | null
          slug: string
          status: Database["public"]["Enums"]["store_status"]
          total_reviews: number | null
          updated_at: string
        }
        Insert: {
          accepts_card?: boolean | null
          accepts_cash?: boolean | null
          accepts_delivery?: boolean | null
          accepts_pickup?: boolean | null
          accepts_pix?: boolean | null
          address?: string | null
          avg_delivery_time?: number | null
          banner_url?: string | null
          category: string
          created_at?: string
          delivery_fee?: number | null
          description?: string | null
          email?: string | null
          id?: string
          is_open?: boolean | null
          logo_url?: string | null
          menu_label?: string
          min_order_value?: number | null
          name: string
          operating_hours?: Json | null
          owner_id: string
          phone?: string | null
          pickup_address?: string | null
          pix_key?: string | null
          rating?: number | null
          show_avg_delivery_time?: boolean | null
          show_pix_key_to_customer?: boolean | null
          slug: string
          status?: Database["public"]["Enums"]["store_status"]
          total_reviews?: number | null
          updated_at?: string
        }
        Update: {
          accepts_card?: boolean | null
          accepts_cash?: boolean | null
          accepts_delivery?: boolean | null
          accepts_pickup?: boolean | null
          accepts_pix?: boolean | null
          address?: string | null
          avg_delivery_time?: number | null
          banner_url?: string | null
          category?: string
          created_at?: string
          delivery_fee?: number | null
          description?: string | null
          email?: string | null
          id?: string
          is_open?: boolean | null
          logo_url?: string | null
          menu_label?: string
          min_order_value?: number | null
          name?: string
          operating_hours?: Json | null
          owner_id?: string
          phone?: string | null
          pickup_address?: string | null
          pix_key?: string | null
          rating?: number | null
          show_avg_delivery_time?: boolean | null
          show_pix_key_to_customer?: boolean | null
          slug?: string
          status?: Database["public"]["Enums"]["store_status"]
          total_reviews?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_message_log: {
        Row: {
          created_at: string | null
          id: string
          message_content: string | null
          order_id: string
          order_status: string
          phone_number: string
          sent_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_content?: string | null
          order_id: string
          order_status: string
          phone_number: string
          sent_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message_content?: string | null
          order_id?: string
          order_status?: string
          phone_number?: string
          sent_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      order_complete_view: {
        Row: {
          change_amount: number | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_complement: string | null
          delivery_fee: number | null
          delivery_neighborhood: string | null
          delivery_number: string | null
          delivery_street: string | null
          delivery_type: string | null
          id: string | null
          items: Json | null
          notes: string | null
          order_number: string | null
          payment_method: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          store_id: string | null
          subtotal: number | null
          total: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_admin_role_by_email: {
        Args: { user_email: string }
        Returns: undefined
      }
      bytea_to_text: { Args: { data: string }; Returns: string }
      confirm_user_email: { Args: { user_id: string }; Returns: boolean }
      create_order_rpc: {
        Args: {
          p_change_amount?: number
          p_customer_name: string
          p_customer_phone: string
          p_delivery_complement?: string
          p_delivery_fee: number
          p_delivery_neighborhood?: string
          p_delivery_number?: string
          p_delivery_street?: string
          p_delivery_type: string
          p_notes?: string
          p_order_number: string
          p_payment_method: string
          p_store_id: string
          p_subtotal: number
          p_total: number
        }
        Returns: string
      }
      employee_has_permission: {
        Args: {
          _action: string
          _resource: string
          _store_id: string
          _user_id: string
        }
        Returns: boolean
      }
      fc_consultar_email_user: {
        Args: { param_email: string }
        Returns: {
          cadastrado: boolean
          result: string
        }[]
      }
      generate_short_id: { Args: never; Returns: string }
      get_admin_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          email_confirmed_at: string
          full_name: string
          id: string
          phone: string
        }[]
      }
      get_app_setting: { Args: { setting_key: string }; Returns: string }
      get_customer_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          email_confirmed_at: string
          full_name: string
          id: string
          phone: string
        }[]
      }
      get_employee_permissions: {
        Args: { _store_id: string; _user_id: string }
        Returns: Json
      }
      get_store_owner_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          email_confirmed_at: string
          full_name: string
          id: string
          phone: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      is_store_employee: {
        Args: { _store_id: string; _user_id: string }
        Returns: boolean
      }
      notify_order_whatsapp_internal: {
        Args: { order_data: Record<string, unknown> }
        Returns: undefined
      }
      text_to_bytea: { Args: { data: string }; Returns: string }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      validate_coupon: {
        Args: { p_code: string; p_order_total: number; p_store_id: string }
        Returns: {
          discount_amount: number
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          error_message: string
          is_valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "customer" | "store_owner" | "admin"
      discount_type: "percentage" | "fixed"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "in_delivery"
        | "delivered"
        | "cancelled"
      store_status: "pending_approval" | "active" | "inactive" | "rejected"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
      app_role: ["customer", "store_owner", "admin"],
      discount_type: ["percentage", "fixed"],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "in_delivery",
        "delivered",
        "cancelled",
      ],
      store_status: ["pending_approval", "active", "inactive", "rejected"],
    },
  },
} as const
