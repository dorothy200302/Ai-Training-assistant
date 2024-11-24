interface User {
    id: number;
    email: string;
    username: string;
}
export declare function useAuth(): {
    token: string | null;
    user: User | null;
    setToken: (token: string) => void;
    setUser: (user: User) => void;
    logout: () => void;
};
export {};
