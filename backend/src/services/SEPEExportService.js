const ExcelJS = require('exceljs');
const logger = require('../utils/logger');
const { supabaseAdmin } = require('../config/supabase');
const path = require('path');
const fs = require('fs').promises;

/**
 * SEPE.net Excel Export Service
 * Generates compliant Excel files for SEPE (Greek Employment Organization) reporting
 * Handles visit records, partner certifications, and regulatory compliance data
 */
class SEPEExportService {
    constructor() {
        this.templatePath = path.join(__dirname, '../templates/sepe');
        this.outputPath = path.join(__dirname, '../exports/sepe');
        this.exportFormats = {
            VISITS: 'sepe_visits_template.xlsx',
            PARTNERS: 'sepe_partners_template.xlsx',
            COMPLIANCE: 'sepe_compliance_template.xlsx',
            MONTHLY_SUMMARY: 'sepe_monthly_summary_template.xlsx'
        };
        
        // SEPE field mappings and validation rules
        this.fieldMappings = {
            visits: {
                'Κωδικός Εγκατάστασης': 'installation_code',
                'Επωνυμία Επιχείρησης': 'company_name',
                'ΑΦΜ': 'tax_number',
                'Διεύθυνση': 'address',
                'Πόλη': 'city',
                'Ταχυδρομικός Κώδικας': 'postal_code',
                'Αριθμός Εργαζομένων': 'employees_count',
                'Κατηγορία Κινδύνου': 'risk_category',
                'Ημερομηνία Επίσκεψης': 'visit_date',
                'Ώρα Έναρξης': 'start_time',
                'Ώρα Λήξης': 'end_time',
                'Διάρκεια (Ώρες)': 'duration_hours',
                'Τύπος Υπηρεσίας': 'service_type',
                'Όνομα Συνεργάτη': 'partner_name',
                'ΑΜ Άδειας Συνεργάτη': 'partner_license',
                'Ειδικότητα': 'partner_specialty',
                'Παρατηρήσεις': 'notes',
                'Κατάσταση': 'status'
            },
            partners: {
                'Κωδικός Συνεργάτη': 'partner_id',
                'Επωνυμία': 'full_name',
                'ΑΦΜ': 'tax_number',
                'ΑΜΚΑ': 'social_security_number',
                'Αριθμός Άδειας': 'license_number',
                'Ειδικότητα': 'specialty',
                'Ημερομηνία Έκδοσης Άδειας': 'license_issued_date',
                'Ημερομηνία Λήξης Άδειας': 'license_expiry_date',
                'Διεύθυνση': 'address',
                'Τηλέφωνο': 'phone',
                'Email': 'email',
                'Κατάσταση': 'status',
                'Ημερομηνία Ενεργοποίησης': 'activation_date'
            }
        };
        
        // Initialize export directory
        this.initializeExportDirectory();
    }

    /**
     * Export visits data for SEPE compliance
     */
    async exportVisitsData(filters = {}) {
        try {
            logger.info('Starting SEPE visits export', filters);

            // Validate date range
            if (!filters.startDate || !filters.endDate) {
                throw new Error('Start date and end date are required for SEPE export');
            }

            // Get visits data
            const visitsData = await this.getVisitsData(filters);
            
            if (visitsData.length === 0) {
                throw new Error('No visit data found for the specified period');
            }

            // Create Excel workbook
            const workbook = new ExcelJS.Workbook();
            await this.createVisitsWorksheet(workbook, visitsData, filters);

            // Generate filename
            const filename = this.generateFilename('VISITS', filters);
            const filepath = path.join(this.outputPath, filename);

            // Save workbook
            await workbook.xlsx.writeFile(filepath);

            // Generate export summary
            const summary = this.generateExportSummary('VISITS', visitsData, filters);

            // Log export
            await this.logExport('VISITS', filename, summary, filters);

            logger.info(`SEPE visits export completed: ${filename}`);

            return {
                success: true,
                filename,
                filepath,
                recordCount: visitsData.length,
                summary,
                downloadUrl: `/api/exports/sepe/${filename}`
            };

        } catch (error) {
            logger.error('SEPE visits export failed:', error);
            throw error;
        }
    }

    /**
     * Export partners data for SEPE compliance
     */
    async exportPartnersData(filters = {}) {
        try {
            logger.info('Starting SEPE partners export', filters);

            // Get partners data
            const partnersData = await this.getPartnersData(filters);
            
            if (partnersData.length === 0) {
                throw new Error('No partner data found');
            }

            // Create Excel workbook
            const workbook = new ExcelJS.Workbook();
            await this.createPartnersWorksheet(workbook, partnersData, filters);

            // Generate filename
            const filename = this.generateFilename('PARTNERS', filters);
            const filepath = path.join(this.outputPath, filename);

            // Save workbook
            await workbook.xlsx.writeFile(filepath);

            // Generate export summary
            const summary = this.generateExportSummary('PARTNERS', partnersData, filters);

            // Log export
            await this.logExport('PARTNERS', filename, summary, filters);

            logger.info(`SEPE partners export completed: ${filename}`);

            return {
                success: true,
                filename,
                filepath,
                recordCount: partnersData.length,
                summary,
                downloadUrl: `/api/exports/sepe/${filename}`
            };

        } catch (error) {
            logger.error('SEPE partners export failed:', error);
            throw error;
        }
    }

    /**
     * Export monthly compliance summary
     */
    async exportMonthlySummary(year, month) {
        try {
            logger.info(`Starting SEPE monthly summary export for ${year}-${month}`);

            // Get monthly data
            const summaryData = await this.getMonthlySummaryData(year, month);

            // Create Excel workbook
            const workbook = new ExcelJS.Workbook();
            await this.createMonthlySummaryWorksheet(workbook, summaryData, year, month);

            // Generate filename
            const filename = `SEPE_Monthly_Summary_${year}_${month.toString().padStart(2, '0')}.xlsx`;
            const filepath = path.join(this.outputPath, filename);

            // Save workbook
            await workbook.xlsx.writeFile(filepath);

            // Log export
            await this.logExport('MONTHLY_SUMMARY', filename, summaryData, { year, month });

            logger.info(`SEPE monthly summary export completed: ${filename}`);

            return {
                success: true,
                filename,
                filepath,
                summary: summaryData,
                downloadUrl: `/api/exports/sepe/${filename}`
            };

        } catch (error) {
            logger.error('SEPE monthly summary export failed:', error);
            throw error;
        }
    }

    /**
     * Export compliance report
     */
    async exportComplianceReport(filters = {}) {
        try {
            logger.info('Starting SEPE compliance report export', filters);

            // Get compliance data
            const complianceData = await this.getComplianceData(filters);

            // Create Excel workbook
            const workbook = new ExcelJS.Workbook();
            await this.createComplianceWorksheet(workbook, complianceData, filters);

            // Generate filename
            const filename = this.generateFilename('COMPLIANCE', filters);
            const filepath = path.join(this.outputPath, filename);

            // Save workbook
            await workbook.xlsx.writeFile(filepath);

            // Log export
            await this.logExport('COMPLIANCE', filename, complianceData, filters);

            logger.info(`SEPE compliance export completed: ${filename}`);

            return {
                success: true,
                filename,
                filepath,
                recordCount: complianceData.installations?.length || 0,
                complianceRate: complianceData.overallComplianceRate,
                downloadUrl: `/api/exports/sepe/${filename}`
            };

        } catch (error) {
            logger.error('SEPE compliance export failed:', error);
            throw error;
        }
    }

    /**
     * Create visits worksheet
     */
    async createVisitsWorksheet(workbook, visitsData, filters) {
        const worksheet = workbook.addWorksheet('Επισκέψεις');

        // Set up headers
        const headers = Object.keys(this.fieldMappings.visits);
        worksheet.getRow(1).values = headers;

        // Style headers
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '366092' }
        };

        // Set column widths
        headers.forEach((header, index) => {
            worksheet.getColumn(index + 1).width = this.getColumnWidth(header);
        });

        // Add data rows
        let rowIndex = 2;
        for (const visit of visitsData) {
            const rowData = [];
            
            for (const [greekHeader, fieldName] of Object.entries(this.fieldMappings.visits)) {
                let value = visit[fieldName];
                
                // Format specific fields
                value = this.formatFieldValue(fieldName, value);
                rowData.push(value);
            }
            
            worksheet.getRow(rowIndex).values = rowData;
            
            // Apply conditional formatting
            this.applyVisitRowFormatting(worksheet.getRow(rowIndex), visit);
            
            rowIndex++;
        }

        // Add summary row
        await this.addVisitsSummarySection(worksheet, visitsData, rowIndex + 2);

        // Apply data validation
        this.applyDataValidation(worksheet, 'visits');

        // Add filters
        worksheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: visitsData.length + 1, column: headers.length }
        };

        return worksheet;
    }

    /**
     * Create partners worksheet
     */
    async createPartnersWorksheet(workbook, partnersData, filters) {
        const worksheet = workbook.addWorksheet('Συνεργάτες');

        // Set up headers
        const headers = Object.keys(this.fieldMappings.partners);
        worksheet.getRow(1).values = headers;

        // Style headers
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '366092' }
        };

        // Set column widths
        headers.forEach((header, index) => {
            worksheet.getColumn(index + 1).width = this.getColumnWidth(header);
        });

        // Add data rows
        let rowIndex = 2;
        for (const partner of partnersData) {
            const rowData = [];
            
            for (const [greekHeader, fieldName] of Object.entries(this.fieldMappings.partners)) {
                let value = partner[fieldName];
                value = this.formatFieldValue(fieldName, value);
                rowData.push(value);
            }
            
            worksheet.getRow(rowIndex).values = rowData;
            
            // Apply conditional formatting for license expiry
            this.applyPartnerRowFormatting(worksheet.getRow(rowIndex), partner);
            
            rowIndex++;
        }

        // Add summary section
        await this.addPartnersSummarySection(worksheet, partnersData, rowIndex + 2);

        // Apply data validation
        this.applyDataValidation(worksheet, 'partners');

        return worksheet;
    }

    /**
     * Create monthly summary worksheet
     */
    async createMonthlySummaryWorksheet(workbook, summaryData, year, month) {
        const worksheet = workbook.addWorksheet('Μηνιαία Σύνοψη');

        // Add title
        worksheet.mergeCells('A1:F1');
        worksheet.getCell('A1').value = `Μηνιαία Αναφορά ΣΕΠΕ - ${this.getGreekMonthName(month)} ${year}`;
        worksheet.getCell('A1').font = { bold: true, size: 16 };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };

        let currentRow = 3;

        // Summary statistics
        worksheet.getCell(`A${currentRow}`).value = 'ΣΤΑΤΙΣΤΙΚΑ ΣΤΟΙΧΕΙΑ';
        worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
        currentRow += 2;

        const summaryStats = [
            ['Συνολικές Επισκέψεις:', summaryData.totalVisits],
            ['Ενεργά Συνεργάτες:', summaryData.activePartners],
            ['Εγκαταστάσεις με Επισκέψεις:', summaryData.visitedInstallations],
            ['Συνολικές Ώρες Υπηρεσιών:', summaryData.totalServiceHours],
            ['Ποσοστό Συμμόρφωσης:', `${summaryData.complianceRate}%`],
            ['Μέσος Όρος Ωρών ανά Επίσκεψη:', summaryData.averageHoursPerVisit]
        ];

        summaryStats.forEach(([label, value]) => {
            worksheet.getCell(`A${currentRow}`).value = label;
            worksheet.getCell(`B${currentRow}`).value = value;
            worksheet.getCell(`A${currentRow}`).font = { bold: true };
            currentRow++;
        });

        currentRow += 2;

        // Breakdown by service type
        worksheet.getCell(`A${currentRow}`).value = 'ΑΝΑΛΥΣΗ ΑΝΑ ΤΥΠΟ ΥΠΗΡΕΣΙΑΣ';
        worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
        currentRow += 2;

        const serviceHeaders = ['Τύπος Υπηρεσίας', 'Επισκέψεις', 'Ώρες', 'Μέσος Όρος'];
        serviceHeaders.forEach((header, index) => {
            worksheet.getCell(String.fromCharCode(65 + index) + currentRow).value = header;
            worksheet.getCell(String.fromCharCode(65 + index) + currentRow).font = { bold: true };
        });
        currentRow++;

        summaryData.serviceTypeBreakdown.forEach(service => {
            worksheet.getCell(`A${currentRow}`).value = service.type;
            worksheet.getCell(`B${currentRow}`).value = service.visits;
            worksheet.getCell(`C${currentRow}`).value = service.hours;
            worksheet.getCell(`D${currentRow}`).value = service.average;
            currentRow++;
        });

        // Format the worksheet
        this.formatSummaryWorksheet(worksheet);

        return worksheet;
    }

    /**
     * Create compliance worksheet
     */
    async createComplianceWorksheet(workbook, complianceData, filters) {
        const worksheet = workbook.addWorksheet('Συμμόρφωση');

        // Add title
        worksheet.mergeCells('A1:H1');
        worksheet.getCell('A1').value = 'Αναφορά Συμμόρφωσης ΣΕΠΕ';
        worksheet.getCell('A1').font = { bold: true, size: 16 };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };

        let currentRow = 3;

        // Overall compliance summary
        worksheet.getCell(`A${currentRow}`).value = 'ΣΥΝΟΛΙΚΗ ΣΥΜΜΟΡΦΩΣΗ';
        worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
        currentRow += 2;

        const complianceStats = [
            ['Συνολικές Εγκαταστάσεις:', complianceData.totalInstallations],
            ['Σύμμορφες Εγκαταστάσεις:', complianceData.compliantInstallations],
            ['Μη Σύμμορφες Εγκαταστάσεις:', complianceData.nonCompliantInstallations],
            ['Ποσοστό Συμμόρφωσης:', `${complianceData.overallComplianceRate}%`]
        ];

        complianceStats.forEach(([label, value]) => {
            worksheet.getCell(`A${currentRow}`).value = label;
            worksheet.getCell(`B${currentRow}`).value = value;
            worksheet.getCell(`A${currentRow}`).font = { bold: true };
            currentRow++;
        });

        currentRow += 2;

        // Detailed compliance table
        worksheet.getCell(`A${currentRow}`).value = 'ΛΕΠΤΟΜΕΡΗ ΣΤΟΙΧΕΙΑ ΣΥΜΜΟΡΦΩΣΗΣ';
        worksheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
        currentRow += 2;

        const complianceHeaders = [
            'Κωδικός Εγκατάστασης', 'Επωνυμία', 'Κατηγορία', 'Απαιτούμενες Ώρες',
            'Πραγματοποιηθείσες Ώρες', 'Συμμόρφωση', 'Παρατηρήσεις'
        ];

        complianceHeaders.forEach((header, index) => {
            worksheet.getCell(String.fromCharCode(65 + index) + currentRow).value = header;
            worksheet.getCell(String.fromCharCode(65 + index) + currentRow).font = { bold: true };
        });
        currentRow++;

        // Add compliance data
        complianceData.installations.forEach(installation => {
            worksheet.getCell(`A${currentRow}`).value = installation.installation_code;
            worksheet.getCell(`B${currentRow}`).value = installation.company_name;
            worksheet.getCell(`C${currentRow}`).value = installation.category;
            worksheet.getCell(`D${currentRow}`).value = installation.required_hours;
            worksheet.getCell(`E${currentRow}`).value = installation.actual_hours;
            worksheet.getCell(`F${currentRow}`).value = installation.compliant ? 'ΝΑΙ' : 'ΟΧΙ';
            worksheet.getCell(`G${currentRow}`).value = installation.notes || '';

            // Color code based on compliance
            if (!installation.compliant) {
                worksheet.getRow(currentRow).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFCCCC' }
                };
            }

            currentRow++;
        });

        return worksheet;
    }

    /**
     * Get visits data from database
     */
    async getVisitsData(filters) {
        try {
            let query = supabaseAdmin
                .from('visits')
                .select(`
                    *,
                    installations(
                        installation_code,
                        company_name,
                        tax_number,
                        address,
                        city,
                        postal_code,
                        employees_count,
                        category
                    ),
                    partners(
                        name,
                        license_number,
                        specialty,
                        tax_number
                    )
                `)
                .gte('visit_date', filters.startDate)
                .lte('visit_date', filters.endDate)
                .eq('status', 'completed'); // Only export completed visits

            // Apply additional filters
            if (filters.partnerIds && filters.partnerIds.length > 0) {
                query = query.in('partner_id', filters.partnerIds);
            }

            if (filters.installationCodes && filters.installationCodes.length > 0) {
                query = query.in('installation_code', filters.installationCodes);
            }

            if (filters.serviceTypes && filters.serviceTypes.length > 0) {
                query = query.in('service_type', filters.serviceTypes);
            }

            const { data, error } = await query.order('visit_date', { ascending: true });

            if (error) {
                throw error;
            }

            // Transform data for SEPE format
            return data.map(visit => ({
                installation_code: visit.installations?.installation_code || visit.installation_code,
                company_name: visit.installations?.company_name || '',
                tax_number: visit.installations?.tax_number || '',
                address: visit.installations?.address || '',
                city: visit.installations?.city || '',
                postal_code: visit.installations?.postal_code || '',
                employees_count: visit.installations?.employees_count || 0,
                risk_category: visit.installations?.category || '',
                visit_date: visit.visit_date,
                start_time: visit.start_time,
                end_time: visit.end_time,
                duration_hours: visit.duration_hours || this.calculateDuration(visit.start_time, visit.end_time),
                service_type: this.translateServiceType(visit.service_type),
                partner_name: visit.partners?.name || '',
                partner_license: visit.partners?.license_number || '',
                partner_specialty: visit.partners?.specialty || '',
                notes: visit.notes || '',
                status: this.translateStatus(visit.status)
            }));

        } catch (error) {
            logger.error('Failed to get visits data:', error);
            throw error;
        }
    }

    /**
     * Get partners data from database
     */
    async getPartnersData(filters) {
        try {
            let query = supabaseAdmin
                .from('partners')
                .select('*');

            // Apply filters
            if (filters.activeOnly !== false) {
                query = query.eq('is_active', true);
            }

            if (filters.specialties && filters.specialties.length > 0) {
                query = query.in('specialty', filters.specialties);
            }

            const { data, error } = await query.order('name', { ascending: true });

            if (error) {
                throw error;
            }

            return data.map(partner => ({
                partner_id: partner.id,
                full_name: partner.name,
                tax_number: partner.tax_number || '',
                social_security_number: partner.social_security_number || '',
                license_number: partner.license_number || '',
                specialty: partner.specialty || '',
                license_issued_date: partner.license_issued_date || '',
                license_expiry_date: partner.license_expiry_date || '',
                address: partner.address || '',
                phone: partner.phone || '',
                email: partner.email || '',
                status: partner.is_active ? 'ΕΝΕΡΓΟΣ' : 'ΑΝΕΝΕΡΓΟΣ',
                activation_date: partner.created_at
            }));

        } catch (error) {
            logger.error('Failed to get partners data:', error);
            throw error;
        }
    }

    /**
     * Get monthly summary data
     */
    async getMonthlySummaryData(year, month) {
        try {
            const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
            const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month

            // Get visits for the month
            const { data: visits, error: visitsError } = await supabaseAdmin
                .from('visits')
                .select('*, partners(name), installations(company_name)')
                .gte('visit_date', startDate)
                .lte('visit_date', endDate)
                .eq('status', 'completed');

            if (visitsError) {
                throw visitsError;
            }

            // Calculate summary statistics
            const totalVisits = visits.length;
            const totalServiceHours = visits.reduce((sum, visit) => {
                return sum + (visit.duration_hours || this.calculateDuration(visit.start_time, visit.end_time));
            }, 0);

            const uniquePartners = new Set(visits.map(v => v.partner_id)).size;
            const uniqueInstallations = new Set(visits.map(v => v.installation_code)).size;

            const averageHoursPerVisit = totalVisits > 0 ? (totalServiceHours / totalVisits).toFixed(2) : 0;

            // Service type breakdown
            const serviceTypeBreakdown = visits.reduce((breakdown, visit) => {
                const type = this.translateServiceType(visit.service_type);
                if (!breakdown[type]) {
                    breakdown[type] = { type, visits: 0, hours: 0 };
                }
                breakdown[type].visits++;
                breakdown[type].hours += visit.duration_hours || this.calculateDuration(visit.start_time, visit.end_time);
                return breakdown;
            }, {});

            // Calculate averages for breakdown
            Object.values(serviceTypeBreakdown).forEach(service => {
                service.average = service.visits > 0 ? (service.hours / service.visits).toFixed(2) : 0;
            });

            // Calculate compliance rate (simplified)
            const complianceRate = 85; // Placeholder - would be calculated based on actual requirements

            return {
                totalVisits,
                totalServiceHours: totalServiceHours.toFixed(2),
                activePartners: uniquePartners,
                visitedInstallations: uniqueInstallations,
                averageHoursPerVisit,
                complianceRate,
                serviceTypeBreakdown: Object.values(serviceTypeBreakdown)
            };

        } catch (error) {
            logger.error('Failed to get monthly summary data:', error);
            throw error;
        }
    }

    /**
     * Get compliance data
     */
    async getComplianceData(filters) {
        try {
            // Get all installations with their visit data
            const { data: installations, error } = await supabaseAdmin
                .from('installations')
                .select(`
                    *,
                    visits!visits_installation_code_fkey(
                        visit_date,
                        duration_hours,
                        start_time,
                        end_time,
                        status
                    )
                `);

            if (error) {
                throw error;
            }

            const complianceData = {
                totalInstallations: installations.length,
                compliantInstallations: 0,
                nonCompliantInstallations: 0,
                overallComplianceRate: 0,
                installations: []
            };

            installations.forEach(installation => {
                // Calculate required hours based on SEPE regulations
                const requiredHours = this.calculateRequiredHours(installation);
                
                // Calculate actual hours from completed visits
                const completedVisits = installation.visits.filter(v => v.status === 'completed');
                const actualHours = completedVisits.reduce((sum, visit) => {
                    return sum + (visit.duration_hours || this.calculateDuration(visit.start_time, visit.end_time));
                }, 0);

                const compliant = actualHours >= requiredHours;
                
                if (compliant) {
                    complianceData.compliantInstallations++;
                } else {
                    complianceData.nonCompliantInstallations++;
                }

                complianceData.installations.push({
                    installation_code: installation.installation_code,
                    company_name: installation.company_name,
                    category: installation.category,
                    required_hours: requiredHours,
                    actual_hours: actualHours.toFixed(2),
                    compliant,
                    notes: compliant ? '' : 'Ανεπαρκείς ώρες υπηρεσιών'
                });
            });

            complianceData.overallComplianceRate = (
                (complianceData.compliantInstallations / complianceData.totalInstallations) * 100
            ).toFixed(2);

            return complianceData;

        } catch (error) {
            logger.error('Failed to get compliance data:', error);
            throw error;
        }
    }

    // Helper methods
    formatFieldValue(fieldName, value) {
        if (value === null || value === undefined) {
            return '';
        }

        switch (fieldName) {
            case 'visit_date':
            case 'license_issued_date':
            case 'license_expiry_date':
            case 'activation_date':
                return value ? new Date(value).toLocaleDateString('el-GR') : '';
            
            case 'start_time':
            case 'end_time':
                return value ? value.substring(0, 5) : '';
            
            case 'duration_hours':
                return value ? parseFloat(value).toFixed(2) : '';
            
            case 'employees_count':
                return value ? parseInt(value) : 0;
            
            default:
                return value.toString();
        }
    }

    translateServiceType(serviceType) {
        const translations = {
            'occupational_doctor': 'Ιατρός Εργασίας',
            'safety_engineer': 'Μηχανικός Ασφαλείας',
            'specialist_consultation': 'Ειδική Συμβουλευτική'
        };
        return translations[serviceType] || serviceType;
    }

    translateStatus(status) {
        const translations = {
            'scheduled': 'Προγραμματισμένη',
            'confirmed': 'Επιβεβαιωμένη',
            'completed': 'Ολοκληρωμένη',
            'cancelled': 'Ακυρωμένη'
        };
        return translations[status] || status;
    }

    calculateDuration(startTime, endTime) {
        if (!startTime || !endTime) return 0;
        
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        
        return Math.max(0, (end - start) / (1000 * 60 * 60)); // Hours
    }

    calculateRequiredHours(installation) {
        // Simplified SEPE calculation - would be more complex in reality
        const baseHours = {
            'A': 40, // High risk
            'B': 20, // Medium risk
            'C': 10  // Low risk
        };
        
        const category = installation.category || 'C';
        const employeeMultiplier = Math.max(1, Math.floor(installation.employees_count / 50));
        
        return (baseHours[category] || 10) * employeeMultiplier;
    }

    getColumnWidth(header) {
        const widths = {
            'Κωδικός Εγκατάστασης': 20,
            'Επωνυμία Επιχείρησης': 30,
            'ΑΦΜ': 15,
            'Διεύθυνση': 35,
            'Ημερομηνία Επίσκεψης': 18,
            'Όνομα Συνεργάτη': 25,
            'Παρατηρήσεις': 40,
            'Email': 30
        };
        return widths[header] || 15;
    }

    getGreekMonthName(month) {
        const months = [
            'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος',
            'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος',
            'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'
        ];
        return months[month - 1] || 'Άγνωστος';
    }

    generateFilename(type, filters) {
        const timestamp = new Date().toISOString().split('T')[0];
        const typeMap = {
            'VISITS': 'Επισκεψεις',
            'PARTNERS': 'Συνεργατες',
            'COMPLIANCE': 'Συμμορφωση'
        };
        
        return `SEPE_${typeMap[type]}_${timestamp}.xlsx`;
    }

    generateExportSummary(type, data, filters) {
        return {
            exportType: type,
            recordCount: data.length,
            exportDate: new Date().toISOString(),
            filters,
            generatedBy: 'SEPE Export Service'
        };
    }

    async initializeExportDirectory() {
        try {
            await fs.mkdir(this.outputPath, { recursive: true });
        } catch (error) {
            logger.error('Failed to initialize export directory:', error);
        }
    }

    async logExport(type, filename, summary, filters) {
        try {
            await supabaseAdmin
                .from('export_log')
                .insert([{
                    export_type: 'SEPE',
                    export_subtype: type,
                    filename,
                    record_count: summary.recordCount || summary.totalInstallations || 0,
                    filters,
                    summary,
                    created_at: new Date().toISOString()
                }]);
        } catch (error) {
            logger.error('Failed to log export:', error);
        }
    }

    // Placeholder methods for worksheet formatting
    applyVisitRowFormatting(row, visit) {
        // Apply conditional formatting based on visit status, compliance, etc.
    }

    applyPartnerRowFormatting(row, partner) {
        // Highlight partners with expiring licenses
        if (partner.license_expiry_date) {
            const expiryDate = new Date(partner.license_expiry_date);
            const warningDate = new Date();
            warningDate.setMonth(warningDate.getMonth() + 3); // 3 months warning
            
            if (expiryDate < warningDate) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFCC' }
                };
            }
        }
    }

    async addVisitsSummarySection(worksheet, visitsData, startRow) {
        // Add summary statistics at the bottom
        const totalVisits = visitsData.length;
        const totalHours = visitsData.reduce((sum, visit) => sum + (parseFloat(visit.duration_hours) || 0), 0);
        
        worksheet.getCell(`A${startRow}`).value = 'ΣΥΝΟΨΗ:';
        worksheet.getCell(`A${startRow}`).font = { bold: true };
        worksheet.getCell(`A${startRow + 1}`).value = `Συνολικές Επισκέψεις: ${totalVisits}`;
        worksheet.getCell(`A${startRow + 2}`).value = `Συνολικές Ώρες: ${totalHours.toFixed(2)}`;
    }

    async addPartnersSummarySection(worksheet, partnersData, startRow) {
        const activePartners = partnersData.filter(p => p.status === 'ΕΝΕΡΓΟΣ').length;
        
        worksheet.getCell(`A${startRow}`).value = 'ΣΥΝΟΨΗ:';
        worksheet.getCell(`A${startRow}`).font = { bold: true };
        worksheet.getCell(`A${startRow + 1}`).value = `Συνολικοί Συνεργάτες: ${partnersData.length}`;
        worksheet.getCell(`A${startRow + 2}`).value = `Ενεργοί Συνεργάτες: ${activePartners}`;
    }

    applyDataValidation(worksheet, type) {
        // Apply data validation rules for specific columns
        // This would include dropdown lists, date formats, etc.
    }

    formatSummaryWorksheet(worksheet) {
        // Apply professional formatting to summary worksheet
        worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell, colNumber) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });
    }
}

module.exports = SEPEExportService;