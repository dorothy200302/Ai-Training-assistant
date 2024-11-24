import React from 'react';
export interface UserInfo {
    email?: string;
    avatar?: string;
    token: string;
    id: number | string;
}
export declare const UserContext: React.Context<{
    user: UserInfo | null;
    setUser: (user: UserInfo | null) => void;
}>;
export declare const UserProvider: React.FC<{
    children: React.ReactNode;
}>;
export declare const useUser: () => {
    user: UserInfo | null;
    setUser: (user: UserInfo | null) => void;
};
