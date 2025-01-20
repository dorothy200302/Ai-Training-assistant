import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  text?: string;
  fullscreen?: boolean;
  inline?: boolean;
  className?: string;
}

export function LoadingState({ 
  text = "加载中...", 
  fullscreen = false, 
  inline = false,
  className = ""
}: LoadingStateProps) {
  if (inline) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
        <span className="text-sm text-amber-800">{text}</span>
      </div>
    );
  }

  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          <p className="text-lg font-medium text-amber-800">{text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center p-4 ${className}`}>
      <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
      <p className="mt-2 text-sm font-medium text-amber-800">{text}</p>
    </div>
  );
}

export function ButtonLoading({ text = "处理中..." }: { text?: string }) {
  return (
    <div className="flex items-center">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {text}
    </div>
  );
}
