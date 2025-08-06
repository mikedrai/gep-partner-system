const logger = require('../utils/logger');

class OptimizationEngine {
  constructor(config = {}) {
    this.maxDistance = config.maxDistance || 50; // km
    this.weights = {
      location: 0.4,
      availability: 0.3,
      cost: 0.2,
      specialty: 0.1,
      ...config.weights
    };
    this.timeout = config.timeout || 5000; // ms
  }

  /**
   * Main optimization function
   * @param {Object} request - Customer request object
   * @param {Array} partners - Array of available partners
   * @param {Object} constraints - Additional constraints
   * @returns {Object} Optimization result
   */
  async optimize(request, partners, constraints = {}) {
    const startTime = Date.now();
    
    try {
      logger.info('Starting optimization', {
        requestId: request.id,
        partnersCount: partners.length,
        serviceType: request.service_type
      });

      // Filter partners based on basic requirements
      let candidatePartners = this.filterPartners(request, partners, constraints);
      
      if (candidatePartners.length === 0) {
        logger.warn('No candidate partners after filtering', { requestId: request.id });
        return {
          selectedPartner: null,
          topCandidates: [],
          evaluation: {
            totalPartnersEvaluated: partners.length,
            candidatesAfterFiltering: 0,
            filteringReasons: this.getFilteringReasons(request, partners, constraints)
          }
        };
      }

      // Calculate scores for each candidate
      const scoredPartners = await this.scorePartners(request, candidatePartners);

      // Sort by score (highest first)
      scoredPartners.sort((a, b) => b.score - a.score);

      const topCandidates = scoredPartners.slice(0, 5).map(partner => ({
        id: partner.id,
        name: partner.name,
        score: Math.round(partner.score * 100) / 100,
        hourly_rate: partner.hourly_rate,
        distance: partner.distance,
        availability_score: partner.availability_score,
        cost_score: partner.cost_score,
        location_score: partner.location_score,
        specialty_score: partner.specialty_score
      }));

      const selectedPartner = scoredPartners[0];

      const executionTime = Date.now() - startTime;

      logger.info('Optimization completed', {
        requestId: request.id,
        selectedPartnerId: selectedPartner.id,
        score: selectedPartner.score,
        executionTimeMs: executionTime
      });

      return {
        selectedPartner,
        topCandidates,
        executionTimeMs: executionTime,
        evaluation: {
          totalPartnersEvaluated: partners.length,
          candidatesAfterFiltering: candidatePartners.length,
          weights: this.weights
        }
      };

    } catch (error) {
      logger.error('Optimization failed', {
        requestId: request.id,
        error: error.message,
        executionTimeMs: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Filter partners based on requirements and constraints
   */
  filterPartners(request, partners, constraints) {
    return partners.filter(partner => {
      // Check if partner is in excluded list
      if (constraints.excludedPartners && constraints.excludedPartners.includes(partner.id)) {
        return false;
      }

      // Check specialty match
      if (!this.checkSpecialtyMatch(request.service_type, partner.specialty)) {
        return false;
      }

      // Check hourly rate constraint
      if (constraints.maxHourlyRate && partner.hourly_rate > constraints.maxHourlyRate) {
        return false;
      }

      // Check basic availability
      if (!this.checkBasicAvailability(partner)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Score all candidate partners
   */
  async scorePartners(request, partners) {
    const scoredPartners = [];

    for (const partner of partners) {
      try {
        const scores = await this.calculatePartnerScore(request, partner);
        
        // Calculate weighted total score
        const totalScore = (
          scores.location * this.weights.location +
          scores.availability * this.weights.availability +
          scores.cost * this.weights.cost +
          scores.specialty * this.weights.specialty
        );

        scoredPartners.push({
          ...partner,
          score: totalScore,
          location_score: scores.location,
          availability_score: scores.availability,
          cost_score: scores.cost,
          specialty_score: scores.specialty,
          distance: scores.distance
        });

      } catch (error) {
        logger.warn('Failed to score partner', {
          partnerId: partner.id,
          error: error.message
        });
      }
    }

    return scoredPartners;
  }

  /**
   * Calculate individual scores for a partner
   */
  async calculatePartnerScore(request, partner) {
    const scores = {
      location: 0,
      availability: 0,
      cost: 0,
      specialty: 0,
      distance: 0
    };

    // Location Score (based on distance)
    const distance = this.calculateDistance(request, partner);
    scores.distance = distance;
    scores.location = Math.max(0, 100 - (distance / this.maxDistance) * 100);

    // Availability Score
    scores.availability = this.calculateAvailabilityScore(partner, request);

    // Cost Score (lower cost = higher score)
    scores.cost = this.calculateCostScore(partner);

    // Specialty Score
    scores.specialty = this.calculateSpecialtyScore(request.service_type, partner.specialty);

    return scores;
  }

  /**
   * Calculate distance between request location and partner
   * This is a simplified implementation - in production you'd use Google Maps API
   */
  calculateDistance(request, partner) {
    // For demo purposes, calculate distance based on city
    const cityDistances = {
      'Athens': { 'Athens': 5, 'Thessaloniki': 20, 'Patras': 15, 'Heraklion': 30 },
      'Thessaloniki': { 'Athens': 20, 'Thessaloniki': 5, 'Patras': 25, 'Heraklion': 35 },
      'Patras': { 'Athens': 15, 'Thessaloniki': 25, 'Patras': 5, 'Heraklion': 40 },
      'Heraklion': { 'Athens': 30, 'Thessaloniki': 35, 'Patras': 40, 'Heraklion': 5 }
    };

    // Extract city from installation address (simplified)
    let requestCity = 'Athens'; // default
    if (request.installation_address) {
      if (request.installation_address.includes('Thessaloniki')) requestCity = 'Thessaloniki';
      else if (request.installation_address.includes('Patras')) requestCity = 'Patras';
      else if (request.installation_address.includes('Heraklion')) requestCity = 'Heraklion';
    }

    return cityDistances[requestCity]?.[partner.city] || 25;
  }

  /**
   * Calculate availability score based on partner's availability
   */
  calculateAvailabilityScore(partner, request) {
    // If partner has availability data
    if (partner.partner_availability && partner.partner_availability.length > 0) {
      const totalAvailable = partner.partner_availability.reduce((sum, day) => {
        return sum + (day.available_hours - day.booked_hours);
      }, 0);
      
      const averageDaily = totalAvailable / partner.partner_availability.length;
      return Math.min(100, (averageDaily / 8) * 100); // 8 hours is max daily
    }

    // Default availability score based on max hours per week
    const weeklyAvailable = partner.max_hours_per_week || 40;
    return Math.min(100, (weeklyAvailable / 40) * 100);
  }

  /**
   * Calculate cost score (inverse of hourly rate)
   */
  calculateCostScore(partner) {
    // Assume max reasonable rate is 100 EUR/hour
    const maxRate = 100;
    const rate = partner.hourly_rate || maxRate;
    return Math.max(0, ((maxRate - rate) / maxRate) * 100);
  }

  /**
   * Calculate specialty match score
   */
  calculateSpecialtyScore(requestedServiceType, partnerSpecialty) {
    const specialtyMap = {
      'occupational_doctor': ['Occupational Doctor', 'Doctor', 'Παθολόγος', 'Ιατρός'],
      'safety_engineer': ['Safety Engineer', 'Engineer', 'Μηχανικός', 'Τεχνικός Ασφαλείας']
    };

    const requiredSpecialties = specialtyMap[requestedServiceType] || [];
    
    for (const specialty of requiredSpecialties) {
      if (partnerSpecialty.includes(specialty)) {
        return 100; // Perfect match
      }
    }

    // Partial match for related specialties
    if (requestedServiceType === 'occupational_doctor' && partnerSpecialty.includes('Doctor')) {
      return 75;
    }
    if (requestedServiceType === 'safety_engineer' && partnerSpecialty.includes('Engineer')) {
      return 75;
    }

    return 50; // Default score for any qualified professional
  }

  /**
   * Check if partner specialty matches request
   */
  checkSpecialtyMatch(requestedServiceType, partnerSpecialty) {
    const specialtyMap = {
      'occupational_doctor': ['Occupational Doctor', 'Doctor', 'Παθολόγος', 'Ιατρός'],
      'safety_engineer': ['Safety Engineer', 'Engineer', 'Μηχανικός', 'Τεχνικός Ασφαλείας']
    };

    const requiredSpecialties = specialtyMap[requestedServiceType] || [];
    
    return requiredSpecialties.some(specialty => 
      partnerSpecialty.toLowerCase().includes(specialty.toLowerCase())
    );
  }

  /**
   * Check basic availability
   */
  checkBasicAvailability(partner) {
    // Check if partner is active
    if (!partner.is_active) {
      return false;
    }

    // Check if has availability data
    if (partner.partner_availability && partner.partner_availability.length > 0) {
      return partner.partner_availability.some(day => 
        day.is_available && (day.available_hours - day.booked_hours) > 0
      );
    }

    // Default to available if no availability data
    return true;
  }

  /**
   * Get reasons why partners were filtered out
   */
  getFilteringReasons(request, partners, constraints) {
    const reasons = {
      excludedPartners: 0,
      specialtyMismatch: 0,
      tooExpensive: 0,
      notAvailable: 0
    };

    partners.forEach(partner => {
      if (constraints.excludedPartners && constraints.excludedPartners.includes(partner.id)) {
        reasons.excludedPartners++;
      } else if (!this.checkSpecialtyMatch(request.service_type, partner.specialty)) {
        reasons.specialtyMismatch++;
      } else if (constraints.maxHourlyRate && partner.hourly_rate > constraints.maxHourlyRate) {
        reasons.tooExpensive++;
      } else if (!this.checkBasicAvailability(partner)) {
        reasons.notAvailable++;
      }
    });

    return reasons;
  }
}

module.exports = OptimizationEngine;