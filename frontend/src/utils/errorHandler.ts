interface ErrorResponse {
  message?: string;
  detail?: string;
  status?: number;
}

export class ApiError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export const handleApiError = (error: any) => {
  console.error('API Error:', error);
  
  // 如果是API错误
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        window.alert('您的未登录/登录状态已过期。请重新登录。');
        window.location.href = '/auth';
        break;
      case 403:
        window.alert('您没有权限执行此操作');
        break;
      case 404:
        window.alert('请求的资源不存在');
        break;
      case 500:
        window.alert('服务器处理请求时出错');
        break;
      default:
        window.alert('操作失败');
        break;
      case 500:
        window.alert('服务器处理请求时出错');
        break;
      
    }
  } else {
    // 如果是其他错误
    window.alert('操作失败');
  }
};

export const handleResponse = async (response: Response) => {
  if (!response.ok) {
    let errorMessage = '请求失败';
    let errorData: ErrorResponse = {};
    
    try {
      errorData = await response.json();
    } catch (e) {
      // 如果无法解析JSON，使用状态文本
      errorMessage = response.statusText;
    }

    throw new ApiError(
      errorData.message || errorData.detail || errorMessage,
      response.status
    );
  }
  
  return response;
};

export const createApiRequest = async (url: string, options: RequestInit = {}) => {
  try {
    // 获取 token
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/auth';
      throw new Error('未登录，请先登录');
    }
    // 准备请求头
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // 如果不是 FormData，则设置 Content-Type
    if (!(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    // 合并选项
    const requestOptions: RequestInit = {
      ...options,
      headers
    };

    // 发送请求
    const response = await fetch(url, requestOptions);
    
    // 处理响应
    if (!response.ok) {
      // 如果是 401，清除 token 并重定向到登录页
      if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/auth';
        throw new Error('未授权访问，请重新登录');
      }

      // 尝试解析错误信息
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || '请求失败';
      } catch {
        errorMessage = await response.text() || '请求失败';
      }

      throw new Error(errorMessage);
    }

    // 返回成功的响应
    return response;
  } catch (error) {
    // 统一处理错误
    console.error('API请求错误:', error);
    throw error;
  }
};
