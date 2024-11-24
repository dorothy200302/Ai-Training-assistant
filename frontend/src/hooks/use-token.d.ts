export declare function useToken(): string | null;
export declare function useToast(): {
    toast: (options: {
        title: string;
        description?: string;
        variant?: "default" | "destructive";
    }) => void;
};
