import { useState, useEffect } from 'react';

export function useToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Get token from localStorage
    const storedToken = localStorage.getItem('token');
    setToken(storedToken);
  }, []);

  return token;
}

export function useToast() {
  const toast = (options: { 
    title: string; 
    description?: string; 
    variant?: "default" | "destructive"; 
  }) => {
    // You can replace this with your preferred toast library
    console.log(`Toast: ${options.title} - ${options.description}`);
  };

  return { toast };
}
