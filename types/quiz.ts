import { ImageSourcePropType } from 'react-native';

export type QuestionFormat = 
  | 'imageChoice' 
  | 'twoImageChoice'
  | 'imageTextChoice' 
  | 'singleImageChoice'
  | 'textChoice'
  | string;

export type QuizImageSource = ImageSourcePropType | string | null | undefined;

export interface CurriculumTrackDefinition {
  id: string;
  title: string;
  /**
   * Matches question.role. A track is a JSON-declared, app-agnostic
   * grouping of questions ("this is a differentiate-pairs track", "this
   * is an identify-a-sign track") — role is just an internal per-question
   * tag the curriculum author invents ("pair", "meaning", "whereUsed",
   * anything). One track can absorb several role values (e.g. a single
   * "Identify Signs" track covering role "name" + "meaning" + "whereUsed"),
   * which is why this accepts an array, not just a single string. The app
   * never hardcodes what any role value means — only the JSON's tracks
   * array decides how roles roll up into named, user-facing tracks.
   */
  filterRole?: string | string[];
  filterFormat?: QuestionFormat | QuestionFormat[];
  kind?: 'quiz' | 'reading' | 'full';
  image?: string;
}

export interface BaseQuestion {
  id: string;
  pairId?: string;
  topicId?: string;
  section?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | string;
  sequence?: number;
  role?: 'pair' | 'name' | 'meaning' | 'whereUsed' | string;
  format: QuestionFormat;
  question: string;
  correctAnswer: number; // 0-indexed
  explanation?: string;
  isFlagged?: boolean;
}

export interface ImageChoiceQuestion extends BaseQuestion {
  format: 'imageChoice' | 'twoImageChoice';
  images: QuizImageSource[];
  labels?: string[];
}

export interface SingleImageQuestion extends BaseQuestion {
  format: 'singleImageChoice' | 'imageTextChoice';
  image?: QuizImageSource;
  signRef?: string;
  answers: string[];
}

export interface TextChoiceQuestion extends BaseQuestion {
  format: 'textChoice';
  answers: string[];
}

export type QuizQuestion = BaseQuestion & {
  images?: QuizImageSource[];
  labels?: string[];
  answers?: string[];
  image?: QuizImageSource;
  signRef?: string;
};

export interface OptionChoice {
  id: number;
  label: string;
  text?: string;
  imageUrl?: QuizImageSource;
}

export interface SignCatalogEntry {
  signId: string;
  pairId: string;
  signRef: 'A' | 'B';
  name: string;
  signType: 'regulatory' | 'warning' | 'prohibitory' | 'informational' | 'mandatory' | string;
  meaning: string;
  whereUsed: string;
  explanation: string;
  memoryTip?: string;
  relatedSignIds?: string[];
  image?: QuizImageSource;
}
