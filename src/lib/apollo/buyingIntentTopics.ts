export const BUYING_INTENT_TOPICS = [
  // Smart Home & Technology
  'Smart Home Technology',
  'Home Automation',
  'IoT Devices',
  'Energy Management',
  'Security Systems',
  'HVAC Systems',
  
  // Construction & Building
  'Construction Software',
  'Project Management Tools',
  'Building Materials',
  'Construction Equipment',
  'Contractor Services',
  
  // Business Operations
  'CRM Software',
  'Accounting Software',
  'Field Service Management',
  'Workforce Management',
  'Customer Communication',
  
  // Industry-Specific
  'Green Building',
  'Sustainable Construction',
  'Building Permits',
  'Safety Compliance',
  'Insurance Services'
] as const;

export type BuyingIntentTopic = typeof BUYING_INTENT_TOPICS[number];

// Get recommended topics based on industry
export function getRecommendedTopics(industryType: 'Builder' | 'Contractor'): string[] {
  if (industryType === 'Builder') {
    return [
      'Smart Home Technology',
      'Home Automation',
      'Construction Software',
      'Building Permits',
      'Project Management Tools'
    ];
  } else {
    return [
      'HVAC Systems',
      'Security Systems',
      'Field Service Management',
      'Contractor Services',
      'Safety Compliance'
    ];
  }
}
