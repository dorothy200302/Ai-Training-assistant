import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from 'react';
// 创建 Context
export const UserContext = createContext({ user: null, setUser: () => { } });
// 创建 Provider 组件
export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    useEffect(() => {
        // 在组件加载时从 localStorage 读取用户信息
        const storedUser = localStorage.getItem('userInfo');
        console.log('UserProvider init - stored user:', storedUser);
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                console.log('Setting initial user:', parsedUser);
                setUser(parsedUser);
            }
            catch (e) {
                console.error('Failed to parse stored user info', e);
            }
        }
    }, []);
    const updateUser = (newUser) => {
        console.log('UserContext updateUser called with:', newUser);
        setUser(newUser);
    };
    return (_jsx(UserContext.Provider, { value: { user, setUser: updateUser }, children: children }));
};
// 创建自定义 hook
export const useUser = () => useContext(UserContext);
