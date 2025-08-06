
# COMPREHENSIVE EXCEL DATA ANALYSIS REPORT
## Generated on: 2025-07-23 09:36:22
## Source File: /Users/mtz/Projects/GEP/Gep DEMO DATA.xlsx

---

## EXECUTIVE SUMMARY

This report provides a comprehensive analysis of the GEP Demo Excel file containing **7 sheets** with detailed business data for a service management system.

### Key Statistics:
- **Total Sheets**: 7
- **Total Records**: 305
- **Total Columns**: 69
- **Identified Relationships**: 37

---

## SHEET-BY-SHEET ANALYSIS


### Client
**Dimensions**: 1 rows × 9 columns

**Purpose**: Master client information and account management details

**Columns**:
- **Group Name** 🔑: object (1 non-null, 1 unique)
- **Company Code** 🔑: object (1 non-null, 1 unique)
- **Active Customer** 🔑: int64 (1 non-null, 1 unique)
- **Company Name** 🔑: object (1 non-null, 1 unique)
- **Company Type** 🔑: object (1 non-null, 1 unique)
- **AFM** 🔑: int64 (1 non-null, 1 unique)
- **Account Manager** 🔑: object (1 non-null, 1 unique)
- **CAD Responsible** 🔑: object (1 non-null, 1 unique)
- **Finance Responsible** 🔑: object (1 non-null, 1 unique)

**Sample Data**:
```
           Group Name Company Code  Active Customer                                    Company Name           Company Type       AFM    Account Manager       CAD Responsible Finance Responsible
0  DEMO HELLAS A.E.E.      C000011                1  DEMO HELLAS ΑΝΩΝΥΜΗ ΕΜΠΟΡΙΚΗ ΕΤΑΙΡΙΑ  ΕΜΠΟΡΙΑΣ  ΥΠΗΡΕΣΙΕΣ ΣΥΝΤΗΡΗΣΗΣ   54835232  ΜΕΓΚΟΥΛΗΣ ΣΤΑΥΡΟΣ  ΛΑΖΟΠΟΥΛΟΣ ΕΥΣΤΑΘΙΟΣ   ΚΟΡΦΑΛΑ ΑΝΔΡΟΝΙΚΗ
```

**Key Insights**:
• Single client organization managing 1 company entity
• Has dedicated account, CAD, and finance managers

---

### Installation
**Dimensions**: 7 rows × 13 columns

**Purpose**: Physical locations where services are provided

**Columns**:
- **Installation Code** 🔑: object (7 non-null, 7 unique)
- **Description** 🔑: object (7 non-null, 7 unique)
- **Installation Category**: object (7 non-null, 1 unique)
- **Installation is Active**: int64 (7 non-null, 2 unique)
- **Employees A Per Installation**: int64 (7 non-null, 1 unique)
- **Employees B Per Installation**: int64 (7 non-null, 1 unique)
- **Employees C Per Installation**: int64 (7 non-null, 2 unique)
- **Employees Per Installation**: int64 (7 non-null, 2 unique)
- **Company Code**: object (7 non-null, 1 unique)
- **Address** 🔑: object (7 non-null, 7 unique)
- **KEPEK Name**: object (7 non-null, 2 unique)
- **Post Code** 🔑: int64 (7 non-null, 7 unique)
- **Installation Work Hours**: object (7 non-null, 4 unique)

**Sample Data**:
```
  Installation Code                                        Description Installation Category  Installation is Active  Employees A Per Installation  Employees B Per Installation  Employees C Per Installation  Employees Per Installation Company Code            Address                KEPEK Name  Post Code           Installation Work Hours
0         INST00029     ΛΕΩΦ. ΣΥΓΓΡΟΥ 320 - ΠΡΟΗΓΟΥΜΕΝΗ ΔΙΕΥΘΥΝΣΗ test                     C                       1                             0                             0                            46                          46      C000011  ΛΕΩΦ. ΣΥΓΓΡΟΥ 350  ΠΕΡΙΦ. Δ/ΝΣΗ ΕΑΥΕ ΑΘΗΝΩΝ      17674  ΔΕΥΤΕΡΑ - ΠΑΡΑΑΣΚΕΥΗ 09:00-17:00
1         INST25442  ΜΙΧΑΛΑΚΟΠΟΥΛΟΥ 98 -  (ΕΝΤΟΣ ΑΧΑ-ΚΥΡΙΑΚΟΠΟΥΛΟΣ Π.)                     C                       0                             0                             0                             1                           1      C000011  ΜΙΧΑΛΑΚΟΠΟΥΛΟΥ 48  ΠΕΡΙΦ. Δ/ΝΣΗ ΕΑΥΕ ΑΘΗΝΩΝ      11528           ΔΕΥT.-ΠΑΡ.: 08:30-16:30
2         INST25445              ΗΛΙΑ ΗΛΙΟΥ 36-37 -  (ΕΝΤΟΣ -ΣΩΚΟΣ Κ.)                     C                       0                             0                             0                             1                           1      C000011   ΗΛΙΑ ΗΛΙΟΥ 35-37  ΠΕΡΙΦ. Δ/ΝΣΗ ΕΑΥΕ ΑΘΗΝΩΝ      11743  ΔΕΥΤΕΡΑ - ΠΑΡΑΑΣΚΕΥΗ 09:00-17:00
```

**Key Insights**:
• 7 installations managed
• 4 currently active
• Total employees across installations: 52
• All installations in Athens metropolitan area

---

### Contract
**Dimensions**: 5 rows × 11 columns

**Purpose**: Service agreements and contract terms

**Columns**:
- **Contract Code** 🔑: object (5 non-null, 5 unique)
- **Company Code**: object (5 non-null, 1 unique)
- **Company Name**: object (5 non-null, 1 unique)
- **Active Contract**: int64 (5 non-null, 2 unique)
- **Characterization**: object (5 non-null, 1 unique)
- **Contract Name** 🔑: object (5 non-null, 5 unique)
- **Contract Start Date**: datetime64[ns] (5 non-null, 4 unique)
- **Contract End Date**: datetime64[ns] (5 non-null, 2 unique)
- **Contract Signed Date AADE**: datetime64[ns] (5 non-null, 4 unique)
- **Contract Value**: float64 (4 non-null, 4 unique)
- **Αορίστου Χρόνου Σύμβαση**: int64 (5 non-null, 2 unique)

**Sample Data**:
```
  Contract Code Company Code                                    Company Name  Active Contract Characterization         Contract Name Contract Start Date Contract End Date Contract Signed Date AADE  Contract Value  Αορίστου Χρόνου Σύμβαση
0     CON000010      C000011  DEMO HELLAS ΑΝΩΝΥΜΗ ΕΜΠΟΡΙΚΗ ΕΤΑΙΡΙΑ  ΕΜΠΟΡΙΑΣ                1            ΚΥΡΙΑ  ΙΕ DEMO HELLAS A.E.E          2004-05-19        2099-12-31                2004-05-19        11494.27                        1
1     CON001601      C000011  DEMO HELLAS ΑΝΩΝΥΜΗ ΕΜΠΟΡΙΚΗ ΕΤΑΙΡΙΑ  ΕΜΠΟΡΙΑΣ                1            ΚΥΡΙΑ  ΤΑ DEMO HELLAS A.E.E          2004-05-26        2099-12-31                2005-06-13         6273.00                        1
2     CON015386      C000011  DEMO HELLAS ΑΝΩΝΥΜΗ ΕΜΠΟΡΙΚΗ ΕΤΑΙΡΙΑ  ΕΜΠΟΡΙΑΣ                0            ΚΥΡΙΑ             THE DREAM          2022-01-01        2022-12-31                2022-06-16             NaN                        0
```

**Key Insights**:
• 5 contracts with total value: €19,967.27
• 4 active contracts
• Contract durations range from 2004 to 2099 (some indefinite term)

---

### Contract Service (Project)
**Dimensions**: 13 rows × 8 columns

**Purpose**: Individual services within contracts with pricing

**Columns**:
- **Conrtact Code**: object (13 non-null, 4 unique)
- **Contract Service Code** 🔑: object (13 non-null, 13 unique)
- **Contract Service Start Date**: datetime64[ns] (13 non-null, 7 unique)
- **Contract Service End Date**: datetime64[ns] (13 non-null, 8 unique)
- **Service Name**: object (13 non-null, 4 unique)
- **Assigned Hours / Quantity**: float64 (13 non-null, 9 unique)
- **Price Per UOM**: int64 (13 non-null, 6 unique)
- **Contract Service Revenue** 🔑: float64 (13 non-null, 13 unique)

**Sample Data**:
```
  Conrtact Code Contract Service Code Contract Service Start Date Contract Service End Date     Service Name  Assigned Hours / Quantity  Price Per UOM  Contract Service Revenue
0     CON000010           CON000010-1                  2020-05-26                2021-11-16  Ιατρός Εργασίας                     117.70             22                   2589.40
1     CON000010           CON000010-2                  2021-05-26                2022-05-25  Ιατρός Εργασίας                      83.46             22                   1836.12
2     CON000010           CON000010-3                  2022-05-26                2023-05-25  Ιατρός Εργασίας                      78.65             22                   1730.30
```

**Key Insights**:
• 13 service projects
• Total revenue: €17,046.02
• Primary service: Τεχνικός Ασφαλείας
• Price range: €14-1200 per unit

---

### Installation Services (Sub Pro)
**Dimensions**: 64 rows × 13 columns

**Purpose**: Services assigned to specific installations

**Columns**:
- **Conrtact Code**: object (64 non-null, 2 unique)
- **(2) Service is active**: int64 (64 non-null, 2 unique)
- **Contract Service Code**: object (64 non-null, 11 unique)
- **Installation Code**: object (64 non-null, 7 unique)
- **Description**: object (64 non-null, 7 unique)
- **Service Name**: object (64 non-null, 2 unique)
- **Service Start Date**: datetime64[ns] (64 non-null, 8 unique)
- **Service End Date**: datetime64[ns] (64 non-null, 9 unique)
- **Assigned Hours**: float64 (64 non-null, 14 unique)
- **Programmed Hours (Sum of Visit Duration)**: float64 (64 non-null, 17 unique)
- **Rerource Code**: object (64 non-null, 13 unique)
- **Resource Name**: object (64 non-null, 13 unique)
- **Service Status Name**: object (64 non-null, 1 unique)

**Sample Data**:
```
  Conrtact Code  (2) Service is active Contract Service Code Installation Code                                        Description     Service Name Service Start Date Service End Date  Assigned Hours  Programmed Hours (Sum of Visit Duration) Rerource Code     Resource Name            Service Status Name
0     CON000010                      0           CON000010-1         INST00029     ΛΕΩΦ. ΣΥΓΓΡΟΥ 320 - ΠΡΟΗΓΟΥΜΕΝΗ ΔΙΕΥΘΥΝΣΗ test  Ιατρός Εργασίας         2020-05-26       2021-11-16           112.7                                    112.70        R00125   ΚΩΣΤΑΣ ΚΩΣΤΑΚΗΣ  Ολοκλήρωση Θεώρηση & Αποστολή
1     CON000010                      0           CON000010-1         INST25442  ΜΙΧΑΛΑΚΟΠΟΥΛΟΥ 98 -  (ΕΝΤΟΣ ΑΧΑ-ΚΥΡΙΑΚΟΠΟΥΛΟΣ Π.)  Ιατρός Εργασίας         2020-05-26       2021-05-25             1.0                                      0.92        R00225      ΧΑΡΟΥΛΑ ΧΑΡΑ  Ολοκλήρωση Θεώρηση & Αποστολή
2     CON000010                      0           CON000010-1         INST25445              ΗΛΙΑ ΗΛΙΟΥ 36-37 -  (ΕΝΤΟΣ -ΣΩΚΟΣ Κ.)  Ιατρός Εργασίας         2020-05-26       2021-05-25             1.0                                      0.92        R00096  ΓΙΑΝΝΗΣ ΓΥΦΤΑΚΗΣ  Ολοκλήρωση Θεώρηση & Αποστολή
```

**Key Insights**:
• 64 installation service assignments
• Services span 8 different time periods
• 13 different resources assigned
• All services currently marked as inactive (status 0)

---

### Visits
**Dimensions**: 202 rows × 11 columns

**Purpose**: Individual service visits and appointments

**Columns**:
- **Service Unique Code**: int64 (202 non-null, 55 unique)
- **Visit Code** 🔑: int64 (202 non-null, 202 unique)
- **Client Name**: object (202 non-null, 1 unique)
- **Rerource Code**: object (202 non-null, 13 unique)
- **Resource Name**: object (202 non-null, 13 unique)
- **Ημερομηνία Έναρξης Επίσκεψης**: datetime64[ns] (202 non-null, 193 unique)
- **Visit Start Time**: object (202 non-null, 41 unique)
- **Ημερομηνία Λήξης Επίσκεψης**: datetime64[ns] (202 non-null, 200 unique)
- **Visit End Time**: object (202 non-null, 48 unique)
- **(1) Duration**: float64 (202 non-null, 39 unique)
- **Visit Status**: object (202 non-null, 4 unique)

**Sample Data**:
```
   Service Unique Code  Visit Code                                     Client Name Rerource Code     Resource Name Ημερομηνία Έναρξης Επίσκεψης Visit Start Time Ημερομηνία Λήξης Επίσκεψης Visit End Time  (1) Duration  Visit Status
0    13136345437232369      632702  DEMO HELLAS ΑΝΩΝΥΜΗ ΕΜΠΟΡΙΚΗ ΕΤΑΙΡΙΑ  ΕΜΠΟΡΙΑΣ        R00096  ΓΙΑΝΝΗΣ ΓΥΦΤΑΚΗΣ                   2023-12-08         15:00:00        2023-12-08 17:00:00       17:00:00           2.0   Προς έναρξη
1    13136345437332393      632700  DEMO HELLAS ΑΝΩΝΥΜΗ ΕΜΠΟΡΙΚΗ ΕΤΑΙΡΙΑ  ΕΜΠΟΡΙΑΣ        R00142    ΜΠΑΛΟΣ ΝΙΚΟΛΑΣ                   2024-05-20         15:00:00        2024-05-20 17:00:00       17:00:00           2.0  Ολοκληρώθηκε
2    13136345802232369      765749  DEMO HELLAS ΑΝΩΝΥΜΗ ΕΜΠΟΡΙΚΗ ΕΤΑΙΡΙΑ  ΕΜΠΟΡΙΑΣ        R00096  ΓΙΑΝΝΗΣ ΓΥΦΤΑΚΗΣ                   2025-04-29         15:00:00        2025-04-29 17:00:00       17:00:00           2.0   Προς έναρξη
```

**Key Insights**:
• 202 visits recorded/planned
• Visit duration averages 4.0 hours
• 46 completed visits
• Spans from 2023 to 2026

---

### Resources
**Dimensions**: 13 rows × 4 columns

**Purpose**: Personnel and service providers (doctors, engineers, etc.)

**Columns**:
- **Resource Code** 🔑: object (13 non-null, 13 unique)
- **Resource Name** 🔑: object (13 non-null, 13 unique)
- **Specialty Name**: object (13 non-null, 9 unique)
- **City**: object (13 non-null, 3 unique)

**Sample Data**:
```
  Resource Code     Resource Name Specialty Name      City
0        R00050   ΔΑΝΕΖΗΣ ΝΙΚΟΛΑΣ      Παθολόγος   ΓΕΡΑΚΑΣ
1        R00096  ΓΙΑΝΝΗΣ ΓΥΦΤΑΚΗΣ         Ιατρός     ΑΘΗΝΑ
2        R00125   ΚΩΣΤΑΣ ΚΩΣΤΑΚΗΣ     Παιδίατρος  ΚΑΛΛΙΘΕΑ
```

**Key Insights**:
• 13 personnel/resources available
• 9 different specialties
• Located across 3 cities
• Mix of medical and engineering professionals

---

## RELATIONSHIP ANALYSIS

The following relationships were identified between sheets based on data analysis:

### Primary Relationships (100% match):
- **Client.Active Customer** → **Installation.Installation is Active** (100.0% match)
- **Client.Active Customer** → **Installation.Employees C Per Installation** (100.0% match)
- **Client.Active Customer** → **Installation.Employees Per Installation** (100.0% match)
- **Client.Active Customer** → **Contract.Active Contract** (100.0% match)
- **Client.Active Customer** → **Contract.Αορίστου Χρόνου Σύμβαση** (100.0% match)
- **Client.Active Customer** → **Installation Services (Sub Pro).(2) Service is active** (100.0% match)
- **Client.Company Name** → **Visits.Client Name** (100.0% match)
- **Installation.Installation is Active** → **Contract.Active Contract** (100.0% match)
- **Installation.Installation is Active** → **Contract.Αορίστου Χρόνου Σύμβαση** (100.0% match)
- **Installation.Employees A Per Installation** → **Contract.Active Contract** (100.0% match)

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

### Contract - Data Quality Issues:
- **Contract Value**: 20.0% missing values

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
