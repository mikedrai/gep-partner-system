import pandas as pd
import json
from datetime import datetime

def generate_sql_schema_and_data():
    """
    Generate comprehensive SQL script with table creation and data insertion
    """
    
    # Load the analysis data
    with open('/Users/mtz/Projects/GEP/backend/excel_analysis.json', 'r') as f:
        analysis_data = json.load(f)
    
    sql_script = """-- =====================================================
-- GEP DEMO DATABASE - COMPREHENSIVE SQL SCRIPT
-- Generated on: {timestamp}
-- Source: Gep DEMO DATA.xlsx
-- =====================================================

-- Create database (uncomment if needed)
-- CREATE DATABASE gep_demo;
-- USE gep_demo;

-- Enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

""".format(timestamp=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

    # Read all CSV files for data
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
    
    # Generate table creation statements
    sql_script += generate_table_creation_sql(all_data, analysis_data)
    
    # Generate data insertion statements
    sql_script += generate_data_insertion_sql(all_data)
    
    # Generate foreign key constraints
    sql_script += generate_foreign_key_constraints()
    
    # Generate sample queries
    sql_script += generate_sample_queries()
    
    # Save the complete SQL script
    with open('/Users/mtz/Projects/GEP/backend/gep_demo_complete.sql', 'w', encoding='utf-8') as f:
        f.write(sql_script)
    
    print("Complete SQL script generated: /Users/mtz/Projects/GEP/backend/gep_demo_complete.sql")
    return sql_script

def map_pandas_to_sql_type(dtype, column_name, sample_values, unique_count, row_count):
    """
    Map pandas data types to SQL data types
    """
    dtype_str = str(dtype)
    
    # Handle primary keys and codes
    if 'Code' in column_name or column_name.endswith('_id'):
        if 'int' in dtype_str:
            return 'INT PRIMARY KEY'
        else:
            return 'VARCHAR(20) PRIMARY KEY'
    
    # Handle specific column patterns
    if 'Date' in column_name or 'date' in column_name.lower():
        if 'datetime64' in dtype_str:
            return 'DATETIME'
        else:
            return 'DATE'
    
    if 'Time' in column_name or 'time' in column_name.lower():
        return 'TIME'
    
    if 'Hours' in column_name or 'Duration' in column_name or 'Value' in column_name or 'Revenue' in column_name or 'Price' in column_name:
        return 'DECIMAL(10,2)'
    
    # Handle boolean-like columns
    if unique_count <= 2 and 'int' in dtype_str:
        return 'TINYINT(1)'
    
    # Handle data types
    if 'int64' in dtype_str:
        if unique_count == row_count:  # Likely a primary key
            return 'BIGINT PRIMARY KEY'
        return 'BIGINT'
    elif 'float64' in dtype_str:
        return 'DECIMAL(15,4)'
    elif 'datetime64' in dtype_str:
        return 'DATETIME'
    elif 'object' in dtype_str:
        # Determine varchar length based on sample values
        max_len = 50
        if sample_values:
            try:
                max_len = max(len(str(val)) for val in sample_values) + 20
                max_len = min(max_len, 500)  # Cap at 500
            except:
                max_len = 255
        
        if max_len > 255:
            return 'TEXT'
        else:
            return f'VARCHAR({max_len})'
    
    return 'VARCHAR(255)'

def generate_table_creation_sql(all_data, analysis_data):
    """
    Generate CREATE TABLE statements
    """
    sql = "\n-- =====================================================\n"
    sql += "-- TABLE CREATION STATEMENTS\n"
    sql += "-- =====================================================\n\n"
    
    # Define table creation order based on dependencies
    table_order = ['Client', 'Resources', 'Installation', 'Contract', 'Contract Service (Project)', 'Installation Services (Sub Pro)', 'Visits']
    
    for table_name in table_order:
        if table_name not in all_data:
            continue
            
        df = all_data[table_name]
        safe_table_name = table_name.replace(' ', '_').replace('(', '').replace(')', '').lower()
        
        sql += f"-- Create {table_name} table\n"
        sql += f"DROP TABLE IF EXISTS {safe_table_name};\n"
        sql += f"CREATE TABLE {safe_table_name} (\n"
        
        columns = []
        primary_keys = []
        
        for col in df.columns:
            safe_col_name = col.replace(' ', '_').replace('(', '').replace(')', '').replace('/', '_').lower()
            
            # Get column statistics
            unique_count = df[col].nunique()
            row_count = len(df)
            sample_values = df[col].dropna().head(5).tolist()
            
            sql_type = map_pandas_to_sql_type(df[col].dtype, col, sample_values, unique_count, row_count)
            
            # Handle primary keys
            if 'PRIMARY KEY' in sql_type:
                sql_type = sql_type.replace(' PRIMARY KEY', '')
                primary_keys.append(safe_col_name)
            
            # Handle null constraints
            null_constraint = "NOT NULL" if df[col].isnull().sum() == 0 else ""
            
            columns.append(f"    {safe_col_name} {sql_type} {null_constraint}".strip())
        
        sql += ",\n".join(columns)
        
        # Add primary key constraint if needed
        if primary_keys:
            sql += f",\n    PRIMARY KEY ({', '.join(primary_keys)})"
        
        sql += "\n);\n\n"
    
    return sql

def generate_data_insertion_sql(all_data):
    """
    Generate INSERT statements for all data
    """
    sql = "\n-- =====================================================\n"
    sql += "-- DATA INSERTION STATEMENTS\n"
    sql += "-- =====================================================\n\n"
    
    # Insert data in dependency order
    table_order = ['Client', 'Resources', 'Installation', 'Contract', 'Contract Service (Project)', 'Installation Services (Sub Pro)', 'Visits']
    
    for table_name in table_order:
        if table_name not in all_data:
            continue
            
        df = all_data[table_name]
        safe_table_name = table_name.replace(' ', '_').replace('(', '').replace(')', '').lower()
        
        sql += f"-- Insert data into {table_name}\n"
        
        # Get safe column names
        safe_columns = [col.replace(' ', '_').replace('(', '').replace(')', '').replace('/', '_').lower() for col in df.columns]
        
        sql += f"INSERT INTO {safe_table_name} ({', '.join(safe_columns)}) VALUES\n"
        
        rows = []
        for _, row in df.iterrows():
            values = []
            for val in row:
                if pd.isna(val):
                    values.append('NULL')
                elif isinstance(val, str):
                    # Escape single quotes
                    escaped_val = val.replace("'", "''")
                    values.append(f"'{escaped_val}'")
                elif isinstance(val, (int, float)):
                    values.append(str(val))
                elif isinstance(val, datetime):
                    values.append(f"'{val.strftime('%Y-%m-%d %H:%M:%S')}'")
                else:
                    values.append(f"'{str(val)}'")
            
            rows.append(f"    ({', '.join(values)})")
        
        sql += ",\n".join(rows)
        sql += ";\n\n"
    
    return sql

def generate_foreign_key_constraints():
    """
    Generate foreign key constraints based on analysis
    """
    sql = "\n-- =====================================================\n"
    sql += "-- FOREIGN KEY CONSTRAINTS\n"
    sql += "-- =====================================================\n\n"
    
    # Define key relationships based on analysis
    relationships = [
        {
            'child_table': 'installation',
            'child_column': 'company_code',
            'parent_table': 'client',
            'parent_column': 'company_code'
        },
        {
            'child_table': 'contract',
            'child_column': 'company_code',
            'parent_table': 'client',
            'parent_column': 'company_code'
        },
        {
            'child_table': 'contract_service_project',
            'child_column': 'conrtact_code',
            'parent_table': 'contract',
            'parent_column': 'contract_code'
        },
        {
            'child_table': 'installation_services_sub_pro',
            'child_column': 'conrtact_code',
            'parent_table': 'contract',
            'parent_column': 'contract_code'
        },
        {
            'child_table': 'installation_services_sub_pro',
            'child_column': 'installation_code',
            'parent_table': 'installation',
            'parent_column': 'installation_code'
        },
        {
            'child_table': 'installation_services_sub_pro',
            'child_column': 'rerource_code',
            'parent_table': 'resources',
            'parent_column': 'resource_code'
        },
        {
            'child_table': 'visits',
            'child_column': 'rerource_code',
            'parent_table': 'resources',
            'parent_column': 'resource_code'
        }
    ]
    
    for rel in relationships:
        constraint_name = f"fk_{rel['child_table']}_{rel['child_column']}"
        sql += f"ALTER TABLE {rel['child_table']}\n"
        sql += f"ADD CONSTRAINT {constraint_name}\n"
        sql += f"FOREIGN KEY ({rel['child_column']}) REFERENCES {rel['parent_table']}({rel['parent_column']});\n\n"
    
    return sql

def generate_sample_queries():
    """
    Generate sample queries for testing and demonstration
    """
    sql = "\n-- =====================================================\n"
    sql += "-- SAMPLE QUERIES FOR TESTING\n"
    sql += "-- =====================================================\n\n"
    
    queries = [
        {
            'description': 'Get all active contracts with client information',
            'query': """SELECT 
    c.contract_code,
    c.contract_name,
    cl.company_name,
    c.contract_start_date,
    c.contract_end_date,
    c.contract_value
FROM contract c
JOIN client cl ON c.company_code = cl.company_code
WHERE c.active_contract = 1;"""
        },
        {
            'description': 'Get installation details with employee counts',
            'query': """SELECT 
    i.installation_code,
    i.description,
    i.address,
    i.employees_per_installation,
    i.installation_work_hours,
    cl.company_name
FROM installation i
JOIN client cl ON i.company_code = cl.company_code
WHERE i.installation_is_active = 1;"""
        },
        {
            'description': 'Get contract services with revenue information',
            'query': """SELECT 
    cs.contract_service_code,
    cs.service_name,
    cs.assigned_hours__quantity,
    cs.price_per_uom,
    cs.contract_service_revenue,
    c.contract_name
FROM contract_service_project cs
JOIN contract c ON cs.conrtact_code = c.contract_code;"""
        },
        {
            'description': 'Get resource utilization across visits',
            'query': """SELECT 
    r.resource_name,
    r.specialty_name,
    COUNT(v.visit_code) as total_visits,
    SUM(v.1_duration) as total_hours,
    AVG(v.1_duration) as avg_visit_duration
FROM resources r
LEFT JOIN visits v ON r.resource_code = v.rerource_code
GROUP BY r.resource_code, r.resource_name, r.specialty_name
ORDER BY total_hours DESC;"""
        },
        {
            'description': 'Get upcoming visits by status',
            'query': """SELECT 
    v.visit_code,
    v.client_name,
    r.resource_name,
    v.ημερομηνία_έναρξης_επίσκεψης as visit_start_date,
    v.visit_start_time,
    v.1_duration as duration_hours,
    v.visit_status
FROM visits v
JOIN resources r ON v.rerource_code = r.resource_code
WHERE v.visit_status = 'Προς έναρξη'
ORDER BY v.ημερομηνία_έναρξης_επίσκεψης ASC;"""
        }
    ]
    
    for query_info in queries:
        sql += f"-- {query_info['description']}\n"
        sql += query_info['query'] + "\n\n"
    
    return sql

if __name__ == "__main__":
    sql_script = generate_sql_schema_and_data()
    print("\nSQL script generation completed successfully!")
    print("File saved to: /Users/mtz/Projects/GEP/backend/gep_demo_complete.sql")