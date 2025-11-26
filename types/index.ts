export interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  profileImage?: string
  role: 'admin' | 'sales' | 'pm' | 'install_crew'
  createdAt: string
}

export interface Lead {
  id: string
  companyName: string
  contactName: string
  email?: string
  phone?: string
  source: string
  temperature: 'cold' | 'warm' | 'hot' | 'fire'
  stage: 'new' | 'contacted' | 'quote_sent' | 'negotiating' | 'won' | 'lost' | 'no_show_nurture'
  assignedTo?: string
  buildingSpecs?: {
    width?: number
    length?: number
    height?: number
    roofStyle?: string
    color?: string
  }
  aiNotes?: string
  aiFirstMessage?: string
  deposit?: boolean
  createdAt: string
  updatedAt: string
}

export interface Deal {
  id: string
  leadId: string
  buildingWidth?: number
  buildingLength?: number
  buildingHeight?: number
  roofStyle?: string
  color?: string
  cost?: number
  price?: number
  margin?: number
  contractStatus: 'pending' | 'signed' | 'sent'
  depositPaid: boolean
  depositAmount?: number
  screenshot3d?: string
  createdAt: string
}

export interface Activity {
  id: string
  leadId: string
  userId: string
  type: 'call' | 'email' | 'sms' | 'note' | 'meeting' | 'auto_message'
  content: string
  metadata?: Record<string, any>
  createdAt: string
}

export interface AutomationRule {
  id: string
  name: string
  trigger: string
  action: string
  enabled: boolean
  createdAt: string
}

export interface PricingRule {
  id: string
  name: string
  conditions: {
    minWidth?: number
    maxWidth?: number
    roofStyle?: string
    [key: string]: any
  }
  formula: {
    baseCost?: number
    perSqFt?: number
    margin?: number
  }
  createdAt: string
}

export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}
