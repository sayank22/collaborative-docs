export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'owner' | 'editor' | 'viewer';

export type Database = {
  public: {
    Tables: {
      collaborators: {
        Row: {
          document_id: string;
          user_id: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          document_id: string;
          user_id: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          document_id?: string;
          user_id?: string;
          role?: UserRole;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'collaborators_document_id_fkey';
            columns: ['document_id'];
            isOneToOne: false;
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          },
        ];
      };
      documents: {
        Row: {
          id: string;
          title: string | null;
          content: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title?: string | null;
          content?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string | null;
          content?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      document_versions: {
        Row: {
          id: string;
          document_id: string;
          version_name: string;
          snapshot_data: string;
          snapshot_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          version_name: string;
          snapshot_data: string;
          snapshot_json?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          version_name?: string;
          snapshot_data?: string;
          snapshot_json?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'document_versions_document_id_fkey';
            columns: ['document_id'];
            isOneToOne: false;
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_document_collaborators: {
        Args: { doc_id: string };
        Returns: {
          user_id: string;
          email: string;
          role: UserRole;
          created_at: string;
        }[];
      };
      invite_collaborator: {
        Args: {
          doc_id: string;
          invitee_email: string;
          assign_role: 'editor' | 'viewer';
        };
        Returns: null;
      };
      remove_collaborator: {
        Args: {
          doc_id: string;
          target_user_id: string;
        };
        Returns: null;
      };
      update_collaborator_role: {
        Args: {
          doc_id: string;
          target_user_id: string;
          new_role: UserRole;
        };
        Returns: null;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
