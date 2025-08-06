import pandas as pd
import numpy as np
from collections import defaultdict
import json

def analyze_excel_file(file_path):
    """
    Comprehensively analyze Excel file and extract all data from all sheets
    """
    try:
        # Read Excel file and get all sheet names
        excel_file = pd.ExcelFile(file_path)
        sheet_names = excel_file.sheet_names
        
        print(f"Excel file: {file_path}")
        print(f"Total sheets found: {len(sheet_names)}")
        print(f"Sheet names: {sheet_names}")
        print("=" * 80)
        
        # Dictionary to store all sheet data
        all_sheets_data = {}
        sheet_structures = {}
        
        # Process each sheet
        for sheet_name in sheet_names:
            print(f"\n--- ANALYZING SHEET: {sheet_name} ---")
            
            # Read the sheet
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            
            # Basic info about the sheet
            print(f"Dimensions: {df.shape[0]} rows x {df.shape[1]} columns")
            print(f"Columns: {list(df.columns)}")
            
            # Store the data
            all_sheets_data[sheet_name] = df
            
            # Analyze column types and sample data
            column_info = {}
            for col in df.columns:
                col_info = {
                    'dtype': str(df[col].dtype),
                    'non_null_count': df[col].count(),
                    'null_count': df[col].isnull().sum(),
                    'unique_count': df[col].nunique(),
                    'sample_values': df[col].dropna().head(5).tolist() if not df[col].empty else []
                }
                
                # Check if column might be a key (unique values)
                if col_info['unique_count'] == len(df) and col_info['null_count'] == 0:
                    col_info['potential_primary_key'] = True
                else:
                    col_info['potential_primary_key'] = False
                    
                column_info[col] = col_info
            
            sheet_structures[sheet_name] = {
                'shape': df.shape,
                'columns': column_info
            }
            
            # Display column analysis
            print("\nColumn Analysis:")
            for col, info in column_info.items():
                pk_indicator = " [POTENTIAL PRIMARY KEY]" if info['potential_primary_key'] else ""
                print(f"  {col}: {info['dtype']}, {info['non_null_count']} non-null, {info['unique_count']} unique{pk_indicator}")
                print(f"    Sample values: {info['sample_values']}")
            
            # Show first few rows
            print(f"\nFirst 5 rows of {sheet_name}:")
            print(df.head().to_string())
            
            print("-" * 60)
        
        # Analyze potential relationships between sheets
        print("\n" + "=" * 80)
        print("RELATIONSHIP ANALYSIS")
        print("=" * 80)
        
        potential_relationships = analyze_relationships(all_sheets_data)
        
        # Display relationships
        for relationship in potential_relationships:
            print(f"\nPotential Foreign Key Relationship:")
            print(f"  {relationship['from_sheet']}.{relationship['from_column']} -> {relationship['to_sheet']}.{relationship['to_column']}")
            print(f"  Match percentage: {relationship['match_percentage']:.1f}%")
            print(f"  Common values sample: {relationship['common_values'][:5]}")
        
        # Export all data to CSV files for reference
        print("\n" + "=" * 80)
        print("EXPORTING DATA")
        print("=" * 80)
        
        for sheet_name, df in all_sheets_data.items():
            csv_filename = f"/Users/mtz/Projects/GEP/backend/{sheet_name.replace(' ', '_').replace('/', '_')}_data.csv"
            df.to_csv(csv_filename, index=False)
            print(f"Exported {sheet_name} to: {csv_filename}")
        
        # Save complete analysis to JSON
        analysis_data = {
            'file_path': file_path,
            'sheet_names': sheet_names,
            'sheet_structures': convert_to_serializable(sheet_structures),
            'potential_relationships': potential_relationships,
            'total_sheets': len(sheet_names)
        }
        
        with open('/Users/mtz/Projects/GEP/backend/excel_analysis.json', 'w') as f:
            json.dump(analysis_data, f, indent=2, default=str)
        
        print(f"\nComplete analysis saved to: /Users/mtz/Projects/GEP/backend/excel_analysis.json")
        
        return all_sheets_data, sheet_structures, potential_relationships
        
    except Exception as e:
        print(f"Error reading Excel file: {str(e)}")
        return None, None, None

def analyze_relationships(all_sheets_data):
    """
    Analyze potential foreign key relationships between sheets
    """
    relationships = []
    sheet_names = list(all_sheets_data.keys())
    
    for i, sheet1 in enumerate(sheet_names):
        for j, sheet2 in enumerate(sheet_names):
            if i != j:  # Don't compare sheet with itself
                df1 = all_sheets_data[sheet1]
                df2 = all_sheets_data[sheet2]
                
                # Compare each column in sheet1 with each column in sheet2
                for col1 in df1.columns:
                    for col2 in df2.columns:
                        if col1 != col2:  # Different column names might still be related
                            similarity = calculate_column_similarity(df1[col1], df2[col2])
                            if similarity['match_percentage'] > 50:  # Threshold for potential relationship
                                relationships.append({
                                    'from_sheet': sheet1,
                                    'from_column': col1,
                                    'to_sheet': sheet2,
                                    'to_column': col2,
                                    'match_percentage': similarity['match_percentage'],
                                    'common_values': similarity['common_values']
                                })
    
    # Sort by match percentage
    relationships.sort(key=lambda x: x['match_percentage'], reverse=True)
    return relationships

def calculate_column_similarity(col1, col2):
    """
    Calculate similarity between two columns
    """
    # Remove null values
    col1_clean = col1.dropna()
    col2_clean = col2.dropna()
    
    if len(col1_clean) == 0 or len(col2_clean) == 0:
        return {'match_percentage': 0, 'common_values': []}
    
    # Convert to sets for comparison
    set1 = set(col1_clean.astype(str))
    set2 = set(col2_clean.astype(str))
    
    # Find intersection
    common_values = set1.intersection(set2)
    
    # Calculate match percentage
    if len(set1) == 0:
        match_percentage = 0
    else:
        match_percentage = (len(common_values) / len(set1)) * 100
    
    return {
        'match_percentage': match_percentage,
        'common_values': list(common_values)
    }

def convert_to_serializable(obj):
    """
    Convert numpy/pandas objects to JSON serializable format
    """
    if isinstance(obj, dict):
        return {k: convert_to_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_serializable(item) for item in obj]
    elif isinstance(obj, (np.integer, np.floating)):
        return obj.item()
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif pd.isna(obj):
        return None
    else:
        return obj

if __name__ == "__main__":
    file_path = "/Users/mtz/Projects/GEP/Gep DEMO DATA.xlsx"
    all_data, structures, relationships = analyze_excel_file(file_path)
    
    if all_data:
        print(f"\n" + "=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print(f"Successfully analyzed {len(all_data)} sheets")
        print(f"Found {len(relationships)} potential relationships")
        print("All data has been exported to CSV files and analysis saved to JSON")