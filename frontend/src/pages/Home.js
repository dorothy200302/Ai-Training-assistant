import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, UserCheck, MessageSquare, FileOutput, ShieldCheck, Bot, } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from 'react-router-dom';
const FeatureCard = ({ icon, title, description }) => {
    return (_jsx("div", { className: "bg-amber-50 p-6 rounded-lg shadow-md border border-amber-300 hover:shadow-lg transition-all duration-300", children: _jsxs("div", { className: "flex flex-col items-center text-center", children: [_jsx("div", { className: "w-12 h-12 bg-gradient-to-r from-amber-500 to-amber-400 rounded-lg flex items-center justify-center mb-4", children: icon }), _jsx("h3", { className: "text-amber-900 font-medium mb-2", children: title }), _jsx("p", { className: "text-amber-700 text-sm", children: description })] }) }));
};
const testimonials = [
    {
        avatar: '张',
        name: '张经理',
        title: '销售总监',
        content: '智能生成的培训文档让我们的新员工培训效率提升了50%，节省了大量时间。'
    },
    {
        avatar: '李',
        name: '李老师',
        title: '培训主管',
        content: '系统生成的内容非常专业，完全符合我们的培训需求，特别是个性化定制功能。'
    },
    {
        avatar: '王',
        name: '王工',
        title: '技术经理',
        content: '文档模板丰富，质量高，帮助我们快速构建了完整的技术培训体系。'
    },
    {
        avatar: '陈',
        name: '陈主管',
        title: 'HR总监',
        content: '培训文档的多样性和针对性很强，员工反馈非常好，推荐使用。'
    }
];
export default function Home() {
    const navigate = useNavigate();
    const [inputValue, setInputValue] = useState('');
    //   /templates/management" element={<Management />} />
    //   <Route path="/templates/new-employee" element={<NewEmployee />} />
    //   <Route path="/g"templates/sales-training
    const tagRoutes = {
        '新员工培训': '/templates/new-employee',
        '销售技巧': '/templates/sales-training',
        '管理能力': '/templates/management',
        '职业规划': '/templates/career-planning'
    };
    const handleTagClick = (tag) => {
        navigate(tagRoutes[tag], { state: { topic: tag } });
    };
    const handleMarketClick = (topic) => {
        navigate('/outline', { state: { topic } });
    };
    const handleGenerate = () => {
        navigate('/outline', { state: { topic: inputValue } });
    };
    return (_jsxs("div", { className: "min-h-screen bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300 flex flex-col", children: [_jsx("div", { className: "bg-gradient-to-r from-amber-600 to-amber-500 text-white py-2 px-4 text-center relative", children: _jsx("span", { className: "inline-flex items-center", children: "\uD83C\uDF89 \u5468\u5E74\u5E86\u6D3B\u52A8\uFF1A\u4F1A\u5458\u65F6\u957F\u7FFB\u500D\u9001\uFF0C\u5347\u7EA7\u9886200\u5143\u793C\u54C1\u5361" }) }), _jsx("div", { className: "pt-24 pb-20 text-center", children: _jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 }, className: "max-w-4xl mx-auto px-4 sm:px-6 lg:px-8", children: [_jsx("h1", { className: "text-5xl font-bold text-amber-900 mb-8", children: "AI \u667A\u80FD\u57F9\u8BAD\u6587\u6863\u751F\u6210\u7CFB\u7EDF" }), _jsxs("p", { className: "text-xl text-amber-700 mb-12", children: ["\u8BA9 AI \u4E3A\u60A8\u6253\u9020", _jsx("span", { className: "text-amber-600 font-semibold", children: "\u4E13\u4E1A\u7684\u57F9\u8BAD\u65B9\u6848" })] }), _jsxs("div", { className: "max-w-2xl mx-auto bg-amber-50 rounded-2xl shadow-lg p-6 border border-amber-300", children: [_jsxs("div", { className: "flex items-center space-x-4 mb-6", children: [_jsx("div", { className: "w-10 h-10 bg-gradient-to-r from-amber-500 to-amber-400 rounded-full flex items-center justify-center", children: _jsx(Bot, { className: "w-6 h-6 text-white" }) }), _jsx("p", { className: "text-amber-800", children: "\u8BF7\u8F93\u5165\u60A8\u9700\u8981\u7684\u57F9\u8BAD\u6587\u6863\u4E3B\u9898\u6216\u5185\u5BB9\u63CF\u8FF0..." })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Input, { className: "flex-1 border-amber-400 focus-visible:ring-amber-500 focus-visible:ring-offset-0 bg-white", placeholder: "\u4F8B\u5982\uFF1A\u65B0\u5458\u5DE5\u5165\u804C\u57F9\u8BAD\u624B\u518C...", value: inputValue, onChange: (e) => setInputValue(e.target.value) }), _jsx(Button, { onClick: handleGenerate, className: "bg-gradient-to-r from-amber-600 to-amber-500 text-white hover:from-amber-700 hover:to-amber-600", children: "\u5F00\u59CB\u751F\u6210" })] }), _jsx("div", { className: "mt-4 flex flex-wrap gap-2", children: Object.keys(tagRoutes).map((tag) => (_jsx(Button, { variant: "outline", size: "sm", onClick: () => handleTagClick(tag), className: "text-amber-700 bg-amber-100 border-amber-300 hover:bg-amber-200", children: tag }, tag))) })] })] }) }), _jsx("div", { className: "w-full mx-auto px-4 sm:px-6 lg:px-8 pb-20", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: [_jsxs("div", { className: "cursor-pointer bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow", onClick: () => handleMarketClick("市场营销策划方案"), children: [_jsx("h3", { className: "text-xl font-semibold text-amber-800 mb-2", children: "\u5E02\u573A\u8425\u9500" }), _jsx("p", { className: "text-amber-600", children: "\u4E13\u4E1A\u7684\u5E02\u573A\u8425\u9500\u7B56\u5212\u65B9\u6848\uFF0C\u52A9\u529B\u4F01\u4E1A\u54C1\u724C\u63A8\u5E7F" })] }), _jsx(FeatureCard, { icon: _jsx(Database, { className: "w-6 h-6 text-white" }), title: "\u77E5\u8BC6\u5E93\u7BA1\u7406", description: "\u96C6\u4E2D\u5316\u7BA1\u7406\u4F01\u4E1A\u6587\u6863\uFF0C\u652F\u6301\u5206\u7C7B\u6807\u7B7E\uFF0C\u65B9\u4FBF\u68C0\u7D22" }), _jsx(FeatureCard, { icon: _jsx(UserCheck, { className: "w-6 h-6 text-white" }), title: "\u4E2A\u6027\u5316\u65B9\u6848", description: "\u6839\u636E\u5458\u5DE5\u89D2\u8272\u548C\u9700\u6C42\uFF0C\u5B9A\u5236\u4E13\u5C5E\u57F9\u8BAD\u8BA1\u5212" }), _jsx(FeatureCard, { icon: _jsx(MessageSquare, { className: "w-6 h-6 text-white" }), title: "\u53CD\u9988\u4F18\u5316", description: "\u6536\u96C6\u7528\u6237\u8BC4\u4EF7\uFF0C\u6301\u7EED\u6539\u8FDB\u57F9\u8BAD\u5185\u5BB9\u8D28\u91CF" }), _jsx(FeatureCard, { icon: _jsx(FileOutput, { className: "w-6 h-6 text-white" }), title: "\u591A\u683C\u5F0F\u5BFC\u51FA", description: "\u652F\u6301PDF\u3001Word\u7B49\u591A\u79CD\u683C\u5F0F\uFF0C\u968F\u65F6\u4E0B\u8F7D\u4F7F\u7528" }), _jsx(FeatureCard, { icon: _jsx(ShieldCheck, { className: "w-6 h-6 text-white" }), title: "\u5B89\u5168\u4FDD\u969C", description: "\u4E25\u683C\u7684\u6743\u9650\u7BA1\u7406\uFF0C\u4FDD\u62A4\u4F01\u4E1A\u673A\u5BC6\u4FE1\u606F" })] }) }), _jsx("div", { className: "py-20 bg-gradient-to-br from-amber-100 to-amber-200 flex-grow", children: _jsxs("div", { className: "w-full mx-auto px-4 sm:px-6 lg:px-8", children: [_jsx("h2", { className: "text-3xl font-bold text-center text-amber-900 mb-12", children: "\u7528\u6237\u8BC4\u4EF7" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: testimonials.map((testimonial, index) => (_jsx(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: index * 0.1 }, children: _jsxs("div", { className: "bg-amber-50 p-6 rounded-lg shadow-md border border-amber-300", children: [_jsxs("div", { className: "flex items-center mb-4", children: [_jsx("div", { className: "w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 flex items-center justify-center text-white text-xl font-bold", children: testimonial.avatar }), _jsxs("div", { className: "ml-4", children: [_jsx("h3", { className: "font-medium text-amber-900", children: testimonial.name }), _jsx("p", { className: "text-sm text-amber-700", children: testimonial.title })] })] }), _jsx("p", { className: "text-amber-800", children: testimonial.content })] }) }, testimonial.name))) })] }) })] }));
}
