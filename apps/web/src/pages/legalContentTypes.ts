export type LetterItem = {
  mark: string;
  text: string;
  sub?: { mark: string; text: string }[];
};

export type ContentBlock =
  | { type: 'updated'; text: string }
  | { type: 'p'; text: string }
  | { type: 'section'; title: string }
  | {
      type: 'sub';
      id: string;
      text: string;
      letters?: LetterItem[];
    }
  | { type: 'clause'; n: number; text: string; bullets?: string[] }
  | { type: 'bullets'; items: string[] }
  | { type: 'letters'; items: LetterItem[] }
  | {
      type: 'table';
      headers: string[];
      rows: string[][];
    }
  | { type: 'acceptance'; text: string };
