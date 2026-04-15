/**
 * CRM Integration Module
 *
 * Connects the BuildForge website quote form to the
 * ProductEngineering-1 CRM's public intake API.
 */

// Types matching CRM intake API
interface CRMContact {
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
}

interface CRMIntakeRequest {
  contact: CRMContact;
  buildingSpecs: Record<string, unknown>;
  configuration: Record<string, unknown>;
  source: string;
  utm?: Record<string, string>;
}

interface CRMIntakeResponse {
  leadId: string;
  message: string;
}

interface CRMErrorResponse {
  error: string;
  field?: string;
  retryAfter?: number;
}

// Website form data type
export interface WebsiteFormData {
  fullName: string;
  email: string;
  phone: string;
  contactMethod: string;
  projectType: string;
  buildingPurpose: string;
  city: string;
  state: string;
  zipCode: string;
  startTiming: string;
  structureType: string;
  length: string;
  width: string;
  height: string;
  roofStyle: string;
  doors: string;
  insulation: string;
  sitePrepared: string;
  foundation: string;
  budget: string;
  additionalNotes: string;
  agree: boolean;
}

/**
 * Get UTM parameters from URL
 */
function getUTMParams(): Record<string, string> | undefined {
  if (typeof window === 'undefined') return undefined;

  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};

  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(key => {
    const value = params.get(key);
    if (value) utm[key] = value;
  });

  return Object.keys(utm).length > 0 ? utm : undefined;
}

/**
 * Transform website form data to CRM intake format
 */
export function transformFormToCRM(formData: WebsiteFormData): CRMIntakeRequest {
  return {
    contact: {
      name: formData.fullName,
      email: formData.email,
      phone: formData.phone || undefined,
    },
    buildingSpecs: {
      projectType: formData.projectType,
      buildingPurpose: formData.buildingPurpose || undefined,
      structureType: formData.structureType,
      dimensions: {
        length: formData.length ? Number(formData.length) : null,
        width: formData.width ? Number(formData.width) : null,
        height: formData.height ? Number(formData.height) : null,
      },
      roofStyle: formData.roofStyle,
      insulation: formData.insulation,
      doors: formData.doors || undefined,
    },
    configuration: {
      location: {
        city: formData.city || undefined,
        state: formData.state || undefined,
        zipCode: formData.zipCode || undefined,
      },
      sitePreparation: {
        sitePrepared: formData.sitePrepared,
        foundation: formData.foundation,
      },
      budget: formData.budget,
      startTiming: formData.startTiming,
      contactMethod: formData.contactMethod,
      additionalNotes: formData.additionalNotes || undefined,
    },
    source: 'buildforge_website',
    utm: getUTMParams(),
  };
}

/**
 * Submit form data to CRM intake API
 *
 * @throws Error if submission fails
 */
export async function submitToCRM(formData: WebsiteFormData): Promise<CRMIntakeResponse> {
  const crmApiUrl = import.meta.env.VITE_CRM_API_URL || 'http://localhost:3000';

  const payload = transformFormToCRM(formData);

  const response = await fetch(`${crmApiUrl}/api/public/intake`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData: CRMErrorResponse = await response.json().catch(() => ({
      error: `Request failed with status ${response.status}`,
    }));

    if (response.status === 429 && errorData.retryAfter) {
      throw new Error(`Too many requests. Please try again in ${Math.ceil(errorData.retryAfter / 60)} minutes.`);
    }

    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Get CRM builder URL
 */
export function getCRMBuilderUrl(): string {
  const crmApiUrl = import.meta.env.VITE_CRM_API_URL || 'http://localhost:3000';
  return `${crmApiUrl}/builder`;
}
