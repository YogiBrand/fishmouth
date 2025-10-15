import React, { useState } from 'react';
import { FileText, Eye, Edit, Star, Layers, CheckCircle, Calendar, Building } from 'lucide-react';

const ReportCardPreview = ({ reportType, onSelect, selected = false }) => {
  const [hovering, setHovering] = useState(false);

  const reportTypes = {
    'damage-assessment': {
      title: 'Damage Assessment Report',
      description: 'Comprehensive roof damage analysis with AI-powered insights',
      icon: FileText,
      color: 'bg-red-500',
      gradient: 'from-red-50 to-red-100',
      borderColor: 'border-red-200',
      features: ['AI Damage Detection', 'Priority Matrix', 'Cost Estimates', 'Photo Gallery'],
      mockupImage: '/api/placeholder/400/300',
      estimatedTime: '15 minutes',
      complexity: 'Standard'
    },
    'inspection-report': {
      title: 'Professional Inspection Report',
      description: 'Detailed roof inspection with maintenance recommendations',
      icon: Eye,
      color: 'bg-blue-500',
      gradient: 'from-blue-50 to-blue-100',
      borderColor: 'border-blue-200',
      features: ['Full Roof Assessment', 'Structural Analysis', 'Maintenance Plan', 'Warranty Info'],
      mockupImage: '/api/placeholder/400/300',
      estimatedTime: '20 minutes',
      complexity: 'Standard'
    },
    'project-proposal': {
      title: 'Project Proposal',
      description: 'Complete project proposal with scope, timeline, and pricing',
      icon: Layers,
      color: 'bg-green-500',
      gradient: 'from-green-50 to-green-100',
      borderColor: 'border-green-200',
      features: ['Scope of Work', 'Timeline', 'Materials', 'Pricing Breakdown'],
      mockupImage: '/api/placeholder/400/300',
      estimatedTime: '25 minutes',
      complexity: 'Comprehensive'
    },
    'case-study': {
      title: 'Project Case Study',
      description: 'Before/after showcase with customer success story',
      icon: Star,
      color: 'bg-purple-500',
      gradient: 'from-purple-50 to-purple-100',
      borderColor: 'border-purple-200',
      features: ['Before/After Gallery', 'Customer Story', 'Testimonials', 'Results'],
      mockupImage: '/api/placeholder/400/300',
      estimatedTime: '30 minutes',
      complexity: 'Premium'
    }
  };

  const report = reportTypes[reportType];
  const Icon = report.icon;

  return (
    <div
      className={`relative group cursor-pointer rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
        selected 
          ? `${report.borderColor} ring-4 ring-${report.color.replace('bg-', '').replace('-500', '')}-200 shadow-xl` 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
      }`}
      onClick={() => onSelect(reportType)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Premium Badge */}
      {report.complexity === 'Premium' && (
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <Star className="w-3 h-3" />
            Premium
          </div>
        </div>
      )}

      {/* Mockup Preview */}
      <div className="relative h-48 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${report.gradient} opacity-90`}></div>
        
        {/* Sample Report Preview */}
        <div className="absolute inset-4 bg-white rounded-lg shadow-lg p-4 transform transition-transform duration-300 group-hover:scale-105">
          {/* Mock Header */}
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-8 h-8 ${report.color} rounded-lg flex items-center justify-center`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="h-2 bg-gray-300 rounded w-20 mb-1"></div>
              <div className="h-1.5 bg-gray-200 rounded w-16"></div>
            </div>
          </div>

          {/* Mock Content */}
          <div className="space-y-2">
            <div className="h-1.5 bg-gray-300 rounded w-full"></div>
            <div className="h-1.5 bg-gray-200 rounded w-3/4"></div>
            <div className="h-1.5 bg-gray-200 rounded w-1/2"></div>
          </div>

          {/* Mock Chart/Image */}
          <div className="mt-3 h-12 bg-gradient-to-r from-gray-100 to-gray-200 rounded flex items-center justify-center">
            <div className="w-6 h-6 bg-gray-300 rounded"></div>
          </div>

          {/* Hover Overlay */}
          {hovering && (
            <div className="absolute inset-0 bg-black bg-opacity-10 rounded-lg flex items-center justify-center">
              <div className="bg-white rounded-full p-2 shadow-lg">
                <Eye className="w-4 h-4 text-gray-600" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{report.title}</h3>
            <p className="text-sm text-gray-600 line-clamp-2">{report.description}</p>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {report.features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2 text-xs text-gray-600">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{report.estimatedTime}</span>
          </div>
          <div className="flex items-center gap-1">
            <Building className="w-3 h-3" />
            <span>{report.complexity}</span>
          </div>
        </div>

        {/* Selection Indicator */}
        {selected && (
          <div className="mt-4 flex items-center justify-center">
            <div className={`${report.color} text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2`}>
              <CheckCircle className="w-4 h-4" />
              Selected
            </div>
          </div>
        )}
      </div>

      {/* Actions (visible on hover) */}
      {hovering && !selected && (
        <div className="absolute bottom-6 right-6">
          <div className="bg-white rounded-full shadow-lg p-2">
            <div className="flex items-center gap-2">
              <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                <Eye className="w-4 h-4 text-gray-600" />
              </button>
              <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                <Edit className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportCardPreview;
