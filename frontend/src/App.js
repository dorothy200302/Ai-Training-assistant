import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import AiChat from "./pages/AiChat";
import DocumentHistory from "./pages/DocumentHistory";
import Auth from "./pages/Auth";
import OutlineGenerator from "./pages/OutlineGenerator";
import Templates from "./pages/Templates";
import EmployeeManagement from "./pages/EmployeeManagement";
import Pricing from "./pages/Pricing";
import Management from "./pages/templates/ManagementSkillsTraining";
import NewEmployee from "./pages/templates/NewEmployeeOrientation";
import SalesTraining from "./pages/templates/SalesTraining";
import CareerPlanning from "./pages/templates/CareerPlanning";
import QuarterlySalesStrategyTraining from "./pages/templates/QuarterlySalesStrategyTraining";
import CustomerServiceSkillsTraining from "./pages/templates/CustomerServiceSkillsTraining";
import MockPayment from "./pages/MockPayment";
import { UserProvider } from "./contexts/UserContext";
import { Header } from "./components/Header";
import GeneratedDocument from "./pages/GeneratedDocument";
import PerformanceManagement from "./pages/templates/PerformanceReview";
import DocumentPreview from "./pages/document-preview";
export default function App() {
    // 这里的用户信息可能来自登录过程或其他来源
    // const userInfo = {
    //   id: 'user123',
    //   name: 'John Doe',
    //   email: 'john@example.com',
    //   avatar: 'https://github.com/shadcn.png'
    // };
    return (_jsx(UserProvider, { children: _jsx(BrowserRouter, { children: _jsxs("div", { className: "flex flex-col min-h-screen w-full", children: [_jsx(Header, {}), _jsx("main", { className: "flex-1 w-full", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Home, {}) }), _jsx(Route, { path: "/ai-chat", element: _jsx(AiChat, {}) }), _jsx(Route, { path: "/documents", element: _jsx(DocumentHistory, {}) }), _jsx(Route, { path: "/auth", element: _jsx(Auth, {}) }), _jsx(Route, { path: "/outline", element: _jsx(OutlineGenerator, {}) }), _jsx(Route, { path: "/templates", element: _jsx(Templates, {}) }), _jsx(Route, { path: "/employees", element: _jsx(EmployeeManagement, {}) }), _jsx(Route, { path: "/pricing", element: _jsx(Pricing, {}) }), _jsx(Route, { path: "/mock-payment", element: _jsx(MockPayment, {}) }), _jsx(Route, { path: "/document-preview", element: _jsx(DocumentPreview, {}) }), _jsx(Route, { path: "/templates/management", element: _jsx(Management, {}) }), _jsx(Route, { path: "/templates/new-employee", element: _jsx(NewEmployee, {}) }), _jsx(Route, { path: "/templates/sales-training", element: _jsx(SalesTraining, {}) }), _jsx(Route, { path: "/templates/career-planning", element: _jsx(CareerPlanning, {}) }), _jsx(Route, { path: "/templates/quarterly-sales", element: _jsx(QuarterlySalesStrategyTraining, {}) }), _jsx(Route, { path: "/templates/performance-management", element: _jsx(PerformanceManagement, {}) }), _jsx(Route, { path: "/templates/customer-service", element: _jsx(CustomerServiceSkillsTraining, {}) }), _jsx(Route, { path: "/generated-document", element: _jsx(GeneratedDocument, {}) })] }) })] }) }) }));
}
