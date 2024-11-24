import { atom, useAtom } from 'jotai';
import { TOKEN_KEY, USER_KEY } from '@/config/constants';
const authAtom = atom({
    token: typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,
    user: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem(USER_KEY) || 'null') : null,
});
export function useAuth() {
    const [auth, setAuth] = useAtom(authAtom);
    const setToken = (token) => {
        localStorage.setItem(TOKEN_KEY, token);
        setAuth({ ...auth, token });
    };
    const setUser = (user) => {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        setAuth({ ...auth, user });
    };
    const logout = () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setAuth({ token: null, user: null });
    };
    return {
        token: auth.token,
        user: auth.user,
        setToken,
        setUser,
        logout,
    };
}
