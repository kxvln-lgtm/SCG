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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      access_audit_log: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          new_department: string | null
          new_region: string | null
          new_role: string | null
          old_department: string | null
          old_region: string | null
          old_role: string | null
          target_user_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          new_department?: string | null
          new_region?: string | null
          new_role?: string | null
          old_department?: string | null
          old_region?: string | null
          old_role?: string | null
          target_user_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          new_department?: string | null
          new_region?: string | null
          new_role?: string | null
          old_department?: string | null
          old_region?: string | null
          old_role?: string | null
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_audit_log_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          department: string | null
          id: string
          project_id: string | null
          region: string | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          id?: string
          project_id?: string | null
          region?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          id?: string
          project_id?: string | null
          region?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_number: string
          hours: number | null
          id: string
          issued_at: string
          project_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          certificate_number: string
          hours?: number | null
          id?: string
          issued_at?: string
          project_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          certificate_number?: string
          hours?: number | null
          id?: string
          issued_at?: string
          project_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          department: string | null
          description: string | null
          id: string
          name: string
          region: string | null
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          id?: string
          name: string
          region?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          id?: string
          name?: string
          region?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "communities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          responded_at: string | null
          sender_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          responded_at?: string | null
          sender_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          responded_at?: string | null
          sender_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_requests_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          media_url: string | null
          title: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          author_id: string
          body?: string
          created_at?: string
          id?: string
          media_url?: string | null
          title?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          media_url?: string | null
          title?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          about: string | null
          announcement_notifications_enabled: boolean
          avatar_url: string | null
          badge_revoked_at: string | null
          bio: string | null
          birth_date: string | null
          city: string | null
          consent_accepted_at: string | null
          contact: string | null
          created_at: string
          department: string | null
          department_id: string | null
          direction: string | null
          division: string | null
          education: string | null
          email_announcements_enabled: boolean
          email_posts_enabled: boolean
          email_projects_enabled: boolean
          email_support_enabled: boolean
          experience: string | null
          first_name: string
          id: string
          id_back_url: string | null
          id_front_url: string | null
          identity_consent_at: string | null
          identity_consent_version: string | null
          iin: string | null
          language: string
          last_name: string
          personnel_id: string | null
          phone: string | null
          phone_verified: boolean
          phone_verified_at: string | null
          phone_verified_via: string | null
          photo_urls: string[] | null
          project_notifications_enabled: boolean
          region: string | null
          region_id: string | null
          role: string
          scd_id: string | null
          source_age: number | null
          source_hours: number | null
          source_position: string | null
          status: string
          telegram_id: number | null
          telegram_notifications_enabled: boolean
          telegram_username: string | null
          theme: string
          updated_at: string
          username: string | null
        }
        Insert: {
          about?: string | null
          announcement_notifications_enabled?: boolean
          avatar_url?: string | null
          badge_revoked_at?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          consent_accepted_at?: string | null
          contact?: string | null
          created_at?: string
          department?: string | null
          department_id?: string | null
          direction?: string | null
          division?: string | null
          education?: string | null
          email_announcements_enabled?: boolean
          email_posts_enabled?: boolean
          email_projects_enabled?: boolean
          email_support_enabled?: boolean
          experience?: string | null
          first_name?: string
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          identity_consent_at?: string | null
          identity_consent_version?: string | null
          iin?: string | null
          language?: string
          last_name?: string
          personnel_id?: string | null
          phone?: string | null
          phone_verified?: boolean
          phone_verified_at?: string | null
          phone_verified_via?: string | null
          photo_urls?: string[] | null
          project_notifications_enabled?: boolean
          region?: string | null
          region_id?: string | null
          role?: string
          scd_id?: string | null
          source_age?: number | null
          source_hours?: number | null
          source_position?: string | null
          status?: string
          telegram_id?: number | null
          telegram_notifications_enabled?: boolean
          telegram_username?: string | null
          theme?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          about?: string | null
          announcement_notifications_enabled?: boolean
          avatar_url?: string | null
          badge_revoked_at?: string | null
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          consent_accepted_at?: string | null
          contact?: string | null
          created_at?: string
          department?: string | null
          department_id?: string | null
          direction?: string | null
          division?: string | null
          education?: string | null
          email_announcements_enabled?: boolean
          email_posts_enabled?: boolean
          email_projects_enabled?: boolean
          email_support_enabled?: boolean
          experience?: string | null
          first_name?: string
          id?: string
          id_back_url?: string | null
          id_front_url?: string | null
          identity_consent_at?: string | null
          identity_consent_version?: string | null
          iin?: string | null
          language?: string
          last_name?: string
          personnel_id?: string | null
          phone?: string | null
          phone_verified?: boolean
          phone_verified_at?: string | null
          phone_verified_via?: string | null
          photo_urls?: string[] | null
          project_notifications_enabled?: boolean
          region?: string | null
          region_id?: string | null
          role?: string
          scd_id?: string | null
          source_age?: number | null
          source_hours?: number | null
          source_position?: string | null
          status?: string
          telegram_id?: number | null
          telegram_notifications_enabled?: boolean
          telegram_username?: string | null
          theme?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      project_applications: {
        Row: {
          created_at: string
          id: string
          project_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_assignments: {
        Row: {
          checked_in_at: string | null
          checked_out_at: string | null
          created_at: string
          id: string
          notes: string | null
          project_id: string
          status: string
          team_role: string | null
          user_id: string
        }
        Insert: {
          checked_in_at?: string | null
          checked_out_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          project_id: string
          status?: string
          team_role?: string | null
          user_id: string
        }
        Update: {
          checked_in_at?: string | null
          checked_out_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          project_id?: string
          status?: string
          team_role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          age_max: number | null
          age_min: number | null
          application_deadline: string | null
          contact_name: string | null
          contact_phone: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          department: string | null
          description: string | null
          dress_code: string | null
          end_time: string | null
          event_date: string | null
          id: string
          location: string | null
          map_url: string | null
          region: string | null
          schedule: string | null
          start_time: string | null
          status: string
          telegram_notified_at: string | null
          title: string
          updated_at: string
          volunteers_required: number | null
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          application_deadline?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          dress_code?: string | null
          end_time?: string | null
          event_date?: string | null
          id?: string
          location?: string | null
          map_url?: string | null
          region?: string | null
          schedule?: string | null
          start_time?: string | null
          status?: string
          telegram_notified_at?: string | null
          title: string
          updated_at?: string
          volunteers_required?: number | null
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          application_deadline?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          dress_code?: string | null
          end_time?: string | null
          event_date?: string | null
          id?: string
          location?: string | null
          map_url?: string | null
          region?: string | null
          schedule?: string | null
          start_time?: string | null
          status?: string
          telegram_notified_at?: string | null
          title?: string
          updated_at?: string
          volunteers_required?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      scg_content_drafts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          planned_at: string | null
          post_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body?: string
          created_at?: string
          id?: string
          planned_at?: string | null
          post_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          planned_at?: string | null
          post_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scg_content_drafts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scg_content_drafts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      scg_document_acknowledgements: {
        Row: {
          acknowledged_at: string
          document_slug: string
          document_version: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string
          document_slug: string
          document_version: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string
          document_slug?: string
          document_version?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scg_document_acknowledgements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scg_email_outbox: {
        Row: {
          attempts: number
          available_at: string
          claimed_at: string | null
          created_at: string
          dedupe_key: string | null
          id: string
          kind: string
          last_error: string | null
          payload: Json
          sent_at: string | null
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          attempts?: number
          available_at?: string
          claimed_at?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          kind: string
          last_error?: string | null
          payload: Json
          sent_at?: string | null
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          attempts?: number
          available_at?: string
          claimed_at?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          kind?: string
          last_error?: string | null
          payload?: Json
          sent_at?: string | null
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scg_email_outbox_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scg_support_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scg_support_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scg_support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "scg_support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      scg_support_tickets: {
        Row: {
          category: string
          created_at: string
          id: string
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scg_support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_gateway_verifications: {
        Row: {
          attempts: number
          created_at: string
          error: string | null
          expires_at: string
          id: string
          phone_number: string
          remaining_balance: number | null
          request_cost: number | null
          request_id: string
          status: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          error?: string | null
          expires_at: string
          id?: string
          phone_number: string
          remaining_balance?: number | null
          request_cost?: number | null
          request_id: string
          status?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          error?: string | null
          expires_at?: string
          id?: string
          phone_number?: string
          remaining_balance?: number | null
          request_cost?: number | null
          request_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      telegram_notification_log: {
        Row: {
          error: string | null
          id: string
          project_id: string | null
          sent_at: string
          status: string
          telegram_id: number
        }
        Insert: {
          error?: string | null
          id?: string
          project_id?: string | null
          sent_at?: string
          status?: string
          telegram_id: number
        }
        Update: {
          error?: string | null
          id?: string
          project_id?: string | null
          sent_at?: string
          status?: string
          telegram_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "telegram_notification_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_registration_sessions: {
        Row: {
          chat_id: number | null
          created_at: string
          data: Json
          expires_at: string | null
          step: string
          telegram_id: number
          updated_at: string
        }
        Insert: {
          chat_id?: number | null
          created_at?: string
          data?: Json
          expires_at?: string | null
          step?: string
          telegram_id: number
          updated_at?: string
        }
        Update: {
          chat_id?: number | null
          created_at?: string
          data?: Json
          expires_at?: string | null
          step?: string
          telegram_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      volunteer_hours: {
        Row: {
          assignment_id: string | null
          created_at: string
          created_by: string | null
          hours: number
          id: string
          notes: string | null
          project_id: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          assignment_id?: string | null
          created_at?: string
          created_by?: string | null
          hours: number
          id?: string
          notes?: string | null
          project_id?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          assignment_id?: string | null
          created_at?: string
          created_by?: string | null
          hours?: number
          id?: string
          notes?: string | null
          project_id?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_hours_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "project_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_hours_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_hours_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_hours_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_telegram_registration_sessions: {
        Args: never
        Returns: undefined
      }
      command_center_application_action: {
        Args: {
          p_action: string
          p_application_id: string
          p_team_role?: string
        }
        Returns: Json
      }
      command_center_delete_project: {
        Args: { p_project_id: string }
        Returns: Json
      }
      command_center_members: {
        Args: { p_query?: string }
        Returns: {
          city: string
          created_at: string
          department: string
          division: string
          first_name: string
          id: string
          last_name: string
          phone: string
          region: string
          role: string
          scd_id: string
          status: string
          telegram_id: number
          telegram_username: string
          username: string
        }[]
      }
      command_center_review_application: {
        Args: { p_application_id: string; p_status: string }
        Returns: {
          created_at: string
          id: string
          project_id: string
          status: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "project_applications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      command_center_search_members: {
        Args: { q: string }
        Returns: {
          city: string
          department: string
          division: string
          first_name: string
          id: string
          last_name: string
          phone: string
          region: string
          role: string
          scd_id: string
          status: string
        }[]
      }
      command_center_set_role: {
        Args: { new_role: string; target_user_id: string }
        Returns: {
          about: string | null
          announcement_notifications_enabled: boolean
          avatar_url: string | null
          badge_revoked_at: string | null
          bio: string | null
          birth_date: string | null
          city: string | null
          consent_accepted_at: string | null
          contact: string | null
          created_at: string
          department: string | null
          department_id: string | null
          direction: string | null
          division: string | null
          education: string | null
          email_announcements_enabled: boolean
          email_posts_enabled: boolean
          email_projects_enabled: boolean
          email_support_enabled: boolean
          experience: string | null
          first_name: string
          id: string
          id_back_url: string | null
          id_front_url: string | null
          identity_consent_at: string | null
          identity_consent_version: string | null
          iin: string | null
          language: string
          last_name: string
          personnel_id: string | null
          phone: string | null
          phone_verified: boolean
          phone_verified_at: string | null
          phone_verified_via: string | null
          photo_urls: string[] | null
          project_notifications_enabled: boolean
          region: string | null
          region_id: string | null
          role: string
          scd_id: string | null
          source_age: number | null
          source_hours: number | null
          source_position: string | null
          status: string
          telegram_id: number | null
          telegram_notifications_enabled: boolean
          telegram_username: string | null
          theme: string
          updated_at: string
          username: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      command_center_update_member_access: {
        Args: {
          p_department: string
          p_region?: string
          p_role: string
          p_target: string
        }
        Returns: boolean
      }
      get_direct_messages: {
        Args: { p_limit?: number; p_other_user_id: string }
        Returns: {
          body: string
          created_at: string
          id: string
          read_at: string
          recipient_id: string
          sender_id: string
        }[]
      }
      get_friend_info: {
        Args: { p_target_user_id: string }
        Returns: {
          friend_count: number
          friend_status: string
          request_id: string
        }[]
      }
      get_hub_stats: {
        Args: never
        Returns: {
          members_count: number
          pending_applications_count: number
          projects_count: number
        }[]
      }
      get_member_directory: {
        Args: never
        Returns: {
          city: string
          department: string
          division: string
          first_name: string
          id: string
          last_name: string
          region: string
          role: string
          scd_id: string
        }[]
      }
      get_message_threads: {
        Args: never
        Returns: {
          last_body: string
          last_created_at: string
          other_avatar_url: string
          other_name: string
          other_user_id: string
          other_username: string
          unread_count: number
        }[]
      }
      get_pending_project_applications: {
        Args: never
        Returns: {
          created_at: string
          department: string
          first_name: string
          id: string
          last_name: string
          project_id: string
          project_title: string
          region: string
          scd_id: string
          status: string
          user_id: string
        }[]
      }
      get_public_feed: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          author_id: string
          author_name: string
          avatar_url: string
          body: string
          created_at: string
          follower_count: number
          id: string
          like_count: number
          liked_by_me: boolean
          media_url: string
          role: string
          username: string
        }[]
      }
      get_public_profile: {
        Args: { p_user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          city: string
          department: string
          first_name: string
          friend_count: number
          friend_status: string
          id: string
          last_name: string
          posts_count: number
          region: string
          request_id: string
          role: string
          scd_id: string
          username: string
          volunteer_hours: number
        }[]
      }
      get_social_stats: {
        Args: { p_user_id?: string }
        Returns: {
          followers_count: number
          following_count: number
          likes_received: number
          posts_count: number
          volunteer_hours: number
        }[]
      }
      is_admin_user: { Args: { uid: string }; Returns: boolean }
      is_system_admin: { Args: { uid: string }; Returns: boolean }
      issue_own_certificate: {
        Args: { p_project_id: string }
        Returns: {
          certificate_number: string
          hours: number | null
          id: string
          issued_at: string
          project_id: string
          role: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "certificates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      link_telegram_profile: {
        Args: {
          p_scd_id: string
          p_telegram_id: number
          p_telegram_username?: string
        }
        Returns: {
          about: string | null
          announcement_notifications_enabled: boolean
          avatar_url: string | null
          badge_revoked_at: string | null
          bio: string | null
          birth_date: string | null
          city: string | null
          consent_accepted_at: string | null
          contact: string | null
          created_at: string
          department: string | null
          department_id: string | null
          direction: string | null
          division: string | null
          education: string | null
          email_announcements_enabled: boolean
          email_posts_enabled: boolean
          email_projects_enabled: boolean
          email_support_enabled: boolean
          experience: string | null
          first_name: string
          id: string
          id_back_url: string | null
          id_front_url: string | null
          identity_consent_at: string | null
          identity_consent_version: string | null
          iin: string | null
          language: string
          last_name: string
          personnel_id: string | null
          phone: string | null
          phone_verified: boolean
          phone_verified_at: string | null
          phone_verified_via: string | null
          photo_urls: string[] | null
          project_notifications_enabled: boolean
          region: string | null
          region_id: string | null
          role: string
          scd_id: string | null
          source_age: number | null
          source_hours: number | null
          source_position: string | null
          status: string
          telegram_id: number | null
          telegram_notifications_enabled: boolean
          telegram_username: string | null
          theme: string
          updated_at: string
          username: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      make_scd_id: {
        Args: { p_birth_date: string; p_user_id: string }
        Returns: string
      }
      mark_messages_read: {
        Args: { p_other_user_id: string }
        Returns: undefined
      }
      mark_project_telegram_notified: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      remove_friend: { Args: { p_target_user_id: string }; Returns: boolean }
      resolve_scd_for_checkin: {
        Args: { p_scd: string }
        Returns: {
          department: string
          first_name: string
          id: string
          last_name: string
          region: string
          scd_id: string
        }[]
      }
      respond_friend_request: {
        Args: { p_accept: boolean; p_request_id: string }
        Returns: string
      }
      scg_admin_overview: { Args: never; Returns: Json }
      scg_ai_allowed: { Args: never; Returns: boolean }
      scg_ai_budget: { Args: { p_user: string }; Returns: undefined }
      scg_apply_project: { Args: { p_project: string }; Returns: string }
      scg_badge_public: {
        Args: { p_personnel_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          personnel_id: string
          role: string
          status: string
        }[]
      }
      scg_cancel_application: {
        Args: { p_application: string }
        Returns: boolean
      }
      scg_cc_appoint: {
        Args: {
          p_ends_at?: string
          p_member: string
          p_position: string
          p_reason: string
        }
        Returns: string
      }
      scg_cc_context: { Args: never; Returns: Json }
      scg_cc_dashboard: { Args: never; Returns: Json }
      scg_cc_revoke: {
        Args: { p_appointment: string; p_reason: string }
        Returns: boolean
      }
      scg_change_member_access: {
        Args: {
          p_department: string
          p_member: string
          p_region: string
          p_role: string
          p_status: string
        }
        Returns: boolean
      }
      scg_checkin: {
        Args: { p_mode: string; p_project: string; p_scd: string }
        Returns: Json
      }
      scg_claim_email_batch: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          available_at: string
          claimed_at: string | null
          created_at: string
          dedupe_key: string | null
          id: string
          kind: string
          last_error: string | null
          payload: Json
          sent_at: string | null
          status: string
          subject: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "scg_email_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      scg_consume_mail_invocation: {
        Args: { p_token: string }
        Returns: boolean
      }
      scg_create_post: { Args: { p_body: string }; Returns: string }
      scg_create_ticket: {
        Args: { p_body: string; p_category: string; p_subject: string }
        Returns: string
      }
      scg_manage_physical_badge: {
        Args: {
          p_action: string
          p_code: string
          p_expected_user?: string
          p_personnel_id?: string
        }
        Returns: boolean
      }
      scg_news_public: {
        Args: { p_id?: string; p_limit?: number; p_offset?: number }
        Returns: {
          body: string
          id: string
          media_url: string
          published_at: string
          title: string
        }[]
      }
      scg_notify_allowed: {
        Args: { p_id: string; p_kind: string }
        Returns: boolean
      }
      scg_physical_badge_public: { Args: { p_token: string }; Returns: Json }
      scg_project_team: {
        Args: { p_project: string }
        Returns: {
          assignment_id: string
          checked_in_at: string
          checked_out_at: string
          member_name: string
          scd_id: string
          status: string
          team_role: string
        }[]
      }
      scg_public_projects: {
        Args: never
        Returns: {
          application_deadline: string
          cover_url: string
          department: string
          description: string
          dress_code: string
          end_time: string
          event_date: string
          id: string
          location: string
          map_url: string
          region: string
          schedule: string
          start_time: string
          status: string
          title: string
          volunteers_required: number
        }[]
      }
      scg_publish_draft: { Args: { p_draft: string }; Returns: string }
      scg_reply_ticket: {
        Args: { p_body: string; p_status?: string; p_ticket: string }
        Returns: string
      }
      scg_set_badge_revoked: {
        Args: { p_revoked: boolean; p_user: string }
        Returns: boolean
      }
      scg_telegram_apply: {
        Args: { p_project: string; p_user: string }
        Returns: string
      }
      scg_telegram_attendance: {
        Args: { p_assignment: string; p_mode: string; p_user: string }
        Returns: boolean
      }
      scg_verify_badge: {
        Args: { p_code: string; p_project?: string }
        Returns: Json
      }
      search_member_directory: {
        Args: { q: string }
        Returns: {
          department: string
          first_name: string
          id: string
          last_name: string
          region: string
          role: string
          scd_id: string
        }[]
      }
      search_public_profiles: {
        Args: { p_query?: string }
        Returns: {
          avatar_url: string
          bio: string
          city: string
          department: string
          first_name: string
          friend_count: number
          friend_status: string
          id: string
          last_name: string
          posts_count: number
          region: string
          request_id: string
          role: string
          scd_id: string
          username: string
          volunteer_hours: number
        }[]
      }
      send_friend_request: {
        Args: { p_target_user_id: string }
        Returns: string
      }
      toggle_follow: { Args: { p_target_user_id: string }; Returns: boolean }
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
    Enums: {},
  },
} as const
