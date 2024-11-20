import React, { createContext, useContext, useState, useEffect } from 'react';

// 定义用户信息接口
export interface UserInfo {
  email?: string;
  avatar?: string;
  token: string;
  id: number | string;
  // ... 其他用户信息字段
}

// 创建 Context
export const UserContext = createContext<{
  user: UserInfo | null;
  setUser: (user: UserInfo | null) => void;
}>({ user: null, setUser: () => {} });

// 创建 Provider 组件
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    // 在组件加载时从 localStorage 读取用户信息
    const storedUser = localStorage.getItem('userInfo');
    console.log('UserProvider init - stored user:', storedUser);
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log('Setting initial user:', parsedUser);
        setUser(parsedUser);
      } catch (e) {
        console.error('Failed to parse stored user info', e);
      }
    }
  }, []);

  const updateUser = (newUser: UserInfo | null) => {
    console.log('UserContext updateUser called with:', newUser);
    setUser(newUser);
  };

  return (
    <UserContext.Provider value={{ user, setUser: updateUser }}>
      {children}
    </UserContext.Provider>
  );
};

// 创建自定义 hook
export const useUser = () => useContext(UserContext);