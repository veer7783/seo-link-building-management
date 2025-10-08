export interface GuestBlogSite {
  id: string;
  site_url: string;
  da: number; // Domain Authority
  dr: number; // Domain Rating
  ahrefs_traffic: number;
  ss?: number; // Spam Score (optional)
  tat: string; // Turnaround Time
  category: GuestBlogSiteCategory;
  categoryDisplay: string;
  status: GuestBlogSiteStatus;
  base_price: number; // Internal base price (hidden from users)
  displayed_price: number; // What users see in table (base_price + 25% or client percentage)
  country: string;
  publisher_id: string;
  site_language: string;
  createdAt: string;
  updatedAt: string;
  publisher?: {
    id: string;
    publisherName: string;
    email?: string;
  };
  isOverride?: boolean;
}

export enum GuestBlogSiteCategory {
  BUSINESS_ENTREPRENEURSHIP = 'BUSINESS_ENTREPRENEURSHIP',
  MARKETING_SEO = 'MARKETING_SEO',
  TECHNOLOGY_GADGETS = 'TECHNOLOGY_GADGETS',
  HEALTH_FITNESS = 'HEALTH_FITNESS',
  LIFESTYLE_WELLNESS = 'LIFESTYLE_WELLNESS',
  FINANCE_INVESTMENT = 'FINANCE_INVESTMENT',
  EDUCATION_CAREER = 'EDUCATION_CAREER',
  TRAVEL_TOURISM = 'TRAVEL_TOURISM',
  FOOD_NUTRITION = 'FOOD_NUTRITION',
  REAL_ESTATE_HOME_IMPROVEMENT = 'REAL_ESTATE_HOME_IMPROVEMENT',
  AI_FUTURE_TECH = 'AI_FUTURE_TECH',
  ECOMMERCE_STARTUPS = 'ECOMMERCE_STARTUPS',
  SUSTAINABILITY_GREEN_LIVING = 'SUSTAINABILITY_GREEN_LIVING',
  PARENTING_RELATIONSHIPS = 'PARENTING_RELATIONSHIPS',
  FASHION_BEAUTY = 'FASHION_BEAUTY',
  ENTERTAINMENT_MEDIA = 'ENTERTAINMENT_MEDIA',
  SPORTS_FITNESS = 'SPORTS_FITNESS',
  GENERAL = 'GENERAL',
  OTHERS = 'OTHERS',
}

export enum GuestBlogSiteStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface CreateGuestBlogSiteRequest {
  site_url: string;
  da: number;
  dr: number;
  ahrefs_traffic: number;
  ss?: number;
  tat: string;
  category: GuestBlogSiteCategory;
  status?: GuestBlogSiteStatus;
  base_price: number;
  country: string;
  publisher_id: string;
  site_language: string;
}

export interface UpdateGuestBlogSiteRequest {
  da?: number;
  dr?: number;
  ahrefs_traffic?: number;
  ss?: number;
  tat?: string;
  category?: GuestBlogSiteCategory;
  status?: GuestBlogSiteStatus;
  base_price?: number;
  country?: string;
  publisher_id?: string;
  site_language?: string;
}

export interface GuestBlogSiteFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  country?: string;
  status?: GuestBlogSiteStatus;
  publisherId?: string;
  clientId?: string;
}

export interface GuestBlogSitePricing {
  siteId: string;
  basePrice: number;
  clientPercentage: number;
  finalPrice: number;
  isOverride: boolean;
  overridePrice?: number;
}

export interface SetPriceOverrideRequest {
  overridePrice: number;
}

// Category options for dropdowns
export const GUEST_BLOG_SITE_CATEGORIES = [
  { value: GuestBlogSiteCategory.BUSINESS_ENTREPRENEURSHIP, label: 'Business & Entrepreneurship' },
  { value: GuestBlogSiteCategory.MARKETING_SEO, label: 'Marketing & SEO' },
  { value: GuestBlogSiteCategory.TECHNOLOGY_GADGETS, label: 'Technology & Gadgets' },
  { value: GuestBlogSiteCategory.HEALTH_FITNESS, label: 'Health & Fitness' },
  { value: GuestBlogSiteCategory.LIFESTYLE_WELLNESS, label: 'Lifestyle & Wellness' },
  { value: GuestBlogSiteCategory.FINANCE_INVESTMENT, label: 'Finance & Investment' },
  { value: GuestBlogSiteCategory.EDUCATION_CAREER, label: 'Education & Career' },
  { value: GuestBlogSiteCategory.TRAVEL_TOURISM, label: 'Travel & Tourism' },
  { value: GuestBlogSiteCategory.FOOD_NUTRITION, label: 'Food & Nutrition' },
  { value: GuestBlogSiteCategory.REAL_ESTATE_HOME_IMPROVEMENT, label: 'Real Estate & Home Improvement' },
  { value: GuestBlogSiteCategory.AI_FUTURE_TECH, label: 'AI & Future Tech' },
  { value: GuestBlogSiteCategory.ECOMMERCE_STARTUPS, label: 'E-commerce & Startups' },
  { value: GuestBlogSiteCategory.SUSTAINABILITY_GREEN_LIVING, label: 'Sustainability & Green Living' },
  { value: GuestBlogSiteCategory.PARENTING_RELATIONSHIPS, label: 'Parenting & Relationships' },
  { value: GuestBlogSiteCategory.FASHION_BEAUTY, label: 'Fashion & Beauty' },
  { value: GuestBlogSiteCategory.ENTERTAINMENT_MEDIA, label: 'Entertainment & Media' },
  { value: GuestBlogSiteCategory.SPORTS_FITNESS, label: 'Sports & Fitness' },
  { value: GuestBlogSiteCategory.GENERAL, label: 'General' },
  { value: GuestBlogSiteCategory.OTHERS, label: 'Others' },
];

// Language options for dropdowns
export const SITE_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ru', label: 'Russian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ar', label: 'Arabic' },
  { value: 'hi', label: 'Hindi' },
  { value: 'bn', label: 'Bengali' },
  { value: 'ur', label: 'Urdu' },
  { value: 'id', label: 'Indonesian' },
  { value: 'ms', label: 'Malay' },
  { value: 'th', label: 'Thai' },
  { value: 'vi', label: 'Vietnamese' },
  { value: 'tr', label: 'Turkish' },
  { value: 'pl', label: 'Polish' },
  { value: 'nl', label: 'Dutch' },
  { value: 'sv', label: 'Swedish' },
  { value: 'da', label: 'Danish' },
  { value: 'no', label: 'Norwegian' },
  { value: 'fi', label: 'Finnish' },
  { value: 'cs', label: 'Czech' },
  { value: 'sk', label: 'Slovak' },
  { value: 'hu', label: 'Hungarian' },
  { value: 'ro', label: 'Romanian' },
  { value: 'bg', label: 'Bulgarian' },
  { value: 'hr', label: 'Croatian' },
  { value: 'sr', label: 'Serbian' },
  { value: 'sl', label: 'Slovenian' },
  { value: 'et', label: 'Estonian' },
  { value: 'lv', label: 'Latvian' },
  { value: 'lt', label: 'Lithuanian' },
  { value: 'mt', label: 'Maltese' },
  { value: 'ga', label: 'Irish' },
  { value: 'cy', label: 'Welsh' },
  { value: 'is', label: 'Icelandic' },
  { value: 'mk', label: 'Macedonian' },
  { value: 'sq', label: 'Albanian' },
  { value: 'eu', label: 'Basque' },
  { value: 'ca', label: 'Catalan' },
  { value: 'gl', label: 'Galician' },
];

// Country options for dropdowns
export const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'ES', label: 'Spain' },
  { value: 'IT', label: 'Italy' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'BE', label: 'Belgium' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'AT', label: 'Austria' },
  { value: 'SE', label: 'Sweden' },
  { value: 'NO', label: 'Norway' },
  { value: 'DK', label: 'Denmark' },
  { value: 'FI', label: 'Finland' },
  { value: 'IE', label: 'Ireland' },
  { value: 'PT', label: 'Portugal' },
  { value: 'GR', label: 'Greece' },
  { value: 'PL', label: 'Poland' },
  { value: 'CZ', label: 'Czech Republic' },
  { value: 'HU', label: 'Hungary' },
  { value: 'SK', label: 'Slovakia' },
  { value: 'SI', label: 'Slovenia' },
  { value: 'HR', label: 'Croatia' },
  { value: 'RO', label: 'Romania' },
  { value: 'BG', label: 'Bulgaria' },
  { value: 'EE', label: 'Estonia' },
  { value: 'LV', label: 'Latvia' },
  { value: 'LT', label: 'Lithuania' },
  { value: 'LU', label: 'Luxembourg' },
  { value: 'MT', label: 'Malta' },
  { value: 'CY', label: 'Cyprus' },
  { value: 'IS', label: 'Iceland' },
  { value: 'LI', label: 'Liechtenstein' },
  { value: 'MC', label: 'Monaco' },
  { value: 'SM', label: 'San Marino' },
  { value: 'VA', label: 'Vatican City' },
  { value: 'AD', label: 'Andorra' },
  { value: 'RU', label: 'Russia' },
  { value: 'UA', label: 'Ukraine' },
  { value: 'BY', label: 'Belarus' },
  { value: 'MD', label: 'Moldova' },
  { value: 'RS', label: 'Serbia' },
  { value: 'ME', label: 'Montenegro' },
  { value: 'BA', label: 'Bosnia and Herzegovina' },
  { value: 'MK', label: 'North Macedonia' },
  { value: 'AL', label: 'Albania' },
  { value: 'XK', label: 'Kosovo' },
  { value: 'TR', label: 'Turkey' },
  { value: 'JP', label: 'Japan' },
  { value: 'KR', label: 'South Korea' },
  { value: 'CN', label: 'China' },
  { value: 'IN', label: 'India' },
  { value: 'ID', label: 'Indonesia' },
  { value: 'MY', label: 'Malaysia' },
  { value: 'SG', label: 'Singapore' },
  { value: 'TH', label: 'Thailand' },
  { value: 'VN', label: 'Vietnam' },
  { value: 'PH', label: 'Philippines' },
  { value: 'BD', label: 'Bangladesh' },
  { value: 'PK', label: 'Pakistan' },
  { value: 'LK', label: 'Sri Lanka' },
  { value: 'NP', label: 'Nepal' },
  { value: 'BT', label: 'Bhutan' },
  { value: 'MV', label: 'Maldives' },
  { value: 'AF', label: 'Afghanistan' },
  { value: 'IR', label: 'Iran' },
  { value: 'IQ', label: 'Iraq' },
  { value: 'SA', label: 'Saudi Arabia' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'QA', label: 'Qatar' },
  { value: 'KW', label: 'Kuwait' },
  { value: 'BH', label: 'Bahrain' },
  { value: 'OM', label: 'Oman' },
  { value: 'YE', label: 'Yemen' },
  { value: 'JO', label: 'Jordan' },
  { value: 'LB', label: 'Lebanon' },
  { value: 'SY', label: 'Syria' },
  { value: 'IL', label: 'Israel' },
  { value: 'PS', label: 'Palestine' },
  { value: 'EG', label: 'Egypt' },
  { value: 'LY', label: 'Libya' },
  { value: 'TN', label: 'Tunisia' },
  { value: 'DZ', label: 'Algeria' },
  { value: 'MA', label: 'Morocco' },
  { value: 'SD', label: 'Sudan' },
  { value: 'SS', label: 'South Sudan' },
  { value: 'ET', label: 'Ethiopia' },
  { value: 'ER', label: 'Eritrea' },
  { value: 'DJ', label: 'Djibouti' },
  { value: 'SO', label: 'Somalia' },
  { value: 'KE', label: 'Kenya' },
  { value: 'UG', label: 'Uganda' },
  { value: 'TZ', label: 'Tanzania' },
  { value: 'RW', label: 'Rwanda' },
  { value: 'BI', label: 'Burundi' },
  { value: 'MZ', label: 'Mozambique' },
  { value: 'MW', label: 'Malawi' },
  { value: 'ZM', label: 'Zambia' },
  { value: 'ZW', label: 'Zimbabwe' },
  { value: 'BW', label: 'Botswana' },
  { value: 'NA', label: 'Namibia' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'LS', label: 'Lesotho' },
  { value: 'SZ', label: 'Eswatini' },
  { value: 'MG', label: 'Madagascar' },
  { value: 'MU', label: 'Mauritius' },
  { value: 'SC', label: 'Seychelles' },
  { value: 'KM', label: 'Comoros' },
  { value: 'BR', label: 'Brazil' },
  { value: 'AR', label: 'Argentina' },
  { value: 'CL', label: 'Chile' },
  { value: 'PE', label: 'Peru' },
  { value: 'CO', label: 'Colombia' },
  { value: 'VE', label: 'Venezuela' },
  { value: 'EC', label: 'Ecuador' },
  { value: 'BO', label: 'Bolivia' },
  { value: 'PY', label: 'Paraguay' },
  { value: 'UY', label: 'Uruguay' },
  { value: 'GY', label: 'Guyana' },
  { value: 'SR', label: 'Suriname' },
  { value: 'GF', label: 'French Guiana' },
  { value: 'FK', label: 'Falkland Islands' },
  { value: 'MX', label: 'Mexico' },
  { value: 'GT', label: 'Guatemala' },
  { value: 'BZ', label: 'Belize' },
  { value: 'SV', label: 'El Salvador' },
  { value: 'HN', label: 'Honduras' },
  { value: 'NI', label: 'Nicaragua' },
  { value: 'CR', label: 'Costa Rica' },
  { value: 'PA', label: 'Panama' },
  { value: 'CU', label: 'Cuba' },
  { value: 'JM', label: 'Jamaica' },
  { value: 'HT', label: 'Haiti' },
  { value: 'DO', label: 'Dominican Republic' },
  { value: 'PR', label: 'Puerto Rico' },
  { value: 'TT', label: 'Trinidad and Tobago' },
  { value: 'BB', label: 'Barbados' },
  { value: 'GD', label: 'Grenada' },
  { value: 'LC', label: 'Saint Lucia' },
  { value: 'VC', label: 'Saint Vincent and the Grenadines' },
  { value: 'AG', label: 'Antigua and Barbuda' },
  { value: 'KN', label: 'Saint Kitts and Nevis' },
  { value: 'DM', label: 'Dominica' },
  { value: 'BS', label: 'Bahamas' },
  { value: 'NZ', label: 'New Zealand' },
  { value: 'FJ', label: 'Fiji' },
  { value: 'PG', label: 'Papua New Guinea' },
  { value: 'SB', label: 'Solomon Islands' },
  { value: 'VU', label: 'Vanuatu' },
  { value: 'NC', label: 'New Caledonia' },
  { value: 'PF', label: 'French Polynesia' },
  { value: 'WS', label: 'Samoa' },
  { value: 'TO', label: 'Tonga' },
  { value: 'KI', label: 'Kiribati' },
  { value: 'TV', label: 'Tuvalu' },
  { value: 'NR', label: 'Nauru' },
  { value: 'PW', label: 'Palau' },
  { value: 'FM', label: 'Micronesia' },
  { value: 'MH', label: 'Marshall Islands' },
];
