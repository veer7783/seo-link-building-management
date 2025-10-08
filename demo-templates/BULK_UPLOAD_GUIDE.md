# 📋 Guest Blog Sites Bulk Upload Guide

## 🎯 Overview
The bulk upload feature allows you to import multiple guest blog sites at once using CSV or Excel files. This guide will help you prepare your data and successfully complete the bulk upload process.

## 📁 Template Files
- **CSV Template**: `guest-blog-sites-template.csv`
- **Excel Template**: `guest-blog-sites-template.xlsx`
- **Instructions**: This guide (BULK_UPLOAD_GUIDE.md)

## 🔧 How to Use

### Step 1: Download Template
1. Go to Guest Blog Sites page
2. Click "Bulk Upload" button
3. Click "Download Template" to get the CSV template
4. Or use the provided Excel template file

### Step 2: Prepare Your Data
Fill in the template with your guest blog sites data following the field specifications below.

### Step 3: Upload & Map
1. Upload your completed file
2. Review auto-detected column mappings
3. Adjust mappings if needed
4. Proceed to preview

### Step 4: Preview & Validate
1. Review the first 20 rows of your data
2. Check validation results and errors
3. Select/deselect rows to import
4. Fix any validation errors if needed

### Step 5: Import
1. Confirm your selection
2. Click "Save" to import the data
3. Review the import results

## 📊 Field Specifications

### ✅ Required Fields
| Field | Description | Example | Notes |
|-------|-------------|---------|-------|
| **Site URL** | Complete website URL | `https://techcrunch.com` | Must include https:// |
| **Base Price** | Price in USD | `250` | Numeric value only |

### 📈 Recommended Fields
| Field | Description | Range/Format | Example |
|-------|-------------|--------------|---------|
| **Domain Authority (DA)** | Moz DA score | 0-100 | `85` |
| **Domain Rating (DR)** | Ahrefs DR score | 0-100 | `82` |
| **Ahrefs Traffic** | Monthly organic traffic | Positive number | `1500000` |
| **Spam Score (SS)** | Moz spam score | 0-17 (lower better) | `2` |
| **Turnaround Time (TAT)** | Delivery timeframe | Text format | `2-3 days` |
| **Category** | Site category | See categories below | `TECHNOLOGY_GADGETS` |
| **Status** | Site status | ACTIVE/INACTIVE | `ACTIVE` |
| **Country** | Country code | 2-letter code | `US` |
| **Publisher** | Publisher name/email | Must exist in system | `TechCrunch Editor` |
| **Site Language** | Language code | 2-letter code | `en` |

## 🏷️ Valid Categories
```
BUSINESS_ENTREPRENEURSHIP    MARKETING_SEO
TECHNOLOGY_GADGETS          HEALTH_FITNESS
LIFESTYLE_WELLNESS          FINANCE_INVESTMENT
EDUCATION_CAREER            TRAVEL_TOURISM
FOOD_COOKING               FASHION_BEAUTY
HOME_GARDEN                SPORTS_FITNESS
ENTERTAINMENT_MEDIA        AUTOMOTIVE
REAL_ESTATE                PARENTING_FAMILY
PETS_ANIMALS               ARTS_CRAFTS
OTHER
```

## 🌍 Common Country Codes
```
US - United States    UK - United Kingdom    CA - Canada
AU - Australia        DE - Germany           FR - France
ES - Spain           IT - Italy             JP - Japan
IN - India           BR - Brazil            MX - Mexico
```

## 🗣️ Common Language Codes
```
en - English         es - Spanish           fr - French
de - German          it - Italian           pt - Portuguese
ja - Japanese        ko - Korean            zh - Chinese
ru - Russian         ar - Arabic            hi - Hindi
```

## 💰 Price Calculation Logic
- **Base Price**: The amount you enter in the template
- **Display Price**: Calculated automatically based on:
  - Default: Base Price + 25% markup
  - Client-specific: Base Price + Client's percentage (if client selected)

**Example:**
- Base Price: $200
- Default Display Price: $250 (25% markup)
- With 30% Client: $260 (30% markup)

## ✅ Validation Rules

### URL Validation
- Must start with `http://` or `https://`
- Must be a valid URL format
- No duplicate URLs allowed

### Numeric Fields
- **DA/DR**: Must be between 0-100
- **Traffic**: Must be positive number
- **Spam Score**: Must be between 0-17
- **Base Price**: Must be positive number

### Publisher Validation
- Publisher name or email must exist in your system
- Case-insensitive matching
- Must be exact match with existing publisher

### Category/Status Validation
- Must use exact values from valid lists above
- Case-insensitive (will be converted to uppercase)

## 🚨 Common Errors & Solutions

### ❌ "Publisher not found"
**Solution**: Ensure publisher name/email exactly matches existing publishers in your system

### ❌ "Invalid category"
**Solution**: Use only categories from the valid list above

### ❌ "Invalid URL format"
**Solution**: Include `https://` and ensure proper URL format

### ❌ "DA must be between 0-100"
**Solution**: Check numeric values are within valid ranges

### ❌ "Duplicate site URL"
**Solution**: Remove duplicate URLs or update existing sites individually

## 📋 Best Practices

### Data Preparation
1. **Start Small**: Test with 5-10 rows first
2. **Clean Data**: Remove empty rows and invalid characters
3. **Consistent Format**: Use consistent date/time formats
4. **Verify Publishers**: Ensure all publishers exist before upload

### File Management
1. **File Size**: Keep under 10MB limit
2. **Format**: Use CSV for best compatibility
3. **Encoding**: Save as UTF-8 if using special characters
4. **Backup**: Keep original data backed up

### Upload Process
1. **Review Mappings**: Always check auto-detected mappings
2. **Validate Preview**: Review all validation errors before importing
3. **Select Carefully**: Only import rows you've verified
4. **Monitor Results**: Check import results for any errors

## 🔧 Technical Limits
- **File Size**: Maximum 10MB
- **File Types**: CSV, Excel (.csv, .xls, .xlsx)
- **Preview**: Shows first 20 rows for validation
- **Batch Size**: No limit on number of rows (within file size)
- **Permissions**: Super Admin and Admin roles only

## 📞 Support
If you encounter issues:
1. Check this guide for common solutions
2. Verify your data against the validation rules
3. Test with the provided sample data
4. Contact your system administrator for help

## 📝 Sample Data Included
The template includes 20+ sample rows with realistic data covering:
- Major publication websites
- Various categories and niches
- Different price ranges ($175-$500)
- Multiple countries and languages
- Proper formatting examples

Use this sample data to understand the expected format and test the upload process before using your own data.

---

**Happy Bulk Uploading! 🚀**
