import React, { useMemo } from 'react';
import { resolveReportTokens } from '../utils/reportTokens';

const SECTION_LABELS = {
  executive_summary: 'Executive Summary',
  property_overview: 'Property Overview',
  damage_analysis: 'Damage Analysis',
  inspection_findings: 'Inspection Findings',
  recommendations: 'Recommendations',
  maintenance_schedule: 'Maintenance Schedule',
  cost_estimates: 'Cost Estimates',
  before_after_gallery: 'Before & After Gallery',
  customer_story: 'Customer Story',
  testimonials: 'Testimonials',
  company_profile: 'Company Profile',
  next_steps: 'Next Steps',
  scope_of_work: 'Scope of Work',
  timeline: 'Project Timeline',
  materials_overview: 'Materials Overview',
  project_overview: 'Project Overview',
  challenges: 'Challenges',
  solutions: 'Solutions',
  results: 'Results',
};

const formatParagraphs = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'object') {
    return Object.values(value).flatMap((nested) => formatParagraphs(nested));
  }
  return String(value)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
};

const ReportSection = ({ title, content, accentColor }) => {
  if (!content || (Array.isArray(content) && content.length === 0)) {
    return null;
  }

  const paragraphs = formatParagraphs(content);
  if (!paragraphs.length && typeof content === 'object') {
    return null;
  }

  return (
    <section className="mb-8 last:mb-0">
      <header className="flex items-center gap-3 mb-4">
        <div
          className="w-1.5 h-6 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
        <h3 className="text-xl font-semibold text-gray-900 tracking-tight">{title}</h3>
      </header>
      <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
        {paragraphs.length > 0 ? (
          paragraphs.map((paragraph, idx) => (
            <p key={`${title}-paragraph-${idx}`}>{paragraph}</p>
          ))
        ) : (
          <p>{typeof content === 'string' ? content : JSON.stringify(content)}</p>
        )}
      </div>
    </section>
  );
};

const ReportCanvas = ({
  config,
  content,
  businessProfile,
  lead,
  className,
  hideShadow = false,
  resolvedContentOverride,
}) => {
  const accentColor = config?.customizations?.accentColor || config?.branding?.primaryColor || '#2563eb';
  const secondaryColor =
    config?.customizations?.secondaryColor ||
    config?.branding?.secondaryColor ||
    '#1f2937';
  const fontFamily =
    config?.branding?.fontStyle ||
    businessProfile?.branding?.fontFamily ||
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  const resolvedContent = useMemo(() => {
    if (resolvedContentOverride) {
      return resolvedContentOverride;
    }
    return resolveReportTokens({
      content,
      config,
      businessProfile,
      lead,
    });
  }, [content, config, businessProfile, lead, resolvedContentOverride]);

  const activeSections = useMemo(() => {
    const sectionsConfig = config?.sections || {};
    const entries = Object.entries(sectionsConfig)
      .filter(([, value]) => value?.enabled !== false)
      .map(([key]) => key);

    if (!entries.length) {
      return Object.keys(resolvedContent || {});
    }
    return entries;
  }, [config?.sections, resolvedContent]);

  const company = businessProfile?.company || {};
  const branding = businessProfile?.branding || {};
  const services = businessProfile?.services || {};

  const heroDetails = [
    lead?.address || lead?.property_address,
    lead?.city && lead?.state ? `${lead.city}, ${lead.state}` : null,
    lead?.zip_code || lead?.zipCode,
  ]
    .filter(Boolean)
    .join(', ');

  const contactItems = [
    company.phone || company.office_phone,
    company.email || company.contact_email,
    company.website,
  ].filter(Boolean);

  const galleryImages =
    lead?.imagery?.filter((image) => image && (image.url || image.src)).slice(0, 6) || [];

  return (
    <div
      className={[
        'bg-white text-gray-900 max-w-full',
        hideShadow ? '' : 'shadow-lg ring-1 ring-black/5',
        className || '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ fontFamily }}
    >
      <div className="border-b" style={{ borderColor: `${accentColor}33` }}>
        <div className="p-6 bg-white flex justify-between items-start gap-6">
          <div>
            <p
              className="uppercase text-xs font-medium tracking-[0.2em] text-gray-500 mb-2"
              style={{ color: secondaryColor }}
            >
              {config?.type?.replace(/-/g, ' ').toUpperCase() || 'ROOFING REPORT'}
            </p>
            <h1 className="text-3xl font-semibold text-gray-900 mb-3 leading-tight">
              {config?.template === 'proposal'
                ? 'Project Proposal'
                : 'Professional Roofing Report'}
            </h1>
            {heroDetails && (
              <p className="text-sm text-gray-600 max-w-xl leading-relaxed">{heroDetails}</p>
            )}
            {lead?.homeowner_name && (
              <p className="text-sm text-gray-600 mt-1">
                Prepared for <strong className="font-semibold">{lead.homeowner_name}</strong>
              </p>
            )}
          </div>
          <div className="text-right space-y-2">
            {config?.branding?.includeLogo && (branding.logo || company.logo_url) && (
              <img
                src={branding.logo || company.logo_url}
                alt={`${company.name || 'Company'} logo`}
                className="max-h-12 object-contain ml-auto"
              />
            )}
            <div className="text-sm text-gray-500 space-y-1">
              <p className="font-semibold text-gray-800">{company.name || 'Your Roofing Company'}</p>
              {contactItems.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>
        </div>
        <div
          className="h-2"
          style={{ backgroundImage: `linear-gradient(90deg, ${accentColor}, ${secondaryColor})` }}
        />
      </div>

      <div className="p-8 space-y-10">
        {activeSections.map((sectionKey) => {
          if (sectionKey === 'before_after_gallery' && galleryImages.length) {
            return (
              <section key={sectionKey} className="mb-8 last:mb-0">
                <header className="flex items-center gap-3 mb-4">
                  <div
                    className="w-1.5 h-6 rounded-full"
                    style={{ backgroundColor: accentColor }}
                  />
                  <h3 className="text-xl font-semibold text-gray-900 tracking-tight">
                    {SECTION_LABELS[sectionKey] || 'Gallery'}
                  </h3>
                </header>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {galleryImages.map((image) => (
                    <figure
                      key={image.id || image.url || image.src}
                      className="relative overflow-hidden rounded-lg border border-gray-100 bg-gray-50"
                    >
                      <img
                        src={image.url || image.src}
                        alt={image.label || 'Report imagery'}
                        className="w-full h-40 object-cover"
                      />
                      {image.label && (
                        <figcaption className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-xs px-2 py-1">
                          {image.label}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              </section>
            );
          }

          if (sectionKey === 'cost_estimates' && services) {
            const costContent = resolvedContent?.[sectionKey];
            const serviceCards = [
              {
                title: 'Inspection',
                primary: services.inspections?.basic?.price,
                secondary: services.inspections?.comprehensive?.price,
                footnote: services.inspections?.description,
              },
              {
                title: 'Repairs',
                primary: services.repairs?.minor?.priceRange,
                secondary: services.repairs?.major?.priceRange,
                footnote: services.repairs?.description,
              },
            ].filter(
              (card) =>
                card.primary ||
                card.secondary ||
                (Array.isArray(card.primary) && card.primary.length) ||
                (Array.isArray(card.secondary) && card.secondary.length),
            );

            return (
              <section key={sectionKey} className="mb-8 last:mb-0">
                <header className="flex items-center gap-3 mb-4">
                  <div
                    className="w-1.5 h-6 rounded-full"
                    style={{ backgroundColor: accentColor }}
                  />
                  <h3 className="text-xl font-semibold text-gray-900 tracking-tight">
                    {SECTION_LABELS[sectionKey] || 'Cost Estimates'}
                  </h3>
                </header>
                {costContent && (
                  <div className="mb-4 text-gray-700 text-sm leading-relaxed space-y-4">
                    {formatParagraphs(costContent).map((paragraph, idx) => (
                      <p key={`cost-paragraph-${idx}`}>{paragraph}</p>
                    ))}
                  </div>
                )}
                {serviceCards.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {serviceCards.map((card) => (
                      <div
                        key={card.title}
                        className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                      >
                        <p className="text-sm font-semibold text-gray-900 mb-2">{card.title}</p>
                        {card.primary && (
                          <p className="text-sm text-gray-700">
                            Primary:{' '}
                            {Array.isArray(card.primary)
                              ? `$${card.primary[0]} - $${card.primary[1]}`
                              : `$${card.primary}`}
                          </p>
                        )}
                        {card.secondary && (
                          <p className="text-sm text-gray-700">
                            Secondary:{' '}
                            {Array.isArray(card.secondary)
                              ? `$${card.secondary[0]} - $${card.secondary[1]}`
                              : `$${card.secondary}`}
                          </p>
                        )}
                        {card.footnote && (
                          <p className="text-xs text-gray-500 mt-2 leading-relaxed">{card.footnote}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          }

          return (
            <ReportSection
              key={sectionKey}
              title={SECTION_LABELS[sectionKey] || sectionKey.replace(/_/g, ' ')}
              content={resolvedContent?.[sectionKey]}
              accentColor={accentColor}
            />
          );
        })}
      </div>

      <footer className="px-8 pb-8">
        <div
          className="rounded-xl px-6 py-5 text-sm text-white flex flex-wrap items-center justify-between gap-4"
          style={{ backgroundImage: `linear-gradient(135deg, ${accentColor}, ${secondaryColor})` }}
        >
          <div>
            <p className="uppercase text-[11px] tracking-[0.2em] text-white/80">
              Prepared by {company.name || 'Roofing Specialist'}
            </p>
            <p className="text-base font-semibold text-white mt-1">
              {company.tagline || 'High-trust roofing, delivered on your schedule.'}
            </p>
          </div>
          <div className="text-right space-y-1">
            {contactItems.map((item) => (
              <p key={`cta-${item}`} className="font-medium">
                {item}
              </p>
            ))}
            {company.address && (
              <p className="text-xs text-white/80">{company.address}</p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default React.memo(ReportCanvas);
