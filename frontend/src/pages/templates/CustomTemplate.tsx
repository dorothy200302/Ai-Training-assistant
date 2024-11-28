import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';

interface Tag {
  id: string;
  text: string;
}

interface CustomTemplateData {
  title: string;
  description: string;
  category: string;
  tags: Tag[];
}

interface TagInput {
  id: string;
  value: string;
}

export default function CustomTemplate() {
  const navigate = useNavigate();
  const [templateData, setTemplateData] = useState<CustomTemplateData>({
    title: '',
    description: '',
    category: '',
    tags: []
  });
  const [tagInputs, setTagInputs] = useState<TagInput[]>([
    { id: Date.now().toString(), value: '' }
  ]);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [templateTitle, setTemplateTitle] = useState('自定义模板');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTemplateData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTagInputChange = (id: string, value: string) => {
    setTagInputs(prev => prev.map(input => 
      input.id === id ? { ...input, value } : input
    ));
  };

  const handleAddTagInput = () => {
    setTagInputs(prev => [...prev, { id: Date.now().toString(), value: '' }]);
  };

  const handleSaveTag = (id: string) => {
    const input = tagInputs.find(i => i.id === id);
    if (input && input.value.trim()) {
      setTemplateData(prev => ({
        ...prev,
        tags: [...prev.tags, { id: Date.now().toString(), text: input.value.trim() }]
      }));
      
      // Clear the input value
      setTagInputs(prev => prev.map(i => 
        i.id === id ? { ...i, value: '' } : i
      ));
    }
  };

  const handleRemoveTag = (tagId: string) => {
    setTemplateData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag.id !== tagId)
    }));
  };

  const handleSave = () => {
    // TODO: Implement save functionality
    window.alert('保存成功！');
  };

  const handleTitleClick = () => {
    setIsEditingTitle(true);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTemplateTitle(e.target.value);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsEditingTitle(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300 p-6 sm:p-8 md:p-10">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              className="text-amber-800"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            {isEditingTitle ? (
              <Input
                value={templateTitle}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                onKeyPress={handleKeyPress}
                autoFocus
                className="text-3xl font-bold text-amber-800 border-amber-200 focus:border-amber-400 w-64"
              />
            ) : (
              <h1 
                className="text-3xl font-bold text-amber-800 cursor-pointer hover:text-amber-700"
                onClick={handleTitleClick}
              >
                {templateTitle}
              </h1>
            )}
          </div>
          <Button
            className="bg-amber-600 hover:bg-amber-700 text-white"
            onClick={handleSave}
          >
            <Save className="w-4 h-4 mr-2" />
            保存模板
          </Button>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-amber-800">
              标题
            </label>
            <Input
              name="title"
              value={templateData.title}
              onChange={handleInputChange}
              placeholder="输入模板标题"
              className="border-amber-200 focus:border-amber-400"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-amber-800">
              描述
            </label>
            <Textarea
              name="description"
              value={templateData.description}
              onChange={handleInputChange}
              placeholder="输入模板描述"
              className="border-amber-200 focus:border-amber-400 min-h-[100px]"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-amber-800">
              分类
            </label>
            <Input
              name="category"
              value={templateData.category}
              onChange={handleInputChange}
              placeholder="输入模板分类"
              className="border-amber-200 focus:border-amber-400"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-amber-800">
              标签
            </label>
            <div className="flex flex-wrap gap-2">
              {templateData.tags.map(tag => (
                <div
                  key={tag.id}
                  className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-md"
                >
                  <span>{tag.text}</span>
                  <button
                    onClick={() => handleRemoveTag(tag.id)}
                    className="text-amber-600 hover:text-amber-800"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {tagInputs.map(input => (
                <div key={input.id} className="flex gap-1">
                  <Input
                    value={input.value}
                    onChange={(e) => handleTagInputChange(input.id, e.target.value)}
                    placeholder="添加标签"
                    className="border-amber-200 focus:border-amber-400 w-32"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveTag(input.id);
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleSaveTag(input.id)}
                    className="border-amber-200 text-amber-600 hover:bg-amber-50"
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="icon"
                onClick={handleAddTagInput}
                className="border-amber-200 text-amber-600 hover:bg-amber-50"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
