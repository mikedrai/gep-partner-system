import { partnersApi, installationsApi, contractsApi } from './supabaseApi.ts';
import { traceabilityService } from './traceabilityService.ts';

interface CustomerRequest {
  id: number;
  client_name: string;
  number_of_installations: number;
  total_employees: number;
  installation_type: string;
  work_type: string;
  contract_completion_date: string;
  number_of_visits?: number;
  hours_of_operation: string;
  blocked_dates?: string[];
  preferred_dates?: string[];
  specific_requests?: string;
  location: string;
  contact_email: string;
  contact_phone: string;
  calculated_hours: number;
  estimated_cost: number;
  priority: 'high' | 'medium' | 'low';
}

interface Partner {
  id: string;
  name: string;
  specialty: string;
  city: string;
  working_hours: string;
  blocked_days: string[];
  hourly_rate: number;
  max_hours_per_week: number;
  experience_years: number;
  availability_status: string;
  is_active: boolean;
  rating: number;
}

interface Installation {
  installation_code: string;
  company_code: string;
  address: string;
  employees_count: number;
  category: string;
  description: string;
}

interface ScheduledVisit {
  id: string;
  partner_id: string;
  installation_id: string;
  customer_request_id: number;
  visit_date: string;
  visit_time: string;
  duration_hours: number;
  status: 'proposed' | 'confirmed' | 'completed' | 'cancelled';
  visit_type: 'initial' | 'follow_up' | 'final';
  notes?: string;
}

interface AIRecommendation {
  partner_id: string;
  partner_name: string;
  match_score: number;
  installation_assignments: InstallationAssignment[];
  total_estimated_hours: number;
  total_estimated_cost: number;
  schedule_conflicts: number;
  travel_efficiency_score: number;
  reasoning: string[];
  proposed_schedule: ScheduledVisit[];
}

interface InstallationAssignment {
  installation_id: string;
  installation_address: string;
  employees_count: number;
  recommended_visits: number;
  visit_frequency: 'monthly' | 'bi-monthly';
  estimated_hours_per_visit: number;
}

class AIScheduler {
  private partners: Partner[] = [];
  private installations: Installation[] = [];
  private existingSchedules: ScheduledVisit[] = [];

  async initialize() {
    try {
      console.log('🤖 Initializing AI Scheduler...');
      
      // Load partners and installations data
      const [partnersData, installationsData] = await Promise.all([
        this.loadPartners(),
        this.loadInstallations()
      ]);

      this.partners = partnersData;
      this.installations = installationsData;

      // Load existing schedules from localStorage (simulated)
      this.existingSchedules = this.loadExistingSchedules();

      console.log('✅ AI Scheduler initialized:', {
        partners: this.partners.length,
        installations: this.installations.length,
        existingSchedules: this.existingSchedules.length
      });

    } catch (error) {
      console.error('❌ Error initializing AI Scheduler:', error);
      throw error;
    }
  }

  private async loadPartners(): Promise<Partner[]> {
    try {
      const partners = await partnersApi.getAll();
      return partners || [];
    } catch (error) {
      console.warn('⚠️ Failed to load partners, using fallback data');
      return this.getFallbackPartners();
    }
  }

  private async loadInstallations(): Promise<Installation[]> {
    try {
      const installations = await installationsApi.getAll();
      return installations || [];
    } catch (error) {
      console.warn('⚠️ Failed to load installations, using fallback data');
      return this.getFallbackInstallations();
    }
  }

  private loadExistingSchedules(): ScheduledVisit[] {
    const stored = localStorage.getItem('scheduledVisits');
    return stored ? JSON.parse(stored) : [];
  }

  private saveSchedules(schedules: ScheduledVisit[]) {
    localStorage.setItem('scheduledVisits', JSON.stringify(schedules));
    this.existingSchedules = schedules;
  }

  async generateRecommendations(customerRequest: CustomerRequest): Promise<AIRecommendation[]> {
    console.log('🎯 Generating AI recommendations for request:', customerRequest.id);

    if (this.partners.length === 0) {
      await this.initialize();
    }

    const eligiblePartners = this.findEligiblePartners(customerRequest);
    const recommendations: AIRecommendation[] = [];

    for (const partner of eligiblePartners) {
      const recommendation = await this.evaluatePartnerForRequest(partner, customerRequest);
      if (recommendation.match_score > 60) { // Only include viable matches
        recommendations.push(recommendation);
      }
    }

    // Sort by match score (highest first)
    recommendations.sort((a, b) => b.match_score - a.match_score);

    // Track AI recommendation generation
    traceabilityService.trackAIRecommendationGenerated(
      customerRequest.id.toString(),
      recommendations
    );

    console.log('✅ Generated recommendations:', recommendations.length);
    return recommendations.slice(0, 3); // Return top 3 recommendations
  }

  private findEligiblePartners(request: CustomerRequest): Partner[] {
    return this.partners.filter(partner => {
      // Must be active and available
      if (!partner.is_active || partner.availability_status !== 'Available') {
        return false;
      }

      // Check specialty match for medical work
      const requiresMedical = ['routine_health_check', 'comprehensive_health_assessment', 'occupational_health_screening'].includes(request.work_type);
      const requiresSafety = ['safety_inspection', 'compliance_audit', 'emergency_response_assessment'].includes(request.work_type);

      if (requiresMedical && !partner.specialty.toLowerCase().includes('παθολόγος')) {
        return false;
      }

      if (requiresSafety && !partner.specialty.toLowerCase().includes('μηχανικός')) {
        return false;
      }

      return true;
    });
  }

  private async evaluatePartnerForRequest(partner: Partner, request: CustomerRequest): Promise<AIRecommendation> {
    // Calculate installation assignments
    const installationAssignments = this.calculateInstallationAssignments(request);

    // Generate proposed schedule
    const proposedSchedule = this.generateVisitSchedule(partner, request, installationAssignments);

    // Calculate various scores
    const scheduleConflicts = this.checkScheduleConflicts(partner.id, proposedSchedule);
    const travelEfficiencyScore = this.calculateTravelEfficiency(partner, installationAssignments);
    const specialtyMatchScore = this.calculateSpecialtyMatch(partner, request);
    const availabilityScore = this.calculateAvailabilityScore(partner, request);
    const costEfficiencyScore = this.calculateCostEfficiency(partner, request);
    const locationProximityScore = this.calculateLocationProximity(partner, request);

    // Calculate overall match score
    const matchScore = Math.round(
      (specialtyMatchScore * 0.3) +
      (availabilityScore * 0.25) +
      (travelEfficiencyScore * 0.2) +
      (costEfficiencyScore * 0.15) +
      (locationProximityScore * 0.1)
    );

    // Generate reasoning
    const reasoning = this.generateReasoning(partner, request, {
      specialtyMatchScore,
      availabilityScore,
      travelEfficiencyScore,
      costEfficiencyScore,
      locationProximityScore,
      scheduleConflicts
    });

    // Calculate totals
    const totalEstimatedHours = installationAssignments.reduce((sum, ia) => 
      sum + (ia.recommended_visits * ia.estimated_hours_per_visit), 0
    );
    const totalEstimatedCost = totalEstimatedHours * partner.hourly_rate;

    return {
      partner_id: partner.id,
      partner_name: partner.name,
      match_score: Math.max(0, matchScore - (scheduleConflicts * 10)), // Penalize conflicts
      installation_assignments: installationAssignments,
      total_estimated_hours: totalEstimatedHours,
      total_estimated_cost: totalEstimatedCost,
      schedule_conflicts: scheduleConflicts,
      travel_efficiency_score: travelEfficiencyScore,
      reasoning,
      proposed_schedule: proposedSchedule
    };
  }

  private calculateInstallationAssignments(request: CustomerRequest): InstallationAssignment[] {
    // For simplicity, assume equal distribution across installations
    const installationsPerRequest = Math.min(request.number_of_installations, this.installations.length);
    const employeesPerInstallation = Math.ceil(request.total_employees / installationsPerRequest);

    return this.installations.slice(0, installationsPerRequest).map(installation => {
      const employeeCount = Math.min(employeesPerInstallation, installation.employees_count);
      const hoursPerVisit = this.calculateHoursPerVisit(employeeCount, request.work_type);
      const visitsNeeded = this.calculateVisitsNeeded(request, employeeCount);
      
      return {
        installation_id: installation.installation_code,
        installation_address: installation.address,
        employees_count: employeeCount,
        recommended_visits: visitsNeeded,
        visit_frequency: visitsNeeded > 6 ? 'monthly' : 'bi-monthly',
        estimated_hours_per_visit: hoursPerVisit
      };
    });
  }

  private calculateHoursPerVisit(employeeCount: number, workType: string): number {
    const baseHours = workType === 'comprehensive_health_assessment' ? 2 : 1.5;
    return Math.min(Math.max(1, Math.ceil(employeeCount / 20 * baseHours)), 2); // 1-2 hours per visit
  }

  private calculateVisitsNeeded(request: CustomerRequest, employeeCount: number): number {
    if (request.number_of_visits) {
      return request.number_of_visits;
    }

    // Calculate based on contract duration and employee count
    const contractStart = new Date();
    const contractEnd = new Date(request.contract_completion_date);
    const monthsDuration = Math.ceil((contractEnd.getTime() - contractStart.getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    // Monthly or bi-monthly visits based on employee count
    const frequency = employeeCount > 20 ? 1 : 2; // Monthly for large sites, bi-monthly for small
    return Math.ceil(monthsDuration / frequency);
  }

  private generateVisitSchedule(partner: Partner, request: CustomerRequest, assignments: InstallationAssignment[]): ScheduledVisit[] {
    const schedule: ScheduledVisit[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7); // Start next week

    let currentDate = new Date(startDate);
    let visitId = 1000;

    for (const assignment of assignments) {
      for (let visitNum = 0; visitNum < assignment.recommended_visits; visitNum++) {
        // Skip blocked dates and partner blocked days
        while (this.isDateBlocked(currentDate, partner, request)) {
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Skip weekends
        while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
          currentDate.setDate(currentDate.getDate() + 1);
        }

        const visit: ScheduledVisit = {
          id: `visit-${++visitId}`,
          partner_id: partner.id,
          installation_id: assignment.installation_id,
          customer_request_id: request.id,
          visit_date: currentDate.toISOString().split('T')[0],
          visit_time: this.getOptimalVisitTime(partner),
          duration_hours: assignment.estimated_hours_per_visit,
          status: 'proposed',
          visit_type: visitNum === 0 ? 'initial' : visitNum === assignment.recommended_visits - 1 ? 'final' : 'follow_up'
        };

        schedule.push(visit);

        // Schedule next visit based on frequency
        const daysUntilNext = assignment.visit_frequency === 'monthly' ? 30 : 60;
        currentDate.setDate(currentDate.getDate() + daysUntilNext);
      }
    }

    return schedule;
  }

  private isDateBlocked(date: Date, partner: Partner, request: CustomerRequest): boolean {
    const dateStr = date.toISOString().split('T')[0];
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

    // Check customer blocked dates
    if (request.blocked_dates?.includes(dateStr)) {
      return true;
    }

    // Check partner blocked days
    if (partner.blocked_days?.includes(dayName)) {
      return true;
    }

    // Check existing schedules for conflicts
    const hasConflict = this.existingSchedules.some(visit => 
      visit.partner_id === partner.id && 
      visit.visit_date === dateStr &&
      visit.status !== 'cancelled'
    );

    return hasConflict;
  }

  private getOptimalVisitTime(partner: Partner): string {
    // Parse working hours and suggest mid-morning time
    const workingHours = partner.working_hours || '09:00-17:00';
    const startTime = workingHours.split('-')[0];
    const startHour = parseInt(startTime.split(':')[0]);
    
    // Suggest 2 hours after start time for optimal scheduling
    const optimalHour = Math.min(startHour + 2, 14); // No later than 2 PM
    return `${optimalHour.toString().padStart(2, '0')}:00`;
  }

  private checkScheduleConflicts(partnerId: string, proposedSchedule: ScheduledVisit[]): number {
    let conflicts = 0;
    
    for (const visit of proposedSchedule) {
      const hasConflict = this.existingSchedules.some(existing => 
        existing.partner_id === partnerId &&
        existing.visit_date === visit.visit_date &&
        existing.status !== 'cancelled'
      );
      
      if (hasConflict) conflicts++;
    }

    return conflicts;
  }

  private calculateSpecialtyMatch(partner: Partner, request: CustomerRequest): number {
    const workType = request.work_type.toLowerCase();
    const specialty = partner.specialty.toLowerCase();

    if (workType.includes('health') && specialty.includes('παθολόγος')) return 95;
    if (workType.includes('safety') && specialty.includes('μηχανικός')) return 95;
    if (workType.includes('occupational') && specialty.includes('παθολόγος')) return 90;

    return 70; // General match
  }

  private calculateAvailabilityScore(partner: Partner, request: CustomerRequest): number {
    const baseScore = partner.availability_status === 'Available' ? 90 : 50;
    const experienceBonus = Math.min(partner.experience_years * 2, 20);
    const ratingBonus = (partner.rating - 3) * 10;

    return Math.min(100, baseScore + experienceBonus + ratingBonus);
  }

  private calculateTravelEfficiency(partner: Partner, assignments: InstallationAssignment[]): number {
    // Simple proximity calculation based on city matching
    const sameCity = assignments.some(a => 
      a.installation_address.toLowerCase().includes(partner.city.toLowerCase())
    );

    return sameCity ? 90 : 70;
  }

  private calculateCostEfficiency(partner: Partner, request: CustomerRequest): number {
    const averageRate = 70; // Market average
    const efficiency = Math.max(0, 100 - ((partner.hourly_rate - averageRate) / averageRate * 50));
    return Math.min(100, efficiency);
  }

  private calculateLocationProximity(partner: Partner, request: CustomerRequest): number {
    // Simple location matching
    const sameLocation = request.location.toLowerCase().includes(partner.city.toLowerCase()) ||
                        partner.city.toLowerCase().includes(request.location.toLowerCase());
    
    return sameLocation ? 95 : 75;
  }

  private generateReasoning(partner: Partner, request: CustomerRequest, scores: any): string[] {
    const reasoning: string[] = [];

    if (scores.specialtyMatchScore > 90) {
      reasoning.push(`Perfect specialty match: ${partner.specialty} ideal for ${request.work_type}`);
    }

    if (scores.availabilityScore > 85) {
      reasoning.push(`High availability: ${partner.experience_years} years experience, ${partner.rating}/5.0 rating`);
    }

    if (scores.travelEfficiencyScore > 85) {
      reasoning.push(`Excellent location efficiency: Partner based in ${partner.city}`);
    }

    if (scores.costEfficiencyScore > 80) {
      reasoning.push(`Cost-effective: €${partner.hourly_rate}/hour rate within budget`);
    }

    if (scores.scheduleConflicts === 0) {
      reasoning.push('No scheduling conflicts detected');
    } else {
      reasoning.push(`${scores.scheduleConflicts} potential scheduling conflicts need resolution`);
    }

    return reasoning;
  }

  async confirmPartnerAssignment(recommendationId: string, partnerId: string): Promise<boolean> {
    console.log('📧 Sending confirmation request to partner:', partnerId);
    
    // Simulate email sending
    const confirmationData = {
      partner_id: partnerId,
      request_timestamp: new Date().toISOString(),
      confirmation_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      status: 'pending_confirmation'
    };

    // Store confirmation request
    const existingRequests = JSON.parse(localStorage.getItem('confirmationRequests') || '[]');
    existingRequests.push(confirmationData);
    localStorage.setItem('confirmationRequests', JSON.stringify(existingRequests));

    console.log('✅ Confirmation request sent, 24-hour timer started');
    return true;
  }

  // Fallback data methods
  private getFallbackPartners(): Partner[] {
    return [
      {
        id: 'R00050',
        name: 'ΔΑΝΕΖΗΣ ΝΙΚΟΛΑΣ',
        specialty: 'Παθολόγος',
        city: 'ΓΕΡΑΚΑΣ',
        working_hours: '09:00-17:00',
        blocked_days: ['Sunday'],
        hourly_rate: 75,
        max_hours_per_week: 40,
        experience_years: 8,
        availability_status: 'Available',
        is_active: true,
        rating: 4.5
      },
      {
        id: 'R00096',
        name: 'ΓΙΑΝΝΗΣ ΓΥΦΤΑΚΗΣ',
        specialty: 'Μηχανικός Ασφάλειας',
        city: 'ΑΘΗΝΑ',
        working_hours: '08:00-16:00',
        blocked_days: ['Saturday', 'Sunday'],
        hourly_rate: 65,
        max_hours_per_week: 45,
        experience_years: 12,
        availability_status: 'Available',
        is_active: true,
        rating: 4.7
      }
    ];
  }

  private getFallbackInstallations(): Installation[] {
    return [
      {
        installation_code: 'INST00029',
        company_code: 'C000011',
        address: 'ΛΕΩΦ. ΣΥΓΓΡΟΥ 350',
        employees_count: 46,
        category: 'C',
        description: 'ΛΕΩΦ. ΣΥΓΓΡΟΥ 320 - ΠΡΟΗΓΟΥΜΕΝΗ ΔΙΕΥΘΥΝΣΗ test'
      },
      {
        installation_code: 'INST25442',
        company_code: 'C000011',
        address: 'ΜΙΧΑΛΑΚΟΠΟΥΛΟΥ 98',
        employees_count: 1,
        category: 'C',
        description: 'ΜΙΧΑΛΑΚΟΠΟΥΛΟΥ 98 - (ΕΝΤΟΣ ΑΧΑ-ΚΥΡΙΑΚΟΠΟΥΛΟΣ Π.)'
      }
    ];
  }
}

export const aiScheduler = new AIScheduler();
export type { AIRecommendation, ScheduledVisit, CustomerRequest };