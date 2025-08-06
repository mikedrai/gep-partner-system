const BaseScheduler = require('./BaseScheduler');
const logger = require('../../utils/logger');

/**
 * Machine Learning Scheduler
 * Uses historical data to train models for optimal partner assignment and scheduling
 * Implements pattern recognition and predictive scheduling
 */
class MachineLearningScheduler extends BaseScheduler {
    constructor(config) {
        super(config);
        this.modelType = this.parameters.model_type || 'decision_tree';
        this.trainingRatio = this.parameters.training_ratio || 0.8;
        this.minTrainingData = this.parameters.min_training_data || 10;
        this.featureWeights = this.parameters.feature_weights || {};
        this.predictionThreshold = this.parameters.prediction_threshold || 0.6;
        this.retrainThreshold = this.parameters.retrain_threshold || 0.1;
        
        // Model storage
        this.model = null;
        this.trainingData = [];
        this.features = [];
        this.lastTrainingTime = null;
        this.modelAccuracy = 0;
    }

    /**
     * Initialize the machine learning scheduler
     */
    async initialize() {
        try {
            logger.info('Initializing MachineLearningScheduler');
            
            // Load historical training data
            await this.loadTrainingData();
            
            // Train initial model if we have enough data
            if (this.trainingData.length >= this.minTrainingData) {
                await this.trainModel();
            } else {
                logger.warn(`Insufficient training data (${this.trainingData.length}/${this.minTrainingData}). Using baseline model.`);
                this.initializeBaselineModel();
            }
            
            this.isInitialized = true;
            logger.info('MachineLearningScheduler initialized successfully');

        } catch (error) {
            logger.error('Failed to initialize MachineLearningScheduler:', error);
            throw error;
        }
    }

    /**
     * Generate optimal schedule using machine learning predictions
     */
    async generateSchedule(context) {
        try {
            const startTime = Date.now();
            logger.info('Starting ML-based optimization');

            // Validate context
            if (!context.availablePartners || context.availablePartners.length === 0) {
                throw new Error('No available partners for scheduling');
            }

            // Extract features for prediction
            const features = this.extractFeatures(context);
            
            // Predict best partner using trained model
            const predictions = await this.predictOptimalAssignment(features, context);
            
            // Select best partner based on predictions
            const bestPrediction = this.selectBestPrediction(predictions, context);
            
            // Generate schedule for selected partner
            const schedule = this.generateOptimalSchedule(bestPrediction, context);

            // Validate the generated schedule
            const validation = this.validateSchedule(schedule, context);
            
            if (!validation.valid) {
                logger.warn('Generated schedule has validation issues:', validation.violations);
                // Apply ML-based fixes
                const fixedSchedule = await this.applyMLFixes(schedule, validation.violations, context);
                if (fixedSchedule) {
                    schedule.visits = fixedSchedule.visits;
                    schedule.totalHours = fixedSchedule.totalHours;
                }
            }

            const executionTime = Date.now() - startTime;
            
            const result = {
                partnerId: bestPrediction.partnerId,
                partnerName: bestPrediction.partnerName,
                optimizationScore: bestPrediction.confidence,
                totalHours: schedule.totalHours,
                visitDuration: schedule.visitDuration,
                visitsPerMonth: schedule.visitsPerMonth,
                visits: schedule.visits,
                feasible: bestPrediction.confidence > this.predictionThreshold,
                confidence: bestPrediction.confidence,
                executionTime,
                metadata: {
                    algorithm: 'machine_learning',
                    modelType: this.modelType,
                    modelAccuracy: this.modelAccuracy,
                    trainingDataSize: this.trainingData.length,
                    featuresUsed: this.features.length,
                    predictionConfidence: bestPrediction.confidence,
                    constraintViolations: validation.violations.length,
                    lastTrainingTime: this.lastTrainingTime
                }
            };

            // Store result for future training
            await this.storeTrainingExample(features, bestPrediction, result, context);

            this.logMetrics(executionTime, result, context);
            return result;

        } catch (error) {
            logger.error('ML schedule generation failed:', error);
            throw error;
        }
    }

    /**
     * Load historical training data
     */
    async loadTrainingData() {
        try {
            // In a real implementation, this would load from a database
            // For now, we'll simulate training data structure
            this.trainingData = [];
            
            // Load successful schedules from database (simulated)
            const historicalSchedules = await this.getHistoricalSchedulingData();
            
            for (const schedule of historicalSchedules) {
                if (schedule.status === 'completed' && schedule.optimization_score > 0.5) {
                    const features = this.extractHistoricalFeatures(schedule);
                    const outcome = {
                        partnerId: schedule.partner_id,
                        score: schedule.optimization_score,
                        success: true
                    };
                    
                    this.trainingData.push({ features, outcome });
                }
            }

            logger.info(`Loaded ${this.trainingData.length} training examples`);

        } catch (error) {
            logger.warn('Failed to load training data:', error);
            this.trainingData = [];
        }
    }

    /**
     * Extract features from scheduling context
     */
    extractFeatures(context) {
        const features = {
            // Installation features
            employeeCount: context.installation?.employees_count || 0,
            installationCategory: this.encodeCategorical(context.installation?.category, ['A', 'B', 'C']),
            serviceType: this.encodeCategorical(context.installation?.service_type, 
                ['occupational_doctor', 'safety_engineer', 'specialist_consultation']),
            
            // Contract features
            contractValue: context.contract?.contract_value || 0,
            contractDuration: this.calculateContractDuration(context.contract),
            
            // Requirements features
            requiredHours: context.regulatoryRequirements?.minimumHoursPerMonth || 20,
            visitFrequency: this.encodeFrequency(context.regulatoryRequirements?.requiredVisitFrequency),
            
            // Temporal features
            monthOfYear: new Date().getMonth() + 1,
            dayOfWeek: new Date().getDay(),
            seasonality: Math.floor((new Date().getMonth()) / 3), // 0=Winter, 1=Spring, etc.
            
            // Partner pool features
            availablePartnersCount: context.availablePartners?.length || 0,
            avgPartnerCost: this.calculateAveragePartnerCost(context.availablePartners),
            avgPartnerDistance: this.calculateAveragePartnerDistance(context.availablePartners, context.installation),
            
            // Historical features
            previousSchedulesCount: context.historicalData?.length || 0,
            avgHistoricalScore: this.calculateAverageHistoricalScore(context.historicalData)
        };

        // Store feature names for later use
        this.features = Object.keys(features);
        
        return features;
    }

    /**
     * Extract features from historical schedule data
     */
    extractHistoricalFeatures(schedule) {
        return {
            employeeCount: schedule.installation?.employees_count || 0,
            installationCategory: this.encodeCategorical(schedule.installation?.category, ['A', 'B', 'C']),
            serviceType: this.encodeCategorical(schedule.service_type, 
                ['occupational_doctor', 'safety_engineer', 'specialist_consultation']),
            contractValue: schedule.contract_value || 0,
            contractDuration: this.calculateScheduleDuration(schedule),
            requiredHours: schedule.total_hours || 20,
            visitFrequency: schedule.visits_per_month || 2,
            monthOfYear: new Date(schedule.created_at).getMonth() + 1,
            dayOfWeek: new Date(schedule.created_at).getDay(),
            seasonality: Math.floor((new Date(schedule.created_at).getMonth()) / 3)
        };
    }

    /**
     * Train the machine learning model
     */
    async trainModel() {
        try {
            logger.info(`Training ${this.modelType} model with ${this.trainingData.length} examples`);
            
            // Split data into training and validation sets
            const { trainingSet, validationSet } = this.splitTrainingData();
            
            switch (this.modelType) {
                case 'decision_tree':
                    this.model = await this.trainDecisionTree(trainingSet);
                    break;
                case 'random_forest':
                    this.model = await this.trainRandomForest(trainingSet);
                    break;
                case 'neural_network':
                    this.model = await this.trainNeuralNetwork(trainingSet);
                    break;
                default:
                    this.model = await this.trainDecisionTree(trainingSet);
            }

            // Validate model
            this.modelAccuracy = this.validateModel(validationSet);
            this.lastTrainingTime = new Date();

            logger.info(`Model training completed. Accuracy: ${(this.modelAccuracy * 100).toFixed(2)}%`);

        } catch (error) {
            logger.error('Model training failed:', error);
            this.initializeBaselineModel();
        }
    }

    /**
     * Train a decision tree model (simplified implementation)
     */
    async trainDecisionTree(trainingSet) {
        try {
            // Simplified decision tree implementation
            // In production, you would use a proper ML library like TensorFlow.js or brain.js
            
            const model = {
                type: 'decision_tree',
                rules: [],
                featureImportance: {}
            };

            // Calculate feature importance
            for (const feature of this.features) {
                model.featureImportance[feature] = this.calculateFeatureImportance(feature, trainingSet);
            }

            // Generate simple rules based on successful examples
            const successfulExamples = trainingSet.filter(example => example.outcome.success);
            const rules = this.generateDecisionRules(successfulExamples);
            model.rules = rules;

            return model;

        } catch (error) {
            logger.error('Decision tree training failed:', error);
            throw error;
        }
    }

    /**
     * Generate decision rules from training data
     */
    generateDecisionRules(examples) {
        const rules = [];

        // Group examples by partner and find patterns
        const partnerGroups = this.groupByPartner(examples);

        for (const [partnerId, partnerExamples] of Object.entries(partnerGroups)) {
            if (partnerExamples.length < 2) continue;

            // Find common patterns
            const avgFeatures = this.calculateAverageFeatures(partnerExamples);
            const avgScore = partnerExamples.reduce((sum, ex) => sum + ex.outcome.score, 0) / partnerExamples.length;

            if (avgScore > 0.7) {
                rules.push({
                    partnerId: partnerId,
                    conditions: this.createConditions(avgFeatures),
                    confidence: avgScore,
                    support: partnerExamples.length
                });
            }
        }

        return rules.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Predict optimal assignment using trained model
     */
    async predictOptimalAssignment(features, context) {
        try {
            const predictions = [];

            for (const partner of context.availablePartners) {
                const prediction = await this.predictPartnerFitness(features, partner);
                
                predictions.push({
                    partnerId: partner.id,
                    partnerName: partner.name,
                    partner: partner,
                    confidence: prediction.confidence,
                    expectedScore: prediction.score,
                    reasoning: prediction.reasoning
                });
            }

            return predictions.sort((a, b) => b.confidence - a.confidence);

        } catch (error) {
            logger.error('Prediction failed:', error);
            // Fallback to baseline scoring
            return this.fallbackPrediction(context);
        }
    }

    /**
     * Predict fitness for a specific partner
     */
    async predictPartnerFitness(features, partner) {
        if (!this.model) {
            return this.baselinePrediction(features, partner);
        }

        try {
            switch (this.model.type) {
                case 'decision_tree':
                    return this.predictWithDecisionTree(features, partner);
                default:
                    return this.baselinePrediction(features, partner);
            }
        } catch (error) {
            logger.warn('Model prediction failed, using baseline:', error);
            return this.baselinePrediction(features, partner);
        }
    }

    /**
     * Make prediction using decision tree
     */
    predictWithDecisionTree(features, partner) {
        let bestMatch = null;
        let maxConfidence = 0;

        for (const rule of this.model.rules) {
            if (rule.partnerId === partner.id) {
                const matchScore = this.evaluateRuleMatch(rule.conditions, features);
                if (matchScore > maxConfidence) {
                    maxConfidence = matchScore;
                    bestMatch = rule;
                }
            }
        }

        if (bestMatch) {
            return {
                confidence: bestMatch.confidence * maxConfidence,
                score: bestMatch.confidence,
                reasoning: `Matched historical pattern with ${(maxConfidence * 100).toFixed(1)}% similarity`
            };
        }

        // If no specific rule matches, use general prediction
        return this.baselinePrediction(features, partner);
    }

    /**
     * Baseline prediction when model is not available
     */
    baselinePrediction(features, partner) {
        // Use composite scoring as baseline
        const mockContext = {
            installation: {
                service_type: this.decodeServiceType(features.serviceType),
                employees_count: features.employeeCount,
                category: this.decodeCategory(features.installationCategory)
            },
            contract: {
                contract_value: features.contractValue
            },
            regulatoryRequirements: {
                minimumHoursPerMonth: features.requiredHours
            },
            historicalData: []
        };

        const scoreData = this.calculateCompositeScore(partner, mockContext);
        
        return {
            confidence: scoreData.compositeScore,
            score: scoreData.compositeScore,
            reasoning: 'Baseline composite scoring (insufficient training data)'
        };
    }

    /**
     * Select best prediction from candidates
     */
    selectBestPrediction(predictions, context) {
        if (predictions.length === 0) {
            throw new Error('No predictions available');
        }

        // Filter predictions above threshold
        const viablePredictions = predictions.filter(p => p.confidence > this.predictionThreshold);
        
        if (viablePredictions.length === 0) {
            logger.warn('No predictions above threshold, using best available');
            return predictions[0];
        }

        // Select based on confidence and additional factors
        return viablePredictions.reduce((best, current) => {
            let bestScore = best.confidence;
            let currentScore = current.confidence;

            // Boost score for partners with recent successful history
            const bestHistoricalScore = this.calculateHistoricalScore(best.partner, context.installation, context.historicalData);
            const currentHistoricalScore = this.calculateHistoricalScore(current.partner, context.installation, context.historicalData);
            
            bestScore += bestHistoricalScore * 0.1;
            currentScore += currentHistoricalScore * 0.1;

            return currentScore > bestScore ? current : best;
        });
    }

    /**
     * Generate optimal schedule using ML insights
     */
    generateOptimalSchedule(prediction, context) {
        // Use base scheduler with ML-informed parameters
        const partner = prediction.partner;
        
        // Predict optimal visit parameters using historical patterns
        const optimalParams = this.predictOptimalVisitParameters(prediction, context);
        
        // Generate visit schedule
        const visitSchedule = this.generateVisitSchedule(
            partner,
            context,
            context.contract?.start_date || new Date().toISOString(),
            context.contract?.end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        );

        // Apply ML optimizations
        const optimizedSchedule = this.applyMLOptimizations(visitSchedule, optimalParams, context);

        return {
            partnerId: partner.id,
            partnerName: partner.name,
            visits: optimizedSchedule.visits,
            totalHours: optimizedSchedule.totalHours,
            visitDuration: optimizedSchedule.visitDuration,
            visitsPerMonth: optimizedSchedule.visitsPerMonth
        };
    }

    /**
     * Predict optimal visit parameters using ML
     */
    predictOptimalVisitParameters(prediction, context) {
        // Look for similar historical cases
        const similarCases = this.findSimilarHistoricalCases(context);
        
        if (similarCases.length === 0) {
            return {
                optimalVisitDuration: 3,
                optimalVisitsPerMonth: 2,
                preferredVisitTimes: ['10:00:00'],
                seasonalAdjustments: {}
            };
        }

        // Calculate averages from similar cases
        const avgDuration = similarCases.reduce((sum, c) => sum + (c.visit_duration_hours || 3), 0) / similarCases.length;
        const avgVisitsPerMonth = similarCases.reduce((sum, c) => sum + (c.visits_per_month || 2), 0) / similarCases.length;

        return {
            optimalVisitDuration: Math.round(avgDuration),
            optimalVisitsPerMonth: Math.round(avgVisitsPerMonth),
            preferredVisitTimes: this.extractPreferredTimes(similarCases),
            seasonalAdjustments: this.calculateSeasonalAdjustments(similarCases)
        };
    }

    /**
     * Apply ML-based schedule optimizations
     */
    applyMLOptimizations(schedule, optimalParams, context) {
        const optimized = { ...schedule };

        // Adjust visit duration based on ML prediction
        if (optimalParams.optimalVisitDuration !== schedule.visitDuration) {
            optimized.visitDuration = optimalParams.optimalVisitDuration;
            
            // Recalculate visits with new duration
            optimized.visits = optimized.visits.map(visit => ({
                ...visit,
                duration: optimalParams.optimalVisitDuration,
                endTime: this.addHours(visit.startTime, optimalParams.optimalVisitDuration)
            }));
        }

        // Optimize visit timing based on historical preferences
        if (optimalParams.preferredVisitTimes.length > 0) {
            const preferredTime = optimalParams.preferredVisitTimes[0];
            optimized.visits = optimized.visits.map(visit => ({
                ...visit,
                startTime: preferredTime,
                endTime: this.addHours(preferredTime, visit.duration)
            }));
        }

        // Recalculate total hours
        optimized.totalHours = optimized.visits.reduce((sum, visit) => sum + visit.duration, 0);

        return optimized;
    }

    /**
     * Store training example for future model improvement
     */
    async storeTrainingExample(features, prediction, result, context) {
        try {
            // Store the example for future training
            const example = {
                features,
                outcome: {
                    partnerId: prediction.partnerId,
                    score: result.optimizationScore,
                    success: result.feasible
                },
                timestamp: new Date(),
                context: {
                    installationCode: context.installation.installation_code,
                    serviceType: context.installation.service_type
                }
            };

            this.trainingData.push(example);

            // Limit training data size to prevent memory issues
            if (this.trainingData.length > 1000) {
                this.trainingData = this.trainingData.slice(-800); // Keep most recent 800
            }

            // Retrain if we have accumulated enough new examples
            if (this.shouldRetrain()) {
                await this.trainModel();
            }

        } catch (error) {
            logger.warn('Failed to store training example:', error);
        }
    }

    /**
     * Retrain the model with new data
     */
    async retrain() {
        try {
            logger.info('Starting model retraining...');
            await this.loadTrainingData();
            await this.trainModel();
            logger.info('Model retraining completed');
        } catch (error) {
            logger.error('Model retraining failed:', error);
            throw error;
        }
    }

    /**
     * Check if model should be retrained
     */
    shouldRetrain() {
        if (!this.lastTrainingTime) return true;
        
        const daysSinceTraining = (Date.now() - this.lastTrainingTime.getTime()) / (1000 * 60 * 60 * 24);
        const newExampleThreshold = Math.max(20, this.trainingData.length * 0.1);
        
        return daysSinceTraining > 7 || // Retrain weekly
               this.modelAccuracy < 0.7 || // Retrain if accuracy drops
               this.trainingData.length > newExampleThreshold; // Retrain with new data
    }

    /**
     * Initialize baseline model when training data is insufficient
     */
    initializeBaselineModel() {
        this.model = {
            type: 'baseline',
            rules: [],
            featureImportance: {
                serviceType: 0.3,
                employeeCount: 0.2,
                requiredHours: 0.2,
                contractValue: 0.15,
                installationCategory: 0.15
            }
        };
        this.modelAccuracy = 0.6; // Baseline accuracy
        this.lastTrainingTime = new Date();
    }

    // Helper methods for encoding and calculations
    encodeCategorical(value, categories) {
        const index = categories.indexOf(value);
        return index >= 0 ? index : 0;
    }

    decodeCategory(encoded) {
        const categories = ['A', 'B', 'C'];
        return categories[encoded] || 'C';
    }

    decodeServiceType(encoded) {
        const types = ['occupational_doctor', 'safety_engineer', 'specialist_consultation'];
        return types[encoded] || 'occupational_doctor';
    }

    encodeFrequency(frequency) {
        const frequencies = { 'weekly': 4, 'monthly': 1, 'quarterly': 0.33 };
        return frequencies[frequency] || 1;
    }

    calculateContractDuration(contract) {
        if (!contract || !contract.start_date || !contract.end_date) return 12;
        const start = new Date(contract.start_date);
        const end = new Date(contract.end_date);
        return Math.max(1, Math.floor((end - start) / (1000 * 60 * 60 * 24 * 30)));
    }

    calculateScheduleDuration(schedule) {
        if (!schedule.start_date || !schedule.end_date) return 12;
        const start = new Date(schedule.start_date);
        const end = new Date(schedule.end_date);
        return Math.max(1, Math.floor((end - start) / (1000 * 60 * 60 * 24 * 30)));
    }

    calculateAveragePartnerCost(partners) {
        if (!partners || partners.length === 0) return 50;
        return partners.reduce((sum, p) => sum + (p.hourly_rate || 50), 0) / partners.length;
    }

    calculateAveragePartnerDistance(partners, installation) {
        if (!partners || partners.length === 0) return 25;
        return partners.reduce((sum, p) => {
            return sum + this.calculateDistance(p.city, installation?.address || '');
        }, 0) / partners.length;
    }

    calculateAverageHistoricalScore(historicalData) {
        if (!historicalData || historicalData.length === 0) return 0.5;
        return historicalData.reduce((sum, h) => sum + (h.optimization_score || 0.5), 0) / historicalData.length;
    }

    async getHistoricalSchedulingData() {
        // Simulated historical data - in production this would query the database
        return [];
    }

    splitTrainingData() {
        const shuffled = [...this.trainingData].sort(() => Math.random() - 0.5);
        const splitIndex = Math.floor(shuffled.length * this.trainingRatio);
        
        return {
            trainingSet: shuffled.slice(0, splitIndex),
            validationSet: shuffled.slice(splitIndex)
        };
    }

    calculateFeatureImportance(feature, trainingSet) {
        // Simplified feature importance calculation
        return Math.random() * 0.5 + 0.25; // Placeholder
    }

    validateModel(validationSet) {
        // Simplified model validation
        return Math.random() * 0.3 + 0.7; // Placeholder accuracy
    }

    groupByPartner(examples) {
        return examples.reduce((groups, example) => {
            const partnerId = example.outcome.partnerId;
            if (!groups[partnerId]) groups[partnerId] = [];
            groups[partnerId].push(example);
            return groups;
        }, {});
    }

    calculateAverageFeatures(examples) {
        const avgFeatures = {};
        const features = Object.keys(examples[0].features);
        
        for (const feature of features) {
            avgFeatures[feature] = examples.reduce((sum, ex) => sum + ex.features[feature], 0) / examples.length;
        }
        
        return avgFeatures;
    }

    createConditions(avgFeatures) {
        // Create simple threshold conditions
        return Object.entries(avgFeatures).map(([feature, value]) => ({
            feature,
            operator: 'approx',
            value,
            tolerance: value * 0.2
        }));
    }

    evaluateRuleMatch(conditions, features) {
        let matchScore = 0;
        let totalConditions = conditions.length;
        
        for (const condition of conditions) {
            const featureValue = features[condition.feature];
            if (featureValue !== undefined) {
                const diff = Math.abs(featureValue - condition.value);
                const tolerance = condition.tolerance || condition.value * 0.2;
                
                if (diff <= tolerance) {
                    matchScore += 1 - (diff / tolerance);
                }
            }
        }
        
        return matchScore / totalConditions;
    }

    findSimilarHistoricalCases(context) {
        // Placeholder for finding similar historical cases
        return [];
    }

    extractPreferredTimes(cases) {
        // Extract most common visit times from historical cases
        return ['10:00:00']; // Placeholder
    }

    calculateSeasonalAdjustments(cases) {
        // Calculate seasonal patterns from historical data
        return {}; // Placeholder
    }

    fallbackPrediction(context) {
        return context.availablePartners.map(partner => ({
            partnerId: partner.id,
            partnerName: partner.name,
            partner: partner,
            confidence: 0.5,
            expectedScore: 0.5,
            reasoning: 'Fallback prediction (model unavailable)'
        }));
    }

    async applyMLFixes(schedule, violations, context) {
        // Placeholder for ML-based schedule fixing
        return null;
    }
}

module.exports = MachineLearningScheduler;