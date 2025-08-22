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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      devices: {
        Row: {
          created_at: string | null
          device_id: string
          device_type: string
          id: string
          name: string
          owner_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          device_id: string
          device_type?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string
          device_type?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_admin: boolean
          name: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          is_admin?: boolean
          name?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean
          name?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string | null
        }
        Relationships: []
      }
      readings: {
        Row: {
          created_at: string | null
          device_id: string
          dew_point: number
          humidity: number
          id: string
          pressure: number
          temperature: number
          timestamp: string | null
        }
        Insert: {
          created_at?: string | null
          device_id: string
          dew_point: number
          humidity: number
          id?: string
          pressure: number
          temperature: number
          timestamp?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string
          dew_point?: number
          humidity?: number
          id?: string
          pressure?: number
          temperature?: number
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "readings_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      sensor_readings: {
        Row: {
          absolute_humidity: number | null
          acceleration_x: number | null
          acceleration_y: number | null
          acceleration_z: number | null
          altitude: number | null
          battery_health: number | null
          battery_percentage: number | null
          battery_voltage: number | null
          co2: number | null
          created_at: string
          device_id: string
          dew_point: number | null
          heat_index: number | null
          humidity: number | null
          id: string
          light_tsl2591: number | null
          light_veml7700: number | null
          par: number | null
          pressure: number | null
          shock_detected: boolean | null
          soil_capacitance: number | null
          soil_moisture_percentage: number | null
          temperature: number | null
          timestamp: string
          uv_index: number | null
          vpd: number | null
          weather_trend: string | null
          wet_bulb_temp: number | null
        }
        Insert: {
          absolute_humidity?: number | null
          acceleration_x?: number | null
          acceleration_y?: number | null
          acceleration_z?: number | null
          altitude?: number | null
          battery_health?: number | null
          battery_percentage?: number | null
          battery_voltage?: number | null
          co2?: number | null
          created_at?: string
          device_id: string
          dew_point?: number | null
          heat_index?: number | null
          humidity?: number | null
          id?: string
          light_tsl2591?: number | null
          light_veml7700?: number | null
          par?: number | null
          pressure?: number | null
          shock_detected?: boolean | null
          soil_capacitance?: number | null
          soil_moisture_percentage?: number | null
          temperature?: number | null
          timestamp?: string
          uv_index?: number | null
          vpd?: number | null
          weather_trend?: string | null
          wet_bulb_temp?: number | null
        }
        Update: {
          absolute_humidity?: number | null
          acceleration_x?: number | null
          acceleration_y?: number | null
          acceleration_z?: number | null
          altitude?: number | null
          battery_health?: number | null
          battery_percentage?: number | null
          battery_voltage?: number | null
          co2?: number | null
          created_at?: string
          device_id?: string
          dew_point?: number | null
          heat_index?: number | null
          humidity?: number | null
          id?: string
          light_tsl2591?: number | null
          light_veml7700?: number | null
          par?: number | null
          pressure?: number | null
          shock_detected?: boolean | null
          soil_capacitance?: number | null
          soil_moisture_percentage?: number | null
          temperature?: number | null
          timestamp?: string
          uv_index?: number | null
          vpd?: number | null
          weather_trend?: string | null
          wet_bulb_temp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sensor_readings_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      sensor_readings_effective: {
        Row: {
          absolute_humidity: number | null
          acceleration_x: number | null
          acceleration_y: number | null
          acceleration_z: number | null
          altitude: number | null
          battery_health: number | null
          battery_percentage: number | null
          battery_voltage: number | null
          co2: number | null
          created_at: string | null
          device_id: string | null
          dew_point: number | null
          heat_index: number | null
          humidity: number | null
          id: string | null
          light_tsl2591: number | null
          light_veml7700: number | null
          par: number | null
          pressure: number | null
          shock_detected: boolean | null
          soil_capacitance: number | null
          soil_moisture_percentage: number | null
          temperature: number | null
          timestamp: string | null
          vpd: number | null
          weather_trend: string | null
          wet_bulb_temp: number | null
        }
        Insert: {
          absolute_humidity?: never
          acceleration_x?: never
          acceleration_y?: never
          acceleration_z?: never
          altitude?: never
          battery_health?: never
          battery_percentage?: never
          battery_voltage?: never
          co2?: never
          created_at?: string | null
          device_id?: string | null
          dew_point?: never
          heat_index?: never
          humidity?: number | null
          id?: string | null
          light_tsl2591?: never
          light_veml7700?: never
          par?: never
          pressure?: number | null
          shock_detected?: never
          soil_capacitance?: never
          soil_moisture_percentage?: never
          temperature?: number | null
          timestamp?: string | null
          vpd?: never
          weather_trend?: never
          wet_bulb_temp?: never
        }
        Update: {
          absolute_humidity?: never
          acceleration_x?: never
          acceleration_y?: never
          acceleration_z?: never
          altitude?: never
          battery_health?: never
          battery_percentage?: never
          battery_voltage?: never
          co2?: never
          created_at?: string | null
          device_id?: string | null
          dew_point?: never
          heat_index?: never
          humidity?: number | null
          id?: string | null
          light_tsl2591?: never
          light_veml7700?: never
          par?: never
          pressure?: number | null
          shock_detected?: never
          soil_capacitance?: never
          soil_moisture_percentage?: never
          temperature?: number | null
          timestamp?: string | null
          vpd?: never
          weather_trend?: never
          wet_bulb_temp?: never
        }
        Relationships: [
          {
            foreignKeyName: "sensor_readings_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_premium: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      subscription_tier: "free" | "premium"
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
      app_role: ["admin", "user"],
      subscription_tier: ["free", "premium"],
    },
  },
} as const
