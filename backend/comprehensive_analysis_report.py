import pandas as pd
import json
from datetime import datetime

def generate_comprehensive_report():
    """
    Generate a comprehensive analysis report
    """
    
    # Load analysis data
    with open('/Users/mtz/Projects/GEP/backend/excel_analysis.json', 'r') as f:
        analysis_data = json.load(f)
    
    # Read all CSV data
    csv_files = {
        'Client': '/Users/mtz/Projects/GEP/backend/Client_data.csv',
        'Installation': '/Users/mtz/Projects/GEP/backend/Installation_data.csv',
        'Contract': '/Users/mtz/Projects/GEP/backend/Contract_data.csv',
        'Contract Service (Project)': '/Users/mtz/Projects/GEP/backend/Contract_Service_(Project)_data.csv',
        'Installation Services (Sub Pro)': '/Users/mtz/Projects/GEP/backend/Installation_Services_(Sub_Pro)_data.csv',
        'Visits': '/Users/mtz/Projects/GEP/backend/Visits_data.csv',
        'Resources': '/Users/mtz/Projects/GEP/backend/Resources_data.csv'
    }
    
    all_data = {}
    for sheet_name, csv_path in csv_files.items():
        all_data[sheet_name] = pd.read_csv(csv_path)
    
    report = f"""
# COMPREHENSIVE EXCEL DATA ANALYSIS REPORT
## Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
## Source File: /Users/mtz/Projects/GEP/Gep DEMO DATA.xlsx

---

## EXECUTIVE SUMMARY

This report provides a comprehensive analysis of the GEP Demo Excel file containing **{len(analysis_data['sheet_names'])} sheets** with detailed business data for a service management system.

### Key Statistics:
- **Total Sheets**: {len(analysis_data['sheet_names'])}
- **Total Records**: {sum(len(df) for df in all_data.values())}
- **Total Columns**: {sum(len(df.columns) for df in all_data.values())}
- **Identified Relationships**: {len(analysis_data['potential_relationships'])}

---

## SHEET-BY-SHEET ANALYSIS

"""
    
    for sheet_name in analysis_data['sheet_names']:
        if sheet_name in all_data:
            df = all_data[sheet_name]
            structure = analysis_data['sheet_structures'][sheet_name]
            
            report += f"""
### {sheet_name}
**Dimensions**: {df.shape[0]} rows × {df.shape[1]} columns

**Purpose**: {get_sheet_purpose(sheet_name)}

**Columns**:
"""
            
            for col in df.columns:
                col_info = structure['columns'][col]
                pk_indicator = " 🔑" if col_info['potential_primary_key'] else ""
                report += f"- **{col}**{pk_indicator}: {col_info['dtype']} ({col_info['non_null_count']} non-null, {col_info['unique_count']} unique)\n"
            
            report += f"""
**Sample Data**:
```
{df.head(3).to_string()}
```

**Key Insights**:
{get_sheet_insights(sheet_name, df)}

---
"""
    
    # Add relationship analysis
    report += """
## RELATIONSHIP ANALYSIS

The following relationships were identified between sheets based on data analysis:

### Primary Relationships (100% match):
"""
    
    primary_relationships = [rel for rel in analysis_data['potential_relationships'] if rel['match_percentage'] == 100.0]
    
    for rel in primary_relationships[:10]:  # Show top 10
        report += f"- **{rel['from_sheet']}.{rel['from_column']}** → **{rel['to_sheet']}.{rel['to_column']}** ({rel['match_percentage']:.1f}% match)\n"
    
    report += """
### Entity Relationship Diagram (Conceptual):
```
Client (1) ←→ (M) Installation
Client (1) ←→ (M) Contract
Contract (1) ←→ (M) Contract Service (Project)
Installation (1) ←→ (M) Installation Services (Sub Pro)
Contract (1) ←→ (M) Installation Services (Sub Pro)
Resources (1) ←→ (M) Installation Services (Sub Pro)
Resources (1) ←→ (M) Visits
```

---

## DATA QUALITY ASSESSMENT
"""
    
    # Data quality analysis
    for sheet_name, df in all_data.items():
        null_percentages = (df.isnull().sum() / len(df) * 100).round(2)
        high_null_cols = null_percentages[null_percentages > 10].to_dict()
        
        if high_null_cols:
            report += f"""
### {sheet_name} - Data Quality Issues:
"""
            for col, null_pct in high_null_cols.items():
                report += f"- **{col}**: {null_pct}% missing values\n"
    
    report += """
---

## BUSINESS INSIGHTS

### Client Management:
- Single client system: DEMO HELLAS A.E.E. (Company Code: C000011)
- Client has multiple installations and contracts
- Active customer with comprehensive service coverage

### Installation Management:
- **7 installations** across different locations in Athens area
- Mix of active (2) and inactive (5) installations  
- Employee allocation ranges from 1-46 per installation
- All installations belong to the same client

### Contract Management:
- **5 contracts** with varying durations and values
- Total contract value: €19,967.27 (excluding one null value)
- Mix of indefinite term contracts and time-bound agreements
- All contracts are currently active except one (THE DREAM)

### Service Delivery:
- **13 contract services** spanning multiple years (2020-2025)
- Primary service: "Ιατρός Εργασίας" (Occupational Physician)
- Revenue range: €670 - €2,589.40 per service
- **64 installation services** managed across locations

### Resource Management:  
- **13 resources** (personnel) with various specialties
- Specialties include: Παθολόγος, Ιατρός, Παιδίατρος, Engineers
- Resources distributed across Athens, Γέρακας, and Καλλιθέα
- **202 visits** scheduled/completed across the system

### Visit Management:
- Visit statuses: Προς έναρξη (upcoming), Ολοκληρώθηκε (completed)
- Average visit duration: 2 hours
- Visits span from 2023 to 2026, indicating long-term planning

---

## RECOMMENDED DATABASE STRUCTURE

Based on the analysis, the following normalized database structure is recommended:

### Core Tables:
1. **clients** - Client master data
2. **installations** - Physical locations
3. **contracts** - Service agreements
4. **resources** - Personnel/service providers
5. **contract_services** - Service definitions within contracts
6. **installation_services** - Services assigned to locations
7. **visits** - Individual service visits

### Key Foreign Key Relationships:
- installations.company_code → clients.company_code
- contracts.company_code → clients.company_code  
- contract_services.contract_code → contracts.contract_code
- installation_services.contract_code → contracts.contract_code
- installation_services.installation_code → installations.installation_code
- installation_services.resource_code → resources.resource_code
- visits.resource_code → resources.resource_code

---

## FILES GENERATED

1. **Excel Analysis JSON**: `/Users/mtz/Projects/GEP/backend/excel_analysis.json`
2. **Individual CSV Files**: 7 files for each sheet
3. **Complete SQL Script**: `/Users/mtz/Projects/GEP/backend/gep_demo_complete.sql`
4. **Analysis Scripts**: 
   - `/Users/mtz/Projects/GEP/backend/excel_reader.py`
   - `/Users/mtz/Projects/GEP/backend/sql_generator.py`

---

## NEXT STEPS

1. **Database Implementation**: Use the generated SQL script to create the database
2. **Data Validation**: Verify all foreign key relationships after database creation
3. **Business Logic**: Implement application logic based on identified relationships
4. **Data Migration**: Use the CSV files for any ETL processes
5. **Reporting**: Leverage the sample queries provided in the SQL script

---

*Report generated by automated Excel analysis system*
"""

    # Save the report
    with open('/Users/mtz/Projects/GEP/backend/comprehensive_analysis_report.md', 'w', encoding='utf-8') as f:
        f.write(report)
    
    print("Comprehensive analysis report generated!")
    print("Report saved to: /Users/mtz/Projects/GEP/backend/comprehensive_analysis_report.md")

def get_sheet_purpose(sheet_name):
    """Get the business purpose of each sheet"""
    purposes = {
        'Client': 'Master client information and account management details',
        'Installation': 'Physical locations where services are provided',
        'Contract': 'Service agreements and contract terms',
        'Contract Service (Project)': 'Individual services within contracts with pricing',
        'Installation Services (Sub Pro)': 'Services assigned to specific installations',
        'Visits': 'Individual service visits and appointments',
        'Resources': 'Personnel and service providers (doctors, engineers, etc.)'
    }
    return purposes.get(sheet_name, 'Business data table')

def get_sheet_insights(sheet_name, df):
    """Generate key insights for each sheet"""
    try:
        if sheet_name == 'Client':
            return f"• Single client organization managing {df.shape[0]} company entity\n• Has dedicated account, CAD, and finance managers"
        
        elif sheet_name == 'Installation':
            active_col = 'Installation is Active' if 'Installation is Active' in df.columns else df.columns[3]
            employees_col = 'Employees Per Installation' if 'Employees Per Installation' in df.columns else df.columns[7]
            active_count = df[df[active_col] == 1].shape[0] if active_col in df.columns else 0
            total_employees = df[employees_col].sum() if employees_col in df.columns else 0
            return f"• {df.shape[0]} installations managed\n• {active_count} currently active\n• Total employees across installations: {total_employees}\n• All installations in Athens metropolitan area"
        
        elif sheet_name == 'Contract':
            value_col = 'Contract Value' if 'Contract Value' in df.columns else df.columns[-2]
            active_col = 'Active Contract' if 'Active Contract' in df.columns else df.columns[3]
            total_value = df[value_col].sum() if value_col in df.columns else 0
            active_count = df[df[active_col] == 1].shape[0] if active_col in df.columns else 0
            return f"• {df.shape[0]} contracts with total value: €{total_value:,.2f}\n• {active_count} active contracts\n• Contract durations range from 2004 to 2099 (some indefinite term)"
        
        elif sheet_name == 'Contract Service (Project)':
            revenue_col = 'Contract Service Revenue' if 'Contract Service Revenue' in df.columns else df.columns[-1]
            service_col = 'Service Name' if 'Service Name' in df.columns else df.columns[4]
            price_col = 'Price Per UOM' if 'Price Per UOM' in df.columns else df.columns[6]
            total_revenue = df[revenue_col].sum() if revenue_col in df.columns else 0
            primary_service = df[service_col].mode()[0] if service_col in df.columns and len(df[service_col].mode()) > 0 else "N/A"
            price_min = df[price_col].min() if price_col in df.columns else 0
            price_max = df[price_col].max() if price_col in df.columns else 0
            return f"• {df.shape[0]} service projects\n• Total revenue: €{total_revenue:,.2f}\n• Primary service: {primary_service}\n• Price range: €{price_min}-{price_max} per unit"
        
        elif sheet_name == 'Installation Services (Sub Pro)':
            start_date_col = 'Service Start Date' if 'Service Start Date' in df.columns else df.columns[6]
            resource_col = 'Rerource Code' if 'Rerource Code' in df.columns else df.columns[10]
            unique_periods = df[start_date_col].nunique() if start_date_col in df.columns else 0
            unique_resources = df[resource_col].nunique() if resource_col in df.columns else 0
            return f"• {df.shape[0]} installation service assignments\n• Services span {unique_periods} different time periods\n• {unique_resources} different resources assigned\n• All services currently marked as inactive (status 0)"
        
        elif sheet_name == 'Visits':
            duration_col = '(1) Duration' if '(1) Duration' in df.columns else df.columns[9]
            status_col = 'Visit Status' if 'Visit Status' in df.columns else df.columns[10]
            avg_duration = df[duration_col].mean() if duration_col in df.columns else 0
            completed_count = df[df[status_col] == 'Ολοκληρώθηκε'].shape[0] if status_col in df.columns else 0
            return f"• {df.shape[0]} visits recorded/planned\n• Visit duration averages {avg_duration:.1f} hours\n• {completed_count} completed visits\n• Spans from 2023 to 2026"
        
        elif sheet_name == 'Resources':
            specialty_col = 'Specialty Name' if 'Specialty Name' in df.columns else df.columns[2]
            city_col = 'City' if 'City' in df.columns else df.columns[3]
            unique_specialties = df[specialty_col].nunique() if specialty_col in df.columns else 0
            unique_cities = df[city_col].nunique() if city_col in df.columns else 0
            return f"• {df.shape[0]} personnel/resources available\n• {unique_specialties} different specialties\n• Located across {unique_cities} cities\n• Mix of medical and engineering professionals"
        
        else:
            return "• Data table with business information"
            
    except Exception as e:
        return f"• {df.shape[0]} records in table\n• Error analyzing details: {str(e)}"

if __name__ == "__main__":
    generate_comprehensive_report()