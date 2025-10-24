
export type AppStatus = 'idle' | 'processing' | 'success' | 'error';

export interface SkillSourceData {
    skillMdContent: string;
    referencedFiles: {
        [filename: string]: string;
    };
}
