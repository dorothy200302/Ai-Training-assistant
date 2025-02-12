from typing import Dict, List, Optional
import os
from pathlib import Path
from enum import Enum
import json
from pydantic import BaseModel

class TemplateType(str, Enum):
    WORD = "word"
    PPT = "ppt"
    PDF = "pdf"

class Template(BaseModel):
    id: str
    name: str
    type: TemplateType
    description: str
    file_path: str
    preview_image: Optional[str] = None
    metadata: Dict = {}

class TemplateManager:
    def __init__(self, templates_dir: str = "templates"):
        self.templates_dir = templates_dir
        self.templates: Dict[str, Template] = {}
        self._load_templates()
    
    def _load_templates(self):
        """Load all templates from the templates directory"""
        templates_path = Path(self.templates_dir)
        if not templates_path.exists():
            os.makedirs(templates_path)
            
        # Load template metadata from JSON file
        metadata_file = templates_path / "templates.json"
        if metadata_file.exists():
            with open(metadata_file, "r", encoding="utf-8") as f:
                templates_data = json.load(f)
                for template_data in templates_data:
                    template = Template(**template_data)
                    self.templates[template.id] = template
    
    def get_template(self, template_id: str) -> Optional[Template]:
        """Get a template by ID"""
        return self.templates.get(template_id)
    
    def list_templates(self, template_type: Optional[TemplateType] = None) -> List[Template]:
        """List all templates, optionally filtered by type"""
        if template_type:
            return [t for t in self.templates.values() if t.type == template_type]
        return list(self.templates.values())
    
    def add_template(self, template: Template) -> None:
        """Add a new template"""
        self.templates[template.id] = template
        self._save_templates()
    
    def _save_templates(self):
        """Save templates metadata to JSON file"""
        templates_path = Path(self.templates_dir)
        metadata_file = templates_path / "templates.json"
        
        templates_data = [t.dict() for t in self.templates.values()]
        with open(metadata_file, "w", encoding="utf-8") as f:
            json.dump(templates_data, f, ensure_ascii=False, indent=2) 