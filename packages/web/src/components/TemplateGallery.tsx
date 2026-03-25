'use client';

import { useState, useEffect } from 'react';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  usageCount: number;
}

interface TemplateGalleryProps {
  onUse: (templateId: string) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  'lead-management': '🎯',
  'email-automation': '📧',
  'notifications': '🔔',
  'onboarding': '👋',
  'data-sync': '🔄',
  'scheduling': '📅',
};

export function TemplateGallery({ onUse }: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState<string>('all');

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const query = category !== 'all' ? `?category=${category}` : '';
    fetch(`${apiUrl}/api/templates${query}`)
      .then((r) => r.json())
      .then((data) => setTemplates(data.templates || []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [category]);

  const categories = ['all', 'lead-management', 'email-automation', 'notifications', 'onboarding', 'data-sync'];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">Workflow Templates</h2>
        <p className="text-sm text-gray-500 mt-1">Start with a pre-built workflow and customize it for your needs</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              category === cat
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {CATEGORY_ICONS[cat] || '📋'} {cat === 'all' ? 'All Templates' : cat.replace(/-/g, ' ')}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-sm text-gray-500">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No templates yet</h3>
          <p className="text-sm text-gray-500">Templates will be added as the platform grows. Try creating a custom workflow instead!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-primary-300 hover:shadow-md transition-all"
            >
              <div className="text-2xl mb-3">{CATEGORY_ICONS[tpl.category] || '📋'}</div>
              <h3 className="text-sm font-semibold text-gray-900">{tpl.name}</h3>
              <p className="text-xs text-gray-500 mt-1 line-clamp-3">{tpl.description}</p>
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-gray-400">{tpl.usageCount} uses</span>
                <button
                  onClick={() => onUse(tpl.id)}
                  className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Use Template
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
