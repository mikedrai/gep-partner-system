const BaseScheduler = require('./BaseScheduler');
const logger = require('../../utils/logger');

/**
 * Anthropic API Scheduler
 * Uses Claude AI for intelligent partner assignment and scheduling decisions
 * Leverages natural language processing and advanced reasoning capabilities
 */
class AnthropicScheduler extends BaseScheduler {
    constructor(config) {
        super(config);
        this.apiKey = process.env.ANTHROPIC_API_KEY || this.parameters.api_key;
        this.model = this.parameters.model || 'claude-3-sonnet-20240229';
        this.maxTokens = this.parameters.max_tokens || 2000;
        this.temperature = this.parameters.temperature || 0.3;
        this.maxRetries = this.parameters.max_retries || 3;
        this.requestTimeout = this.parameters.request_timeout || 30000;
        this.enableCache = this.parameters.enable_cache !== false;
        
        // API client setup
        this.anthropicClient = null;
        this.requestCache = new Map();
        this.cacheExpiryTime = 30 * 60 * 1000; // 30 minutes
    }

    /**
     * Initialize the Anthropic scheduler
     */
    async initialize() {
        try {
            logger.info('Initializing AnthropicScheduler');
            
            if (!this.apiKey) {
                throw new Error('Anthropic API key is required but not provided');
            }

            // Initialize Anthropic client (using fetch API for compatibility)
            this.anthropicClient = {
                baseURL: 'https://api.anthropic.com/v1/messages',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                }
            };

            // Test API connection
            await this.testAPIConnection();
            
            this.isInitialized = true;
            logger.info('AnthropicScheduler initialized successfully');

        } catch (error) {
            logger.error('Failed to initialize AnthropicScheduler:', error);
            throw error;
        }
    }

    /**
     * Generate optimal schedule using Anthropic AI
     */
    async generateSchedule(context) {
        try {
            const startTime = Date.now();
            logger.info('Starting Anthropic AI optimization');

            // Validate context
            if (!context.availablePartners || context.availablePartners.length === 0) {
                throw new Error('No available partners for scheduling');
            }

            // Prepare AI prompt with comprehensive context
            const aiPrompt = this.buildAIPrompt(context);
            
            // Get AI recommendation with retries
            const aiResponse = await this.queryAnthropicAPI(aiPrompt);
            
            // Parse and validate AI response
            const aiRecommendation = this.parseAIResponse(aiResponse, context);
            
            // Generate detailed schedule based on AI recommendation
            const schedule = await this.generateAIBasedSchedule(aiRecommendation, context);

            // Apply AI-driven optimizations
            const optimizedSchedule = await this.applyAIOptimizations(schedule, context);

            // Validate the generated schedule
            const validation = this.validateSchedule(optimizedSchedule, context);
            
            if (!validation.valid) {
                logger.warn('AI-generated schedule has validation issues:', validation.violations);
                // Use AI to fix violations
                const fixedSchedule = await this.fixScheduleWithAI(optimizedSchedule, validation.violations, context);
                if (fixedSchedule) {
                    optimizedSchedule.visits = fixedSchedule.visits;
                    optimizedSchedule.totalHours = fixedSchedule.totalHours;
                }
            }

            const executionTime = Date.now() - startTime;
            
            const result = {
                partnerId: aiRecommendation.partnerId,
                partnerName: aiRecommendation.partnerName,
                optimizationScore: aiRecommendation.confidenceScore,
                totalHours: optimizedSchedule.totalHours,
                visitDuration: optimizedSchedule.visitDuration,
                visitsPerMonth: optimizedSchedule.visitsPerMonth,
                visits: optimizedSchedule.visits,
                feasible: aiRecommendation.feasible,
                confidence: aiRecommendation.confidenceScore,
                executionTime,
                metadata: {
                    algorithm: 'anthropic_ai',
                    model: this.model,
                    reasoning: aiRecommendation.reasoning,
                    aiTokensUsed: aiResponse.usage?.total_tokens || 0,
                    alternativeOptions: aiRecommendation.alternatives,
                    constraintViolations: validation.violations.length,
                    aiConfidence: aiRecommendation.confidenceScore,
                    promptLength: aiPrompt.length
                }
            };

            this.logMetrics(executionTime, result, context);
            return result;

        } catch (error) {
            logger.error('Anthropic AI schedule generation failed:', error);
            
            // Fallback to baseline scheduling if AI fails
            return this.fallbackScheduling(context, error);
        }
    }

    /**
     * Build comprehensive AI prompt for scheduling
     */
    buildAIPrompt(context) {
        const installationInfo = this.formatInstallationInfo(context.installation);
        const partnersInfo = this.formatPartnersInfo(context.availablePartners);
        const requirements = this.formatRequirements(context.regulatoryRequirements);
        const constraints = this.formatConstraints(context.constraints);
        const historicalInfo = this.formatHistoricalInfo(context.historicalData);

        return `You are an expert scheduling AI for occupational health services in Greece. Your task is to select the optimal partner and create an efficient visit schedule.

INSTALLATION DETAILS:
${installationInfo}

AVAILABLE PARTNERS:
${partnersInfo}

REGULATORY REQUIREMENTS:
${requirements}

CONSTRAINTS:
${constraints}

HISTORICAL DATA:
${historicalInfo}

OPTIMIZATION PRIORITIES:
1. Location proximity (40% weight) - Minimize travel distance
2. Partner availability (30% weight) - Ensure adequate time allocation
3. Cost efficiency (20% weight) - Stay within budget constraints
4. Specialty match (10% weight) - Match partner expertise to service needs

TASK:
Analyze all available partners and recommend the best choice for this installation. Consider:
- Travel time and costs
- Partner workload and availability
- Historical performance if available
- Regulatory compliance (SEPE requirements)
- Client satisfaction potential
- Schedule optimization opportunities

Provide your response in this exact JSON format:
{
  "recommendedPartnerId": "partner_id",
  "partnerName": "Partner Name",
  "confidenceScore": 0.85,
  "feasible": true,
  "reasoning": "Detailed explanation of why this partner was selected, considering all factors",
  "optimizationScore": 0.87,
  "visitParameters": {
    "optimalVisitDuration": 3,
    "recommendedVisitsPerMonth": 2,
    "preferredVisitTime": "10:00:00",
    "visitDistribution": "weekly"
  },
  "alternatives": [
    {
      "partnerId": "alt_partner_id",
      "partnerName": "Alternative Partner",
      "score": 0.78,
      "reason": "Why this is an alternative option"
    }
  ],
  "riskFactors": ["Any potential risks or concerns"],
  "recommendations": ["Additional optimization suggestions"]
}

Be thorough in your analysis and provide clear reasoning for your decision.`;
    }

    /**
     * Query Anthropic API with retry logic
     */
    async queryAnthropicAPI(prompt, retryCount = 0) {
        try {
            // Check cache first
            if (this.enableCache) {
                const cacheKey = this.generateCacheKey(prompt);
                const cached = this.requestCache.get(cacheKey);
                if (cached && Date.now() - cached.timestamp < this.cacheExpiryTime) {
                    logger.debug('Using cached Anthropic response');
                    return cached.response;
                }
            }

            const requestBody = {
                model: this.model,
                max_tokens: this.maxTokens,
                temperature: this.temperature,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            };

            logger.debug(`Making Anthropic API request (attempt ${retryCount + 1})`);

            const response = await fetch(this.anthropicClient.baseURL, {
                method: 'POST',
                headers: this.anthropicClient.headers,
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(this.requestTimeout)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Anthropic API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();

            // Cache successful response
            if (this.enableCache) {
                const cacheKey = this.generateCacheKey(prompt);
                this.requestCache.set(cacheKey, {
                    response: data,
                    timestamp: Date.now()
                });
            }

            return data;

        } catch (error) {
            logger.warn(`Anthropic API request failed (attempt ${retryCount + 1}):`, error.message);

            // Retry logic
            if (retryCount < this.maxRetries - 1) {
                const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
                logger.info(`Retrying Anthropic API request in ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.queryAnthropicAPI(prompt, retryCount + 1);
            }

            throw error;
        }
    }

    /**
     * Parse and validate AI response
     */
    parseAIResponse(apiResponse, context) {
        try {
            if (!apiResponse.content || !apiResponse.content[0] || !apiResponse.content[0].text) {
                throw new Error('Invalid API response structure');
            }

            const responseText = apiResponse.content[0].text;
            
            // Extract JSON from response (handle potential markdown formatting)
            const jsonMatch = responseText.match(/```json\n?(.*?)\n?```/s) || responseText.match(/\{.*\}/s);
            
            if (!jsonMatch) {
                throw new Error('No JSON found in AI response');
            }

            const aiRecommendation = JSON.parse(jsonMatch[0].replace(/```json\n?|\n?```/g, ''));

            // Validate recommendation structure
            if (!aiRecommendation.recommendedPartnerId || !aiRecommendation.partnerName) {
                throw new Error('AI response missing required partner information');
            }

            // Verify the recommended partner exists
            const recommendedPartner = context.availablePartners.find(p => 
                p.id === aiRecommendation.recommendedPartnerId
            );

            if (!recommendedPartner) {
                throw new Error(`AI recommended partner ${aiRecommendation.recommendedPartnerId} not found in available partners`);
            }

            // Normalize and validate fields
            return {
                partnerId: aiRecommendation.recommendedPartnerId,
                partnerName: aiRecommendation.partnerName,
                partner: recommendedPartner,
                confidenceScore: Math.max(0, Math.min(1, aiRecommendation.confidenceScore || 0.5)),
                feasible: aiRecommendation.feasible !== false,
                reasoning: aiRecommendation.reasoning || 'AI recommendation without detailed reasoning',
                optimizationScore: Math.max(0, Math.min(1, aiRecommendation.optimizationScore || aiRecommendation.confidenceScore || 0.5)),
                visitParameters: {
                    optimalVisitDuration: Math.max(1, Math.min(8, aiRecommendation.visitParameters?.optimalVisitDuration || 3)),
                    recommendedVisitsPerMonth: Math.max(1, Math.min(10, aiRecommendation.visitParameters?.recommendedVisitsPerMonth || 2)),
                    preferredVisitTime: aiRecommendation.visitParameters?.preferredVisitTime || '10:00:00',
                    visitDistribution: aiRecommendation.visitParameters?.visitDistribution || 'monthly'
                },
                alternatives: aiRecommendation.alternatives || [],
                riskFactors: aiRecommendation.riskFactors || [],
                recommendations: aiRecommendation.recommendations || []
            };

        } catch (error) {
            logger.error('Failed to parse AI response:', error);
            logger.debug('Raw AI response:', apiResponse);
            
            // Return fallback recommendation
            return this.createFallbackRecommendation(context);
        }
    }

    /**
     * Generate detailed schedule based on AI recommendation
     */
    async generateAIBasedSchedule(aiRecommendation, context) {
        try {
            const partner = aiRecommendation.partner;
            const visitParams = aiRecommendation.visitParameters;

            // Generate base schedule using AI parameters
            const baseSchedule = this.generateVisitSchedule(
                partner,
                context,
                context.contract?.start_date || new Date().toISOString(),
                context.contract?.end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            );

            // Apply AI recommendations to the schedule
            const aiOptimizedVisits = baseSchedule.visits.map(visit => ({
                ...visit,
                duration: visitParams.optimalVisitDuration,
                startTime: visitParams.preferredVisitTime,
                endTime: this.addHours(visitParams.preferredVisitTime, visitParams.optimalVisitDuration),
                notes: `AI-optimized visit: ${aiRecommendation.reasoning.substring(0, 100)}...`,
                aiOptimized: true
            }));

            // Adjust visit frequency based on AI recommendation
            const adjustedVisits = this.adjustVisitFrequency(
                aiOptimizedVisits, 
                visitParams.recommendedVisitsPerMonth,
                visitParams.visitDistribution
            );

            return {
                partnerId: partner.id,
                partnerName: partner.name,
                visits: adjustedVisits,
                totalHours: adjustedVisits.reduce((sum, visit) => sum + visit.duration, 0),
                visitDuration: visitParams.optimalVisitDuration,
                visitsPerMonth: visitParams.recommendedVisitsPerMonth,
                aiRecommendations: aiRecommendation.recommendations
            };

        } catch (error) {
            logger.error('Failed to generate AI-based schedule:', error);
            
            // Fallback to standard schedule generation
            return this.generateVisitSchedule(
                aiRecommendation.partner,
                context,
                context.contract?.start_date || new Date().toISOString(),
                context.contract?.end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            );
        }
    }

    /**
     * Apply AI-driven optimizations
     */
    async applyAIOptimizations(schedule, context) {
        try {
            // If AI provided specific recommendations, apply them
            if (schedule.aiRecommendations && schedule.aiRecommendations.length > 0) {
                
                for (const recommendation of schedule.aiRecommendations) {
                    if (recommendation.includes('morning')) {
                        schedule = this.optimizeForMorningVisits(schedule);
                    }
                    if (recommendation.includes('consistent')) {
                        schedule = this.optimizeForConsistency(schedule);
                    }
                    if (recommendation.includes('spread') || recommendation.includes('distribute')) {
                        schedule = this.optimizeVisitDistribution(schedule);
                    }
                }
            }

            // Apply general AI-driven optimizations
            schedule = this.optimizeVisitSequencing(schedule, context);
            schedule = this.optimizeForEfficiency(schedule, context);

            return schedule;

        } catch (error) {
            logger.warn('AI optimization failed, returning original schedule:', error);
            return schedule;
        }
    }

    /**
     * Use AI to fix schedule violations
     */
    async fixScheduleWithAI(schedule, violations, context) {
        try {
            const fixPrompt = this.buildFixPrompt(schedule, violations, context);
            const aiResponse = await this.queryAnthropicAPI(fixPrompt);
            const fixes = this.parseFixResponse(aiResponse, schedule);
            
            return this.applyAIFixes(schedule, fixes);

        } catch (error) {
            logger.warn('AI-based schedule fixing failed:', error);
            return null;
        }
    }

    /**
     * Test API connection
     */
    async testAPIConnection() {
        try {
            const testPrompt = "Respond with 'OK' if you can receive this message.";
            const response = await this.queryAnthropicAPI(testPrompt);
            
            if (!response.content || !response.content[0]) {
                throw new Error('Invalid response structure from Anthropic API');
            }

            logger.info('Anthropic API connection test successful');

        } catch (error) {
            logger.error('Anthropic API connection test failed:', error);
            throw new Error(`Failed to connect to Anthropic API: ${error.message}`);
        }
    }

    /**
     * Create fallback recommendation when AI fails
     */
    createFallbackRecommendation(context) {
        logger.warn('Creating fallback recommendation due to AI parsing failure');

        // Use composite scoring as fallback
        const partners = context.availablePartners.map(partner => ({
            partner,
            score: this.calculateCompositeScore(partner, context).compositeScore
        })).sort((a, b) => b.score - a.score);

        const bestPartner = partners[0];

        return {
            partnerId: bestPartner.partner.id,
            partnerName: bestPartner.partner.name,
            partner: bestPartner.partner,
            confidenceScore: bestPartner.score,
            feasible: bestPartner.score > 0.5,
            reasoning: 'Fallback recommendation using composite scoring (AI unavailable)',
            optimizationScore: bestPartner.score,
            visitParameters: {
                optimalVisitDuration: 3,
                recommendedVisitsPerMonth: 2,
                preferredVisitTime: '10:00:00',
                visitDistribution: 'monthly'
            },
            alternatives: partners.slice(1, 3).map(p => ({
                partnerId: p.partner.id,
                partnerName: p.partner.name,
                score: p.score,
                reason: 'Alternative option from fallback scoring'
            })),
            riskFactors: ['AI recommendation unavailable'],
            recommendations: ['Manual review recommended']
        };
    }

    /**
     * Fallback scheduling when AI completely fails
     */
    async fallbackScheduling(context, originalError) {
        logger.warn('Using fallback scheduling due to AI failure:', originalError.message);

        try {
            // Use simple composite scoring
            const partners = context.availablePartners.map(partner => ({
                partner,
                score: this.calculateCompositeScore(partner, context).compositeScore
            })).sort((a, b) => b.score - a.score);

            if (partners.length === 0) {
                throw new Error('No partners available for scheduling');
            }

            const selectedPartner = partners[0].partner;
            const schedule = this.generateVisitSchedule(
                selectedPartner,
                context,
                context.contract?.start_date || new Date().toISOString(),
                context.contract?.end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            );

            return {
                partnerId: selectedPartner.id,
                partnerName: selectedPartner.name,
                optimizationScore: partners[0].score,
                totalHours: schedule.totalHours,
                visitDuration: schedule.visitDuration,
                visitsPerMonth: schedule.visitsPerMonth,
                visits: schedule.visits,
                feasible: partners[0].score > 0.3,
                confidence: Math.max(0.3, partners[0].score),
                executionTime: 1000, // Minimal time for fallback
                metadata: {
                    algorithm: 'anthropic_ai_fallback',
                    model: this.model,
                    reasoning: `Fallback scheduling used due to AI failure: ${originalError.message}`,
                    aiError: originalError.message,
                    fallbackMethod: 'composite_scoring'
                }
            };

        } catch (fallbackError) {
            logger.error('Fallback scheduling also failed:', fallbackError);
            throw new Error(`Both AI and fallback scheduling failed: ${fallbackError.message}`);
        }
    }

    // Helper methods for formatting context information
    formatInstallationInfo(installation) {
        return `
- Installation Code: ${installation?.installation_code || 'N/A'}
- Company: ${installation?.company_name || 'N/A'}
- Address: ${installation?.address || 'N/A'}
- Employee Count: ${installation?.employees_count || 'N/A'}
- Category: ${installation?.category || 'N/A'}
- Service Type: ${installation?.service_type || 'N/A'}
- Working Hours: ${installation?.work_hours || 'N/A'}
- Special Requirements: ${installation?.special_requirements || 'None'}
        `.trim();
    }

    formatPartnersInfo(partners) {
        return partners.map((partner, index) => `
Partner ${index + 1}:
- ID: ${partner.id}
- Name: ${partner.name}
- Specialty: ${partner.specialty || 'N/A'}
- City: ${partner.city || 'N/A'}
- Hourly Rate: €${partner.hourly_rate || 'N/A'}
- Phone: ${partner.phone || 'N/A'}
- Email: ${partner.email || 'N/A'}
- Active: ${partner.is_active ? 'Yes' : 'No'}
        `).join('\n').trim();
    }

    formatRequirements(requirements) {
        return `
- Minimum Hours per Month: ${requirements?.minimumHoursPerMonth || 'N/A'}
- Maximum Hours per Month: ${requirements?.maximumHoursPerMonth || 'N/A'}
- Required Visit Frequency: ${requirements?.requiredVisitFrequency || 'N/A'}
- Special Requirements: ${requirements?.specialRequirements?.join(', ') || 'None'}
        `.trim();
    }

    formatConstraints(constraints) {
        return `
- Working Hours: ${constraints?.workingHours || 'N/A'}
- Max Hours per Week: ${constraints?.maxHoursPerWeek || 'N/A'}
- Min Time Between Visits: ${constraints?.minTimeBetweenVisits || 'N/A'} hours
- Max Travel Distance: ${constraints?.maxTravelDistance || 'N/A'} km
- Exclude Weekends: ${constraints?.excludeWeekends ? 'Yes' : 'No'}
- Exclude Holidays: ${constraints?.excludeHolidays ? 'Yes' : 'No'}
        `.trim();
    }

    formatHistoricalInfo(historicalData) {
        if (!historicalData || historicalData.length === 0) {
            return 'No historical data available.';
        }

        return `Previous ${historicalData.length} schedules:
${historicalData.map((schedule, index) => `
- Schedule ${index + 1}: Partner ${schedule.partner_id}, Score: ${schedule.optimization_score || 'N/A'}
`).join('')}`.trim();
    }

    // Helper methods for optimizations
    adjustVisitFrequency(visits, recommendedVisitsPerMonth, distribution) {
        // Implement visit frequency adjustment based on AI recommendations
        return visits; // Placeholder implementation
    }

    optimizeForMorningVisits(schedule) {
        const optimized = { ...schedule };
        optimized.visits = optimized.visits.map(visit => ({
            ...visit,
            startTime: '09:00:00',
            endTime: this.addHours('09:00:00', visit.duration)
        }));
        return optimized;
    }

    optimizeForConsistency(schedule) {
        const optimized = { ...schedule };
        if (optimized.visits.length > 0) {
            const consistentTime = optimized.visits[0].startTime;
            optimized.visits = optimized.visits.map(visit => ({
                ...visit,
                startTime: consistentTime,
                endTime: this.addHours(consistentTime, visit.duration)
            }));
        }
        return optimized;
    }

    optimizeVisitDistribution(schedule) {
        // Implement visit distribution optimization
        return schedule; // Placeholder implementation
    }

    optimizeVisitSequencing(schedule, context) {
        // Implement visit sequencing optimization
        return schedule; // Placeholder implementation
    }

    optimizeForEfficiency(schedule, context) {
        // Implement efficiency optimization
        return schedule; // Placeholder implementation
    }

    // Cache management
    generateCacheKey(prompt) {
        // Create a hash of the prompt for caching
        return Buffer.from(prompt.substring(0, 500)).toString('base64').substring(0, 50);
    }

    clearCache() {
        this.requestCache.clear();
        logger.info('Anthropic API cache cleared');
    }

    // Fix-related methods (placeholders)
    buildFixPrompt(schedule, violations, context) {
        return `Fix the following schedule violations: ${violations.map(v => v.description).join(', ')}`;
    }

    parseFixResponse(response, schedule) {
        // Parse AI response for fixes
        return {}; // Placeholder
    }

    applyAIFixes(schedule, fixes) {
        // Apply AI-suggested fixes
        return schedule; // Placeholder
    }
}

module.exports = AnthropicScheduler;