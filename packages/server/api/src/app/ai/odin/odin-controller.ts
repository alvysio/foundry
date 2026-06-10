import { PrincipalType } from '@activepieces/shared'
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { StatusCodes } from 'http-status-codes'
import { securityAccess } from '../../core/security/authorization/fastify-security'
import { OdinSafetyError } from './odin-errors'
import { odinService } from './odin-service'
import {
    OdinChatRequest,
    OdinModelsResponse,
    OdinRouteRequest,
    RoutingDecision,
} from './odin-types'

export const odinController: FastifyPluginAsyncZod = async (app) => {
    app.post('/route', RouteSpec, async (request) => {
        const platformId = request.principal.platform.id
        return odinService.route({
            platformId,
            messages: request.body.messages,
            mode: request.body.mode,
        })
    })

    app.post('/chat', ChatSpec, async (request, reply) => {
        const platformId = request.principal.platform.id
        const projectId = request.principal.type === PrincipalType.ENGINE
            ? request.principal.projectId
            : null
        const principalId = request.principal.id
        try {
            return await odinService.chat({
                platformId,
                projectId,
                principalId,
                request: request.body,
            })
        }
        catch (err) {
            if (err instanceof OdinSafetyError) {
                return reply.status(StatusCodes.UNPROCESSABLE_ENTITY).send({
                    code: 'ODIN_SAFETY_BLOCKED',
                    stage: err.stage,
                    message: err.message,
                    findings: err.report.findings,
                    redactedText: err.report.redactedText,
                    decision: err.decision,
                    usage: err.usage,
                })
            }
            throw err
        }
    })

    app.get('/models', ModelsSpec, async (request) => {
        const platformId = request.principal.platform.id
        return odinService.listModels({ platformId })
    })
}

const RouteSpec = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER, PrincipalType.ENGINE]),
    },
    schema: {
        body: OdinRouteRequest,
        response: {
            [StatusCodes.OK]: RoutingDecision,
        },
    },
}

const ChatSpec = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER, PrincipalType.ENGINE]),
    },
    schema: {
        body: OdinChatRequest,
    },
}

const ModelsSpec = {
    config: {
        security: securityAccess.publicPlatform([PrincipalType.USER, PrincipalType.ENGINE]),
    },
    schema: {
        response: {
            [StatusCodes.OK]: OdinModelsResponse,
        },
    },
}
