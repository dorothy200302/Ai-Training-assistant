import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Section {
  title: string;
  content: string;
  subsections?: Section[];
}

interface DocumentRendererProps {
  document: {
    title?: string;
    content?: string;
    sections?: Section[];
  };
  maxHeight?: string;
}

const DocumentRenderer: React.FC<DocumentRendererProps> = ({ 
  document, 
  maxHeight = "70vh" 
}) => {
  const renderSection = (section: Section, level: number = 1) => {
    const HeaderTag = `h${Math.min(level + 1, 6)}` as keyof JSX.IntrinsicElements;
    
    return (
      <div key={section.title} className="mb-6">
        <HeaderTag className="text-lg font-semibold mb-2">
          {section.title}
        </HeaderTag>
        {section.content && (
          <div 
            className="text-gray-700 whitespace-pre-wrap mb-4"
            dangerouslySetInnerHTML={{ __html: section.content.replace(/\n/g, '<br/>') }}
          />
        )}
        {section.subsections && section.subsections.map(subsection => 
          renderSection(subsection, level + 1)
        )}
      </div>
    );
  };

  return (
    <Card className="w-full bg-white shadow-lg">
      <CardContent className="p-6">
        <ScrollArea className="pr-4" style={{ maxHeight }}>
          {document.title && (
            <h1 className="text-2xl font-bold mb-6">{document.title}</h1>
          )}
          {document.content && (
            <div 
              className="text-gray-700 whitespace-pre-wrap mb-6"
              dangerouslySetInnerHTML={{ __html: document.content.replace(/\n/g, '<br/>') }}
            />
          )}
          {document.sections && document.sections.map(section => 
            renderSection(section)
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default DocumentRenderer; 