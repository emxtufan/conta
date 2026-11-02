import { ManualEntry } from './data/sagaManualData';

export type { ManualEntry };

export type LevelFilter = 'all' | 1 | 2 | 3 | 'bookmarked';

export interface UserNote {
  entryId: string;
  note: string;
  updatedAt: string;
}
