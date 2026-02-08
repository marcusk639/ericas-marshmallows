import { MoodType } from './firestore';
export declare const COUPLE_CONFIG: {
    readonly coupleId: "marcus-erica";
    readonly members: {
        readonly 'marcusk639@gmail.com': {
            readonly name: "Marcus";
            readonly role: "partner1";
        };
        readonly 'ericajure@gmail.com': {
            readonly name: "Erica";
            readonly role: "partner2";
        };
    };
};
export interface MoodOption {
    type: MoodType;
    emoji: string;
    label: string;
}
export declare const MOOD_OPTIONS: MoodOption[];
export declare const DEFAULT_QUICK_PICKS: ({
    message: string;
    emoji: string;
    category: "sweet";
} | {
    message: string;
    emoji: string;
    category: "loving";
} | {
    message: string;
    emoji: string;
    category: "playful";
})[];
