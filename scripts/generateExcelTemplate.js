const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Demo data for Guest Blog Sites
const demoData = [
  {
    'Site URL': 'https://techcrunch.com',
    'Domain Authority (DA)': 95,
    'Domain Rating (DR)': 94,
    'Ahrefs Traffic': 15000000,
    'Spam Score (SS)': 2,
    'Turnaround Time (TAT)': '2-3 days',
    'Category': 'TECHNOLOGY_GADGETS',
    'Status': 'ACTIVE',
    'Base Price': 500,
    'Country': 'US',
    'Publisher': 'TechCrunch Editor',
    'Site Language': 'en'
  },
  {
    'Site URL': 'https://forbes.com/business',
    'Domain Authority (DA)': 92,
    'Domain Rating (DR)': 93,
    'Ahrefs Traffic': 12000000,
    'Spam Score (SS)': 1,
    'Turnaround Time (TAT)': '3-5 days',
    'Category': 'BUSINESS_ENTREPRENEURSHIP',
    'Status': 'ACTIVE',
    'Base Price': 450,
    'Country': 'US',
    'Publisher': 'Forbes Business Team',
    'Site Language': 'en'
  },
  {
    'Site URL': 'https://entrepreneur.com',
    'Domain Authority (DA)': 88,
    'Domain Rating (DR)': 87,
    'Ahrefs Traffic': 8500000,
    'Spam Score (SS)': 3,
    'Turnaround Time (TAT)': '1-2 days',
    'Category': 'BUSINESS_ENTREPRENEURSHIP',
    'Status': 'ACTIVE',
    'Base Price': 400,
    'Country': 'US',
    'Publisher': 'Entrepreneur Magazine',
    'Site Language': 'en'
  },
  {
    'Site URL': 'https://mashable.com',
    'Domain Authority (DA)': 85,
    'Domain Rating (DR)': 86,
    'Ahrefs Traffic': 7200000,
    'Spam Score (SS)': 2,
    'Turnaround Time (TAT)': '2-4 days',
    'Category': 'TECHNOLOGY_GADGETS',
    'Status': 'ACTIVE',
    'Base Price': 350,
    'Country': 'US',
    'Publisher': 'Mashable Tech',
    'Site Language': 'en'
  },
  {
    'Site URL': 'https://businessinsider.com',
    'Domain Authority (DA)': 90,
    'Domain Rating (DR)': 89,
    'Ahrefs Traffic': 9800000,
    'Spam Score (SS)': 1,
    'Turnaround Time (TAT)': '3-4 days',
    'Category': 'BUSINESS_ENTREPRENEURSHIP',
    'Status': 'ACTIVE',
    'Base Price': 425,
    'Country': 'US',
    'Publisher': 'Business Insider',
    'Site Language': 'en'
  },
  {
    'Site URL': 'https://healthline.com',
    'Domain Authority (DA)': 82,
    'Domain Rating (DR)': 83,
    'Ahrefs Traffic': 6500000,
    'Spam Score (SS)': 1,
    'Turnaround Time (TAT)': '5-7 days',
    'Category': 'HEALTH_FITNESS',
    'Status': 'ACTIVE',
    'Base Price': 300,
    'Country': 'US',
    'Publisher': 'Healthline Editorial',
    'Site Language': 'en'
  },
  {
    'Site URL': 'https://webmd.com',
    'Domain Authority (DA)': 80,
    'Domain Rating (DR)': 81,
    'Ahrefs Traffic': 5800000,
    'Spam Score (SS)': 2,
    'Turnaround Time (TAT)': '4-6 days',
    'Category': 'HEALTH_FITNESS',
    'Status': 'ACTIVE',
    'Base Price': 275,
    'Country': 'US',
    'Publisher': 'WebMD Health',
    'Site Language': 'en'
  },
  {
    'Site URL': 'https://mayoclinic.org',
    'Domain Authority (DA)': 85,
    'Domain Rating (DR)': 84,
    'Ahrefs Traffic': 4200000,
    'Spam Score (SS)': 1,
    'Turnaround Time (TAT)': '7-10 days',
    'Category': 'HEALTH_FITNESS',
    'Status': 'ACTIVE',
    'Base Price': 350,
    'Country': 'US',
    'Publisher': 'Mayo Clinic',
    'Site Language': 'en'
  },
  {
    'Site URL': 'https://investopedia.com',
    'Domain Authority (DA)': 88,
    'Domain Rating (DR)': 87,
    'Ahrefs Traffic': 3800000,
    'Spam Score (SS)': 1,
    'Turnaround Time (TAT)': '3-5 days',
    'Category': 'FINANCE_INVESTMENT',
    'Status': 'ACTIVE',
    'Base Price': 375,
    'Country': 'US',
    'Publisher': 'Investopedia Finance',
    'Site Language': 'en'
  },
  {
    'Site URL': 'https://nerdwallet.com',
    'Domain Authority (DA)': 82,
    'Domain Rating (DR)': 83,
    'Ahrefs Traffic': 3200000,
    'Spam Score (SS)': 2,
    'Turnaround Time (TAT)': '2-4 days',
    'Category': 'FINANCE_INVESTMENT',
    'Status': 'ACTIVE',
    'Base Price': 325,
    'Country': 'US',
    'Publisher': 'NerdWallet Team',
    'Site Language': 'en'
  },
  {
    'Site URL': 'https://fool.com',
    'Domain Authority (DA)': 79,
    'Domain Rating (DR)': 80,
    'Ahrefs Traffic': 2800000,
    'Spam Score (SS)': 3,
    'Turnaround Time (TAT)': '4-6 days',
    'Category': 'FINANCE_INVESTMENT',
    'Status': 'ACTIVE',
    'Base Price': 300,
    'Country': 'US',
    'Publisher': 'Motley Fool',
    'Site Language': 'en'
  },
  {
    'Site URL': 'https://cnn.com/travel',
    'Domain Authority (DA)': 87,
    'Domain Rating (DR)': 88,
    'Ahrefs Traffic': 8900000,
    'Spam Score (SS)': 2,
    'Turnaround Time (TAT)': '3-5 days',
    'Category': 'TRAVEL_TOURISM',
    'Status': 'ACTIVE',
    'Base Price': 400,
    'Country': 'US',
    'Publisher': 'CNN Travel',
    'Site Language': 'en'
  },
  {
    'Site URL': 'https://lonelyplanet.com',
    'Domain Authority (DA)': 83,
    'Domain Rating (DR)': 82,
    'Ahrefs Traffic': 2100000,
    'Spam Score (SS)': 1,
    'Turnaround Time (TAT)': '5-7 days',
    'Category': 'TRAVEL_TOURISM',
    'Status': 'ACTIVE',
    'Base Price': 275,
    'Country': 'UK',
    'Publisher': 'Lonely Planet',
    'Site Language': 'en'
  },
  {
    'Site URL': 'https://tripadvisor.com',
    'Domain Authority (DA)': 86,
    'Domain Rating (DR)': 85,
    'Ahrefs Traffic': 4500000,
    'Spam Score (SS)': 2,
    'Turnaround Time (TAT)': '2-3 days',
    'Category': 'TRAVEL_TOURISM',
    'Status': 'ACTIVE',
    'Base Price': 350,
    'Country': 'US',
    'Publisher': 'TripAdvisor Content',
    'Site Language': 'en'
  },
  {
    'Site URL': 'https://foodnetwork.com',
    'Domain Authority (DA)': 81,
    'Domain Rating (DR)': 80,
    'Ahrefs Traffic': 3600000,
    'Spam Score (SS)': 1,
    'Turnaround Time (TAT)': '4-6 days',
    'Category': 'FOOD_COOKING',
    'Status': 'ACTIVE',
    'Base Price': 250,
    'Country': 'US',
    'Publisher': 'Food Network',
    'Site Language': 'en'
  },
  {
    'Site URL': 'https://allrecipes.com',
    'Domain Authority (DA)': 78,
    'Domain Rating (DR)': 79,
    'Ahrefs Traffic': 2900000,
    'Spam Score (SS)': 2,
    'Turnaround Time (TAT)': '3-5 days',
    'Category': 'FOOD_COOKING',
    'Status': 'ACTIVE',
    'Base Price': 225,
    'Country': 'US',
    'Publisher': 'Allrecipes Editorial',
    'Site Language': 'en'
  },
  {
    'Site URL': 'https://bonappetit.com',
    'Domain Authority (DA)': 76,
    'Domain Rating (DR)': 77,
    'Ahrefs Traffic': 1800000,
    'Spam Score (SS)': 1,
    'Turnaround Time (TAT)': '5-7 days',
    'Category': 'FOOD_COOKING',
    'Status': 'ACTIVE',
    'Base Price': 275,
    'Country': 'US',
    'Publisher': 'Bon Appétit',
    'Site Language': 'en'
  },
  {
    'Site URL': 'https://vogue.com',
    'Domain Authority (DA)': 89,
    'Domain Rating (DR)': 88,
    'Ahrefs Traffic': 4200000,
    'Spam Score (SS)': 1,
    'Turnaround Time (TAT)': '7-10 days',
    'Category': 'FASHION_BEAUTY',
    'Status': 'ACTIVE',
    'Base Price': 450,
    'Country': 'US',
    'Publisher': 'Vogue Fashion',
    'Site Language': 'en'
  },
  {
    'Site URL': 'https://elle.com',
    'Domain Authority (DA)': 84,
    'Domain Rating (DR)': 83,
    'Ahrefs Traffic': 2800000,
    'Spam Score (SS)': 2,
    'Turnaround Time (TAT)': '5-7 days',
    'Category': 'FASHION_BEAUTY',
    'Status': 'ACTIVE',
    'Base Price': 375,
    'Country': 'US',
    'Publisher': 'Elle Magazine',
    'Site Language': 'en'
  },
  {
    'Site URL': 'https://cosmopolitan.com',
    'Domain Authority (DA)': 82,
    'Domain Rating (DR)': 81,
    'Ahrefs Traffic': 3100000,
    'Spam Score (SS)': 2,
    'Turnaround Time (TAT)': '4-6 days',
    'Category': 'FASHION_BEAUTY',
    'Status': 'ACTIVE',
    'Base Price': 325,
    'Country': 'US',
    'Publisher': 'Cosmopolitan',
    'Site Language': 'en'
  }
];

// Create workbook and worksheet
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(demoData);

// Set column widths for better readability
const columnWidths = [
  { wch: 30 }, // Site URL
  { wch: 12 }, // DA
  { wch: 12 }, // DR
  { wch: 15 }, // Ahrefs Traffic
  { wch: 12 }, // SS
  { wch: 15 }, // TAT
  { wch: 25 }, // Category
  { wch: 10 }, // Status
  { wch: 12 }, // Base Price
  { wch: 10 }, // Country
  { wch: 25 }, // Publisher
  { wch: 12 }  // Site Language
];

worksheet['!cols'] = columnWidths;

// Add the worksheet to the workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Guest Blog Sites');

// Create demo-templates directory if it doesn't exist
const templatesDir = path.join(__dirname, '..', 'demo-templates');
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

// Write the Excel file
const excelPath = path.join(templatesDir, 'guest-blog-sites-template.xlsx');
XLSX.writeFile(workbook, excelPath);

console.log('✅ Excel template created successfully at:', excelPath);

// Also create a detailed instructions file
const instructionsContent = `# Guest Blog Sites Bulk Upload Template

## File Information
- **CSV Template**: guest-blog-sites-template.csv
- **Excel Template**: guest-blog-sites-template.xlsx

## Column Descriptions

### Required Fields (*)
1. **Site URL*** - The full URL of the guest blog site (e.g., https://example.com)
2. **Base Price*** - The base price in USD (e.g., 250, 300, 500)

### Recommended Fields
3. **Domain Authority (DA)** - Moz Domain Authority score (0-100)
4. **Domain Rating (DR)** - Ahrefs Domain Rating score (0-100)
5. **Ahrefs Traffic** - Monthly organic traffic from Ahrefs
6. **Spam Score (SS)** - Moz Spam Score (0-17, lower is better)
7. **Turnaround Time (TAT)** - Expected delivery time (e.g., "2-3 days", "1 week")
8. **Category** - Site category (see valid categories below)
9. **Status** - Site status: ACTIVE or INACTIVE (default: ACTIVE)
10. **Country** - Country code (e.g., US, UK, CA, AU)
11. **Publisher** - Publisher name or email (must exist in system)
12. **Site Language** - Language code (e.g., en, es, fr, de)

## Valid Categories
- BUSINESS_ENTREPRENEURSHIP
- MARKETING_SEO
- TECHNOLOGY_GADGETS
- HEALTH_FITNESS
- LIFESTYLE_WELLNESS
- FINANCE_INVESTMENT
- EDUCATION_CAREER
- TRAVEL_TOURISM
- FOOD_COOKING
- FASHION_BEAUTY
- HOME_GARDEN
- SPORTS_FITNESS
- ENTERTAINMENT_MEDIA
- AUTOMOTIVE
- REAL_ESTATE
- PARENTING_FAMILY
- PETS_ANIMALS
- ARTS_CRAFTS
- OTHER

## Valid Status Values
- ACTIVE (default)
- INACTIVE

## Common Language Codes
- en (English)
- es (Spanish)
- fr (French)
- de (German)
- it (Italian)
- pt (Portuguese)
- ja (Japanese)
- ko (Korean)
- zh (Chinese)

## Price Calculation
- **Base Price**: The amount you set in the template
- **Display Price**: Base Price + 25% markup (or client-specific percentage if selected)
- Example: Base Price $200 → Display Price $250 (with 25% markup)

## Upload Instructions
1. Fill in the template with your guest blog sites data
2. Ensure required fields (Site URL, Base Price) are completed
3. Use valid categories and status values from the lists above
4. Make sure publisher names/emails exist in your system
5. Save the file and upload through the Bulk Upload feature
6. Review the preview and validation results
7. Select the rows you want to import and confirm

## Tips for Success
- Use complete URLs including https://
- Ensure publisher names match exactly with existing publishers
- Double-check numeric values (DA, DR, Traffic, Price)
- Use consistent formatting for TAT (e.g., "2-3 days")
- Verify country codes are correct
- Test with a small batch first before uploading large files

## File Limits
- Maximum file size: 10MB
- Supported formats: CSV, Excel (.csv, .xls, .xlsx)
- Preview shows first 20 rows for validation

For questions or support, contact your system administrator.
`;

const instructionsPath = path.join(templatesDir, 'README.md');
fs.writeFileSync(instructionsPath, instructionsContent);

console.log('✅ Instructions file created at:', instructionsPath);
console.log('📁 Template files ready in:', templatesDir);
