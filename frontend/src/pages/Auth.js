import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { toast } from "@/hooks/use-toast";
export default function Auth() {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        remember: false,
        verificationCode: ''
    });
    const { setUser } = useUser();
    const [countdown, setCountdown] = useState(0);
    const toggleMode = () => setIsLogin(!isLogin);
    const handleInputChange = (e) => {
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
            const response = await fetch('http://localhost:8001/api/user/email/verify-code', {
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
        }
        catch (error) {
            toast({
                title: "发送失败",
                description: "网络错误，请稍后重试",
                variant: "destructive",
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleSubmit = async (e) => {
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
                const endpoint = 'http://localhost:8001/api/user/login';
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
            }
            else {
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
                const response = await fetch('http://localhost:8001/api/user/register', {
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
        }
        catch (error) {
            toast({
                title: "操作失败",
                description: "网络错误，请稍后重试",
                variant: "destructive",
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    return (_jsx("div", { className: "flex min-h-screen w-screen flex-col bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300", children: _jsx("div", { className: "w-full p-6 sm:p-8 md:p-10 flex items-center justify-center", children: _jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 }, className: "w-full max-w-md bg-white p-10 rounded-xl shadow-lg", children: [_jsx("div", { children: _jsx("h2", { className: "mt-6 text-center text-3xl font-extrabold text-orange-800", children: isLogin ? '登录您的账户' : '创建新账户' }) }), _jsxs("form", { className: "mt-8 space-y-6", action: "#", method: "POST", onSubmit: handleSubmit, children: [_jsx("input", { type: "hidden", name: "remember", value: "true" }), _jsxs("div", { className: "rounded-md shadow-sm -space-y-px", children: [!isLogin && (_jsxs("div", { children: [_jsx("label", { htmlFor: "username", className: "sr-only", children: "\u7528\u6237\u540D" }), _jsxs("div", { className: "relative", children: [_jsx(User, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-500", size: 20 }), _jsx("input", { id: "username", name: "username", type: "text", required: true, value: formData.username, onChange: handleInputChange, className: "appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-orange-300 placeholder-orange-500 text-orange-900 rounded-t-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm", placeholder: "\u7528\u6237\u540D" })] })] })), _jsxs("div", { children: [_jsx("label", { htmlFor: "email-address", className: "sr-only", children: "\u7535\u5B50\u90AE\u7BB1" }), _jsxs("div", { className: "relative", children: [_jsx(Mail, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-500", size: 20 }), _jsx("input", { id: "email-address", name: "email", type: "email", autoComplete: "email", required: true, value: formData.email, onChange: handleInputChange, className: `appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-orange-300 placeholder-orange-500 text-orange-900 ${isLogin ? 'rounded-t-md' : ''} focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm`, placeholder: "\u7535\u5B50\u90AE\u7BB1" })] })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "password", className: "sr-only", children: "\u5BC6\u7801" }), _jsxs("div", { className: "relative", children: [_jsx(Lock, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-500", size: 20 }), _jsx("input", { id: "password", name: "password", type: "password", autoComplete: "current-password", required: true, value: formData.password, onChange: handleInputChange, className: "appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-orange-300 placeholder-orange-500 text-orange-900 rounded-b-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm", placeholder: "\u5BC6\u7801" })] })] })] }), !isLogin && (_jsxs("div", { className: "flex space-x-2", children: [_jsx("div", { className: "flex-1", children: _jsx("input", { type: "text", name: "verificationCode", placeholder: "\u9A8C\u8BC1\u7801", value: formData.verificationCode, onChange: handleInputChange, className: "appearance-none rounded-md relative block w-full px-3 py-2 border border-orange-300 placeholder-orange-500 text-orange-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm" }) }), _jsx("button", { type: "button", onClick: handleSendVerificationCode, disabled: countdown > 0 || isLoading, className: "px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-orange-300", children: countdown > 0 ? `${countdown}秒后重试` : '发送验证码' })] })), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center", children: [_jsx("input", { id: "remember-me", name: "remember", type: "checkbox", checked: formData.remember, onChange: handleInputChange, className: "h-4 w-4 text-orange-600 focus:ring-orange-500 border-orange-300 rounded" }), _jsx("label", { htmlFor: "remember-me", className: "ml-2 block text-sm text-orange-900", children: "\u8BB0\u4F4F\u6211" })] }), isLogin && (_jsx("div", { className: "text-sm", children: _jsx("a", { href: "#", className: "font-medium text-orange-600 hover:text-orange-500", children: "\u5FD8\u8BB0\u5BC6\u7801\uFF1F" }) }))] }), _jsx("div", { children: _jsx("button", { type: "submit", disabled: isLoading, className: "group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-orange-400 to-yellow-400 hover:from-orange-500 hover:to-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed", children: isLoading ? (_jsxs("div", { className: "flex items-center", children: [_jsxs("svg", { className: "animate-spin -ml-1 mr-3 h-5 w-5 text-white", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })] }), "\u5904\u7406\u4E2D..."] })) : (isLogin ? '登录' : '注册') }) })] }), _jsx("div", { className: "text-center", children: _jsx("button", { onClick: toggleMode, className: "font-medium text-orange-600 hover:text-orange-500", children: isLogin ? '没有账户? 立即注册' : '已有账户? 立即登录' }) })] }) }) }));
}
