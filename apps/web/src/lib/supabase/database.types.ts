export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string;
          code: string;
          name: string;
          property_type: "residential" | "commercial" | "mixed_use" | "hospitality";
          status: "active" | "inactive" | "archived";
          address_line_1: string;
          address_line_2: string | null;
          city: string;
          state_region: string | null;
          country: string;
          postal_code: string | null;
          timezone: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["properties"]["Row"]> & {
          code: string;
          name: string;
          property_type: Database["public"]["Tables"]["properties"]["Row"]["property_type"];
          address_line_1: string;
          city: string;
          country: string;
        };
        Update: Partial<Database["public"]["Tables"]["properties"]["Row"]>;
      };
      buildings: {
        Row: {
          id: string;
          property_id: string;
          code: string;
          name: string;
          status: "active" | "inactive" | "archived";
          number_of_floors: number | null;
          manager_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["buildings"]["Row"]> & {
          property_id: string;
          code: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["buildings"]["Row"]>;
      };
      floors: {
        Row: {
          id: string;
          building_id: string;
          floor_number: number;
          name: string | null;
          status: "active" | "partial" | "closed";
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["floors"]["Row"]> & {
          building_id: string;
          floor_number: number;
        };
        Update: Partial<Database["public"]["Tables"]["floors"]["Row"]>;
      };
      units: {
        Row: {
          id: string;
          building_id: string;
          floor_id: string;
          category_id: string | null;
          code: string;
          name: string | null;
          unit_type: string;
          occupancy_mode: "residential" | "commercial" | "short_term" | "hybrid";
          status: "available" | "occupied" | "reserved" | "maintenance" | "inactive";
          availability: "immediate" | "in_7_days" | "in_30_days" | "unavailable";
          bedrooms: number | null;
          bathrooms: number | null;
          area_sqm: number | null;
          base_rate: number | null;
          cleaning_status: "clean" | "dirty" | "cleaning_in_progress" | "inspected";
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["units"]["Row"]> & {
          building_id: string;
          floor_id: string;
          code: string;
          occupancy_mode: Database["public"]["Tables"]["units"]["Row"]["occupancy_mode"];
        };
        Update: Partial<Database["public"]["Tables"]["units"]["Row"]>;
      };
      unit_categories: {
        Row: {
          id: string;
          name: string;
          occupancy_mode: "residential" | "commercial" | "short_term";
          base_rate: number;
          description: string | null;
          status: "active" | "draft";
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["unit_categories"]["Row"]> & {
          name: string;
          occupancy_mode: Database["public"]["Tables"]["unit_categories"]["Row"]["occupancy_mode"];
        };
        Update: Partial<Database["public"]["Tables"]["unit_categories"]["Row"]>;
      };
      amenities: {
        Row: {
          id: string;
          name: string;
          scope: "building" | "unit" | "shared";
          status: "active" | "hidden";
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["amenities"]["Row"]> & {
          name: string;
          scope: Database["public"]["Tables"]["amenities"]["Row"]["scope"];
        };
        Update: Partial<Database["public"]["Tables"]["amenities"]["Row"]>;
      };
      media_assets: {
        Row: {
          id: string;
          title: string;
          building_id: string | null;
          unit_id: string | null;
          category: "exterior" | "interior" | "amenity" | "floor_plan";
          status: "published" | "draft";
          url: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["media_assets"]["Row"]> & {
          title: string;
          category: Database["public"]["Tables"]["media_assets"]["Row"]["category"];
          url: string;
        };
        Update: Partial<Database["public"]["Tables"]["media_assets"]["Row"]>;
      };
      tenants: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["tenants"]["Row"]> & {
          first_name: string;
          last_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["tenants"]["Row"]>;
      };
      businesses: {
        Row: {
          id: string;
          legal_name: string;
          trade_name: string | null;
          email: string | null;
          phone: string | null;
          contact_person: string | null;
          business_category: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["businesses"]["Row"]> & {
          legal_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["businesses"]["Row"]>;
      };
      guests: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["guests"]["Row"]> & {
          first_name: string;
          last_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["guests"]["Row"]>;
      };
      leases: {
        Row: {
          id: string;
          lease_number: string;
          unit_id: string;
          lease_type: "residential" | "commercial";
          business_id: string | null;
          status: string;
          start_date: string;
          end_date: string;
          currency_code: string;
          deposit_amount: number;
          rent_amount: number;
          billing_frequency: string;
          contract_duration: string | null;
          lease_agreement: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["leases"]["Row"]> & {
          lease_number: string;
          unit_id: string;
          lease_type: "residential" | "commercial";
          start_date: string;
          end_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["leases"]["Row"]>;
      };
      reservations: {
        Row: {
          id: string;
          reservation_number: string;
          unit_id: string;
          guest_id: string;
          status: string;
          check_in_date: string;
          check_out_date: string;
          adults_count: number;
          children_count: number;
          currency_code: string;
          base_amount: number;
          total_amount: number;
          cleaning_status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["reservations"]["Row"]> & {
          reservation_number: string;
          unit_id: string;
          guest_id: string;
          check_in_date: string;
          check_out_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["reservations"]["Row"]>;
      };
      maintenance_requests: {
        Row: {
          id: string;
          request_number: string;
          title: string;
          status: string;
          priority: string;
          property_id: string | null;
          building_id: string | null;
          unit_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["maintenance_requests"]["Row"]> & {
          request_number: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["maintenance_requests"]["Row"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};