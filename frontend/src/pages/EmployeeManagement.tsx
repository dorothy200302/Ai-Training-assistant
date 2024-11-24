'use client'

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, UserPlus, Edit, Trash2, Search, Mail, Building, UserCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { useUser } from "@/contexts/UserContext";
interface Employee {
  id: number;
  name: string;
  email: string;
  role: RoleType | null;
  department: DepartmentType | null;
  status: string;
  department_id: number;
  role_id: number;
  leader_id: number | null;
}

interface FormData {
  name: string;
  email: string;
  role: string;
  department: string;
  password: string;
}

interface EmployeeCreate {
  name: string;
  email: string;
  password: string;
  leader_id: number | undefined;
  department_id: number;
  role_id: number;
  status: string;
}

interface EmployeeResponse {
  id: number;
  name: string;
  email: string;
  leader_id: number | null;
  department_id: number;
  role_id: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface DepartmentType {
  id: number;
  name: string;
}

interface RoleType {
  id: number;
  name: string;
}

const API_BASE_URL = 'http://localhost:8001/api';

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<DepartmentType[]>([]);
  const [roles, setRoles] = useState<RoleType[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    role: '',
    department: '',
    password: '',
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const token = localStorage.getItem('token');
  const { user } = useUser();

  // 获取部门列表
  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/employee/departments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('获取部门列表失败');
      const data = await response.json();
      setDepartments(data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      toast({
        title: "错误",
        description: "获取部门列表失败",
        variant: "destructive",
      });
    }
  };

  // 获取角色列表
  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/employee/roles`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('获取角色列表失败');
      const data = await response.json();
      setRoles(data);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      toast({
        title: "错误",
        description: "获取角色列表失败",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchRoles();
  }, [token]);

  // 获取员工列表
  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/employee/employees/${user?.id}/subordinates`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('获取员工列表失败');
      }

      const data = await response.json();
      console.log('原始数据:', data);
      console.log('部门数据:', departments);
      console.log('角色数据:', roles);

      if (!Array.isArray(data)) {
        throw new Error('服务器返回数据格式错误');
      }

      const formattedEmployees = data.map((emp: EmployeeResponse): Employee => {
        console.log(`正在处理员工 ${emp.name}:`, {
          department_id: emp.department_id,
          role_id: emp.role_id,
          departments: departments.map(d => ({ id: d.id, name: d.name }))
        });

        const department = departments.find(d => {
          console.log('比较部门:', { 
            department_id: d.id, 
            employee_department_id: emp.department_id,
            matches: d.id === emp.department_id 
          });
          return d.id === emp.department_id;
        });
        
        const role = roles.find(r => r.id === emp.role_id);
        
        console.log('匹配结果:', {
          employee: emp.name,
          found_department: department?.name || '未找到',
          found_role: role?.name || '未找到'
        });

        return {
          id: emp.id,
          name: emp.name,
          email: emp.email,
          department: department || { id: emp.department_id, name: '未知部门' },
          role: role || { id: emp.role_id, name: '未知角色' },
          status: emp.status === 'active' ? '已授权' : '未授权',
          department_id: emp.department_id,
          role_id: emp.role_id,
          leader_id: emp.leader_id
        };
      });
      
      console.log('格式化后的数据:', formattedEmployees);
      setEmployees(formattedEmployees);
    } catch (error) {
      console.error('获取员工列表失败:', error);
      setError(error as Error);
      toast({
        title: "获取失败",
        description: error instanceof Error ? error.message : "获取员工列表失败",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user?.id && token) {
      // 先获取部门和角色数据，再获取员工列表
      const initializeData = async () => {
        try {
          setLoading(true);
          // 先获取部门和角色
          await Promise.all([
            fetchDepartments(),
            fetchRoles()
          ]);
          // 然后获取员工列表
          await fetchEmployees();
        } catch (error) {
          console.error('初始化数据失败:', error);
        } finally {
          setLoading(false);
        }
      };
      
      initializeData();
    }
  }, [user?.id, token]);

  const initiateDelete = (employee: Employee) => {
    if (!employee || !employee.id) {
      toast({
        title: "错误",
        description: "无效的员工信息",
        variant: "destructive",
      });
      return;
    }
    setEditingEmployee(employee);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!editingEmployee || !editingEmployee.id) {
      window.alert("错误：无效的员工信息");
      return;
    }
    try {
      await handleDelete(editingEmployee.id);
      setIsDeleteDialogOpen(false);
      setEditingEmployee(null);
      window.alert("成功：员工信息已成功删除");
    } catch (error) {
      console.error('Confirm delete error:', error);
      let errorMessage = "删除员工信息时发生错误";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      window.alert("删除失败：" + errorMessage);
    }
  };

  const handleDelete = async (id: number) => {
    if (!id) {
      throw new Error('无效的员工ID');
    }

    try {
      const response = await fetch(`${API_BASE_URL}/employee/employees/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403) {
          throw new Error(errorData.detail || '您没有权限执行此操作');
        } else if (response.status === 400) {
          throw new Error(errorData.detail || '无法删除有下属的员工');
        } else if (response.status === 404) {
          throw new Error(errorData.detail || '未找到该员工');
        } else {
          throw new Error(errorData.detail || '删除失败');
        }
      }

      window.alert("成功：员工已删除");
      
      // 重新获取员工列表
      await fetchEmployees();
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  };

  const handleToggleStatus = async (id: number | undefined, currentStatus: string) => {
    if (!id) {
      toast({
        title: "错误",
        description: "无效的员工ID",
        variant: "destructive",
      });
      return;
    }

    try {
      // 转换状态值
      const backendStatus = currentStatus === '已授权' ? 'active' : 'inactive';
      const newStatus = backendStatus === 'active' ? 'inactive' : 'active';
      
      const response = await fetch(`${API_BASE_URL}/employee/employees/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '状态更新失败');
      }

      window.alert("成功：员工状态已成功更新");

      // 重新获取员工列表
      await fetchEmployees();
    } catch (error) {
      console.error('Status toggle error:', error);
      toast({
        title: "更新失败",
        description: error instanceof Error ? error.message : "更新员工状态失败",
        variant: "destructive",
      });
    }
  };

  const filterEmployees = () => {
    if (!Array.isArray(employees)) {
      console.warn('Employees is not an array');
      return [];
    }
    
    return employees.filter((employee) => {
      // 基本数据验证
      if (!employee) {
        console.warn('Invalid employee:', employee);
        return false;
      }

      const employeeName = employee.name || '';
      const employeeEmail = employee.email || '';
      const employeeDepartment = employee.department?.name || '';
      const searchTermLower = searchTerm.toLowerCase();
      
      const matchesSearch = searchTerm === '' || 
        employeeName.toLowerCase().includes(searchTermLower) ||
        employeeEmail.toLowerCase().includes(searchTermLower);
      const matchesDepartment = 
        selectedDepartment === 'all' || employeeDepartment === selectedDepartment;
        
      return matchesSearch && matchesDepartment;
    });
  };

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setFormData({
      name: '',
      email: '',
      role: '',
      department: '',
      password: '',
    });
    setIsEditDialogOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      role: employee.role?.name || '',
      department: employee.department?.name || '',
      password: '',
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!formData.name || !formData.email || !formData.department || !formData.role || (!editingEmployee && !formData.password)) {
        window.alert("请填写所有必填字段");
        return;
      }

      const selectedDepartment = departments.find(d => d.name === formData.department);
      const selectedRole = roles.find(r => r.name === formData.role);

      if (!selectedDepartment || !selectedRole) {
        toast({
          title: "验证失败",
          description: "请选择有效的部门和角色",
          variant: "destructive",
        });
        return;
      }

      const employeeData = {
        name: formData.name,
        email: formData.email,
        department_id: selectedDepartment.id,
        role_id: selectedRole.id,
        leader_id: user?.id,
        status: 'active',
        ...(editingEmployee ? {} : { password: formData.password })
      };

      const url = editingEmployee
        ? `${API_BASE_URL}/employee/employees/${editingEmployee.id}`
        : `${API_BASE_URL}/employee/employees`;

      const response = await fetch(url, {
        method: editingEmployee ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(employeeData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '操作失败');
      }

      // Get the updated data from response
      const updatedEmployee = await response.json();

      setIsEditDialogOpen(false);
      setFormData({
        name: '',
        email: '',
        role: '',
        department: '',
        password: ''
      });
      setEditingEmployee(null);

      // Update the local state immediately
      if (editingEmployee) {
        setEmployees(prevEmployees => 
          prevEmployees.map(emp => 
            emp.id === editingEmployee.id 
              ? {
                  ...emp,
                  name: employeeData.name,
                  email: employeeData.email,
                  department: departments.find(d => d.id === employeeData.department_id) || emp.department,
                  role: roles.find(r => r.id === employeeData.role_id) || emp.role,
                  department_id: employeeData.department_id,
                  role_id: employeeData.role_id
                }
              : emp
          )
        );
      }

      window.alert(`员工信息${editingEmployee ? '已更新' : '已添加'}`);
      toast({
        title: "操作成功",
        description: `员工信息${editingEmployee ? '已更新' : '已添加'}`,
        variant: "default",
      });

      // Refresh the employee list to ensure data consistency
      await fetchEmployees();
    } catch (error) {
      console.error('Failed to submit:', error);
      toast({
        title: "操作失败",
        description: error instanceof Error ? error.message : "操作失败",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-screen w-screen bg-amber-50 p-8">
      {error ? (
        <div className="p-4 text-red-500">
          <h2>Something went wrong:</h2>
          <pre>{error.message}</pre>
          <button 
            onClick={() => setError(null)}
            className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="h-full w-full">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-semibold text-amber-800">员工管理</h1>
            <Button
              onClick={handleAddEmployee}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              添加员工
            </Button>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-amber-200">
            <div className="p-6">
              <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-400" />
                  <Input
                    type="text"
                    placeholder="搜索员工..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-amber-200 focus:border-amber-300 focus:ring-amber-300"
                  />
                </div>
                <Select 
                  value={selectedDepartment} 
                  onValueChange={setSelectedDepartment}
                >
                  <SelectTrigger className="w-[180px] border-amber-200">
                    <SelectValue placeholder="部门筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部部门</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept.name} value={dept.name}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-amber-200">
                  <thead className="bg-amber-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">员工</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">邮箱</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">角色</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">状态</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-amber-200">
                    {filterEmployees().map((employee) => (
                      <motion.tr
                        key={employee.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="hover:bg-amber-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-amber-200 flex items-center justify-center text-amber-600">
                              {employee.name && employee.name.length > 0 ? employee.name[0] : '?'}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                              <div className="text-sm text-gray-500">{employee.department?.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{employee.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{employee.role?.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleStatus(employee.id, employee.status)}
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              employee.status === '已授权'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {employee.status === '已授权' ? (
                              <><UserCheck className="mr-1 h-3 w-3 inline" />已授权</>
                            ) : (
                              <><User className="mr-1 h-3 w-3 inline" />未授权</>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditEmployee(employee)}
                            className="text-amber-600 hover:text-amber-700 mr-2"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => initiateDelete(employee)}
                            className="text-red-600 hover:text-red-900"
                          >
                            删除
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 删除确认对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              您确定要删除员工 {editingEmployee?.name} 吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? '编辑员工信息' : '添加新员工'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-700">姓名</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-400" />
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="pl-10 border-amber-200"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-700">邮箱</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-400" />
                  <Input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10 border-amber-200"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-700">部门</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-400 z-10" />
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                  >
                    <SelectTrigger className="w-full pl-10 border-amber-200">
                      <SelectValue placeholder="选择部门" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-700">角色</label>
                <div className="relative">
                  <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-400 z-10" />
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger className="w-full pl-10 border-amber-200">
                      <SelectValue placeholder="选择角色" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(role => (
                        <SelectItem key={role.id} value={role.name}>{role.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {!editingEmployee && (
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-gray-700">初始密码</label>
                  <Input
                    type="password"
                    required={!editingEmployee}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="border-amber-200"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="border-amber-200 text-amber-600  hover:bg-amber-50">
                取消
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">
                {editingEmployee ? '保存' : '添加'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}