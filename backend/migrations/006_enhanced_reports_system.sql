-- Enhanced Reports System Migration
-- Create tables for comprehensive report generation with AI integration

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Reports table for storing report configurations and content
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL, -- damage-assessment, inspection-report, project-proposal, case-study
    config JSONB NOT NULL DEFAULT '{}', -- Report configuration (sections, branding, customizations)
    content JSONB NOT NULL DEFAULT '{}', -- AI-generated and custom content by section
    business_profile JSONB DEFAULT '{}', -- Snapshot of business profile at time of creation
    status VARCHAR(20) DEFAULT 'draft', -- draft, generated, sent, viewed
    pdf_url VARCHAR(255), -- URL to generated PDF
    share_url VARCHAR(255), -- Public sharing URL
    sent_at TIMESTAMP,
    viewed_at TIMESTAMP, -- When lead first viewed the report
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- AI content generations tracking
CREATE TABLE IF NOT EXISTS ai_generations (
    id SERIAL PRIMARY KEY,
    section VARCHAR(100) NOT NULL, -- Section identifier (executive_summary, damage_analysis, etc.)
    prompt TEXT NOT NULL, -- The prompt used for generation
    content TEXT NOT NULL, -- Generated content
    report_id UUID, -- Associated report (optional)
    lead_id UUID, -- Associated lead (optional)
    model_used VARCHAR(50) DEFAULT 'default', -- AI model identifier
    generation_time_ms INTEGER, -- Time taken to generate
    tokens_used INTEGER, -- Tokens consumed
    cost_cents INTEGER, -- Cost in cents
    quality_score FLOAT, -- AI-assessed quality score
    prompt_signature TEXT, -- Hash of prompt + context for caching
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE SET NULL,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
);

-- Report sections templates and configurations
CREATE TABLE IF NOT EXISTS report_section_templates (
    id SERIAL PRIMARY KEY,
    section_id VARCHAR(100) UNIQUE NOT NULL, -- executive_summary, damage_analysis, etc.
    title VARCHAR(200) NOT NULL,
    description TEXT,
    default_prompt TEXT,
    ai_enabled BOOLEAN DEFAULT true,
    required_for_types TEXT[], -- Array of report types that require this section
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Report views and interactions tracking
CREATE TABLE IF NOT EXISTS report_interactions (
    id SERIAL PRIMARY KEY,
    report_id UUID NOT NULL,
    interaction_type VARCHAR(50) NOT NULL, -- viewed, downloaded, shared, edited
    user_agent TEXT,
    ip_address INET,
    lead_viewed BOOLEAN DEFAULT false, -- Whether this was viewed by the lead
    duration_seconds INTEGER, -- Time spent viewing
    metadata JSONB DEFAULT '{}', -- Additional interaction data
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- Report sharing and access control
CREATE TABLE IF NOT EXISTS report_shares (
    id SERIAL PRIMARY KEY,
    report_id UUID NOT NULL,
    share_token VARCHAR(64) UNIQUE NOT NULL, -- Random token for public access
    lead_id UUID, -- Lead this share is intended for
    expires_at TIMESTAMP, -- Optional expiration
    password_hash VARCHAR(255), -- Optional password protection
    access_count INTEGER DEFAULT 0,
    max_access_count INTEGER, -- Optional access limit
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
);

-- Report delivery tracking
CREATE TABLE IF NOT EXISTS report_deliveries (
    id SERIAL PRIMARY KEY,
    report_id UUID NOT NULL,
    lead_id UUID NOT NULL,
    delivery_method VARCHAR(20) NOT NULL, -- email, sms, link, download
    delivery_address VARCHAR(255), -- Email address, phone number, etc.
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, delivered, failed, opened
    delivery_metadata JSONB DEFAULT '{}', -- Provider response, tracking info, etc.
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- Insert default section templates
INSERT INTO report_section_templates (section_id, title, description, default_prompt, display_order) VALUES
('executive_summary', 'Executive Summary', 'AI-generated overview of findings and recommendations', 'Create a professional executive summary for a roofing assessment report. Include key findings, severity level, and main recommendations. Keep it concise but compelling for homeowners.', 1),
('property_overview', 'Property Overview', 'Basic property information and context', 'Generate a property overview section describing the property characteristics, location context, and relevant background information for the roofing assessment.', 2),
('damage_analysis', 'Damage Analysis', 'Detailed breakdown of identified issues', 'Generate a detailed damage analysis section for a roof inspection report. Include specific damage types found, their causes, and potential implications if left unaddressed. Use professional yet accessible language.', 3),
('inspection_findings', 'Inspection Findings', 'Comprehensive inspection results', 'Create detailed inspection findings covering all aspects of the roof assessment, including structural elements, materials condition, and any areas of concern.', 3),
('recommendations', 'Recommendations', 'Prioritized action items and solutions', 'Create prioritized recommendations for roof repairs based on the damage assessment. Include immediate actions, medium-term maintenance, and preventive measures. Format as a clear action plan.', 4),
('cost_estimates', 'Cost Estimates', 'Transparent pricing breakdown', 'Generate a professional cost estimates section that explains pricing factors, provides ranges, and emphasizes value. Make it clear and trustworthy without specific dollar amounts.', 5),
('scope_of_work', 'Scope of Work', 'Detailed project specifications', 'Create a comprehensive scope of work section outlining all project phases, materials, labor, and deliverables for the proposed roofing project.', 3),
('timeline', 'Project Timeline', 'Realistic project scheduling', 'Generate a realistic project timeline section breaking down the roofing project phases, key milestones, and estimated completion dates.', 4),
('materials_overview', 'Materials Overview', 'Specifications and quality information', 'Create a materials overview section describing the roofing materials to be used, their quality ratings, warranties, and benefits.', 5),
('before_after_gallery', 'Before & After Gallery', 'Visual project showcase', 'This section displays before and after photos to showcase the transformation and quality of work.', 6),
('customer_story', 'Customer Success Story', 'Relatable before/after experience narrative', 'Write an engaging customer success story about a similar roofing project. Focus on the customer initial concerns, the solution process, and their satisfaction with results. Make it relatable to homeowners.', 7),
('testimonials', 'Customer Testimonials', 'Social proof and reviews', 'This section includes customer testimonials and reviews to build trust and credibility.', 8),
('company_profile', 'Company Profile', 'Business credentials and expertise', 'This section highlights the company background, certifications, experience, and unique value propositions.', 9),
('next_steps', 'Next Steps', 'Clear path forward for the customer', 'Create a clear next steps section that guides the homeowner through the process of moving forward. Include consultation booking, timeline expectations, and what to expect.', 10),
('project_overview', 'Project Overview', 'High-level project description', 'Generate a project overview section summarizing the completed work, challenges addressed, and overall project scope.', 2),
('challenges', 'Challenges & Solutions', 'Problem-solving showcase', 'Create a challenges and solutions section highlighting specific problems encountered and how they were expertly resolved.', 3),
('solutions', 'Our Solutions', 'Approach and methodology', 'Detail the specific solutions and approaches used to address the roofing challenges, emphasizing expertise and quality.', 4),
('results', 'Project Results', 'Outcome and impact summary', 'Summarize the successful project outcomes, improvements achieved, and long-term benefits for the homeowner.', 8),
('maintenance_schedule', 'Maintenance Schedule', 'Ongoing care recommendations', 'Create a maintenance schedule section with recommended care activities, timing, and tips to extend roof life.', 6)
ON CONFLICT (section_id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reports_lead_id ON reports(lead_id);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

CREATE INDEX IF NOT EXISTS idx_ai_generations_report_id ON ai_generations(report_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_lead_id ON ai_generations(lead_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_section ON ai_generations(section);
CREATE INDEX IF NOT EXISTS idx_ai_generations_timestamp ON ai_generations(timestamp);

CREATE INDEX IF NOT EXISTS idx_report_interactions_report_id ON report_interactions(report_id);
CREATE INDEX IF NOT EXISTS idx_report_interactions_type ON report_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_report_interactions_timestamp ON report_interactions(timestamp);

CREATE INDEX IF NOT EXISTS idx_report_shares_token ON report_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_report_shares_report_id ON report_shares(report_id);
CREATE INDEX IF NOT EXISTS idx_report_shares_lead_id ON report_shares(lead_id);

CREATE INDEX IF NOT EXISTS idx_report_deliveries_report_id ON report_deliveries(report_id);
CREATE INDEX IF NOT EXISTS idx_report_deliveries_lead_id ON report_deliveries(lead_id);
CREATE INDEX IF NOT EXISTS idx_report_deliveries_status ON report_deliveries(status);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_reports_updated_at ON reports;
CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_report_section_templates_updated_at ON report_section_templates;
CREATE TRIGGER update_report_section_templates_updated_at
    BEFORE UPDATE ON report_section_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
