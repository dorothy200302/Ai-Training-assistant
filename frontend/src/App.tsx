import { BrowserRouter, Routes, Route } from "react-router-dom"
import Home from "./pages/Home"
import AiChat from "./pages/AiChat"
import DocumentHistory from "./pages/DocumentHistory"
import Auth from "./pages/Auth"
import OutlineGenerator from "./pages/OutlineGenerator"
import Templates from "./pages/Templates"
import EmployeeManagement from "./pages/EmployeeManagement"
import Pricing from "./pages/Pricing"
import Management from "./pages/templates/ManagementSkillsTraining"
import NewEmployee from "./pages/templates/NewEmployeeOrientation"
import SalesTraining from "./pages/templates/SalesTraining"
import CareerPlanning from "./pages/templates/CareerPlanning"
import QuarterlySalesStrategyTraining from "./pages/templates/QuarterlySalesStrategyTraining"
import CustomerServiceSkillsTraining from "./pages/templates/CustomerServiceSkillsTraining"
import { UserProvider } from "./contexts/UserContext"
import { Header } from "./components/Header"
import GeneratedDocument from "./pages/GeneratedDocument"
export default function App() {
  // 这里的用户信息可能来自登录过程或其他来源
  // const userInfo = {
  //   id: 'user123',
  //   name: 'John Doe',
  //   email: 'john@example.com',
  //   avatar: 'https://github.com/shadcn.png'
  // };

  return (
    <UserProvider>
      <BrowserRouter>
        <div className="flex flex-col min-h-screen w-full">
          <Header />
          <main className="flex-1 w-full">
            <Routes>
              {/* 设置首页路由 */}
              <Route path="/" element={<Home />} />
              
              {/* 功能页面路由 */}
              <Route path="/ai-chat" element={<AiChat />} />
              <Route path="/documents" element={<DocumentHistory />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/outline" element={<OutlineGenerator />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/employees" element={<EmployeeManagement />} />
              <Route path="/pricing" element={<Pricing />} />
              {/* 模板页面路由 */}
              <Route path="/templates/management" element={<Management />} />
              <Route path="/templates/new-employee" element={<NewEmployee />} />
              <Route path="/templates/sales-training" element={<SalesTraining />} />
              <Route path="/templates/career-planning" element={<CareerPlanning />} />
              <Route path="/templates/quarterly-sales" element={<QuarterlySalesStrategyTraining />} />
              <Route path="/templates/customer-service" element={<CustomerServiceSkillsTraining />} />

              <Route path="/generated-document" element={<GeneratedDocument />} />

            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </UserProvider>
  )
}
