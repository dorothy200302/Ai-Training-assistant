import { useUser } from '@/contexts/UserContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';

export function Header() {
  const { user } = useUser();
  console.log('Header - current user:', user);
  console.log('Header - localStorage:', localStorage.getItem('userInfo'));

  return (
    <header className="bg-amber-50/80 backdrop-blur-sm sticky top-0 z-50 border-b border-amber-300">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold">
                <span className="text-amber-600">Training</span>
                <span className="text-amber-500">Doc</span>
                <span className="text-amber-700">AI</span>
              </span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link to="/ai-chat" className="text-amber-800 hover:text-amber-900">
              AI对话
            </Link>
            <Link to="/documents" className="text-amber-800 hover:text-amber-900">
              文档历史
            </Link>
            <Link to="/outline" className="text-amber-800 hover:text-amber-900">
              大纲生成
            </Link>
            <Link to="/templates" className="text-amber-800 hover:text-amber-900">
              模板库
            </Link>
            <Link to="/employees" className="text-amber-800 hover:text-amber-900">
              员工管理
            </Link>
            <Link to="/pricing" className="text-amber-800 hover:text-amber-900">
              价格
            </Link>
            
            {user ? (
              <Avatar>
                <AvatarImage src={user.avatar} alt={user.email || ''} />
                <AvatarFallback>{user.email?.[0]?.toUpperCase() || '?'}</AvatarFallback>
              </Avatar>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-100">
                    登录
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button className="bg-gradient-to-r from-amber-600 to-amber-500 text-white hover:from-amber-700 hover:to-amber-600">
                    免费注册
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 