import React, { useState } from 'react';
import {
  Camera, Upload, Star, Award, TrendingUp, Home, Users,
  Plus, Trash2, Edit, Eye, Download, Share, ExternalLink,
  Image, Video, FileText, CheckCircle, AlertCircle, Loader,
  BarChart3, Target, Heart, MessageSquare, Calendar, MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';

const CaseStudyManager = ({ caseStudies = [], onAdd, onRemove, onEdit, businessProfile }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCase, setEditingCase] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  const defaultCaseStudy = {
    title: '',
    description: '',
    projectType: 'roof-replacement',
    location: '',
    duration: '',
    challengesFaced: '',
    solutionsProvided: '',
    resultsAchieved: '',
    customerTestimonial: '',
    beforeImages: [],
    afterImages: [],
    progressImages: [],
    projectValue: '',
    completionDate: '',
    materials: [],
    teamSize: '',
    customerRating: 5,
    featured: false,
    tags: []
  };

  const projectTypes = [
    { value: 'roof-replacement', label: 'Complete Roof Replacement', icon: Home },
    { value: 'storm-damage', label: 'Storm Damage Repair', icon: AlertCircle },
    { value: 'maintenance', label: 'Maintenance & Inspection', icon: CheckCircle },
    { value: 'emergency', label: 'Emergency Repair', icon: TrendingUp },
    { value: 'commercial', label: 'Commercial Project', icon: Building2 },
    { value: 'restoration', label: 'Historic Restoration', icon: Award }
  ];

  const handleAddCaseStudy = (caseStudyData) => {
    const newCaseStudy = {
      ...caseStudyData,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      featured: caseStudies.length === 0 // Make first case study featured
    };
    onAdd(newCaseStudy);
    setShowAddModal(false);
    toast.success('Case study added successfully!');
  };

  const handleEditCaseStudy = (caseStudyData) => {
    onEdit(editingCase.id, caseStudyData);
    setEditingCase(null);
    toast.success('Case study updated successfully!');
  };

  const generateBrandedReport = async (caseStudy) => {
    setGeneratingReport(true);
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const reportData = {
        caseStudy,
        businessProfile,
        generatedAt: new Date().toISOString(),
        reportId: `REPORT_${caseStudy.id}_${Date.now()}`
      };

      // In real app, this would call your report generation API
      console.log('Generated Report Data:', reportData);
      
      // Simulate download
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `case-study-report-${caseStudy.title.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      link.click();
      
      toast.success('Branded report generated and downloaded!');
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-900">Portfolio & Case Studies</h3>
          <p className="text-slate-600">Showcase your best work and generate branded reports</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg"
        >
          <Plus size={20} />
          <span>Add Case Study</span>
        </button>
      </div>

      {/* Case Studies Grid */}
      {caseStudies.length === 0 ? (
        <EmptyCaseStudiesState onAdd={() => setShowAddModal(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {caseStudies.map((caseStudy) => (
            <CaseStudyCard
              key={caseStudy.id}
              caseStudy={caseStudy}
              onEdit={(cs) => setEditingCase(cs)}
              onView={(cs) => setSelectedCase(cs)}
              onRemove={() => onRemove(caseStudy.id)}
              onGenerateReport={() => generateBrandedReport(caseStudy)}
              generatingReport={generatingReport}
              businessProfile={businessProfile}
            />
          ))}
        </div>
      )}

      {/* Add Case Study Modal */}
      {showAddModal && (
        <CaseStudyModal
          title="Add New Case Study"
          caseStudy={defaultCaseStudy}
          projectTypes={projectTypes}
          onSave={handleAddCaseStudy}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Edit Case Study Modal */}
      {editingCase && (
        <CaseStudyModal
          title="Edit Case Study"
          caseStudy={editingCase}
          projectTypes={projectTypes}
          onSave={handleEditCaseStudy}
          onClose={() => setEditingCase(null)}
        />
      )}

      {/* Case Study Detail Modal */}
      {selectedCase && (
        <CaseStudyDetailModal
          caseStudy={selectedCase}
          businessProfile={businessProfile}
          onClose={() => setSelectedCase(null)}
          onGenerateReport={() => generateBrandedReport(selectedCase)}
          generatingReport={generatingReport}
        />
      )}
    </div>
  );
};

// Empty State Component
const EmptyCaseStudiesState = ({ onAdd }) => (
  <div className="text-center py-16 bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl">
    <Camera size={64} className="mx-auto text-slate-300 mb-6" />
    <h3 className="text-xl font-bold text-slate-900 mb-2">No Case Studies Yet</h3>
    <p className="text-slate-600 mb-6 max-w-md mx-auto">
      Start building your portfolio by adding your first case study. Upload before/after photos 
      and create professional reports to showcase your expertise.
    </p>
    <button
      onClick={onAdd}
      className="flex items-center space-x-2 mx-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
    >
      <Plus size={20} />
      <span>Add Your First Case Study</span>
    </button>
  </div>
);

// Case Study Card Component
const CaseStudyCard = ({ 
  caseStudy, 
  onEdit, 
  onView, 
  onRemove, 
  onGenerateReport, 
  generatingReport,
  businessProfile 
}) => {
  const projectType = projectTypes.find(pt => pt.value === caseStudy.projectType);
  const ProjectIcon = projectType?.icon || Home;

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
      {/* Image Section */}
      <div className="relative h-48">
        {caseStudy.afterImages?.[0] ? (
          <img
            src={caseStudy.afterImages[0]}
            alt={caseStudy.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = `https://via.placeholder.com/400x200/e2e8f0/64748b?text=Case+Study`;
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
            <ProjectIcon size={48} className="text-slate-400" />
          </div>
        )}
        
        {/* Featured Badge */}
        {caseStudy.featured && (
          <div className="absolute top-3 right-3 bg-amber-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center space-x-1">
            <Star size={12} />
            <span>Featured</span>
          </div>
        )}

        {/* Project Type Badge */}
        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium">
          {projectType?.label || 'Project'}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4">
        <h4 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">
          {caseStudy.title}
        </h4>
        <p className="text-sm text-slate-600 mb-3 line-clamp-2">
          {caseStudy.description}
        </p>

        {/* Project Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-slate-900">
              {caseStudy.customerRating || 5}
            </div>
            <div className="text-xs text-slate-500">Rating</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-slate-900">
              {caseStudy.projectValue ? `$${parseInt(caseStudy.projectValue).toLocaleString()}` : 'N/A'}
            </div>
            <div className="text-xs text-slate-500">Value</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onView(caseStudy)}
            className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm transition-colors"
          >
            <Eye size={14} />
            <span>View</span>
          </button>
          <button
            onClick={() => onEdit(caseStudy)}
            className="flex items-center justify-center px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={() => onGenerateReport(caseStudy)}
            disabled={generatingReport}
            className="flex items-center justify-center px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {generatingReport ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
          </button>
          <button
            onClick={() => onRemove(caseStudy)}
            className="flex items-center justify-center px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Case Study Modal Component
const CaseStudyModal = ({ title, caseStudy, projectTypes, onSave, onClose }) => {
  const [formData, setFormData] = useState(caseStudy);
  const [activeSection, setActiveSection] = useState('basic');
  const [uploading, setUploading] = useState(false);

  const sections = [
    { id: 'basic', label: 'Basic Info', icon: FileText },
    { id: 'images', label: 'Images', icon: Camera },
    { id: 'details', label: 'Project Details', icon: Award },
    { id: 'results', label: 'Results & Testimonial', icon: Star }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayInputChange = (field, value) => {
    const items = value.split(',').map(item => item.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, [field]: items }));
  };

  const handleImageUpload = async (file, category) => {
    setUploading(true);
    try {
      // Mock file upload
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockUrl = URL.createObjectURL(file);
      
      setFormData(prev => ({
        ...prev,
        [`${category}Images`]: [...(prev[`${category}Images`] || []), mockUrl]
      }));
      
      toast.success(`${category} image uploaded!`);
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          
          {/* Section Tabs */}
          <div className="flex space-x-1 mt-4">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeSection === section.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <section.icon size={16} />
                <span>{section.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {activeSection === 'basic' && (
            <BasicInfoSection formData={formData} onChange={handleInputChange} projectTypes={projectTypes} />
          )}
          {activeSection === 'images' && (
            <ImagesSection formData={formData} onChange={handleInputChange} onUpload={handleImageUpload} uploading={uploading} />
          )}
          {activeSection === 'details' && (
            <ProjectDetailsSection formData={formData} onChange={handleInputChange} onArrayChange={handleArrayInputChange} />
          )}
          {activeSection === 'results' && (
            <ResultsSection formData={formData} onChange={handleInputChange} />
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200 p-6 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Save Case Study
          </button>
        </div>
      </div>
    </div>
  );
};

// Form Section Components
const BasicInfoSection = ({ formData, onChange, projectTypes }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">Project Title</label>
      <input
        type="text"
        value={formData.title}
        onChange={(e) => onChange('title', e.target.value)}
        placeholder="e.g., Historic Home Roof Restoration"
        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">Project Type</label>
      <select
        value={formData.projectType}
        onChange={(e) => onChange('projectType', e.target.value)}
        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {projectTypes.map(type => (
          <option key={type.value} value={type.value}>{type.label}</option>
        ))}
      </select>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) => onChange('location', e.target.value)}
          placeholder="City, State"
          className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Duration</label>
        <input
          type="text"
          value={formData.duration}
          onChange={(e) => onChange('duration', e.target.value)}
          placeholder="e.g., 5 days"
          className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
      <textarea
        value={formData.description}
        onChange={(e) => onChange('description', e.target.value)}
        placeholder="Brief description of the project..."
        rows={3}
        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  </div>
);

const ImagesSection = ({ formData, onChange, onUpload, uploading }) => (
  <div className="space-y-6">
    {['before', 'after', 'progress'].map(category => (
      <div key={category}>
        <label className="block text-sm font-medium text-slate-700 mb-3 capitalize">
          {category} Images
        </label>
        <ImageUploadGrid
          images={formData[`${category}Images`] || []}
          onUpload={(file) => onUpload(file, category)}
          uploading={uploading}
          category={category}
        />
      </div>
    ))}
  </div>
);

const ImageUploadGrid = ({ images, onUpload, uploading, category }) => (
  <div className="grid grid-cols-3 gap-4">
    {images.map((image, index) => (
      <div key={index} className="relative aspect-square">
        <img
          src={image}
          alt={`${category} ${index + 1}`}
          className="w-full h-full object-cover rounded-lg"
        />
      </div>
    ))}
    <label className="aspect-square border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
      {uploading ? (
        <Loader size={24} className="animate-spin text-slate-400" />
      ) : (
        <>
          <Upload size={24} className="text-slate-400 mb-2" />
          <span className="text-sm text-slate-600">Add Image</span>
        </>
      )}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => onUpload(e.target.files[0])}
        className="hidden"
        disabled={uploading}
      />
    </label>
  </div>
);

const ProjectDetailsSection = ({ formData, onChange, onArrayChange }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">Challenges Faced</label>
      <textarea
        value={formData.challengesFaced}
        onChange={(e) => onChange('challengesFaced', e.target.value)}
        placeholder="What challenges did you encounter during this project?"
        rows={3}
        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">Solutions Provided</label>
      <textarea
        value={formData.solutionsProvided}
        onChange={(e) => onChange('solutionsProvided', e.target.value)}
        placeholder="How did you solve these challenges?"
        rows={3}
        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Project Value</label>
        <input
          type="number"
          value={formData.projectValue}
          onChange={(e) => onChange('projectValue', e.target.value)}
          placeholder="15000"
          className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Team Size</label>
        <input
          type="text"
          value={formData.teamSize}
          onChange={(e) => onChange('teamSize', e.target.value)}
          placeholder="e.g., 4 specialists"
          className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">Materials Used (comma-separated)</label>
      <input
        type="text"
        value={formData.materials?.join(', ') || ''}
        onChange={(e) => onArrayChange('materials', e.target.value)}
        placeholder="GAF Timberline HD, Ridge Vent, Synthetic Underlayment"
        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  </div>
);

const ResultsSection = ({ formData, onChange }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">Results Achieved</label>
      <textarea
        value={formData.resultsAchieved}
        onChange={(e) => onChange('resultsAchieved', e.target.value)}
        placeholder="What were the measurable outcomes and benefits?"
        rows={3}
        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">Customer Testimonial</label>
      <textarea
        value={formData.customerTestimonial}
        onChange={(e) => onChange('customerTestimonial', e.target.value)}
        placeholder="What did the customer say about the project?"
        rows={4}
        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Customer Rating</label>
        <select
          value={formData.customerRating}
          onChange={(e) => onChange('customerRating', parseInt(e.target.value))}
          className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {[1, 2, 3, 4, 5].map(rating => (
            <option key={rating} value={rating}>{rating} Star{rating !== 1 ? 's' : ''}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Completion Date</label>
        <input
          type="date"
          value={formData.completionDate}
          onChange={(e) => onChange('completionDate', e.target.value)}
          className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>

    <div className="flex items-center space-x-3">
      <input
        type="checkbox"
        checked={formData.featured}
        onChange={(e) => onChange('featured', e.target.checked)}
        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
      />
      <label className="text-sm font-medium text-slate-700">Feature this case study</label>
    </div>
  </div>
);

// Case Study Detail Modal Component
const CaseStudyDetailModal = ({ caseStudy, businessProfile, onClose, onGenerateReport, generatingReport }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">{caseStudy.title}</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={onGenerateReport}
              disabled={generatingReport}
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {generatingReport ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
              <span>Generate Report</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <CaseStudyDetailContent caseStudy={caseStudy} businessProfile={businessProfile} />
      </div>
    </div>
  </div>
);

const CaseStudyDetailContent = ({ caseStudy, businessProfile }) => (
  <div className="space-y-8">
    {/* Project Overview */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        {/* Image Gallery */}
        {caseStudy.afterImages?.length > 0 && (
          <div className="mb-6">
            <img
              src={caseStudy.afterImages[0]}
              alt={caseStudy.title}
              className="w-full h-64 object-cover rounded-xl"
              onError={(e) => {
                e.target.src = `https://via.placeholder.com/800x400/e2e8f0/64748b?text=Project+Image`;
              }}
            />
          </div>
        )}
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Project Description</h3>
            <p className="text-slate-700 leading-relaxed">{caseStudy.description}</p>
          </div>

          {caseStudy.challengesFaced && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Challenges</h3>
              <p className="text-slate-700 leading-relaxed">{caseStudy.challengesFaced}</p>
            </div>
          )}

          {caseStudy.solutionsProvided && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Solutions</h3>
              <p className="text-slate-700 leading-relaxed">{caseStudy.solutionsProvided}</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Project Stats */}
        <div className="bg-slate-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Project Details</h3>
          <div className="space-y-3">
            {caseStudy.location && (
              <div className="flex items-center space-x-3">
                <MapPin size={16} className="text-slate-500" />
                <span className="text-slate-700">{caseStudy.location}</span>
              </div>
            )}
            {caseStudy.duration && (
              <div className="flex items-center space-x-3">
                <Clock size={16} className="text-slate-500" />
                <span className="text-slate-700">{caseStudy.duration}</span>
              </div>
            )}
            {caseStudy.projectValue && (
              <div className="flex items-center space-x-3">
                <DollarSign size={16} className="text-slate-500" />
                <span className="text-slate-700">${parseInt(caseStudy.projectValue).toLocaleString()}</span>
              </div>
            )}
            {caseStudy.customerRating && (
              <div className="flex items-center space-x-3">
                <Star size={16} className="text-slate-500" />
                <span className="text-slate-700">{caseStudy.customerRating}/5 Stars</span>
              </div>
            )}
          </div>
        </div>

        {/* Materials Used */}
        {caseStudy.materials?.length > 0 && (
          <div className="bg-blue-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Materials Used</h3>
            <ul className="space-y-2">
              {caseStudy.materials.map((material, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <CheckCircle size={16} className="text-blue-600" />
                  <span className="text-slate-700">{material}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>

    {/* Customer Testimonial */}
    {caseStudy.customerTestimonial && (
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Customer Testimonial</h3>
        <blockquote className="text-slate-700 italic text-lg leading-relaxed">
          "{caseStudy.customerTestimonial}"
        </blockquote>
      </div>
    )}
  </div>
);

export default CaseStudyManager;