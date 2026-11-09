// Las tres piezas del archivador, igual que las tablas de supabase/01-resumenes.sql.
export interface Subject {
  id: string;
  name: string;
  color: string;
  position: number;
}

export interface Topic {
  id: string;
  subject_id: string;
  title: string;
  position: number;
  exam_date: string | null; // 'AAAA-MM-DD'
}

export interface Page {
  id: string;
  topic_id: string;
  title: string;
  content: string; // Markdown
  position: number;
  updated_at: string;
}
