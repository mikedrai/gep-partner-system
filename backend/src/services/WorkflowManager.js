const logger = require('../utils/logger');
const { supabaseAdmin } = require('../config/supabase');
const EmailService = require('./EmailService');

/**
 * Workflow Management System
 * Handles approval chains, state transitions, and automated workflows
 * Supports role-based approvals, escalation, and audit trails
 */
class WorkflowManager {
    constructor() {
        this.emailService = new EmailService();
        this.workflowDefinitions = new Map();
        this.activeWorkflows = new Map();
        
        // Load workflow definitions on initialization
        this.loadWorkflowDefinitions();
    }

    /**
     * Initialize workflow definitions
     */
    async loadWorkflowDefinitions() {
        try {
            // Define standard approval workflows
            this.workflowDefinitions.set('schedule_approval', {
                id: 'schedule_approval',
                name: 'Schedule Approval Workflow',
                description: 'Approval process for new schedules',
                triggerEvent: 'schedule_created',
                steps: [
                    {
                        id: 'manager_review',
                        name: 'Manager Review',
                        type: 'approval',
                        roles: ['manager'],
                        requiredApprovals: 1,
                        timeoutHours: 24,
                        escalationRoles: ['admin'],
                        actions: {
                            approved: 'next_step',
                            rejected: 'end_workflow',
                            timeout: 'escalate'
                        }
                    },
                    {
                        id: 'admin_approval',
                        name: 'Admin Final Approval',
                        type: 'approval',
                        roles: ['admin'],
                        requiredApprovals: 1,
                        timeoutHours: 48,
                        actions: {
                            approved: 'complete_workflow',
                            rejected: 'end_workflow',
                            timeout: 'auto_approve'
                        }
                    }
                ],
                onComplete: 'activate_schedule',
                onReject: 'archive_schedule'
            });

            this.workflowDefinitions.set('contract_modification', {
                id: 'contract_modification',
                name: 'Contract Modification Workflow',
                description: 'Approval process for contract changes',
                triggerEvent: 'contract_modified',
                steps: [
                    {
                        id: 'legal_review',
                        name: 'Legal Department Review',
                        type: 'review',
                        roles: ['legal'],
                        requiredApprovals: 1,
                        timeoutHours: 72,
                        actions: {
                            approved: 'next_step',
                            rejected: 'request_changes',
                            timeout: 'escalate'
                        }
                    },
                    {
                        id: 'financial_approval',
                        name: 'Financial Approval',
                        type: 'approval',
                        roles: ['finance_manager', 'admin'],
                        requiredApprovals: 1,
                        timeoutHours: 48,
                        conditions: [
                            {
                                field: 'contract_value_change',
                                operator: '>',
                                value: 1000,
                                required: true
                            }
                        ],
                        actions: {
                            approved: 'complete_workflow',
                            rejected: 'end_workflow',
                            timeout: 'escalate'
                        }
                    }
                ],
                onComplete: 'update_contract',
                onReject: 'revert_changes'
            });

            this.workflowDefinitions.set('partner_onboarding', {
                id: 'partner_onboarding',
                name: 'Partner Onboarding Workflow',
                description: 'Multi-step partner validation and setup process',
                triggerEvent: 'partner_registration',
                steps: [
                    {
                        id: 'document_verification',
                        name: 'Document Verification',
                        type: 'verification',
                        roles: ['hr', 'admin'],
                        requiredApprovals: 1,
                        timeoutHours: 120, // 5 days
                        requiredDocuments: [
                            'professional_license',
                            'insurance_certificate',
                            'tax_clearance'
                        ],
                        actions: {
                            approved: 'next_step',
                            rejected: 'request_documents',
                            timeout: 'escalate'
                        }
                    },
                    {
                        id: 'background_check',
                        name: 'Background Check',
                        type: 'external_verification',
                        roles: ['hr'],
                        timeoutHours: 168, // 1 week
                        externalService: 'background_check_api',
                        actions: {
                            approved: 'next_step',
                            rejected: 'end_workflow',
                            timeout: 'manual_review'
                        }
                    },
                    {
                        id: 'system_setup',
                        name: 'System Account Setup',
                        type: 'automated',
                        actions: {
                            success: 'complete_workflow',
                            error: 'manual_intervention'
                        }
                    }
                ],
                onComplete: 'activate_partner',
                onReject: 'reject_application'
            });

            logger.info(`Loaded ${this.workflowDefinitions.size} workflow definitions`);

        } catch (error) {
            logger.error('Failed to load workflow definitions:', error);
        }
    }

    /**
     * Start a new workflow
     */
    async startWorkflow(workflowId, entityId, entityType, initiatorId, context = {}) {
        try {
            const definition = this.workflowDefinitions.get(workflowId);
            if (!definition) {
                throw new Error(`Workflow definition not found: ${workflowId}`);
            }

            // Create workflow instance
            const workflowInstance = {
                id: this.generateWorkflowInstanceId(),
                definitionId: workflowId,
                entityId,
                entityType,
                initiatorId,
                status: 'running',
                currentStepIndex: 0,
                currentStepId: definition.steps[0].id,
                context: {
                    ...context,
                    startTime: new Date().toISOString(),
                    definition: definition
                },
                approvals: [],
                history: [],
                createdAt: new Date().toISOString()
            };

            // Store workflow instance
            await this.storeWorkflowInstance(workflowInstance);
            this.activeWorkflows.set(workflowInstance.id, workflowInstance);

            // Log workflow start
            await this.logWorkflowEvent(workflowInstance.id, 'workflow_started', {
                initiator: initiatorId,
                definition: workflowId,
                entity: { id: entityId, type: entityType }
            });

            // Start first step
            await this.executeWorkflowStep(workflowInstance);

            logger.info(`Started workflow ${workflowId} for ${entityType} ${entityId}`);
            return workflowInstance;

        } catch (error) {
            logger.error('Failed to start workflow:', error);
            throw error;
        }
    }

    /**
     * Process workflow approval/rejection
     */
    async processWorkflowAction(workflowInstanceId, action, userId, comments = '', attachments = []) {
        try {
            const workflow = this.activeWorkflows.get(workflowInstanceId) || 
                            await this.loadWorkflowInstance(workflowInstanceId);

            if (!workflow) {
                throw new Error(`Workflow instance not found: ${workflowInstanceId}`);
            }

            if (workflow.status !== 'running') {
                throw new Error(`Workflow is not in running state: ${workflow.status}`);
            }

            const currentStep = this.getCurrentStep(workflow);
            if (!currentStep) {
                throw new Error('No current step found in workflow');
            }

            // Validate user permissions
            if (!await this.canUserPerformAction(userId, currentStep, workflow)) {
                throw new Error('User does not have permission to perform this action');
            }

            // Record the action
            const approval = {
                id: this.generateApprovalId(),
                stepId: currentStep.id,
                userId,
                action,
                comments,
                attachments,
                timestamp: new Date().toISOString()
            };

            workflow.approvals.push(approval);

            // Log the action
            await this.logWorkflowEvent(workflow.id, `step_${action}`, {
                stepId: currentStep.id,
                userId,
                comments,
                attachments
            });

            // Check if step is complete
            const stepComplete = await this.isStepComplete(currentStep, workflow);
            
            if (stepComplete) {
                await this.completeStep(workflow, currentStep, action);
            }

            // Update workflow instance
            await this.updateWorkflowInstance(workflow);

            // Send notifications
            await this.sendWorkflowNotifications(workflow, action, userId, comments);

            logger.info(`Processed ${action} for workflow ${workflowInstanceId} by user ${userId}`);
            return workflow;

        } catch (error) {
            logger.error('Failed to process workflow action:', error);
            throw error;
        }
    }

    /**
     * Execute workflow step
     */
    async executeWorkflowStep(workflow) {
        try {
            const currentStep = this.getCurrentStep(workflow);
            if (!currentStep) {
                throw new Error('No current step found');
            }

            // Check step conditions
            if (currentStep.conditions && !await this.evaluateStepConditions(currentStep.conditions, workflow)) {
                // Skip this step
                await this.moveToNextStep(workflow);
                return;
            }

            // Set step timeout
            if (currentStep.timeoutHours) {
                await this.setStepTimeout(workflow.id, currentStep.id, currentStep.timeoutHours);
            }

            // Execute step based on type
            switch (currentStep.type) {
                case 'approval':
                case 'review':
                case 'verification':
                    await this.executeApprovalStep(workflow, currentStep);
                    break;
                
                case 'automated':
                    await this.executeAutomatedStep(workflow, currentStep);
                    break;
                
                case 'external_verification':
                    await this.executeExternalVerificationStep(workflow, currentStep);
                    break;
                
                default:
                    logger.warn(`Unknown step type: ${currentStep.type}`);
                    await this.moveToNextStep(workflow);
            }

        } catch (error) {
            logger.error('Failed to execute workflow step:', error);
            await this.handleWorkflowError(workflow, error);
        }
    }

    /**
     * Execute approval step
     */
    async executeApprovalStep(workflow, step) {
        try {
            // Find eligible approvers
            const approvers = await this.findEligibleApprovers(step.roles, workflow);
            
            if (approvers.length === 0) {
                logger.warn(`No eligible approvers found for step ${step.id}`);
                await this.escalateWorkflow(workflow, 'no_approvers');
                return;
            }

            // Send approval requests
            for (const approver of approvers) {
                await this.sendApprovalRequest(workflow, step, approver);
            }

            // Log step start
            await this.logWorkflowEvent(workflow.id, 'step_started', {
                stepId: step.id,
                stepName: step.name,
                approvers: approvers.map(a => a.id)
            });

        } catch (error) {
            logger.error('Failed to execute approval step:', error);
            throw error;
        }
    }

    /**
     * Execute automated step
     */
    async executeAutomatedStep(workflow, step) {
        try {
            // Perform automated actions based on step configuration
            let result = { success: true };

            // Example automated actions
            if (step.id === 'system_setup') {
                result = await this.performSystemSetup(workflow);
            } else if (step.id === 'send_notifications') {
                result = await this.performNotificationSend(workflow);
            } else if (step.id === 'update_records') {
                result = await this.performRecordUpdate(workflow);
            }

            // Process result
            const actionKey = result.success ? 'success' : 'error';
            const nextAction = step.actions[actionKey];

            await this.processStepAction(workflow, step, nextAction, result);

        } catch (error) {
            logger.error('Failed to execute automated step:', error);
            await this.processStepAction(workflow, step, 'error', { error: error.message });
        }
    }

    /**
     * Complete workflow step and move to next
     */
    async completeStep(workflow, step, action) {
        try {
            const nextAction = step.actions[action];
            await this.processStepAction(workflow, step, nextAction, { action });

        } catch (error) {
            logger.error('Failed to complete step:', error);
            throw error;
        }
    }

    /**
     * Process step action
     */
    async processStepAction(workflow, step, nextAction, context) {
        try {
            switch (nextAction) {
                case 'next_step':
                    await this.moveToNextStep(workflow);
                    break;
                
                case 'complete_workflow':
                    await this.completeWorkflow(workflow);
                    break;
                
                case 'end_workflow':
                case 'cancel_workflow':
                    await this.endWorkflow(workflow, 'cancelled');
                    break;
                
                case 'escalate':
                    await this.escalateWorkflow(workflow, 'step_timeout');
                    break;
                
                case 'auto_approve':
                    await this.autoApproveStep(workflow, step);
                    break;
                
                case 'manual_intervention':
                    await this.requestManualIntervention(workflow, step, context);
                    break;
                
                case 'request_changes':
                    await this.requestChanges(workflow, context);
                    break;
                
                default:
                    logger.warn(`Unknown step action: ${nextAction}`);
                    await this.moveToNextStep(workflow);
            }

        } catch (error) {
            logger.error('Failed to process step action:', error);
            throw error;
        }
    }

    /**
     * Move to next workflow step
     */
    async moveToNextStep(workflow) {
        try {
            const definition = workflow.context.definition;
            const nextStepIndex = workflow.currentStepIndex + 1;

            if (nextStepIndex >= definition.steps.length) {
                // No more steps, complete workflow
                await this.completeWorkflow(workflow);
                return;
            }

            // Update workflow to next step
            workflow.currentStepIndex = nextStepIndex;
            workflow.currentStepId = definition.steps[nextStepIndex].id;

            await this.updateWorkflowInstance(workflow);

            // Execute next step
            await this.executeWorkflowStep(workflow);

        } catch (error) {
            logger.error('Failed to move to next step:', error);
            throw error;
        }
    }

    /**
     * Complete workflow
     */
    async completeWorkflow(workflow) {
        try {
            workflow.status = 'completed';
            workflow.completedAt = new Date().toISOString();

            await this.updateWorkflowInstance(workflow);
            this.activeWorkflows.delete(workflow.id);

            // Execute completion action
            const definition = workflow.context.definition;
            if (definition.onComplete) {
                await this.executeCompletionAction(workflow, definition.onComplete);
            }

            // Log completion
            await this.logWorkflowEvent(workflow.id, 'workflow_completed', {
                duration: Date.now() - new Date(workflow.createdAt).getTime(),
                totalSteps: definition.steps.length
            });

            // Send completion notifications
            await this.sendCompletionNotifications(workflow);

            logger.info(`Completed workflow ${workflow.id}`);

        } catch (error) {
            logger.error('Failed to complete workflow:', error);
            throw error;
        }
    }

    /**
     * Get workflow status
     */
    async getWorkflowStatus(workflowInstanceId) {
        try {
            const workflow = this.activeWorkflows.get(workflowInstanceId) || 
                            await this.loadWorkflowInstance(workflowInstanceId);

            if (!workflow) {
                return null;
            }

            const currentStep = this.getCurrentStep(workflow);
            const definition = workflow.context.definition;

            return {
                id: workflow.id,
                status: workflow.status,
                currentStep: currentStep ? {
                    id: currentStep.id,
                    name: currentStep.name,
                    type: currentStep.type
                } : null,
                progress: {
                    currentStepIndex: workflow.currentStepIndex,
                    totalSteps: definition.steps.length,
                    percentage: Math.round((workflow.currentStepIndex / definition.steps.length) * 100)
                },
                approvals: workflow.approvals,
                createdAt: workflow.createdAt,
                completedAt: workflow.completedAt,
                entityId: workflow.entityId,
                entityType: workflow.entityType,
                initiatorId: workflow.initiatorId
            };

        } catch (error) {
            logger.error('Failed to get workflow status:', error);
            throw error;
        }
    }

    /**
     * Get pending approvals for user
     */
    async getPendingApprovals(userId) {
        try {
            const { data: workflows, error } = await supabaseAdmin
                .from('approval_workflows')
                .select('*')
                .eq('status', 'running');

            if (error) {
                throw error;
            }

            const pendingApprovals = [];

            for (const workflow of workflows) {
                const workflowInstance = await this.loadWorkflowInstance(workflow.id);
                if (!workflowInstance) continue;

                const currentStep = this.getCurrentStep(workflowInstance);
                if (!currentStep) continue;

                // Check if user can approve this step
                if (await this.canUserPerformAction(userId, currentStep, workflowInstance)) {
                    // Check if user hasn't already acted on this step
                    const hasActed = workflowInstance.approvals.some(approval => 
                        approval.stepId === currentStep.id && approval.userId === userId
                    );

                    if (!hasActed) {
                        pendingApprovals.push({
                            workflowId: workflowInstance.id,
                            stepId: currentStep.id,
                            stepName: currentStep.name,
                            stepType: currentStep.type,
                            entityId: workflowInstance.entityId,
                            entityType: workflowInstance.entityType,
                            initiatorId: workflowInstance.initiatorId,
                            createdAt: workflowInstance.createdAt,
                            timeoutAt: this.calculateStepTimeout(workflowInstance, currentStep)
                        });
                    }
                }
            }

            return pendingApprovals;

        } catch (error) {
            logger.error('Failed to get pending approvals:', error);
            throw error;
        }
    }

    // Helper methods
    getCurrentStep(workflow) {
        const definition = workflow.context.definition;
        return definition.steps[workflow.currentStepIndex];
    }

    async canUserPerformAction(userId, step, workflow) {
        try {
            // Get user details
            const { data: user, error } = await supabaseAdmin
                .from('users')
                .select('role, partner_id')
                .eq('id', userId)
                .single();

            if (error || !user) {
                return false;
            }

            // Check if user role is in step roles
            return step.roles.includes(user.role);

        } catch (error) {
            logger.error('Failed to check user permissions:', error);
            return false;
        }
    }

    async isStepComplete(step, workflow) {
        // Count approvals for this step
        const stepApprovals = workflow.approvals.filter(approval => 
            approval.stepId === step.id && approval.action === 'approved'
        );

        return stepApprovals.length >= (step.requiredApprovals || 1);
    }

    generateWorkflowInstanceId() {
        return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateApprovalId() {
        return `ap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Database operations (would be implemented with actual database calls)
    async storeWorkflowInstance(workflow) {
        const { error } = await supabaseAdmin
            .from('approval_workflows')
            .insert([{
                id: workflow.id,
                definition_id: workflow.definitionId,
                entity_id: workflow.entityId,
                entity_type: workflow.entityType,
                initiator_id: workflow.initiatorId,
                status: workflow.status,
                current_step_index: workflow.currentStepIndex,
                current_step_id: workflow.currentStepId,
                context: workflow.context,
                approvals: workflow.approvals,
                history: workflow.history,
                created_at: workflow.createdAt
            }]);

        if (error) {
            throw error;
        }
    }

    async updateWorkflowInstance(workflow) {
        const { error } = await supabaseAdmin
            .from('approval_workflows')
            .update({
                status: workflow.status,
                current_step_index: workflow.currentStepIndex,
                current_step_id: workflow.currentStepId,
                context: workflow.context,
                approvals: workflow.approvals,
                history: workflow.history,
                completed_at: workflow.completedAt
            })
            .eq('id', workflow.id);

        if (error) {
            throw error;
        }
    }

    async loadWorkflowInstance(workflowInstanceId) {
        const { data, error } = await supabaseAdmin
            .from('approval_workflows')
            .select('*')
            .eq('id', workflowInstanceId)
            .single();

        if (error || !data) {
            return null;
        }

        return {
            id: data.id,
            definitionId: data.definition_id,
            entityId: data.entity_id,
            entityType: data.entity_type,
            initiatorId: data.initiator_id,
            status: data.status,
            currentStepIndex: data.current_step_index,
            currentStepId: data.current_step_id,
            context: data.context,
            approvals: data.approvals || [],
            history: data.history || [],
            createdAt: data.created_at,
            completedAt: data.completed_at
        };
    }

    async logWorkflowEvent(workflowId, eventType, eventData) {
        const { error } = await supabaseAdmin
            .from('workflow_audit_log')
            .insert([{
                workflow_id: workflowId,
                event_type: eventType,
                event_data: eventData,
                timestamp: new Date().toISOString()
            }]);

        if (error) {
            logger.error('Failed to log workflow event:', error);
        }
    }

    // Placeholder implementations for additional functionality
    async findEligibleApprovers(roles, workflow) {
        const { data: users, error } = await supabaseAdmin
            .from('users')
            .select('id, email, name, role')
            .in('role', roles)
            .eq('is_active', true);

        return error ? [] : users;
    }

    async sendApprovalRequest(workflow, step, approver) {
        // Send email notification
        await this.emailService.sendApprovalRequest({
            to: approver.email,
            approverName: approver.name,
            workflowId: workflow.id,
            stepName: step.name,
            entityType: workflow.entityType,
            entityId: workflow.entityId
        });
    }

    async sendWorkflowNotifications(workflow, action, userId, comments) {
        // Implementation for workflow notifications
        logger.debug(`Sending workflow notifications for ${workflow.id}`);
    }

    async sendCompletionNotifications(workflow) {
        // Implementation for completion notifications
        logger.debug(`Sending completion notifications for ${workflow.id}`);
    }

    async evaluateStepConditions(conditions, workflow) {
        // Implementation for condition evaluation
        return true;
    }

    async setStepTimeout(workflowId, stepId, hours) {
        // Implementation for step timeout
        logger.debug(`Setting timeout for workflow ${workflowId}, step ${stepId}: ${hours} hours`);
    }

    async executeExternalVerificationStep(workflow, step) {
        // Implementation for external verification
        logger.debug(`Executing external verification for step ${step.id}`);
    }

    async performSystemSetup(workflow) {
        // Implementation for automated system setup
        return { success: true };
    }

    async performNotificationSend(workflow) {
        // Implementation for automated notifications
        return { success: true };
    }

    async performRecordUpdate(workflow) {
        // Implementation for automated record updates
        return { success: true };
    }

    async escalateWorkflow(workflow, reason) {
        // Implementation for workflow escalation
        logger.warn(`Escalating workflow ${workflow.id}: ${reason}`);
    }

    async autoApproveStep(workflow, step) {
        // Implementation for auto-approval
        logger.info(`Auto-approving step ${step.id} in workflow ${workflow.id}`);
    }

    async requestManualIntervention(workflow, step, context) {
        // Implementation for manual intervention request
        logger.warn(`Manual intervention requested for workflow ${workflow.id}, step ${step.id}`);
    }

    async requestChanges(workflow, context) {
        // Implementation for change requests
        logger.info(`Changes requested for workflow ${workflow.id}`);
    }

    async executeCompletionAction(workflow, action) {
        // Implementation for completion actions
        logger.info(`Executing completion action ${action} for workflow ${workflow.id}`);
    }

    async endWorkflow(workflow, reason) {
        workflow.status = 'cancelled';
        workflow.completedAt = new Date().toISOString();
        await this.updateWorkflowInstance(workflow);
        this.activeWorkflows.delete(workflow.id);
        logger.info(`Ended workflow ${workflow.id}: ${reason}`);
    }

    async handleWorkflowError(workflow, error) {
        workflow.status = 'error';
        workflow.error = error.message;
        await this.updateWorkflowInstance(workflow);
        logger.error(`Workflow error ${workflow.id}:`, error);
    }

    calculateStepTimeout(workflow, step) {
        if (!step.timeoutHours) return null;
        
        const stepStartTime = workflow.history
            .filter(h => h.stepId === step.id && h.eventType === 'step_started')
            .pop()?.timestamp || workflow.createdAt;
        
        const timeout = new Date(stepStartTime);
        timeout.setHours(timeout.getHours() + step.timeoutHours);
        return timeout.toISOString();
    }
}

module.exports = WorkflowManager;