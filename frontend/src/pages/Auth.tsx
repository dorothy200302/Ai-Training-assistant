import React, { useState, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { toast } from "@/hooks/use-toast"
import { API_BASE_URL } from '../config/constants';

interface AuthFormData {
  username?: string;
  email: string;
  password: string;
  remember: boolean;
  verificationCode?: string;
}

export default function Auth(): JSX.Element {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState<AuthFormData>({
    username: '',
    email: '',
    password: '',
    remember: false,
    verificationCode: ''
  });
  const { setUser } = useUser();
  const [countdown, setCountdown] = useState<number>(0);

  const toggleMode = (): void => setIsLogin(!isLogin);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({

      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSendVerificationCode = async () => {
    if (!formData.email) {
      toast({
        title: "验证失败",
        description: "请输入邮箱地址",
        variant: "destructive",
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast({
        title: "验证失败",
        description: "请输入有效的邮箱地址",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('${API_BASE_URL}/api/user/email/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast({
          title: "发送失败",
          description: errorData.detail || "发送验证码失败，请稍后重试",
          variant: "destructive",
        });
        return;
      }

      setCountdown(30);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      toast({
        title: "发送成功",
        description: "验证码已发送到您的邮箱",
      });
    } catch (error) {
      toast({
        title: "发送失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast({
        title: "验证失败",
        description: "请填写所有必填字段",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        const endpoint = `${API_BASE_URL}/api/user/login`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          }),
        });

        if (!response.ok) {
          toast({
            title: "登录失败",
            description: "用户名或密码错误",
            variant: "destructive",
          });
          return;
        }

        const data = await response.json();
        const { access_token, user_id, username } = data;
        
        const userInfo = {
          email: formData.email,
          avatar: "https://github.com/avatar.png",
          token: access_token,
          id: user_id,
          username: username
        };
        
        setUser(userInfo);
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        localStorage.setItem('token', access_token);
        
        toast({
          title: "登录成功",
          description: "欢迎回来！",
        });
        
        navigate('/', { replace: true });
      } else {  
        if (!formData.verificationCode) {
          toast({
            title: "验证失败",
            description: "请输入验证码",
            variant: "destructive",
          });
          return;
        }

        if (!formData.username) {
          toast({
            title: "验证失败",
            description: "请输入用户名",
            variant: "destructive",
          });
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/user/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            username: formData.username,
            verification_code: formData.verificationCode
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          toast({
            title: "注册失败",
            description: errorData.detail || "请检查输入是否正确",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "注册成功",
          description: "请使用新账号登录",
        });
        
        setIsLogin(true);
        setFormData({
          username: '',
          email: '',
          password: '',
          remember: false,
          verificationCode: ''
        });
      }
    } catch (error) {
      toast({
        title: "操作失败",
        description: "网络错误，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen flex-col bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300">
      <div className="w-full p-6 sm:p-8 md:p-10 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md bg-white p-10 rounded-xl shadow-lg"
        >
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-orange-800">
              {isLogin ? '登录您的账户' : '创建新账户'}
            </h2>
          </div>
          <form className="mt-8 space-y-6" action="#" method="POST" onSubmit={handleSubmit}>
            <input type="hidden" name="remember" value="true" />
            <div className="rounded-md shadow-sm -space-y-px">
              {!isLogin && (
                <div>
                  <label htmlFor="username" className="sr-only">
                    用户名
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-500" size={20} />
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      value={formData.username}
                      onChange={handleInputChange}
                      className="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-orange-300 placeholder-orange-500 text-orange-900 rounded-t-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                      placeholder="用户名"
                    />
                  </div>
                </div>
              )}
              <div>
                <label htmlFor="email-address" className="sr-only">
                  电子邮箱
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-500" size={20} />
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-orange-300 placeholder-orange-500 text-orange-900 ${
                      isLogin ? 'rounded-t-md' : ''
                    } focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm`}
                    placeholder="电子邮箱"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-500" size={20} />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-orange-300 placeholder-orange-500 text-orange-900 rounded-b-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                    placeholder="密码"
                  />
                </div>
              </div>
            </div>

            {!isLogin && (
              <div className="flex space-x-2">
                <div className="flex-1">
                  <input
                    type="text"
                    name="verificationCode"
                    placeholder="验证码"
                    value={formData.verificationCode}
                    onChange={handleInputChange}
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-orange-300 placeholder-orange-500 text-orange-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendVerificationCode}
                  disabled={countdown > 0 || isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-orange-300"
                >
                  {countdown > 0 ? `${countdown}秒后重试` : '发送验证码'}
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember"
                  type="checkbox"
                  checked={formData.remember}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-orange-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-orange-900">
                  记住我
                </label>
              </div>

              {isLogin && (
                <div className="text-sm">
                  <a href="#" className="font-medium text-orange-600 hover:text-orange-500">
                    忘记密码？
                  </a>
                </div>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-orange-400 to-yellow-400 hover:from-orange-500 hover:to-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    处理中...
                  </div>
                ) : (
                  isLogin ? '登录' : '注册'
                )}
              </button>
            </div>
          </form>
          <div className="text-center">
            <button onClick={toggleMode} className="font-medium text-orange-600 hover:text-orange-500">
              {isLogin ? '没有账户? 立即注册' : '已有账户? 立即登录'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}