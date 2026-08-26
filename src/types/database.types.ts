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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          description: string | null
          difficulty_level: string | null
          duration_minutes: number | null
          exclusions: string | null
          featured_image_asset_id: string | null
          highlights: string | null
          id: string
          inclusions: string | null
          is_featured: boolean
          maximum_age: number | null
          maximum_weight_kg: number | null
          medical_restrictions: string | null
          minimum_age: number | null
          minimum_weight_kg: number | null
          name: string
          safety_information: string | null
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          slug: string
          status: string
          updated_at: string
          updated_by: string | null
          what_to_carry: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          exclusions?: string | null
          featured_image_asset_id?: string | null
          highlights?: string | null
          id?: string
          inclusions?: string | null
          is_featured?: boolean
          maximum_age?: number | null
          maximum_weight_kg?: number | null
          medical_restrictions?: string | null
          minimum_age?: number | null
          minimum_weight_kg?: number | null
          name: string
          safety_information?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          what_to_carry?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          exclusions?: string | null
          featured_image_asset_id?: string | null
          highlights?: string | null
          id?: string
          inclusions?: string | null
          is_featured?: boolean
          maximum_age?: number | null
          maximum_weight_kg?: number | null
          medical_restrictions?: string | null
          minimum_age?: number | null
          minimum_weight_kg?: number | null
          name?: string
          safety_information?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          what_to_carry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "activity_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_featured_image_asset_id_fkey"
            columns: ["featured_image_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_charges: {
        Row: {
          activity_offering_id: string
          activity_variant_id: string | null
          amount_paise: number
          calculation_type: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          mandatory: boolean
          name: string
          status: string
          taxable: boolean
          updated_at: string
        }
        Insert: {
          activity_offering_id: string
          activity_variant_id?: string | null
          amount_paise: number
          calculation_type: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          mandatory?: boolean
          name: string
          status?: string
          taxable?: boolean
          updated_at?: string
        }
        Update: {
          activity_offering_id?: string
          activity_variant_id?: string | null
          amount_paise?: number
          calculation_type?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          mandatory?: boolean
          name?: string
          status?: string
          taxable?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_charges_activity_offering_id_fkey"
            columns: ["activity_offering_id"]
            isOneToOne: false
            referencedRelation: "activity_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_charges_variant_scope_fkey"
            columns: ["activity_variant_id", "activity_offering_id"]
            isOneToOne: false
            referencedRelation: "activity_variants"
            referencedColumns: ["id", "activity_offering_id"]
          },
        ]
      }
      activity_faqs: {
        Row: {
          activity_id: string
          answer: string
          created_at: string
          display_order: number
          id: string
          question: string
          status: string
          updated_at: string
        }
        Insert: {
          activity_id: string
          answer: string
          created_at?: string
          display_order?: number
          id?: string
          question: string
          status?: string
          updated_at?: string
        }
        Update: {
          activity_id?: string
          answer?: string
          created_at?: string
          display_order?: number
          id?: string
          question?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_faqs_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_media: {
        Row: {
          activity_id: string
          alt_text: string | null
          caption: string | null
          created_at: string
          display_order: number
          id: string
          media_asset_id: string
        }
        Insert: {
          activity_id: string
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          media_asset_id: string
        }
        Update: {
          activity_id?: string
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          media_asset_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_media_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_media_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_offerings: {
        Row: {
          activity_id: string
          advance_booking_hours: number
          base_price_paise: number
          created_at: string
          created_by: string | null
          currency: string
          duration_minutes: number | null
          id: string
          latitude: number | null
          location_id: string
          longitude: number | null
          maximum_participants_per_booking: number | null
          maximum_participants_per_unit: number | null
          maximum_units_per_booking: number | null
          meeting_point: string | null
          minimum_billable_participants: number
          minimum_participants: number
          pricing_model: string
          reporting_instructions: string | null
          status: string
          tax_included: boolean
          tax_rate_bps: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activity_id: string
          advance_booking_hours?: number
          base_price_paise?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          duration_minutes?: number | null
          id?: string
          latitude?: number | null
          location_id: string
          longitude?: number | null
          maximum_participants_per_booking?: number | null
          maximum_participants_per_unit?: number | null
          maximum_units_per_booking?: number | null
          meeting_point?: string | null
          minimum_billable_participants?: number
          minimum_participants?: number
          pricing_model: string
          reporting_instructions?: string | null
          status?: string
          tax_included?: boolean
          tax_rate_bps?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activity_id?: string
          advance_booking_hours?: number
          base_price_paise?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          duration_minutes?: number | null
          id?: string
          latitude?: number | null
          location_id?: string
          longitude?: number | null
          maximum_participants_per_booking?: number | null
          maximum_participants_per_unit?: number | null
          maximum_units_per_booking?: number | null
          meeting_point?: string | null
          minimum_billable_participants?: number
          minimum_participants?: number
          pricing_model?: string
          reporting_instructions?: string | null
          status?: string
          tax_included?: boolean
          tax_rate_bps?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_offerings_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_offerings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_participant_prices: {
        Row: {
          activity_offering_id: string
          activity_variant_id: string | null
          capacity_count: number
          created_at: string
          id: string
          maximum_age: number | null
          minimum_age: number | null
          participant_type: string
          price_paise: number
          status: string
          updated_at: string
        }
        Insert: {
          activity_offering_id: string
          activity_variant_id?: string | null
          capacity_count?: number
          created_at?: string
          id?: string
          maximum_age?: number | null
          minimum_age?: number | null
          participant_type: string
          price_paise: number
          status?: string
          updated_at?: string
        }
        Update: {
          activity_offering_id?: string
          activity_variant_id?: string | null
          capacity_count?: number
          created_at?: string
          id?: string
          maximum_age?: number | null
          minimum_age?: number | null
          participant_type?: string
          price_paise?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_participant_prices_activity_offering_id_fkey"
            columns: ["activity_offering_id"]
            isOneToOne: false
            referencedRelation: "activity_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_participant_prices_variant_scope_fkey"
            columns: ["activity_variant_id", "activity_offering_id"]
            isOneToOne: false
            referencedRelation: "activity_variants"
            referencedColumns: ["id", "activity_offering_id"]
          },
        ]
      }
      activity_slots: {
        Row: {
          activity_offering_id: string
          activity_variant_id: string | null
          capacity_override: number | null
          created_at: string
          end_time: string
          id: string
          name: string
          price_override_paise: number | null
          reporting_minutes_before: number
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          activity_offering_id: string
          activity_variant_id?: string | null
          capacity_override?: number | null
          created_at?: string
          end_time: string
          id?: string
          name: string
          price_override_paise?: number | null
          reporting_minutes_before?: number
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          activity_offering_id?: string
          activity_variant_id?: string | null
          capacity_override?: number | null
          created_at?: string
          end_time?: string
          id?: string
          name?: string
          price_override_paise?: number | null
          reporting_minutes_before?: number
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_slots_activity_offering_id_fkey"
            columns: ["activity_offering_id"]
            isOneToOne: false
            referencedRelation: "activity_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_slots_variant_scope_fkey"
            columns: ["activity_variant_id", "activity_offering_id"]
            isOneToOne: false
            referencedRelation: "activity_variants"
            referencedColumns: ["id", "activity_offering_id"]
          },
        ]
      }
      activity_variants: {
        Row: {
          activity_offering_id: string
          capacity_override: number | null
          created_at: string
          description: string | null
          display_order: number
          duration_override_minutes: number | null
          id: string
          name: string
          price_override_paise: number | null
          status: string
          updated_at: string
        }
        Insert: {
          activity_offering_id: string
          capacity_override?: number | null
          created_at?: string
          description?: string | null
          display_order?: number
          duration_override_minutes?: number | null
          id?: string
          name: string
          price_override_paise?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          activity_offering_id?: string
          capacity_override?: number | null
          created_at?: string
          description?: string | null
          display_order?: number
          duration_override_minutes?: number | null
          id?: string
          name?: string
          price_override_paise?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_variants_activity_offering_id_fkey"
            columns: ["activity_offering_id"]
            isOneToOne: false
            referencedRelation: "activity_offerings"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          metadata?: Json
        }
        Relationships: []
      }
      countries: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_asset_id: string | null
          image_url: string | null
          iso_code: string | null
          name: string
          phone_code: string | null
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_asset_id?: string | null
          image_url?: string | null
          iso_code?: string | null
          name: string
          phone_code?: string | null
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_asset_id?: string | null
          image_url?: string | null
          iso_code?: string | null
          name?: string
          phone_code?: string | null
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "countries_image_asset_id_fkey"
            columns: ["image_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      destinations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_asset_id: string | null
          image_url: string | null
          latitude: number | null
          longitude: number | null
          name: string
          region_id: string
          short_description: string | null
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_asset_id?: string | null
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          region_id: string
          short_description?: string | null
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_asset_id?: string | null
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          region_id?: string
          short_description?: string | null
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "destinations_image_asset_id_fkey"
            columns: ["image_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "destinations_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_amenities: {
        Row: {
          created_at: string
          display_order: number
          icon_key: string | null
          id: string
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          icon_key?: string | null
          id?: string
          name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          icon_key?: string | null
          id?: string
          name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      hotel_amenity_assignments: {
        Row: {
          amenity_id: string
          created_at: string
          hotel_id: string
        }
        Insert: {
          amenity_id: string
          created_at?: string
          hotel_id: string
        }
        Update: {
          amenity_id?: string
          created_at?: string
          hotel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_amenity_assignments_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "hotel_amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_amenity_assignments_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      hotel_media: {
        Row: {
          alt_text: string | null
          caption: string | null
          created_at: string
          display_order: number
          hotel_id: string
          id: string
          media_asset_id: string
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          display_order?: number
          hotel_id: string
          id?: string
          media_asset_id: string
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          display_order?: number
          hotel_id?: string
          id?: string
          media_asset_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_media_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_media_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_rate_cards: {
        Row: {
          base_room_rate_paise: number
          category_id: string
          child_pricing_policy: string
          child_with_bed_allowed: boolean
          child_with_bed_paise: number
          child_without_bed_allowed: boolean
          child_without_bed_paise: number
          created_at: string
          created_by: string | null
          currency: string
          extra_adult_bed_paise: number
          hotel_id: string | null
          id: string
          infant_sharing_paise: number
          location_id: string
          meal_plan: string
          notes: string | null
          room_id: string | null
          status: string
          tax_included: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          base_room_rate_paise: number
          category_id: string
          child_pricing_policy?: string
          child_with_bed_allowed?: boolean
          child_with_bed_paise?: number
          child_without_bed_allowed?: boolean
          child_without_bed_paise?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          extra_adult_bed_paise?: number
          hotel_id?: string | null
          id?: string
          infant_sharing_paise?: number
          location_id: string
          meal_plan?: string
          notes?: string | null
          room_id?: string | null
          status?: string
          tax_included?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          base_room_rate_paise?: number
          category_id?: string
          child_pricing_policy?: string
          child_with_bed_allowed?: boolean
          child_with_bed_paise?: number
          child_without_bed_allowed?: boolean
          child_without_bed_paise?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          extra_adult_bed_paise?: number
          hotel_id?: string | null
          id?: string
          infant_sharing_paise?: number
          location_id?: string
          meal_plan?: string
          notes?: string | null
          room_id?: string | null
          status?: string
          tax_included?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_rate_cards_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "hotel_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_rate_cards_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_rate_cards_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_rate_cards_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "hotel_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_room_media: {
        Row: {
          alt_text: string | null
          caption: string | null
          created_at: string
          display_order: number
          hotel_room_id: string
          id: string
          media_asset_id: string
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          display_order?: number
          hotel_room_id: string
          id?: string
          media_asset_id: string
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          display_order?: number
          hotel_room_id?: string
          id?: string
          media_asset_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_room_media_hotel_room_id_fkey"
            columns: ["hotel_room_id"]
            isOneToOne: false
            referencedRelation: "hotel_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_room_media_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_rooms: {
        Row: {
          base_adults: number
          bed_type: string | null
          category_id: string
          child_sharing_allowed: boolean
          created_at: string
          description: string | null
          display_order: number
          featured_image_asset_id: string | null
          hotel_id: string
          id: string
          infant_sharing_allowed: boolean
          inventory_count: number | null
          maximum_adults: number
          maximum_children: number
          maximum_extra_beds: number
          maximum_occupancy: number
          name: string
          room_size_sqft: number | null
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          base_adults?: number
          bed_type?: string | null
          category_id: string
          child_sharing_allowed?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          featured_image_asset_id?: string | null
          hotel_id: string
          id?: string
          infant_sharing_allowed?: boolean
          inventory_count?: number | null
          maximum_adults?: number
          maximum_children?: number
          maximum_extra_beds?: number
          maximum_occupancy?: number
          name: string
          room_size_sqft?: number | null
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          base_adults?: number
          bed_type?: string | null
          category_id?: string
          child_sharing_allowed?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          featured_image_asset_id?: string | null
          hotel_id?: string
          id?: string
          infant_sharing_allowed?: boolean
          inventory_count?: number | null
          maximum_adults?: number
          maximum_children?: number
          maximum_extra_beds?: number
          maximum_occupancy?: number
          name?: string
          room_size_sqft?: number | null
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_rooms_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "hotel_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_rooms_featured_image_asset_id_fkey"
            columns: ["featured_image_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_rooms_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          address: string | null
          check_in_time: string | null
          check_out_time: string | null
          created_at: string
          created_by: string | null
          description: string | null
          email: string | null
          featured_image_asset_id: string | null
          id: string
          is_featured: boolean
          latitude: number | null
          location_id: string
          longitude: number | null
          name: string
          phone: string | null
          policies: string | null
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          slug: string
          star_rating: number | null
          status: string
          updated_at: string
          updated_by: string | null
          website_url: string | null
        }
        Insert: {
          address?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          email?: string | null
          featured_image_asset_id?: string | null
          id?: string
          is_featured?: boolean
          latitude?: number | null
          location_id: string
          longitude?: number | null
          name: string
          phone?: string | null
          policies?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug: string
          star_rating?: number | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          website_url?: string | null
        }
        Update: {
          address?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          email?: string | null
          featured_image_asset_id?: string | null
          id?: string
          is_featured?: boolean
          latitude?: number | null
          location_id?: string
          longitude?: number | null
          name?: string
          phone?: string | null
          policies?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string
          star_rating?: number | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotels_featured_image_asset_id_fkey"
            columns: ["featured_image_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotels_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          created_at: string
          description: string | null
          destination_id: string
          id: string
          image_asset_id: string | null
          image_url: string | null
          latitude: number | null
          location_type: string
          longitude: number | null
          name: string
          parent_location_id: string | null
          short_description: string | null
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          description?: string | null
          destination_id: string
          id?: string
          image_asset_id?: string | null
          image_url?: string | null
          latitude?: number | null
          location_type?: string
          longitude?: number | null
          name: string
          parent_location_id?: string | null
          short_description?: string | null
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          description?: string | null
          destination_id?: string
          id?: string
          image_asset_id?: string | null
          image_url?: string | null
          latitude?: number | null
          location_type?: string
          longitude?: number | null
          name?: string
          parent_location_id?: string | null
          short_description?: string | null
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_image_asset_id_fkey"
            columns: ["image_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_parent_location_id_fkey"
            columns: ["parent_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      login_rate_limits: {
        Row: {
          blocked_until: string | null
          failure_count: number
          fingerprint: string
          updated_at: string
          window_started_at: string
        }
        Insert: {
          blocked_until?: string | null
          failure_count?: number
          fingerprint: string
          updated_at?: string
          window_started_at?: string
        }
        Update: {
          blocked_until?: string | null
          failure_count?: number
          fingerprint?: string
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          alt_text: string | null
          created_at: string
          file_name: string
          file_path: string
          folder: string
          height: number | null
          id: string
          imagekit_file_id: string
          is_public: boolean
          media_type: string
          metadata: Json
          mime_type: string
          original_file_name: string | null
          original_url: string
          size_bytes: number
          status: string
          tags: string[]
          updated_at: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          file_name: string
          file_path: string
          folder?: string
          height?: number | null
          id?: string
          imagekit_file_id: string
          is_public?: boolean
          media_type?: string
          metadata?: Json
          mime_type: string
          original_file_name?: string | null
          original_url: string
          size_bytes: number
          status?: string
          tags?: string[]
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          folder?: string
          height?: number | null
          id?: string
          imagekit_file_id?: string
          is_public?: boolean
          media_type?: string
          metadata?: Json
          mime_type?: string
          original_file_name?: string | null
          original_url?: string
          size_bytes?: number
          status?: string
          tags?: string[]
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          id: string
          module: string
          permission_key: string
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          id?: string
          module: string
          permission_key: string
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          id?: string
          module?: string
          permission_key?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          must_change_password: boolean
          phone: string | null
          role_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          must_change_password?: boolean
          phone?: string | null
          role_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          must_change_password?: boolean
          phone?: string | null
          role_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_role"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          country_id: string
          created_at: string
          description: string | null
          id: string
          image_asset_id: string | null
          image_url: string | null
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          country_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_asset_id?: string | null
          image_url?: string | null
          name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          country_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_asset_id?: string | null
          image_url?: string | null
          name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regions_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regions_image_asset_id_fkey"
            columns: ["image_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string | null
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string | null
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_profile_role_id: { Args: never; Returns: string }
      get_login_block_seconds: {
        Args: { p_fingerprint: string }
        Returns: number
      }
      has_permission: {
        Args: { required_permission: string }
        Returns: boolean
      }
      record_login_attempt: {
        Args: { p_fingerprint: string; p_succeeded: boolean }
        Returns: undefined
      }
      save_activity_with_gallery: {
        Args: {
          p_activity: Json
          p_activity_id: string
          p_gallery_asset_ids: string[]
        }
        Returns: string
      }
      save_hotel_room_with_gallery: {
        Args: { p_gallery_asset_ids: string[]; p_room: Json; p_room_id: string }
        Returns: string
      }
      save_hotel_with_gallery: {
        Args: {
          p_amenity_ids: string[]
          p_gallery_asset_ids: string[]
          p_hotel: Json
          p_hotel_id: string
        }
        Returns: string
      }
      save_permission_definition: {
        Args: {
          p_action: string
          p_actor_id: string
          p_description: string
          p_module: string
          p_permission_id: string
          p_permission_key: string
        }
        Returns: string
      }
      save_role_with_permissions: {
        Args: {
          p_actor_id: string
          p_description: string
          p_name: string
          p_permission_ids: string[]
          p_role_id: string
          p_slug: string
        }
        Returns: string
      }
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
