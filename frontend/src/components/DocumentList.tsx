import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";

<div className="flex space-x-2">
  <Button
    variant="outline"
    size="sm"
    asChild
  >
    <Link to={`/documents/${document.id}/learning`}>
      开始学习
    </Link>
  </Button>
  {/* ... existing buttons ... */}
</div> 