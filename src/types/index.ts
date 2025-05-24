export interface Point {
  id: string;
  x: number;
  y: number;
  title: string;
  description?: string;
}

export interface Cat {
  id: string;
  name: string;
  alt_name?: string;
  description?: string;
  thumbnailUrl: string;
  dwelling?: string;
  prev_dwelling?: string;
  date_of_birth?: string;
  sex?: string;
  status?: string;
  character?: string;
  sickness?: string;
}